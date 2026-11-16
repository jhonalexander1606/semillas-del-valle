import { useCallback, useEffect, useState } from 'react';

import { api } from '../../api/cliente.js';
import { Cifra, Variacion } from '../../componentes/Cifras.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import GraficaBarras, { BarrasHorizontales } from '../../componentes/GraficaBarras.jsx';
import { cifra, contar, formatoDia, pesos } from '../../utilidades/formato.js';

const PERIODOS = [
  { valor: 'semana', texto: 'Semana', titulo: 'Ventas por semana', anterior: 'frente a las 8 semanas anteriores' },
  { valor: 'mes', texto: 'Mes', titulo: 'Ventas por mes', anterior: 'frente a los 6 meses anteriores' },
  { valor: 'anio', texto: 'Año', titulo: 'Ventas por año', anterior: 'frente a los 3 años anteriores' },
];

function Tarjeta({ id, titulo, children, className = '' }) {
  return (
    <section aria-labelledby={id} className={`rounded-3xl border border-borde bg-crema-claro px-6 pb-6 pt-5 ${className}`}>
      {titulo && (
        <h2 id={id} className="mb-4 font-titulos text-[21px] font-semibold text-tinta-titulo">
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

// «Consultar reportes de ventas».
export default function Reportes() {
  const [periodo, setPeriodo] = useState('mes');
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando');

  const cargar = useCallback(() => {
    setEstado('cargando');
    api(`/reportes/ventas/?periodo=${periodo}`)
      .then((respuesta) => {
        setDatos(respuesta);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, [periodo]);

  useEffect(cargar, [cargar]);

  const actual = PERIODOS.find((p) => p.valor === periodo);
  const conversion = datos?.conversion;

  return (
    <>
      <Encabezado
        antetitulo={datos ? `Del ${formatoDia(datos.desde)} al ${formatoDia(datos.hasta)}` : 'Reportes'}
        titulo="Reporte de ventas"
      />

      <div role="group" aria-label="Agrupar ventas por" className="inline-flex self-start rounded-full border border-borde-input bg-white p-1">
        {PERIODOS.map((p) => {
          const activo = p.valor === periodo;
          return (
            <button
              key={p.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setPeriodo(p.valor)}
              className={`h-9 rounded-full px-5 text-sm font-semibold transition-colors ${activo ? 'bg-verde text-white' : 'text-tinta-media hover:text-verde'}`}
            >
              {p.texto}
            </button>
          );
        })}
      </div>

      {estado === 'error' && (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">No se pudo cargar el reporte.</p>
          <button type="button" onClick={cargar} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      )}

      {datos && (
        <div aria-busy={estado === 'cargando'} className={`flex flex-col gap-6 transition-opacity ${estado === 'cargando' ? 'opacity-60' : ''}`}>
          <section aria-labelledby="titulo-total" className="rounded-3xl bg-verde px-7 pb-6 pt-6 text-white shadow-[0_14px_34px_rgba(46,111,79,0.25)]">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <h2 id="titulo-total" className="text-[15px] text-verde-texto">
                  Total de ventas
                </h2>
                <p className="mt-1 text-[52px] font-semibold leading-none tracking-[-0.02em]">{pesos(datos.total_ventas)}</p>
                <p className="mt-3 text-sm">
                  <Variacion valor={datos.variacion} frente={actual.anterior} claro />
                </p>
              </div>
              <div className="grid grid-cols-[repeat(4,auto)] gap-x-9 gap-y-4 max-lg:grid-cols-2">
                <Cifra claro etiqueta="Pedidos" valor={cifra(datos.pedidos)} />
                <Cifra claro etiqueta="Clientes" valor={cifra(datos.clientes)} />
                <Cifra claro etiqueta="Productos distintos" valor={cifra(datos.productos_distintos)} />
                <Cifra claro etiqueta="Ticket promedio" valor={pesos(datos.ticket_promedio)} />
              </div>
            </div>
          </section>

          <Tarjeta id="titulo-serie">
            {datos.conexion?.estado === 'error' && (
              <p role="alert" className="mb-3 rounded-2xl bg-naranja-fondo px-5 py-3.5 text-[15px] text-naranja-texto">
                <strong className="font-semibold">Este reporte tiene solo las ventas de Semillas del Valle.</strong> {datos.conexion.mensaje}
              </p>
            )}
            <GraficaBarras
              titulo={actual.titulo}
              series={(datos.series ?? [{
                sistema: 'semillas-del-valle',
                etiqueta: 'Semillas del Valle',
                valores: datos.serie,
              }]).map((s) => ({
                nombre: s.etiqueta || s.sistema,
                valores: s.valores.map((b) => ({
                  etiqueta: b.etiqueta,
                  valor: b.total,
                  detalle: contar(b.pedidos, 'pedido', 'pedidos'),
                })),
              }))}
            />
          </Tarjeta>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Tarjeta id="titulo-mas-vendidos" titulo="Semillas más vendidas">
              {datos.mas_vendidos.length === 0 ? (
                <p className="text-tinta-suave">No hubo ventas en este período.</p>
              ) : (
                <BarrasHorizontales
                  datos={datos.mas_vendidos.map((p) => ({
                    etiqueta: p.nombre,
                    secundario: p.presentacion,
                    valor: p.total,
                    detalle: contar(p.unidades, 'unidad vendida', 'unidades vendidas'),
                  }))}
                />
              )}
            </Tarjeta>

            <Tarjeta id="titulo-categorias" titulo="Ventas por categoría">
              {datos.por_categoria.length === 0 ? (
                <p className="text-tinta-suave">No hubo ventas en este período.</p>
              ) : (
                <BarrasHorizontales
                  datos={datos.por_categoria.map((c) => ({
                    etiqueta: c.categoria,
                    valor: c.total,
                    detalle: `${Math.round((c.total / datos.total_ventas) * 100)} % del total`,
                  }))}
                />
              )}
            </Tarjeta>
          </div>

          <Tarjeta id="titulo-conversion" titulo="De lo que se apartó, ¿cuánto se compró?">
            {conversion.porcentaje_compradas === null ? (
              <p className="text-tinta-suave">Todavía no hay unidades apartadas en este período.</p>
            ) : (
              <>
                <p className="text-[15px] text-tinta-media">
                  De cada 100 unidades que los clientes pusieron en el carrito, compraron{' '}
                  <span className="font-semibold text-tinta">{conversion.porcentaje_compradas.toLocaleString('es-CO')}</span>.
                </p>
                <div
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={conversion.porcentaje_compradas}
                  aria-label="Porcentaje de unidades apartadas que se compraron"
                  className="mt-4 h-4 overflow-hidden rounded-full bg-verde-suave"
                >
                  <div className="h-full rounded-full bg-verde" style={{ width: `${conversion.porcentaje_compradas}%` }} />
                </div>
                <dl className="mt-4 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-2 text-[13px] text-tinta-suave">
                      <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-verde" />
                      Se compraron
                    </dt>
                    <dd className="mt-0.5 font-semibold">{contar(conversion.unidades_vendidas, 'unidad', 'unidades')}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-[13px] text-tinta-suave">
                      <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-verde-suave ring-1 ring-[#C9DCCF]" />
                      Se apartaron y se liberaron
                    </dt>
                    <dd className="mt-0.5 font-semibold">{contar(conversion.unidades_canceladas, 'unidad', 'unidades')}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-tinta-suave">Apartadas ahora en carritos</dt>
                    <dd className="mt-0.5 font-semibold">{contar(conversion.unidades_apartadas_ahora, 'unidad', 'unidades')}</dd>
                  </div>
                </dl>
              </>
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
