import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api, ErrorApi } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import Sobre from '../../componentes/Sobre.jsx';
import { useCarrito } from '../../sesion/CarritoContext.jsx';
import { contar, pesos } from '../../utilidades/formato.js';

const CHIP = 'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors';
const CHIP_ACTIVO = 'border-verde bg-verde text-white';
const CHIP_INACTIVO = 'border-borde-input bg-crema-claro text-tinta-media hover:border-verde/40 hover:text-verde';

// «Consultar catálogo de productos» + «Agregar producto al carrito».
export default function Catalogo() {
  const [parametros, setParametros] = useSearchParams();
  const categoria = parametros.get('categoria') ?? '';
  const marca = parametros.get('marca') ?? '';
  const [texto, setTexto] = useState(parametros.get('buscar') ?? '');
  const [buscar, setBuscar] = useState(texto);
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [agregando, setAgregando] = useState(null);
  const [alternativas, setAlternativas] = useState(null); // { producto, mensaje, lista }

  const { agregar, unidadesDe } = useCarrito();
  const avisar = useAvisos();

  useEffect(() => {
    Promise.all([api('/categorias/'), api('/marcas/')])
      .then(([listaCategorias, listaMarcas]) => {
        setCategorias(listaCategorias);
        setMarcas(listaMarcas);
      })
      .catch(() => {});
  }, []);

  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 250);
    return () => clearTimeout(espera);
  }, [texto]);

  const consulta = useMemo(() => {
    const valores = new URLSearchParams();
    if (categoria) valores.set('categoria', categoria);
    if (marca) valores.set('marca', marca);
    if (buscar) valores.set('buscar', buscar);
    if (soloDisponibles) valores.set('disponibles', '1');
    return valores.toString();
  }, [categoria, marca, buscar, soloDisponibles]);

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    api(`/productos/?${consulta}`)
      .then((lista) => {
        if (!vigente) return;
        setProductos(lista);
        setEstado('listo');
      })
      .catch(() => vigente && setEstado('error'));
    return () => {
      vigente = false;
    };
  }, [consulta]);

  // Después de agregar al carrito, el stock cambió: se vuelve a pedir sin mostrar "cargando".
  function refrescar() {
    api(`/productos/?${consulta}`)
      .then(setProductos)
      .catch(() => {});
  }

  function cambiarFiltro(nombre, valor) {
    const nuevos = new URLSearchParams(parametros);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    setParametros(nuevos, { replace: true });
  }

  async function agregarProducto(producto) {
    setAgregando(producto.id);
    try {
      await agregar(producto.id, 1);
      avisar(`${producto.nombre} ${producto.presentacion} quedó apartado en tu carrito.`, {
        enlace: { ruta: '/cliente/carrito', texto: 'Ver carrito' },
      });
      setAlternativas(null);
      refrescar();
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 409) {
        // «¿Disponible? No → Ofrecer alternativas»
        setAlternativas({ producto, mensaje: error.message, lista: error.datos.alternativas ?? [] });
      } else {
        avisar(error.message, { tono: 'error' });
      }
    } finally {
      setAgregando(null);
    }
  }

  async function verAlternativas(producto) {
    setAlternativas({ producto, mensaje: `${producto.nombre} ${producto.presentacion} está agotado.`, lista: null });
    try {
      const lista = await api(`/productos/${producto.id}/alternativas/`);
      setAlternativas((actual) => actual && { ...actual, lista });
    } catch {
      setAlternativas((actual) => actual && { ...actual, lista: [] });
    }
  }

  const nombreCategoria = useMemo(
    () => categorias.find((c) => String(c.id) === categoria)?.nombre,
    [categorias, categoria],
  );

  return (
    <>
      <Encabezado
        antetitulo={estado === 'listo' ? contar(productos.length, 'producto', 'productos') : 'Catálogo'}
        titulo={nombreCategoria ?? 'Catálogo'}
      />

      <section aria-label="Filtros" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[240px] flex-[3_1_320px]">
            <span className="sr-only">Buscar semillas</span>
            <Icono nombre="buscar" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre, marca o categoría"
              className="h-[50px] w-full rounded-full border border-borde-input bg-white pl-12 pr-4 text-[15px] placeholder:text-[#77746B] focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20"
            />
          </label>
          <label className="flex-[1_1_200px]">
            <span className="sr-only">Marca</span>
            <select
              value={marca}
              onChange={(e) => cambiarFiltro('marca', e.target.value)}
              className="h-[50px] w-full rounded-full border border-borde-input bg-white px-4 text-[15px] text-tinta focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div role="group" aria-label="Categoría" className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={!categoria}
              onClick={() => cambiarFiltro('categoria', '')}
              className={`${CHIP} ${!categoria ? CHIP_ACTIVO : CHIP_INACTIVO}`}
            >
              Todas
            </button>
            {categorias.map((c) => {
              const activa = String(c.id) === categoria;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => cambiarFiltro('categoria', activa ? '' : String(c.id))}
                  className={`${CHIP} ${activa ? CHIP_ACTIVO : CHIP_INACTIVO}`}
                >
                  {c.nombre}
                </button>
              );
            })}
          </div>
          <label className="ml-auto inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium text-tinta-media">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
              className="size-4 accent-verde"
            />
            Solo con unidades disponibles
          </label>
        </div>
      </section>

      {estado === 'error' && (
        <p className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center text-tinta-media">
          No se pudo cargar el catálogo. Revisa tu conexión y vuelve a intentarlo.
        </p>
      )}

      {estado === 'listo' && productos.length === 0 && (
        <section className="rounded-3xl border border-dashed border-borde bg-crema-claro px-8 py-12 text-center">
          <p className="font-titulos text-xl font-semibold text-tinta-titulo">No hay productos con esos filtros</p>
          <p className="mt-2 text-tinta-suave">Prueba con otra categoría o borra la búsqueda.</p>
        </section>
      )}

      <div
        aria-busy={estado === 'cargando'}
        className={`grid grid-cols-[repeat(auto-fill,minmax(214px,1fr))] gap-x-5 gap-y-6 ${estado === 'cargando' ? 'opacity-60' : ''}`}
      >
        {productos.map((producto) => {
          const enCarrito = unidadesDe(producto.id);
          const agotado = producto.estado_stock === 'agotado';
          return (
            <Sobre
              key={producto.id}
              producto={producto}
              accion={
                agotado ? (
                  <button
                    type="button"
                    onClick={() => verAlternativas(producto)}
                    className="h-10 whitespace-nowrap rounded-full border border-borde-input bg-white px-4 text-sm font-semibold text-tinta-media hover:bg-crema"
                  >
                    Ver alternativas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => agregarProducto(producto)}
                    disabled={agregando === producto.id}
                    aria-label={`Agregar ${producto.nombre} ${producto.presentacion} al carrito`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-verde pl-3 pr-4 text-sm font-semibold text-white hover:bg-verde-oscuro disabled:opacity-60"
                  >
                    <Icono nombre="mas" className="size-4" />
                    Agregar
                  </button>
                )
              }
              nota={
                enCarrito > 0 && (
                  <Link
                    to="/cliente/carrito"
                    className="mt-2.5 inline-flex min-h-7 items-center gap-1.5 self-start rounded-full bg-verde-suave px-2.5 text-[12.5px] font-semibold text-[#245A40] hover:bg-[#D5E6DB]"
                  >
                    <Icono nombre="carrito" className="size-3.5" />
                    {contar(enCarrito, 'unidad', 'unidades')} en tu carrito
                  </Link>
                )
              }
            />
          );
        })}
      </div>

      <Dialogo
        abierto={Boolean(alternativas)}
        titulo="Te ofrecemos estas alternativas"
        textoCancelar="Cerrar"
        onCerrar={() => setAlternativas(null)}
      >
        {alternativas && (
          <>
            <p>
              {alternativas.mensaje} Estos productos de {alternativas.producto.categoria_nombre.toLowerCase()} sí tienen unidades:
            </p>
            {alternativas.lista === null && <p className="mt-4 text-tinta-suave">Buscando alternativas…</p>}
            {alternativas.lista?.length === 0 && (
              <p className="mt-4 rounded-2xl bg-crema px-4 py-3 text-tinta-suave">
                Por ahora no hay otros productos de esta categoría con unidades disponibles.
              </p>
            )}
            {alternativas.lista?.length > 0 && (
              <ul className="mt-4 divide-y divide-linea rounded-2xl border border-borde bg-white">
                {alternativas.lista.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-tinta">
                        {p.nombre} <span className="font-normal text-tinta-suave">{p.presentacion}</span>
                      </p>
                      <p className="text-[13px] text-tinta-suave">
                        {p.marca_nombre}, {pesos(p.precio_unitario)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => agregarProducto(p)}
                      disabled={agregando === p.id}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-verde pl-2.5 pr-3.5 text-sm font-semibold text-white hover:bg-verde-oscuro disabled:opacity-60"
                    >
                      <Icono nombre="mas" className="size-4" />
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Dialogo>
    </>
  );
}
