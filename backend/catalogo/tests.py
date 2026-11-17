from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from pedidos.models import DetallePedido, Pedido
from usuarios.models import Usuario

from .models import Categoria, Marca, Producto

CLAVE = 'Semilla-Prueba-2026'


class CatalogoTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillas.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(email='maria@semillas.test', password=CLAVE, first_name='María')
        self.frutas = Categoria.objects.create(nombre='Frutas')
        self.pastos = Categoria.objects.create(nombre='Pasto de corte')
        self.huerta = Marca.objects.create(nombre='Huerta Viva')
        self.llano = Marca.objects.create(nombre='Pastos del Llano')
        self.papaya = Producto.objects.create(
            nombre='Papaya Tainung', categoria=self.frutas, marca=self.huerta, contenido=10, unidad_medida='g',
            precio_unitario=Decimal('12500'), stock_disponible=30,
        )
        self.brachiaria = Producto.objects.create(
            nombre='Pasto Brachiaria', categoria=self.pastos, marca=self.llano, contenido=1, unidad_medida='kg',
            precio_unitario=Decimal('25000'), stock_disponible=0,
        )
        self.nuevo = {
            'nombre': 'Sorgo forrajero', 'categoria': self.pastos.pk, 'marca': self.llano.pk,
            'unidad_medida': 'kg', 'contenido': 1, 'precio_unitario': 18000, 'stock_disponible': 50,
            'fecha_vencimiento': '2027-12-31',
        }

    def test_cliente_consulta_el_catalogo_sin_ver_lo_apartado(self):
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.get('/api/productos/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 2)
        self.assertNotIn('stock_apartado', respuesta.data[0])
        self.assertEqual(respuesta.data[0]['presentacion'], '10 g')

    def test_filtros_del_catalogo(self):
        self.client.force_authenticate(self.cliente)

        def nombres(parametros):
            return [p['nombre'] for p in self.client.get(f'/api/productos/?{parametros}').data]

        self.assertEqual(nombres(f'categoria={self.pastos.pk}'), ['Pasto Brachiaria'])
        self.assertEqual(nombres(f'marca={self.huerta.pk}'), ['Papaya Tainung'])
        self.assertEqual(nombres('buscar=llano'), ['Pasto Brachiaria'])
        self.assertEqual(nombres('disponibles=1'), ['Papaya Tainung'])
        self.assertEqual(nombres('categoria=abc'), [])

    def test_estado_del_stock(self):
        self.client.force_authenticate(self.cliente)
        datos = {p['nombre']: p['estado_stock'] for p in self.client.get('/api/productos/').data}

        self.assertEqual(datos, {'Papaya Tainung': 'normal', 'Pasto Brachiaria': 'agotado'})

    def test_cliente_no_puede_crear_productos(self):
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.post('/api/productos/', self.nuevo, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_crea_y_edita_un_producto(self):
        self.client.force_authenticate(self.admin)
        creado = self.client.post('/api/productos/', self.nuevo, format='json')

        self.assertEqual(creado.status_code, status.HTTP_201_CREATED, creado.data)
        self.assertEqual(creado.data['presentacion'], '1 kg')
        self.assertEqual(creado.data['stock_apartado'], 0)

        editado = self.client.patch(
            f"/api/productos/{creado.data['id']}/", {'stock_disponible': 80, 'stock_apartado': 99}, format='json'
        )
        self.assertEqual(editado.data['stock_disponible'], 80)
        # El stock apartado no se puede tocar a mano.
        self.assertEqual(editado.data['stock_apartado'], 0)

    def test_foto_del_producto(self):
        self.client.force_authenticate(self.admin)
        url = 'https://ejemplo.test/fotos/papaya.jpg'
        editado = self.client.patch(f'/api/productos/{self.papaya.pk}/', {'imagen_url': url}, format='json')
        self.assertEqual(editado.data['imagen_url'], url)

        malo = self.client.patch(f'/api/productos/{self.papaya.pk}/', {'imagen_url': 'no es una dirección'}, format='json')
        self.assertEqual(malo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('imagen_url', malo.data)

        # El cliente la ve en el catálogo; un producto sin foto la trae vacía.
        self.client.force_authenticate(self.cliente)
        fotos = {p['nombre']: p['imagen_url'] for p in self.client.get('/api/productos/').data}
        self.assertEqual(fotos, {'Papaya Tainung': url, 'Pasto Brachiaria': ''})

    def test_validaciones_del_producto(self):
        self.client.force_authenticate(self.admin)
        self.nuevo.update(precio_unitario=0, contenido=0)
        respuesta = self.client.post('/api/productos/', self.nuevo, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('precio_unitario', respuesta.data)
        self.assertIn('contenido', respuesta.data)

    def test_no_repite_la_misma_presentacion(self):
        self.client.force_authenticate(self.admin)
        self.nuevo.update(nombre='Papaya Tainung', categoria=self.frutas.pk, marca=self.huerta.pk, unidad_medida='g', contenido=10)
        respuesta = self.client.post('/api/productos/', self.nuevo, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_otra_presentacion_es_otro_producto(self):
        self.client.force_authenticate(self.admin)
        self.nuevo.update(nombre='Papaya Tainung', categoria=self.frutas.pk, marca=self.huerta.pk, unidad_medida='g', contenido=25)
        respuesta = self.client.post('/api/productos/', self.nuevo, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)

    def test_no_borra_una_categoria_con_productos(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.delete(f'/api/categorias/{self.frutas.pk}/')

        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Categoria.objects.filter(pk=self.frutas.pk).exists())

    def test_borra_una_marca_sin_productos(self):
        self.client.force_authenticate(self.admin)
        vacia = Marca.objects.create(nombre='Sin productos')

        self.assertEqual(self.client.delete(f'/api/marcas/{vacia.pk}/').status_code, status.HTTP_204_NO_CONTENT)

    def test_no_borra_un_producto_que_esta_en_pedidos(self):
        pedido = Pedido.objects.create(usuario=self.cliente, estado=Pedido.Estado.COMPLETADO)
        DetallePedido.objects.create(pedido=pedido, producto=self.papaya, cantidad=1, precio_unitario=12500)
        self.client.force_authenticate(self.admin)
        respuesta = self.client.delete(f'/api/productos/{self.papaya.pk}/')

        self.assertEqual(respuesta.status_code, status.HTTP_409_CONFLICT)

    def test_nombre_de_categoria_repetido(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post('/api/categorias/', {'nombre': 'frutas'}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_categorias_cuentan_sus_productos(self):
        self.client.force_authenticate(self.cliente)
        datos = {c['nombre']: c['total_productos'] for c in self.client.get('/api/categorias/').data}

        self.assertEqual(datos, {'Frutas': 1, 'Pasto de corte': 1})

    def test_alternativas_de_un_producto_agotado(self):
        sorgo = Producto.objects.create(
            nombre='Sorgo', categoria=self.pastos, marca=self.llano, contenido=1, unidad_medida='kg',
            precio_unitario=Decimal('18000'), stock_disponible=12,
        )
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.get(f'/api/productos/{self.brachiaria.pk}/alternativas/')

        self.assertEqual([p['id'] for p in respuesta.data], [sorgo.pk])
