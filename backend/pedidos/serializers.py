from rest_framework import serializers

from catalogo.serializers import ProductoCatalogoSerializer

from .models import Pedido
from .servicios import vencimiento_reserva


def precio_vigente(detalle, pedido):
    # Mientras es carrito se cobra el precio actual del producto; al confirmarse queda fijo.
    if pedido.estado == Pedido.Estado.EN_PROCESO:
        return detalle.producto.precio_unitario
    return detalle.precio_unitario


class DetalleSerializer(serializers.Serializer):
    def to_representation(self, detalle):
        pedido = self.context['pedido']
        producto = detalle.producto
        precio = precio_vigente(detalle, pedido)
        datos = {
            'producto': producto.pk,
            'nombre': producto.nombre,
            'presentacion': producto.presentacion,
            'marca': producto.marca.nombre,
            'categoria': producto.categoria.nombre,
            'imagen_url': producto.imagen_url,
            'cantidad': detalle.cantidad,
            'precio_unitario': precio,
            'subtotal': precio * detalle.cantidad,
        }
        if pedido.estado == Pedido.Estado.EN_PROCESO:
            # Cuántas unidades más se pueden agregar desde el carrito.
            datos['disponible'] = producto.stock_disponible
        return datos


class PedidoSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(read_only=True)
    estado_nombre = serializers.CharField(source='get_estado_display', read_only=True)
    detalles = serializers.SerializerMethodField()
    unidades = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    reservado_hasta = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id', 'codigo', 'fecha', 'estado', 'estado_nombre', 'cliente',
            'detalles', 'unidades', 'total', 'reservado_hasta',
        ]

    def get_detalles(self, pedido):
        detalles = sorted(pedido.detalles.all(), key=lambda d: d.producto.nombre)
        return DetalleSerializer(detalles, many=True, context={'pedido': pedido}).data

    def get_unidades(self, pedido):
        return sum(d.cantidad for d in pedido.detalles.all())

    def get_total(self, pedido):
        return sum((precio_vigente(d, pedido) * d.cantidad for d in pedido.detalles.all()), 0)

    def get_reservado_hasta(self, pedido):
        if pedido.estado != Pedido.Estado.EN_PROCESO:
            return None
        return serializers.DateTimeField().to_representation(vencimiento_reserva(pedido))

    def get_cliente(self, pedido):
        usuario = pedido.usuario
        return {
            'id': usuario.pk,
            'nombre': usuario.first_name,
            'apellido': usuario.last_name,
            'email': usuario.email,
        }


class AgregarAlCarritoSerializer(serializers.Serializer):
    producto = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1, max_value=999, default=1)


class CambiarCantidadSerializer(serializers.Serializer):
    cantidad = serializers.IntegerField(min_value=0, max_value=999)


class CambiarEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Pedido.Estado.choices)


def respuesta_stock_insuficiente(error):
    """Cuerpo de la respuesta 409: el mensaje y las alternativas que se le ofrecen al cliente."""
    return {
        'detail': error.mensaje,
        'disponible': error.datos['disponible'],
        'alternativas': ProductoCatalogoSerializer(error.datos['alternativas'], many=True).data,
    }
