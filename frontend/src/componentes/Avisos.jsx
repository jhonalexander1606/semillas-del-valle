import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import Icono from './Icono.jsx';

// Avisos cortos que aparecen abajo y se van solos ("Tomate chonto quedó en tu carrito").
const AvisosContext = createContext(() => {});

export function ProveedorAvisos({ children }) {
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const avisar = useCallback((texto, { enlace, tono = 'ok' } = {}) => {
    clearTimeout(temporizador.current);
    setAviso({ texto, enlace, tono, id: Date.now() });
    temporizador.current = setTimeout(() => setAviso(null), 5000);
  }, []);

  const valor = useMemo(() => avisar, [avisar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 max-md:bottom-24">
        {aviso && (
          <p
            key={aviso.id}
            className={`aviso-flotante pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-2xl px-5 py-3.5 text-sm shadow-[0_14px_34px_rgba(34,37,31,0.22)] ${
              aviso.tono === 'error' ? 'bg-error text-white' : 'bg-tinta text-crema-claro'
            }`}
          >
            <Icono nombre={aviso.tono === 'error' ? 'alerta' : 'check'} className="size-[18px] shrink-0" />
            <span>{aviso.texto}</span>
            {aviso.enlace && (
              <Link to={aviso.enlace.ruta} className="ml-1 shrink-0 font-semibold text-[#B9DDC6] underline underline-offset-4 hover:text-white">
                {aviso.enlace.texto}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Cerrar aviso"
              className="-mr-1 ml-1 rounded-lg p-1 opacity-70 hover:opacity-100"
            >
              <Icono nombre="cerrar" className="size-4" />
            </button>
          </p>
        )}
      </div>
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  return useContext(AvisosContext);
}
