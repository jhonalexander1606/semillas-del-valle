// Iconos de trazo (24×24). Uso: <Icono nombre="inicio" className="size-5" />
const TRAZOS = {
  brote: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 13.6C12 9.7 9.3 7.3 5 7.3c0 3.9 2.7 6.3 7 6.3z" />
      <path d="M12 11.2C12 7.6 14.5 5.2 18.6 5.2c0 3.6-2.5 6-6.6 6z" />
    </>
  ),
  inicio: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6" />
      <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.4c2 .8 3.2 2.9 3.5 5.6" />
    </>
  ),
  usuarioNuevo: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20c.6-3.6 3.2-6 6.5-6 1.6 0 3 .5 4.1 1.5" />
      <path d="M18 14v6M15 17h6" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8 20 3" />
      <path d="M17 6l2.5 2.5" />
      <path d="M14.5 8.5 16.5 10.5" />
    </>
  ),
  caja: (
    <>
      <path d="M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
      <path d="M7.8 5.3l8.4 4.5" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  salir: (
    <>
      <path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5" />
      <path d="m15.5 16.5 4.5-4.5-4.5-4.5" />
      <path d="M20 12H9.5" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  bolsa: (
    <>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </>
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  ojoTachado: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-2.9 3.7" />
      <path d="M6.6 6.9C3.9 8.7 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.5-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  carrito: (
    <>
      <path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.4" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17.5" cy="20" r="1.3" />
    </>
  ),
  lista: (
    <>
      <path d="M8 4h11v16H5V7z" />
      <path d="M8 4v3H5" />
      <path d="M9 11h6M9 14.5h6M9 18h3" />
    </>
  ),
  grafica: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  etiqueta: (
    <>
      <path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0z" />
      <circle cx="8.3" cy="8.3" r="1.4" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  basura: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
      <path d="M10.3 11v6M13.7 11v6" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 7.5 3 3" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2v.3" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  refrescar: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
};

export default function Icono({ nombre, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
