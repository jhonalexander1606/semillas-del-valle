"""Prueba de extremo a extremo por la API: el mismo recorrido que hace una persona en la interfaz.

Cada paso entra con su propio inicio de sesión (token JWT real, sin atajos) y usa las mismas rutas que
llama el frontend. Al final se comprueba que el stock apartado de cada producto sea igual a lo que hay
en los carritos abiertos.

    python manage.py test pedidos.test_flujo_completo
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from catalogo.models import Categoria, Marca, Producto
from usuarios.models import Usuario

from .models import DetallePedido, Pedido

CLAVE_ADMIN = 'Valle-Admin-Prueba-2026'
CLAVE_CLIENTA = 'Germinar-Tomate-2026'
CANCELADO, EN_PROCESO, COMPLETADO = 0, 1, 2


class FlujoCompletoTests(APITestCase):
    def setUp(self):
        Usuario.objects.create_user(email='admin@semillas.test', password=CLAVE_ADMIN, first_name='Ana',
                                    rol=Usuario.Rol.ADMIN)
        self.pedro = Usuario.objects.create_user(email='pedro@semillas.test', password=CLAVE_CLIENTA,
                                                 first_name='Pedro')
        frutas = Categoria.objects.create(nombre='Frutas')
        hortalizas = Categoria.objects.create(nombre='Hortalizas')
        pastos = Categoria.objects.create(nombre='Pasto de corte')
        self.frutas = frutas
        marca = Marca.objects.create(nombre='Huerta Viva')
        self.marca = marca

        def producto(nombre, categoria, contenido, unidad, precio, stock):
            return Producto.objects.create(nombre=nombre, categoria=categoria, marca=marca, contenido=contenido,
                                           unidad_medida=unidad, precio_unitario=Decimal(precio),
                                           stock_disponible=stock)

        self.tomate = producto('Tomate chonto', hortalizas, 50, 'g', '3500', 10)
        self.lechuga = producto('Lechuga Batavia', hortalizas, 10, 'g', '2500', 5)
        self.pasto = producto('Pasto Brachiaria', pastos, 1, 'kg', '25000', 8)
        producto('Papaya Tainung', frutas, 10, 'g', '12500', 7)


    # ------------------------------------------------------------------ ayudas
    def entrar(self, email, clave, rol=None):
        datos = {'email': email, 'password': clave}
        if rol:
            datos['rol'] = rol
        respuesta = self.client.post('/api/auth/login/', datos)
        if respuesta.status_code == status.HTTP_200_OK:
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {respuesta.data['access']}")
        return respuesta

    def carrito_abandonado(self, usuario, producto, horas=30):
        """Deja un carrito de `usuario` con 1 unidad de `producto` y `horas` sin movimiento."""
        carrito = Pedido.objects.create(usuario=usuario, estado=EN_PROCESO)
        DetallePedido.objects.create(pedido=carrito, producto=producto, cantidad=1,
                                     precio_unitario=producto.precio_unitario)
        Producto.objects.filter(pk=producto.pk).update(stock_disponible=producto.stock_disponible - 1,
                                                        stock_apartado=producto.stock_apartado + 1)
        Pedido.objects.filter(pk=carrito.pk).update(fecha=timezone.now() - timedelta(hours=horas))

    def stock(self, producto):
        producto.refresh_from_db()
        return producto.stock_disponible, producto.stock_apartado

    def apartado_cuadra_con_los_carritos(self):
        for producto in Producto.objects.all():
            en_carritos = (DetallePedido.objects.filter(producto=producto, pedido__estado=EN_PROCESO)
                           .aggregate(total=Sum('cantidad'))['total'] or 0)
            self.assertEqual(producto.stock_apartado, en_carritos, producto.nombre)

    # ------------------------------------------------------------------ recorrido
    def test_recorrido_de_la_clienta_y_del_administrador(self):
        # 1. Una persona nueva crea su cuenta y entra a su inicio.
        registro = self.client.post('/api/auth/registro/', {
            'nombre': 'Lucía', 'apellido': 'Pérez', 'email': 'lucia@semillas.test', 'telefono': '300 123 4567',
            'password': CLAVE_CLIENTA, 'password2': CLAVE_CLIENTA,
        })
        self.assertEqual(registro.status_code, status.HTTP_201_CREATED, registro.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {registro.data['access']}")
        self.assertEqual(self.client.get('/api/auth/yo/').status_code, status.HTTP_200_OK)
        lucia = Usuario.objects.get(email='lucia@semillas.test')

        # 2. Agrega 2 tomates y 1 pasto desde el catálogo; el stock apartado sube.
        self.assertEqual(self.client.get('/api/productos/').status_code, status.HTTP_200_OK)
        for producto, cantidad in ((self.tomate, 2), (self.pasto, 1)):
            respuesta = self.client.post('/api/carrito/items/', {'producto': producto.pk, 'cantidad': cantidad},
                                         format='json')
            self.assertIn(respuesta.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), respuesta.data)
        self.assertEqual(self.stock(self.tomate), (8, 2))
        self.assertEqual(self.stock(self.pasto), (7, 1))

        # 3. En el carrito sube los tomates a 3 y confirma: las unidades quedan vendidas.
        subir = self.client.patch(f'/api/carrito/items/{self.tomate.pk}/', {'cantidad': 3}, format='json')
        self.assertEqual(subir.status_code, status.HTTP_200_OK, subir.data)
        confirmado = self.client.post('/api/carrito/confirmar/')
        self.assertEqual(confirmado.status_code, status.HTTP_200_OK, confirmado.data)
        pedido_tomates = confirmado.data['id']
        self.assertEqual(Pedido.objects.get(pk=pedido_tomates).estado, COMPLETADO)
        self.assertEqual(self.stock(self.tomate), (7, 0))
        self.assertEqual(self.stock(self.pasto), (7, 0))

        # 4. Aparta una lechuga y la cancela desde «Mis pedidos»: la unidad se libera.
        self.client.post('/api/carrito/items/', {'producto': self.lechuga.pk, 'cantidad': 1}, format='json')
        self.assertEqual(self.stock(self.lechuga), (4, 1))
        carrito = Pedido.objects.get(usuario=lucia, estado=EN_PROCESO)
        historial = self.client.get('/api/pedidos/?pagina=1').data
        self.assertIn(carrito.pk, [p['id'] for p in historial['resultados']])
        cancelado = self.client.post(f'/api/pedidos/{carrito.pk}/cancelar/')
        self.assertEqual(cancelado.status_code, status.HTTP_200_OK, cancelado.data)
        self.assertEqual(self.stock(self.lechuga), (5, 0))

        # 5. El administrador crea el producto Guanábana 10 g.
        self.client.credentials()
        self.assertEqual(self.entrar('admin@semillas.test', CLAVE_ADMIN, rol='admin').status_code, 200)
        nuevo = self.client.post('/api/productos/', {
            'nombre': 'Guanábana', 'categoria': self.frutas.pk, 'marca': self.marca.pk, 'unidad_medida': 'g',
            'contenido': 10, 'precio_unitario': 9500, 'stock_disponible': 12, 'fecha_vencimiento': '2027-12-31',
        }, format='json')
        self.assertEqual(nuevo.status_code, status.HTTP_201_CREATED, nuevo.data)
        self.assertEqual(nuevo.data['presentacion'], '10 g')

        # 6. Intenta eliminar la categoría Frutas y el sistema no lo permite.
        borrar = self.client.delete(f'/api/categorias/{self.frutas.pk}/')
        self.assertNotEqual(borrar.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(Categoria.objects.filter(pk=self.frutas.pk).exists())

        # 7. Cancela el pedido completado de la clienta y los 3 tomates vuelven al inventario.
        anular = self.client.post(f'/api/pedidos/{pedido_tomates}/estado/', {'estado': CANCELADO}, format='json')
        self.assertEqual(anular.status_code, status.HTTP_200_OK, anular.data)
        self.assertEqual(self.stock(self.tomate), (10, 0))

        # 8. Libera los carritos inactivos: Pedro dejó una lechuga apartada hace 30 horas.
        self.stock(self.lechuga)
        self.carrito_abandonado(self.pedro, self.lechuga)
        self.assertEqual(self.stock(self.lechuga), (4, 1))
        liberar = self.client.post('/api/pedidos/liberar-carritos/', {}, format='json')
        self.assertEqual(liberar.data['liberados'], 1)
        self.assertEqual(self.stock(self.lechuga), (5, 0))

        # 9. Asigna una contraseña nueva a la clienta, que entra con ella.
        nueva = 'Cosecha-Nueva-2026'
        asignar = self.client.post(f'/api/usuarios/{lucia.pk}/clave/', {'password': nueva, 'password2': nueva})
        self.assertEqual(asignar.status_code, status.HTTP_204_NO_CONTENT)
        self.client.credentials()
        self.assertEqual(self.entrar('lucia@semillas.test', nueva).status_code, status.HTTP_200_OK)

        # 10. El administrador revisa el informe de pedidos en su vista de tabla y desactiva la cuenta.
        self.client.credentials()
        self.entrar('admin@semillas.test', CLAVE_ADMIN, rol='admin')
        tabla = self.client.get('/api/reportes/pedidos/tabular/')
        self.assertEqual(tabla.status_code, status.HTTP_200_OK)
        desactivar = self.client.patch(f'/api/usuarios/{lucia.pk}/', {'activo': False}, format='json')
        self.assertEqual(desactivar.status_code, status.HTTP_200_OK, desactivar.data)

        # 11. El stock apartado cuadra con los carritos abiertos.
        self.apartado_cuadra_con_los_carritos()

        # 12. La cuenta desactivada ya no puede iniciar sesión.
        self.client.credentials()
        self.assertNotEqual(self.entrar('lucia@semillas.test', nueva).status_code, status.HTTP_200_OK)
