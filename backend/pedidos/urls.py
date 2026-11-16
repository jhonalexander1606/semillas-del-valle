from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    CancelarCarritoView,
    CarritoItemsView,
    CarritoItemView,
    CarritoView,
    ConfirmarCarritoView,
    PedidoViewSet,
)

router = SimpleRouter()
router.register('pedidos', PedidoViewSet, basename='pedido')

urlpatterns = [
    path('carrito/', CarritoView.as_view(), name='carrito'),
    path('carrito/items/', CarritoItemsView.as_view(), name='carrito-items'),
    path('carrito/items/<int:producto_id>/', CarritoItemView.as_view(), name='carrito-item'),
    path('carrito/confirmar/', ConfirmarCarritoView.as_view(), name='carrito-confirmar'),
    path('carrito/cancelar/', CancelarCarritoView.as_view(), name='carrito-cancelar'),
    *router.urls,
]
