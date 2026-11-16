from django.urls import path

from .views import InformeConsolidadoView, InformeTabularView, InicioAdminView, VentasView

urlpatterns = [
    path('reportes/inicio/', InicioAdminView.as_view(), name='reporte-inicio'),
    path('reportes/ventas/', VentasView.as_view(), name='reporte-ventas'),
    path('reportes/pedidos/tabular/', InformeTabularView.as_view(), name='informe-tabular'),
    path('reportes/pedidos/consolidado/', InformeConsolidadoView.as_view(), name='informe-consolidado'),
]
