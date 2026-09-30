/**
 * Los documentos de Estook, de muestra y con el mismo motor que Cloudflare (0068).
 *
 *   pnpm documentos:muestra
 *
 * Las pruebas usan un motor de mentira que no dibuja nada, así que **para ver de
 * verdad cómo queda un documento** está esto: pinta cada plantilla de
 * `packages/documentos` con datos inventados y la imprime con el Chromium que ya usa
 * el proyecto para las pruebas de pantalla, que es el mismo navegador que tiene
 * Cloudflare Browser Run. Deja los PDF en `.muestras/`, que no se sube al repositorio.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  documentoDelInforme,
  documentoDelRegistro,
  pieDelDocumento,
} from '../packages/documentos/src/index.ts';

const DESTINO = fileURLToPath(new URL('../.muestras/', import.meta.url));
mkdirSync(DESTINO, { recursive: true });

const MARCA = { nombreDelLocal: 'Bar de Ejemplo', color: '#1E6B52', logo: null };
const HECHO = 'Hecho el 30 de septiembre de 2026, 19:40';

const muestras = [
  {
    nombre: 'tu-semana',
    apaisado: false,
    pie: 'Tu semana · Bar de Ejemplo · del 21 al 27 de septiembre',
    html: documentoDelInforme({
      marca: MARCA,
      titulo: 'Tu semana',
      periodo: 'del 21 al 27 de septiembre',
      comparado: 'frente a la semana anterior',
      hechoEl: HECHO,
      cifras: [
        { nombre: 'Ventas', valor: '8.430,00 €', cambio: '+12 %', bueno: true },
        { nombre: 'Ticket medio', valor: '18,40 €', cambio: '+3 %', bueno: true },
        { nombre: 'Food cost', valor: '31,2 %', cambio: '+1,4 puntos', bueno: false },
        { nombre: 'Merma', valor: '142,00 €', cambio: '−8 %', bueno: true },
        { nombre: 'Horas del equipo', valor: '286 h', cambio: 'igual', bueno: null },
        { nombre: 'Coste de personal', valor: '3.120,00 €', cambio: '+2 %', bueno: false },
      ],
      frases: [
        'Lo mejor: las ventas, 8.430,00 €, un 12 % más que la semana anterior.',
        'Lo peor: el food cost, 31,2 %, 1,4 puntos más que la semana anterior.',
        'Fuera de objetivo: food cost, 31,2 %, con objetivo 30 %.',
      ],
      semaforo: [
        {
          nombre: 'Food cost',
          valor: '31,2 %',
          objetivo: 'objetivo 30 %',
          semaforo: 'rojo',
          porque: 'La merluza ha subido un 18 % desde el lunes.',
        },
        {
          nombre: 'Personal',
          valor: '29 %',
          objetivo: 'objetivo 32 %',
          semaforo: 'verde',
          porque: null,
        },
        {
          nombre: 'Merma',
          valor: '3,6 %',
          objetivo: 'objetivo 4 %',
          semaforo: 'ambar',
          porque: null,
        },
      ],
    }),
  },
  {
    nombre: 'registro-de-jornada',
    apaisado: true,
    pie: 'Registro de jornada · Bar de Ejemplo · septiembre de 2026',
    html: documentoDelRegistro({
      marca: MARCA,
      periodo: 'del mar 1 sep al mié 30 sep',
      hechoEl: HECHO,
      pausaCuenta: false,
      huella: '3f5e0c1d9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d',
      filas: [
        {
          persona: 'Ana Ruiz',
          fecha: 'lun 28 sep',
          entrada: '09:58',
          salida: '17:04',
          pausas: '30 min',
          trabajado: '6 h 36 min',
          desde: 'Móvil, a 12 m',
          correccion: null,
        },
        {
          persona: 'Omar Sanz',
          fecha: 'vie 25 sep',
          entrada: '20:00',
          salida: '00:30 (+1)',
          pausas: '—',
          trabajado: '4 h 30 min',
          desde: 'Aparato del local',
          correccion: {
            veces: 1,
            original: '20:00 – sin salida',
            motivo: 'Se fue sin fichar la salida',
            quienYCuando: 'Carla Soto, el sáb 26 sep',
          },
        },
        {
          persona: 'Omar Sanz',
          fecha: 'sáb 26 sep',
          entrada: '13:02',
          salida: '17:00',
          pausas: '—',
          trabajado: '3 h 58 min',
          desde: 'Aparato del local',
          correccion: null,
        },
      ],
      totales: [
        { persona: 'Ana Ruiz', dias: 1, trabajado: '6 h 36 min' },
        { persona: 'Omar Sanz', dias: 2, trabajado: '8 h 28 min' },
      ],
    }),
  },
];

const navegador = await chromium.launch();
for (const muestra of muestras) {
  const pagina = await navegador.newPage();
  await pagina.setContent(muestra.html, { waitUntil: 'load' });
  const pdf = await pagina.pdf({
    format: 'A4',
    landscape: muestra.apaisado,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: pieDelDocumento(muestra.pie),
  });
  await pagina.close();
  const donde = `${DESTINO}${muestra.nombre}.pdf`;
  writeFileSync(donde, pdf);
  console.log(`  ${muestra.nombre}.pdf  ${(pdf.length / 1024).toFixed(0)} KB`);
}
await navegador.close();
console.log(`\n  En ${DESTINO}`);
