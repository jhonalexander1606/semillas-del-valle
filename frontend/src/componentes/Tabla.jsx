import { Link } from 'react-router-dom';

// Bloque blanco con título, enlace opcional y una tabla que se desplaza si no cabe.
export function BloqueTabla({ id, titulo, enlace, children }) {
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-3xl border border-borde bg-crema-claro shadow-[0_6px_20px_rgba(60,48,20,0.06)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-[22px]">
        <h2 id={id} className="font-titulos text-[22px] font-semibold text-tinta-titulo">
          {titulo}
        </h2>
        {enlace && (
          <Link to={enlace.ruta} className="text-sm font-semibold text-verde hover:text-verde-hover">
            {enlace.texto}
          </Link>
        )}
      </div>
      <div role="region" aria-labelledby={id} tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">{children}</table>
      </div>
    </section>
  );
}

export const TH =
  'whitespace-nowrap bg-crema-oscuro px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gris first:pl-6 last:pr-6';
export const TD = 'border-t border-linea px-4 py-3.5 align-middle text-tinta-media first:pl-6 last:pr-6';
export const FILA = 'hover:bg-[#FBF8F1]';

const TONOS = {
  verde: 'bg-[#DDEFE3] text-[#1F5A3D] before:bg-[#2E8A5B]',
  marca: 'bg-verde-suave text-[#245A40] before:bg-verde',
  azul: 'bg-[#DCE7F4] text-[#234B78] before:bg-[#3B6FB0]',
  naranja: 'bg-naranja-fondo text-naranja-texto before:bg-naranja-punto',
  rojo: 'bg-error-fondo text-error before:bg-error',
  neutro: 'bg-[#ECE7DC] text-[#55503F] before:bg-[#8C8573]',
};

const TONO_POR_TEXTO = {
  Activo: 'verde',
  Inactivo: 'neutro',
  Administrador: 'marca',
  Cliente: 'azul',
  // Estados del pedido
  'En proceso': 'naranja',
  Completado: 'verde',
  Cancelado: 'neutro',
  // Stock
  Agotado: 'rojo',
  'Stock bajo': 'naranja',
  'Por vencer': 'naranja',
};

// Etiqueta redondeada con un punto de color (rol, estado...).
export function Etiqueta({ texto, tono }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold before:size-1.5 before:rounded-full ${TONOS[tono || TONO_POR_TEXTO[texto] || 'neutro']}`}
    >
      {texto}
    </span>
  );
}
