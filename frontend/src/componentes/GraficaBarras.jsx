import { useEffect, useId, useRef, useState } from 'react';

import { pesos } from '../utilidades/formato.js';

const compacto = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });

// Colores para cuando la gráfica compara dos sistemas: el nuestro verde, el del otro grupo rojo.
const COLORES_SERIE = ['#2E6F4F', '#B3202A'];
const COLORES_SERIE_RESALTADA = ['#1F4F37', '#8B1820'];

// Marcas del eje en números redondos: un paso de 1, 2, 2.5 o 5 por potencia de diez.
function marcasDelEje(maximo, cuantas = 4) {
  if (maximo <= 0) return [0, 1];
  const crudo = maximo / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((v) => v >= crudo);
  const tope = Math.ceil(maximo / paso) * paso;
  return Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
}

// Barra con la punta redondeada (4 px) y la base recta.
function rutaBarra(x, y, ancho, alto) {
  const r = Math.min(4, alto, ancho / 2);
  return `M${x},${y + alto}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${y + alto}Z`;
}

const ALTO_GRAFICA = 230;
const MARGEN = { arriba: 26, izquierda: 64, derecha: 12, abajo: 30 };

/**
 * Columnas de una o varias series.
 * - Una serie: `datos` como antes — [{ etiqueta, valor, detalle }].
 * - Varias series: `series` — [{ nombre, valores: [{ etiqueta, valor, detalle }] }]. Cada serie va con
 *   un color distinto y las barras del mismo período quedan agrupadas lado a lado. Se dibuja una
 *   leyenda con los nombres de las series.
 * Se etiqueta solo la barra más alta y la del período actual; el resto queda en el tooltip y en la tabla.
 */
export default function GraficaBarras({ titulo, datos, series, nombreValor = 'Ventas' }) {
  const id = useId();
  const [activa, setActiva] = useState(null);
  const [verTabla, setVerTabla] = useState(false);
  // El dibujo usa el ancho real del contenedor: así el texto conserva su tamaño también en celular.
  const contenedor = useRef(null);
  const [ancho, setAncho] = useState(680);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(300, Math.round(entrada.contentRect.width))));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [verTabla]);

  // Unifica el formato: siempre trabajamos con un arreglo de series.
  const seriesNormalizadas = series && series.length
    ? series
    : [{ nombre: nombreValor, valores: datos }];
  const multiple = seriesNormalizadas.length > 1;
  const etiquetasPeriodo = seriesNormalizadas[0].valores.map((v) => v.etiqueta);
  const cantidadPeriodos = etiquetasPeriodo.length;

  const maximo = Math.max(
    ...seriesNormalizadas.flatMap((s) => s.valores.map((v) => v.valor)),
    0,
  );
  const marcas = marcasDelEje(maximo);
  const tope = marcas.at(-1);
  const alto = ALTO_GRAFICA;
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha;
  const franja = anchoUtil / Math.max(cantidadPeriodos, 1);
  // Si hay varias series, cabe menos barra por serie.
  const anchoBarra = Math.min(multiple ? 16 : 24, (franja * 0.9) / seriesNormalizadas.length);
  const separacionBarras = multiple ? 2 : 0;
  const anchoGrupo = anchoBarra * seriesNormalizadas.length + separacionBarras * (seriesNormalizadas.length - 1);
  const y = (valor) => MARGEN.arriba + alto - (valor / tope) * alto;

  // Para resaltar: índice del período con la barra más alta de cada serie (solo cuando es una serie).
  const indiceMaximo = !multiple && cantidadPeriodos
    ? seriesNormalizadas[0].valores.findIndex((v) => v.valor === maximo && maximo > 0)
    : -1;
  const ultimo = cantidadPeriodos - 1;

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption id={`${id}-titulo`} className="font-titulos text-[21px] font-semibold text-tinta-titulo">
          {titulo}
        </figcaption>
        <button
          type="button"
          onClick={() => setVerTabla((v) => !v)}
          aria-pressed={verTabla}
          className="h-9 rounded-full border border-borde-input bg-white px-4 text-sm font-semibold text-tinta-media hover:bg-crema"
        >
          {verTabla ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      {multiple && !verTabla && (
        <ul aria-label="Series" className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-tinta-media">
          {seriesNormalizadas.map((serie, i) => (
            <li key={serie.nombre} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-4 rounded-full"
                style={{ backgroundColor: COLORES_SERIE[i % COLORES_SERIE.length] }}
              />
              <span className="font-medium text-tinta">{serie.nombre}</span>
            </li>
          ))}
        </ul>
      )}

      {verTabla ? (
        <table className="mt-4 w-full text-sm" aria-labelledby={`${id}-titulo`}>
          <thead>
            <tr className="text-left text-xs text-tinta-suave">
              <th scope="col" className="pb-2 font-semibold">Período</th>
              {seriesNormalizadas.map((serie) => (
                <th key={serie.nombre} scope="col" className="pb-2 text-right font-semibold">{serie.nombre}</th>
              ))}
              {!multiple && <th scope="col" className="pb-2 text-right font-semibold">Detalle</th>}
            </tr>
          </thead>
          <tbody>
            {etiquetasPeriodo.map((etiqueta, i) => (
              <tr key={etiqueta} className="border-t border-linea">
                <th scope="row" className="py-2 text-left font-medium">{etiqueta}</th>
                {seriesNormalizadas.map((serie) => (
                  <td key={serie.nombre} className="py-2 text-right font-semibold tabular-nums">
                    {pesos(serie.valores[i].valor)}
                  </td>
                ))}
                {!multiple && (
                  <td className="py-2 text-right text-tinta-suave">{seriesNormalizadas[0].valores[i].detalle}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={contenedor} className="relative mt-3">
          <svg viewBox={`0 0 ${ancho} ${MARGEN.arriba + alto + MARGEN.abajo}`} className="block w-full" role="group" aria-labelledby={`${id}-titulo`}>
            {marcas.map((valor) => (
              <g key={valor}>
                <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(valor)} y2={y(valor)} stroke="#E8E2D5" strokeWidth="1" />
                <text x={MARGEN.izquierda - 10} y={y(valor)} dy="0.32em" textAnchor="end" className="fill-tinta-suave text-[12px] tabular-nums">
                  {valor === 0 ? '$0' : `$${compacto.format(valor)}`}
                </text>
              </g>
            ))}

            {etiquetasPeriodo.map((etiquetaPeriodo, i) => {
              const centro = MARGEN.izquierda + franja * i + franja / 2;
              const resaltada = activa === i;
              const conEtiqueta = !multiple && (i === indiceMaximo || i === ultimo);
              const valorPrincipal = seriesNormalizadas[0].valores[i].valor;
              const alturaPrincipal = Math.max((valorPrincipal / tope) * alto, valorPrincipal > 0 ? 2 : 0);

              return (
                <g
                  key={etiquetaPeriodo}
                  tabIndex={0}
                  role="img"
                  aria-label={
                    multiple
                      ? `${etiquetaPeriodo}: ${seriesNormalizadas.map((s) => `${s.nombre} ${pesos(s.valores[i].valor)}`).join(', ')}`
                      : `${etiquetaPeriodo}: ${pesos(valorPrincipal)}${seriesNormalizadas[0].valores[i].detalle ? `, ${seriesNormalizadas[0].valores[i].detalle}` : ''}`
                  }
                  onPointerEnter={() => setActiva(i)}
                  onPointerLeave={() => setActiva(null)}
                  onFocus={() => setActiva(i)}
                  onBlur={() => setActiva(null)}
                  className="outline-none"
                >
                  {/* Zona de toque: toda la franja, no solo la barra */}
                  <rect x={centro - franja / 2} y={MARGEN.arriba} width={franja} height={alto} fill={resaltada ? '#2E6F4F' : 'transparent'} opacity="0.06" />
                  {seriesNormalizadas.map((serie, s) => {
                    const valor = serie.valores[i].valor;
                    const alturaBarra = Math.max((valor / tope) * alto, valor > 0 ? 2 : 0);
                    const x = centro - anchoGrupo / 2 + s * (anchoBarra + separacionBarras);
                    const colores = resaltada ? COLORES_SERIE_RESALTADA : COLORES_SERIE;
                    return (
                      <path
                        key={serie.nombre}
                        d={rutaBarra(x, MARGEN.arriba + alto - alturaBarra, anchoBarra, alturaBarra)}
                        fill={colores[s % colores.length]}
                      />
                    );
                  })}
                  {conEtiqueta && valorPrincipal > 0 && (
                    <text x={centro} y={MARGEN.arriba + alto - alturaPrincipal - 8} textAnchor="middle" className="fill-tinta text-[12px] font-semibold">
                      ${compacto.format(valorPrincipal)}
                    </text>
                  )}
                  <text x={centro} y={MARGEN.arriba + alto + 20} textAnchor="middle" className="fill-tinta-suave text-[12px]">
                    {etiquetaPeriodo}
                  </text>
                </g>
              );
            })}
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={MARGEN.arriba + alto} y2={MARGEN.arriba + alto} stroke="#CFC7B6" strokeWidth="1" />
          </svg>

          {activa !== null && (
            <div
              role="presentation"
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-borde bg-white px-3 py-2 text-sm shadow-[0_8px_20px_rgba(34,37,31,0.12)]"
              style={{
                left: `${((MARGEN.izquierda + franja * activa + franja / 2) / ancho) * 100}%`,
                top: 0,
              }}
            >
              {multiple ? (
                <>
                  <p className="font-semibold text-tinta">{etiquetasPeriodo[activa]}</p>
                  <ul className="mt-1 space-y-0.5">
                    {seriesNormalizadas.map((serie, s) => (
                      <li key={serie.nombre} className="flex items-center gap-2 whitespace-nowrap text-[13px]">
                        <span aria-hidden="true" className="h-2 w-3 rounded-full" style={{ backgroundColor: COLORES_SERIE[s % COLORES_SERIE.length] }} />
                        <span className="text-tinta-suave">{serie.nombre}:</span>
                        <span className="font-semibold tabular-nums text-tinta">{pesos(serie.valores[activa].valor)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-semibold tabular-nums text-tinta">{pesos(seriesNormalizadas[0].valores[activa].valor)}</p>
                  <p className="whitespace-nowrap text-[13px] text-tinta-suave">
                    {etiquetasPeriodo[activa]}
                    {seriesNormalizadas[0].valores[activa].detalle ? `, ${seriesNormalizadas[0].valores[activa].detalle}` : ''}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

// Barras horizontales de una sola serie (los más vendidos, ventas por categoría).
export function BarrasHorizontales({ datos }) {
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="flex flex-col gap-3.5">
      {datos.map((d) => (
        <li key={d.etiqueta}>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0">
              <span className="font-semibold text-tinta">{d.etiqueta}</span>
              {d.secundario && <span className="text-tinta-suave"> {d.secundario}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-tinta">{pesos(d.valor)}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-verde-suave" aria-hidden="true">
            <div className="h-full rounded-full bg-verde" style={{ width: `${(d.valor / maximo) * 100}%` }} />
          </div>
          {d.detalle && <p className="mt-1 text-[13px] text-tinta-suave">{d.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}
