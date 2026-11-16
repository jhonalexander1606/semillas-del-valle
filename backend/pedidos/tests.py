from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from catalogo.models import Categoria, Marca, Producto
from usuarios.models import Usuario

from .models import DetallePedido, Pedido

CLAVE = 'Semilla-Prueba-2026'


class BasePedidos(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillas.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(email='maria@semillas.test', password=CLAVE, first_name='María')
        self.otro = Usuario.objects.create_user(email='pedro@semillas.test', password=CLAVE, first_name='Pedro')

        frutas = Categoria.objects.create(nombre='Frutas')
        hortalizas = Categoria.objects.create(nombre='Hortalizas')
        marca = Marca.objects.create(nombre='Huerta Viva')
        self.tomate = Producto.objects.create(
            nombre='Tomate chonto', categoria=hortalizas, marca=marca, contenido=50, unidad_medida='g',
            precio_unitario=Decimal('3500'), stock_disponible=10,
        )
        self.lechuga = Producto.objects.create(
            nombre='Lechuga Batavia', categoria=hortalizas, marca=marca, contenido=10, unidad_medida='g',
            precio_unitario=Decimal('2500'), stock_disponible=5,
        )
        self.maracuya = Producto.objects.create(
            nombre='Maracuyá', categoria=frutas, marca=marca, contenido=20, unidad_medida='g',
            precio_unitario=Decimal('8000'), stock_disponible=0,
        )
        self.papaya = Producto.objects.create(
            nombre='Papaya', categoria=frutas, marca=marca, contenido=10, unidad_medida='g',
            precio_unitario=Decimal('12500'), stock_disponible=7,
        )
        self.client.force_authenticate(self.cliente)

    def agregar(self, producto, cantidad=1):
        return self.client.post('/api/carrito/items/', {'producto': producto.pk, 'cantidad': cantidad}, format='json')

    def stock(self, producto):
        producto.refresh_from_db()
        return producto.stock_disponible, producto.stock_apartado

    def assertApartadoCuadra(self):
        """El stock apartado de cada producto es igual a lo que hay en los carritos (pedidos en proceso)."""
        for producto in Producto.objects.all():
            en_carritos = (
                DetallePedido.objects.filter(producto=producto, pedido__estado=Pedido.Estado.EN_PROCESO)
                .aggregate(total=Sum('cantidad'))['total'] or 0
            )
            self.assertEqual(producto.stock_apartado, en_carritos, producto.nombre)


class CarritoTests(BasePedidos):
    def test_agregar_aparta_el_stock(self):
        respuesta = self.agregar(self.tomate, 3)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data['estado'], Pedido.Estado.EN_PROCESO)
        self.assertEqual(respuesta.data['unidades'], 3)
        self.assertEqual(respuesta.data['total'], Decimal('10500'))
        self.assertEqual(self.stock(self.tomate), (7, 3))
        self.assertApartadoCuadra()

    def test_agregar_dos_veces_suma_en_la_misma_linea(self):
        self.agregar(self.tomate, 2)
        respuesta = self.agregar(self.tomate, 1)

        self.assertEqual(len(respuesta.data['detalles']), 1)
        self.assertEqual(respuesta.data['detalles'][0]['cantidad'], 3)
        self.assertEqual(Pedido.objects.filter(usuario=self.cliente).count(), 1)

    def test_sin_stock_ofrece_alternativas_y_no_crea_carrito(self):
        respuesta = self.agregar(self.maracuya)

        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('agotado', respuesta.data['detail'])
        self.assertEqual([p['id'] for p in respuesta.data['alternativas']], [self.papaya.pk])
        self.assertFalse(Pedido.objects.exists())

    def test_no_aparta_mas_de_lo_disponible(self):
        respuesta = self.agregar(self.lechuga, 6)

        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(respuesta.data['disponible'], 5)
        self.assertEqual(self.stock(self.lechuga), (5, 0))

    def test_cambiar_cantidad_mueve_el_stock(self):
        self.agregar(self.tomate, 2)

        subir = self.client.patch(f'/api/carrito/items/{self.tomate.pk}/', {'cantidad': 5}, format='json')
        self.assertEqual(subir.status_code, status.HTTP_200_OK)
        self.assertEqual(self.stock(self.tomate), (5, 5))

        bajar = self.client.patch(f'/api/carrito/items/{self.tomate.pk}/', {'cantidad': 1}, format='json')
        self.assertEqual(bajar.data['unidades'], 1)
        self.assertEqual(self.stock(self.tomate), (9, 1))
        self.assertApartadoCuadra()

    def test_subir_cantidad_sin_stock(self):
        self.agregar(self.lechuga, 4)
        respuesta = self.client.patch(f'/api/carrito/items/{self.lechuga.pk}/', {'cantidad': 9}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(self.stock(self.lechuga), (1, 4))

    def test_quitar_el_ultimo_producto_vacia_el_carrito(self):
        self.agregar(self.tomate, 2)
        respuesta = self.client.delete(f'/api/carrito/items/{self.tomate.pk}/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['detalles'], [])
        self.assertFalse(Pedido.objects.exists())
        self.assertEqual(self.stock(self.tomate), (10, 0))

    def test_confirmar_deja_vendido_lo_apartado(self):
        self.agregar(self.tomate, 2)
        self.agregar(self.lechuga, 1)
        respuesta = self.client.post('/api/carrito/confirmar/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['estado'], Pedido.Estado.COMPLETADO)
        self.assertEqual(respuesta.data['total'], Decimal('9500'))
        self.assertEqual(self.stock(self.tomate), (8, 0))
        self.assertEqual(self.stock(self.lechuga), (4, 0))
        self.assertEqual(self.client.get('/api/carrito/').data['detalles'], [])
        self.assertApartadoCuadra()

    def test_precio_queda_fijo_al_confirmar(self):
        self.agregar(self.tomate, 2)
        Producto.objects.filter(pk=self.tomate.pk).update(precio_unitario=Decimal('4000'))

        # Mientras es carrito, se muestra el precio actual.
        self.assertEqual(self.client.get('/api/carrito/').data['total'], Decimal('8000'))
        pedido_id = self.client.post('/api/carrito/confirmar/').data['id']

        # Después de confirmar, un cambio de precio ya no afecta el pedido.
        Producto.objects.filter(pk=self.tomate.pk).update(precio_unitario=Decimal('9999'))
        self.assertEqual(self.client.get(f'/api/pedidos/{pedido_id}/').data['total'], Decimal('8000'))

    def test_confirmar_carrito_vacio(self):
        respuesta = self.client.post('/api/carrito/confirmar/')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data['detail'], 'Tu carrito está vacío.')

    def test_cancelar_libera_lo_apartado(self):
        self.agregar(self.tomate, 4)
        respuesta = self.client.post('/api/carrito/cancelar/')

        self.assertEqual(respuesta.data['estado'], Pedido.Estado.CANCELADO)
        self.assertEqual(self.stock(self.tomate), (10, 0))
        self.assertApartadoCuadra()

    def test_el_administrador_no_tiene_carrito(self):
        self.client.force_authenticate(self.admin)

        self.assertEqual(self.client.get('/api/carrito/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.agregar(self.tomate).status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_sesion(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get('/api/carrito/').status_code, status.HTTP_401_UNAUTHORIZED)


class PedidosTests(BasePedidos):
    def comprar(self, usuario, producto, cantidad):
        self.client.force_authenticate(usuario)
        self.agregar(producto, cantidad)
        pedido_id = self.client.post('/api/carrito/confirmar/').data['id']
        self.client.force_authenticate(self.cliente)
        return pedido_id

    def test_historial_solo_muestra_los_pedidos_propios(self):
        propio = self.comprar(self.cliente, self.tomate, 1)
        ajeno = self.comprar(self.otro, self.lechuga, 1)

        lista = self.client.get('/api/pedidos/')
        self.assertEqual([p['id'] for p in lista.data], [propio])
        self.assertEqual(self.client.get(f'/api/pedidos/{ajeno}/').status_code, status.HTTP_404_NOT_FOUND)

    def test_filtrar_historial_por_estado(self):
        self.comprar(self.cliente, self.tomate, 1)
        self.agregar(self.lechuga, 1)

        self.assertEqual(len(self.client.get('/api/pedidos/?estado=2').data), 1)
        self.assertEqual(len(self.client.get('/api/pedidos/?estado=1').data), 1)
        self.assertEqual(len(self.client.get('/api/pedidos/?estado=0').data), 0)

    def test_cliente_cancela_su_pedido_en_proceso(self):
        pedido_id = self.agregar(self.tomate, 2).data['id']
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/cancelar/')

        self.assertEqual(respuesta.data['estado'], Pedido.Estado.CANCELADO)
        self.assertEqual(self.stock(self.tomate), (10, 0))

    def test_cliente_no_cancela_un_pedido_completado(self):
        pedido_id = self.comprar(self.cliente, self.tomate, 2)
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/cancelar/')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pedido.objects.get(pk=pedido_id).estado, Pedido.Estado.COMPLETADO)

    def test_cliente_no_actualiza_estados(self):
        pedido_id = self.agregar(self.tomate, 1).data['id']
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/estado/', {'estado': 2}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_ve_todos_los_pedidos_y_busca(self):
        self.comprar(self.cliente, self.tomate, 1)
        self.comprar(self.otro, self.lechuga, 1)
        self.client.force_authenticate(self.admin)

        self.assertEqual(len(self.client.get('/api/pedidos/').data), 2)
        self.assertEqual(len(self.client.get('/api/pedidos/?buscar=pedro').data), 1)

    def test_admin_completa_un_pedido_en_proceso(self):
        pedido_id = self.agregar(self.tomate, 3).data['id']
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/estado/', {'estado': 2}, format='json')

        self.assertEqual(respuesta.data['estado'], Pedido.Estado.COMPLETADO)
        self.assertEqual(self.stock(self.tomate), (7, 0))

    def test_admin_cancela_un_completado_y_devuelve_las_unidades(self):
        pedido_id = self.comprar(self.cliente, self.tomate, 3)
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/estado/', {'estado': 0}, format='json')

        self.assertEqual(respuesta.data['estado'], Pedido.Estado.CANCELADO)
        self.assertEqual(self.stock(self.tomate), (10, 0))

    def test_un_cancelado_no_se_reabre(self):
        pedido_id = self.agregar(self.tomate, 1).data['id']
        self.client.post('/api/carrito/cancelar/')
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post(f'/api/pedidos/{pedido_id}/estado/', {'estado': 2}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.stock(self.tomate), (10, 0))


class LiberarCarritosTests(BasePedidos):
    def envejecer(self, pedido_id, horas):
        Pedido.objects.filter(pk=pedido_id).update(fecha=timezone.now() - timedelta(hours=horas))

    def test_libera_solo_los_carritos_inactivos(self):
        viejo = self.agregar(self.tomate, 4).data['id']
        self.client.force_authenticate(self.otro)
        reciente = self.agregar(self.lechuga, 2).data['id']
        self.envejecer(viejo, 30)

        salida = StringIO()
        call_command('liberar_carritos', stdout=salida)

        self.assertIn('Carritos liberados: 1', salida.getvalue())
        self.assertEqual(Pedido.objects.get(pk=viejo).estado, Pedido.Estado.CANCELADO)
        self.assertEqual(Pedido.objects.get(pk=reciente).estado, Pedido.Estado.EN_PROCESO)
        self.assertEqual(self.stock(self.tomate), (10, 0))
        self.assertApartadoCuadra()

    def test_al_agregar_se_liberan_los_carritos_abandonados_de_otros(self):
        # Pedro apartó las 5 lechugas y abandonó el carrito.
        self.client.force_authenticate(self.otro)
        abandonado = self.agregar(self.lechuga, 5).data['id']
        self.envejecer(abandonado, 30)

        # Cuando María pide lechuga, primero se libera lo de Pedro.
        self.client.force_authenticate(self.cliente)
        respuesta = self.agregar(self.lechuga, 2)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.get(pk=abandonado).estado, Pedido.Estado.CANCELADO)
        self.assertEqual(self.stock(self.lechuga), (3, 2))

    def test_el_carrito_propio_no_se_libera_al_usarlo(self):
        propio = self.agregar(self.tomate, 1).data['id']
        self.envejecer(propio, 30)
        respuesta = self.agregar(self.lechuga, 1)

        self.assertEqual(respuesta.data['id'], propio)
        self.assertEqual(respuesta.data['unidades'], 2)

    def test_boton_del_administrador(self):
        viejo = self.agregar(self.tomate, 2).data['id']
        self.envejecer(viejo, 30)
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post('/api/pedidos/liberar-carritos/', {}, format='json')

        self.assertEqual(respuesta.data['liberados'], 1)
        self.client.force_authenticate(self.cliente)
        self.assertEqual(
            self.client.post('/api/pedidos/liberar-carritos/', {}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )


class DatosDemoTests(APITestCase):
    def test_carga_los_datos_y_el_inventario_cuadra(self):
        call_command('cargar_datos_demo', stdout=StringIO())

        self.assertEqual(Producto.objects.count(), 18)
        self.assertTrue(Pedido.objects.filter(estado=Pedido.Estado.COMPLETADO).exists())
        self.assertEqual(Pedido.objects.filter(estado=Pedido.Estado.EN_PROCESO).count(), 2)
        for producto in Producto.objects.all():
            en_carritos = (
                DetallePedido.objects.filter(producto=producto, pedido__estado=Pedido.Estado.EN_PROCESO)
                .aggregate(total=Sum('cantidad'))['total'] or 0
            )
            self.assertEqual(producto.stock_apartado, en_carritos)

        # Una segunda carga sin --reiniciar no duplica nada.
        with self.assertRaises(Exception):
            call_command('cargar_datos_demo', stdout=StringIO())
        call_command('cargar_datos_demo', '--reiniciar', stdout=StringIO())
        self.assertEqual(Producto.objects.count(), 18)
