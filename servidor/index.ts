import { crearApi } from './api/index.ts';
import { crearDespachador, type Puertos } from './aplicacion/index.ts';
import { almacenDeSupabase } from './infraestructura/almacen.ts';
import { anotar, recordar } from './infraestructura/idempotencia.ts';
import { enTransaccion } from './infraestructura/postgres.ts';

/**
 * El punto donde se juntan las capas (M2).
 *
 * **Este es el unico fichero del servidor que conoce a las tres a la vez.** La
 * API no sabe que hay Postgres detras, y la capa de aplicacion habla con puertos.
 * Aqui se enchufa lo de verdad, y solo aqui.
 *
 * Es lo que permite que la regla de dependencias de A4 se cumpla de verdad en vez
 * de ser un comentario: `api -> aplicacion -> dominio`, con la infraestructura
 * implementando puertos y sin que nadie la importe desde arriba.
 *
 * En M2 la API todavia no se despliega: no hay a quien servir hasta que M3 haga
 * las pantallas y M4 el login. Lo que hay aqui esta montado, probado y listo para
 * arrancar el dia que haga falta.
 */

/**
 * Donde acaban los ficheros (M5).
 *
 * Se resuelve **una vez**, al arrancar la funcion, y no en cada peticion: firmar
 * un enlace no necesita estado y crear el cliente en cada llamada seria trabajo
 * para nada.
 *
 * Nulo si no hay credenciales de Supabase. Entonces subir un logo contesta «no
 * hay donde guardarlo», que es la verdad, en vez de romperse a mitad.
 */
const almacen = almacenDeSupabase();

const puertos: Puertos = {
  enTransaccion: (quien, hacer) =>
    enTransaccion(quien, (sql, sesion) =>
      hacer({
        sql,
        // Desde M4 no lo dice el cliente: sale de resolver el token de sesion
        // dentro de la transaccion, con el disfraz de `estook_api` ya puesto.
        personaId: sesion?.personaId ?? null,
        sesion,
        almacen,
        correlacionId: quien.correlacionId,
        // El instante lo pone el servidor, nunca el navegador (regla 10).
        ahora: new Date(Date.now()),
      }),
    ),

  recordar: async (contexto, clave, comando, entrada) => {
    const recuerdo = await recordar(contexto.sql, clave, comando, entrada);
    return recuerdo.estado === 'repetida'
      ? { estado: 'repetida' as const, respuesta: recuerdo.respuesta }
      : { estado: recuerdo.estado };
  },

  anotar: async (contexto, clave, comando, entrada, respuesta) => {
    // La organizacion sale de quien pregunta, nunca de lo que manda el cliente.
    const organizaciones = await contexto.sql<{ organizacion_id: string }[]>`
      select organizacion_id from estook.organizaciones_visibles() limit 1
    `;
    const laOrganizacion = organizaciones[0]?.organizacion_id;
    if (!laOrganizacion) return;

    await anotar(
      contexto.sql,
      clave,
      comando,
      entrada,
      laOrganizacion,
      contexto.personaId,
      respuesta,
      200,
    );
  },
};

export const despachador = crearDespachador(puertos);
export const api = crearApi(despachador);

export { crearApi } from './api/index.ts';
export { crearDespachador } from './aplicacion/index.ts';
export type { Puertos, Despachador, Resultado } from './aplicacion/index.ts';
