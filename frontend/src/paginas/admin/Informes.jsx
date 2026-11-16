import { useEffect, useState } from 'react';

import { api } from '../../api/cliente.js';
import Encabezado from '../../componentes/Encabezado.jsx';
import GraficaBarras, { BarrasHorizontales } from '../../componentes/GraficaBarras.jsx';
import { BloqueTabla, Etiqueta, FILA, TD, TH } from '../../componentes/Tabla.jsx';
import { cifra, contar, formatoFecha, listaNombres, pesos } from '../../utilidades/formato.js';

const VISTAS = [
  { valor: 'tabular', texto: 'Tabular' },
  { valor: 'consolidado', texto: 'Consolidado' },
  { valor: 'grafico', texto: 'Gráfico' },
];

const ESTADOS = [
  { valor: '', texto: 'Todos los estados' },
  { valor: 'completado', texto: 'Completados' },
  { valor: 'en_proceso', texto: 'En proceso' },
  { valor: 'cancelado', texto: 'Cancelados' },
];

const AGRUPACIONES = [
  { valor: 'mes', texto: 'Mes' },
  { valor: 'estado', texto: 'Estado' },
  { valor: 'categoria', texto: 'Categoría' },
  { valor: 'sistema', texto: 'Sistema', soloConectado: true },
];

const CAMPO =
  'h-11 w-full rounded-full border border-borde-input bg-white px-4 text-[15px] focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20';

const TD_NUMERO = `${TD} whitespace-nowrap text-right tabular-nums`;
const TF = 'border-t-2 border-borde bg-crema-oscuro px-4 py-3.5 font-semibold text-tinta first:pl-6 last:pr-6';

function fechaIso(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function Filtro({ etiqueta, children }) {
  return (
    <label className="flex min-w-[170px] flex-1 flex-col gap-1.5 text-[13px] font-semibold text-tinta-media">
      {etiqueta}
      {children}
    </label>
  );
}

// Avisa si los resultados incluyen, o deberían incluir, al sistema del otro grupo.
function AvisoConexion({ conexion }) {
  if (conexion.estado === 'error') {
    return (
      <p role="alert" className="rounded-2xl bg-naranja-fondo px-5 py-3.5 text-[15px] text-naranja-texto">
        <strong className="font-semibold">Este informe tiene solo los pedidos de Semillas del Valle.</strong> {conexion.mensaje}
      </p>
    );
  }
  if (conexion.estado === 'conectada') {
    return <p className="text-sm text-tinta-suave">Incluye los pedidos de: {conexion.sistemas.join(' y ')}.</p>;
  }
  return null;
}

function InformeTabular({ datos, onPagina }) {
  const conSistema = datos.conexion.sistemas.length > 1;
  return (
    <BloqueTabla id="titulo-informe-tabular" titulo={contar(datos.totales.pedidos, 'pedido', 'pedidos')}>
      <thead>
        <tr>
          {conSistema && <th scope="col" className={TH}>Sistema</th>}
          <th scope="col" className={TH}>Pedido</th>
          <th scope="col" className={TH}>Fecha</th>
          <th scope="col" className={TH}>Cliente</th>
          <th scope="col" className={TH}>Productos</th>
          <th scope="col" className={`${TH} text-right`}>Unidades</th>
          <th scope="col" className={`${TH} text-right`}>Total</th>
          <th scope="col" className={TH}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {datos.filas.map((p) => (
          <tr key={`${p.sistema}-${p.codigo}`} className={FILA}>
            {conSistema && <td className={`${TD} whitespace-nowrap`}>{p.sistema}</td>}
            <td className={`${TD} whitespace-nowrap font-semibold tabular-nums text-tinta`}>{p.codigo}</td>
            <td className={`${TD} whitespace-nowrap`}>{formatoFecha(p.fecha)}</td>
            <td className={`${TD} whitespace-nowrap`}>{p.cliente}</td>
            <td className={`${TD} min-w-[180px]`}>{listaNombres(p.productos, 2)}</td>
            <td className={TD_NUMERO}>{cifra(p.unidades)}</td>
            <td className={`${TD_NUMERO} font-semibold text-tinta`}>{pesos(p.total)}</td>
            <td className={TD}>
              <Etiqueta texto={p.estado_nombre} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={conSistema ? 5 : 4} className={`${TF} text-left`}>
            Total de los {cifra(datos.totales.pedidos)} pedidos
          </th>
          <td className={`${TF} text-right tabular-nums`}>{cifra(datos.totales.unidades)}</td>
          <td className={`${TF} whitespace-nowrap text-right tabular-nums`}>{pesos(datos.totales.total)}</td>
          <td className={TF}>
            {datos.paginas > 1 && (
              <span className="flex items-center justify-end gap-2 whitespace-nowrap font-medium">
                <button type="button" disabled={datos.pagina === 1} onClick={() => onPagina(datos.pagina - 1)} className="text-verde hover:text-verde-hover disabled:text-tinta-suave">
                  Anterior
                </button>
                <span className="tabular-nums text-tinta-media">{datos.pagina} de {datos.paginas}</span>
                <button type="button" disabled={datos.pagina === datos.paginas} onClick={() => onPagina(datos.pagina + 1)} className="text-verde hover:text-verde-hover disabled:text-tinta-suave">
                  Siguiente
                </button>
              </span>
            )}
          </td>
        </tr>
      </tfoot>
    </BloqueTabla>
  );
}

function InformeConsolidado({ datos, nombreGrupo }) {
  return (
    <>
      <BloqueTabla id="titulo-informe-consolidado" titulo={`Pedidos por ${nombreGrupo.toLowerCase()}`}>
        <thead>
          <tr>
            <th scope="col" className={TH}>{nombreGrupo}</th>
            <th scope="col" className={`${TH} text-right`}>Pedidos</th>
            <th scope="col" className={`${TH} text-right`}>Unidades</th>
            <th scope="col" className={`${TH} text-right`}>Total</th>
            <th scope="col" className={`${TH} text-right`}>% del total</th>
          </tr>
        </thead>
        <tbody>
          {datos.filas.map((f) => (
            <tr key={f.clave} className={FILA}>
              <th scope="row" className={`${TD} text-left font-semibold text-tinta`}>{f.etiqueta}</th>
              <td className={TD_NUMERO}>{cifra(f.pedidos)}</td>
              <td className={TD_NUMERO}>{cifra(f.unidades)}</td>
              <td className={`${TD_NUMERO} font-semibold text-tinta`}>{pesos(f.total)}</td>
              <td className={TD_NUMERO}>{f.porcentaje.toLocaleString('es-CO')} %</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className={`${TF} text-left`}>Total general</th>
            <td className={`${TF} text-right tabular-nums`}>{cifra(datos.totales.pedidos)}</td>
            <td className={`${TF} text-right tabular-nums`}>{cifra(datos.totales.unidades)}</td>
            <td className={`${TF} whitespace-nowrap text-right tabular-nums`}>{pesos(datos.totales.total)}</td>
            <td className={`${TF} text-right tabular-nums`}>100 %</td>
          </tr>
        </tfoot>
      </BloqueTabla>
      {datos.agrupar === 'categoria' && (
        <p className="text-sm text-tinta-suave">Un pedido con productos de varias categorías aparece en cada una, pero cuenta una sola vez en el total general.</p>
      )}
    </>
  );
}

function InformeGrafico({ datos, nombreGrupo }) {
  const titulo = `Total de pedidos por ${nombreGrupo.toLowerCase()}`;
  const barras = datos.filas.map((f) => ({
    etiqueta: f.etiqueta,
    valor: f.total,
    detalle: contar(f.pedidos, 'pedido', 'pedidos'),
  }));
  // Las columnas solo se leen bien hasta 12 meses; lo demás va en barras horizontales.
  const enColumnas = datos.agrupar === 'mes' && barras.length <= 12;

  return (
    <section aria-labelledby="titulo-informe-grafico" className="rounded-3xl border border-borde bg-crema-claro px-6 pb-6 pt-5">
      {enColumnas ? (
        <GraficaBarras titulo={titulo} datos={barras} nombreValor="Total" />
      ) : (
        <>
          <h2 id="titulo-informe-grafico" className="mb-4 font-titulos text-[21px] font-semibold text-tinta-titulo">{titulo}</h2>
          <BarrasHorizontales datos={barras} />
        </>
      )}
    </section>
  );
}

// Informes de pedidos que pide el curso: tabular, consolidado y gráfico.
export default function Informes() {
  const [vista, setVista] = useState('tabular');
  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return fechaIso(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1));
  });
  const [hasta, setHasta] = useState(() => fechaIso(new Date()));
  const [estadoPedido, setEstadoPedido] = useState('completado');
  const [agrupar, setAgrupar] = useState('mes');
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState(null);
  const [carga, setCarga] = useState('cargando');
  const [error, setError] = useState('');

  const tipo = vista === 'tabular' ? 'tabular' : 'consolidado';

  useEffect(() => {
    let vigente = true;
    const consulta = new URLSearchParams();
    if (desde) consulta.set('desde', desde);
    if (hasta) consulta.set('hasta', hasta);
    if (estadoPedido) consulta.set('estado', estadoPedido);
    if (tipo === 'tabular') consulta.set('pagina', pagina);
    else consulta.set('agrupar', agrupar);

    setCarga('cargando');
    api(`/reportes/pedidos/${tipo}/?${consulta}`)
      .then((respuesta) => {
        if (!vigente) return;
        setDatos({ ...respuesta, tipo });
        setCarga('listo');
      })
      .catch((e) => {
        if (!vigente) return;
        setError(e.message);
        setCarga('error');
      });
    return () => {
      vigente = false;
    };
  }, [tipo, desde, hasta, estadoPedido, agrupar, pagina, intento]);

  function alCambiarFiltro(cambiar) {
    return (evento) => {
      cambiar(evento.target.value);
      setPagina(1);
    };
  }

  const listos = datos?.tipo === tipo ? datos : null;
  const conectado = datos?.conexion.sistemas.length > 1;
  const opcionesGrupo = AGRUPACIONES.filter((a) => !a.soloConectado || conectado);
  const nombreGrupo = AGRUPACIONES.find((a) => a.valor === agrupar).texto;

  return (
    <>
      <Encabezado
        antetitulo={listos ? `Del ${formatoFecha(`${listos.desde}T12:00:00`)} al ${formatoFecha(`${listos.hasta}T12:00:00`)}` : 'Informes'}
        titulo="Informes de pedidos"
      />

      <div role="group" aria-label="Tipo de informe" className="inline-flex self-start rounded-full border border-borde-input bg-white p-1">
        {VISTAS.map((v) => (
          <button
            key={v.valor}
            type="button"
            aria-pressed={v.valor === vista}
            onClick={() => setVista(v.valor)}
            className={`h-9 rounded-full px-5 text-sm font-semibold transition-colors ${v.valor === vista ? 'bg-verde text-white' : 'text-tinta-media hover:text-verde'}`}
          >
            {v.texto}
          </button>
        ))}
      </div>

      <section aria-label="Filtros del informe" className="flex flex-wrap items-end gap-3">
        <Filtro etiqueta="Desde">
          <input type="date" value={desde} max={hasta || undefined} onChange={alCambiarFiltro(setDesde)} className={CAMPO} />
        </Filtro>
        <Filtro etiqueta="Hasta">
          <input type="date" value={hasta} min={desde || undefined} onChange={alCambiarFiltro(setHasta)} className={CAMPO} />
        </Filtro>
        <Filtro etiqueta="Estado">
          <select value={estadoPedido} onChange={alCambiarFiltro(setEstadoPedido)} className={CAMPO}>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>{e.texto}</option>
            ))}
          </select>
        </Filtro>
        {tipo === 'consolidado' && (
          <Filtro etiqueta="Agrupar por">
            <select value={agrupar} onChange={alCambiarFiltro(setAgrupar)} className={CAMPO}>
              {opcionesGrupo.map((a) => (
                <option key={a.valor} value={a.valor}>{a.texto}</option>
              ))}
            </select>
          </Filtro>
        )}
      </section>

      {carga === 'error' && (
        <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center">
          <p className="text-tinta-media">{error || 'No se pudo cargar el informe.'}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)} className="mt-3 text-sm font-semibold text-verde hover:text-verde-hover">
            Reintentar
          </button>
        </section>
      )}

      {carga !== 'error' && listos && (
        <div aria-busy={carga === 'cargando'} className={`flex flex-col gap-4 transition-opacity ${carga === 'cargando' ? 'opacity-60' : ''}`}>
          <AvisoConexion conexion={listos.conexion} />
          {listos.totales.pedidos === 0 ? (
            <section className="rounded-3xl border border-borde bg-crema-claro px-8 py-10 text-center text-tinta-suave">
              No hay pedidos con esos filtros.
            </section>
          ) : (
            <>
              {vista === 'tabular' && <InformeTabular datos={listos} onPagina={setPagina} />}
              {vista === 'consolidado' && <InformeConsolidado datos={listos} nombreGrupo={nombreGrupo} />}
              {vista === 'grafico' && <InformeGrafico datos={listos} nombreGrupo={nombreGrupo} />}
            </>
          )}
        </div>
      )}
    </>
  );
}
