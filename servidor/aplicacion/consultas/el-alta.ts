import { z } from 'zod';
import {
  comoVa,
  type ClaveDeObjetivo,
  type PasoDelAlta,
  type Progreso,
  type TipoDeLocal,
} from '@estook/dominio';
import { elLocalDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Todo lo que el alta necesita para pintarse, en una consulta (M5).
 *
 * ── Por qué en una y no en cinco ─────────────────────────────────────────────
 *
 * Por lo mismo que `quien_soy`: las cinco cosas se necesitan **a la vez y antes
 * de pintar nada**, y encadenar cinco viajes de ida y vuelta en un móvil con
 * mala cobertura es la forma más segura de que la primera pantalla útil no
 * llegue a tiempo (B7).
 *
 * Y hay una razón de producto encima: «un local termina el alta en **menos de
 * cuatro minutos**» es el criterio de terminado de M5. Cuatro minutos para ocho
 * pasos son treinta segundos por pantalla, y ahí no caben esperas.
 *
 * ── Esta consulta también sirve al Panel ─────────────────────────────────────
 *
 * La tarjeta «termina de configurar tu local» del Panel lee de aquí, no de una
 * consulta propia. Es la misma pregunta —«¿por dónde va el alta y qué falta?»— y
 * dos consultas que la respondan acabarían discrepando (regla 6).
 */

export interface ElAlta {
  readonly localId: string;
  readonly nombre: string;
  readonly esEjemplo: boolean;

  /** Por dónde va, qué se saltó y cuánto se ha ganado ya. */
  readonly paso: number;
  readonly saltados: readonly PasoDelAlta[];
  readonly terminado: boolean;
  readonly progreso: Progreso;

  /** Lo respondido hasta ahora, para poder volver atrás y corregir. */
  readonly ficha: {
    readonly tipo: TipoDeLocal | null;
    readonly direccion: string | null;
    readonly codigoPostal: string | null;
    readonly poblacion: string | null;
    readonly provincia: string | null;
    readonly telefono: string | null;
    readonly zonaHoraria: string;
    readonly horaDeCorte: string;
    readonly territorio: string;
    readonly regimen: string;
    readonly actividad: string | null;
    readonly epigrafeIae: string | null;
    readonly colorDeMarca: string | null;
    readonly tieneLogo: boolean;
  };

  /** Los objetivos vigentes, y si son los de partida o los ha puesto alguien. */
  readonly objetivos: readonly {
    readonly clave: ClaveDeObjetivo;
    readonly valor: number;
    readonly dePartida: boolean;
  }[];

  /**
   * Lo que se le propondría a un local de este tipo. Sale de la base de datos y
   * no de una constante en el cliente: es un catálogo cerrado con un solo dueño.
   */
  readonly dePartida: readonly { readonly clave: ClaveDeObjetivo; readonly valor: number }[];

  /** Cuántos locales tiene ya la organización, para el paso 3. */
  readonly cuantosLocales: number;
  /** Los que se pueden duplicar: los que ya tienen el alta hecha. */
  readonly paraDuplicar: readonly { readonly id: string; readonly nombre: string }[];

  /** Cuántos datos de ejemplo le quedan. Cero = la tarjeta no se enseña. */
  readonly ejemplos: number;
}

export const elAlta = consulta<Record<string, never>, ElAlta>({
  nombre: 'el_alta',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);

    const filas = await contexto.sql<
      {
        id: string;
        nombre: string;
        es_ejemplo: boolean;
        organizacion_id: string;
        onboarding_paso: number;
        onboarding_saltados: string[];
        onboarding_terminado: boolean;
        tipo: string | null;
        direccion: string | null;
        codigo_postal: string | null;
        poblacion: string | null;
        provincia: string | null;
        telefono: string | null;
        zona_horaria: string;
        hora_de_corte: string;
        territorio: string;
        regimen: string;
        actividad: string | null;
        epigrafe_iae: string | null;
        color_de_marca: string | null;
        logo_clave: string | null;
      }[]
    >`
      select id, nombre, es_ejemplo, organizacion_id,
             onboarding_paso, onboarding_saltados, onboarding_terminado,
             tipo::text as tipo, direccion, codigo_postal, poblacion, provincia, telefono,
             zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte,
             territorio::text as territorio, regimen::text as regimen,
             actividad::text as actividad, epigrafe_iae,
             color_de_marca, logo_clave
        from estook.local
       where id = ${localId}
    `;

    const local = filas[0];
    // Sin fila no es que no exista: es que las políticas no la devuelven, y eso
    // solo pasa si el local no es suyo. Se contesta lo mismo en los dos casos.
    if (!local) throw new FalloDeAplicacion('no_existe');

    const objetivos = await contexto.sql<{ clave: string; valor: string; de_partida: boolean }[]>`
      select clave::text as clave, valor::text as valor, de_partida
        from estook.objetivo
       where local_id = ${localId} and hasta is null
       order by clave
    `;

    const dePartida =
      local.tipo === null
        ? []
        : await contexto.sql<{ clave: string; valor: string }[]>`
            select clave::text as clave, valor::text as valor
              from estook.objetivo_de_partida
             where tipo = ${local.tipo}::estook.tipo_de_local
             order by clave
          `;

    // Los de la organización que ya están montados. Un local a medias no sirve
    // de modelo: duplicarlo copiaría un alta sin terminar.
    const hermanos = await contexto.sql<{ id: string; nombre: string; terminado: boolean }[]>`
      select id, nombre, onboarding_terminado as terminado
        from estook.local
       where organizacion_id = ${local.organizacion_id}
         and id in (select local_id from estook.locales_visibles())
       order by nombre
    `;

    const ejemplos = await contexto.sql<{ contar_ejemplos: number }[]>`
      select estook.contar_ejemplos(${localId}::uuid) as contar_ejemplos
    `;

    const saltados = local.onboarding_saltados as PasoDelAlta[];

    return {
      localId: local.id,
      nombre: local.nombre,
      esEjemplo: local.es_ejemplo,

      paso: local.onboarding_paso,
      saltados,
      terminado: local.onboarding_terminado,
      progreso: comoVa({
        paso: local.onboarding_paso,
        saltados,
        terminado: local.onboarding_terminado,
      }),

      ficha: {
        tipo: local.tipo as TipoDeLocal | null,
        direccion: local.direccion,
        codigoPostal: local.codigo_postal,
        poblacion: local.poblacion,
        provincia: local.provincia,
        telefono: local.telefono,
        zonaHoraria: local.zona_horaria,
        horaDeCorte: local.hora_de_corte,
        territorio: local.territorio,
        regimen: local.regimen,
        actividad: local.actividad,
        epigrafeIae: local.epigrafe_iae,
        colorDeMarca: local.color_de_marca,
        // Se dice **si hay**, no cuál: la clave del objeto no le sirve de nada a
        // la pantalla, que lo que necesita es el enlace firmado de `quien_soy`.
        tieneLogo: local.logo_clave !== null,
      },

      objetivos: objetivos.map((o) => ({
        clave: o.clave as ClaveDeObjetivo,
        valor: Number(o.valor),
        dePartida: o.de_partida,
      })),

      dePartida: dePartida.map((o) => ({
        clave: o.clave as ClaveDeObjetivo,
        valor: Number(o.valor),
      })),

      cuantosLocales: hermanos.length,
      paraDuplicar: hermanos
        .filter((h) => h.terminado && h.id !== localId)
        .map((h) => ({ id: h.id, nombre: h.nombre })),

      ejemplos: ejemplos[0]?.contar_ejemplos ?? 0,
    };
  },
});
