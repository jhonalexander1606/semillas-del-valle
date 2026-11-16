import { useCallback, useEffect, useState } from 'react';

import { api, erroresDeCampos } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { estiloCategoria } from '../../componentes/Sobre.jsx';
import { contar } from '../../utilidades/formato.js';

const ENTRADA =
  'h-11 w-full rounded-[14px] border bg-white px-4 text-[15px] text-tinta focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20';

// Una lista que se puede editar en el mismo lugar: agregar, cambiar el nombre y eliminar.
function ListaEditable({ id, titulo, singular, ruta, ayuda, conColor = false }) {
  const [items, setItems] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [nuevo, setNuevo] = useState('');
  const [errorNuevo, setErrorNuevo] = useState('');
  const [editando, setEditando] = useState(null); // { id, nombre, error }
  const [porEliminar, setPorEliminar] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const avisar = useAvisos();

  const cargar = useCallback(() => {
    api(ruta)
      .then((lista) => {
        setItems(lista);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, [ruta]);

  useEffect(cargar, [cargar]);

  async function agregar(evento) {
    evento.preventDefault();
    if (!nuevo.trim()) {
      setErrorNuevo(`Escribe el nombre de la ${singular}.`);
      document.getElementById(`${id}-nuevo`).focus();
      return;
    }
    setOcupado(true);
    try {
      const creado = await api(ruta, { metodo: 'POST', cuerpo: { nombre: nuevo.trim() } });
      setItems((lista) => [...lista, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevo('');
      avisar(`Se agregó la ${singular} ${creado.nombre}.`);
    } catch (error) {
      setErrorNuevo(erroresDeCampos(error).nombre ?? error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (!editando.nombre.trim()) {
      setEditando((e) => ({ ...e, error: 'Escribe el nombre.' }));
      return;
    }
    setOcupado(true);
    try {
      const guardado = await api(`${ruta}${editando.id}/`, { metodo: 'PATCH', cuerpo: { nombre: editando.nombre.trim() } });
      setItems((lista) => lista.map((i) => (i.id === guardado.id ? guardado : i)).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEditando(null);
      avisar(`Se guardó el nombre: ${guardado.nombre}.`);
    } catch (error) {
      setEditando((e) => ({ ...e, error: erroresDeCampos(error).nombre ?? error.message }));
    } finally {
      setOcupado(false);
    }
  }

  async function eliminar() {
    setOcupado(true);
    setErrorEliminar('');
    try {
      await api(`${ruta}${porEliminar.id}/`, { metodo: 'DELETE' });
      setItems((lista) => lista.filter((i) => i.id !== porEliminar.id));
      avisar(`Se eliminó la ${singular} ${porEliminar.nombre}.`);
      setPorEliminar(null);
    } catch (error) {
      setErrorEliminar(error.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby={id} className="rounded-3xl border border-borde bg-crema-claro px-6 pb-4 pt-5">
      <h2 id={id} className="font-titulos text-[22px] font-semibold text-tinta-titulo">
        {titulo}
      </h2>
      <p className="mt-1 text-sm text-tinta-suave">{ayuda}</p>

      <form onSubmit={agregar} noValidate className="mt-4 flex gap-2">
        <div className="flex-1">
          <label htmlFor={`${id}-nuevo`} className="sr-only">
            Nueva {singular}
          </label>
          <input
            id={`${id}-nuevo`}
            value={nuevo}
            onChange={(e) => {
              setNuevo(e.target.value);
              setErrorNuevo('');
            }}
            placeholder={`Nombre de la nueva ${singular}`}
            aria-invalid={errorNuevo ? true : undefined}
            aria-describedby={errorNuevo ? `${id}-nuevo-error` : undefined}
            className={`${ENTRADA} ${errorNuevo ? 'border-error' : 'border-borde-input'}`}
          />
          {errorNuevo && (
            <p id={`${id}-nuevo-error`} className="mt-1.5 text-[13px] text-error">
              {errorNuevo}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={ocupado}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-verde pl-4 pr-5 text-[15px] font-semibold text-white hover:bg-verde-oscuro disabled:opacity-60"
        >
          <Icono nombre="mas" className="size-[18px]" />
          Agregar
        </button>
      </form>

      {estado === 'error' && <p className="mt-4 text-tinta-media">No se pudo cargar la lista.</p>}
      <ul className="mt-3 divide-y divide-linea">
        {items.map((item) => (
          <li key={item.id} className="flex min-h-[58px] items-center gap-3 py-2">
            {editando?.id === item.id ? (
              <form onSubmit={guardar} noValidate className="flex flex-1 flex-wrap items-start gap-2">
                <div className="min-w-[180px] flex-1">
                  <label htmlFor={`${id}-editar-${item.id}`} className="sr-only">
                    Nuevo nombre de {item.nombre}
                  </label>
                  <input
                    id={`${id}-editar-${item.id}`}
                    autoFocus
                    value={editando.nombre}
                    onChange={(e) => setEditando({ ...editando, nombre: e.target.value, error: '' })}
                    onKeyDown={(e) => e.key === 'Escape' && setEditando(null)}
                    aria-invalid={editando.error ? true : undefined}
                    className={`${ENTRADA} ${editando.error ? 'border-error' : 'border-borde-input'}`}
                  />
                  {editando.error && <p className="mt-1.5 text-[13px] text-error">{editando.error}</p>}
                </div>
                <button type="submit" disabled={ocupado} className="h-11 rounded-full bg-verde px-4 text-sm font-semibold text-white hover:bg-verde-oscuro">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="h-11 rounded-full border border-borde-input bg-white px-4 text-sm font-semibold text-tinta-media hover:bg-crema"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                {conColor && (
                  <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: estiloCategoria(item.nombre).acento }} />
                )}
                <span className="flex-1">
                  <span className="font-semibold text-tinta">{item.nombre}</span>
                  <span className="block text-[13px] text-tinta-suave">{contar(item.total_productos, 'producto', 'productos')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditando({ id: item.id, nombre: item.nombre, error: '' })}
                  aria-label={`Cambiar el nombre de ${item.nombre}`}
                  className="inline-flex size-9 items-center justify-center rounded-xl text-tinta-suave hover:bg-verde-suave hover:text-verde"
                >
                  <Icono nombre="editar" className="size-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorEliminar('');
                    setPorEliminar(item);
                  }}
                  aria-label={`Eliminar ${item.nombre}`}
                  className="inline-flex size-9 items-center justify-center rounded-xl text-tinta-suave hover:bg-error-fondo hover:text-error"
                >
                  <Icono nombre="basura" className="size-[18px]" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <Dialogo
        abierto={Boolean(porEliminar)}
        titulo={`¿Eliminar ${porEliminar?.nombre ?? ''}?`}
        textoConfirmar={`Eliminar ${singular}`}
        peligro
        ocupado={ocupado}
        error={errorEliminar}
        onConfirmar={eliminar}
        onCerrar={() => setPorEliminar(null)}
      >
        {porEliminar?.total_productos > 0
          ? `Tiene ${contar(porEliminar.total_productos, 'producto', 'productos')}: primero cámbialos de ${singular}.`
          : `La ${singular} se elimina de la lista.`}
      </Dialogo>
    </section>
  );
}

// «Gestionar categorías» y «Gestionar marcas».
export default function CategoriasMarcas() {
  return (
    <>
      <Encabezado antetitulo="Administración" titulo="Categorías y marcas" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ListaEditable
          id="categorias"
          titulo="Categorías"
          singular="categoría"
          ruta="/categorias/"
          ayuda="Agrupan el catálogo por tipo de cultivo y sirven de filtro para los clientes."
          conColor
        />
        <ListaEditable
          id="marcas"
          titulo="Marcas"
          singular="marca"
          ruta="/marcas/"
          ayuda="Quién produce o empaca la semilla. Los clientes también filtran por marca."
        />
      </div>
    </>
  );
}
