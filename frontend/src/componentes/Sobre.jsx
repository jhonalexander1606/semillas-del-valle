// El "sobre de semillas": así se ve cada producto del catálogo.
// Cada categoría tiene su color y su ilustración.

import { pesos } from '../utilidades/formato.js';

const ESTILOS = {
  fruta: { tipo: 'fruta', fondo: '#F6DDC6', tinta: '#7E3712', acento: '#D9762B' },
  hortaliza: { tipo: 'hortaliza', fondo: '#D8E7D2', tinta: '#22513A', acento: '#3E8159' },
  pasto: { tipo: 'pasto', fondo: '#ECE2B6', tinta: '#5A4A0D', acento: '#9C8120' },
  otros: { tipo: 'otros', fondo: '#E8DED1', tinta: '#57422F', acento: '#9A7454' },
};

const sinTildes = (texto = '') => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function estiloCategoria(nombre) {
  const clave = sinTildes(nombre);
  if (clave.startsWith('fruta')) return ESTILOS.fruta;
  if (clave.startsWith('hortaliza') || clave.includes('verdura')) return ESTILOS.hortaliza;
  if (clave.includes('pasto') || clave.includes('forraje')) return ESTILOS.pasto;
  return ESTILOS.otros;
}

const HOJA = '#3F7A4E';

export function Ilustracion({ estilo, className = '' }) {
  const { tipo, acento, tinta } = estilo;
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className={className}>
      <ellipse cx="60" cy="71" rx="24" ry="3.5" fill={tinta} opacity="0.16" />
      {tipo === 'fruta' && (
        <>
          <circle cx="60" cy="47" r="21" fill={acento} />
          <path d="M47 41a14 14 0 0 1 9-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          <path d="M60 26c0-5 1.5-8.5 4.5-11" fill="none" stroke={tinta} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M64 16c6-4.5 13.5-3.5 16.5 1-5.5 4.5-13 4.2-16.5-1z" fill={HOJA} />
        </>
      )}
      {tipo === 'hortaliza' && (
        <>
          <path d="M60 68V40" stroke={tinta} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M60 50c-13 0-21-8.5-21-21 13 0 21 8.5 21 21z" fill={acento} />
          <path d="M60 42c0-12.5 8.5-21 21-21 0 12.5-8.5 21-21 21z" fill={acento} opacity="0.78" />
          <path d="M60 50c-6.5-6.5-10-12-11-19" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          <path d="M60 42c4-6 8.5-10.5 15-14" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
        </>
      )}
      {tipo === 'pasto' && (
        <>
          <path d="M44 69c1-13-1.5-24-9-35 9.5 8 13.5 20 13.5 35z" fill={acento} opacity="0.75" />
          <path d="M53 69c-1-17 1-31 8-45-3.5 15-3 29-2.5 45z" fill={acento} />
          <path d="M61 69c1.5-15 6-27 15-37-6 11.5-9 24-9.5 37z" fill={acento} opacity="0.85" />
          <path d="M70 69c2-10 6.5-17.5 14.5-23-6 7-9 14-10 23z" fill={acento} opacity="0.65" />
          <path d="M58.5 24.5c2-4 5-6 8.5-7" fill="none" stroke={tinta} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {tipo === 'otros' && (
        <>
          <path d="M44 47h32l-4.5 21h-23z" fill={acento} />
          <rect x="41" y="40.5" width="38" height="8" rx="2.5" fill={tinta} />
          <path d="M60 40.5V28" stroke={HOJA} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M60 33c-7 0-11.5-4.5-11.5-11.5 7 0 11.5 4.5 11.5 11.5z" fill={HOJA} />
          <path d="M60 30c0-5.5 3.5-9 9-9 0 5.5-3.5 9-9 9z" fill={HOJA} opacity="0.8" />
        </>
      )}
    </svg>
  );
}

function AvisoStock({ producto, estilo }) {
  if (producto.estado_stock === 'agotado') {
    return (
      <span className="absolute left-3 top-4 rounded-full bg-tinta px-2.5 py-0.5 text-xs font-semibold text-crema-claro">
        Agotado
      </span>
    );
  }
  if (producto.estado_stock === 'bajo') {
    return (
      <span
        className="absolute left-3 top-4 rounded-full bg-crema-claro/85 px-2.5 py-0.5 text-xs font-semibold"
        style={{ color: estilo.tinta }}
      >
        Quedan {producto.stock_disponible}
      </span>
    );
  }
  return null;
}

// `accion` va abajo a la derecha (botón de agregar, alternativas...).
// `nota` va debajo de la marca (por ejemplo, cuántas unidades ya hay en el carrito): así el precio
// y el botón quedan a la misma altura en todas las tarjetas de una fila.
export default function Sobre({ producto, accion, nota }) {
  const estilo = estiloCategoria(producto.categoria_nombre);
  const agotado = producto.estado_stock === 'agotado';

  return (
    <article className="sobre flex flex-col" aria-label={`${producto.nombre} ${producto.presentacion}`}>
      <div className="relative h-[124px] shrink-0" style={{ backgroundColor: estilo.fondo }}>
        <Ilustracion estilo={estilo} className={`absolute inset-x-0 bottom-1 mx-auto h-[92px] ${agotado ? 'opacity-45 grayscale' : ''}`} />
        <span className="absolute right-3 top-4 text-[13px] font-semibold" style={{ color: estilo.tinta }}>
          {producto.presentacion}
        </span>
        <AvisoStock producto={producto} estilo={estilo} />
      </div>
      <div className="flex flex-1 flex-col rounded-b-[18px] border border-t-0 border-borde bg-crema-claro px-4 pb-4 pt-3.5">
        <p className="text-[12.5px] font-semibold" style={{ color: estilo.tinta }}>
          {producto.categoria_nombre}
        </p>
        <h3 className="mt-0.5 font-titulos text-[19px] font-semibold leading-snug text-tinta-titulo">{producto.nombre}</h3>
        <p className="text-[13px] text-tinta-suave">{producto.marca_nombre}</p>
        {nota}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-4">
          <span className="text-[17px] font-semibold tabular-nums text-tinta">{pesos(producto.precio_unitario)}</span>
          {accion}
        </div>
      </div>
    </article>
  );
}
