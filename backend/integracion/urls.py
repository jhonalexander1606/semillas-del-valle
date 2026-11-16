from django.urls import path

from .views import PedidosIntegracionView

urlpatterns = [
    path('integracion/pedidos/', PedidosIntegracionView.as_view(), name='integracion-pedidos'),
]
