import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente.js';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import { estiloCategoria, Ilustracion } from '../../componentes/Sobre.jsx';
import { Etiqueta } from '../../componentes/Tabla.jsx';
import { useCarrito } from '../../sesion/CarritoContext.jsx';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { contar, fechaDeHoy, fechaHora, listaNombres, pesos } from '../../utilidades/formato.js';

const BOTON_PRINCIPAL =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-crema px-6 text-[15px] font-semibold text-verde transition-colors hover:bg-white';
const BOTON_CLARO =
  'inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-[15px] font-semibold text-white hover:bg-white/10';

export default function InicioCliente() {
  const { usuario } = useSesion();
  const { carrito } = useCarrito();
  const [categorias, setCategorias] = useState([]);
  const [ultimo, setUltimo] = useState(undefined); // undefined: cargando, null: no tiene

  useEffect(() => {
    api('/categorias/').then(setCategorias).catch(() => {});
    api('/pedidos/?limite=5')
      .then((lista) => setUltimo(lista.find((p) => p.estado !== 1) ?? null))
      .catch(() => setUltimo(null));
  }, []);

  const tieneCarrito = carrito.unidades > 0;

  return (
    <>
      <Encabezado antetitulo={fechaDeHoy()} titulo={`Hola, ${usuario.nombre}`} />

      <section
        aria-labelledby="titulo-carrito"
        className="relative overflow-hidden rounded-3xl bg-verde px-7 pb-7 pt-6 text-white shadow-[0_14px_34px_rgba(46,111,79,0.25)]"
      >
        <Icono nombre="brote" className="pointer-events-none absolute -bottom-6 -right-4 size-44 text-white/10" />
        <h2 id="titulo-carrito" className="relative font-titulos text-[26px] font-semibold leading-tight">
          {tieneCarrito
            ? `Tienes ${contar(carrito.unidades, 'producto apartado', 'productos apartados')}`
            : 'Tu carrito está vacío'}
        </h2>
        <p className="relative mt-1.5 max-w-[56ch] text-[15px] text-verde-texto">
          {tieneCarrito
            ? `Total: ${pesos(carrito.total)}. Están apartados para ti hasta el ${fechaHora(carrito.reservado_hasta)}`
            : 'Explora el catálogo: lo que agregues al carrito queda apartado mientras decides.'}
        </p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          {tieneCarrito ? (
            <>
              <Link to="/cliente/carrito" className={BOTON_PRINCIPAL}>
                <Icono nombre="carrito" className="size-5" />
                Ir al carrito
              </Link>
              <Link to="/cliente/catalogo" className={BOTON_CLARO}>
                Seguir comprando
              </Link>
            </>
          ) : (
            <Link to="/cliente/catalogo" className={BOTON_PRINCIPAL}>
              <Icono nombre="brote" className="size-5" />
              Ver catálogo
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-categorias">
        <h2 id="titulo-categorias" className="font-titulos text-[22px] font-semibold text-tinta-titulo">
          Comprar por categoría
        </h2>
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
          {categorias.map((categoria) => {
            const estilo = estiloCategoria(categoria.nombre);
            return (
              <li key={categoria.id}>
                <Link
                  to={`/cliente/catalogo?categoria=${categoria.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-borde bg-crema-claro p-3 pr-4 transition-colors hover:border-verde/40"
                >
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: estilo.fondo }}>
                    <Ilustracion estilo={estilo} className="h-12" />
                  </span>
                  <span>
                    <span className="block font-titulos text-[17px] font-semibold leading-snug text-tinta-titulo group-hover:text-verde">
                      {categoria.nombre}
                    </span>
                    <span className="text-[13px] text-tinta-suave">{contar(categoria.total_productos, 'producto', 'productos')}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="titulo-ultimo" className="rounded-3xl border border-borde bg-crema-claro px-6 pb-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-ultimo" className="font-titulos text-[22px] font-semibold text-tinta-titulo">
            Tu último pedido
          </h2>
          <Link to="/cliente/pedidos" className="text-sm font-semibold text-verde hover:text-verde-hover">
            Ver todos mis pedidos
          </Link>
        </div>
        {ultimo === undefined && <p className="mt-3 text-tinta-suave">Cargando…</p>}
        {ultimo === null && <p className="mt-3 text-tinta-suave">Todavía no has confirmado ningún pedido.</p>}
        {ultimo && (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-linea pt-4">
            <div>
              <p className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold tabular-nums">{ultimo.codigo}</span>
                <Etiqueta texto={ultimo.estado_nombre} />
              </p>
              <p className="mt-1 text-[15px] text-tinta-media">{listaNombres(ultimo.detalles.map((d) => d.nombre))}</p>
              <p className="text-[13px] text-tinta-suave">{fechaHora(ultimo.fecha)}</p>
            </div>
            <p className="font-titulos text-[26px] font-semibold tabular-nums text-tinta-titulo">{pesos(ultimo.total)}</p>
          </div>
        )}
      </section>
    </>
  );
}
