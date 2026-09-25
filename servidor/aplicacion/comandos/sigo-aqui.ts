import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * «Sigo aquí» (23-sep-2026, migración 0042).
 *
 * Lo manda la app mientras está abierta y a la vista, cada poco, y una vez más al
 * esconderse con `a_la_vista: false`. De aquí sale el «en línea» de Equipo y de
 * quién tiene acceso: solo sale en línea quien tiene la app delante, no quien tiene
 * una sesión abierta en un teléfono que está en el bolsillo.
 *
 * Solo toca **la sesión con la que se llama**: cada aparato dice lo suyo, y nadie
 * puede decir que otro está en línea.
 *
 * No se recuerda (`sinRecordar`): repetirlo es lo mismo que mandarlo una vez. Y para
 * no escribir por escribir, si llega otro con lo mismo antes de veinte segundos no
 * se toca la fila.
 */
export const sigoAqui = comando<{ a_la_vista: boolean }, { apuntado: boolean }>({
  nombre: 'sigo_aqui',
  // Sin pagar también (0048): es de la persona, o hace falta para pagar o irse.
  sinPagar: true,
  entrada: z.object({ a_la_vista: z.boolean() }).strict(),
  sinRecordar: true,
  // No se abre ninguna otra puerta: una visita de demostración no escribe nada
  // (M5), y la app no lo manda desde ahí.

  async ejecutar(contexto, entrada) {
    const { sql, sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<{ id: string }[]>`
      update estook.sesion
         set visto_en = now(),
             a_la_vista = ${entrada.a_la_vista}
       where id = ${sesion.id}
         and cerrada_en is null
         and (
           visto_en is null
           or a_la_vista <> ${entrada.a_la_vista}
           or visto_en < now() - interval '20 seconds'
         )
      returning id
    `;
    return { apuntado: filas.length > 0 };
  },
});
