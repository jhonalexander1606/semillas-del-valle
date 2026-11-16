import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { erroresDeCampos } from '../api/cliente.js';
import { AvisoError, CampoClave, CampoTexto, FORMATO_CORREO } from '../componentes/Campos.jsx';
import { PanelMarca } from '../componentes/Decoracion.jsx';
import PantallaCarga from '../componentes/PantallaCarga.jsx';
import { rutaInicio } from '../sesion/rutas.js';
import { useSesion } from '../sesion/SesionContext.jsx';

const VACIO = { nombre: '', apellido: '', email: '', telefono: '', password: '', password2: '' };
const ORDEN = ['nombre', 'apellido', 'email', 'telefono', 'password', 'password2'];

function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = 'Escribe tu nombre.';
  if (!FORMATO_CORREO.test(datos.email.trim())) errores.email = 'Escribe un correo electrónico válido.';
  if (datos.telefono.trim() && !/^[\d+\-() ]+$/.test(datos.telefono.trim())) {
    errores.telefono = 'Escribe solo números (puede llevar +, espacios o guiones).';
  }
  if (datos.password.length < 8) errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (datos.password2 !== datos.password) errores.password2 = 'Las contraseñas no coinciden.';
  return errores;
}

// «Registrarse»: el cliente crea su cuenta y entra directamente al panel.
export default function Registro() {
  const { usuario, cargando, registrarse } = useSesion();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <PantallaCarga />;
  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />;

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((d) => ({ ...d, [name]: value }));
    setErrores((e) => ({ ...e, [name]: undefined, general: undefined }));
  }

  function enfocarPrimerError(lista) {
    const primero = ORDEN.find((campo) => lista[campo]);
    if (primero) document.getElementById(`registro-${primero}`)?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    const locales = validar(datos);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocarPrimerError(locales);

    setEnviando(true);
    try {
      await registrarse({
        ...datos,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        email: datos.email.trim(),
        telefono: datos.telefono.trim(),
      });
    } catch (error) {
      const delServidor = erroresDeCampos(error);
      setErrores(delServidor);
      enfocarPrimerError(delServidor);
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <PanelMarca />

      <main className="flex flex-[1_1_440px] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[480px] rounded-3xl border border-borde bg-crema-claro px-9 pb-7 pt-10 shadow-[0_24px_60px_rgba(60,48,20,0.1),0_2px_6px_rgba(60,48,20,0.04)] max-sm:px-[22px]">
          <span className="inline-block rounded-full bg-verde-suave px-[11px] py-1 text-xs font-semibold text-[#245A40]">
            Cuenta de cliente
          </span>
          <h1 className="mt-2.5 font-titulos text-[32px] font-semibold leading-tight tracking-[-0.01em] text-tinta-titulo">
            Crear cuenta
          </h1>
          <p className="mt-2 text-tinta-suave">Con tu cuenta puedes apartar productos y hacer pedidos.</p>

          <form onSubmit={enviar} noValidate className="mt-7 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <CampoTexto
              id="registro-nombre"
              name="nombre"
              etiqueta="Nombre"
              autoComplete="given-name"
              value={datos.nombre}
              onChange={cambiar}
              error={errores.nombre}
            />
            <CampoTexto
              id="registro-apellido"
              name="apellido"
              etiqueta="Apellido"
              autoComplete="family-name"
              value={datos.apellido}
              onChange={cambiar}
              error={errores.apellido}
            />
            <CampoTexto
              id="registro-email"
              name="email"
              type="email"
              etiqueta="Correo electrónico"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={datos.email}
              onChange={cambiar}
              error={errores.email}
              className="sm:col-span-2"
            />
            <CampoTexto
              id="registro-telefono"
              name="telefono"
              type="tel"
              etiqueta="Teléfono (opcional)"
              autoComplete="tel"
              placeholder="300 123 4567"
              value={datos.telefono}
              onChange={cambiar}
              error={errores.telefono}
              className="sm:col-span-2"
            />
            <CampoClave
              id="registro-password"
              name="password"
              etiqueta="Contraseña"
              autoComplete="new-password"
              value={datos.password}
              onChange={cambiar}
              error={errores.password}
              ayuda="Mínimo 8 caracteres. No puede ser solo números ni parecerse a tu nombre o correo."
              className="sm:col-span-2"
            />
            <CampoClave
              id="registro-password2"
              name="password2"
              etiqueta="Confirmar contraseña"
              autoComplete="new-password"
              value={datos.password2}
              onChange={cambiar}
              error={errores.password2}
              className="sm:col-span-2"
            />

            <div className="sm:col-span-2">
              <AvisoError>{errores.general}</AvisoError>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="h-[52px] w-full rounded-full bg-verde text-base font-semibold tracking-[0.01em] text-white shadow-[0_10px_22px_rgba(46,111,79,0.26)] transition-colors hover:bg-verde-oscuro disabled:opacity-70 sm:col-span-2"
            >
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-5 border-t border-linea pt-4 text-center text-sm text-tinta-suave">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login?rol=cliente" className="font-semibold text-verde underline underline-offset-4 hover:text-verde-hover">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
