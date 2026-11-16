"""
Servidor de simulación del otro grupo (Ganado Carnes) para probar la integración.

Hace lo que el otro equipo debería exponer cuando termine su endpoint: entrega sus
"ventas" en el formato JSON común, con autenticación por Bearer token.

Uso:
    export API_INTEGRACION_TOKEN=token-del-otro-grupo
    python mock_otro_grupo.py           # escucha en http://localhost:3000

Luego, en el .env de Semillas del Valle:
    API_EXTERNA_URL=http://localhost:3000/api
    API_EXTERNA_TOKEN=token-del-otro-grupo

Y al abrir el reporte de ventas, la gráfica muestra las dos series.

No usa ninguna librería externa. Solo Python 3.10+.
"""

import json
import os
import random
import secrets
import sys
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SISTEMA = 'ganado-carnes'
PUERTO = int(os.getenv('PUERTO', '3000'))
TOKEN = os.getenv('API_INTEGRACION_TOKEN', 'token-del-otro-grupo')
TZ_BOGOTA = timezone(timedelta(hours=-5))

# Datos sintéticos — cada "venta" sigue la misma estructura que nuestro endpoint entrega.
CATALOGO = [
    ('Vaca Holstein #112', 'Vacas lecheras', 2_800_000),
    ('Vaca Jersey #205',    'Vacas lecheras', 2_400_000),
    ('Novillo Brahman #87', 'Novillos',       1_950_000),
    ('Novillo Angus #43',   'Novillos',       2_100_000),
    ('Ternero Normando #19','Terneros',         900_000),
    ('Ternero Angus #22',   'Terneros',         850_000),
    ('Toro Cebú #7',        'Toros',          3_600_000),
    ('Toro Simmental #11',  'Toros',          3_900_000),
]

CLIENTES = [
    'Finca La Esmeralda', 'Hacienda Los Llanos', 'Agroganados S.A.S',
    'Finca El Porvenir', 'Ganadería San José', 'Finca La Primavera',
]


def generar_pedidos(semilla: int = 42) -> list[dict]:
    """Un pedido por día hábil de los últimos 7 meses, importes y productos aleatorios pero estables."""
    aleatorio = random.Random(semilla)
    hoy = date.today()
    inicio = hoy.replace(day=1) - timedelta(days=30 * 6)
    pedidos = []
    numero = 1
    dia = inicio
    while dia <= hoy:
        # No en domingo; una venta sí y una no entre semana (Ganado Carnes vende grueso).
        if dia.weekday() != 6 and aleatorio.random() > 0.35:
            cantidad_lineas = aleatorio.randint(1, 3)
            lineas = []
            for _ in range(cantidad_lineas):
                producto, categoria, precio = aleatorio.choice(CATALOGO)
                cantidad = 1 if categoria == 'Toros' else aleatorio.randint(1, 2)
                lineas.append({
                    'producto': producto,
                    'categoria': categoria,
                    'cantidad': cantidad,
                    'precio_unitario': precio,
                })
            total = sum(linea['cantidad'] * linea['precio_unitario'] for linea in lineas)
            # Cuatro de cada cinco se completan; el otro se cancela.
            estado = 'cancelado' if aleatorio.random() < 0.2 else 'completado'
            momento = datetime.combine(dia, datetime.min.time(), tzinfo=TZ_BOGOTA) + timedelta(
                hours=aleatorio.randint(8, 17), minutes=aleatorio.randint(0, 59)
            )
            pedidos.append({
                'codigo': f'FAC-{numero:05d}',
                'fecha': momento.isoformat(),
                'cliente': aleatorio.choice(CLIENTES),
                'estado': estado,
                'total': total,
                'lineas': lineas,
            })
            numero += 1
        dia += timedelta(days=1)
    return pedidos


TODOS_LOS_PEDIDOS = generar_pedidos()


class Manejador(BaseHTTPRequestHandler):

    def log_message(self, formato, *args):
        # Una línea por petición, limpia.
        sys.stderr.write(f'  {self.address_string()} → {formato % args}\n')

    def _enviar_json(self, estado: int, cuerpo: dict):
        datos = json.dumps(cuerpo, ensure_ascii=False).encode('utf-8')
        self.send_response(estado)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def do_GET(self):
        url = urlparse(self.path)

        if url.path.rstrip('/') != '/api/integracion/pedidos':
            self._enviar_json(404, {'detail': 'Ruta no encontrada.'})
            return

        encabezado = self.headers.get('Authorization', '')
        if not (encabezado.startswith('Bearer ') and secrets.compare_digest(
                encabezado.removeprefix('Bearer ').encode(), TOKEN.encode())):
            self._enviar_json(401, {'detail': 'Token de integración no válido.'})
            return

        parametros = parse_qs(url.query)
        desde_str = parametros.get('desde', [None])[0]
        hasta_str = parametros.get('hasta', [None])[0]
        if not desde_str or not hasta_str:
            self._enviar_json(400, {'detail': 'Faltan los parámetros desde y hasta.'})
            return
        try:
            desde = date.fromisoformat(desde_str)
            hasta = date.fromisoformat(hasta_str)
        except ValueError:
            self._enviar_json(400, {'detail': 'Las fechas deben tener el formato AAAA-MM-DD.'})
            return
        if desde > hasta:
            self._enviar_json(400, {'detail': 'La fecha inicial no puede ser posterior a la final.'})
            return

        pedidos = [
            pedido for pedido in TODOS_LOS_PEDIDOS
            if desde <= datetime.fromisoformat(pedido['fecha']).date() <= hasta
        ]
        self._enviar_json(200, {'sistema': SISTEMA, 'pedidos': pedidos})


def main():
    servidor = ThreadingHTTPServer(('127.0.0.1', PUERTO), Manejador)
    print(f'Servidor de prueba del otro grupo escuchando en http://localhost:{PUERTO}')
    print(f'Token aceptado: {TOKEN}')
    print(f'Ruta: GET http://localhost:{PUERTO}/api/integracion/pedidos/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD')
    print(f'Pedidos de ejemplo cargados: {len(TODOS_LOS_PEDIDOS)}')
    print('Presiona Ctrl+C para detener.')
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor detenido.')


if __name__ == '__main__':
    main()
