"""
Informes de pedidos: tabular y consolidado (el gráfico dibuja los datos del consolidado).

Se calculan sobre el formato común de `integracion.datos`, así que incluyen al otro sistema
en cuanto la conexión esté configurada.
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.utils import timezone

from integracion.datos import numero

from .calculos import MESES, _sumar_meses

POR_PAGINA = 20
AGRUPACIONES = ('mes', 'estado', 'categoria', 'sistema')


class ErrorFiltros(Exception):
    """Un filtro del informe no es válido. El mensaje se muestra al usuario."""


def leer_rango(parametros):
    """Lee ?desde y ?hasta. Por defecto: desde el inicio del mes de hace 5 meses hasta hoy."""
    hoy = timezone.localdate()
    try:
        desde = date.fromisoformat(parametros['desde']) if parametros.get('desde') else _sumar_meses(hoy.replace(day=1), -5)
        hasta = date.fromisoformat(parametros['hasta']) if parametros.get('hasta') else hoy
    except ValueError as error:
        raise ErrorFiltros('Las fechas deben tener el formato AAAA-MM-DD.') from error
    if desde > hasta:
        raise ErrorFiltros('La fecha inicial no puede ser posterior a la fecha final.')
    return desde, hasta


def filtrar_estado(pedidos, estado, estados_validos):
    if not estado:
        return pedidos
    if estado not in estados_validos:
        raise ErrorFiltros('El estado no es válido.')
    return [p for p in pedidos if p['estado'] == estado]


def totales(pedidos):
    return {
        'pedidos': len(pedidos),
        'unidades': sum(p['unidades'] for p in pedidos),
        'total': numero(sum((p['total'] for p in pedidos), Decimal('0'))),
    }


def informe_tabular(pedidos, nombres_estado, pagina):
    """Una fila por pedido, de la más reciente a la más antigua, con los totales de todo el filtro."""
    paginas = max((len(pedidos) + POR_PAGINA - 1) // POR_PAGINA, 1)
    pagina = min(max(pagina, 1), paginas)
    inicio = (pagina - 1) * POR_PAGINA
    return {
        'filas': [
            {
                'sistema': p['sistema'],
                'codigo': p['codigo'],
                'fecha': p['fecha'].isoformat(),
                'cliente': p['cliente'],
                'productos': [linea['producto'] for linea in p['lineas']],
                'unidades': p['unidades'],
                'total': numero(p['total']),
                'estado': p['estado'],
                'estado_nombre': nombres_estado[p['estado']],
            }
            for p in pedidos[inicio:inicio + POR_PAGINA]
        ],
        'pagina': pagina,
        'paginas': paginas,
        'totales': totales(pedidos),
    }


def _meses_del_rango(desde, hasta):
    mes, ultimo = desde.replace(day=1), hasta.replace(day=1)
    while mes <= ultimo:
        yield mes
        mes = _sumar_meses(mes, 1)


def informe_consolidado(pedidos, agrupar, nombres_estado, desde, hasta):
    """Pedidos, unidades y dinero por grupo. Por mes aparecen también los meses sin pedidos."""
    if agrupar not in AGRUPACIONES:
        raise ErrorFiltros('La agrupación no es válida.')

    grupos = defaultdict(lambda: {'pedidos': set(), 'unidades': 0, 'total': Decimal('0')})
    if agrupar == 'mes':
        for mes in _meses_del_rango(desde, hasta):
            grupos[mes.isoformat()[:7]]  # crea el grupo aunque quede vacío

    for pedido in pedidos:
        identificador = (pedido['sistema'], pedido['codigo'])
        if agrupar == 'categoria':
            for linea in pedido['lineas']:
                grupo = grupos[linea['categoria']]
                grupo['pedidos'].add(identificador)
                grupo['unidades'] += linea['cantidad']
                grupo['total'] += linea['subtotal']
            continue
        clave = {
            'mes': pedido['fecha'].strftime('%Y-%m'),
            'estado': pedido['estado'],
            'sistema': pedido['sistema'],
        }[agrupar]
        grupo = grupos[clave]
        grupo['pedidos'].add(identificador)
        grupo['unidades'] += pedido['unidades']
        grupo['total'] += pedido['total']

    def etiqueta(clave):
        if agrupar == 'mes':
            anio, mes = clave.split('-')
            return f'{MESES[int(mes) - 1]} {anio[2:]}'
        return nombres_estado[clave] if agrupar == 'estado' else clave

    suma = sum((g['total'] for g in grupos.values()), Decimal('0'))
    ordenados = sorted(grupos.items()) if agrupar == 'mes' else sorted(grupos.items(), key=lambda g: -g[1]['total'])
    return {
        'agrupar': agrupar,
        'filas': [
            {
                'clave': clave,
                'etiqueta': etiqueta(clave),
                'pedidos': len(grupo['pedidos']),
                'unidades': grupo['unidades'],
                'total': numero(grupo['total']),
                'porcentaje': round(float(grupo['total'] / suma * 100), 1) if suma else 0,
            }
            for clave, grupo in ordenados
        ],
        'totales': totales(pedidos),
    }
