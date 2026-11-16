import { Navigate } from 'react-router-dom';

import PantallaCarga from '../componentes/PantallaCarga.jsx';
import { rutaInicio } from './rutas.js';
import { useSesion } from './SesionContext.jsx';

// Solo deja pasar a usuarios con sesión y con el rol indicado.
export default function RutaProtegida({ rol, children }) {
  const { usuario, cargando } = useSesion();

  if (cargando) return <PantallaCarga />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== rol) return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return children;
}
