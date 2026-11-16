from django.core.validators import MinValueValidator
from django.db import models


class Categoria(models.Model):
    """Tipo de semilla: Frutas, Pasto de corte, Hortalizas, Otros agrícolas..."""

    id = models.BigAutoField(primary_key=True, db_column='cate_id')
    nombre = models.CharField('nombre', max_length=60, unique=True, db_column='cate_nombre')

    class Meta:
        db_table = 'categoria'
        ordering = ['nombre']
        verbose_name = 'categoría'
        verbose_name_plural = 'categorías'

    def __str__(self):
        return self.nombre


class Marca(models.Model):
    id = models.BigAutoField(primary_key=True, db_column='marca_id')
    nombre = models.CharField('nombre', max_length=80, unique=True, db_column='marca_nombre')

    class Meta:
        db_table = 'marca'
        ordering = ['nombre']
        verbose_name = 'marca'
        verbose_name_plural = 'marcas'

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    """
    Cada presentación es un producto distinto ("Tomate chonto 50 g" y "Tomate chonto 100 g").

    El inventario se maneja con dos cantidades:
    - stock_disponible: lo que se puede vender ya.
    - stock_apartado: lo que está reservado en carritos (pedidos en proceso).
    Al agregar al carrito pasa de disponible a apartado; al confirmar sale de apartado
    (queda vendido); al cancelar vuelve de apartado a disponible.
    """

    class Unidad(models.TextChoices):
        GRAMOS = 'g', 'g'
        KILOGRAMOS = 'kg', 'kg'
        UNIDADES = 'unidad', 'unidad'

    id = models.BigAutoField(primary_key=True, db_column='prod_id')
    nombre = models.CharField('nombre', max_length=120, db_column='prod_nombre')
    categoria = models.ForeignKey(
        Categoria, on_delete=models.PROTECT, related_name='productos', db_column='cate_id', verbose_name='categoría'
    )
    marca = models.ForeignKey(
        Marca, on_delete=models.PROTECT, related_name='productos', db_column='marca_id', verbose_name='marca'
    )
    stock_disponible = models.PositiveIntegerField('stock disponible', default=0)
    stock_apartado = models.PositiveIntegerField('stock apartado', default=0)
    precio_unitario = models.DecimalField(
        'precio unitario', max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    unidad_medida = models.CharField('unidad de medida', max_length=10, choices=Unidad.choices)
    contenido = models.DecimalField(
        'contenido', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)],
        help_text='Cantidad de la presentación: 50 (g), 1 (kg), 1 (unidad)...',
    )
    fecha_vencimiento = models.DateField('fecha de vencimiento', null=True, blank=True)

    class Meta:
        db_table = 'producto'
        ordering = ['nombre', 'contenido']
        verbose_name = 'producto'
        verbose_name_plural = 'productos'
        constraints = [
            models.UniqueConstraint(
                fields=['nombre', 'marca', 'contenido', 'unidad_medida'], name='producto_presentacion_unica'
            ),
        ]

    def __str__(self):
        return f'{self.nombre} {self.presentacion}'

    @property
    def presentacion(self):
        """'50 g', '1 kg', '1 unidad', '2 unidades'."""
        cantidad = self.contenido.normalize() if self.contenido is not None else ''
        if cantidad != '' and cantidad == cantidad.to_integral():
            cantidad = cantidad.quantize(1)
        unidad = self.unidad_medida
        if unidad == self.Unidad.UNIDADES and cantidad != 1:
            unidad = 'unidades'
        return f'{cantidad} {unidad}'
