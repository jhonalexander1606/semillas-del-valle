from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import EsAdministrador
from .serializers import (
    ActualizarUsuarioSerializer,
    AsignarClaveSerializer,
    CrearUsuarioSerializer,
    LoginSerializer,
    RegistroSerializer,
    UsuarioSerializer,
)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — {email, password, rol?} → {access, refresh, usuario}"""

    serializer_class = LoginSerializer


class RegistroView(generics.CreateAPIView):
    """POST /api/auth/registro/ — un cliente crea su cuenta y queda con la sesión iniciada."""

    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        tokens = RefreshToken.for_user(usuario)
        return Response(
            {'access': str(tokens.access_token), 'refresh': str(tokens), 'usuario': UsuarioSerializer(usuario).data},
            status=status.HTTP_201_CREATED,
        )


class YoView(generics.RetrieveAPIView):
    """GET /api/auth/yo/ — datos del usuario con sesión iniciada."""

    serializer_class = UsuarioSerializer

    def get_object(self):
        return self.request.user


class UsuarioViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """/api/usuarios/ — listar, crear, activar/desactivar y asignar contraseña (solo administradores)."""

    queryset = Usuario.objects.order_by('-date_joined')
    permission_classes = [EsAdministrador]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return CrearUsuarioSerializer
        if self.action in ('update', 'partial_update'):
            return ActualizarUsuarioSerializer
        return UsuarioSerializer

    @action(detail=True, methods=['post'])
    def clave(self, request, pk=None):
        """POST /api/usuarios/<id>/clave/ — {password, password2}: asigna una contraseña nueva."""
        usuario = self.get_object()
        serializer = AsignarClaveSerializer(data=request.data, context={'usuario': usuario})
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data['password'])
        usuario.save(update_fields=['password'])
        return Response(status=status.HTTP_204_NO_CONTENT)
