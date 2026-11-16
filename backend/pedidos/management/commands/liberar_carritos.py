from django.conf import settings
from django.core.management.base import BaseCommand

from pedidos.servicios import liberar_carritos_inactivos


class Command(BaseCommand):
    help = 'Cancela los carritos sin movimiento y devuelve al inventario las unidades que tenían apartadas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--horas', type=int, default=settings.HORAS_RESERVA_CARRITO,
            help=f'Horas sin movimiento para considerar un carrito abandonado (por defecto {settings.HORAS_RESERVA_CARRITO}).',
        )

    def handle(self, *args, horas, **opciones):
        liberados = liberar_carritos_inactivos(horas)
        self.stdout.write(self.style.SUCCESS(f'Carritos liberados: {liberados} (más de {horas} h sin movimiento).'))
