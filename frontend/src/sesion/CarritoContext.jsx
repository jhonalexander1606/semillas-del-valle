import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../api/cliente.js';

// El carrito del cliente es su pedido «En proceso». Se comparte entre el menú (el número
// de productos), el catálogo y la página del carrito.

const CarritoContext = createContext(null);

const VACIO = { id: null, detalles: [], unidades: 0, total: 0, reservado_hasta: null };

export function ProveedorCarrito({ children }) {
  const [carrito, setCarrito] = useState(VACIO);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const datos = await api('/carrito/');
    setCarrito(datos);
    return datos;
  }, []);

  useEffect(() => {
    recargar()
      .catch(() => setCarrito(VACIO))
      .finally(() => setCargando(false));
  }, [recargar]);

  const agregar = useCallback(async (producto, cantidad = 1) => {
    const datos = await api('/carrito/items/', { metodo: 'POST', cuerpo: { producto, cantidad } });
    setCarrito(datos);
    return datos;
  }, []);

  const cambiarCantidad = useCallback(async (producto, cantidad) => {
    const datos = await api(`/carrito/items/${producto}/`, { metodo: 'PATCH', cuerpo: { cantidad } });
    setCarrito(datos);
    return datos;
  }, []);

  const quitar = useCallback(async (producto) => {
    const datos = await api(`/carrito/items/${producto}/`, { metodo: 'DELETE' });
    setCarrito(datos);
    return datos;
  }, []);

  const confirmar = useCallback(async () => {
    const pedido = await api('/carrito/confirmar/', { metodo: 'POST' });
    setCarrito(VACIO);
    return pedido;
  }, []);

  const cancelar = useCallback(async () => {
    const pedido = await api('/carrito/cancelar/', { metodo: 'POST' });
    setCarrito(VACIO);
    return pedido;
  }, []);

  // Cuántas unidades de un producto ya hay en el carrito.
  const unidadesDe = useCallback(
    (productoId) => carrito.detalles.find((d) => d.producto === productoId)?.cantidad ?? 0,
    [carrito],
  );

  const valor = useMemo(
    () => ({ carrito, cargando, recargar, agregar, cambiarCantidad, quitar, confirmar, cancelar, unidadesDe }),
    [carrito, cargando, recargar, agregar, cambiarCantidad, quitar, confirmar, cancelar, unidadesDe],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  return useContext(CarritoContext);
}
