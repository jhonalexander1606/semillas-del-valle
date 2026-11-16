from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from catalogo.models import Categoria, Marca, Producto
from pedidos.models import DetallePedido, Pedido
from usuarios.models import Usuario

CLAVE = 'Semilla-Prueba-2026'


class ReportesTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillas.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(email='maria@semillas.test', password=CLAVE, first_name='María')
        categoria = Categoria.objects.create(nombre='Hortalizas')
        marca = Marca.objects.create(nombre='Huerta Viva')
        self.tomate = Producto.objects.create(
            nombre='Tomate', categoria=categoria, marca=marca, contenido=50, unidad_medida='g',
            precio_unitario=Decimal('3500'), stock_disponible=4,
        )
        self.lechuga = Producto.objects.create(
            nombre='Lechuga', categoria=categoria, marca=marca, contenido=10, unidad_medida='g',
            precio_unitario=Decimal('2500'), stock_disponible=100,
        )
        ahora = timezone.now()
        # Hoy: 2 pedidos completados. Ayer: 1. Uno cancelado hoy.
        self.pedido(ahora, Pedido.Estado.COMPLETADO, [(self.tomate, 2, 3500)])  # 7.000
        self.pedido(ahora, Pedido.Estado.COMPLETADO, [(self.lechuga, 4, 2500)])  # 10.000
        self.pedido(ahora - timedelta(days=1), Pedido.Estado.COMPLETADO, [(self.tomate, 1, 3500)])  # 3.500
        self.pedido(ahora, Pedido.Estado.CANCELADO, [(self.lechuga, 3, 2500)])
        self.client.force_authenticate(self.admin)

    def pedido(self, fecha, estado, lineas):
        pedido = Pedido.objects.create(usuario=self.cliente, fecha=fecha, estado=estado)
        for producto, cantidad, precio in lineas:
            DetallePedido.objects.create(pedido=pedido, producto=producto, cantidad=cantidad, precio_unitario=precio)
        return pedido

    def test_inicio_del_administrador(self):
        datos = self.client.get('/api/reportes/inicio/').data

        self.assertEqual(datos['ventas_hoy'], Decimal('17000'))
        self.assertEqual(datos['pedidos_hoy'], 2)
        self.assertEqual(datos['ticket_promedio_hoy'], Decimal('8500'))
        self.assertEqual(datos['ventas_ayer'], Decimal('3500'))
        self.assertEqual(datos['variacion_vs_ayer'], 385.7)
        self.assertEqual([p['nombre'] for p in datos['alertas_stock']], ['Tomate'])
        self.assertEqual(len(datos['ultimas_ventas']), 3)

    def test_reporte_de_ventas(self):
        datos = self.client.get('/api/reportes/ventas/?periodo=semana').data

        self.assertEqual(datos['total_ventas'], Decimal('20500'))
        self.assertEqual(datos['pedidos'], 3)
        self.assertEqual(datos['unidades_vendidas'], 7)
        self.assertEqual(len(datos['serie']), 8)
        self.assertEqual(sum(b['total'] for b in datos['serie']), Decimal('20500'))
        # Tomate: 3 unidades por $10.500; lechuga: 4 unidades por $10.000. Se ordena por dinero.
        self.assertEqual([p['nombre'] for p in datos['mas_vendidos']], ['Tomate', 'Lechuga'])
        self.assertEqual(datos['mas_vendidos'][0]['total'], Decimal('10500'))

    def test_cuanto_de_lo_apartado_se_compro(self):
        conversion = self.client.get('/api/reportes/ventas/?periodo=mes').data['conversion']

        # 7 unidades compradas y 3 que se apartaron pero se cancelaron: 70 % se compró.
        self.assertEqual(conversion['unidades_vendidas'], 7)
        self.assertEqual(conversion['unidades_canceladas'], 3)
        self.assertEqual(conversion['porcentaje_compradas'], 70.0)

    def test_periodos(self):
        for periodo, barras in (('semana', 8), ('mes', 6), ('anio', 3), ('otro', 6)):
            datos = self.client.get(f'/api/reportes/ventas/?periodo={periodo}').data
            self.assertEqual(len(datos['serie']), barras, periodo)

    def test_solo_el_administrador(self):
        self.client.force_authenticate(self.cliente)

        self.assertEqual(self.client.get('/api/reportes/inicio/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/reportes/ventas/').status_code, status.HTTP_403_FORBIDDEN)
