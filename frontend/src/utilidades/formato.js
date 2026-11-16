const sinPuntos = (texto) => texto.replace(/\./g, '');
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

// "Miércoles, 7 de octubre"
export function fechaDeHoy() {
  return capitalizar(new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }));
}

// "2026-10-06T14:30:00Z" → "6 de oct de 2026"
export function formatoFecha(iso) {
  return sinPuntos(new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }));
}

// "2026-12-05" (fecha sin hora) → "5 de dic de 2026", sin correrse un día por la zona horaria
export function formatoDia(isoDia) {
  if (!isoDia) return '—';
  const [anio, mes, dia] = isoDia.split('-').map(Number);
  return formatoFecha(new Date(anio, mes - 1, dia).toISOString());
}

// "2026-10-26T16:40:00-05:00" → "26 oct, 4:40 p. m."
export function fechaHora(iso) {
  const fecha = new Date(iso);
  const dia = sinPuntos(fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }));
  const hora = fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return `${dia}, ${hora}`;
}

// 12500 → "$12.500"
export function pesos(valor) {
  return `$${numero.format(Number(valor) || 0)}`;
}

// 12500 → "12.500"
export function cifra(valor) {
  return numero.format(Number(valor) || 0);
}

// (3, 'unidad', 'unidades') → "3 unidades"
export function contar(n, singular, plural) {
  return `${cifra(n)} ${n === 1 ? singular : plural}`;
}

// Junta nombres: ["Tomate", "Lechuga", "Cilantro"] → "Tomate, Lechuga y Cilantro"
export function listaNombres(nombres, maximo = 3) {
  const unicos = [...new Set(nombres)];
  if (unicos.length <= 1) return unicos[0] ?? '';
  const visibles = unicos.slice(0, maximo);
  const resto = unicos.length - visibles.length;
  if (resto > 0) return `${visibles.join(', ')} y ${resto} más`;
  return `${visibles.slice(0, -1).join(', ')} y ${visibles.at(-1)}`;
}
