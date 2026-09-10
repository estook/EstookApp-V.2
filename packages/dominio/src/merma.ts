import { centimos, type Centimos } from './dinero.ts';
import { cantidad, costeDeLinea, milesimas, type Milesimas } from './coste.ts';

/**
 * La merma media de un día, en céntimos. Un solo redondeo, y al final (regla 9).
 *
 * Es la cifra con la que se compara la de hoy: doce euros de merma son mucho o
 * poco según lo de siempre, y «lo de siempre» es esto.
 */
export function mediaPorDia(totalCentimos: number, dias: number): Centimos {
  if (dias <= 0) return centimos(0);
  return centimos(Math.round(totalCentimos / dias));
}

/**
 * La merma (M6½) · el motivo manda, y la partida sale del motivo.
 *
 * ── La frase que ordena este fichero ────────────────────────────────────────
 *
 * «La comida del personal **no es merma**, ni las invitaciones: van con motivo
 * propio y **como partida aparte**, o el food cost miente» (Manifiesto 28).
 *
 * Dos kilos de solomillo que se estropean y dos kilos que se come el equipo salen
 * los dos de la cámara y cuestan lo mismo. Uno es una pérdida y el otro es un
 * gasto de personal, y sumarlos juntos es exactamente cómo un food cost empieza a
 * mentir sin que nadie lo note.
 *
 * ── Y por qué la partida se deduce ──────────────────────────────────────────
 *
 * Porque si se eligieran las dos cosas, un día alguien apuntaría «caducado» en la
 * partida de personal y nadie lo vería nunca. Un dato, un único dueño (regla 6).
 * La misma función existe en SQL (`estook.partida_de_la_merma`) porque los
 * resúmenes se agregan en la base; las dos dicen lo mismo y hay una prueba que lo
 * cuadra.
 */

export const MOTIVOS_DE_MERMA = [
  'caducado',
  'mal_estado',
  'roto',
  'fallo_de_elaboracion',
  'comida_de_personal',
  'invitacion',
  'prueba_de_carta',
  'otro',
] as const;

export type MotivoDeMerma = (typeof MOTIVOS_DE_MERMA)[number];

export const PARTIDAS_DE_MERMA = ['perdida', 'personal', 'atencion'] as const;

export type PartidaDeMerma = (typeof PARTIDAS_DE_MERMA)[number];

/**
 * Cómo se llama cada motivo en pantalla.
 *
 * En cristiano y en el orden en el que se pulsan durante un servicio: lo que más
 * pasa, primero. «Se ha caído» antes que «prueba de carta», porque durante un
 * servicio lo que pasa es que se cae algo.
 */
export const NOMBRE_DEL_MOTIVO_DE_MERMA: Readonly<Record<MotivoDeMerma, string>> = {
  caducado: 'Ha caducado',
  mal_estado: 'Estaba malo',
  roto: 'Se ha caído o roto',
  fallo_de_elaboracion: 'Ha salido mal',
  comida_de_personal: 'Comida del personal',
  invitacion: 'Invitación a un cliente',
  prueba_de_carta: 'Prueba o cata',
  otro: 'Otra cosa',
};

/** Una frase por motivo, para que no haya que adivinar cuál es cuál. */
export const QUE_ES_CADA_MOTIVO: Readonly<Record<MotivoDeMerma, string>> = {
  caducado: 'Se pasó de fecha antes de gastarlo',
  mal_estado: 'Llegó mal, se cortó, olía mal',
  roto: 'Se cayó al suelo, se rompió el envase',
  fallo_de_elaboracion: 'Se quemó, se pasó de sal, se rehízo el plato',
  comida_de_personal: 'Lo que come el equipo. No es una pérdida: es gasto de personal',
  invitacion: 'Se le puso a un cliente sin cobrarlo',
  prueba_de_carta: 'Una cata, una foto, probar un plato nuevo',
  otro: 'Cualquier otra cosa. Hay que escribir qué pasó',
};

export const NOMBRE_DE_LA_PARTIDA: Readonly<Record<PartidaDeMerma, string>> = {
  perdida: 'Pérdida',
  personal: 'Personal',
  atencion: 'Atenciones',
};

export const QUE_ES_CADA_PARTIDA: Readonly<Record<PartidaDeMerma, string>> = {
  perdida: 'Género que se ha perdido. Esto sí sube el food cost',
  personal: 'Lo que come el equipo. Es gasto de personal, no coste de la comida que vendes',
  atencion: 'Invitaciones, catas y pruebas. Es gasto comercial',
};

export function esMotivoDeMerma(valor: string): valor is MotivoDeMerma {
  return (MOTIVOS_DE_MERMA as readonly string[]).includes(valor);
}

/**
 * En qué partida cae un motivo.
 *
 * Tiene gemela en SQL, `estook.partida_de_la_merma`, porque los totales se suman
 * en la base y traerse cien mil líneas para clasificarlas en JavaScript sería
 * traer cien mil líneas. Que las dos digan lo mismo lo comprueba una prueba, y no
 * la buena voluntad de quien añada el motivo número nueve.
 */
export function partidaDe(motivo: MotivoDeMerma): PartidaDeMerma {
  if (motivo === 'comida_de_personal') return 'personal';
  if (motivo === 'invitacion' || motivo === 'prueba_de_carta') return 'atencion';
  return 'perdida';
}

/**
 * Lo que ha costado una merma, en céntimos.
 *
 * ── Por qué se valora con el coste medio y no con el precio de la lista ─────
 *
 * Porque lo que se ha perdido es **lo que costó llenar esa cámara**, no lo que
 * costaría reponerlo hoy. Es la misma decisión que toma `valorDeLasExistencias`
 * desde M2, y por la misma razón: valorar una pérdida a precio de reposición
 * mezcla dos cosas —lo que perdiste y cuánto ha subido el género— y luego no hay
 * forma de separarlas.
 *
 * La cantidad llega en unidades de uso y positiva: aquí no se pregunta si el
 * movimiento iba con signo, eso es del libro.
 */
export function valorDeLaMerma(cuanto: number, costeMilesimas: Milesimas | number): Centimos {
  // **La cuenta no se escribe aquí**: es `costeDeLinea`, del motor de coste de M2,
  // que es su único dueño desde entonces (regla 6). Aquí solo se le quita el signo
  // a la cantidad, porque en el libro una merma va negativa y la pregunta que se
  // hace es «cuánto vale lo que se ha perdido».
  //
  // Escribirla a mano —`cuanto × coste / 1000`— fue lo primero que se hizo, y
  // salió mal: las milésimas de Estook son **milésimas de céntimo**, no de euro,
  // así que el redondeo daba un valor cien veces menor. Lo cazó su propia prueba.
  return costeDeLinea(milesimas(Math.trunc(costeMilesimas)), cantidad(Math.abs(cuanto)));
}
