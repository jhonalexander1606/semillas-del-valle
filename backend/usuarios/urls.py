from django.urls import include, path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, RegistroView, UsuarioViewSet, YoView

router = SimpleRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/registro/', RegistroView.as_view(), name='registro'),
    path('auth/renovar/', TokenRefreshView.as_view(), name='renovar-token'),
    path('auth/yo/', YoView.as_view(), name='yo'),
    path('', include(router.urls)),
]
