from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Datos públicos de un usuario (lo que ve el frontend)."""

    nombre = serializers.CharField(source='first_name')
    apellido = serializers.CharField(source='last_name')
    rol_nombre = serializers.CharField(source='get_rol_display')
    activo = serializers.BooleanField(source='is_active')
    fecha_alta = serializers.DateTimeField(source='date_joined')

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'email', 'telefono', 'rol', 'rol_nombre', 'activo', 'fecha_alta']
        read_only_fields = fields


class CrearUsuarioSerializer(serializers.ModelSerializer):
    """Lo que envía el administrador para crear una cuenta."""

    nombre = serializers.CharField(source='first_name', max_length=150)
    apellido = serializers.CharField(source='last_name', max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                lookup='iexact',
                message='Ya existe un usuario con este correo.',
            )
        ]
    )
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = Usuario
        fields = ['nombre', 'apellido', 'email', 'telefono', 'rol', 'password', 'password2']

    def validate_email(self, valor):
        return valor.lower()

    def validate_telefono(self, valor):
        valor = valor.strip()
        if valor and not all(c.isdigit() or c in '+-() ' for c in valor):
            raise serializers.ValidationError('Escribe solo números (puede llevar +, espacios o guiones).')
        return valor

    def validate(self, datos):
        if datos['password'] != datos.pop('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})

        # Las reglas de contraseña de Django (largo mínimo, no solo números, etc.)
        usuario_provisional = Usuario(
            email=datos['email'],
            first_name=datos['first_name'],
            last_name=datos.get('last_name', ''),
        )
        try:
            validate_password(datos['password'], usuario_provisional)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)})
        return datos

    def create(self, datos):
        return Usuario.objects.create_user(**datos)

    def to_representation(self, usuario):
        return UsuarioSerializer(usuario).data


class RegistroSerializer(CrearUsuarioSerializer):
    """«Registrarse»: el cliente crea su propia cuenta. Siempre queda con rol de cliente."""

    class Meta(CrearUsuarioSerializer.Meta):
        fields = ['nombre', 'apellido', 'email', 'telefono', 'password', 'password2']

    def create(self, datos):
        datos['rol'] = Usuario.Rol.CLIENTE
        return super().create(datos)


class ActualizarUsuarioSerializer(serializers.ModelSerializer):
    """Lo que el administrador puede cambiar de una cuenta existente: activarla o desactivarla."""

    activo = serializers.BooleanField(source='is_active')

    class Meta:
        model = Usuario
        fields = ['activo']

    def validate_activo(self, valor):
        if not valor and self.instance == self.context['request'].user:
            raise serializers.ValidationError('No puedes desactivar tu propia cuenta.')
        return valor

    def to_representation(self, usuario):
        return UsuarioSerializer(usuario).data


class AsignarClaveSerializer(serializers.Serializer):
    """El administrador le asigna una contraseña nueva a una cuenta (por ejemplo, si la persona olvidó la suya)."""

    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, datos):
        if datos['password'] != datos['password2']:
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        try:
            validate_password(datos['password'], self.context['usuario'])
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)})
        return datos


class LoginSerializer(TokenObtainPairSerializer):
    """Inicio de sesión con correo y contraseña. Devuelve los tokens y los datos del usuario."""

    default_error_messages = {
        'no_active_account': 'Correo o contraseña incorrectos.',
    }

    rol = serializers.ChoiceField(choices=Usuario.Rol.choices, required=False, write_only=True)

    def validate(self, datos):
        rol_elegido = datos.pop('rol', None)
        respuesta = super().validate(datos)

        # El login tiene "Acceder como Cliente / Administrador": debe coincidir con la cuenta.
        if rol_elegido and self.user.rol != rol_elegido:
            raise serializers.ValidationError(
                {'detail': f'Esta cuenta es de {self.user.get_rol_display().lower()}. '
                           f'Elige «Acceder como {self.user.get_rol_display()}».'}
            )

        respuesta['usuario'] = UsuarioSerializer(self.user).data
        return respuesta
