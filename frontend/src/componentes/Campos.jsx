import { useState } from 'react';

import Icono from './Icono.jsx';

export const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function claseEntrada(error) {
  return [
    'h-[50px] w-full rounded-[14px] border bg-white px-4 text-[15px] text-tinta',
    'placeholder:text-[#77746B] focus:border-verde focus:outline-none focus:ring-3 focus:ring-verde/20',
    error ? 'border-error' : 'border-borde-input',
  ].join(' ');
}

// Etiqueta + control + texto de ayuda + mensaje de error, con los atributos de accesibilidad enlazados.
function Campo({ id, etiqueta, error, ayuda, className = '', children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold text-tinta-etiqueta">
        {etiqueta}
      </label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-[12.5px] text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function atributosAccesibles(id, error, ayuda) {
  const descripciones = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ');
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': descripciones || undefined,
  };
}

export function CampoTexto({ id, etiqueta, error, ayuda, className, ref, ...props }) {
  return (
    <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
      <input ref={ref} id={id} className={claseEntrada(error)} {...atributosAccesibles(id, error, ayuda)} {...props} />
    </Campo>
  );
}

export function CampoClave({ id, etiqueta, error, ayuda, className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`${claseEntrada(error)} pr-[52px]`}
          {...atributosAccesibles(id, error, ayuda)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="absolute right-[3px] top-[3px] flex size-11 items-center justify-center rounded-xl text-gris hover:bg-crema"
        >
          <Icono nombre={visible ? 'ojoTachado' : 'ojo'} />
        </button>
      </div>
    </Campo>
  );
}

export function CampoSelect({ id, etiqueta, error, ayuda, className, children, ...props }) {
  return (
    <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
      <select id={id} className={`${claseEntrada(error)} appearance-auto pr-3`} {...atributosAccesibles(id, error, ayuda)} {...props}>
        {children}
      </select>
    </Campo>
  );
}

// Botones redondos para sumar o restar unidades.
export function Contador({ valor, minimo = 0, maximo, onCambiar, etiqueta, ocupado = false }) {
  const boton =
    'flex size-9 items-center justify-center rounded-full border border-borde-input bg-white text-tinta-media hover:bg-crema disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex items-center gap-2">
      <button
        type="button"
        className={boton}
        onClick={() => onCambiar(valor - 1)}
        disabled={ocupado || valor <= minimo}
        aria-label="Quitar una unidad"
      >
        <Icono nombre="menos" className="size-4" />
      </button>
      <span className="min-w-7 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className={boton}
        onClick={() => onCambiar(valor + 1)}
        disabled={ocupado || (maximo !== undefined && valor >= maximo)}
        aria-label="Agregar una unidad"
      >
        <Icono nombre="mas" className="size-4" />
      </button>
    </div>
  );
}

export function AvisoError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-error/25 bg-error-fondo px-4 py-3 text-sm text-error">
      {children}
    </p>
  );
}
