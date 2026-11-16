from django.conf import settings
from django.db.models import Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsAdministrador, EsCliente

from . import servicios
from .models import DetallePedido, Pedido
from .serializers import (
    AgregarAlCarritoSerializer,
    CambiarCantidadSerializer,
    CambiarEstadoSerializer,
    PedidoSerializer,
    respuesta_stock_insuficiente,
)

PEDIDOS_POR_PAGINA = 20
PEDIDOS_POR_PAGINA_MAX = 100

CARRITO_VACIO = {
    'id': None, 'codigo': None, 'fecha': None, 'estado': Pedido.Estado.EN_PROCESO, 'estado_nombre': 'En proceso',
    'detalles': [], 'unidades': 0, 'total': 0, 'reservado_hasta': None,
}


def respuesta_error(error):
    if isinstance(error, servicios.StockInsuficiente):
        return Response(respuesta_stock_insuficiente(error), status=error.codigo_http)
    return Response({'detail': error.mensaje, **error.datos}, status=error.codigo_http)


def respuesta_pedido(pedido, codigo=status.HTTP_200_OK):
    if pedido is None:
        return Response(CARRITO_VACIO, status=codigo)
    # Se vuelve a leer con sus detalles para devolver los datos actualizados.
    pedido = consultar_pedidos().get(pk=pedido.pk)
    return Response(PedidoSerializer(pedido).data, status=codigo)


def consultar_pedidos():
    return Pedido.objects.select_related('usuario').prefetch_related(
        Prefetch('detalles', queryset=DetallePedido.objects.select_related('producto__categoria', 'producto__marca'))
    )


# ---------------------------------------------------------------------------
# Carrito (cliente)
# ---------------------------------------------------------------------------

class CarritoView(APIView):
    """GET /api/carrito/ — el pedido en proceso del cliente (o un carrito vacío)."""

    permission_classes = [EsCliente]

    def get(self, request):
        return respuesta_pedido(servicios.obtener_carrito(request.user))


class CarritoItemsView(APIView):
    """POST /api/carrito/items/ — {producto, cantidad}: «Agregar producto al carrito»."""

    permission_classes = [EsCliente]

    def post(self, request):
        datos = AgregarAlCarritoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        try:
            carrito = servicios.agregar_al_carrito(
                request.user, datos.validated_data['producto'], datos.validated_data['cantidad']
            )
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(carrito, status.HTTP_201_CREATED)


class CarritoItemView(APIView):
    """PATCH /api/carrito/items/<producto>/ — {cantidad}. DELETE — quita el producto."""

    permission_classes = [EsCliente]

    def patch(self, request, producto_id):
        datos = CambiarCantidadSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        return self._cambiar(request, producto_id, datos.validated_data['cantidad'])

    def delete(self, request, producto_id):
        return self._cambiar(request, producto_id, 0)

    def _cambiar(self, request, producto_id, cantidad):
        try:
            carrito = servicios.cambiar_cantidad(request.user, producto_id, cantidad)
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(carrito)


class ConfirmarCarritoView(APIView):
    """POST /api/carrito/confirmar/ — «Confirmar pedido»."""

    permission_classes = [EsCliente]

    def post(self, request):
        try:
            pedido = servicios.confirmar_carrito(request.user)
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(pedido)


class CancelarCarritoView(APIView):
    """POST /api/carrito/cancelar/ — «Cancelar pedido» (el que está en proceso)."""

    permission_classes = [EsCliente]

    def post(self, request):
        try:
            pedido = servicios.cancelar_carrito(request.user)
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(pedido)


# ---------------------------------------------------------------------------
# Pedidos (cliente: los suyos; administrador: todos)
# ---------------------------------------------------------------------------

class PedidoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/pedidos/                     — historial (?estado=0|1|2 &buscar= &limite= &pagina= &por_pagina=)
    GET  /api/pedidos/<id>/                — detalle
    POST /api/pedidos/<id>/cancelar/       — cancelar
    POST /api/pedidos/<id>/estado/         — {estado}: «Actualizar estado del pedido» (administrador)
    POST /api/pedidos/liberar-carritos/    — libera los carritos inactivos (administrador)
    """

    serializer_class = PedidoSerializer

    def get_queryset(self):
        pedidos = consultar_pedidos()
        usuario = self.request.user
        if not usuario.es_admin:
            pedidos = pedidos.filter(usuario=usuario)

        parametros = self.request.query_params
        estado = parametros.get('estado', '')
        if estado != '':
            pedidos = pedidos.filter(estado=estado) if estado in {'0', '1', '2'} else pedidos.none()
        if usuario.es_admin and (texto := parametros.get('buscar', '').strip()):
            filtro = (
                Q(usuario__first_name__icontains=texto)
                | Q(usuario__last_name__icontains=texto)
                | Q(usuario__email__icontains=texto)
            )
            numero = texto.upper().removeprefix('PED-').lstrip('0')
            if numero.isdigit():
                filtro |= Q(pk=int(numero))
            pedidos = pedidos.filter(filtro)
        return pedidos.order_by('-fecha', '-id')

    def list(self, request, *args, **kwargs):
        pedidos = self.get_queryset()
        parametros = request.query_params

        # ?pagina=N: devuelve solo una página y el total. Así la lista del administrador
        # no manda miles de pedidos en cada consulta.
        pagina = parametros.get('pagina', '')
        if pagina.isdigit():
            pagina = max(int(pagina), 1)
            por_pagina = parametros.get('por_pagina', '')
            por_pagina = min(int(por_pagina), PEDIDOS_POR_PAGINA_MAX) if por_pagina.isdigit() and int(por_pagina) > 0 else PEDIDOS_POR_PAGINA
            total = pedidos.count()
            inicio = (pagina - 1) * por_pagina
            return Response({
                'total': total,
                'pagina': pagina,
                'por_pagina': por_pagina,
                'hay_mas': inicio + por_pagina < total,
                'resultados': self.get_serializer(pedidos[inicio:inicio + por_pagina], many=True).data,
            })

        limite = parametros.get('limite', '')
        if limite.isdigit():
            pedidos = pedidos[: int(limite)]
        return Response(self.get_serializer(pedidos, many=True).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        try:
            pedido = servicios.cancelar_pedido(request.user, self._id(pk))
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(pedido)

    @action(detail=True, methods=['post'], permission_classes=[EsAdministrador])
    def estado(self, request, pk=None):
        datos = CambiarEstadoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        try:
            pedido = servicios.actualizar_estado(request.user, self._id(pk), datos.validated_data['estado'])
        except servicios.ErrorPedido as error:
            return respuesta_error(error)
        return respuesta_pedido(pedido)

    @action(detail=False, methods=['post'], url_path='liberar-carritos', permission_classes=[EsAdministrador])
    def liberar_carritos(self, request):
        horas = request.data.get('horas', settings.HORAS_RESERVA_CARRITO)
        try:
            horas = int(horas)
        except (TypeError, ValueError):
            return Response({'horas': ['Debe ser un número de horas.']}, status=status.HTTP_400_BAD_REQUEST)
        if horas < 1:
            return Response({'horas': ['Debe ser al menos 1 hora.']}, status=status.HTTP_400_BAD_REQUEST)
        liberados = servicios.liberar_carritos_inactivos(horas)
        return Response({'liberados': liberados, 'horas': horas})

    @staticmethod
    def _id(pk):
        return int(pk) if str(pk).isdigit() else 0
