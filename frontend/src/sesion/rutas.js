export function rutaInicio(rol) {
  return rol === 'admin' ? '/admin' : '/cliente';
}
