/*
 * Prueba de carga del panel del administrador — Semillas del Valle
 *
 * Simula usuarios que abren a la vez el panel del administrador: productos, categorías, la primera
 * página de pedidos, el inicio y el reporte de ventas del mes. Mide la mediana, el 95 % y los errores.
 *
 * Cómo usarla:
 *   1. Abra la aplicación (https://semillas-del-valle.onrender.com o http://localhost:5173) e inicie
 *      sesión como administrador.
 *   2. Si es la versión publicada, espere a que cargue una página: el servidor gratuito tarda cerca de
 *      un minuto en despertar.
 *   3. Abra la consola del navegador (F12, pestaña «Consola»), pegue todo este archivo y presione Enter.
 *   4. Al terminar (1 a 2 minutos) se imprime una tabla por escenario: 1, 5 y 20 usuarios.
 *
 * Para la versión local cambie API por 'http://localhost:8000/api/'.
 */
(async () => {
  const API = 'https://semillas-del-valle-api.onrender.com/api/';
  const RUTAS = ['productos/', 'categorias/', 'pedidos/?pagina=1&por_pagina=20', 'reportes/inicio/', 'reportes/ventas/'];
  const ESCENARIOS = [
    { usuarios: 1, rondas: 3 },
    { usuarios: 5, rondas: 4 },
    { usuarios: 20, rondas: 2 },
  ];
  const TIEMPO_LIMITE_MS = 60000;

  const token = JSON.parse(localStorage.getItem('semillero.tokens') || '{}').access;
  if (!token) {
    console.error('Inicie sesión como administrador antes de correr la prueba.');
    return;
  }

  const percentil = (lista, p) => {
    if (!lista.length) return null;
    const orden = [...lista].sort((a, b) => a - b);
    return Math.round(orden[Math.min(orden.length - 1, Math.floor(p * orden.length))]);
  };

  async function escenario(usuarios, rondas) {
    const registro = [];
    const inicio = performance.now();

    async function pedir(ruta) {
      const t0 = performance.now();
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
      try {
        const r = await fetch(API + ruta, { headers: { Authorization: 'Bearer ' + token }, signal: control.signal, cache: 'no-store' });
        await r.text();
        registro.push({ ruta, ms: performance.now() - t0, ok: r.ok });
      } catch {
        registro.push({ ruta, ms: performance.now() - t0, ok: false });
      } finally {
        clearTimeout(reloj);
      }
    }

    async function usuario() {
      for (let i = 0; i < rondas; i++) for (const ruta of RUTAS) await pedir(ruta);
    }

    await Promise.all(Array.from({ length: usuarios }, usuario));
    const ok = registro.filter((r) => r.ok).map((r) => r.ms);
    return {
      'Usuarios a la vez': usuarios,
      Peticiones: registro.length,
      Errores: registro.length - ok.length,
      'Mediana (ms)': percentil(ok, 0.5),
      '95 % (ms)': percentil(ok, 0.95),
      'Duración (s)': +((performance.now() - inicio) / 1000).toFixed(1),
    };
  }

  console.log('Calentando el servidor…');
  await escenario(1, 1);
  const resultados = [];
  for (const { usuarios, rondas } of ESCENARIOS) {
    console.log(`Escenario: ${usuarios} usuario(s) a la vez…`);
    resultados.push(await escenario(usuarios, rondas));
  }
  console.table(resultados);
})();
