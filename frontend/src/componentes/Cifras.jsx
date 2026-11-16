import Icono from './Icono.jsx';

// Variación frente a otro período: "+12,4 % frente a ayer". Subir es bueno (más ventas).
export function Variacion({ valor, frente, claro = false }) {
  if (valor === null || valor === undefined) {
    return <span className={claro ? 'text-verde-texto' : 'text-tinta-suave'}>Sin datos {frente}</span>;
  }
  const sube = valor >= 0;
  const color = claro ? (sube ? 'text-[#B9E4C9]' : 'text-[#FFD2BF]') : sube ? 'text-verde' : 'text-error';
  const texto = `${sube ? '+' : '−'}${Math.abs(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${color}`}>
      <Icono nombre="chevron" className={`size-4 ${sube ? '-rotate-90' : 'rotate-90'}`} />
      {texto}
      <span className={`font-normal ${claro ? 'text-verde-texto' : 'text-tinta-suave'}`}>{frente}</span>
    </span>
  );
}

// Cifra con su etiqueta. Las cifras grandes usan números proporcionales (sin tabular-nums).
export function Cifra({ etiqueta, valor, detalle, claro = false }) {
  return (
    <div>
      <p className={`text-[13px] ${claro ? 'text-verde-texto' : 'text-tinta-suave'}`}>{etiqueta}</p>
      <p className={`mt-0.5 text-[24px] font-semibold leading-tight ${claro ? 'text-white' : 'text-tinta'}`}>{valor}</p>
      {detalle && <p className={`text-[13px] ${claro ? 'text-verde-texto' : 'text-tinta-suave'}`}>{detalle}</p>}
    </div>
  );
}
