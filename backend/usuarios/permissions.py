from rest_framework.permissions import SAFE_METHODS, BasePermission


class EsAdministrador(BasePermission):
    message = 'Solo un administrador puede hacer esto.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.es_admin)


class EsAdministradorOSoloLectura(BasePermission):
    """Cualquier usuario con sesión puede consultar; solo el administrador puede crear, editar o borrar."""

    message = 'Solo un administrador puede hacer esto.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or request.user.es_admin


class EsCliente(BasePermission):
    message = 'Esta opción es para clientes.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.es_admin)
