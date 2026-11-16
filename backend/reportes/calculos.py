"""
Cálculos de los reportes.

Las fechas se agrupan en Python (no con funciones de fecha de MySQL) porque MySQL en Windows
no trae cargadas las tablas de zonas horarias y, con USE_TZ, esas funciones devolverían NULL.
"""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from catalogo.models import Producto
from integracion.datos import SISTEMA_PROPIO, solo_externos
from pedidos.models import DetallePedido, Pedido

MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']


def inicio_del_dia(dia):
    return timezone.make_aware(datetime.combine(dia, time.min))


def lineas_vendidas(desde, hasta):
    """Líneas de pedidos completados con fecha en [desde, hasta)."""
    return DetallePedido.objects.filter(
        pedido__estado=Pedido.Estado.COMPLETADO, pedido__fecha__gte=desde, pedido__fecha__lt=hasta
    ).select_related('pedido', 'producto__categoria', 'producto__marca')


def total_vendido(desde, hasta):
    return sum((d.subtotal for d in lineas_vendidas(desde, hasta)), Decimal('0'))


def variacion(actual, anterior):
    if not anterior:
        return None
    return round(float((actual - anterior) / anterior * 100), 1)


def promedio(total, cantidad):
    # En pesos colombianos no se usan centavos.
    return (total / cantidad).quantize(Decimal('1')) if cantidad else Decimal('0')


def fecha_local(momento):
    return timezone.localtime(momento).isoformat()


# ---------------------------------------------------------------------------
# Inicio del administrador
# ---------------------------------------------------------------------------

def resumen_inicio():
    ahora = timezone.now()
    hoy = timezone.localdate()
    inicio_hoy = inicio_del_dia(hoy)
    inicio_manana = inicio_del_dia(hoy + timedelta(days=1))
    inicio_ayer = inicio_del_dia(hoy - timedelta(days=1))
    inicio_semana = inicio_del_dia(hoy - timedelta(days=6))

    lineas_hoy = list(lineas_vendidas(inicio_hoy, inicio_manana))
    ventas_hoy = sum((d.subtotal for d in lineas_hoy), Decimal('0'))
    pedidos_hoy = len({d.pedido_id for d in lineas_hoy})
    ventas_ayer = total_vendido(inicio_ayer, inicio_hoy)

    stock_bajo = Producto.objects.filter(stock_disponible__lte=settings.STOCK_MINIMO).select_related('marca')
    limite_vencimiento = hoy + timedelta(days=settings.DIAS_ALERTA_VENCIMIENTO)
    por_vencer = Producto.objects.filter(
        fecha_vencimiento__isnull=False, fecha_vencimiento__lte=limite_vencimiento
    ).select_related('marca')

    limite_reserva = ahora - timedelta(hours=settings.HORAS_RESERVA_CARRITO)
    carritos = Pedido.objects.filter(estado=Pedido.Estado.EN_PROCESO)

    ultimas = (
        Pedido.objects.filter(estado=Pedido.Estado.COMPLETADO)
        .select_related('usuario')
        .prefetch_related('detalles__producto')
        .order_by('-fecha')[:5]
    )

    return {
        'fecha': hoy.isoformat(),
        'ventas_hoy': ventas_hoy,
        'pedidos_hoy': pedidos_hoy,
        'ticket_promedio_hoy': promedio(ventas_hoy, pedidos_hoy),
        'ventas_ayer': ventas_ayer,
        'variacion_vs_ayer': variacion(ventas_hoy, ventas_ayer),
        'ventas_7_dias': total_vendido(inicio_semana, inicio_manana),
        'stock_minimo': settings.STOCK_MINIMO,
        'dias_alerta_vencimiento': settings.DIAS_ALERTA_VENCIMIENTO,
        'alertas_stock': [
            {
                'id': p.pk, 'nombre': p.nombre, 'presentacion': p.presentacion, 'marca': p.marca.nombre,
                'disponible': p.stock_disponible, 'apartado': p.stock_apartado,
            }
            for p in stock_bajo.order_by('stock_disponible', 'nombre')
        ],
        'por_vencer': [
            {
                'id': p.pk, 'nombre': p.nombre, 'presentacion': p.presentacion, 'marca': p.marca.nombre,
                'fecha_vencimiento': p.fecha_vencimiento.isoformat(),
                'dias': (p.fecha_vencimiento - hoy).days, 'disponible': p.stock_disponible,
            }
            for p in por_vencer.order_by('fecha_vencimiento')
        ],
        'carritos_activos': carritos.count(),
        'carritos_inactivos': carritos.filter(fecha__lt=limite_reserva).count(),
        'unidades_apartadas': Producto.objects.aggregate(total=Sum('stock_apartado'))['total'] or 0,
        'horas_reserva': settings.HORAS_RESERVA_CARRITO,
        'ultimas_ventas': [
            {
                'id': pedido.pk,
                'codigo': pedido.codigo,
                'cliente': f'{pedido.usuario.first_name} {pedido.usuario.last_name}'.strip(),
                'fecha': fecha_local(pedido.fecha),
                'productos': [d.producto.nombre for d in pedido.detalles.all()],
                'unidades': pedido.unidades,
                'total': pedido.total,
            }
            for pedido in ultimas
        ],
    }


# ---------------------------------------------------------------------------
# Reporte de ventas
# ---------------------------------------------------------------------------

def _inicio_semana(dia):
    return dia - timedelta(days=dia.weekday())


def _sumar_meses(dia, meses):
    total = dia.year * 12 + dia.month - 1 + meses
    return date(total // 12, total % 12 + 1, 1)


def periodos(tipo, hoy):
    """Lista de (inicio, fin, etiqueta) para las barras del reporte, de la más vieja a la más reciente."""
    if tipo == 'semana':
        lunes = _inicio_semana(hoy)
        inicios = [lunes - timedelta(weeks=i) for i in range(7, -1, -1)]
        return [(d, d + timedelta(days=7), f'{d.day} {MESES[d.month - 1]}') for d in inicios]
    if tipo == 'anio':
        return [(date(a, 1, 1), date(a + 1, 1, 1), str(a)) for a in range(hoy.year - 2, hoy.year + 1)]
    # mes
    primero = hoy.replace(day=1)
    inicios = [_sumar_meses(primero, -i) for i in range(5, -1, -1)]
    return [(d, _sumar_meses(d, 1), MESES[d.month - 1]) for d in inicios]


def reporte_ventas(tipo='mes'):
    if tipo not in ('semana', 'mes', 'anio'):
        tipo = 'mes'
    hoy = timezone.localdate()
    barras = periodos(tipo, hoy)
    desde, hasta = inicio_del_dia(barras[0][0]), inicio_del_dia(barras[-1][1])
    duracion = hasta - desde
    desde_anterior = desde - duracion

    lineas = list(lineas_vendidas(desde, hasta))

    por_periodo = defaultdict(Decimal)
    pedidos_por_periodo = defaultdict(set)
    por_producto = defaultdict(lambda: {'unidades': 0, 'total': Decimal('0')})
    por_categoria = defaultdict(Decimal)
    pedidos, clientes, productos = set(), set(), set()
    unidades_vendidas = 0

    for linea in lineas:
        dia = timezone.localtime(linea.pedido.fecha).date()
        for indice, (inicio, fin, _) in enumerate(barras):
            if inicio <= dia < fin:
                por_periodo[indice] += linea.subtotal
                pedidos_por_periodo[indice].add(linea.pedido_id)
                break
        producto = linea.producto
        por_producto[producto.pk]['producto'] = producto
        por_producto[producto.pk]['unidades'] += linea.cantidad
        por_producto[producto.pk]['total'] += linea.subtotal
        por_categoria[producto.categoria.nombre] += linea.subtotal
        pedidos.add(linea.pedido_id)
        clientes.add(linea.pedido.usuario_id)
        productos.add(producto.pk)
        unidades_vendidas += linea.cantidad

    total = sum(por_periodo.values(), Decimal('0'))
    total_anterior = total_vendido(desde_anterior, desde)

    # «De todo lo que se apartó, cuánto se compró»: unidades de pedidos completados frente a
    # unidades de pedidos cancelados (se apartaron y se liberaron sin comprarse).
    unidades_canceladas = (
        DetallePedido.objects.filter(
            pedido__estado=Pedido.Estado.CANCELADO, pedido__fecha__gte=desde, pedido__fecha__lt=hasta
        ).aggregate(total=Sum('cantidad'))['total']
        or 0
    )
    apartadas_ahora = Producto.objects.aggregate(total=Sum('stock_apartado'))['total'] or 0
    base_conversion = unidades_vendidas + unidades_canceladas

    mas_vendidos = sorted(por_producto.values(), key=lambda p: (-p['total'], p['producto'].nombre))[:5]

    # Serie del otro sistema (solo si la integración está conectada).
    # Se pide por fechas en formato date, inclusivo en ambos extremos.
    sistema_externo, pedidos_externos, conexion = solo_externos(barras[0][0], barras[-1][1] - timedelta(days=1))
    por_periodo_externo = defaultdict(Decimal)
    pedidos_externos_por_periodo = defaultdict(set)
    total_externo = Decimal('0')
    for pedido in pedidos_externos:
        if pedido['estado'] != 'completado':
            continue
        dia = pedido['fecha'].date()
        for indice, (inicio, fin, _) in enumerate(barras):
            if inicio <= dia < fin:
                por_periodo_externo[indice] += pedido['total']
                pedidos_externos_por_periodo[indice].add((pedido['sistema'], pedido['codigo']))
                total_externo += pedido['total']
                break

    series = [
        {
            'sistema': SISTEMA_PROPIO,
            'etiqueta': 'Semillas del Valle',
            'total': total,
            'valores': [
                {
                    'etiqueta': etiqueta,
                    'desde': inicio.isoformat(),
                    'total': por_periodo[indice],
                    'pedidos': len(pedidos_por_periodo[indice]),
                }
                for indice, (inicio, _, etiqueta) in enumerate(barras)
            ],
        }
    ]
    if conexion['estado'] == 'conectada':
        series.append({
            'sistema': sistema_externo,
            'etiqueta': sistema_externo.replace('-', ' ').title(),
            'total': total_externo,
            'valores': [
                {
                    'etiqueta': etiqueta,
                    'desde': inicio.isoformat(),
                    'total': por_periodo_externo[indice],
                    'pedidos': len(pedidos_externos_por_periodo[indice]),
                }
                for indice, (inicio, _, etiqueta) in enumerate(barras)
            ],
        })

    return {
        'periodo': tipo,
        'desde': barras[0][0].isoformat(),
        'hasta': (barras[-1][1] - timedelta(days=1)).isoformat(),
        'total_ventas': total,
        'variacion': variacion(total, total_anterior),
        'pedidos': len(pedidos),
        'clientes': len(clientes),
        'productos_distintos': len(productos),
        'unidades_vendidas': unidades_vendidas,
        'ticket_promedio': promedio(total, len(pedidos)),
        'conexion': conexion,
        'series': series,
        'serie': [
            {
                'etiqueta': etiqueta,
                'desde': inicio.isoformat(),
                'total': por_periodo[indice],
                'pedidos': len(pedidos_por_periodo[indice]),
            }
            for indice, (inicio, _, etiqueta) in enumerate(barras)
        ],
        'mas_vendidos': [
            {
                'id': p['producto'].pk,
                'nombre': p['producto'].nombre,
                'presentacion': p['producto'].presentacion,
                'unidades': p['unidades'],
                'total': p['total'],
            }
            for p in mas_vendidos
        ],
        'por_categoria': [
            {'categoria': nombre, 'total': valor}
            for nombre, valor in sorted(por_categoria.items(), key=lambda item: -item[1])
        ],
        'conversion': {
            'unidades_vendidas': unidades_vendidas,
            'unidades_canceladas': unidades_canceladas,
            'unidades_apartadas_ahora': apartadas_ahora,
            'porcentaje_compradas': round(unidades_vendidas / base_conversion * 100, 1) if base_conversion else None,
        },
    }
