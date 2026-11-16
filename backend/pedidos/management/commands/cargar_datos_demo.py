"""
Carga datos de demostración: categorías, marcas, productos, clientes y un historial de pedidos
de unos 13 meses, para que el catálogo, los pedidos y los reportes tengan qué mostrar.

    python manage.py cargar_datos_demo              # solo si la base está vacía
    python manage.py cargar_datos_demo --reiniciar  # borra los datos de demostración y los vuelve a crear

Las marcas y los clientes son inventados. Los correos usan el dominio reservado .test.
"""

import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from catalogo.models import Categoria, Marca, Producto
from pedidos.models import DetallePedido, Pedido
from usuarios.models import Usuario

DOMINIO_CLIENTES = 'ejemplo.test'
ADMIN = ('admin@semillasdelvalle.test', 'Valle-Admin-2026', 'Martina', 'Rueda')
CLAVE_CLIENTES = 'Valle-Cliente-2026'

# Clientes con nombre fijo: los que aparecen en los ejemplos del informe.
CLIENTES = [
    ('maria.gomez', 'María', 'Gómez', '3001234567'),
    ('carlos.ramirez', 'Carlos', 'Ramírez', '3109876543'),
    ('laura.suarez', 'Laura', 'Suárez', '3125550101'),
    ('pedro.rojas', 'Pedro', 'Rojas', ''),
    ('andrea.mendoza', 'Andrea', 'Mendoza', '3204441122'),
    ('jorge.castillo', 'Jorge', 'Castillo', '3157778899'),
    ('natalia.pardo', 'Natalia', 'Pardo', ''),
    ('finca.esperanza', 'Finca', 'La Esperanza', '6076543210'),
]

# El resto de la clientela se arma combinando estos nombres: un negocio que factura
# decenas de millones al mes no vive de ocho clientes.
NOMBRES = [
    'Alejandro', 'Beatriz', 'Camilo', 'Diana', 'Esteban', 'Fernanda', 'Gustavo', 'Helena',
    'Iván', 'Julieta', 'Kevin', 'Liliana', 'Mauricio', 'Nubia', 'Óscar', 'Paola',
    'Ricardo', 'Sandra', 'Tomás', 'Úrsula', 'Vicente', 'Yolanda',
]
APELLIDOS = [
    'Arenas', 'Barrera', 'Cárdenas', 'Duarte', 'Espinosa', 'Fajardo', 'Galvis', 'Herrera',
    'Jaimes', 'Lizarazo', 'Moreno', 'Navarro', 'Ortega', 'Peñaloza', 'Quintero', 'Rincón',
    'Sepúlveda', 'Tarazona', 'Uribe', 'Vargas',
]
# Compradores institucionales: compran más volumen que una persona natural.
FINCAS = [
    'Finca El Recreo', 'Finca Buenavista', 'Hacienda La Palma', 'Agropecuaria San Martín',
    'Vivero Los Cedros', 'Cultivos del Carmen', 'Finca Villa Nueva', 'Asohortalizas Girón',
    'Invernaderos Piedecuesta', 'Finca La Camelia', 'Agrícola Chicamocha', 'Granja Santa Ana',
]
TOTAL_CLIENTES = 46

CATEGORIAS = ['Frutas', 'Hortalizas', 'Pasto de corte', 'Otros agrícolas']
MARCAS = ['Huerta Viva', 'Semillas del Oriente', 'Frutales de Santander', 'Pastos del Llano', 'AgroInsumos del Valle']

# nombre, categoría, marca, contenido, unidad, precio, disponible al final, días para vencer (None: no vence)
# El inventario es el de una distribuidora que mueve unas 300 ventas al mes: unas tres
# semanas de rotación. Se dejan bajos a propósito el maracuyá y el lulo (agotados, para
# ver «Ofrecer alternativas») y la cebolla y el Mombaza (alerta de stock bajo).
PRODUCTOS = [
    ('Maracuyá amarillo', 'Frutas', 'Frutales de Santander', 20, 'g', 8000, 0, 420),
    ('Papaya Tainung', 'Frutas', 'Frutales de Santander', 10, 'g', 12500, 140, 300),
    ('Lulo de Castilla', 'Frutas', 'Frutales de Santander', 5, 'g', 9800, 0, 200),
    ('Sandía Charleston Gray', 'Frutas', 'Huerta Viva', 50, 'g', 14000, 220, 500),
    ('Melón Cantaloupe', 'Frutas', 'Huerta Viva', 25, 'g', 11000, 160, 40),
    ('Tomate chonto', 'Hortalizas', 'Huerta Viva', 50, 'g', 3500, 420, 480),
    ('Tomate chonto', 'Hortalizas', 'Huerta Viva', 100, 'g', 6000, 260, 480),
    ('Lechuga Batavia', 'Hortalizas', 'Huerta Viva', 10, 'g', 2500, 520, 360),
    ('Cebolla larga', 'Hortalizas', 'Semillas del Oriente', 25, 'g', 4200, 8, 330),
    ('Pimentón California Wonder', 'Hortalizas', 'Semillas del Oriente', 10, 'g', 7500, 210, 400),
    ('Cilantro', 'Hortalizas', 'Semillas del Oriente', 100, 'g', 5000, 340, 25),
    ('Zanahoria Chantenay', 'Hortalizas', 'Huerta Viva', 25, 'g', 4800, 300, 380),
    ('Pasto Brachiaria decumbens', 'Pasto de corte', 'Pastos del Llano', 1, 'kg', 25000, 150, 540),
    ('Pasto Mombaza', 'Pasto de corte', 'Pastos del Llano', 1, 'kg', 38000, 9, 540),
    ('Sorgo forrajero', 'Pasto de corte', 'Pastos del Llano', 1, 'kg', 18000, 240, 450),
    ('Maíz forrajero', 'Pasto de corte', 'Semillas del Oriente', 2, 'kg', 32000, 120, 300),
    ('Sustrato para germinación', 'Otros agrícolas', 'AgroInsumos del Valle', 5, 'kg', 22000, 95, None),
    ('Bandeja germinadora 72 cavidades', 'Otros agrícolas', 'AgroInsumos del Valle', 1, 'unidad', 6500, 380, None),
]

DIAS_DE_HISTORIA = 400

# Pedidos por día: el negocio arranca en 6 diarios y llega a 13 al final del historial.
# Con el ticket promedio que dan las cantidades de abajo, eso factura unos $50 millones
# al mes, que es lo que sostiene a los dos socios y los gastos del negocio.
PEDIDOS_DIA_INICIO = 6
PEDIDOS_DIA_HOY = 13

# La tienda es una plataforma web: atiende los siete días, a toda hora. Lo que cambia es
# cuánta gente compra. De lunes a viernes es el grueso; el fin de semana baja porque el
# comprador de insumos agrícolas trabaja entre semana, pero sigue entrando.
# Índices 0-6 = lunes a domingo.
FACTOR_DIA = [1.0, 1.05, 1.05, 1.0, 1.1, 0.8, 0.6]

# Peso de cada hora del día (0 a 23) al repartir los pedidos. El pico es en la mañana,
# con un segundo repunte en la tarde; de madrugada entra poco, pero entra.
PESO_HORA = [
    3, 2, 1, 1, 2, 5,        # 00-05  madrugada
    12, 22, 30, 34, 33, 27,  # 06-11  mañana
    21, 25, 30, 31, 28, 24,  # 12-17  tarde
    20, 17, 13, 9, 6, 4,     # 18-23  noche
]


class Command(BaseCommand):
    help = 'Carga datos de demostración (productos, clientes y pedidos).'

    def add_arguments(self, parser):
        parser.add_argument('--reiniciar', action='store_true', help='Borra los datos de demostración antes de cargarlos.')

    def handle(self, *args, reiniciar=False, **opciones):
        if reiniciar:
            self.borrar()
        elif Producto.objects.exists() or Pedido.objects.exists():
            raise CommandError('Ya hay productos o pedidos. Usa --reiniciar para borrarlos y cargar la demostración.')

        with transaction.atomic():
            resumen = self.cargar(random.Random(2026))

        self.stdout.write(self.style.SUCCESS('Datos de demostración cargados:'))
        for linea in resumen:
            self.stdout.write(f'  {linea}')

    def borrar(self):
        with transaction.atomic():
            DetallePedido.objects.all().delete()
            Pedido.objects.all().delete()
            Producto.objects.all().delete()
            Categoria.objects.all().delete()
            Marca.objects.all().delete()
            Usuario.objects.filter(email__endswith=f'@{DOMINIO_CLIENTES}').delete()
            Usuario.objects.filter(email=ADMIN[0]).delete()

    def cargar(self, azar):
        ahora = timezone.now()
        hoy = timezone.localdate()

        categorias = {nombre: Categoria.objects.create(nombre=nombre) for nombre in CATEGORIAS}
        marcas = {nombre: Marca.objects.create(nombre=nombre) for nombre in MARCAS}
        productos = []
        finales = {}
        for nombre, categoria, marca, contenido, unidad, precio, disponible, vence in PRODUCTOS:
            producto = Producto.objects.create(
                nombre=nombre, categoria=categorias[categoria], marca=marcas[marca],
                contenido=Decimal(contenido), unidad_medida=unidad, precio_unitario=Decimal(precio),
                fecha_vencimiento=hoy + timedelta(days=vence) if vence else None,
            )
            productos.append(producto)
            finales[producto.pk] = disponible

        admin_email, admin_clave, admin_nombre, admin_apellido = ADMIN
        Usuario.objects.create_user(
            email=admin_email, password=admin_clave, first_name=admin_nombre, last_name=admin_apellido,
            rol=Usuario.Rol.ADMIN, is_staff=True,
        )
        clientes = []
        for usuario, nombre, apellido, telefono in CLIENTES:
            cliente = Usuario.objects.create_user(
                email=f'{usuario}@{DOMINIO_CLIENTES}', password=CLAVE_CLIENTES,
                first_name=nombre, last_name=apellido, telefono=telefono,
            )
            cliente.date_joined = ahora - timedelta(days=DIAS_DE_HISTORIA + azar.randint(1, 30))
            cliente.save(update_fields=['date_joined'])
            clientes.append(cliente)

        # El resto de la clientela. Se van registrando a lo largo del historial, no todos
        # el primer día, para que «clientes nuevos» tenga sentido mes a mes.
        usados = {c.email for c in clientes}
        pendientes = TOTAL_CLIENTES - len(clientes)
        fincas_libres = list(FINCAS)
        azar.shuffle(fincas_libres)
        while pendientes > 0:
            if fincas_libres and azar.random() < 0.45:
                razon_social = fincas_libres.pop()
                partes = razon_social.split(' ', 1)
                nombre, apellido = partes[0], partes[1] if len(partes) > 1 else ''
                usuario = razon_social.lower().replace(' ', '.')
            else:
                nombre, apellido = azar.choice(NOMBRES), azar.choice(APELLIDOS)
                usuario = f'{nombre}.{apellido}'.lower()
            usuario = (usuario.replace('á', 'a').replace('é', 'e').replace('í', 'i')
                       .replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n'))
            email = f'{usuario}@{DOMINIO_CLIENTES}'
            if email in usados:
                continue
            usados.add(email)
            cliente = Usuario.objects.create_user(
                email=email, password=CLAVE_CLIENTES, first_name=nombre, last_name=apellido,
                telefono=f'3{azar.randint(0, 2)}{azar.randint(0, 9)}{azar.randint(1000000, 9999999)}' if azar.random() < 0.8 else '',
            )
            cliente.date_joined = ahora - timedelta(days=azar.randint(1, DIAS_DE_HISTORIA))
            cliente.save(update_fields=['date_joined'])
            clientes.append(cliente)
            pendientes -= 1

        # Historial: más pedidos a medida que el negocio crece. Un cliente solo compra
        # desde el día en que se registró.
        completados = cancelados = 0
        desde_cuando = [(timezone.localtime(c.date_joined).date(), c) for c in clientes]
        desde_cuando.sort(key=lambda par: par[0])
        cuantos = 0
        for dias_atras in range(DIAS_DE_HISTORIA, -1, -1):
            dia = hoy - timedelta(days=dias_atras)
            crecimiento = 1 - dias_atras / DIAS_DE_HISTORIA  # 0 hace un año, 1 hoy
            promedio = PEDIDOS_DIA_INICIO + (PEDIDOS_DIA_HOY - PEDIDOS_DIA_INICIO) * crecimiento
            # La plataforma recibe pedidos todos los días; el fin de semana llegan menos
            # porque quien compra insumos suele hacerlo en días hábiles, pero nunca se apaga.
            promedio *= FACTOR_DIA[dia.weekday()]
            cantidad = max(0, round(azar.gauss(promedio, promedio * 0.35)))
            if dias_atras == 0:
                cantidad = max(cantidad, 3)  # que el inicio del administrador tenga ventas de hoy
            elif dias_atras == 1:
                cantidad = max(cantidad, 2)

            # La lista está ordenada por fecha de registro: basta avanzar el corte.
            while cuantos < len(desde_cuando) and desde_cuando[cuantos][0] <= dia:
                cuantos += 1
            if cuantos == 0:
                continue
            registrados = [par[1] for par in desde_cuando[:cuantos]]
            for _ in range(cantidad):
                fecha = self.hora_del_dia(azar, dia, ahora)
                estado = Pedido.Estado.CANCELADO if azar.random() < 0.09 and dias_atras > 0 else Pedido.Estado.COMPLETADO
                self.crear_pedido(azar, azar.choice(registrados), productos, fecha, estado)
                if estado == Pedido.Estado.COMPLETADO:
                    completados += 1
                else:
                    cancelados += 1

        # Carritos que están abiertos ahora mismo (sus unidades quedan apartadas):
        # uno reciente y uno abandonado hace dos días que tiene las últimas 3 unidades del lulo.
        # El maracuyá queda agotado del todo, para ver «Ofrecer alternativas» en el catálogo.
        lulo = productos[2]
        reciente = self.crear_pedido(
            azar, clientes[0], productos, ahora - timedelta(minutes=40), Pedido.Estado.EN_PROCESO,
            lineas=[(productos[5], 8), (productos[7], 6), (productos[17], 12)],
        )
        abandonado = self.crear_pedido(
            azar, clientes[3], productos, ahora - timedelta(hours=50), Pedido.Estado.EN_PROCESO,
            lineas=[(lulo, 3), (productos[12], 4)],
        )

        # Inventario final: lo disponible que se definió para cada producto y lo apartado en carritos.
        apartado = {}
        for carrito in (reciente, abandonado):
            for detalle in carrito.detalles.all():
                apartado[detalle.producto_id] = apartado.get(detalle.producto_id, 0) + detalle.cantidad
        for producto in productos:
            producto.stock_disponible = finales[producto.pk]
            producto.stock_apartado = apartado.get(producto.pk, 0)
            producto.save(update_fields=['stock_disponible', 'stock_apartado'])

        return [
            f'{len(categorias)} categorías, {len(marcas)} marcas y {len(productos)} productos',
            f'1 administrador: {admin_email} / {admin_clave}',
            f'{len(clientes)} clientes, por ejemplo {clientes[0].email} / {CLAVE_CLIENTES}',
            f'{completados} pedidos completados y {cancelados} cancelados en los últimos {DIAS_DE_HISTORIA} días',
            '2 carritos abiertos (uno abandonado hace 2 días, para probar «Liberar carritos»)',
        ]

    @staticmethod
    def hora_del_dia(azar, dia, ahora):
        """Momento del pedido. Cualquier hora del día: la plataforma no cierra. Las horas
        se sortean con PESO_HORA, así que de madrugada entran pocos y en la mañana muchos."""
        hora = azar.choices(range(24), weights=PESO_HORA)[0]
        inicio = timezone.make_aware(datetime.combine(dia, time.min))
        fecha = inicio + timedelta(hours=hora, minutes=azar.randint(0, 59), seconds=azar.randint(0, 59))
        if fecha > ahora:  # pedidos de hoy: solo hasta la hora actual
            fecha = inicio + (ahora - inicio) * azar.uniform(0.15, 0.95)
        return fecha

    # Cuánto se lleva un cliente de un producto, según cómo se vende. Quien siembra
    # compra para una hectárea, no un sobre: por eso los rangos son de mayorista.
    CANTIDADES = {'kg': (1, 6), 'unidad': (2, 18), 'g': (2, 12)}

    @staticmethod
    def crear_pedido(azar, cliente, productos, fecha, estado, lineas=None):
        pedido = Pedido.objects.create(usuario=cliente, fecha=fecha, estado=estado)
        if lineas is None:
            elegidos = azar.sample(productos, azar.choice([1, 2, 2, 3, 3, 4, 4, 5]))
            lineas = []
            for producto in elegidos:
                minimo, maximo = Command.CANTIDADES.get(producto.unidad_medida, (1, 6))
                lineas.append((producto, azar.randint(minimo, maximo)))
        DetallePedido.objects.bulk_create(
            DetallePedido(pedido=pedido, producto=producto, cantidad=cantidad, precio_unitario=producto.precio_unitario)
            for producto, cantidad in lineas
        )
        return pedido
