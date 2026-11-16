import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { BloqueTabla, Etiqueta, FILA, TD, TH } from '../../componentes/Tabla.jsx';
import { contar, fechaHora, listaNombres, pesos } from '../../utilidades/formato.js';
import { DetalleLineas, FiltroEstados } from '../cliente/MisPedidos.jsx';

const POR_PAGINA = 20;

// Qué pasa con el inventario en cada cambio de estado (se le explica al administrador antes de confirmar).
function cambioDeEstado(pedido, estado) {
  if (estado === 2) {
    return {
      titulo: `¿Marcar ${pedido.codigo} como completado?`,
      texto: 'Se confirma en nombre del cliente: las unidades apartadas quedan vendidas.',
      boton: 'Marcar completado',
      peligro: false,
    };
  }
  return {
    titulo: `¿Cancelar ${pedido.codigo}?`,
    texto:
      pedido.estado === 1
        ? 'Las unidades apartadas en este carrito vuelven a estar disponibles.'
        : 'Es un pedido ya confirmado: las unidades vendidas vuelven al inventario.',
    boton: 'Cancelar pedido',
    peligro: true,
  };
}

// «Actualizar estado del pedido» + consultar todos los pedidos.
export default function Pedidos() {
  const [parametros, setParametros] = useSearchParams();
  const filtro = parametros.get('estado') ?? '';
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [estado, setEstado] = useState('cargando');
  const [abierto, setAbierto] = useState(null);
  const [cambio, setCambio] = useState(null); // { pedido, estado }
  const [ocupado, setOcupado] = useState(false);
  const [errorCambio, setErrorCambio] = useState('');
  const [liberando, setLiberando] = useState(false);
  const avisar = useAvisos();

  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), 300);
    return () => clearTimeout(espera);
  }, [texto]);

  // El servidor devuelve los pedidos de a una página (20) con el total.
  const consultar = useCallback(
    (numero) => {
      const consulta = new URLSearchParams({ pagina: numero, por_pagina: POR_PAGINA });
      if (filtro) consulta.set('estado', filtro);
      if (buscar) consulta.set('buscar', buscar);
      return api(`/pedidos/?${consulta}`);
    },
    [filtro, buscar],
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

  function cambiarFiltro(valor) {
    const nuevos = new URLSearchParams(parametros);
    if (valor) nuevos.set('estado', valor);
    else nuevos.delete('estado');
    setParametros(nuevos, { replace: true });
  }

  async function aplicarCambio() {
    setOcupado(true);
    setErrorCambio('');
    try {
      const actualizado = await api(`/pedidos/${cambio.pedido.id}/estado/`, { metodo: 'POST', cuerpo: { estado: cambio.estado } });
      setPedidos((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)));
      avisar(`${actualizado.codigo} quedó ${actualizado.estado_nombre.toLowerCase()}.`);
      setCambio(null);
    } catch (error) {
      setErrorCambio(error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function liberarCarritos() {
    setLiberando(true);
    try {
      const { liberados, horas } = await api('/pedidos/liberar-carritos/', { metodo: 'POST', cuerpo: {} });
      avisar(
        liberados
          ? `Se liberaron ${contar(liberados, 'carrito', 'carritos')} con más de ${horas} horas sin movimiento.`
          : 'No había carritos inactivos para liberar.',
      );
      cargar();
    } catch (error) {
      avisar(error.message, { tono: 'error' });
    } finally {
      setLiberando(false);
    }
  }

  const textoCambio = cambio && cambioDeEstado(cambio.pedido, cambio.estado);

  return (
    <>
      <Encabezado antetitulo="Administración" titulo="Pedidos">
        <button
          type="button"
          onClick={liberarCarritos}
          disabled={liberando}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-borde-input bg-white px-5 text-[15px] font-semibold text-tinta-media hover:bg-crema disabled:opacity-60"
        >
          <Icono nombre="refrescar" className="size-[18px]" />
          {liberando ? 'Liberando…' : 'Liberar carritos inactivos'}
        </button>
      </Encabezado>

      <section aria-label="Filtros" className="flex flex-wrap items-center gap-3">
        <FiltroEstados valor={filtro} onCambiar={cambiarFiltro} />
        <label className="relative ml-auto min-w-[240px] flex-[0_1_340px]">
          <span className="sr-only">Buscar por cliente o código</span>
          <Icono nombre="buscar" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por cliente o código"
            className="h-11 w-full rounded-full border border-borde-input bg-white pl-12 pr-4 text-[15px] focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20"
          />
        </label>
      </section>

      {estado === 'error' ? (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudieron cargar los pedidos.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      ) : (
        <BloqueTabla id="titulo-lista-pedidos" titulo={estado === 'cargando' ? 'Pedidos' : contar(total, 'pedido', 'pedidos')}>
          <thead>
            <tr>
              <th scope="col" className={TH}>Pedido</th>
              <th scope="col" className={TH}>Cliente</th>
              <th scope="col" className={TH}>Productos</th>
              <th scope="col" className={`${TH} text-right`}>Total</th>
              <th scope="col" className={TH}>Estado</th>
              <th scope="col" className={TH}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className={estado === 'cargando' ? 'opacity-60' : ''}>
            {estado === 'listo' && pedidos.length === 0 && (
              <tr>
                <td colSpan={6} className={`${TD} py-8 text-center text-tinta-suave`}>
                  No hay pedidos con esos filtros.
                </td>
              </tr>
            )}
            {pedidos.map((p) => {
              const expandido = abierto === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className={FILA}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-expanded={expandido}
                          aria-controls={`detalle-admin-${p.id}`}
                          aria-label={`${expandido ? 'Ocultar' : 'Ver'} el detalle de ${p.codigo}`}
                          onClick={() => setAbierto(expandido ? null : p.id)}
                          className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-tinta-suave hover:bg-crema"
                        >
                          <Icono nombre="chevron" className={`size-5 transition-transform ${expandido ? 'rotate-90' : ''}`} />
                        </button>
                        <span>
                          <span className="font-semibold tabular-nums text-tinta">{p.codigo}</span>
                          <span className="block text-[13px] text-tinta-suave">{fechaHora(p.fecha)}</span>
                        </span>
                      </span>
                    </td>
                    <td className={TD}>
                      <span className="whitespace-nowrap font-medium text-tinta">
                        {p.cliente.nombre} {p.cliente.apellido}
                      </span>
                      <span className="block max-w-[210px] truncate text-[13px] text-tinta-suave" title={p.cliente.email}>
                        {p.cliente.email}
                      </span>
                    </td>
                    <td className={`${TD} min-w-[180px]`}>
                      {listaNombres(p.detalles.map((d) => d.nombre), 1)}
                      <span className="block text-[13px] text-tinta-suave">{contar(p.unidades, 'unidad', 'unidades')}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-tinta`}>{pesos(p.total)}</td>
                    <td className={TD}>
                      <Etiqueta texto={p.estado_nombre} />
                    </td>
                    <td className={`${TD} whitespace-nowrap text-right`}>
                      {p.estado === 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorCambio('');
                            setCambio({ pedido: p, estado: 2 });
                          }}
                          className="h-9 rounded-full bg-verde px-3.5 text-sm font-semibold text-white hover:bg-verde-oscuro"
                        >
                          Completar
                        </button>
                      )}
                      {p.estado !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorCambio('');
                            setCambio({ pedido: p, estado: 0 });
                          }}
                          className="ml-2 h-9 rounded-full border border-error/40 bg-white px-3.5 text-sm font-semibold text-error hover:bg-error-fondo"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandido && (
                    <tr id={`detalle-admin-${p.id}`}>
                      <td colSpan={6} className="border-t border-linea bg-white px-6 py-3">
                        <DetalleLineas pedido={p} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </BloqueTabla>
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
        abierto={Boolean(cambio)}
        titulo={textoCambio?.titulo}
        textoConfirmar={textoCambio?.boton}
        textoCancelar="Volver"
        peligro={textoCambio?.peligro}
        ocupado={ocupado}
        error={errorCambio}
        onConfirmar={aplicarCambio}
        onCerrar={() => setCambio(null)}
      >
        {textoCambio?.texto}
      </Dialogo>
    </>
  );
}
