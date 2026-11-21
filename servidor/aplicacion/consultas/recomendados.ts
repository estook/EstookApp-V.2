import { z } from 'zod';
import { comoSeVeLaSeccion, type ColorDeLaBotonera, type IconoDeLaSeccion } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';

/**
 * **Los recomendados** · «Para recomendar» en el Panel (el rediseño, entrega 3; 0120).
 *
 * Lo que la casa recomienda, para que quien atiende lo ofrezca sin abrir la Carta. **Lo agotado no
 * sale** (Richi, 21-nov): recomendar lo que no hay es mandar al camarero a quedar mal.
 *
 * Lo lee cualquiera del local (`app.panel`): la cocina también lo tiene en su catálogo, y los
 * platos de la carta los puede leer todo el local (la base, `plato_lectura`). Sin precios de
 * compra ni nada que no salga en la carta pública.
 */
export interface UnRecomendado {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
  /** Con IVA, el de sala. */
  readonly precioCentimos: number | null;
  readonly foto: string | null;
}

export interface LosRecomendados {
  readonly platos: readonly UnRecomendado[];
  /** Los agotados que están recomendados: se dicen aparte, «hoy no queda». */
  readonly agotados: number;
  /** Si quien mira puede marcar recomendados (edita la Carta): «Elegir en la Carta». */
  readonly puedeElegir: boolean;
}

export const losRecomendados = consulta<Record<string, never>, LosRecomendados>({
  nombre: 'los_recomendados',
  entrada: z.object({}).strict(),
  exige: 'app.panel',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const [filas, puede] = await Promise.all([
      contexto.sql<
        {
          id: string;
          nombre: string;
          seccion: string | null;
          color: ColorDeLaBotonera | null;
          icono: IconoDeLaSeccion | null;
          precio: number | null;
          clave: string | null;
          agotado: boolean;
        }[]
      >`
        select p.id::text as id, p.nombre, s.nombre as seccion, s.color, s.icono,
               p.precio_centimos as precio, coalesce(p.miniatura_clave, p.foto_clave) as clave,
               exists (
                 select 1 from estook.plato_agotado a
                  where a.plato_id = p.id and a.hasta > ${contexto.ahora.toISOString()}::timestamptz
               ) as agotado
          from estook.plato p
          left join estook.seccion_de_carta s on s.id = p.seccion_id
         where p.local_id = ${localId}::uuid and p.recomendado and p.activo
         order by s.orden nulls last, p.orden, p.nombre
      `,
      contexto.sql<{ puede: boolean }[]>`
        select estook.puede_editar('app.carta', ${localId}::uuid) as puede
      `,
    ]);
    const quedan = filas.filter((f) => !f.agotado);
    const firmadas = await firmarLasFotos(
      contexto,
      quedan.map((f) => f.clave),
    );
    return {
      platos: quedan.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        seccion: f.seccion,
        ...comoSeVeLaSeccion({
          nombre: f.seccion ?? f.nombre,
          color: f.color,
          icono: f.icono,
        }),
        precioCentimos: f.precio,
        foto: laFirmada(firmadas, f.clave),
      })),
      agotados: filas.length - quedan.length,
      puedeElegir: puede[0]?.puede === true,
    };
  },
});
