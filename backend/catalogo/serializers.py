from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator, UniqueValidator

from .models import Categoria, Marca, Producto


def _nombre_unico(modelo, mensaje):
    return UniqueValidator(queryset=modelo.objects.all(), lookup='iexact', message=mensaje)


class CategoriaSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(
        max_length=60, validators=[_nombre_unico(Categoria, 'Ya existe una categoría con ese nombre.')]
    )
    total_productos = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'total_productos']

    def validate_nombre(self, valor):
        valor = ' '.join(valor.split())
        if not valor:
            raise serializers.ValidationError('Escribe el nombre.')
        return valor


class MarcaSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(
        max_length=80, validators=[_nombre_unico(Marca, 'Ya existe una marca con ese nombre.')]
    )
    total_productos = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Marca
        fields = ['id', 'nombre', 'total_productos']

    def validate_nombre(self, valor):
        valor = ' '.join(valor.split())
        if not valor:
            raise serializers.ValidationError('Escribe el nombre.')
        return valor


def estado_stock(producto):
    if producto.stock_disponible == 0:
        return 'agotado'
    if producto.stock_disponible <= settings.STOCK_MINIMO:
        return 'bajo'
    return 'normal'


def por_vencer(producto):
    if not producto.fecha_vencimiento:
        return False
    return (producto.fecha_vencimiento - timezone.localdate()).days <= settings.DIAS_ALERTA_VENCIMIENTO


class ProductoSerializer(serializers.ModelSerializer):
    """Lo que ve el administrador: incluye el stock apartado y permite crear y editar."""

    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    marca_nombre = serializers.CharField(source='marca.nombre', read_only=True)
    presentacion = serializers.CharField(read_only=True)
    estado_stock = serializers.SerializerMethodField()
    por_vencer = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'categoria', 'categoria_nombre', 'marca', 'marca_nombre',
            'presentacion', 'unidad_medida', 'contenido', 'precio_unitario',
            'stock_disponible', 'stock_apartado', 'fecha_vencimiento', 'imagen_url', 'estado_stock', 'por_vencer',
        ]
        # El stock apartado solo lo mueven el carrito y los pedidos.
        read_only_fields = ['stock_apartado']
        validators = [
            UniqueTogetherValidator(
                queryset=Producto.objects.all(),
                fields=['nombre', 'marca', 'contenido', 'unidad_medida'],
                message='Ya existe ese producto con la misma marca y presentación.',
            )
        ]

    def get_estado_stock(self, producto):
        return estado_stock(producto)

    def get_por_vencer(self, producto):
        return por_vencer(producto)

    def validate_nombre(self, valor):
        valor = ' '.join(valor.split())
        if not valor:
            raise serializers.ValidationError('Escribe el nombre del producto.')
        return valor

    def validate_precio_unitario(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('El precio debe ser mayor que cero.')
        return valor

    def validate_contenido(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('El contenido debe ser mayor que cero.')
        return valor


class ProductoCatalogoSerializer(ProductoSerializer):
    """Lo que ve el cliente en el catálogo (sin el stock apartado)."""

    class Meta(ProductoSerializer.Meta):
        fields = [
            'id', 'nombre', 'categoria', 'categoria_nombre', 'marca', 'marca_nombre',
            'presentacion', 'precio_unitario', 'stock_disponible', 'fecha_vencimiento', 'imagen_url', 'estado_stock',
        ]
        read_only_fields = fields
