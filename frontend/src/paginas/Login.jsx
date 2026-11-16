import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { AvisoError, CampoClave, CampoTexto, FORMATO_CORREO } from '../componentes/Campos.jsx';
import { PanelMarca } from '../componentes/Decoracion.jsx';
import Icono from '../componentes/Icono.jsx';
import PantallaCarga from '../componentes/PantallaCarga.jsx';
import { rutaInicio } from '../sesion/rutas.js';
import { useSesion } from '../sesion/SesionContext.jsx';

const ROLES = [
  { valor: 'cliente', texto: 'Acceder como Cliente', etiqueta: 'Acceso de cliente' },
  { valor: 'admin', texto: 'Acceder como Administrador', etiqueta: 'Acceso de administrador' },
];

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useSesion();
  const [parametros] = useSearchParams();

  // En una tienda casi todos los que entran son clientes: el login abre en Cliente.
  const [rol, setRol] = useState(parametros.get('rol') === 'admin' ? 'admin' : 'cliente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [mostrarAyudaClave, setMostrarAyudaClave] = useState(false);

  if (cargando) return <PantallaCarga />;
  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />;

  function elegirRol(nuevoRol) {
    setRol(nuevoRol);
    setErrores((e) => ({ ...e, general: undefined }));
  }

  async function enviar(evento) {
    evento.preventDefault();

    const nuevos = {};
    if (!FORMATO_CORREO.test(email.trim())) nuevos.email = 'Escribe un correo electrónico válido.';
    if (!password) nuevos.password = 'Escribe tu contraseña.';
    setErrores(nuevos);
    if (nuevos.email) return document.getElementById('correo').focus();
    if (nuevos.password) return document.getElementById('clave').focus();

    setEnviando(true);
    try {
      // Si todo va bien, la sesión se guarda y este componente redirige al panel.
      await iniciarSesion(email.trim(), password, rol);
    } catch (error) {
      setErrores({ general: error.message });
      setEnviando(false);
    }
  }

  const etiquetaRol = ROLES.find((r) => r.valor === rol).etiqueta;

  return (
    <div className="flex min-h-screen flex-wrap">
      <PanelMarca />

      {/* Formulario */}
      <main className="flex flex-[1_1_440px] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px] rounded-3xl border border-borde bg-crema-claro px-9 pb-7 pt-10 shadow-[0_24px_60px_rgba(60,48,20,0.1),0_2px_6px_rgba(60,48,20,0.04)] max-sm:px-[22px]">
          <span className="inline-block rounded-full bg-verde-suave px-[11px] py-1 text-xs font-semibold text-[#245A40]">
            {etiquetaRol}
          </span>
          <h1 className="mt-2.5 font-titulos text-[32px] font-semibold leading-tight tracking-[-0.01em] text-tinta-titulo">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-tinta-suave">Ingresa con tu cuenta para continuar.</p>

          <form onSubmit={enviar} noValidate className="mt-7 flex flex-col gap-4">
            <CampoTexto
              id="correo"
              etiqueta="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrores((er) => ({ ...er, email: undefined }));
              }}
              error={errores.email}
            />
            <CampoClave
              id="clave"
              etiqueta="Contraseña"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrores((er) => ({ ...er, password: undefined }));
              }}
              error={errores.password}
            />

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => setMostrarAyudaClave((v) => !v)}
                aria-expanded={mostrarAyudaClave}
                aria-controls="ayuda-clave"
                className="text-[13px] font-medium text-verde hover:text-verde-hover"
              >
                ¿Olvidaste tu contraseña?
              </button>
              {mostrarAyudaClave && (
                <p id="ayuda-clave" className="text-right text-[13px] text-tinta-suave">
                  Pide al administrador que te asigne una nueva contraseña.
                </p>
              )}
            </div>

            <AvisoError>{errores.general}</AvisoError>

            <button
              type="submit"
              disabled={enviando}
              className="mt-1.5 h-[52px] w-full rounded-full bg-verde text-base font-semibold tracking-[0.01em] text-white shadow-[0_10px_22px_rgba(46,111,79,0.26)] transition-colors hover:bg-verde-oscuro disabled:opacity-70"
            >
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div role="group" aria-label="Tipo de acceso" className="mt-[22px] flex flex-col items-center gap-0.5 border-t border-linea pt-3">
            {ROLES.map((opcion) => {
              const activo = opcion.valor === rol;
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => elegirRol(opcion.valor)}
                  className={`inline-flex min-h-11 items-center gap-1.5 px-3 text-sm underline underline-offset-4 ${
                    activo
                      ? 'cursor-default font-bold text-verde decoration-current'
                      : 'font-medium text-gris decoration-gris/35'
                  }`}
                >
                  {activo && <Icono nombre="check" className="size-4" />}
                  {opcion.texto}
                </button>
              );
            })}
          </div>

          {rol === 'cliente' && (
            <p className="mt-3 text-center text-sm text-tinta-suave">
              ¿Todavía no tienes cuenta?{' '}
              <Link to="/registro" className="font-semibold text-verde underline underline-offset-4 hover:text-verde-hover">
                Crear cuenta
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
