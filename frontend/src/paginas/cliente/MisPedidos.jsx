import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { Etiqueta } from '../../componentes/Tabla.jsx';
import { useCarrito } from '../../sesion/CarritoContext.jsx';
import { contar, fechaHora, listaNombres, pesos } from '../../utilidades/formato.js';

export const FILTROS_ESTADO = [
  { valor: '', texto: 'Todos' },
  { valor: '1', texto: 'En proceso' },
  { valor: '2', texto: 'Completados' },
  { valor: '0', texto: 'Cancelados' },
];

const CHIP = 'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors';
const POR_PAGINA = 12;

export function FiltroEstados({ valor, onCambiar }) {
  return (
    <div role="group" aria-label="Estado del pedido" className="flex gap-2 overflow-x-auto pb-1">
      {FILTROS_ESTADO.map((filtro) => {
        const activo = filtro.valor === valor;
        return (
          <button
            key={filtro.texto}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(filtro.valor)}
            className={`${CHIP} ${
              activo
                ? 'border-verde bg-verde text-white'
                : 'border-borde-input bg-crema-claro text-tinta-media hover:border-verde/40 hover:text-verde'
            }`}
          >
            {filtro.texto}
          </button>
        );
      })}
    </div>
  );
}

// Tabla con las líneas de un pedido (se usa en el historial del cliente y en Pedidos del administrador).
export function DetalleLineas({ pedido }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Productos del pedido {pedido.codigo}</caption>
      <thead>
        <tr className="text-left text-xs text-tinta-suave">
          <th scope="col" className="pb-2 font-semibold">Producto</th>
          <th scope="col" className="pb-2 text-right font-semibold">Unidades</th>
          <th scope="col" className="pb-2 text-right font-semibold">Precio</th>
          <th scope="col" className="pb-2 text-right font-semibold">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {pedido.detalles.map((d) => (
          <tr key={d.producto} className="border-t border-linea">
            <td className="py-2 pr-3">
              <span className="font-semibold text-tinta">{d.nombre}</span> <span className="text-tinta-suave">{d.presentacion}</span>
              <span className="block text-xs text-tinta-suave">{d.marca}</span>
            </td>
            <td className="py-2 text-right tabular-nums">{d.cantidad}</td>
            <td className="py-2 text-right tabular-nums">{pesos(d.precio_unitario)}</td>
            <td className="py-2 text-right font-semibold tabular-nums">{pesos(d.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// «Consultar historial de pedidos» + «Cancelar pedido».
export default function MisPedidos() {
  const [filtro, setFiltro] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [estado, setEstado] = useState('cargando');
  const [abierto, setAbierto] = useState(null);
  const [porCancelar, setPorCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState('');
  const { recargar } = useCarrito();
  const avisar = useAvisos();

  // El servidor devuelve el historial de a una página con el total.
  const consultar = useCallback(
    (numero) => {
      const consulta = new URLSearchParams({ pagina: numero, por_pagina: POR_PAGINA });
      if (filtro) consulta.set('estado', filtro);
      return api(`/pedidos/?${consulta}`);
    },
    [filtro],
  );

  const cargar = useCallback(() => {
    setEstado('cargando');
    consultar(1)
      .then((datos) => {
        setPedidos(datos.resultados);
        setTotal(datos.total);
        setPagina(1);
        setHayMas(datos.hay_mas);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, [consultar]);

  async function cargarMas() {
    setCargandoMas(true);
    try {
      const datos = await consultar(pagina + 1);
      setPedidos((lista) => {
        const vistos = new Set(lista.map((p) => p.id));
        return [...lista, ...datos.resultados.filter((p) => !vistos.has(p.id))];
      });
      setTotal(datos.total);
      setPagina(pagina + 1);
      setHayMas(datos.hay_mas);
    } catch (error) {
      avisar(error.message, { tono: 'error' });
    } finally {
      setCargandoMas(false);
    }
  }

  useEffect(cargar, [cargar]);

  async function cancelar() {
    setCancelando(true);
    setErrorCancelar('');
    try {
      await api(`/pedidos/${porCancelar.id}/cancelar/`, { metodo: 'POST' });
      avisar(`Cancelaste el pedido ${porCancelar.codigo}. Los productos vuelven a estar disponibles.`);
      setPorCancelar(null);
      recargar().catch(() => {});
      cargar();
    } catch (error) {
      setErrorCancelar(error.message);
    } finally {
      setCancelando(false);
    }
  }

  const filtroActual = FILTROS_ESTADO.find((f) => f.valor === filtro);

  return (
    <>
      <Encabezado
        antetitulo={estado === 'listo' ? contar(total, 'pedido', 'pedidos') : 'Tu historial'}
        titulo="Mis pedidos"
      />

      <FiltroEstados valor={filtro} onCambiar={setFiltro} />

      {estado === 'error' && (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudo cargar tu historial.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      )}

      {estado === 'listo' && pedidos.length === 0 && (
        <section className="rounded-3xl border border-dashed border-borde bg-crema-claro px-8 py-12 text-center">
          <p className="font-titulos text-xl font-semibold text-tinta-titulo">
            {filtro ? `No tienes pedidos en «${filtroActual.texto.toLowerCase()}»` : 'Todavía no tienes pedidos'}
          </p>
          <p className="mt-2 text-tinta-suave">Cuando confirmes un pedido desde el carrito, aparecerá aquí.</p>
          <Link to="/cliente/catalogo" className="mt-4 inline-block text-sm font-semibold text-verde hover:text-verde-hover">
            Ver catálogo
          </Link>
        </section>
      )}

      {pedidos.length > 0 && (
        <ul aria-busy={estado === 'cargando'} className="divide-y divide-linea overflow-hidden rounded-3xl border border-borde bg-crema-claro">
          {pedidos.map((pedido) => {
            const expandido = abierto === pedido.id;
            const enProceso = pedido.estado === 1;
            return (
              <li key={pedido.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="min-w-[200px] flex-1">
                    <p className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold tabular-nums text-tinta">{pedido.codigo}</span>
                      <Etiqueta texto={pedido.estado_nombre} />
                    </p>
                    <p className="mt-1 text-[14px] text-tinta-media">{listaNombres(pedido.detalles.map((d) => d.nombre))}</p>
                    <p className="text-[13px] text-tinta-suave">
                      {fechaHora(pedido.fecha)}, {contar(pedido.unidades, 'unidad', 'unidades')}
                    </p>
                  </div>
                  <p className="font-titulos text-[22px] font-semibold tabular-nums text-tinta-titulo">{pesos(pedido.total)}</p>
                  <div className="flex flex-wrap gap-2">
                    {enProceso && (
                      <>
                        <Link
                          to="/cliente/carrito"
                          className="inline-flex h-10 items-center rounded-full bg-verde px-4 text-sm font-semibold text-white hover:bg-verde-oscuro"
                        >
                          Ir al carrito
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorCancelar('');
                            setPorCancelar(pedido);
                          }}
                          className="inline-flex h-10 items-center rounded-full border border-error/40 bg-white px-4 text-sm font-semibold text-error hover:bg-error-fondo"
                        >
                          Cancelar pedido
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-expanded={expandido}
                      aria-controls={`detalle-${pedido.id}`}
                      onClick={() => setAbierto(expandido ? null : pedido.id)}
                      className="inline-flex h-10 items-center gap-1 rounded-full border border-borde-input bg-white pl-4 pr-3 text-sm font-semibold text-tinta-media hover:bg-crema"
                    >
                      {expandido ? 'Ocultar detalle' : 'Ver detalle'}
                      <Icono nombre="chevron" className={`size-4 transition-transform ${expandido ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>
                {expandido && (
                  <div id={`detalle-${pedido.id}`} className="mt-4 overflow-x-auto rounded-2xl border border-borde bg-white px-4 py-3">
                    <DetalleLineas pedido={pedido} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {estado === 'listo' && hayMas && (
        <button
          type="button"
          onClick={cargarMas}
          disabled={cargandoMas}
          className="self-center rounded-full border border-borde-input bg-white px-6 py-2.5 text-sm font-semibold text-tinta-media hover:bg-crema disabled:opacity-60"
        >
          {cargandoMas ? 'Cargando…' : `Mostrar más pedidos (${total - pedidos.length} restantes)`}
        </button>
      )}

      <Dialogo
        abierto={Boolean(porCancelar)}
        titulo={`¿Cancelar el pedido ${porCancelar?.codigo ?? ''}?`}
        textoConfirmar="Cancelar pedido"
        textoCancelar="Volver"
        peligro
        ocupado={cancelando}
        error={errorCancelar}
        onConfirmar={cancelar}
        onCerrar={() => setPorCancelar(null)}
      >
        Los productos apartados vuelven a estar disponibles para otros clientes.
      </Dialogo>
    </>
  );
}
