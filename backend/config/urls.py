from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Panel de Django (para revisar la base de datos). El panel de la app está en React.
    path('django-admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('catalogo.urls')),
    path('api/', include('pedidos.urls')),
    path('api/', include('reportes.urls')),
    path('api/', include('integracion.urls')),
]
