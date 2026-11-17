import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { Miniatura } from '../../componentes/Sobre.jsx';
import { BloqueTabla, Etiqueta, FILA, TD, TH } from '../../componentes/Tabla.jsx';
import { contar, formatoDia, pesos } from '../../utilidades/formato.js';
import FormularioProducto from './FormularioProducto.jsx';

const ENTRADA =
  'h-11 rounded-full border border-borde-input bg-white px-4 text-[15px] text-tinta focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20';

// «Gestionar productos»: crear, editar y eliminar, con el stock disponible y el apartado.
export default function Productos() {
  const [parametros, setParametros] = useSearchParams();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [texto, setTexto] = useState('');
  const [formulario, setFormulario] = useState(null); // null | 'nuevo' | producto
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const botonNuevo = useRef(null);
  const avisar = useAvisos();

  const categoria = parametros.get('categoria') ?? '';
  const marca = parametros.get('marca') ?? '';
  const soloAlerta = parametros.get('alerta') === '1';

  const cargar = useCallback(() => {
    setEstado('cargando');
    api('/productos/')
      .then((lista) => {
        setProductos(lista);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  useEffect(() => {
    cargar();
    api('/categorias/').then(setCategorias).catch(() => {});
    api('/marcas/').then(setMarcas).catch(() => {});
  }, [cargar]);

  function cambiarFiltro(nombre, valor) {
    const nuevos = new URLSearchParams(parametros);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    setParametros(nuevos, { replace: true });
  }

  const visibles = useMemo(() => {
    const buscado = texto.trim().toLowerCase();
    return productos.filter(
      (p) =>
        (!categoria || String(p.categoria) === categoria) &&
        (!marca || String(p.marca) === marca) &&
        (!soloAlerta || p.estado_stock !== 'normal' || p.por_vencer) &&
        (!buscado || `${p.nombre} ${p.marca_nombre} ${p.categoria_nombre}`.toLowerCase().includes(buscado)),
    );
  }, [productos, categoria, marca, soloAlerta, texto]);

  function cerrarFormulario() {
    setFormulario(null);
    botonNuevo.current?.focus();
  }

  function alGuardar(guardado, editando) {
    setProductos((lista) =>
      editando ? lista.map((p) => (p.id === guardado.id ? guardado : p)) : [...lista, guardado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    avisar(editando ? `Se guardaron los cambios de ${guardado.nombre} ${guardado.presentacion}.` : `Se creó ${guardado.nombre} ${guardado.presentacion}.`);
    cerrarFormulario();
  }

  async function eliminar() {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await api(`/productos/${porEliminar.id}/`, { metodo: 'DELETE' });
      setProductos((lista) => lista.filter((p) => p.id !== porEliminar.id));
      avisar(`Se eliminó ${porEliminar.nombre} ${porEliminar.presentacion}.`);
      setPorEliminar(null);
    } catch (error) {
      setErrorEliminar(error.message);
    } finally {
      setEliminando(false);
    }
  }

  const conAlerta = productos.filter((p) => p.estado_stock !== 'normal' || p.por_vencer).length;

  return (
    <>
      <Encabezado antetitulo="Administración" titulo="Productos">
        <button
          ref={botonNuevo}
          type="button"
          onClick={() => setFormulario('nuevo')}
          disabled={Boolean(formulario)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-verde px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(46,111,79,0.22)] transition-colors hover:bg-verde-oscuro disabled:opacity-60"
        >
          <Icono nombre="mas" />
          Nuevo producto
        </button>
      </Encabezado>

      {formulario && (
        <FormularioProducto
          key={formulario === 'nuevo' ? 'nuevo' : formulario.id}
          producto={formulario === 'nuevo' ? null : formulario}
          categorias={categorias}
          marcas={marcas}
          onGuardado={alGuardar}
          onCancelar={cerrarFormulario}
        />
      )}

      <section aria-label="Filtros" className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-[2_1_260px]">
          <span className="sr-only">Buscar producto</span>
          <Icono nombre="buscar" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar producto" className={`${ENTRADA} w-full pl-12`} />
        </label>
        <label className="flex-[1_1_180px]">
          <span className="sr-only">Categoría</span>
          <select value={categoria} onChange={(e) => cambiarFiltro('categoria', e.target.value)} className={`${ENTRADA} w-full`}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-[1_1_180px]">
          <span className="sr-only">Marca</span>
          <select value={marca} onChange={(e) => cambiarFiltro('marca', e.target.value)} className={`${ENTRADA} w-full`}>
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-tinta-media">
          <input type="checkbox" checked={soloAlerta} onChange={(e) => cambiarFiltro('alerta', e.target.checked ? '1' : '')} className="size-4 accent-verde" />
          Solo con alerta ({conAlerta})
        </label>
      </section>

      {estado === 'error' ? (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudo cargar la lista de productos.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      ) : (
        <BloqueTabla id="titulo-lista-productos" titulo={estado === 'cargando' ? 'Productos' : contar(visibles.length, 'producto', 'productos')}>
          <thead>
            <tr>
              <th scope="col" className={TH}>Producto</th>
              <th scope="col" className={TH}>Categoría</th>
              <th scope="col" className={`${TH} text-right`}>Precio</th>
              <th scope="col" className={`${TH} text-right`}>Disponible</th>
              <th scope="col" className={`${TH} text-right`}>Apartado</th>
              <th scope="col" className={TH}>Vence</th>
              <th scope="col" className={TH}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {estado === 'cargando' && (
              <tr>
                <td colSpan={7} className={`${TD} py-8 text-center text-tinta-suave`}>
                  Cargando productos…
                </td>
              </tr>
            )}
            {estado === 'listo' && visibles.length === 0 && (
              <tr>
                <td colSpan={7} className={`${TD} py-8 text-center text-tinta-suave`}>
                  Ningún producto coincide con los filtros.
                </td>
              </tr>
            )}
            {estado === 'listo' &&
              visibles.map((p) => (
                <tr key={p.id} className={FILA}>
                  <td className={TD}>
                    <span className="flex items-center gap-3">
                      <Miniatura categoria={p.categoria_nombre} imagen={p.imagen_url} className="size-11 rounded-xl" />
                      <span>
                        <span className="font-semibold text-tinta">{p.nombre}</span> <span className="text-tinta-suave">{p.presentacion}</span>
                        <span className="block text-[13px] text-tinta-suave">{p.marca_nombre}</span>
                      </span>
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>{p.categoria_nombre}</td>
                  <td className={`${TD} text-right tabular-nums`}>{pesos(p.precio_unitario)}</td>
                  <td className={`${TD} text-right`}>
                    <span className="flex items-center justify-end gap-2">
                      {p.estado_stock !== 'normal' && <Etiqueta texto={p.estado_stock === 'agotado' ? 'Agotado' : 'Stock bajo'} />}
                      <span className="font-semibold tabular-nums text-tinta">{p.stock_disponible}</span>
                    </span>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{p.stock_apartado}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatoDia(p.fecha_vencimiento)}
                    {p.por_vencer && <span className="ml-2 align-middle"><Etiqueta texto="Por vencer" /></span>}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <button
                      type="button"
                      onClick={() => setFormulario(p)}
                      aria-label={`Editar ${p.nombre} ${p.presentacion}`}
                      className="inline-flex size-9 items-center justify-center rounded-xl text-tinta-suave hover:bg-verde-suave hover:text-verde"
                    >
                      <Icono nombre="editar" className="size-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorEliminar('');
                        setPorEliminar(p);
                      }}
                      aria-label={`Eliminar ${p.nombre} ${p.presentacion}`}
                      className="ml-1 inline-flex size-9 items-center justify-center rounded-xl text-tinta-suave hover:bg-error-fondo hover:text-error"
                    >
                      <Icono nombre="basura" className="size-[18px]" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </BloqueTabla>
      )}

      <Dialogo
        abierto={Boolean(porEliminar)}
        titulo={`¿Eliminar ${porEliminar?.nombre ?? ''} ${porEliminar?.presentacion ?? ''}?`}
        textoConfirmar="Eliminar producto"
        peligro
        ocupado={eliminando}
        error={errorEliminar}
        onConfirmar={eliminar}
        onCerrar={() => setPorEliminar(null)}
      >
        El producto sale del catálogo. Si ya aparece en pedidos no se puede eliminar; en ese caso deja sus unidades disponibles en 0.
      </Dialogo>
    </>
  );
}
