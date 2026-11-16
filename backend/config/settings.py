"""
Configuración de Django para Semillas del Valle.

Los valores que cambian según la máquina (clave secreta, base de datos...)
se leen del archivo .env (ver .env.example).
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def env_lista(nombre, por_defecto=''):
    return [valor.strip() for valor in os.getenv(nombre, por_defecto).split(',') if valor.strip()]


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-solo-para-desarrollo')

DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = env_lista('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

# En Render, el nombre público del servicio llega en esta variable.
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Para entrar al panel de Django por HTTPS detrás del proxy de Render.
CSRF_TRUSTED_ORIGINS = [f'https://{host}' for host in ALLOWED_HOSTS if host not in ('localhost', '127.0.0.1')]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Dominios del frontend que pueden llamar a la API (por ejemplo https://semillas-del-valle.onrender.com).
# En desarrollo no hace falta: Vite reenvía /api a Django.
CORS_ALLOWED_ORIGINS = env_lista('CORS_ALLOWED_ORIGINS')
CORS_URLS_REGEX = r'^/api/.*$'


# Aplicaciones

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'usuarios',
    'catalogo',
    'pedidos',
    'reportes',
    'integracion',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Base de datos: MySQL. Con DB_ENGINE=sqlite se usa un archivo local,
# útil solo para pruebas rápidas cuando MySQL no está disponible.

if os.getenv('DB_ENGINE', 'mysql') == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'semillero'),
            'USER': os.getenv('DB_USER', 'semillero'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', '127.0.0.1'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': {'charset': 'utf8mb4'},
            'TEST': {'CHARSET': 'utf8mb4', 'COLLATION': 'utf8mb4_unicode_ci'},
        }
    }
    # Bases en la nube (Aiven) exigen conexión cifrada. DB_SSL_CA trae el certificado CA (texto PEM)
    # que entrega el proveedor; se guarda en un archivo para que el conector lo use.
    if os.getenv('DB_SSL_CA'):
        ruta_ca = BASE_DIR / 'db-ca.pem'
        ruta_ca.write_text(os.getenv('DB_SSL_CA').replace('\\n', '\n'))
        DATABASES['default']['OPTIONS']['ssl'] = {'ca': str(ruta_ca)}


# Usuarios y contraseñas

AUTH_USER_MODEL = 'usuarios.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# API (Django REST Framework + JWT)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Precios y totales salen como números en el JSON (no como texto).
    'COERCE_DECIMAL_TO_STRING': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}


# Idioma y zona horaria

LANGUAGE_CODE = 'es'

TIME_ZONE = os.getenv('TIME_ZONE', 'America/Bogota')

USE_I18N = True

USE_TZ = True


# Archivos estáticos

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Reglas del negocio

# Horas que se aparta el stock de un carrito sin movimiento antes de liberarlo.
HORAS_RESERVA_CARRITO = int(os.getenv('HORAS_RESERVA_CARRITO', '24'))
# Con esta cantidad disponible o menos, el producto aparece en la alerta de stock.
STOCK_MINIMO = int(os.getenv('STOCK_MINIMO', '10'))
# Días antes del vencimiento en que el producto aparece en la alerta de vencimiento.
DIAS_ALERTA_VENCIMIENTO = int(os.getenv('DIAS_ALERTA_VENCIMIENTO', '60'))


# Intercambio de pedidos con el sistema del otro grupo

# Dirección base de su API, por ejemplo http://127.0.0.1:8001/api/. Vacía: los informes usan solo los pedidos propios.
API_EXTERNA_URL = os.getenv('API_EXTERNA_URL', '')
API_EXTERNA_TOKEN = os.getenv('API_EXTERNA_TOKEN', '')
API_EXTERNA_TIMEOUT = int(os.getenv('API_EXTERNA_TIMEOUT', '10'))
# Token que el otro sistema debe enviar para consultar nuestra ruta. Vacío: la ruta queda cerrada.
API_INTEGRACION_TOKEN = os.getenv('API_INTEGRACION_TOKEN', '')
