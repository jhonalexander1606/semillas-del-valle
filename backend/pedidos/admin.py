from django.contrib import admin
from django.utils.html import format_html_join

from .models import Pedido


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    """Solo para consultar. Los cambios de estado se hacen desde la app, que mueve el inventario."""

    list_display = ('codigo', 'usuario', 'fecha', 'estado', 'unidades', 'total')
    list_filter = ('estado',)
    search_fields = ('usuario__email', 'usuario__first_name', 'usuario__last_name')
    readonly_fields = ('usuario', 'fecha', 'estado', 'productos')
    fields = readonly_fields

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('usuario').prefetch_related('detalles__producto')

    @admin.display(description='Productos')
    def productos(self, pedido):
        return format_html_join(
            '', '<div>{} × {} — ${}</div>',
            ((d.producto, d.cantidad, d.precio_unitario) for d in pedido.detalles.all()),
        )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
