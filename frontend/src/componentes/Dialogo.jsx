import { useEffect, useRef } from 'react';

import { AvisoError } from './Campos.jsx';

// Ventana para confirmar acciones que no se pueden deshacer (cancelar un pedido, eliminar un producto).
export default function Dialogo({
  abierto,
  titulo,
  children,
  textoConfirmar,
  textoCancelar = 'Volver',
  peligro = false,
  ocupado = false,
  error,
  onConfirmar,
  onCerrar,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="titulo-dialogo"
      onCancel={(evento) => {
        evento.preventDefault();
        if (!ocupado) onCerrar();
      }}
      className="m-auto w-[min(460px,calc(100vw-32px))] rounded-3xl border border-borde bg-crema-claro p-0 text-tinta shadow-[0_24px_60px_rgba(34,37,31,0.25)]"
    >
      {abierto && (
        <div className="px-7 pb-6 pt-7">
          <h2 id="titulo-dialogo" className="font-titulos text-[23px] font-semibold leading-tight text-tinta-titulo">
            {titulo}
          </h2>
          <div className="mt-3 text-[15px] text-tinta-media">{children}</div>
          <div className="mt-4">
            <AvisoError>{error}</AvisoError>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={ocupado}
              className="h-11 rounded-full border border-borde-input bg-white px-5 text-[15px] font-semibold text-tinta-media hover:bg-crema disabled:opacity-60"
            >
              {textoCancelar}
            </button>
            {onConfirmar && (
              <button
                type="button"
                onClick={onConfirmar}
                disabled={ocupado}
                className={`h-11 rounded-full px-5 text-[15px] font-semibold text-white disabled:opacity-60 ${
                  peligro ? 'bg-error hover:bg-[#8A2F0B]' : 'bg-verde hover:bg-verde-oscuro'
                }`}
              >
                {ocupado ? 'Un momento…' : textoConfirmar}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
