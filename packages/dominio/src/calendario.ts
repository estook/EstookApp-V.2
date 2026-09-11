import { diaDeLaSemana, masDias, type FechaOperativa } from './tiempo.ts';

/**
 * El Calendario (M7 publica, M14 pinta) · decisión 0031.
 *
 * «Todo lo que pasa en el local, en un sitio. **No es un calendario de turnos: es
 *  el calendario del negocio**» (Manifiesto 15). Cada módulo escribe lo suyo en la
 * misma tabla; aquí vive lo único que hay que calcular para leerla, que es
 * **desplegar lo que se repite** en el rango que se mira.
 */

export const CAPAS = ['entrega', 'caducidad', 'turno', 'appcc', 'mantenimiento', 'aviso'] as const;

export type Capa = (typeof CAPAS)[number];

/** Cómo se llama cada capa, en plural, que es como se filtra. */
export const NOMBRE_DE_LA_CAPA: Readonly<Record<Capa, string>> = {
  entrega: 'Entregas',
  caducidad: 'Caducidades',
  turno: 'Turnos',
  appcc: 'APPCC',
  mantenimiento: 'Mantenimiento',
  aviso: 'Avisos',
};

/**
 * De qué app es cada capa, para pintarla con su acento.
 *
 * «Cada capa con el color de su app y su filtro. **Ni un color inventado**»
 * (0031). El color no se escribe aquí: se escribe de qué app es, y el acento sale
 * del catálogo de navegación, que es su único dueño.
 */
export const APP_DE_LA_CAPA: Readonly<Record<Capa, string>> = {
  entrega: 'inventario',
  caducidad: 'inventario',
  turno: 'equipo',
  appcc: 'servicio',
  mantenimiento: 'cuaderno',
  aviso: 'calendario',
};

export function esCapa(valor: unknown): valor is Capa {
  return typeof valor === 'string' && (CAPAS as readonly string[]).includes(valor);
}

/** Un evento tal cual está guardado. */
export interface EventoGuardado {
  readonly id: string;
  readonly capa: Capa;
  readonly dia: FechaOperativa;
  readonly hastaEl: FechaOperativa | null;
  /** «HH:MM», o nulo si es el día entero. */
  readonly desde: string | null;
  readonly hasta: string | null;
  /** Días de la semana en que se repite, del 1 (lunes) al 7 (domingo). */
  readonly seRepite: readonly number[] | null;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly ir: string | null;
  readonly grupo: string | null;
  readonly hecho: boolean;
}

/** Un evento en un día concreto, que es lo que se pinta. */
export interface Ocurrencia extends EventoGuardado {
  readonly fecha: FechaOperativa;
  /** Si sale de algo que se repite, y no de un día concreto. */
  readonly repetido: boolean;
}

/**
 * Los eventos que caen entre `desde` y `hasta`, los dos incluidos, día a día.
 *
 * ── Tres reglas, y las tres salen de mirar un calendario de verdad ───────────
 *
 *   1. **Lo que se repite se despliega aquí**, no se guarda cien veces: «Makro
 *      reparte martes y viernes» es una fila, y un martes cualquiera sale de ella.
 *   2. **Lo concreto tapa a lo que se repite.** El martes que llega el pedido 23
 *      de Makro no hace falta decir además «reparte Makro»: los dos son del mismo
 *      grupo, y se queda el que dice algo.
 *   3. **Un evento de varios días sale en cada uno de ellos**, que es donde
 *      alguien lo va a buscar.
 *
 * Se ordena por día, luego lo del día entero antes que lo que tiene hora, luego
 * por capa en el orden del catálogo, y por título.
 */
export function desplegar(
  eventos: readonly EventoGuardado[],
  desde: FechaOperativa,
  hasta: FechaOperativa,
): readonly Ocurrencia[] {
  if (hasta < desde) return [];

  const concretas: Ocurrencia[] = [];
  const repetidas: Ocurrencia[] = [];

  for (const evento of eventos) {
    if (evento.seRepite !== null && evento.seRepite.length > 0) {
      const dias = new Set(evento.seRepite);
      let fecha = evento.dia > desde ? evento.dia : desde;
      const fin = evento.hastaEl !== null && evento.hastaEl < hasta ? evento.hastaEl : hasta;
      while (fecha <= fin) {
        if (dias.has(diaDeLaSemana(fecha))) {
          repetidas.push({ ...evento, fecha, repetido: true, hecho: false });
        }
        fecha = masDias(fecha, 1);
      }
      continue;
    }

    const termina = evento.hastaEl ?? evento.dia;
    let fecha = evento.dia > desde ? evento.dia : desde;
    const fin = termina < hasta ? termina : hasta;
    while (fecha <= fin) {
      concretas.push({ ...evento, fecha, repetido: false });
      fecha = masDias(fecha, 1);
    }
  }

  const tapadas = new Set(
    concretas.filter((o) => o.grupo !== null).map((o) => `${o.grupo ?? ''}@${o.fecha}`),
  );

  const todas = [
    ...concretas,
    ...repetidas.filter((o) => o.grupo === null || !tapadas.has(`${o.grupo}@${o.fecha}`)),
  ];

  return todas.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    const horaA = a.desde ?? '';
    const horaB = b.desde ?? '';
    if (horaA !== horaB) return horaA < horaB ? -1 : 1;
    const capa = CAPAS.indexOf(a.capa) - CAPAS.indexOf(b.capa);
    if (capa !== 0) return capa;
    return a.titulo.localeCompare(b.titulo, 'es');
  });
}
