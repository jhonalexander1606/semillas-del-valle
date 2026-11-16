import { useEffect, useRef, useState } from 'react';

import { api, erroresDeCampos } from '../../api/cliente.js';
import { CampoClave } from '../../componentes/Campos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado, { iniciales } from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { BloqueTabla, Etiqueta, FILA, TD, TH } from '../../componentes/Tabla.jsx';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { formatoFecha } from '../../utilidades/formato.js';
import FormularioUsuario from './FormularioUsuario.jsx';

const contar = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

export default function Usuarios() {
  const { usuario: yo } = useSesion();
  const [usuarios, setUsuarios] = useState([]);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [aviso, setAviso] = useState('');
  const [porCambiar, setPorCambiar] = useState(null);
  const [cambiando, setCambiando] = useState(false);
  const [errorCambio, setErrorCambio] = useState('');
  // Asignar contraseña (para quien la olvidó: «¿Olvidaste tu contraseña?» remite al administrador)
  const [paraClave, setParaClave] = useState(null);
  const [claves, setClaves] = useState({ password: '', password2: '' });
  const [erroresClave, setErroresClave] = useState({});
  const [guardandoClave, setGuardandoClave] = useState(false);
  const botonNuevo = useRef(null);

  function cargar() {
    setEstado('cargando');
    api('/usuarios/')
      .then((lista) => {
        setUsuarios(lista);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }

  useEffect(cargar, []);

  function abrirFormulario() {
    setAviso('');
    setFormularioAbierto(true);
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    botonNuevo.current?.focus();
  }

  function alCrear(nuevo) {
    setUsuarios((lista) => [nuevo, ...lista]);
    setAviso(`Se creó la cuenta de ${nuevo.nombre} ${nuevo.apellido} (${nuevo.email}) como ${nuevo.rol_nombre.toLowerCase()}.`);
    cerrarFormulario();
  }

  // Activar o desactivar una cuenta. Una cuenta desactivada no puede iniciar sesión, pero sus pedidos se conservan.
  async function cambiarActivo() {
    setCambiando(true);
    setErrorCambio('');
    try {
      const actualizado = await api(`/usuarios/${porCambiar.id}/`, { metodo: 'PATCH', cuerpo: { activo: !porCambiar.activo } });
      setUsuarios((lista) => lista.map((u) => (u.id === actualizado.id ? actualizado : u)));
      setAviso(`La cuenta de ${actualizado.nombre} ${actualizado.apellido} quedó ${actualizado.activo ? 'activa' : 'desactivada'}.`);
      setPorCambiar(null);
    } catch (error) {
      setErrorCambio(error.message);
    } finally {
      setCambiando(false);
    }
  }

  function abrirClave(u) {
    setClaves({ password: '', password2: '' });
    setErroresClave({});
    setParaClave(u);
  }

  async function asignarClave() {
    const errores = {};
    if (!claves.password) errores.password = 'Escribe la contraseña nueva.';
    if (claves.password2 !== claves.password) errores.password2 = 'Las contraseñas no coinciden.';
    setErroresClave(errores);
    if (Object.keys(errores).length) return;
    setGuardandoClave(true);
    try {
      await api(`/usuarios/${paraClave.id}/clave/`, { metodo: 'POST', cuerpo: claves });
      setAviso(`${paraClave.nombre} ${paraClave.apellido} ya puede entrar con la contraseña nueva. Compártela por un medio privado.`);
      setParaClave(null);
    } catch (error) {
      setErroresClave(erroresDeCampos(error));
    } finally {
      setGuardandoClave(false);
    }
  }

  const administradores = usuarios.filter((u) => u.rol === 'admin').length;

  return (
    <>
      <Encabezado antetitulo="Administración" titulo="Usuarios">
        <button
          ref={botonNuevo}
          type="button"
          onClick={abrirFormulario}
          disabled={formularioAbierto}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-verde px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(46,111,79,0.22)] transition-colors hover:bg-verde-oscuro disabled:opacity-60"
        >
          <Icono nombre="usuarioNuevo" />
          Nuevo usuario
        </button>
      </Encabezado>

      <div role="status">
        {aviso && (
          <p className="flex items-start justify-between gap-3 rounded-2xl border border-[#BFD9C8] bg-[#E6F2EA] px-5 py-3.5 text-sm text-[#1F5A3D]">
            <span className="flex items-center gap-2.5">
              <Icono nombre="check" className="size-[18px]" />
              {aviso}
            </span>
            <button type="button" onClick={() => setAviso('')} aria-label="Cerrar aviso" className="-my-1 rounded-lg p-1 hover:bg-white/60">
              <Icono nombre="cerrar" className="size-4" />
            </button>
          </p>
        )}
      </div>

      {formularioAbierto && <FormularioUsuario onCreado={alCrear} onCancelar={cerrarFormulario} />}

      {estado === 'error' ? (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudo cargar la lista de usuarios.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      ) : (
        <BloqueTabla
          id="titulo-lista-usuarios"
          titulo={
            estado === 'cargando'
              ? 'Usuarios registrados'
              : `${contar(usuarios.length, 'usuario', 'usuarios')}: ${contar(administradores, 'administrador', 'administradores')} y ${contar(
                  usuarios.length - administradores,
                  'cliente',
                  'clientes',
                )}`
          }
        >
          <thead>
            <tr>
              <th scope="col" className={TH}>Nombre</th>
              <th scope="col" className={TH}>Contacto</th>
              <th scope="col" className={TH}>Rol</th>
              <th scope="col" className={TH}>Estado</th>
              <th scope="col" className={TH}>Fecha de alta</th>
              <th scope="col" className={TH}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {estado === 'cargando' ? (
              <tr>
                <td colSpan={6} className={`${TD} py-8 text-center text-tinta-suave`}>
                  Cargando usuarios…
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className={FILA}>
                  <td className={TD}>
                    <span className="flex items-center gap-3 whitespace-nowrap font-semibold text-tinta">
                      <span
                        aria-hidden="true"
                        className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-verde-suave text-[11px] font-bold text-verde"
                      >
                        {iniciales(u)}
                      </span>
                      {u.nombre} {u.apellido}
                      {u.id === yo.id && <span className="font-normal text-tinta-suave">(tú)</span>}
                    </span>
                  </td>
                  <td className={TD}>
                    {u.email}
                    {u.telefono && <span className="block text-[13px] text-tinta-suave">{u.telefono}</span>}
                  </td>
                  <td className={TD}>
                    <Etiqueta texto={u.rol_nombre} />
                  </td>
                  <td className={TD}>
                    <Etiqueta texto={u.activo ? 'Activo' : 'Inactivo'} />
                  </td>
                  <td className={`${TD} whitespace-nowrap text-tinta-suave`}>{formatoFecha(u.fecha_alta)}</td>
                  <td className="whitespace-nowrap border-t border-linea py-3.5 pl-2 pr-4 text-right align-middle text-tinta-media">
                    <button
                      type="button"
                      onClick={() => abrirClave(u)}
                      aria-label={`Asignar contraseña a ${u.nombre} ${u.apellido}`}
                      title="Asignar contraseña"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-borde-input bg-white align-middle text-tinta-media hover:bg-crema"
                    >
                      <Icono nombre="llave" className="size-[18px]" />
                    </button>
                    {u.id !== yo.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorCambio('');
                          setPorCambiar(u);
                        }}
                        className="ml-1.5 h-9 rounded-full border border-borde-input bg-white px-3 text-sm font-semibold text-tinta-media hover:bg-crema"
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </BloqueTabla>
      )}

      <Dialogo
        abierto={Boolean(porCambiar)}
        titulo={porCambiar ? `¿${porCambiar.activo ? 'Desactivar' : 'Activar'} la cuenta de ${porCambiar.nombre}?` : ''}
        textoConfirmar={porCambiar?.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
        peligro={porCambiar?.activo}
        ocupado={cambiando}
        error={errorCambio}
        onConfirmar={cambiarActivo}
        onCerrar={() => setPorCambiar(null)}
      >
        {porCambiar?.activo
          ? 'La persona ya no podrá iniciar sesión. Sus pedidos se conservan en el historial.'
          : 'La persona podrá volver a iniciar sesión con su correo y contraseña.'}
      </Dialogo>

      <Dialogo
        abierto={Boolean(paraClave)}
        titulo={paraClave ? `Contraseña nueva para ${paraClave.nombre}` : ''}
        textoConfirmar="Asignar contraseña"
        textoCancelar="Cancelar"
        ocupado={guardandoClave}
        error={erroresClave.general}
        onConfirmar={asignarClave}
        onCerrar={() => setParaClave(null)}
      >
        <p>La contraseña anterior deja de funcionar. Compártela con {paraClave?.nombre} por un medio privado.</p>
        <div className="mt-4 flex flex-col gap-3">
          <CampoClave
            id="clave-nueva"
            etiqueta="Contraseña nueva"
            autoComplete="new-password"
            value={claves.password}
            onChange={(e) => setClaves((c) => ({ ...c, password: e.target.value }))}
            error={erroresClave.password}
            ayuda="Mínimo 8 caracteres. No puede ser solo números ni parecerse al nombre o al correo."
          />
          <CampoClave
            id="clave-nueva2"
            etiqueta="Confirmar contraseña"
            autoComplete="new-password"
            value={claves.password2}
            onChange={(e) => setClaves((c) => ({ ...c, password2: e.target.value }))}
            error={erroresClave.password2}
          />
        </div>
      </Dialogo>
    </>
  );
}
