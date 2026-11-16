import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, borrarTokens, guardarTokens, leerTokens } from '../api/cliente.js';

const SesionContext = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Si hay tokens guardados, se consulta quién es el usuario antes de mostrar nada.
  const [cargando, setCargando] = useState(() => Boolean(leerTokens()));

  useEffect(() => {
    if (!leerTokens()) return;
    api('/auth/yo/')
      .then(setUsuario)
      .catch(() => borrarTokens())
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, []);

  const iniciarSesion = useCallback(async (email, password, rol) => {
    const datos = await api('/auth/login/', {
      metodo: 'POST',
      cuerpo: { email, password, rol },
      conSesion: false,
    });
    guardarTokens({ access: datos.access, refresh: datos.refresh });
    setUsuario(datos.usuario);
    return datos.usuario;
  }, []);

  // «Registrarse»: crea la cuenta de cliente y deja la sesión iniciada.
  const registrarse = useCallback(async (datos) => {
    const respuesta = await api('/auth/registro/', { metodo: 'POST', cuerpo: datos, conSesion: false });
    guardarTokens({ access: respuesta.access, refresh: respuesta.refresh });
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  const cerrarSesion = useCallback(() => {
    borrarTokens();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, registrarse, cerrarSesion }),
    [usuario, cargando, iniciarSesion, registrarse, cerrarSesion],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}
