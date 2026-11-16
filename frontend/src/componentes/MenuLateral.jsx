import { NavLink, useNavigate } from 'react-router-dom';

import { useCarrito } from '../sesion/CarritoContext.jsx';
import { useSesion } from '../sesion/SesionContext.jsx';
import Icono from './Icono.jsx';

// Un enlace por caso de uso de cada actor.
const MENUS = {
  admin: [
    { ruta: '/admin', texto: 'Inicio', icono: 'inicio', exacta: true },
    { ruta: '/admin/productos', texto: 'Productos', icono: 'caja' },
    { ruta: '/admin/categorias', texto: 'Categorías y marcas', icono: 'etiqueta' },
    { ruta: '/admin/pedidos', texto: 'Pedidos', icono: 'lista' },
    { ruta: '/admin/reportes', texto: 'Reportes', icono: 'grafica' },
    { ruta: '/admin/informes', texto: 'Informes', icono: 'calendario' },
    { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'usuarios' },
  ],
  cliente: [
    { ruta: '/cliente', texto: 'Inicio', icono: 'inicio', exacta: true },
    { ruta: '/cliente/catalogo', texto: 'Catálogo', icono: 'brote' },
    { ruta: '/cliente/carrito', texto: 'Carrito', icono: 'carrito', contador: true },
    { ruta: '/cliente/pedidos', texto: 'Mis pedidos', icono: 'bolsa' },
  ],
};

const CLASE_ENLACE =
  'flex h-[46px] w-full items-center gap-3 whitespace-nowrap rounded-xl px-3.5 text-[15px] transition-colors max-md:h-10 max-md:px-3 max-md:text-sm';
const CLASE_INACTIVO = 'font-medium text-menu hover:bg-white/10 hover:text-white';

function ContadorCarrito() {
  const carrito = useCarrito();
  const unidades = carrito?.carrito.unidades ?? 0;
  if (!unidades) return null;
  return (
    <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-naranja px-1.5 text-xs font-bold text-white max-md:ml-0">
      {unidades}
      <span className="sr-only"> productos en el carrito</span>
    </span>
  );
}

export default function MenuLateral({ rol }) {
  const { cerrarSesion } = useSesion();
  const navegar = useNavigate();

  function salir() {
    cerrarSesion();
    navegar(`/login?rol=${rol}`, { replace: true });
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="z-30 bg-verde text-white max-md:sticky max-md:top-0 md:sticky md:top-0 md:flex md:h-screen md:w-[252px] md:shrink-0 md:flex-col md:gap-8 md:px-4 md:pb-6 md:pt-7"
    >
      <div className="flex items-center gap-3 px-4 pb-2 pt-3 md:px-1.5 md:py-0">
        <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[13px] bg-white/12 text-crema max-md:size-9">
          <Icono nombre="brote" className="size-6 max-md:size-5" />
        </span>
        <span className="font-titulos text-lg font-semibold leading-tight">Semillas del Valle</span>
        <button
          type="button"
          onClick={salir}
          aria-label="Cerrar sesión"
          className="ml-auto flex size-10 items-center justify-center rounded-xl text-menu hover:bg-white/10 hover:text-white md:hidden"
        >
          <Icono nombre="salir" />
        </button>
      </div>

      <div className="md:flex-1">
        <p id="titulo-menu" className="px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#D9E6DD] max-md:sr-only">
          Menú
        </p>
        <ul aria-labelledby="titulo-menu" className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-2 md:flex-col md:overflow-visible md:p-0">
          {MENUS[rol].map((item) => (
            <li key={item.ruta} className="shrink-0">
              <NavLink
                to={item.ruta}
                end={item.exacta}
                className={({ isActive }) =>
                  `${CLASE_ENLACE} ${isActive ? 'bg-crema font-semibold text-verde' : CLASE_INACTIVO}`
                }
              >
                <Icono nombre={item.icono} />
                {item.texto}
                {item.contador && <ContadorCarrito />}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={salir} className={`${CLASE_ENLACE} ${CLASE_INACTIVO} mt-auto max-md:hidden`}>
        <Icono nombre="salir" />
        Cerrar sesión
      </button>
    </nav>
  );
}
