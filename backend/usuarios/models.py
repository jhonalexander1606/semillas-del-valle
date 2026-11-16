from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UsuarioManager(BaseUserManager):
    """Crea usuarios que inician sesión con su correo en lugar de un nombre de usuario."""

    use_in_migrations = True

    def _crear(self, email, password, **campos):
        if not email:
            raise ValueError('El correo electrónico es obligatorio.')
        usuario = self.model(email=self.normalize_email(email).lower(), **campos)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_user(self, email, password=None, **campos):
        campos.setdefault('is_staff', False)
        campos.setdefault('is_superuser', False)
        return self._crear(email, password, **campos)

    def create_superuser(self, email, password=None, **campos):
        campos.setdefault('is_staff', True)
        campos.setdefault('is_superuser', True)
        campos.setdefault('rol', Usuario.Rol.ADMIN)
        if not campos['is_staff'] or not campos['is_superuser']:
            raise ValueError('Un superusuario debe tener is_staff e is_superuser activados.')
        return self._crear(email, password, **campos)

    def get_by_natural_key(self, email):
        # El inicio de sesión no distingue mayúsculas en el correo.
        return self.get(email__iexact=email)


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        CLIENTE = 'cliente', 'Cliente'

    username = None
    email = models.EmailField('correo electrónico', unique=True)
    rol = models.CharField('rol', max_length=10, choices=Rol.choices, default=Rol.CLIENTE)
    telefono = models.CharField('teléfono', max_length=20, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']

    objects = UsuarioManager()

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    def __str__(self):
        return self.email

    @property
    def es_admin(self):
        return self.rol == self.Rol.ADMIN
