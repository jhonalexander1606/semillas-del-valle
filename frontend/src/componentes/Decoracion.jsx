// Elementos gráficos de la marca: logo del brote y ramas del login.

export function Logo({ tamano = 30 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true">
      <path d="M6 21.5a6 4.5 0 0 1 12 0z" fill="#A9CDB7" />
      <path d="M12 17.2V10.8" fill="none" stroke="#2E6F4F" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13.6C12 9.7 9.3 7.3 5 7.3c0 3.9 2.7 6.3 7 6.3z" fill="#2E6F4F" />
      <path d="M12 11.2C12 7.6 14.5 5.2 18.6 5.2c0 3.6-2.5 6-6.6 6z" fill="#2E6F4F" />
    </svg>
  );
}

// [x, y, giro, escala] de cada hoja a lo largo del tallo
const HOJAS = [
  [68, 194, -150, 1],
  [67.5, 170, -28, 1],
  [67, 143, -152, 1],
  [68, 112, -32, 1],
  [70.6, 85, -145, 1],
  [75.4, 54, -38, 1],
  [80.7, 29, -140, 0.8],
];

const FORMA_HOJA = 'M0 0C9-10 26-12 38 0C26 12 9 10 0 0Z';

export function Rama({ className = '' }) {
  return (
    <svg
      viewBox="0 0 140 220"
      aria-hidden="true"
      fill="rgba(255,255,255,0.05)"
      stroke="rgba(255,255,255,0.38)"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none absolute ${className}`}
    >
      <path fill="none" d="M68 216C70 168 58 112 86 8" />
      {HOJAS.map(([x, y, giro, escala]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
          <path d={FORMA_HOJA} />
          <path fill="none" d="M3 0H34" />
        </g>
      ))}
      <path transform="translate(86 8) rotate(-70) scale(0.65)" d={FORMA_HOJA} />
    </svg>
  );
}

// Panel verde de presentación del login y del registro.
export function PanelMarca() {
  return (
    <section
      aria-label="Semillas del Valle"
      className="relative flex flex-[1_1_440px] flex-col justify-between gap-12 overflow-hidden bg-verde px-[clamp(24px,5vw,72px)] pb-12 pt-14 text-white"
    >
      <Rama className="-right-14 -top-20 h-[361px] w-[230px] rotate-[200deg]" />
      <Rama className="-bottom-[120px] right-12 h-[314px] w-[200px] -rotate-[16deg]" />

      <div className="relative flex items-center gap-3.5">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-crema">
          <Logo />
        </span>
        <span className="font-titulos text-[21px] font-semibold tracking-[-0.01em]">Semillas del Valle</span>
      </div>

      <div className="relative max-w-[420px]">
        <p className="font-titulos text-[30px] font-semibold leading-[1.15] tracking-[-0.01em]">
          Semillas de frutas, hortalizas y pastos de corte para tu cultivo.
        </p>
        <p className="mt-3 text-[15px] text-verde-texto">
          Aparta lo que necesitas en el carrito y confirma tu pedido cuando estés listo.
        </p>
      </div>

      <p className="relative text-[13px] text-verde-texto">© 2026 Semillas del Valle</p>
    </section>
  );
}
