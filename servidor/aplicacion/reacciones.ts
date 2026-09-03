import { deEstaPeticion } from '../eventos/bandeja.ts';
import { esEvento, type TipoDeEvento } from '../eventos/catalogo.ts';
import type { Contexto } from './contrato.ts';
import { sembrarElInventario } from './inventario.ts';

/**
 * Las reacciones · lo que un módulo hace cuando otro cambia algo (M6).
 *
 * ── El problema que resuelve, que es la regla 14 del Plan ────────────────────
 *
 * «**Nada entra aislado.** Antes de construir algo se responde qué datos usa, de
 *  dónde vienen y **qué otras partes de Estook tienen que enterarse cuando
 *  cambien**.» M5 respondió esa pregunta publicando cinco eventos, y dejó
 *  escrito al lado de uno de ellos: «`local.creado` → M6 le siembra sus
 *  categorías».
 *
 * Aquí es donde M6 lo hace. Y hacía falta un sitio, porque las dos alternativas
 * eran peores:
 *
 *   · Que `crear_local` —un comando de M5— llamara a la siembra de M6. Entonces
 *     cada módulo nuevo tendría que ir a editar los comandos de los anteriores,
 *     y en veinte módulos `crear_local` sería una lista de llamadas a diez sitios
 *     distintos que nadie se atreve a tocar.
 *   · Un disparador en Postgres. Es una regla escondida: mira una tabla y hace
 *     cosas en otra sin que se vea desde el código que la provoca.
 *
 * Con esto, quien publica no sabe quién escucha, quien escucha se declara en una
 * línea, y **todas las reacciones del sistema se leen en este fichero**.
 *
 * ── Por qué son síncronas, y en la misma transacción ─────────────────────────
 *
 * Porque un local sin categorías es un local roto: entras en Inventario y el
 * desplegable está vacío, justo donde la Auditoría promete «nunca vacío: vienen
 * de serie». Si esto lo hiciera un proceso de fondo que pasa cada cinco minutos,
 * habría cinco minutos en los que el producto está mal, y además **hoy no hay
 * ningún proceso de fondo**: no hay reloj que llame a nada (está en ESTADO.md,
 * pendiente de decidir antes de M8).
 *
 * En la misma transacción significa que o pasan las dos cosas o no pasa ninguna.
 * Si sembrar fallara, el local no se crearía. Es lo correcto: mejor que no exista
 * a que exista a medias y nadie se entere.
 *
 * ── Lo que esto NO sustituye ─────────────────────────────────────────────────
 *
 * La bandeja de salida sigue igual y los eventos siguen guardándose. Esto lee lo
 * que se acaba de publicar, no lo consume ni lo marca: cuando haya reloj, quien
 * tenga que enterarse tarde —un aviso, un correo, un recálculo pesado— seguirá
 * teniendo sus eventos ahí. Aquí solo va lo que **no puede esperar**.
 */

export interface EventoOcurrido {
  readonly tipo: TipoDeEvento;
  readonly organizacionId: string;
  readonly localId: string | null;
  readonly datos: Record<string, unknown>;
}

export interface Reaccion {
  /** Para poder decir en un registro cuál falló, y para leer esta lista. */
  readonly nombre: string;
  readonly a: TipoDeEvento;
  /** Un filtro fino, cuando el mismo evento significa varias cosas. */
  leToca?(evento: EventoOcurrido): boolean;
  reaccionar(contexto: Contexto, evento: EventoOcurrido): Promise<void>;
}

/**
 * ¿Puede esta persona escribir género y precios en este local?
 *
 * Hace falta porque **quien crea un local no es quien va a trabajar en él**. Un
 * administrador de cuenta da de alta locales y su ficha dice «sin acceso a la
 * operación diaria»: no tiene Inventario. Sembrarle los ejemplos con su
 * identidad chocaría contra las políticas y tumbaría la creación entera del
 * local, que es un precio absurdo por unos datos de mentira.
 *
 * Las categorías sí se le siembran igual, porque `estook.sembrar_categorias` es
 * la única función con privilegio de este módulo y está ahí exactamente por esto.
 */
async function puedeConElGenero(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ genero: boolean; precios: boolean }[]>`
    select estook.puede_editar('app.inventario', ${localId}::uuid) as genero,
           estook.puede_editar('dato.precio_de_compra', ${localId}::uuid) as precios
  `;
  const fila = filas[0];
  return fila !== undefined && fila.genero && fila.precios;
}

async function sembrar(contexto: Contexto, evento: EventoOcurrido): Promise<void> {
  const { localId } = evento;
  if (localId === null) return;

  await sembrarElInventario(contexto, localId, {
    conEjemplos: await puedeConElGenero(contexto, localId),
  });
}

/**
 * Todas las reacciones del sistema, en una lista.
 *
 * Son dos y las dos hacen lo mismo, porque **el tipo de local puede llegar
 * después que el local**. Al duplicar un local de una cadena, el tipo viene
 * copiado y se sabe al crearlo; en el alta normal, el local ya existe desde que
 * se invitó a su gerente y el tipo se responde en el paso 2. Las categorías
 * dependen del tipo, así que hay que reaccionar en los dos momentos.
 *
 * Sembrar es idempotente, así que reaccionar dos veces no duplica nada.
 */
export const REACCIONES: readonly Reaccion[] = [
  {
    nombre: 'M6 · sembrar el inventario de un local nuevo',
    a: 'local.creado',
    reaccionar: sembrar,
  },
  {
    nombre: 'M6 · sembrar el inventario al saber de qué tipo es el local',
    a: 'local.ficha_cambiada',
    leToca: (evento) => evento.datos['que'] === 'tipo',
    reaccionar: sembrar,
  },
];

/**
 * Ejecuta las reacciones de los eventos que ha publicado este comando.
 *
 * Una sola pasada, a propósito: si una reacción publicara un evento y ese evento
 * disparara otra reacción, tendríamos una cadena que se puede morder la cola sin
 * que nadie lo vea venir. Los efectos en cadena de verdad —el recálculo de
 * escandallos cuando sube un precio— van por la cola de trabajos, que sí sabe
 * ordenarlos y reintentarlos (Auditoría, hallazgo 9).
 */
export async function reaccionar(contexto: Contexto): Promise<void> {
  if (REACCIONES.length === 0) return;

  const publicados = await deEstaPeticion(contexto.sql, contexto.correlacionId);
  if (publicados.length === 0) return;

  for (const fila of publicados) {
    if (!esEvento(fila.tipo)) continue;

    const evento: EventoOcurrido = {
      tipo: fila.tipo,
      organizacionId: fila.organizacion_id,
      localId: fila.local_id,
      datos: fila.datos,
    };

    for (const reaccion of REACCIONES) {
      if (reaccion.a !== evento.tipo) continue;
      if (reaccion.leToca && !reaccion.leToca(evento)) continue;
      await reaccion.reaccionar(contexto, evento);
    }
  }
}
