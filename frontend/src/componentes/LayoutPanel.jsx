import { Outlet } from 'react-router-dom';

import { ProveedorCarrito } from '../sesion/CarritoContext.jsx';
import MenuLateral from './MenuLateral.jsx';

// Menú verde (a la izquierda en computador, arriba en celular) + contenido de la página actual.
export default function LayoutPanel({ rol }) {
  const panel = (
    <div className="min-h-screen md:flex">
      <MenuLateral rol={rol} />
      <main className="min-w-0 flex-1 px-[clamp(16px,3vw,40px)] pb-14 pt-6 md:pt-9">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
          <Outlet />
        </div>
      </main>
    </div>
  );

  return rol === 'cliente' ? <ProveedorCarrito>{panel}</ProveedorCarrito> : panel;
}
