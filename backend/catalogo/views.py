from django.conf import settings
from django.db.models import Count, ProtectedError, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from pedidos.servicios import alternativas_de
from usuarios.permissions import EsAdministradorOSoloLectura

from .models import Categoria, Marca, Producto
from .serializers import CategoriaSerializer, MarcaSerializer, ProductoCatalogoSerializer, ProductoSerializer


class BorradoProtegidoMixin:
    """No deja borrar algo que está en uso (por ejemplo, una categoría con productos)."""

    mensaje_protegido = 'No se puede eliminar porque está en uso.'

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'detail': self.mensaje_protegido}, status=status.HTTP_409_CONFLICT)


class CategoriaViewSet(BorradoProtegidoMixin, viewsets.ModelViewSet):
    """/api/categorias/ — consultar (todos) y gestionar (administrador)."""

    serializer_class = CategoriaSerializer
    permission_classes = [EsAdministradorOSoloLectura]
    queryset = Categoria.objects.annotate(total_productos=Count('productos')).order_by('nombre')
    mensaje_protegido = 'No se puede eliminar: la categoría tiene productos. Cámbialos de categoría primero.'


class MarcaViewSet(BorradoProtegidoMixin, viewsets.ModelViewSet):
    """/api/marcas/ — consultar (todos) y gestionar (administrador)."""

    serializer_class = MarcaSerializer
    permission_classes = [EsAdministradorOSoloLectura]
    queryset = Marca.objects.annotate(total_productos=Count('productos')).order_by('nombre')
    mensaje_protegido = 'No se puede eliminar: la marca tiene productos. Cámbialos de marca primero.'


class ProductoViewSet(BorradoProtegidoMixin, viewsets.ModelViewSet):
    """
    /api/productos/ — el catálogo.

    Filtros: ?categoria=<id> &marca=<id> &buscar=<texto> &disponibles=1 &alerta=1
    """

    permission_classes = [EsAdministradorOSoloLectura]
    mensaje_protegido = (
        'No se puede eliminar: el producto aparece en pedidos. Si ya no lo vendes, deja su stock disponible en 0.'
    )

    def get_serializer_class(self):
        if getattr(self.request.user, 'es_admin', False):
            return ProductoSerializer
        return ProductoCatalogoSerializer

    def get_queryset(self):
        productos = Producto.objects.select_related('categoria', 'marca')
        parametros = self.request.query_params

        if categoria := parametros.get('categoria'):
            productos = productos.filter(categoria_id=categoria) if categoria.isdigit() else productos.none()
        if marca := parametros.get('marca'):
            productos = productos.filter(marca_id=marca) if marca.isdigit() else productos.none()
        if texto := parametros.get('buscar', '').strip():
            productos = productos.filter(
                Q(nombre__icontains=texto) | Q(marca__nombre__icontains=texto) | Q(categoria__nombre__icontains=texto)
            )
        if parametros.get('disponibles') == '1':
            productos = productos.filter(stock_disponible__gt=0)
        if parametros.get('alerta') == '1':
            productos = productos.filter(stock_disponible__lte=settings.STOCK_MINIMO)
        return productos.order_by('nombre', 'contenido')

    @action(detail=True, methods=['get'])
    def alternativas(self, request, pk=None):
        """GET /api/productos/<id>/alternativas/ — misma categoría y con unidades disponibles."""
        producto = self.get_object()
        serializer = ProductoCatalogoSerializer(alternativas_de(producto), many=True)
        return Response(serializer.data)
