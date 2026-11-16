from django.contrib import admin

from .models import Categoria, Marca, Producto


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)


@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre', 'presentacion', 'categoria', 'marca', 'precio_unitario',
        'stock_disponible', 'stock_apartado', 'fecha_vencimiento',
    )
    list_filter = ('categoria', 'marca')
    search_fields = ('nombre',)
    readonly_fields = ('stock_apartado',)
