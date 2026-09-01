#!/usr/bin/env node
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Traer los iconos de Lucide (Parte B3 del Plan).
 *
 * «Lucide (licencia ISC, uso libre incluido comercial). Se descargan los SVG y se
 * guardan en `packages/iconos/`; **no se instala la libreria entera** ni se carga
 * nada desde fuera. [...] Se extraen solo los SVG que se usan [...] El resto se
 * tira.»
 *
 *   node herramientas/traer-iconos.mjs
 *
 * Se ejecuta una sola vez y lo que sale se sube al repositorio. Anadir un icono
 * es anadir una linea a la lista de abajo y volver a ejecutarlo.
 *
 * ── Sobre SVGO ───────────────────────────────────────────────────────────────
 *
 * B3 propone `npx svgo`. Aqui no hace falta, y meter una dependencia que no hace
 * falta va contra E1. Los SVG de Lucide ya vienen normalizados: **todos** traen
 * la misma cabecera (24x24, `stroke="currentColor"`, `stroke-width="2"`,
 * `fill="none"`, extremos redondeados) y solo cambian en las figuras de dentro.
 *
 * Asi que lo que se hace es mejor que optimizarlos: se **descarta** la cabecera
 * entera y se guarda solo lo de dentro. La cabecera la pone una sola vez el
 * componente, con el trazo de 1,75 px que pide el Plan. Un icono deja de ser
 * 300 bytes de SVG y pasa a ser la figura y nada mas.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const PAQUETE = join(RAIZ, 'packages/iconos');

/** La version se fija a proposito: que dos personas ejecuten esto y salga lo mismo. */
const VERSION = '0.469.0';

/**
 * Los iconos que se usan. Cada uno con el nombre del componente que genera.
 *
 * Si un icono no esta aqui, no existe en Estook. Es lo que impide que acaben
 * entrando mil iconos «por si acaso» y que dos pantallas usen dos flechas
 * distintas para lo mismo.
 */
const ICONOS = {
  // ── Las ocho apps, el Panel y Fogon (tabla de B3) ──────────────────────────
  'layout-dashboard': 'Panel',
  package: 'Inventario',
  calculator: 'Escandallos',
  'book-open': 'Carta',
  'calendar-days': 'Calendario',
  users: 'Equipo',
  'clipboard-check': 'Servicio',
  'trending-up': 'Negocio',
  'notebook-pen': 'Cuaderno',
  flame: 'Fogon',

  // ── La barra y la cabecera ─────────────────────────────────────────────────
  settings: 'Ajustes',
  bell: 'Avisos',
  'message-square': 'Chat',
  search: 'Buscar',
  user: 'Persona',
  'log-out': 'Salir',
  'building-2': 'Organizacion',
  'map-pin': 'Local',
  menu: 'Menu',
  ellipsis: 'Mas',
  'layout-grid': 'Rejilla',

  // ── Moverse ────────────────────────────────────────────────────────────────
  'chevron-down': 'FlechaAbajo',
  'chevron-up': 'FlechaArriba',
  'chevron-left': 'FlechaIzquierda',
  'chevron-right': 'FlechaDerecha',
  'arrow-left': 'Atras',
  'arrow-right': 'Adelante',
  'external-link': 'AbrirFuera',

  // ── Hacer ──────────────────────────────────────────────────────────────────
  plus: 'Anadir',
  check: 'Hecho',
  x: 'Cerrar',
  pencil: 'Editar',
  'trash-2': 'Borrar',
  'undo-2': 'Deshacer',
  'rotate-ccw': 'Reintentar',
  'sliders-horizontal': 'Filtros',
  download: 'Descargar',
  'file-text': 'Documento',

  // ── Como esta la cosa ──────────────────────────────────────────────────────
  'circle-check': 'Bien',
  'triangle-alert': 'Atencion',
  'circle-alert': 'Mal',
  info: 'Info',
  inbox: 'Vacio',
  clock: 'Reloj',
  'wifi-off': 'SinConexion',
  eye: 'Ver',
  'eye-off': 'NoVer',

  // ── Ajustes ────────────────────────────────────────────────────────────────
  type: 'TamanoDeLetra',
  languages: 'Idioma',
  accessibility: 'Accesibilidad',
};

async function traer(nombre) {
  const url = `https://unpkg.com/lucide-static@${VERSION}/icons/${nombre}.svg`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`${nombre}: ${respuesta.status} en ${url}`);
  return respuesta.text();
}

/**
 * Se queda con lo de dentro del `<svg>` y tira la cabecera.
 *
 * Tambien quita los atributos que ya pone el componente, para que un icono no
 * pueda traer su propio color ni su propio grosor por su cuenta.
 */
function figuraDe(svg, nombre) {
  const dentro = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg);
  if (!dentro) throw new Error(`${nombre}: no parece un SVG`);

  return dentro[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*(stroke|fill|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

await rm(join(PAQUETE, 'svg'), { recursive: true, force: true });
await mkdir(join(PAQUETE, 'svg'), { recursive: true });

const nombres = Object.keys(ICONOS).sort();
const figuras = new Map();

for (const nombre of nombres) {
  const svg = await traer(nombre);
  const figura = figuraDe(svg, nombre);
  figuras.set(nombre, figura);

  // El SVG se guarda tambien tal cual, ya limpio: B3 pide que esten en
  // `packages/iconos/svg`, y hay sitios (un correo, un PDF) donde hace falta el
  // fichero y no el componente.
  await writeFile(
    join(PAQUETE, 'svg', `${nombre}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${figura}</svg>\n`,
    'utf8',
  );
}

// ── El fichero generado ───────────────────────────────────────────────────────

const cabecera = `/* GENERADO por herramientas/traer-iconos.mjs · no se edita a mano.
 *
 * Iconos de Lucide ${VERSION} (licencia ISC), descargados y reducidos a su figura.
 * Para anadir uno: se apunta en la lista de la herramienta y se vuelve a ejecutar.
 */
import { crearIcono } from './crearIcono.tsx';
`;

const cuerpo = nombres
  .map((nombre) => {
    const componente = ICONOS[nombre];
    const figura = figuras.get(nombre).replace(/'/g, "\\'");
    return `\n/** Lucide \`${nombre}\` */\nexport const Icono${componente} = crearIcono(\n  '${nombre}',\n  '${figura}',\n);`;
  })
  .join('\n');

await writeFile(join(PAQUETE, 'src/generados.tsx'), `${cabecera}${cuerpo}\n`, 'utf8');

const bytes = [...figuras.values()].reduce((total, f) => total + f.length, 0);
console.log(`${nombres.length} iconos · ${(bytes / 1024).toFixed(1)} KB de figuras`);
console.log('  packages/iconos/svg/*.svg');
console.log('  packages/iconos/src/generados.tsx');
