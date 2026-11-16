"""
Pedidos en el formato JSON acordado para el intercambio entre sistemas.

Los informes solo trabajan con este formato, sin importar de qué sistema venga cada pedido:
{
  "codigo": "PED-0012", "fecha": "2026-11-09T14:30:00-05:00", "cliente": "María Gómez",
  "estado": "completado", "total": 45000,
  "lineas": [{"producto": "...", "categoria": "...", "cantidad": 3, "precio_unitario": 15000}]
}
"""

from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Prefetch
from django.utils import timezone

from pedidos.models import DetallePedido, Pedido

from . import cliente

SISTEMA_PROPIO = 'semillas-del-valle'

ESTADOS = {'en_proceso': 'En proceso', 'completado': 'Completado', 'cancelado': 'Cancelado'}

ESTADO_JSON = {
    Pedido.Estado.EN_PROCESO: 'en_proceso',
    Pedido.Estado.COMPLETADO: 'completado',
    Pedido.Estado.CANCELADO: 'cancelado',
}


def numero(valor):
    """Decimal a número de JSON: 45000 en lugar de "45000.00"."""
    return int(valor) if valor == valor.to_integral() else float(valor)


def pedidos_propios(desde, hasta):
    """Pedidos de este sistema con fecha entre `desde` y `hasta` (ambos incluidos). Un carrito vacío no cuenta."""
    # Import diferido: reportes.calculos también usa este módulo y Django cargaría ambos en círculo.
    from reportes.calculos import inicio_del_dia  # noqa: PLC0415
    pedidos = (
        Pedido.objects.filter(fecha__gte=inicio_del_dia(desde), fecha__lt=inicio_del_dia(hasta + timedelta(days=1)))
        .select_related('usuario')
        .prefetch_related(
            Prefetch('detalles', queryset=DetallePedido.objects.select_related('producto__categoria'))
        )
        .order_by('-fecha', '-id')
    )
    resultado = []
    for pedido in pedidos:
        detalles = list(pedido.detalles.all())
        if not detalles:
            continue
        resultado.append({
            'codigo': pedido.codigo,
            'fecha': timezone.localtime(pedido.fecha).isoformat(),
            'cliente': f'{pedido.usuario.first_name} {pedido.usuario.last_name}'.strip(),
            'estado': ESTADO_JSON[pedido.estado],
            'total': numero(sum((d.subtotal for d in detalles), Decimal('0'))),
            'lineas': [
                {
                    'producto': str(d.producto),
                    'categoria': d.producto.categoria.nombre,
                    'cantidad': d.cantidad,
                    'precio_unitario': numero(d.precio_unitario),
                }
                for d in detalles
            ],
        })
    return resultado


def normalizar(pedido, sistema):
    """Valida un pedido en el formato acordado y lo deja listo para calcular. El total sale de sus líneas."""
    try:
        fecha = datetime.fromisoformat(pedido['fecha'].replace('Z', '+00:00'))
        if timezone.is_naive(fecha):
            fecha = timezone.make_aware(fecha)
        estado = pedido['estado']
        if estado not in ESTADOS:
            raise ValueError(estado)
        lineas = [
            {
                'producto': str(linea['producto']),
                'categoria': str(linea['categoria']),
                'cantidad': int(linea['cantidad']),
                'subtotal': int(linea['cantidad']) * Decimal(str(linea['precio_unitario'])),
            }
            for linea in pedido['lineas']
        ]
        return {
            'sistema': sistema,
            'codigo': str(pedido['codigo']),
            'fecha': timezone.localtime(fecha),
            'cliente': str(pedido['cliente']),
            'estado': estado,
            'lineas': lineas,
            'unidades': sum(linea['cantidad'] for linea in lineas),
            'total': sum((linea['subtotal'] for linea in lineas), Decimal('0')),
        }
    except (AttributeError, InvalidOperation, KeyError, TypeError, ValueError) as error:
        raise cliente.ErrorIntegracion('El otro sistema envió un pedido con un formato no válido.') from error


def cargar_pedidos(desde, hasta):
    """
    Pedidos para los informes: los propios y, si la conexión está configurada, los del otro sistema.

    Si el otro sistema falla no se devuelve nada de él (ni una parte), y `conexion` lo informa
    para que el informe no presente como completo un total incompleto.
    """
    pedidos = [normalizar(p, SISTEMA_PROPIO) for p in pedidos_propios(desde, hasta)]
    conexion = {'estado': 'sin_configurar', 'mensaje': None, 'sistemas': [SISTEMA_PROPIO]}

    if settings.API_EXTERNA_URL:
        try:
            respuesta = cliente.pedidos_externos(desde, hasta)
            sistema = str(respuesta.get('sistema') or 'otro-grupo')
            externos = [normalizar(p, sistema) for p in respuesta['pedidos']]
        except (AttributeError, KeyError, TypeError):
            conexion.update(estado='error', mensaje='El otro sistema respondió con un formato no válido.')
        except cliente.ErrorIntegracion as error:
            conexion.update(estado='error', mensaje=str(error))
        else:
            pedidos += [p for p in externos if desde <= p['fecha'].date() <= hasta]
            conexion.update(estado='conectada', sistemas=[SISTEMA_PROPIO, sistema])

    pedidos.sort(key=lambda p: p['fecha'], reverse=True)
    return pedidos, conexion


def solo_externos(desde, hasta):
    """
    Pedidos del otro sistema únicamente, para cuando los cálculos locales ya están hechos.

    Devuelve (nombre_sistema, lista_pedidos, info_conexion) con la misma estructura de `conexion`
    que `cargar_pedidos`. Si la conexión no está configurada o falla, devuelve lista vacía.
    """
    conexion = {'estado': 'sin_configurar', 'mensaje': None, 'sistemas': [SISTEMA_PROPIO]}
    if not settings.API_EXTERNA_URL:
        return SISTEMA_PROPIO, [], conexion

    try:
        respuesta = cliente.pedidos_externos(desde, hasta)
        sistema = str(respuesta.get('sistema') or 'otro-grupo')
        externos = [normalizar(p, sistema) for p in respuesta['pedidos']]
    except (AttributeError, KeyError, TypeError):
        conexion.update(estado='error', mensaje='El otro sistema respondió con un formato no válido.')
        return SISTEMA_PROPIO, [], conexion
    except cliente.ErrorIntegracion as error:
        conexion.update(estado='error', mensaje=str(error))
        return SISTEMA_PROPIO, [], conexion

    externos = [p for p in externos if desde <= p['fecha'].date() <= hasta]
    conexion.update(estado='conectada', sistemas=[SISTEMA_PROPIO, sistema])
    return sistema, externos, conexion
