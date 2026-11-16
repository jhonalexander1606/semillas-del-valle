import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente.js';
import { useAvisos } from '../../componentes/Avisos.jsx';
import { Cifra, Variacion } from '../../componentes/Cifras.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { Etiqueta } from '../../componentes/Tabla.jsx';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { contar, fechaDeHoy, fechaHora, formatoDia, listaNombres, pesos } from '../../utilidades/formato.js';

function Bloque({ id, titulo, enlace, children }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-borde bg-crema-claro px-6 pb-5 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-titulos text-[21px] font-semibold text-tinta-titulo">
          {titulo}
        </h2>
        {enlace && (
          <Link to={enlace.ruta} className="text-sm font-semibold text-verde hover:text-verde-hover">
            {enlace.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function InicioAdmin() {
  const { usuario } = useSesion();
  const avisar = useAvisos();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);
  const [liberando, setLiberando] = useState(false);

  const cargar = useCallback(() => {
    api('/reportes/inicio/')
      .then((respuesta) => {
        setDatos(respuesta);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(cargar, [cargar]);

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
    } catch (e) {
      avisar(e.message, { tono: 'error' });
    } finally {
      setLiberando(false);
    }
  }

  return (
    <>
      <Encabezado antetitulo={fechaDeHoy()} titulo={`Hola, ${usuario.nombre}`} />

      {error && (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudo cargar el resumen.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      )}

      {datos && (
        <>
          <section
            aria-labelledby="titulo-ventas-hoy"
            className="overflow-hidden rounded-3xl bg-verde text-white shadow-[0_14px_34px_rgba(46,111,79,0.25)]"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 px-7 pb-6 pt-6">
              <div>
                <h2 id="titulo-ventas-hoy" className="text-[15px] text-verde-texto">
                  Ventas de hoy
                </h2>
                <p className="mt-1 text-[52px] font-semibold leading-none tracking-[-0.02em]">{pesos(datos.ventas_hoy)}</p>
                <p className="mt-3 text-sm">
                  <Variacion valor={datos.variacion_vs_ayer} frente="frente a ayer" claro />
                </p>
              </div>
              <div className="grid grid-cols-[repeat(3,auto)] gap-x-10 gap-y-4 max-sm:grid-cols-2">
                <Cifra claro etiqueta="Pedidos de hoy" valor={datos.pedidos_hoy} />
                <Cifra claro etiqueta="Ticket promedio" valor={pesos(datos.ticket_promedio_hoy)} />
                <Cifra claro etiqueta="Últimos 7 días" valor={pesos(datos.ventas_7_dias)} />
              </div>
            </div>
            <Link
              to="/admin/reportes"
              className="flex items-center justify-between border-t border-white/15 bg-verde-oscuro px-7 py-3.5 text-[15px] font-semibold hover:bg-verde-hover"
            >
              Ver reportes completos
              <Icono nombre="chevron" className="size-5" />
            </Link>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Bloque
              id="titulo-stock"
              titulo={`Stock bajo (${datos.alertas_stock.length})`}
              enlace={{ ruta: '/admin/productos?alerta=1', texto: 'Ir a productos' }}
            >
              <p className="mt-1 text-[13px] text-tinta-suave">Productos con {datos.stock_minimo} unidades disponibles o menos.</p>
              {datos.alertas_stock.length === 0 ? (
                <p className="mt-4 text-tinta-suave">Todos los productos tienen buen inventario.</p>
              ) : (
                <ul className="mt-3 divide-y divide-linea">
                  {datos.alertas_stock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="font-semibold text-tinta">{p.nombre}</span>{' '}
                        <span className="text-tinta-suave">{p.presentacion}</span>
                        <span className="block text-[13px] text-tinta-suave">
                          {p.marca}
                          {p.apartado > 0 && `, ${contar(p.apartado, 'apartada', 'apartadas')} en carritos`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-tinta">{p.disponible}</span>
                        <Etiqueta texto={p.disponible === 0 ? 'Agotado' : 'Stock bajo'} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>

            <Bloque id="titulo-vencer" titulo={`Por vencer (${datos.por_vencer.length})`}>
              <p className="mt-1 text-[13px] text-tinta-suave">
                Semillas que vencen en los próximos {datos.dias_alerta_vencimiento} días: después de esa fecha baja la germinación.
              </p>
              {datos.por_vencer.length === 0 ? (
                <p className="mt-4 text-tinta-suave">Ningún producto vence pronto.</p>
              ) : (
                <ul className="mt-3 divide-y divide-linea">
                  {datos.por_vencer.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="font-semibold text-tinta">{p.nombre}</span>{' '}
                        <span className="text-tinta-suave">{p.presentacion}</span>
                        <span className="block text-[13px] text-tinta-suave">
                          Vence el {formatoDia(p.fecha_vencimiento)}, {contar(p.disponible, 'unidad disponible', 'unidades disponibles')}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-naranja-fondo px-2.5 py-0.5 text-xs font-semibold text-naranja-texto">
                        {p.dias <= 0 ? 'Vencido' : `En ${contar(p.dias, 'día', 'días')}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>
          </div>

          <Bloque id="titulo-carritos" titulo="Carritos abiertos" enlace={{ ruta: '/admin/pedidos?estado=1', texto: 'Ver carritos' }}>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[70ch] text-[15px] text-tinta-media">
                {datos.carritos_activos === 0
                  ? 'Ningún cliente tiene productos apartados en este momento.'
                  : `${contar(datos.carritos_activos, 'carrito tiene', 'carritos tienen')} ${contar(
                      datos.unidades_apartadas,
                      'unidad apartada',
                      'unidades apartadas',
                    )}. `}
                {datos.carritos_inactivos > 0 &&
                  `${contar(datos.carritos_inactivos, 'lleva', 'llevan')} más de ${datos.horas_reserva} horas sin movimiento.`}
              </p>
              <button
                type="button"
                onClick={liberarCarritos}
                disabled={liberando || datos.carritos_inactivos === 0}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-borde-input bg-white px-5 text-[15px] font-semibold text-tinta-media hover:bg-crema disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icono nombre="refrescar" className="size-[18px]" />
                {liberando ? 'Liberando…' : 'Liberar carritos inactivos'}
              </button>
            </div>
          </Bloque>

          <Bloque id="titulo-ultimas" titulo="Últimas ventas" enlace={{ ruta: '/admin/pedidos?estado=2', texto: 'Ver todos los pedidos' }}>
            <ul className="mt-3 divide-y divide-linea">
              {datos.ultimas_ventas.map((venta) => (
                <li key={venta.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0">
                    <span className="font-semibold tabular-nums text-tinta">{venta.codigo}</span>{' '}
                    <span className="text-tinta-media">{venta.cliente}</span>
                    <span className="block text-[13px] text-tinta-suave">
                      {listaNombres(venta.productos, 2)}, {contar(venta.unidades, 'unidad', 'unidades')}, {fechaHora(venta.fecha)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-tinta">{pesos(venta.total)}</span>
                </li>
              ))}
            </ul>
          </Bloque>
        </>
      )}
    </>
  );
}
