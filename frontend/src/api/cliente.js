// Cliente HTTP para la API de Django.
// Guarda los tokens JWT en el navegador y renueva el de acceso cuando vence.

// En desarrollo, Vite reenvía /api a Django. En el despliegue, VITE_API_URL trae la dirección del backend
// (por ejemplo https://semillas-del-valle-api.onrender.com).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api';
const CLAVE_TOKENS = 'semillero.tokens';

export function leerTokens() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_TOKENS));
  } catch {
    return null;
  }
}

export function guardarTokens(tokens) {
  localStorage.setItem(CLAVE_TOKENS, JSON.stringify(tokens));
}

export function borrarTokens() {
  localStorage.removeItem(CLAVE_TOKENS);
}

export class ErrorApi extends Error {
  constructor(estado, datos) {
    super(mensajeGeneral(estado, datos));
    this.estado = estado;
    this.datos = datos;
  }
}

function primerMensaje(valor) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function mensajeGeneral(estado, datos) {
  if (estado === 0 || estado >= 500 || !datos) return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  if (datos.detail) return primerMensaje(datos.detail);
  if (datos.non_field_errors) return primerMensaje(datos.non_field_errors);
  return 'Revisa los datos del formulario.';
}

// Convierte la respuesta de error de Django en { campo: 'mensaje', general: 'mensaje' }.
export function erroresDeCampos(error) {
  const errores = {};
  if (error instanceof ErrorApi && error.datos && typeof error.datos === 'object') {
    for (const [campo, mensajes] of Object.entries(error.datos)) {
      if (campo === 'detail' || campo === 'non_field_errors') continue;
      errores[campo] = Array.isArray(mensajes) ? mensajes.join(' ') : String(mensajes);
    }
  }
  if (Object.keys(errores).length === 0) errores.general = error.message;
  return errores;
}

async function renovarAcceso() {
  const tokens = leerTokens();
  if (!tokens?.refresh) return false;

  const respuesta = await fetch(`${BASE}/auth/renovar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  }).catch(() => null);

  if (!respuesta?.ok) return false;
  const { access } = await respuesta.json();
  guardarTokens({ ...tokens, access });
  return true;
}

export async function api(ruta, { metodo = 'GET', cuerpo, conSesion = true, reintentar = true } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  const tokens = leerTokens();
  if (conSesion && tokens?.access) cabeceras.Authorization = `Bearer ${tokens.access}`;

  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, null);
  }

  // Token vencido: se renueva una vez y se repite la petición. Si no se puede, se cierra la sesión.
  if (respuesta.status === 401 && conSesion) {
    if (reintentar && (await renovarAcceso())) {
      return api(ruta, { metodo, cuerpo, conSesion, reintentar: false });
    }
    borrarTokens();
    window.dispatchEvent(new Event('sesion-expirada'));
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos);
  return datos;
}
