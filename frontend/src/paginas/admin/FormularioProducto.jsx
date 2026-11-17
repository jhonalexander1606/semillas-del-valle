import { useEffect, useRef, useState } from 'react';

import { api, erroresDeCampos } from '../../api/cliente.js';
import { AvisoError, CampoSelect, CampoTexto } from '../../componentes/Campos.jsx';
import { Miniatura } from '../../componentes/Sobre.jsx';

const VACIO = {
  nombre: '',
  categoria: '',
  marca: '',
  contenido: '',
  unidad_medida: 'g',
  precio_unitario: '',
  stock_disponible: '',
  fecha_vencimiento: '',
  imagen_url: '',
};

const ORDEN = ['nombre', 'categoria', 'marca', 'contenido', 'unidad_medida', 'precio_unitario', 'stock_disponible', 'fecha_vencimiento', 'imagen_url'];

function desdeProducto(producto) {
  if (!producto) return VACIO;
  return {
    nombre: producto.nombre,
    categoria: String(producto.categoria),
    marca: String(producto.marca),
    contenido: String(Number(producto.contenido)),
    unidad_medida: producto.unidad_medida,
    precio_unitario: String(Number(producto.precio_unitario)),
    stock_disponible: String(producto.stock_disponible),
    fecha_vencimiento: producto.fecha_vencimiento ?? '',
    imagen_url: producto.imagen_url ?? '',
  };
}

function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = 'Escribe el nombre del producto.';
  if (!datos.categoria) errores.categoria = 'Elige una categoría.';
  if (!datos.marca) errores.marca = 'Elige una marca.';
  if (!(Number(datos.contenido) > 0)) errores.contenido = 'Escribe un número mayor que cero.';
  if (!(Number(datos.precio_unitario) > 0)) errores.precio_unitario = 'Escribe un precio mayor que cero.';
  if (datos.stock_disponible === '' || !Number.isInteger(Number(datos.stock_disponible)) || Number(datos.stock_disponible) < 0) {
    errores.stock_disponible = 'Escribe un número entero (0 o más).';
  }
  if (datos.imagen_url.trim() && !/^https?:\/\/\S+$/i.test(datos.imagen_url.trim())) {
    errores.imagen_url = 'Pega una dirección que empiece por http:// o https://.';
  }
  return errores;
}

// Crear o editar un producto («Gestionar productos»). Cada presentación es un producto distinto.
export default function FormularioProducto({ producto, categorias, marcas, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(() => desdeProducto(producto));
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const primerCampo = useRef(null);
  const editando = Boolean(producto);

  useEffect(() => {
    primerCampo.current?.focus();
  }, []);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((d) => ({ ...d, [name]: value }));
    setErrores((e) => ({ ...e, [name]: undefined, general: undefined, non_field_errors: undefined }));
  }

  function enfocarPrimerError(lista) {
    const primero = ORDEN.find((campo) => lista[campo]);
    if (primero) document.getElementById(`producto-${primero}`)?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    const locales = validar(datos);
    setErrores(locales);
    if (Object.keys(locales).length) return enfocarPrimerError(locales);

    setEnviando(true);
    const cuerpo = {
      ...datos,
      nombre: datos.nombre.trim(),
      categoria: Number(datos.categoria),
      marca: Number(datos.marca),
      contenido: Number(datos.contenido),
      precio_unitario: Number(datos.precio_unitario),
      stock_disponible: Number(datos.stock_disponible),
      fecha_vencimiento: datos.fecha_vencimiento || null,
      imagen_url: datos.imagen_url.trim(),
    };
    try {
      const guardado = await api(editando ? `/productos/${producto.id}/` : '/productos/', {
        metodo: editando ? 'PATCH' : 'POST',
        cuerpo,
      });
      onGuardado(guardado, editando);
    } catch (error) {
      const delServidor = erroresDeCampos(error);
      if (error.datos?.non_field_errors) delServidor.general = error.datos.non_field_errors.join(' ');
      setErrores(delServidor);
      enfocarPrimerError(delServidor);
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby="titulo-form-producto"
      className="rounded-3xl border border-borde bg-crema-claro px-6 pb-6 pt-[22px] shadow-[0_6px_20px_rgba(60,48,20,0.06)] sm:px-8"
    >
      <h2 id="titulo-form-producto" className="font-titulos text-[22px] font-semibold text-tinta-titulo">
        {editando ? `Editar ${producto.nombre} ${producto.presentacion}` : 'Nuevo producto'}
      </h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Cada presentación es un producto distinto: «Tomate chonto 50 g» y «Tomate chonto 100 g» se registran por separado.
      </p>

      <form onSubmit={enviar} noValidate className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <CampoTexto
          ref={primerCampo}
          id="producto-nombre"
          name="nombre"
          etiqueta="Nombre"
          placeholder="Tomate chonto"
          value={datos.nombre}
          onChange={cambiar}
          error={errores.nombre}
          className="sm:col-span-2"
        />
        <CampoSelect id="producto-categoria" name="categoria" etiqueta="Categoría" value={datos.categoria} onChange={cambiar} error={errores.categoria}>
          <option value="">Elige una</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect id="producto-marca" name="marca" etiqueta="Marca" value={datos.marca} onChange={cambiar} error={errores.marca}>
          <option value="">Elige una</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          id="producto-contenido"
          name="contenido"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          etiqueta="Contenido"
          placeholder="50"
          value={datos.contenido}
          onChange={cambiar}
          error={errores.contenido}
        />
        <CampoSelect id="producto-unidad_medida" name="unidad_medida" etiqueta="Unidad" value={datos.unidad_medida} onChange={cambiar} error={errores.unidad_medida}>
          <option value="g">gramos (g)</option>
          <option value="kg">kilogramos (kg)</option>
          <option value="unidad">unidades</option>
        </CampoSelect>
        <CampoTexto
          id="producto-precio_unitario"
          name="precio_unitario"
          type="number"
          inputMode="numeric"
          min="0"
          step="50"
          etiqueta="Precio por unidad ($)"
          placeholder="3500"
          value={datos.precio_unitario}
          onChange={cambiar}
          error={errores.precio_unitario}
        />
        <CampoTexto
          id="producto-stock_disponible"
          name="stock_disponible"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          etiqueta="Unidades disponibles"
          placeholder="40"
          value={datos.stock_disponible}
          onChange={cambiar}
          error={errores.stock_disponible}
          ayuda={editando && producto.stock_apartado > 0 ? `Además hay ${producto.stock_apartado} apartadas en carritos.` : undefined}
        />
        <CampoTexto
          id="producto-fecha_vencimiento"
          name="fecha_vencimiento"
          type="date"
          etiqueta="Fecha de vencimiento (opcional)"
          value={datos.fecha_vencimiento}
          onChange={cambiar}
          error={errores.fecha_vencimiento}
          className="sm:col-span-2"
        />

        <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-4">
          <CampoTexto
            id="producto-imagen_url"
            name="imagen_url"
            type="url"
            inputMode="url"
            etiqueta="Foto del producto (opcional)"
            placeholder="https://…/foto.jpg"
            value={datos.imagen_url}
            onChange={cambiar}
            error={errores.imagen_url}
            ayuda="Pega la dirección de una foto. Si la dejas vacía se muestra el dibujo de la categoría."
            className="flex-1"
          />
          <Miniatura
            key={datos.imagen_url}
            categoria={categorias.find((c) => String(c.id) === datos.categoria)?.nombre}
            imagen={datos.imagen_url.trim()}
            className="mb-6 size-16 rounded-2xl"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <AvisoError>{errores.general}</AvisoError>
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-full bg-verde px-7 text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(46,111,79,0.22)] transition-colors hover:bg-verde-oscuro disabled:opacity-70"
          >
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="h-12 rounded-full border border-borde-input bg-white px-6 text-[15px] font-semibold text-tinta-media hover:bg-crema"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
