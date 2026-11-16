from datetime import timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

import requests
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from catalogo.models import Categoria, Marca, Producto
from pedidos.models import DetallePedido, Pedido
from usuarios.models import Usuario

CLAVE = 'Semilla-Prueba-2026'
TOKEN = 'token-de-prueba'


def respuesta_externa(pedidos, sistema='otro-grupo', codigo=200):
    return Mock(status_code=codigo, json=Mock(return_value={'sistema': sistema, 'pedidos': pedidos}))


class BaseInformes(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillas.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(
            email='maria@semillas.test', password=CLAVE, first_name='María', last_name='Gómez'
        )
        hortalizas = Categoria.objects.create(nombre='Hortalizas')
        frutas = Categoria.objects.create(nombre='Frutas')
        marca = Marca.objects.create(nombre='Huerta Viva')
        self.tomate = Producto.objects.create(
            nombre='Tomate', categoria=hortalizas, marca=marca, contenido=50, unidad_medida='g',
            precio_unitario=Decimal('3500'), stock_disponible=4,
        )
        self.mango = Producto.objects.create(
            nombre='Mango', categoria=frutas, marca=marca, contenido=10, unidad_medida='g',
            precio_unitario=Decimal('2500'), stock_disponible=100,
        )
        self.ahora = timezone.now()
        self.hoy = timezone.localdate().isoformat()
        self.pedido(self.ahora, Pedido.Estado.COMPLETADO, [(self.tomate, 2, 3500), (self.mango, 1, 2500)])  # 9.500
        self.pedido(self.ahora, Pedido.Estado.COMPLETADO, [(self.mango, 4, 2500)])  # 10.000
        self.pedido(self.ahora, Pedido.Estado.CANCELADO, [(self.tomate, 1, 3500)])  # 3.500
        Pedido.objects.create(usuario=self.cliente, fecha=self.ahora, estado=Pedido.Estado.EN_PROCESO)  # carrito vacío
        self.client.force_authenticate(self.admin)

    def pedido(self, fecha, estado, lineas):
        pedido = Pedido.objects.create(usuario=self.cliente, fecha=fecha, estado=estado)
        for producto, cantidad, precio in lineas:
            DetallePedido.objects.create(pedido=pedido, producto=producto, cantidad=cantidad, precio_unitario=precio)
        return pedido

    def externo(self, codigo='OTRO-1', total=20000, estado='completado'):
        return {
            'codigo': codigo,
            'fecha': timezone.localtime(self.ahora).isoformat(),
            'cliente': 'Luis Pérez',
            'estado': estado,
            'total': total,
            'lineas': [{'producto': 'Arveja', 'categoria': 'Hortalizas', 'cantidad': 2, 'precio_unitario': total / 2}],
        }


class InformesPropiosTests(BaseInformes):
    def test_tabular_trae_una_fila_por_pedido_y_totales(self):
        datos = self.client.get(f'/api/reportes/pedidos/tabular/?desde={self.hoy}&hasta={self.hoy}').data

        self.assertEqual(len(datos['filas']), 3)  # el carrito vacío no cuenta
        self.assertEqual(datos['totales'], {'pedidos': 3, 'unidades': 8, 'total': 23000})
        self.assertEqual(datos['conexion']['estado'], 'sin_configurar')

    def test_filtro_por_estado(self):
        datos = self.client.get('/api/reportes/pedidos/tabular/?estado=completado').data

        self.assertEqual(datos['totales']['total'], 19500)

    def test_filtro_por_fechas_excluye_otros_dias(self):
        self.pedido(self.ahora - timedelta(days=3), Pedido.Estado.COMPLETADO, [(self.mango, 1, 2500)])

        datos = self.client.get(f'/api/reportes/pedidos/tabular/?desde={self.hoy}&hasta={self.hoy}').data

        self.assertEqual(datos['totales']['pedidos'], 3)

    def test_tabular_pagina_de_20_en_20(self):
        for _ in range(22):
            self.pedido(self.ahora, Pedido.Estado.COMPLETADO, [(self.mango, 1, 2500)])

        datos = self.client.get('/api/reportes/pedidos/tabular/?pagina=2').data

        self.assertEqual((datos['pagina'], datos['paginas']), (2, 2))
        self.assertEqual(len(datos['filas']), 5)
        self.assertEqual(datos['totales']['pedidos'], 25)

    def test_consolidado_por_estado(self):
        datos = self.client.get('/api/reportes/pedidos/consolidado/?agrupar=estado').data

        filas = {f['clave']: f for f in datos['filas']}
        self.assertEqual(filas['completado']['pedidos'], 2)
        self.assertEqual(filas['completado']['total'], 19500)
        self.assertEqual(filas['cancelado']['etiqueta'], 'Cancelado')

    def test_consolidado_por_categoria_no_cuenta_dos_veces_el_total(self):
        datos = self.client.get('/api/reportes/pedidos/consolidado/?agrupar=categoria&estado=completado').data

        filas = {f['clave']: f for f in datos['filas']}
        self.assertEqual(filas['Frutas']['total'], 12500)
        self.assertEqual(filas['Hortalizas']['pedidos'], 1)
        self.assertEqual(sum(f['total'] for f in datos['filas']), datos['totales']['total'])
        self.assertEqual(datos['totales']['pedidos'], 2)  # un pedido con dos categorías cuenta una vez

    def test_consolidado_por_mes_incluye_meses_sin_pedidos(self):
        datos = self.client.get('/api/reportes/pedidos/consolidado/?agrupar=mes&desde=2026-01-15&hasta=2026-03-02').data

        self.assertEqual([f['clave'] for f in datos['filas']], ['2026-01', '2026-02', '2026-03'])
        self.assertEqual(datos['filas'][0]['etiqueta'], 'ene 26')

    def test_filtros_no_validos(self):
        for consulta in ('desde=ayer', 'desde=2026-03-02&hasta=2026-01-01', 'estado=perdido'):
            self.assertEqual(self.client.get(f'/api/reportes/pedidos/tabular/?{consulta}').status_code, 400)
        self.assertEqual(self.client.get('/api/reportes/pedidos/consolidado/?agrupar=color').status_code, 400)

    def test_solo_el_administrador_ve_los_informes(self):
        self.client.force_authenticate(self.cliente)

        self.assertEqual(self.client.get('/api/reportes/pedidos/tabular/').status_code, 403)
        self.assertEqual(self.client.get('/api/reportes/pedidos/consolidado/').status_code, 403)


@override_settings(API_EXTERNA_URL='http://otro.test/api/', API_EXTERNA_TOKEN='su-token')
class ConexionExternaTests(BaseInformes):
    @patch('integracion.cliente.requests.get')
    def test_los_informes_incluyen_los_pedidos_del_otro_sistema(self, get):
        get.return_value = respuesta_externa([self.externo()])

        datos = self.client.get('/api/reportes/pedidos/tabular/').data

        self.assertEqual(datos['conexion']['estado'], 'conectada')
        self.assertEqual(datos['conexion']['sistemas'], ['semillas-del-valle', 'otro-grupo'])
        self.assertEqual(datos['totales']['pedidos'], 4)
        self.assertEqual(datos['totales']['total'], 43000)
        self.assertEqual(get.call_args.args[0], 'http://otro.test/api/integracion/pedidos/')
        self.assertEqual(get.call_args.kwargs['headers']['Authorization'], 'Bearer su-token')

    @patch('integracion.cliente.requests.get')
    def test_consolidado_por_sistema(self, get):
        get.return_value = respuesta_externa([self.externo()])

        datos = self.client.get('/api/reportes/pedidos/consolidado/?agrupar=sistema&estado=completado').data

        filas = {f['clave']: f['total'] for f in datos['filas']}
        self.assertEqual(filas, {'otro-grupo': 20000, 'semillas-del-valle': 19500})

    @patch('integracion.cliente.requests.get')
    def test_no_mezcla_pedidos_con_el_mismo_codigo(self, get):
        get.return_value = respuesta_externa([self.externo(codigo='PED-0001')])

        datos = self.client.get('/api/reportes/pedidos/consolidado/?agrupar=categoria').data

        self.assertEqual(datos['totales']['pedidos'], 4)
        hortalizas = next(f for f in datos['filas'] if f['clave'] == 'Hortalizas')
        self.assertEqual(hortalizas['pedidos'], 3)

    @patch('integracion.cliente.requests.get', side_effect=requests.ConnectionError)
    def test_si_el_otro_sistema_no_responde_se_avisa(self, _get):
        datos = self.client.get('/api/reportes/pedidos/tabular/').data

        self.assertEqual(datos['conexion']['estado'], 'error')
        self.assertEqual(datos['conexion']['mensaje'], 'No se pudo conectar con el otro sistema.')
        self.assertEqual(datos['totales']['pedidos'], 3)

    @patch('integracion.cliente.requests.get')
    def test_un_pedido_mal_formado_descarta_todo_lo_externo(self, get):
        get.return_value = respuesta_externa([self.externo(), self.externo(estado='pagado')])

        datos = self.client.get('/api/reportes/pedidos/tabular/').data

        self.assertEqual(datos['conexion']['estado'], 'error')
        self.assertEqual(datos['totales']['pedidos'], 3)

    @patch('integracion.cliente.requests.get')
    def test_error_http_y_respuesta_sin_pedidos(self, get):
        get.return_value = respuesta_externa([], codigo=500)
        self.assertEqual(self.client.get('/api/reportes/pedidos/tabular/').data['conexion']['estado'], 'error')

        get.return_value = Mock(status_code=200, json=Mock(return_value={'hola': 'mundo'}))
        self.assertEqual(self.client.get('/api/reportes/pedidos/tabular/').data['conexion']['estado'], 'error')

        get.return_value = Mock(status_code=200, json=Mock(return_value=[1, 2]))
        self.assertEqual(self.client.get('/api/reportes/pedidos/tabular/').data['conexion']['estado'], 'error')

    @patch('integracion.cliente.requests.get')
    def test_descarta_pedidos_fuera_del_rango_pedido(self, get):
        fuera = self.externo()
        fuera['fecha'] = '2020-01-01T10:00:00-05:00'
        get.return_value = respuesta_externa([fuera])

        datos = self.client.get(f'/api/reportes/pedidos/tabular/?desde={self.hoy}&hasta={self.hoy}').data

        self.assertEqual(datos['conexion']['estado'], 'conectada')
        self.assertEqual(datos['totales']['pedidos'], 3)


class RutaIntegracionTests(BaseInformes):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(None)
        self.url = f'/api/integracion/pedidos/?desde={self.hoy}&hasta={self.hoy}'

    @override_settings(API_INTEGRACION_TOKEN=TOKEN)
    def test_entrega_los_pedidos_en_el_formato_acordado(self):
        respuesta = self.client.get(self.url, HTTP_AUTHORIZATION=f'Bearer {TOKEN}')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['sistema'], 'semillas-del-valle')
        self.assertEqual(len(respuesta.data['pedidos']), 3)
        pedido = next(p for p in respuesta.data['pedidos'] if len(p['lineas']) == 2)
        self.assertEqual(set(pedido), {'codigo', 'fecha', 'cliente', 'estado', 'total', 'lineas'})
        self.assertEqual(pedido['estado'], 'completado')
        self.assertEqual(pedido['total'], 9500)
        self.assertEqual(pedido['cliente'], 'María Gómez')
        self.assertEqual(set(pedido['lineas'][0]), {'producto', 'categoria', 'cantidad', 'precio_unitario'})
        self.assertNotIn('maria@semillas.test', str(respuesta.data))

    @override_settings(API_INTEGRACION_TOKEN=TOKEN)
    def test_rechaza_un_token_incorrecto_o_ausente(self):
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.get(self.url, HTTP_AUTHORIZATION='Bearer otro').status_code, 403)

    @override_settings(API_INTEGRACION_TOKEN='')
    def test_sin_token_configurado_la_ruta_queda_cerrada(self):
        self.assertEqual(self.client.get(self.url, HTTP_AUTHORIZATION='Bearer ').status_code, 403)
