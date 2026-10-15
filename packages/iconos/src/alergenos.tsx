import { crearIcono, type Icono } from './crearIcono.tsx';

/**
 * Los catorce alérgenos y el chile (M9 · 2, decisión 0087).
 *
 * Richi, 16-oct: «que salgan con SVG de picante (chile) o los alérgenos típicos, para
 * que sepan en la carta». Van **juntos y con el mismo trazo** que el resto de la app
 * (24 × 24, 1,75 px, `currentColor`), porque en una ficha salen uno al lado del otro y
 * dos estilos mezclados se leen como dos cosas distintas.
 *
 * Ocho son figuras de Lucide 0.469.0 (licencia ISC), copiadas tal cual: el trigo, el
 * huevo, el pez, la leche, el fruto seco, la soja, la concha y la copa. Los otros
 * siete —el langostino, el cacahuete, el apio, la mostaza, el sésamo, el altramuz y el
 * chile— Lucide no los tiene, y están dibujados aquí con las mismas reglas.
 *
 * El color de cada uno va con su nombre (`COLOR_DEL_ALERGENO`, en la app): son los de
 * los pictogramas de siempre, para que se reconozcan antes de leer.
 */

/** Lucide `wheat`. */
const Gluten = crearIcono(
  'alergeno-gluten',
  '<path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />',
);

/** Un langostino: el cuerpo curvado, sus anillos, la cola y las antenas. */
const Crustaceos = crearIcono(
  'alergeno-crustaceos',
  '<path d="M16.5 4.5c2.8 1.3 4.5 4 4.5 7 0 4.7-3.8 8.5-8.5 8.5-2.3 0-4.3-.9-5.8-2.4" /><path d="M13.6 7.2a6 6 0 0 1 2.9 5.1" /><path d="M10.4 9.7a3.4 3.4 0 0 1 1.9 3" /><path d="M6.7 17.6 3 20.5l.6-4.6 3.1 1.7Z" /><path d="M16.5 4.5 12.5 2" /><path d="M18.4 5.6 21 2.8" /><path d="M11.5 20l-.7 2.3" /><path d="M15.3 19.3l.6 2.3" />',
);

/** Lucide `egg`. */
const Huevos = crearIcono(
  'alergeno-huevos',
  '<path d="M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z" />',
);

/** Lucide `fish`. */
const Pescado = crearIcono(
  'alergeno-pescado',
  '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" /><path d="M18 12v.5" /><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" /><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" /><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" /><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />',
);

/** Un cacahuete: la cáscara en ocho, con sus puntos. */
const Cacahuetes = crearIcono(
  'alergeno-cacahuetes',
  '<path d="M12 2.5c2.8 0 5 2.2 5 5 0 1.6-.8 2.6-1.4 3.5-.5.7-.5 1.3 0 2 .6.9 1.4 1.9 1.4 3.5a5 5 0 0 1-10 0c0-1.6.8-2.6 1.4-3.5.5-.7.5-1.3 0-2C7.8 10.1 7 9.1 7 7.5c0-2.8 2.2-5 5-5Z" /><path d="M10 6.2h.01" /><path d="M14 7.6h.01" /><path d="M10.4 16h.01" /><path d="M13.8 17.6h.01" />',
);

/** Lucide `bean`. */
const Soja = crearIcono(
  'alergeno-soja',
  '<path d="M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z" /><path d="M5.341 10.62a4 4 0 1 0 5.279-5.28" />',
);

/** Lucide `milk`. */
const Lacteos = crearIcono(
  'alergeno-lacteos',
  '<path d="M8 2h8" /><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" /><path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />',
);

/** Lucide `nut`. */
const FrutosDeCascara = crearIcono(
  'alergeno-frutos-de-cascara',
  '<path d="M12 4V2" /><path d="M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4" /><path d="M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z" />',
);

/** Un manojo de apio: tres tallos y sus hojas. */
const Apio = crearIcono(
  'alergeno-apio',
  '<path d="M8.5 22c-.6-3.8-.4-7.7.8-11" /><path d="M12 22V9.5" /><path d="M15.5 22c.6-3.8.4-7.7-.8-11" /><path d="M12 9.5C10 8.4 9.2 6 9.7 3c2 .6 3 3.2 2.3 6.5Z" /><path d="M12 9.5c2-1.1 2.8-3.5 2.3-6.5-2 .6-3 3.2-2.3 6.5Z" /><path d="M9.3 11C7.2 11 5.6 9.7 5 7.4c2.1-.3 3.8 1 4.3 3.6Z" /><path d="M14.7 11c2.1 0 3.7-1.3 4.3-3.6-2.1-.3-3.8 1-4.3 3.6Z" />',
);

/** Un bote de mostaza de los de apretar. */
const Mostaza = crearIcono(
  'alergeno-mostaza',
  '<path d="M8.2 9h7.6L17 12v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8l1.2-3Z" /><path d="M9.5 9V6h5v3" /><path d="M11 6l.4-4h1.2L13 6" /><path d="M7 15h10" />',
);

/** Tres semillas de sésamo. */
const Sesamo = crearIcono(
  'alergeno-sesamo',
  '<path d="M8 3c1.7 1.6 2.5 3.3 2.5 5a2.5 2.5 0 0 1-5 0c0-1.7.8-3.4 2.5-5Z" /><path d="M16.5 5c1.7 1.6 2.5 3.3 2.5 5a2.5 2.5 0 0 1-5 0c0-1.7.8-3.4 2.5-5Z" /><path d="M11.5 12.5c1.7 1.6 2.5 3.3 2.5 5a2.5 2.5 0 0 1-5 0c0-1.7.8-3.4 2.5-5Z" />',
);

/** Lucide `wine`: el vino es lo que más los lleva. */
const Sulfitos = crearIcono(
  'alergeno-sulfitos',
  '<path d="M8 22h8" /><path d="M7 10h10" /><path d="M12 15v7" /><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />',
);

/** Una vaina de altramuz con sus tres granos. */
const Altramuces = crearIcono(
  'alergeno-altramuces',
  '<path d="M4 19.5C5.8 11.4 11.6 5.8 20 4c-1.4 8.1-7 13.9-16 15.5Z" /><circle cx="9" cy="15" r="1.6" /><circle cx="12.6" cy="11.5" r="1.6" /><circle cx="16" cy="8" r="1.6" />',
);

/** Lucide `shell`. */
const Moluscos = crearIcono(
  'alergeno-moluscos',
  '<path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44" />',
);

/** Una guindilla: lo que pica (Richi, 16-oct: «SVG de picante, chile»). */
export const IconoPicante = crearIcono(
  'picante',
  '<path d="M17.4 7.6c-1.6-.9-3.5-.4-4.5 1.3-1.7 3-3.7 6.5-9 9.6 1.3 2.1 5.1 2.6 8.6.6 4.3-2.4 6.6-6.5 6.4-9.3-.1-1-.6-1.7-1.5-2.2Z" /><path d="M17.4 7.6c.3-1.7 1.4-3 3.1-3.6" /><path d="M14.6 8.4c.8-.7 1.9-1 2.9-.8" />',
);

/** Los catorce, por su código (los de `estook.alergeno`, en su orden oficial). */
export const ICONO_DEL_ALERGENO: Readonly<Record<string, Icono>> = {
  gluten: Gluten,
  crustaceos: Crustaceos,
  huevos: Huevos,
  pescado: Pescado,
  cacahuetes: Cacahuetes,
  soja: Soja,
  lacteos: Lacteos,
  frutos_de_cascara: FrutosDeCascara,
  apio: Apio,
  mostaza: Mostaza,
  sesamo: Sesamo,
  sulfitos: Sulfitos,
  altramuces: Altramuces,
  moluscos: Moluscos,
};
