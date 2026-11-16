from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from catalogo.models import Producto


class Pedido(models.Model):
    """
    Un pedido pasa por tres estados (los mismos del modelo de base de datos):

    - 1 En proceso: es el carrito del cliente. Sus productos están apartados.
    - 2 Completado: el cliente lo confirmó. Lo apartado queda vendido y el pedido
      queda listo para pasar a la plataforma de pagos (fuera del alcance del proyecto).
    - 0 Cancelado: lo canceló el cliente o el administrador, o se liberó por inactividad.
      Lo que estaba apartado vuelve a estar disponible.

    `fecha` guarda el último movimiento: mientras es carrito se actualiza con cada cambio
    (así se sabe si quedó abandonado) y al confirmarse queda como la fecha de la compra.
    """

    class Estado(models.IntegerChoices):
        CANCELADO = 0, 'Cancelado'
        EN_PROCESO = 1, 'En proceso'
        COMPLETADO = 2, 'Completado'

    id = models.BigAutoField(primary_key=True, db_column='ped_id')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='pedidos', db_column='usr_id',
        verbose_name='cliente',
    )
    fecha = models.DateTimeField('fecha', default=timezone.now, db_column='ped_fecha')
    estado = models.PositiveSmallIntegerField(
        'estado', choices=Estado.choices, default=Estado.EN_PROCESO, db_column='ped_estado'
    )

    class Meta:
        db_table = 'pedido'
        ordering = ['-fecha', '-id']
        verbose_name = 'pedido'
        verbose_name_plural = 'pedidos'
        indexes = [models.Index(fields=['estado', 'fecha'], name='pedido_estado_fecha')]

    def __str__(self):
        return self.codigo

    @property
    def codigo(self):
        return f'PED-{self.id:04d}' if self.id else 'PED-nuevo'

    @property
    def total(self):
        return sum((detalle.subtotal for detalle in self.detalles.all()), Decimal('0'))

    @property
    def unidades(self):
        return sum(detalle.cantidad for detalle in self.detalles.all())


class DetallePedido(models.Model):
    """
    Una línea del pedido: qué producto, cuántas unidades y a qué precio.
    La clave primaria es compuesta (pedido, producto), como en el diseño de la base de datos:
    un producto aparece una sola vez en cada pedido.
    """

    pk = models.CompositePrimaryKey('pedido_id', 'producto_id')
    pedido = models.ForeignKey(
        Pedido, on_delete=models.CASCADE, related_name='detalles', db_column='ped_id', verbose_name='pedido'
    )
    producto = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name='detalles', db_column='prod_id', verbose_name='producto'
    )
    cantidad = models.PositiveIntegerField('cantidad', validators=[MinValueValidator(1)])
    # Precio al momento de la compra: si el producto sube de precio después, el pedido no cambia.
    precio_unitario = models.DecimalField('precio unitario', max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'detalle_pedido'
        verbose_name = 'detalle del pedido'
        verbose_name_plural = 'detalles del pedido'

    def __str__(self):
        return f'{self.producto} × {self.cantidad}'

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario
