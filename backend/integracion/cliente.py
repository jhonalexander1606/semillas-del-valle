"""
Cliente de la API del otro sistema.

Se activa al poner API_EXTERNA_URL en el .env. Si el otro grupo termina usando una ruta distinta
a la acordada, este archivo es el único que hay que cambiar.
"""

import requests
from django.conf import settings


class ErrorIntegracion(Exception):
    """El otro sistema no respondió o respondió algo que no se puede usar. El mensaje se muestra al usuario."""


def pedidos_externos(desde, hasta):
    """Pide los pedidos del rango y devuelve el JSON: {"sistema": ..., "pedidos": [...]}."""
    url = f'{settings.API_EXTERNA_URL.rstrip("/")}/integracion/pedidos/'
    encabezados = {}
    if settings.API_EXTERNA_TOKEN:
        encabezados['Authorization'] = f'Bearer {settings.API_EXTERNA_TOKEN}'

    try:
        respuesta = requests.get(
            url,
            params={'desde': desde.isoformat(), 'hasta': hasta.isoformat()},
            headers=encabezados,
            timeout=settings.API_EXTERNA_TIMEOUT,
        )
    except requests.RequestException as error:
        raise ErrorIntegracion('No se pudo conectar con el otro sistema.') from error

    if respuesta.status_code != 200:
        raise ErrorIntegracion(f'El otro sistema respondió con el error {respuesta.status_code}.')
    try:
        return respuesta.json()
    except ValueError as error:
        raise ErrorIntegracion('El otro sistema no respondió en JSON.') from error
