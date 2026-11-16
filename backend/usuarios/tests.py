from rest_framework import status
from rest_framework.test import APITestCase

from .models import Usuario

CLAVE = 'Semilla-Prueba-2026'


class CrearUsuariosTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillero.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(
            email='cliente@semillero.test', password=CLAVE, first_name='Carlos'
        )
        self.datos = {
            'nombre': 'Lucía',
            'apellido': 'Pérez',
            'email': 'Lucia@Semillero.test',
            'rol': 'cliente',
            'password': 'Germinar-Lechuga-77',
            'password2': 'Germinar-Lechuga-77',
        }

    def test_admin_crea_usuario(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.post('/api/usuarios/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data['email'], 'lucia@semillero.test')
        self.assertEqual(respuesta.data['rol'], 'cliente')
        self.assertNotIn('password', respuesta.data)
        nuevo = Usuario.objects.get(email='lucia@semillero.test')
        self.assertTrue(nuevo.check_password('Germinar-Lechuga-77'))

    def test_admin_lista_usuarios(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.get('/api/usuarios/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 2)

    def test_cliente_no_puede_crear_usuarios(self):
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.post('/api/usuarios/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_sesion_no_puede_listar(self):
        respuesta = self.client.get('/api/usuarios/')

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_correo_repetido_sin_importar_mayusculas(self):
        self.client.force_authenticate(self.admin)
        self.datos['email'] = 'CLIENTE@semillero.test'
        respuesta = self.client.post('/api/usuarios/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', respuesta.data)

    def test_contrasenas_distintas(self):
        self.client.force_authenticate(self.admin)
        self.datos['password2'] = 'Otra-Cosa-123'
        respuesta = self.client.post('/api/usuarios/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password2', respuesta.data)

    def test_contrasena_debil(self):
        self.client.force_authenticate(self.admin)
        self.datos['password'] = self.datos['password2'] = '12345678'
        respuesta = self.client.post('/api/usuarios/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', respuesta.data)


class LoginTests(APITestCase):
    def setUp(self):
        Usuario.objects.create_user(
            email='admin@semillero.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )

    def test_login_devuelve_tokens_y_usuario(self):
        respuesta = self.client.post('/api/auth/login/', {'email': 'admin@semillero.test', 'password': CLAVE, 'rol': 'admin'})

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn('access', respuesta.data)
        self.assertIn('refresh', respuesta.data)
        self.assertEqual(respuesta.data['usuario']['rol'], 'admin')

    def test_login_ignora_mayusculas_del_correo(self):
        respuesta = self.client.post('/api/auth/login/', {'email': 'Admin@Semillero.TEST', 'password': CLAVE})

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_login_con_rol_equivocado(self):
        respuesta = self.client.post('/api/auth/login/', {'email': 'admin@semillero.test', 'password': CLAVE, 'rol': 'cliente'})

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('access', respuesta.data)

    def test_login_con_contrasena_incorrecta(self):
        respuesta = self.client.post('/api/auth/login/', {'email': 'admin@semillero.test', 'password': 'no-es-esta'})

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(respuesta.data['detail'], 'Correo o contraseña incorrectos.')

    def test_yo_devuelve_el_usuario_con_sesion(self):
        token = self.client.post('/api/auth/login/', {'email': 'admin@semillero.test', 'password': CLAVE}).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        respuesta = self.client.get('/api/auth/yo/')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['email'], 'admin@semillero.test')


class RegistroTests(APITestCase):
    def setUp(self):
        self.datos = {
            'nombre': 'Lucía',
            'apellido': 'Pérez',
            'email': 'Lucia@Semillero.test',
            'telefono': '300 123 4567',
            'password': 'Germinar-Lechuga-77',
            'password2': 'Germinar-Lechuga-77',
        }

    def test_cliente_se_registra_y_queda_con_sesion(self):
        respuesta = self.client.post('/api/auth/registro/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', respuesta.data)
        self.assertEqual(respuesta.data['usuario']['rol'], 'cliente')
        self.assertEqual(respuesta.data['usuario']['telefono'], '300 123 4567')
        self.assertTrue(Usuario.objects.get(email='lucia@semillero.test').check_password('Germinar-Lechuga-77'))

    def test_registro_siempre_crea_clientes(self):
        self.datos['rol'] = 'admin'
        respuesta = self.client.post('/api/auth/registro/', self.datos)

        self.assertEqual(respuesta.data['usuario']['rol'], 'cliente')

    def test_registro_con_correo_repetido(self):
        Usuario.objects.create_user(email='lucia@semillero.test', password=CLAVE, first_name='Lucía')
        respuesta = self.client.post('/api/auth/registro/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', respuesta.data)

    def test_telefono_con_letras(self):
        self.datos['telefono'] = 'tres cero cero'
        respuesta = self.client.post('/api/auth/registro/', self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('telefono', respuesta.data)


class ActivarUsuariosTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillero.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(email='cliente@semillero.test', password=CLAVE, first_name='Carlos')
        self.client.force_authenticate(self.admin)

    def test_admin_desactiva_y_el_usuario_ya_no_entra(self):
        respuesta = self.client.patch(f'/api/usuarios/{self.cliente.pk}/', {'activo': False}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertFalse(respuesta.data['activo'])
        self.client.force_authenticate(None)
        login = self.client.post('/api/auth/login/', {'email': 'cliente@semillero.test', 'password': CLAVE})
        self.assertEqual(login.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_no_se_desactiva_a_si_mismo(self):
        respuesta = self.client.patch(f'/api/usuarios/{self.admin.pk}/', {'activo': False}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_cliente_no_desactiva_usuarios(self):
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.patch(f'/api/usuarios/{self.admin.pk}/', {'activo': False}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)


class AsignarClaveTests(APITestCase):
    """«¿Olvidaste tu contraseña?»: el administrador le asigna una nueva desde Usuarios."""

    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email='admin@semillero.test', password=CLAVE, first_name='Ana', rol=Usuario.Rol.ADMIN
        )
        self.cliente = Usuario.objects.create_user(email='cliente@semillero.test', password=CLAVE, first_name='Carlos')
        self.client.force_authenticate(self.admin)

    def test_admin_asigna_una_clave_nueva(self):
        nueva = 'Brotes-de-Cilantro-31'
        respuesta = self.client.post(f'/api/usuarios/{self.cliente.pk}/clave/', {'password': nueva, 'password2': nueva})

        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)
        self.client.force_authenticate(None)
        vieja = self.client.post('/api/auth/login/', {'email': 'cliente@semillero.test', 'password': CLAVE})
        self.assertEqual(vieja.status_code, status.HTTP_401_UNAUTHORIZED)
        login = self.client.post('/api/auth/login/', {'email': 'cliente@semillero.test', 'password': nueva})
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_clave_debil_o_distinta(self):
        corta = self.client.post(f'/api/usuarios/{self.cliente.pk}/clave/', {'password': '1234', 'password2': '1234'})
        distinta = self.client.post(
            f'/api/usuarios/{self.cliente.pk}/clave/', {'password': 'Brotes-de-Cilantro-31', 'password2': 'Otra-Clave-31'}
        )

        self.assertEqual(corta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', corta.data)
        self.assertEqual(distinta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password2', distinta.data)

    def test_cliente_no_asigna_claves(self):
        self.client.force_authenticate(self.cliente)
        respuesta = self.client.post(
            f'/api/usuarios/{self.admin.pk}/clave/', {'password': 'Brotes-de-Cilantro-31', 'password2': 'Brotes-de-Cilantro-31'}
        )

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
