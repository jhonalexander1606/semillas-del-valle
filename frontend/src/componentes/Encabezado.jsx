import { useSesion } from '../sesion/SesionContext.jsx';

export function iniciales({ nombre = '', apellido = '' }) {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || '?';
}

// Título de la página, acciones opcionales (children) y la ficha del usuario con sesión.
export default function Encabezado({ antetitulo, titulo, children }) {
  const { usuario } = useSesion();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="min-h-[21px] text-sm text-tinta-suave">{antetitulo}</p>
        <h1 className="mt-1 font-titulos text-[34px] font-semibold leading-tight tracking-[-0.015em] text-tinta-titulo">
          {titulo}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <div className="flex items-center gap-2.5 rounded-full border border-borde bg-crema-claro py-1 pl-1 pr-4 text-sm font-semibold max-sm:hidden">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-verde text-[11px] font-bold tracking-[0.04em] text-white"
          >
            {iniciales(usuario)}
          </span>
          {usuario.nombre} {usuario.apellido}
        </div>
      </div>
    </header>
  );
}
