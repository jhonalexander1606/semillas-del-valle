import secrets

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from reportes.informes import ErrorFiltros, leer_rango

from .datos import SISTEMA_PROPIO, pedidos_propios


class TieneTokenIntegracion(BasePermission):
    """Exige el token compartido con el otro sistema. Sin API_INTEGRACION_TOKEN en el .env, nadie entra."""

    message = 'Token de integración no válido.'

    def has_permission(self, request, view):
        token = settings.API_INTEGRACION_TOKEN
        encabezado = request.headers.get('Authorization', '')
        return bool(token) and encabezado.startswith('Bearer ') and secrets.compare_digest(
            encabezado.removeprefix('Bearer ').encode(), token.encode()
        )


class PedidosIntegracionView(APIView):
    """GET /api/integracion/pedidos/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD — entrega los pedidos a otro sistema."""

    authentication_classes = []
    permission_classes = [TieneTokenIntegracion]

    def get(self, request):
        try:
            desde, hasta = leer_rango(request.query_params)
        except ErrorFiltros as error:
            return Response({'detail': str(error)}, status=400)
        return Response({'sistema': SISTEMA_PROPIO, 'pedidos': pedidos_propios(desde, hasta)})
