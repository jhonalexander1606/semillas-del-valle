import { Navigate, Route, Routes } from 'react-router-dom';

import LayoutPanel from './componentes/LayoutPanel.jsx';
import PantallaCarga from './componentes/PantallaCarga.jsx';
import CategoriasMarcas from './paginas/admin/CategoriasMarcas.jsx';
import Informes from './paginas/admin/Informes.jsx';
import InicioAdmin from './paginas/admin/InicioAdmin.jsx';
import Pedidos from './paginas/admin/Pedidos.jsx';
import Productos from './paginas/admin/Productos.jsx';
import Reportes from './paginas/admin/Reportes.jsx';
import Usuarios from './paginas/admin/Usuarios.jsx';
import Carrito from './paginas/cliente/Carrito.jsx';
import Catalogo from './paginas/cliente/Catalogo.jsx';
import InicioCliente from './paginas/cliente/InicioCliente.jsx';
import MisPedidos from './paginas/cliente/MisPedidos.jsx';
import Login from './paginas/Login.jsx';
import Registro from './paginas/Registro.jsx';
import RutaProtegida from './sesion/RutaProtegida.jsx';
import { rutaInicio } from './sesion/rutas.js';
import { useSesion } from './sesion/SesionContext.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route
        path="/admin"
        element={
          <RutaProtegida rol="admin">
            <LayoutPanel rol="admin" />
          </RutaProtegida>
        }
      >
        <Route index element={<InicioAdmin />} />
        <Route path="productos" element={<Productos />} />
        <Route path="categorias" element={<CategoriasMarcas />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="informes" element={<Informes />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route
        path="/cliente"
        element={
          <RutaProtegida rol="cliente">
            <LayoutPanel rol="cliente" />
          </RutaProtegida>
        }
      >
        <Route index element={<InicioCliente />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="pedidos" element={<MisPedidos />} />
      </Route>

      <Route path="*" element={<RedirigirInicio />} />
    </Routes>
  );
}

function RedirigirInicio() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <PantallaCarga />;
  return <Navigate to={usuario ? rutaInicio(usuario.rol) : '/login'} replace />;
}
