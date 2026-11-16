import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Fuentes incluidas en el proyecto: la app se ve igual con o sin internet.
import '@fontsource-variable/dm-sans/opsz.css';
import '@fontsource-variable/fraunces/opsz.css';

import App from './App.jsx';
import { ProveedorAvisos } from './componentes/Avisos.jsx';
import { ProveedorSesion } from './sesion/SesionContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorAvisos>
          <App />
        </ProveedorAvisos>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
