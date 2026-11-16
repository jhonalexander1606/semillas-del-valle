import { useEffect, useRef, useState } from 'react';

import { api, erroresDeCampos } from '../../api/cliente.js';
import { AvisoError, CampoClave, CampoTexto, FORMATO_CORREO } from '../../componentes/Campos.jsx';

const VACIO = { nombre: '', apellido: '', email: '', telefono: '', rol: 'cliente', password: '', password2: '' };

const ROLES = [
  { valor: 'cliente', texto: 'Cliente', descripcion: 'Entra al panel de cliente.' },
  { valor: 'admin', texto: 'Administrador', descripcion: 'Entra al panel de administrador y puede crear usuarios.' },
];

function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = 'Escribe el nombre.';
  if (!FORMATO_CORREO.test(datos.email.trim())) errores.email = 'Escribe un correo electrónico válido.';
  if (datos.telefono.trim() && !/^[\d+\-() ]+$/.test(datos.telefono.trim())) {
    errores.telefono = 'Escribe solo números (puede llevar +, espacios o guiones).';
  }
  if (!datos.password) errores.password = 'Escribe una contraseña.';
  if (datos.password2 !== datos.password) errores.password2 = 'Las contraseñas no coinciden.';
  return errores;
}

export default function FormularioUsuario({ onCreado, onCancelar }) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const primerCampo = useRef(null);

  useEffect(() => {
    primerCampo.current?.focus();
  }, []);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((d) => ({ ...d, [name]: value }));
    setErrores((e) => ({ ...e, [name]: undefined, general: undefined }));
  }

  function enfocarPrimerError(lista) {
    const primero = Object.keys(lista).find((campo) => campo !== 'general');
    if (primero) document.getElementById(`usuario-${primero}`)?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();

    const locales = validar(datos);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocarPrimerError(locales);

    setEnviando(true);
    try {
      const nuevo = await api('/usuarios/', {
        metodo: 'POST',
        cuerpo: {
          ...datos,
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          email: datos.email.trim(),
          telefono: datos.telefono.trim(),
        },
      });
      onCreado(nuevo);
    } catch (error) {
      const delServidor = erroresDeCampos(error);
      setErrores(delServidor);
      enfocarPrimerError(delServidor);
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby="titulo-nuevo-usuario"
      className="rounded-3xl border border-borde bg-crema-claro px-6 pb-6 pt-[22px] shadow-[0_6px_20px_rgba(60,48,20,0.06)] sm:px-8"
    >
      <h2 id="titulo-nuevo-usuario" className="font-titulos text-[22px] font-semibold text-tinta-titulo">
        Nuevo usuario
      </h2>
      <p className="mt-1 text-sm text-tinta-suave">
        La persona podrá entrar con este correo y contraseña desde el inicio de sesión.
      </p>

      <form onSubmit={enviar} noValidate className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <CampoTexto
          ref={primerCampo}
          id="usuario-nombre"
          name="nombre"
          etiqueta="Nombre"
          autoComplete="off"
          value={datos.nombre}
          onChange={cambiar}
          error={errores.nombre}
        />
        <CampoTexto
          id="usuario-apellido"
          name="apellido"
          etiqueta="Apellido (opcional)"
          autoComplete="off"
          value={datos.apellido}
          onChange={cambiar}
          error={errores.apellido}
        />
        <CampoTexto
          id="usuario-email"
          name="email"
          type="email"
          etiqueta="Correo electrónico"
          autoComplete="off"
          placeholder="nombre@correo.com"
          value={datos.email}
          onChange={cambiar}
          error={errores.email}
        />
        <CampoTexto
          id="usuario-telefono"
          name="telefono"
          type="tel"
          etiqueta="Teléfono (opcional)"
          autoComplete="off"
          placeholder="300 123 4567"
          value={datos.telefono}
          onChange={cambiar}
          error={errores.telefono}
        />

        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold text-tinta-etiqueta">Rol</legend>
          <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ROLES.map((opcion) => (
              <label
                key={opcion.valor}
                className="flex cursor-pointer gap-3 rounded-[14px] border border-borde-input bg-white px-4 py-3 has-checked:border-verde has-checked:bg-verde-suave has-focus-visible:outline-2 has-focus-visible:outline-naranja"
              >
                <input
                  id={opcion.valor === 'cliente' ? 'usuario-rol' : undefined}
                  type="radio"
                  name="rol"
                  value={opcion.valor}
                  checked={datos.rol === opcion.valor}
                  onChange={cambiar}
                  className="mt-1 size-4 shrink-0 accent-verde focus-visible:outline-none"
                />
                <span>
                  <span className="block text-[15px] font-semibold text-tinta">{opcion.texto}</span>
                  <span className="block text-[12.5px] text-tinta-suave">{opcion.descripcion}</span>
                </span>
              </label>
            ))}
          </div>
          {errores.rol && <p className="mt-1.5 text-[13px] text-error">{errores.rol}</p>}
        </fieldset>

        <CampoClave
          id="usuario-password"
          name="password"
          etiqueta="Contraseña"
          autoComplete="new-password"
          value={datos.password}
          onChange={cambiar}
          error={errores.password}
          ayuda="Mínimo 8 caracteres. No puede ser solo números ni parecerse al nombre o al correo."
        />
        <CampoClave
          id="usuario-password2"
          name="password2"
          etiqueta="Confirmar contraseña"
          autoComplete="new-password"
          value={datos.password2}
          onChange={cambiar}
          error={errores.password2}
        />

        <div className="sm:col-span-2">
          <AvisoError>{errores.general}</AvisoError>
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-full bg-verde px-7 text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(46,111,79,0.22)] transition-colors hover:bg-verde-oscuro disabled:opacity-70"
          >
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="h-12 rounded-full border border-borde-input bg-white px-6 text-[15px] font-semibold text-tinta-media hover:bg-crema"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
