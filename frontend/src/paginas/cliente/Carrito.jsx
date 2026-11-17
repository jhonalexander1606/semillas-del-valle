import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAvisos } from '../../componentes/Avisos.jsx';
import { AvisoError, Contador } from '../../componentes/Campos.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import Encabezado from '../../componentes/Encabezado.jsx';
import Icono from '../../componentes/Icono.jsx';
import PantallaCarga from '../../componentes/PantallaCarga.jsx';
import { Miniatura } from '../../componentes/Sobre.jsx';
import { useCarrito } from '../../sesion/CarritoContext.jsx';
import { cifra, contar, fechaHora, pesos } from '../../utilidades/formato.js';

const BOTON_PRINCIPAL =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-verde px-6 text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(46,111,79,0.22)] transition-colors hover:bg-verde-oscuro disabled:opacity-60';
const BOTON_SECUNDARIO =
  'inline-flex h-12 items-center justify-center rounded-full border border-borde-input bg-white px-6 text-[15px] font-semibold text-tinta-media hover:bg-crema';

// «Visualizar carrito» → «Confirmar pedido» o «Cancelar pedido».
export default function Carrito() {
  const { carrito, cargando, cambiarCantidad, quitar, confirmar, cancelar } = useCarrito();
  const avisar = useAvisos();
  const [ocupado, setOcupado] = useState(null); // id del producto que se está cambiando
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [preguntaCancelar, setPreguntaCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmado, setConfirmado] = useState(null);

  if (cargando) return <PantallaCarga />;
  if (confirmado) return <PedidoConfirmado pedido={confirmado} />;

  async function cambiar(detalle, cantidad) {
    setOcupado(detalle.producto);
    try {
      await cambiarCantidad(detalle.producto, cantidad);
    } catch (error) {
      avisar(error.message, { tono: 'error' });
    } finally {
      setOcupado(null);
    }
  }

  async function quitarProducto(detalle) {
    setOcupado(detalle.producto);
    try {
      await quitar(detalle.producto);
      avisar(`Quitaste ${detalle.nombre} ${detalle.presentacion}. Las unidades vuelven a estar disponibles.`);
    } catch (error) {
      avisar(error.message, { tono: 'error' });
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarPedido() {
    setConfirmando(true);
    setErrorConfirmar('');
    try {
      setConfirmado(await confirmar());
    } catch (error) {
      setErrorConfirmar(error.message);
      setConfirmando(false);
    }
  }

  async function cancelarPedido() {
    setCancelando(true);
    try {
      await cancelar();
      setPreguntaCancelar(false);
      avisar('Cancelaste el pedido. Los productos vuelven a estar disponibles.');
    } catch (error) {
      avisar(error.message, { tono: 'error' });
    } finally {
      setCancelando(false);
    }
  }

  if (carrito.detalles.length === 0) {
    return (
      <>
        <Encabezado antetitulo="Sin productos apartados" titulo="Carrito" />
        <section className="flex flex-col items-center rounded-3xl border border-dashed border-borde bg-crema-claro px-8 py-14 text-center">
          <Miniatura categoria="Hortalizas" className="size-20 rounded-2xl" />
          <p className="mt-5 font-titulos text-2xl font-semibold text-tinta-titulo">Tu carrito está vacío</p>
          <p className="mt-2 max-w-[44ch] text-tinta-suave">
            Lo que agregues desde el catálogo queda apartado para ti mientras decides.
          </p>
          <Link to="/cliente/catalogo" className={`${BOTON_PRINCIPAL} mt-6`}>
            Ver catálogo
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <Encabezado antetitulo={`Apartado hasta el ${fechaHora(carrito.reservado_hasta)}`} titulo="Carrito" />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Productos del carrito" className="overflow-hidden rounded-3xl border border-borde bg-crema-claro">
          <ul className="divide-y divide-linea">
            {carrito.detalles.map((detalle) => (
              <li key={detalle.producto} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
                <Miniatura categoria={detalle.categoria} imagen={detalle.imagen_url} />
                <div className="min-w-[160px] flex-1">
                  <p className="font-titulos text-[18px] font-semibold leading-snug text-tinta-titulo">
                    {detalle.nombre}{' '}
                    <span className="ml-0.5 whitespace-nowrap rounded-full bg-crema px-2 py-0.5 align-middle font-texto text-xs font-semibold text-tinta-media">
                      {detalle.presentacion}
                    </span>
                  </p>
                  <p className="text-[13px] text-tinta-suave">{detalle.marca}</p>
                  <p className="text-[13px] text-tinta-suave tabular-nums">{pesos(detalle.precio_unitario)} cada uno</p>
                </div>
                <Contador
                  etiqueta={`Unidades de ${detalle.nombre}`}
                  valor={detalle.cantidad}
                  minimo={1}
                  maximo={detalle.cantidad + detalle.disponible}
                  ocupado={ocupado === detalle.producto}
                  onCambiar={(cantidad) => cambiar(detalle, cantidad)}
                />
                <p className="ml-auto w-[92px] text-right text-[16px] font-semibold tabular-nums text-tinta">{pesos(detalle.subtotal)}</p>
                <button
                  type="button"
                  onClick={() => quitarProducto(detalle)}
                  disabled={ocupado === detalle.producto}
                  aria-label={`Quitar ${detalle.nombre} ${detalle.presentacion} del carrito`}
                  className="flex size-10 items-center justify-center rounded-xl text-tinta-suave hover:bg-error-fondo hover:text-error disabled:opacity-50"
                >
                  <Icono nombre="basura" className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside
          aria-labelledby="titulo-resumen"
          className="rounded-3xl border border-borde bg-crema-claro px-6 pb-6 pt-5 shadow-[0_6px_20px_rgba(60,48,20,0.06)] lg:sticky lg:top-8"
        >
          <h2 id="titulo-resumen" className="font-titulos text-[22px] font-semibold text-tinta-titulo">
            Resumen
          </h2>
          <dl className="mt-4 flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between text-tinta-media">
              <dt>Productos</dt>
              <dd className="tabular-nums">{contar(carrito.unidades, 'unidad', 'unidades')}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-linea pt-3">
              <dt className="font-semibold text-tinta">Total</dt>
              <dd className="font-titulos text-[30px] font-semibold tabular-nums text-tinta-titulo">{pesos(carrito.total)}</dd>
            </div>
          </dl>

          <p className="mt-3 flex gap-2 rounded-2xl bg-verde-suave px-4 py-3 text-[13px] text-[#245A40]">
            <Icono nombre="reloj" className="mt-px size-4 shrink-0" />
            Los productos quedan apartados {horasDeReserva(carrito)} horas desde tu último cambio. Después se liberan para otros
            clientes.
          </p>

          <div className="mt-4">
            <AvisoError>{errorConfirmar}</AvisoError>
          </div>

          <button type="button" onClick={confirmarPedido} disabled={confirmando} className={`${BOTON_PRINCIPAL} mt-4 w-full`}>
            <Icono nombre="check" className="size-[18px]" />
            {confirmando ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <Link to="/cliente/catalogo" className="inline-flex min-h-11 items-center text-sm font-semibold text-verde hover:text-verde-hover">
              Agregar más productos
            </Link>
            <button
              type="button"
              onClick={() => setPreguntaCancelar(true)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-error hover:underline"
            >
              Cancelar pedido
            </button>
          </div>
        </aside>
      </div>

      <Dialogo
        abierto={preguntaCancelar}
        titulo="¿Cancelar el pedido?"
        textoConfirmar="Cancelar pedido"
        textoCancelar="Seguir con el pedido"
        peligro
        ocupado={cancelando}
        onConfirmar={cancelarPedido}
        onCerrar={() => setPreguntaCancelar(false)}
      >
        Se quitan los {contar(carrito.unidades, 'producto', 'productos')} del carrito y vuelven a estar disponibles para otros clientes.
      </Dialogo>
    </>
  );
}

function horasDeReserva(carrito) {
  return Math.round((new Date(carrito.reservado_hasta) - new Date(carrito.fecha)) / 36e5);
}

function PedidoConfirmado({ pedido }) {
  return (
    <>
      <Encabezado antetitulo={`Pedido ${pedido.codigo} del ${fechaHora(pedido.fecha)}`} titulo="Pedido confirmado" />
      <section className="overflow-hidden rounded-3xl border border-borde bg-crema-claro">
        <div className="flex flex-wrap items-center gap-4 border-b border-linea bg-verde-suave px-6 py-5">
          <span className="flex size-12 items-center justify-center rounded-full bg-verde text-white">
            <Icono nombre="check" className="size-6" />
          </span>
          <div>
            <p className="font-titulos text-[22px] font-semibold text-tinta-titulo">Tu pedido quedó confirmado</p>
            <p className="text-sm text-[#245A40]">Los productos ya no están apartados: quedaron vendidos a tu nombre.</p>
          </div>
        </div>
        <ul className="divide-y divide-linea px-6">
          {pedido.detalles.map((d) => (
            <li key={d.producto} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-[15px]">
              <span>
                <span className="font-semibold text-tinta">{d.nombre}</span> <span className="text-tinta-suave">{d.presentacion}</span>
              </span>
              <span className="ml-auto flex items-baseline gap-4 tabular-nums">
                <span className="text-tinta-suave">
                  {cifra(d.cantidad)} × {pesos(d.precio_unitario)}
                </span>
                <span className="w-[92px] text-right font-semibold">{pesos(d.subtotal)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-linea px-6 py-4">
          <span className="font-semibold">Total</span>
          <span className="font-titulos text-[28px] font-semibold tabular-nums text-tinta-titulo">{pesos(pedido.total)}</span>
        </div>
      </section>

      <section aria-labelledby="titulo-siguiente" className="rounded-3xl border border-borde bg-white px-6 py-5">
        <h2 id="titulo-siguiente" className="font-titulos text-xl font-semibold text-tinta-titulo">
          Siguiente paso: el pago
        </h2>
        <p className="mt-1.5 max-w-[68ch] text-tinta-media">
          El pago se hace en la plataforma de pagos de la tienda. La conexión con esa plataforma no hace parte de esta versión.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/cliente/pedidos" className={BOTON_PRINCIPAL}>
          Ver mis pedidos
        </Link>
        <Link to="/cliente/catalogo" className={BOTON_SECUNDARIO}>
          Seguir comprando
        </Link>
      </div>
    </>
  );
}
