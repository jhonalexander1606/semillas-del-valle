from rest_framework.response import Response
from rest_framework.views import APIView

from integracion.datos import ESTADOS, cargar_pedidos
from usuarios.permissions import EsAdministrador

from . import informes
from .calculos import reporte_ventas, resumen_inicio


class InicioAdminView(APIView):
    """GET /api/reportes/inicio/ — ventas de hoy, alertas de stock y de vencimiento, últimas ventas."""

    permission_classes = [EsAdministrador]

    def get(self, request):
        return Response(resumen_inicio())


class VentasView(APIView):
    """GET /api/reportes/ventas/?periodo=semana|mes|anio — «Consultar reportes de ventas»."""

    permission_classes = [EsAdministrador]

    def get(self, request):
        return Response(reporte_ventas(request.query_params.get('periodo', 'mes')))


class InformePedidosView(APIView):
    """Filtros comunes de los informes: ?desde=AAAA-MM-DD &hasta=AAAA-MM-DD &estado=en_proceso|completado|cancelado"""

    permission_classes = [EsAdministrador]

    def get(self, request):
        parametros = request.query_params
        try:
            desde, hasta = informes.leer_rango(parametros)
            pedidos, conexion = cargar_pedidos(desde, hasta)
            pedidos = informes.filtrar_estado(pedidos, parametros.get('estado', ''), ESTADOS)
            datos = self.construir(pedidos, parametros, desde, hasta)
        except informes.ErrorFiltros as error:
            return Response({'detail': str(error)}, status=400)
        return Response({**datos, 'desde': desde.isoformat(), 'hasta': hasta.isoformat(), 'conexion': conexion})


class InformeTabularView(InformePedidosView):
    """GET /api/reportes/pedidos/tabular/ — una fila por pedido, de 20 en 20 (?pagina=1)."""

    def construir(self, pedidos, parametros, desde, hasta):
        pagina = parametros.get('pagina', '1')
        return informes.informe_tabular(pedidos, ESTADOS, int(pagina) if pagina.isdigit() else 1)


class InformeConsolidadoView(InformePedidosView):
    """GET /api/reportes/pedidos/consolidado/?agrupar=mes|estado|categoria|sistema — también alimenta el gráfico."""

    def construir(self, pedidos, parametros, desde, hasta):
        return informes.informe_consolidado(pedidos, parametros.get('agrupar', 'mes'), ESTADOS, desde, hasta)
