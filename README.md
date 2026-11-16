# Semillas del Valle

Plataforma de pedidos para una tienda de semillas para siembra: frutas, hortalizas, pasto de corte y otros productos agrícolas.
Proyecto de clase de Ingeniería de Software II (UIS, 2026). UDS 14: Jhon Alexander Calderón y Javier Orlando Patiño.

**Alcance.** El cliente se registra, consulta el catálogo, aparta productos en el carrito y confirma o cancela su pedido.
El administrador gestiona productos, categorías, marcas, pedidos y usuarios, y consulta reportes de ventas.
El proyecto termina al confirmar el pedido: el pago (plataforma de pagos) y el envío quedan fuera del alcance.

| Carpeta     | Qué es                                                         |
|-------------|----------------------------------------------------------------|
| `backend/`  | API en Django 5.2 + Django REST Framework + JWT, con MySQL 8   |
| `frontend/` | Aplicación en React 19 + Tailwind 4 (Vite)                     |

Requisitos: Python 3.11 o más reciente, Node 20.19 o más reciente y MySQL 8.

## 1. Base de datos (solo la primera vez)

1. Inicia el servicio de MySQL (en Windows se llama `MYSQL84`; desde *Servicios* o MySQL Workbench).
2. Abre `backend/crear_bd.sql`, cambia `ESCRIBE_UNA_CONTRASEÑA` por una contraseña tuya
   y ejecuta el script como `root` en MySQL Workbench.
3. Copia `backend/.env.example` como `backend/.env` y escribe esa misma contraseña en `DB_PASSWORD`.

> El archivo `.env` tiene contraseñas: no lo suban a GitHub ni lo incluyan en las entregas (ya está en `.gitignore`).

## 2. Backend (Django)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_datos_demo
python manage.py runserver
```

- `cargar_datos_demo` crea categorías, marcas, 18 productos, 8 clientes y un año de pedidos para que el catálogo y los reportes
  tengan qué mostrar. Para volver a empezar: `python manage.py cargar_datos_demo --reiniciar`.
- Si ya tenían la base de la entrega anterior, basta con `python manage.py migrate`: agrega las tablas nuevas y el teléfono del usuario.
- Si PowerShell no deja activar el entorno, usa `.venv\Scripts\python manage.py ...` directamente.
- La API queda en `http://127.0.0.1:8000/api/` y el panel de Django en `http://127.0.0.1:8000/django-admin/`.

## 3. Frontend (React)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Las llamadas a `/api` se reenvían a Django automáticamente.
Las fuentes vienen dentro del proyecto, así que la app se ve igual sin internet.

## Pruebas automáticas

```bash
cd backend
python manage.py test
```

Son 90 pruebas. Corren sobre MySQL (base temporal `test_semillero`). Las tres de `pedidos/test_concurrencia.py`
ponen a diez clientes a comprar el mismo producto al mismo tiempo, cada uno en su hilo y con su propia conexión,
y comprueban que nunca se aparta más de lo que hay. Necesitan MySQL: con SQLite se omiten porque SQLite no bloquea filas.

## Despliegue (gratis): Render + Azure

| Parte | Servicio | Detalle |
|-------|----------|---------|
| Base de datos | Azure Database for MySQL, servidor flexible B1ms en France Central (Azure for Students, 12 meses gratis) | MySQL 8.4 en la nube, conexión cifrada (SSL); el firewall solo deja entrar las IP de salida de Render |
| Backend | Render, *Web Service* gratis en Frankfurt | `backend/build.sh` instala, aplica migraciones y carga los datos de demostración si la base está vacía; corre con gunicorn |
| Frontend | Render, *Static Site* | `npm ci && npm run build`; todas las rutas sirven `index.html` |

`render.yaml` describe los dos servicios de Render (Blueprint). Los datos de la base se escriben en el panel de Render,
nunca en el repositorio:

| Variable (backend) | Valor |
|--------------------|-------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | Ya están en `render.yaml` (servidor `semillas-del-valle-db.mysql.database.azure.com`) |
| `DB_PASSWORD` | La contraseña del administrador del servidor de Azure (solo en el panel de Render) |
| `DB_SSL` | `True`: Azure exige conexión cifrada |
| `CORS_ALLOWED_ORIGINS` | La dirección del frontend, por ejemplo `https://semillas-del-valle.onrender.com` |

| Variable (frontend) | Valor |
|---------------------|-------|
| `VITE_API_URL` | La dirección del backend, por ejemplo `https://semillas-del-valle-api.onrender.com` |

El backend gratis de Render se duerme tras 15 minutos sin uso y tarda cerca de un minuto en despertar:
antes de una demostración, abre la aplicación un minuto antes.

## Cuentas de demostración

| Rol           | Correo                          | Contraseña           |
|---------------|---------------------------------|----------------------|
| Administrador | `admin@semillasdelvalle.test`   | `Valle-Admin-2026`   |
| Cliente       | `maria.gomez@ejemplo.test`      | `Valle-Cliente-2026` |

Los demás clientes de demostración usan la misma contraseña. También se puede crear una cuenta de cliente desde **Crear cuenta**
en el inicio de sesión, o un administrador con `python manage.py createsuperuser`.

## Reglas del negocio

**Inventario.** Cada producto tiene `stock_disponible` (lo que se puede vender) y `stock_apartado` (lo que está en carritos).
Cada presentación es un producto distinto: «Tomate chonto 50 g» y «Tomate chonto 100 g».

| Acción                                   | Disponible | Apartado |
|------------------------------------------|-----------:|---------:|
| Agregar al carrito *n* unidades          | − n        | + n      |
| Quitar del carrito                       | + n        | − n      |
| Confirmar pedido                         |            | − n (quedan vendidas) |
| Cancelar un pedido en proceso            | + n        | − n      |
| Cancelar un pedido completado (admin)    | + n (devolución) |    |

Todo movimiento de inventario ocurre en una transacción con las filas bloqueadas (`SELECT … FOR UPDATE`), para que dos clientes
no puedan apartar la misma unidad.

**Estados del pedido** (`ped_estado`): `1` En proceso (es el carrito), `2` Completado (confirmado, listo para el pago),
`0` Cancelado.

**Reserva de 24 horas.** Un carrito sin movimiento por más de 24 horas se cancela y sus unidades vuelven a estar disponibles.
Esto pasa de tres formas:
- solo, cuando otro cliente agrega productos a su carrito;
- con el botón **Liberar carritos inactivos** del administrador;
- con el comando `python manage.py liberar_carritos` (se puede programar cada hora con el Programador de tareas de Windows).

**Si un producto no tiene unidades**, el catálogo ofrece alternativas de la misma categoría con unidades disponibles.

Las horas de reserva, el mínimo de stock de la alerta y los días de alerta de vencimiento se cambian en `.env`.

## API

Todas las rutas empiezan por `/api/`. Salvo el login y el registro, piden el encabezado `Authorization: Bearer <token>`.

| Método | Ruta                               | Quién          | Para qué |
|--------|------------------------------------|----------------|----------|
| POST   | `auth/login/`                      | Cualquiera     | `{email, password, rol?}` → tokens y usuario |
| POST   | `auth/registro/`                   | Cualquiera     | Crear cuenta de cliente → tokens y usuario |
| POST   | `auth/renovar/`                    | Cualquiera     | `{refresh}` → nuevo token de acceso |
| GET    | `auth/yo/`                         | Con sesión     | Datos del usuario actual |
| GET    | `productos/`                       | Con sesión     | Catálogo (`?categoria= &marca= &buscar= &disponibles=1 &alerta=1`) |
| GET    | `productos/<id>/alternativas/`     | Con sesión     | Misma categoría y con unidades |
| POST, PATCH, DELETE | `productos/`, `productos/<id>/` | Administrador | Gestionar productos |
| GET, POST, PATCH, DELETE | `categorias/`, `marcas/` | Lectura: todos. Cambios: administrador | Gestionar categorías y marcas |
| GET    | `carrito/`                         | Cliente        | El pedido en proceso |
| POST   | `carrito/items/`                   | Cliente        | `{producto, cantidad}`: agregar al carrito (409 si no hay unidades, con alternativas) |
| PATCH, DELETE | `carrito/items/<producto>/` | Cliente        | Cambiar la cantidad o quitar |
| POST   | `carrito/confirmar/`               | Cliente        | Confirmar pedido |
| POST   | `carrito/cancelar/`                | Cliente        | Cancelar el pedido en proceso |
| GET    | `pedidos/`, `pedidos/<id>/`        | Cliente: los suyos. Admin: todos | Historial (`?estado=0|1|2 &buscar= &limite=`) |
| POST   | `pedidos/<id>/cancelar/`           | Con sesión     | Cancelar pedido |
| POST   | `pedidos/<id>/estado/`             | Administrador  | `{estado}`: actualizar el estado del pedido |
| POST   | `pedidos/liberar-carritos/`        | Administrador  | Liberar los carritos inactivos |
| GET    | `reportes/inicio/`                 | Administrador  | Ventas de hoy, alertas de stock y de vencimiento, últimas ventas |
| GET    | `reportes/ventas/`                 | Administrador  | Reporte de ventas (`?periodo=semana|mes|anio`) |
| GET    | `reportes/pedidos/tabular/`        | Administrador  | Informe tabular (`?desde= &hasta= &estado= &pagina=`) |
| GET    | `reportes/pedidos/consolidado/`    | Administrador  | Informe consolidado y datos del gráfico (`?desde= &hasta= &estado= &agrupar=mes|estado|categoria|sistema`) |
| GET    | `integracion/pedidos/`             | Otro sistema, con token | Entrega los pedidos en el formato acordado (`?desde= &hasta=`) |
| GET, POST, PATCH | `usuarios/`, `usuarios/<id>/` | Administrador | Listar, crear y activar o desactivar cuentas |
| POST   | `usuarios/<id>/clave/`             | Administrador  | `{password, password2}`: asignar una contraseña nueva (para quien la olvidó) |

## Conectar con el sistema del otro grupo

Los informes de pedidos (menú **Informes**) funcionan solos con los pedidos propios. Para sumar los del otro grupo no hay que tocar código, solo completar `backend/.env` y reiniciar el backend:

```
API_EXTERNA_URL=http://127.0.0.1:8001/api/
API_EXTERNA_TOKEN=el-token-que-ellos-nos-den
API_INTEGRACION_TOKEN=el-token-que-les-damos
```

- Su API debe tener `GET integracion/pedidos/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` y responder `{"sistema": "...", "pedidos": [...]}`, con el mismo formato de nuestra ruta.
- `estado` debe ser `en_proceso`, `completado` o `cancelado`.
- Si su ruta o su JSON son distintos, el único archivo que hay que adaptar es `backend/integracion/cliente.py`.
- Si su sistema no responde, el informe lo avisa y muestra solo los pedidos propios.

## Pruebas

```bash
cd backend
python manage.py test
```

Son 87 pruebas: usuarios y sesión, catálogo, carrito y stock, pedidos, liberación de carritos, reportes, informes, conexión con el otro sistema y datos de demostración.
Usan una base temporal (`test_semillero`); el script `crear_bd.sql` ya da los permisos.
Para probar sin MySQL, antes del comando: `$env:DB_ENGINE = "sqlite"` en PowerShell o `set DB_ENGINE=sqlite` en CMD.

## Cómo está organizado el código

| App (backend) | Tablas                         | Casos de uso |
|---------------|--------------------------------|--------------|
| `usuarios`    | `usuarios_usuario`             | Registrarse, Iniciar sesión, Gestionar usuarios (incluye asignar contraseña) |
| `catalogo`    | `categoria`, `marca`, `producto` | Consultar catálogo, Gestionar productos, categorías y marcas |
| `pedidos`     | `pedido`, `detalle_pedido`     | Agregar al carrito, Confirmar, Cancelar, Consultar historial, Actualizar estado del pedido, Actualizar stock (`servicios.py`) |
| `reportes`    | (consulta las anteriores)      | Consultar reportes de ventas |

En el frontend, cada página de `src/paginas/cliente` y `src/paginas/admin` corresponde a una vista de usuario.
