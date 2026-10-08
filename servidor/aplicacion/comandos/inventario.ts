import { z } from 'zod';
import {
  NOMBRE_DE_LA_ZONA,
  QUE_HAGO_CON_LO_QUE_FALTA,
  ZONAS,
  avisoDeInventarioContado,
  avisoDeRecontar,
  type Zona,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion, elLocalDeLaSesion } from '../alta.ts';
import { avisar, quienesPuedenRecibir } from '../avisos.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import {
  cerrarElInventario,
  elInventarioPorCerrar,
  guardarLoContado,
  ponerLoContadoOtraVez,
  type Cerrado,
} from '../inventario.ts';
import { productosActivos } from '../consultas/almacen.ts';

/**
 * Contar y cerrar, en dos pasos (M8 · decisión 0078, 2A).
 *
 *   enviar_lo_contado        quien lleva el almacén —el cocinero también— manda lo contado
 *   cerrar_inventario        quien tiene «Cerrar un inventario» lo da por bueno
 *   pedir_que_lo_recuenten   o pide que se vuelvan a contar unas líneas
 *   recontar                 y quien contó las vuelve a contar
 *   descartar_inventario     o lo descarta, con su porqué
 *   usar_el_minimo_calculado aceptar el mínimo que propone Estook (3A)
 *
 * Contar y cerrar a la vez sigue siendo `cerrar_recuento`, que por debajo hace lo
 * mismo: guardar y cerrar al momento.
 */

const lineaContada = z
  .object({
    producto_id: z.string().uuid(),
    hay: z.number().min(0).max(10_000_000),
    formatos: z.number().min(0).max(1_000_000).nullable().optional(),
    sueltas: z.number().min(0).max(10_000_000).nullable().optional(),
  })
  .strict();

type LineaQueLlega = z.infer<typeof lineaContada>;

function comoLineas(lineas: readonly LineaQueLlega[]) {
  return lineas.map((l) => ({
    productoId: l.producto_id,
    hay: l.hay,
    formatos: l.formatos ?? null,
    sueltas: l.sueltas ?? null,
  }));
}

async function suNombre(contexto: Contexto): Promise<string | null> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${contexto.personaId}
  `;
  return filas[0]?.nombre ?? null;
}

/** El enlace que abre un inventario para cerrarlo. */
function aSuInventario(inventarioId: string): string {
  return `/almacen/movimientos/inventario?inventario=${inventarioId}`;
}

// ── Mandar lo contado ───────────────────────────────────────────────────────

export const entradaEnviarLoContado = z
  .object({
    /** Doscientos como mucho por vuelta, como el cierre de siempre. */
    lineas: z.array(lineaContada).min(1).max(200),
    zona: z.enum(ZONAS).nullable().optional(),
    notas: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaEnviarLoContado = z.infer<typeof entradaEnviarLoContado>;

export interface SalidaEnviarLoContado {
  readonly inventarioId: string;
  readonly contados: number;
  /** A cuántos les ha llegado el aviso de que hay algo para cerrar. */
  readonly avisados: number;
}

export const enviarLoContado = comando<EntradaEnviarLoContado, SalidaEnviarLoContado>({
  nombre: 'enviar_lo_contado',
  entrada: entradaEnviarLoContado,
  // Contar lo hace quien lleva el almacén: el cocinero también (2A). Cerrar, no.
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const zona = entrada.zona ?? null;

    const guardado = await guardarLoContado(contexto, {
      zona,
      lineas: comoLineas(entrada.lineas),
      notas: entrada.notas ?? null,
    });

    // A quien cierra: hay algo para mirar.
    const quien = await suNombre(contexto);
    const avisados = await avisar(
      contexto,
      {
        tipo: 'inventario.contado',
        organizacionId,
        localId,
        clave: guardado.inventarioId,
        texto: (quienes) =>
          avisoDeInventarioContado(
            quienes,
            zona === null ? null : NOMBRE_DE_LA_ZONA[zona],
            guardado.contados,
            guardado.noCuadran,
          ),
        ir: aSuInventario(guardado.inventarioId),
        quien,
      },
      await quienesPuedenRecibir(contexto, localId, 'inventario.contado'),
    );

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'inventario', ${guardado.inventarioId},
        ${localId}::uuid, null,
        ${JSON.stringify({ contados: guardado.contados, zona })}::text::jsonb, null
      )
    `;

    return { inventarioId: guardado.inventarioId, contados: guardado.contados, avisados };
  },
});

// ── Cerrar un inventario mandado ────────────────────────────────────────────

export const entradaCerrarInventario = z
  .object({
    inventario_id: z.string().uuid(),
    /** Lo que quien cierra ha mirado y corrige: se cuenta con el libro de ahora. */
    correcciones: z.array(lineaContada).max(200).optional(),
    lo_que_falta: z.enum(QUE_HAGO_CON_LO_QUE_FALTA).optional(),
    notas: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaCerrarInventario = z.infer<typeof entradaCerrarInventario>;

export type SalidaCerrarInventario = Cerrado & { readonly inventarioId: string };

export const cerrarInventario = comando<EntradaCerrarInventario, SalidaCerrarInventario>({
  nombre: 'cerrar_inventario',
  entrada: entradaCerrarInventario,
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto, entrada) {
    await elInventarioPorCerrar(contexto, entrada.inventario_id);
    const correcciones = entrada.correcciones ?? [];
    if (correcciones.length > 0) {
      await ponerLoContadoOtraVez(contexto, entrada.inventario_id, comoLineas(correcciones), false);
    }
    const cerrado = await cerrarElInventario(contexto, entrada.inventario_id, {
      loQueFalta: entrada.lo_que_falta ?? 'dejarlo',
      notas: entrada.notas ?? null,
    });
    return { ...cerrado, inventarioId: entrada.inventario_id };
  },
});

// ── Que lo vuelvan a contar ─────────────────────────────────────────────────

export const entradaPedirQueLoRecuenten = z
  .object({
    inventario_id: z.string().uuid(),
    producto_ids: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict();

export type EntradaPedirQueLoRecuenten = z.infer<typeof entradaPedirQueLoRecuenten>;

export const pedirQueLoRecuenten = comando<
  EntradaPedirQueLoRecuenten,
  { readonly pedidos: number }
>({
  nombre: 'pedir_que_lo_recuenten',
  entrada: entradaPedirQueLoRecuenten,
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await elInventarioPorCerrar(contexto, entrada.inventario_id);

    const marcadas = await contexto.sql<{ contado_por: string | null; nombre: string }[]>`
      update estook.linea_de_inventario l
         set recontar = true, recontar_pedido_por = ${contexto.personaId}
        from estook.producto p
       where l.inventario_id = ${entrada.inventario_id}
         and l.producto_id = any (${comoLista(entrada.producto_ids)}::text::uuid[])
         and p.id = l.producto_id
      returning l.contado_por::text as contado_por, p.nombre
    `;

    // A quien los contó, uno por persona: «Vuelve a contar 2 productos».
    const quien = await suNombre(contexto);
    const pueden = await quienesPuedenRecibir(contexto, localId, 'inventario.recontar');
    const porPersona = new Map<string, string[]>();
    for (const fila of marcadas) {
      if (fila.contado_por === null) continue;
      porPersona.set(fila.contado_por, [...(porPersona.get(fila.contado_por) ?? []), fila.nombre]);
    }
    for (const [personaId, nombres] of porPersona) {
      const destinatario = pueden.find((q) => q.personaId === personaId);
      if (destinatario === undefined) continue;
      await avisar(
        contexto,
        {
          tipo: 'inventario.recontar',
          organizacionId,
          localId,
          clave: `${entrada.inventario_id}:${personaId}`,
          texto: () => avisoDeRecontar(nombres, quien),
          ir: aSuInventario(entrada.inventario_id),
          quien,
          como: 'de_nuevo',
        },
        [destinatario],
      );
    }

    return { pedidos: marcadas.length };
  },
});

// ── Volver a contar lo que piden ────────────────────────────────────────────

export const entradaRecontar = z
  .object({
    inventario_id: z.string().uuid(),
    lineas: z.array(lineaContada).min(1).max(200),
  })
  .strict();

export type EntradaRecontar = z.infer<typeof entradaRecontar>;

export const recontar = comando<EntradaRecontar, { readonly recontados: number }>({
  nombre: 'recontar',
  entrada: entradaRecontar,
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const inventario = await elInventarioPorCerrar(contexto, entrada.inventario_id);

    // Solo lo que está pedido: lo demás ya lo dio por bueno quien cierra.
    const recontados = await ponerLoContadoOtraVez(
      contexto,
      entrada.inventario_id,
      comoLineas(entrada.lineas),
      true,
    );
    if (recontados === 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'No hay nada pedido para volver a contar en ese inventario.',
      });
    }

    // Y a quien cierra, que ya lo puede mirar: cuántos de los recontados siguen sin cuadrar.
    const recontadas = await contexto.sql<{ no_cuadran: number }[]>`
      select count(*) filter (where hay <> decia)::int as no_cuadran
        from estook.linea_de_inventario
       where inventario_id = ${entrada.inventario_id}
         and producto_id = any (${comoLista(entrada.lineas.map((l) => l.producto_id))}::text::uuid[])
    `;
    const noCuadran = recontadas[0]?.no_cuadran ?? 0;
    const quien = await suNombre(contexto);
    await avisar(
      contexto,
      {
        tipo: 'inventario.contado',
        organizacionId,
        localId,
        clave: entrada.inventario_id,
        texto: (quienes) =>
          avisoDeInventarioContado(
            quienes,
            inventario.zona === null ? null : NOMBRE_DE_LA_ZONA[inventario.zona as Zona],
            recontados,
            noCuadran,
          ),
        ir: aSuInventario(entrada.inventario_id),
        quien,
        como: 'de_nuevo',
      },
      await quienesPuedenRecibir(contexto, localId, 'inventario.contado'),
    );

    return { recontados };
  },
});

// ── Descartar lo contado ────────────────────────────────────────────────────

export const entradaDescartarInventario = z
  .object({
    inventario_id: z.string().uuid(),
    motivo: z.string().trim().min(1).max(400),
  })
  .strict();

export type EntradaDescartarInventario = z.infer<typeof entradaDescartarInventario>;

export const descartarInventario = comando<
  EntradaDescartarInventario,
  { readonly inventarioId: string }
>({
  nombre: 'descartar_inventario',
  entrada: entradaDescartarInventario,
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await elInventarioPorCerrar(contexto, entrada.inventario_id);
    // No se borra: queda descartado, con quién y por qué. No toca el libro.
    await contexto.sql`
      update estook.inventario
         set estado = 'descartado', motivo_de_descarte = ${entrada.motivo},
             cerrado_por = ${contexto.personaId}
       where id = ${entrada.inventario_id}
    `;
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'inventario', ${entrada.inventario_id},
        ${localId}::uuid, ${JSON.stringify({ estado: 'contado' })}::text::jsonb,
        ${JSON.stringify({ estado: 'descartado' })}::text::jsonb, ${entrada.motivo}
      )
    `;
    return { inventarioId: entrada.inventario_id };
  },
});

// ── El mínimo que propone Estook (3A) ───────────────────────────────────────

export const entradaUsarElMinimoCalculado = z
  .object({ producto_ids: z.array(z.string().uuid()).min(1).max(500) })
  .strict();

export type EntradaUsarElMinimoCalculado = z.infer<typeof entradaUsarElMinimoCalculado>;

/**
 * Pone el mínimo calculado a esos productos y deja que Estook lo rehaga cada lunes.
 *
 * **La cuenta se hace aquí otra vez, no se fía de la pantalla**: el mínimo que se pone
 * es el que sale ahora con lo que se gasta y el reparto, el mismo que se enseña. Si
 * de alguno no se sabe todavía a qué ritmo se gasta, no se toca.
 */
export const usarElMinimoCalculado = comando<
  EntradaUsarElMinimoCalculado,
  { readonly puestos: number; readonly sinDatos: number }
>({
  nombre: 'usar_el_minimo_calculado',
  entrada: entradaUsarElMinimoCalculado,
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const queremos = new Set(entrada.producto_ids);
    const productos = (await productosActivos(contexto, localId)).filter((p) => queremos.has(p.id));

    let puestos = 0;
    let sinDatos = entrada.producto_ids.length - productos.length;
    for (const producto of productos) {
      const calculado = producto.minimoQueCalcula;
      if (calculado === null) {
        sinDatos += 1;
        continue;
      }
      const cambiados = await contexto.sql<{ id: string }[]>`
        update estook.producto
           set minimo = ${calculado.minimo}, minimo_calculado = true, actualizado_en = now()
         where id = ${producto.id} and local_id = ${localId}
        returning id
      `;
      if (cambiados.length === 0) continue;
      puestos += 1;
      await contexto.sql`
        select estook.anotar(
          ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'producto', ${producto.id},
          ${localId}::uuid, ${JSON.stringify({ minimo: producto.minimo })}::text::jsonb,
          ${JSON.stringify({ minimo: calculado.minimo, minimo_calculado: true })}::text::jsonb,
          ${calculado.porque}
        )
      `;
    }

    return { puestos, sinDatos };
  },
});
