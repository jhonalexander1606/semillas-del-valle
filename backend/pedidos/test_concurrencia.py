"""
Pruebas de concurrencia: varios clientes compran el mismo producto al mismo tiempo.

Cada cliente corre en su propio hilo, con su propia conexión a la base de datos, y todos
arrancan a la vez (threading.Barrier). Como las transacciones se confirman de verdad, se usa
TransactionTestCase en lugar de TestCase.

Solo tienen sentido en MySQL: SQLite no aplica SELECT ... FOR UPDATE, así que ahí se omiten.
"""

import threading
import unittest
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase

from catalogo.models import Categoria, Marca, Producto
from usuarios.models import Usuario

from .models import DetallePedido, Pedido
from .servicios import StockInsuficiente, agregar_al_carrito, confirmar_carrito

CLAVE = 'Semilla-Prueba-2026'


@unittest.skipIf(connection.vendor == 'sqlite', 'SQLite no bloquea filas; esta prueba es para MySQL')
class CompraSimultaneaTests(TransactionTestCase):
    def setUp(self):
        hortalizas = Categoria.objects.create(nombre='Hortalizas')
        marca = Marca.objects.create(nombre='Huerta Viva')
        self.producto = Producto.objects.create(
            nombre='Tomate chonto', categoria=hortalizas, marca=marca, contenido=50, unidad_medida='g',
            precio_unitario=Decimal('3500'), stock_disponible=1,
        )
        self.clientes = [
            Usuario.objects.create_user(email=f'cliente{i}@semillas.test', password=CLAVE, first_name=f'Cliente {i}')
            for i in range(10)
        ]

    def comprar_a_la_vez(self, cantidad, accion):
        """Todos los clientes ejecutan accion(cliente) al mismo tiempo. Devuelve (exitos, rechazos, errores)."""
        barrera = threading.Barrier(len(self.clientes))
        exitos, rechazos, errores = [], [], []

        def tarea(cliente):
            try:
                barrera.wait()
                accion(cliente)
                exitos.append(cliente.pk)
            except StockInsuficiente:
                rechazos.append(cliente.pk)
            except Exception as error:  # cualquier otra falla hace fallar la prueba
                errores.append(repr(error))
            finally:
                connection.close()

        hilos = [threading.Thread(target=tarea, args=(c,)) for c in self.clientes]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join(timeout=60)
        return exitos, rechazos, errores

    def test_diez_clientes_y_una_sola_unidad(self):
        exitos, rechazos, errores = self.comprar_a_la_vez(
            1, lambda cliente: agregar_al_carrito(cliente, self.producto.pk, 1)
        )
        self.assertEqual(errores, [])
        self.assertEqual(len(exitos), 1, 'solo un cliente puede apartar la última unidad')
        self.assertEqual(len(rechazos), 9)
        self.producto.refresh_from_db()
        self.assertEqual((self.producto.stock_disponible, self.producto.stock_apartado), (0, 1))
        self.assertEqual(DetallePedido.objects.filter(producto=self.producto).count(), 1)

    def test_nunca_se_vende_mas_de_lo_que_hay(self):
        self.producto.stock_disponible = 5
        self.producto.save()
        # Diez clientes piden 2 unidades cada uno de un producto con 5: solo dos pueden.
        exitos, rechazos, errores = self.comprar_a_la_vez(
            2, lambda cliente: agregar_al_carrito(cliente, self.producto.pk, 2)
        )
        self.assertEqual(errores, [])
        self.assertEqual(len(exitos), 2)
        self.assertEqual(len(rechazos), 8)
        self.producto.refresh_from_db()
        self.assertEqual((self.producto.stock_disponible, self.producto.stock_apartado), (1, 4))

    def test_confirmar_a_la_vez_no_descuadra_el_stock(self):
        self.producto.stock_disponible = 10
        self.producto.save()
        for cliente in self.clientes:
            agregar_al_carrito(cliente, self.producto.pk, 1)
        # Los diez confirman su carrito al mismo tiempo.
        exitos, rechazos, errores = self.comprar_a_la_vez(1, lambda cliente: confirmar_carrito(cliente))
        self.assertEqual(errores, [])
        self.assertEqual(len(exitos), 10)
        self.producto.refresh_from_db()
        self.assertEqual((self.producto.stock_disponible, self.producto.stock_apartado), (0, 0))
        self.assertEqual(Pedido.objects.filter(estado=Pedido.Estado.COMPLETADO).count(), 10)
