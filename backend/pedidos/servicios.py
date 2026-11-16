"""
Reglas del negocio del carrito y los pedidos.

Todo el movimiento de inventario pasa por aquí, dentro de transacciones y con las filas
bloqueadas (SELECT ... FOR UPDATE), para que dos clientes no puedan apartar la misma unidad.

Regla de stock (el caso de uso «Actualizar stock de productos» que incluyen los demás):
- Agregar al carrito:  disponible -= n, apartado += n
- Quitar del carrito:  apartado -= n, disponible += n
- Confirmar pedido:    apartado -= n            (queda vendido)
- Cancelar en proceso: apartado -= n, disponible += n
- Cancelar completado: disponible += n          (devolución, solo el administrador)
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from catalogo.models import Producto

from .models import DetallePedido, Pedido

EN_PROCESO = Pedido.Estado.EN_PROCESO
COMPLETADO = Pedido.Estado.COMPLETADO
CANCELADO = Pedido.Estado.CANCELADO


class ErrorPedido(Exception):
    """Una regla del negocio que no se cumple. El mensaje se le muestra al usuario."""

    codigo_http = 400

    def __init__(self, mensaje, **datos):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.datos = datos


class NoEncontrado(ErrorPedido):
    codigo_http = 404


class StockInsuficiente(ErrorPedido):
    """No hay suficientes unidades disponibles. Trae productos alternativos de la misma categoría."""

    codigo_http = 409

    def __init__(self, producto, disponible, alternativas):
        if disponible == 0:
            mensaje = f'{producto} está agotado.'
        elif disponible == 1:
            mensaje = f'Solo queda 1 unidad de {producto}.'
        else:
            mensaje = f'Solo quedan {disponible} unidades de {producto}.'
        super().__init__(mensaje, disponible=disponible, alternativas=alternativas)
        self.producto = producto


def vencimiento_reserva(pedido):
    """Hasta cuándo se mantiene apartado un carrito sin movimiento."""
    return pedido.fecha + timedelta(hours=settings.HORAS_RESERVA_CARRITO)


def obtener_carrito(usuario):
    """El pedido en proceso del cliente, o None si no tiene."""
    return (
        Pedido.objects.filter(usuario=usuario, estado=EN_PROCESO)
        .prefetch_related('detalles__producto__categoria', 'detalles__producto__marca')
        .order_by('-fecha')
        .first()
    )


def alternativas_de(producto, limite=4):
    """Productos de la misma categoría que sí tienen unidades («Ofrecer alternativas»)."""
    return list(
        Producto.objects.filter(categoria_id=producto.categoria_id, stock_disponible__gt=0)
        .exclude(pk=producto.pk)
        .select_related('categoria', 'marca')
        .order_by('-stock_disponible', 'nombre')[:limite]
    )


# ---------------------------------------------------------------------------
# Piezas internas (siempre se llaman dentro de una transacción)
# ---------------------------------------------------------------------------

def _bloquear_usuario(usuario):
    # Pone en fila las operaciones de carrito de un mismo cliente: así nunca tiene dos carritos.
    get_user_model().objects.select_for_update().only('pk').get(pk=usuario.pk)


def _carrito_bloqueado(usuario, crear=False):
    _bloquear_usuario(usuario)
    carrito = Pedido.objects.select_for_update().filter(usuario=usuario, estado=EN_PROCESO).order_by('-fecha').first()
    if carrito is None and crear:
        carrito = Pedido.objects.create(usuario=usuario)
    return carrito


def _producto_bloqueado(producto_id):
    # Sin select_related: así solo se bloquea la fila del producto, no su categoría ni su marca.
    producto = Producto.objects.select_for_update().filter(pk=producto_id).first()
    if producto is None:
        raise NoEncontrado('El producto no existe.')
    return producto


def _productos_bloqueados(ids):
    # Siempre en el mismo orden (por id) para evitar bloqueos cruzados entre transacciones.
    return {p.pk: p for p in Producto.objects.select_for_update().filter(pk__in=ids).order_by('pk')}


def _apartar(producto, cantidad):
    if producto.stock_disponible < cantidad:
        raise StockInsuficiente(producto, producto.stock_disponible, alternativas_de(producto))
    producto.stock_disponible -= cantidad
    producto.stock_apartado += cantidad
    producto.save(update_fields=['stock_disponible', 'stock_apartado'])


def _liberar(producto, cantidad):
    producto.stock_apartado -= cantidad
    producto.stock_disponible += cantidad
    producto.save(update_fields=['stock_disponible', 'stock_apartado'])


def _tocar(carrito):
    carrito.fecha = timezone.now()
    carrito.save(update_fields=['fecha'])


def _completar(pedido):
    detalles = list(pedido.detalles.all())
    if not detalles:
        raise ErrorPedido('El pedido no tiene productos.')
    productos = _productos_bloqueados([d.producto_id for d in detalles])
    for detalle in detalles:
        producto = productos[detalle.producto_id]
        producto.stock_apartado -= detalle.cantidad
        producto.save(update_fields=['stock_apartado'])
        # El precio queda fijo desde este momento.
        DetallePedido.objects.filter(pedido=pedido, producto=producto).update(precio_unitario=producto.precio_unitario)
    pedido.estado = COMPLETADO
    pedido.fecha = timezone.now()
    pedido.save(update_fields=['estado', 'fecha'])


def _cancelar(pedido):
    detalles = list(pedido.detalles.all())
    productos = _productos_bloqueados([d.producto_id for d in detalles])
    for detalle in detalles:
        producto = productos[detalle.producto_id]
        if pedido.estado == EN_PROCESO:
            _liberar(producto, detalle.cantidad)
        else:  # completado: las unidades vendidas vuelven al inventario
            producto.stock_disponible += detalle.cantidad
            producto.save(update_fields=['stock_disponible'])
    pedido.estado = CANCELADO
    pedido.save(update_fields=['estado'])


def _pedido_bloqueado(pedido_id, usuario):
    pedido = Pedido.objects.select_for_update().filter(pk=pedido_id).first()
    if pedido is None or (not usuario.es_admin and pedido.usuario_id != usuario.pk):
        raise NoEncontrado('El pedido no existe.')
    return pedido


# ---------------------------------------------------------------------------
# Operaciones del cliente
# ---------------------------------------------------------------------------

def agregar_al_carrito(usuario, producto_id, cantidad):
    """«Agregar producto al carrito»: aparta las unidades. Si no alcanzan, ofrece alternativas."""
    if cantidad < 1:
        raise ErrorPedido('La cantidad debe ser al menos 1.')

    # Antes de apartar, se liberan los carritos abandonados de otros clientes.
    liberar_carritos_inactivos(excepto=usuario)

    with transaction.atomic():
        carrito = _carrito_bloqueado(usuario, crear=True)
        producto = _producto_bloqueado(producto_id)
        _apartar(producto, cantidad)

        detalle = DetallePedido.objects.filter(pedido=carrito, producto=producto).first()
        if detalle:
            DetallePedido.objects.filter(pedido=carrito, producto=producto).update(
                cantidad=detalle.cantidad + cantidad, precio_unitario=producto.precio_unitario
            )
        else:
            DetallePedido.objects.create(
                pedido=carrito, producto=producto, cantidad=cantidad, precio_unitario=producto.precio_unitario
            )
        _tocar(carrito)
    return obtener_carrito(usuario)


@transaction.atomic
def cambiar_cantidad(usuario, producto_id, cantidad):
    """Cambia las unidades de un producto del carrito. Con 0 se quita."""
    if cantidad < 0:
        raise ErrorPedido('La cantidad no puede ser negativa.')

    carrito = _carrito_bloqueado(usuario)
    detalle = DetallePedido.objects.filter(pedido=carrito, producto_id=producto_id).first() if carrito else None
    if detalle is None:
        raise NoEncontrado('Ese producto no está en tu carrito.')

    producto = _producto_bloqueado(producto_id)
    diferencia = cantidad - detalle.cantidad
    if diferencia > 0:
        _apartar(producto, diferencia)
    elif diferencia < 0:
        _liberar(producto, -diferencia)

    lineas = DetallePedido.objects.filter(pedido=carrito, producto=producto)
    if cantidad == 0:
        lineas.delete()
    else:
        lineas.update(cantidad=cantidad, precio_unitario=producto.precio_unitario)

    if not carrito.detalles.exists():
        # Un carrito vacío no guarda nada que valga la pena registrar.
        carrito.delete()
        return None
    _tocar(carrito)
    return carrito


@transaction.atomic
def confirmar_carrito(usuario):
    """«Confirmar pedido»: lo apartado queda vendido y el pedido pasa a Completado.
    Aquí termina el alcance del proyecto; el siguiente paso sería la plataforma de pagos."""
    carrito = _carrito_bloqueado(usuario)
    if carrito is None or not carrito.detalles.exists():
        raise ErrorPedido('Tu carrito está vacío.')
    _completar(carrito)
    return carrito


@transaction.atomic
def cancelar_carrito(usuario):
    carrito = _carrito_bloqueado(usuario)
    if carrito is None:
        raise NoEncontrado('No tienes un pedido en proceso.')
    _cancelar(carrito)
    return carrito


@transaction.atomic
def cancelar_pedido(usuario, pedido_id):
    """«Cancelar pedido». El cliente solo cancela su pedido en proceso; el administrador, cualquiera."""
    pedido = _pedido_bloqueado(pedido_id, usuario)
    if pedido.estado == CANCELADO:
        raise ErrorPedido('Este pedido ya está cancelado.')
    if pedido.estado == COMPLETADO and not usuario.es_admin:
        raise ErrorPedido('Solo puedes cancelar un pedido en proceso. Este ya fue confirmado.')
    _cancelar(pedido)
    return pedido


# ---------------------------------------------------------------------------
# Operaciones del administrador
# ---------------------------------------------------------------------------

@transaction.atomic
def actualizar_estado(usuario, pedido_id, estado):
    """«Actualizar estado del pedido» (administrador).

    En proceso → Completado (confirma en nombre del cliente)
    En proceso → Cancelado  (libera lo apartado)
    Completado → Cancelado  (devuelve las unidades al inventario)
    Un pedido cancelado no se reabre.
    """
    if estado not in Pedido.Estado.values:
        raise ErrorPedido('Estado no válido.')
    pedido = _pedido_bloqueado(pedido_id, usuario)
    if pedido.estado == estado:
        raise ErrorPedido(f'El pedido ya está {pedido.get_estado_display().lower()}.')
    if pedido.estado == CANCELADO:
        raise ErrorPedido('Un pedido cancelado no se puede reabrir.')
    if estado == EN_PROCESO:
        raise ErrorPedido('Un pedido completado no puede volver a ser un carrito.')

    if estado == COMPLETADO:
        _completar(pedido)
    else:
        _cancelar(pedido)
    return pedido


def liberar_carritos_inactivos(horas=None, excepto=None):
    """Cancela los carritos sin movimiento por más de `horas` y devuelve sus unidades.
    Es la regla de «apartar los productos por cierto tiempo». Devuelve cuántos liberó."""
    horas = settings.HORAS_RESERVA_CARRITO if horas is None else horas
    limite = timezone.now() - timedelta(hours=horas)
    vencidos = Pedido.objects.filter(estado=EN_PROCESO, fecha__lt=limite)
    if excepto is not None:
        vencidos = vencidos.exclude(usuario=excepto)

    liberados = 0
    for pedido_id in list(vencidos.values_list('pk', flat=True)):
        with transaction.atomic():
            pedido = Pedido.objects.select_for_update().filter(pk=pedido_id).first()
            if pedido and pedido.estado == EN_PROCESO and pedido.fecha < limite:
                _cancelar(pedido)
                liberados += 1
    return liberados
