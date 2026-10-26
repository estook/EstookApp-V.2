import { z } from 'zod';
import {
  COSAS_DE_LA_SALA,
  FORMAS_DE_MESA,
  PLANTILLAS_DE_SALA,
  dentroDelPlano,
  elNombreDeLaSiguiente,
  esUnaMesa,
  loQuePoneLaPlantilla,
  tamanoDeLaCosa,
  tamanoDeLaMesa,
  type Caja,
} from '@estook/dominio';
import { tocarElServicio } from '../al-segundo.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';
import { soloEnLaCaja } from './aparatos.ts';

/**
 * **El plano del local, dibujado en Estook TPV, a ojo** (T2 · La sala, decisión 0110;
 * Anexo 11.9). Hasta T2 se dibujaba en Estook › Tu sala; desde T2, en el TPV, en la caja
 * o en la tablet, con el permiso de los Ajustes del TPV (Roles 1.12). **Ni un número de
 * centímetros**: todo va en las unidades del plano (1000 × 1000), y el tamaño de una mesa
 * sale de sus plazas si nadie la estira.
 *
 *   crear_zona_de_sala · cambiar_zona_de_sala · ordenar_las_salas · archivar_zona_de_sala
 *                              las salas, en pestañas; una con mesas abiertas no se quita
 *   crear_mesa · cambiar_mesa · archivar_mesa
 *                              la mesa nueva nace con el número siguiente y su tamaño
 *   crear_cosa_de_la_sala · cambiar_cosa_de_la_sala · quitar_cosa_de_la_sala
 *                              la barra, las paredes, las columnas, las puertas…
 *   colocar_en_el_plano        mover, estirar y girar varias a la vez, al soltar
 *   empezar_con_una_plantilla  «Bar con barra y 6 mesas», «Restaurante de 12»…
 *
 * **Se puede tocar en pleno servicio**: mover una mesa abierta no toca su cuenta; quitarla,
 * no se puede. Nada se borra: una cuenta vieja sigue diciendo en qué mesa estuvo.
 */

const id = z.string().uuid();
const nombreDeZona = z.string().trim().min(1).max(40);
const nombreDeMesa = z.string().trim().min(1).max(20);
const enElPlano = z.number().int().min(0).max(1000);
const medida = z.number().int().min(14).max(1000);
const giro = z.number().int().min(0).max(359);
const forma = z.enum(FORMAS_DE_MESA);
const cosa = z.enum(COSAS_DE_LA_SALA);
const texto = z.string().trim().min(1).max(40);

/** Las puertas de todo lo de aquí: se dibuja en la caja o en la tablet, con su permiso. */
const DEL_TPV = {
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],
} as const;

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'zona_de_sala' | 'mesa' | 'elemento_de_sala',
  entidadId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${entidadId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

/** El nombre ya lo lleva otra sala o mesa sin archivar del local. */
function yaExiste(error: unknown, que: string): never {
  if ((error as { code?: string }).code === '23505') {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: `Ya hay ${que} con ese nombre: ponle otro.`,
    });
  }
  throw error;
}

/** El local del aparato, y que sea la caja (Anexo 11.9; 0115: los ajustes, en la caja). */
function elLocalDelDibujo(contexto: Contexto): string {
  soloEnLaCaja(contexto);
  return elLocalDelServicio(contexto);
}

async function laZona(
  contexto: Contexto,
  localId: string,
  zonaId: string,
): Promise<{ id: string; nombre: string }> {
  const filas = await contexto.sql<{ id: string; nombre: string }[]>`
    select id::text as id, nombre from estook.zona_de_sala
     where id = ${zonaId}::uuid and local_id = ${localId}::uuid and archivada_en is null
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa sala no está en este local.' });
  }
  return filas[0];
}

interface MesaDelPlano {
  id: string;
  nombre: string;
  forma: z.infer<typeof forma>;
  plazas: number;
  x: number;
  y: number;
  ancho: number | null;
  fondo: number | null;
}

async function laMesaDelPlano(
  contexto: Contexto,
  localId: string,
  mesaId: string,
): Promise<MesaDelPlano> {
  const filas = await contexto.sql<MesaDelPlano[]>`
    select id::text as id, nombre, forma, plazas, x, y, ancho, fondo from estook.mesa
     where id = ${mesaId}::uuid and local_id = ${localId}::uuid and archivada_en is null
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Esa mesa no está en el plano de este local.',
    });
  }
  return filas[0];
}

interface CosaDelPlano {
  id: string;
  tipo: z.infer<typeof cosa>;
  x: number;
  y: number;
  ancho: number;
  fondo: number;
}

async function laCosaDelPlano(
  contexto: Contexto,
  localId: string,
  cosaId: string,
): Promise<CosaDelPlano> {
  const filas = await contexto.sql<CosaDelPlano[]>`
    select id::text as id, tipo, x, y, ancho, fondo from estook.elemento_de_sala
     where id = ${cosaId}::uuid and local_id = ${localId}::uuid and archivado_en is null
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Eso ya no está en el plano.' });
  }
  return filas[0];
}

/** Los nombres de las mesas del local, de todas sus salas: la 6 es una sola. */
async function losNombresDeLasMesas(contexto: Contexto, localId: string): Promise<string[]> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.mesa where local_id = ${localId}::uuid and archivada_en is null
  `;
  return filas.map((f) => f.nombre);
}

async function ningunaAbierta(
  contexto: Contexto,
  mesas: { zona_id?: string; mesa_id?: string },
): Promise<void> {
  const abiertas = await contexto.sql<{ nombre: string }[]>`
    select m.nombre from estook.cuenta c join estook.mesa m on m.id = c.mesa_id
     where c.liberada_en is null and c.anulada_en is null
       and (m.zona_id = ${mesas.zona_id ?? null}::uuid or m.id = ${mesas.mesa_id ?? null}::uuid)
     order by m.nombre
  `;
  if (abiertas.length > 0) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: `La mesa ${abiertas.map((m) => m.nombre).join(', ')} está abierta: libérala antes.`,
    });
  }
}

// ═══ Las salas ════════════════════════════════════════════════════════════════

async function crearLaSala(contexto: Contexto, localId: string, nombre: string): Promise<string> {
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.zona_de_sala (local_id, nombre, orden)
    select ${localId}::uuid, ${nombre}, coalesce(max(orden), -1) + 1
      from estook.zona_de_sala where local_id = ${localId}::uuid and archivada_en is null
    returning id::text as id
  `.catch((e: unknown) => yaExiste(e, 'una sala'));
  const zonaId = (filas[0] as { id: string }).id;
  await anotar(contexto, 'crear', 'zona_de_sala', zonaId, localId, { nombre });
  return zonaId;
}

export const crearZonaDeSala = comando<{ nombre: string }, { zonaId: string }>({
  nombre: 'crear_zona_de_sala',
  entrada: z.object({ nombre: nombreDeZona }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const zonaId = await crearLaSala(contexto, localId, entrada.nombre);
    await tocarElServicio(contexto, localId);
    return { zonaId };
  },
});

export const cambiarZonaDeSala = comando<
  { zona_id: string; nombre?: string | undefined; orden?: number | undefined },
  { zonaId: string }
>({
  nombre: 'cambiar_zona_de_sala',
  entrada: z
    .object({
      zona_id: id,
      nombre: nombreDeZona.optional(),
      orden: z.number().int().min(0).max(99).optional(),
    })
    .strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    await contexto.sql`
      update estook.zona_de_sala
         set nombre = ${entrada.nombre ?? zona.nombre},
             orden = coalesce(${entrada.orden ?? null}::integer, orden)
       where id = ${zona.id}::uuid
    `.catch((e: unknown) => yaExiste(e, 'una sala'));
    await anotar(contexto, 'cambiar', 'zona_de_sala', zona.id, localId, {
      ...(entrada.nombre === undefined ? {} : { nombre: entrada.nombre }),
      ...(entrada.orden === undefined ? {} : { orden: entrada.orden }),
    });
    await tocarElServicio(contexto, localId);
    return { zonaId: zona.id };
  },
});

/** **Ordenar las salas arrastrando sus pestañas** (Anexo 11.9): se dice el orden entero. */
export const ordenarLasSalas = comando<{ zonas: string[] }, { ordenadas: number }>({
  nombre: 'ordenar_las_salas',
  entrada: z.object({ zonas: z.array(id).min(1).max(40) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    let orden = 0;
    for (const zonaId of entrada.zonas) {
      const zona = await laZona(contexto, localId, zonaId);
      await contexto.sql`update estook.zona_de_sala set orden = ${orden} where id = ${zona.id}::uuid`;
      orden += 1;
    }
    await tocarElServicio(contexto, localId);
    return { ordenadas: orden };
  },
});

export const archivarZonaDeSala = comando<{ zona_id: string }, { zonaId: string }>({
  nombre: 'archivar_zona_de_sala',
  entrada: z.object({ zona_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    await ningunaAbierta(contexto, { zona_id: zona.id });
    const ahora = contexto.ahora.toISOString();
    await contexto.sql`
      update estook.mesa set archivada_en = ${ahora}::timestamptz
       where zona_id = ${zona.id}::uuid and archivada_en is null
    `;
    await contexto.sql`
      update estook.elemento_de_sala set archivado_en = ${ahora}::timestamptz
       where zona_id = ${zona.id}::uuid and archivado_en is null
    `;
    await contexto.sql`
      update estook.zona_de_sala set archivada_en = ${ahora}::timestamptz where id = ${zona.id}::uuid
    `;
    await anotar(contexto, 'archivar', 'zona_de_sala', zona.id, localId, { nombre: zona.nombre });
    await tocarElServicio(contexto, localId);
    return { zonaId: zona.id };
  },
});

// ═══ Las mesas ════════════════════════════════════════════════════════════════

async function ponerLaMesa(
  contexto: Contexto,
  localId: string,
  zonaId: string,
  mesa: {
    nombre: string;
    plazas: number;
    forma: z.infer<typeof forma>;
    caja: Caja;
    estirada: boolean;
    giro: number;
  },
): Promise<string> {
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.mesa (local_id, zona_id, nombre, plazas, forma, x, y, ancho, fondo, giro)
    values (
      ${localId}::uuid, ${zonaId}::uuid, ${mesa.nombre}, ${mesa.plazas}, ${mesa.forma},
      ${mesa.caja.x}, ${mesa.caja.y},
      ${mesa.estirada ? mesa.caja.ancho : null}::smallint,
      ${mesa.estirada ? mesa.caja.fondo : null}::smallint,
      ${mesa.giro}
    )
    returning id::text as id
  `.catch((e: unknown) => yaExiste(e, 'una mesa'));
  return (filas[0] as { id: string }).id;
}

export const entradaCrearMesa = z
  .object({
    zona_id: id,
    /** Sin nombre, **el número siguiente** de las que hay en el local (Anexo 11.9). */
    nombre: nombreDeMesa.optional(),
    plazas: z.number().int().min(1).max(50).optional(),
    forma: forma.optional(),
    x: enElPlano.optional(),
    y: enElPlano.optional(),
    /** Sin ancho ni fondo, el que le toca por sus plazas. */
    ancho: medida.optional(),
    fondo: medida.optional(),
    giro: giro.optional(),
  })
  .strict();
export type EntradaCrearMesa = z.infer<typeof entradaCrearMesa>;

export const crearMesa = comando<EntradaCrearMesa, { mesaId: string; nombre: string }>({
  nombre: 'crear_mesa',
  entrada: entradaCrearMesa,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    const laForma = entrada.forma ?? 'cuadrada';
    const plazas = entrada.plazas ?? (laForma === 'taburete' ? 1 : 4);
    const propio = tamanoDeLaMesa(laForma, plazas);
    const estirada = entrada.ancho !== undefined || entrada.fondo !== undefined;
    const caja = dentroDelPlano({
      x: entrada.x ?? 40,
      y: entrada.y ?? 40,
      ancho: entrada.ancho ?? propio.ancho,
      fondo: entrada.fondo ?? propio.fondo,
    });
    const nombre =
      entrada.nombre ?? elNombreDeLaSiguiente(await losNombresDeLasMesas(contexto, localId));
    const mesaId = await ponerLaMesa(contexto, localId, zona.id, {
      nombre,
      plazas,
      forma: laForma,
      caja,
      estirada,
      giro: entrada.giro ?? 0,
    });
    await anotar(contexto, 'crear', 'mesa', mesaId, localId, { nombre, zona: zona.nombre });
    await tocarElServicio(contexto, localId);
    return { mesaId, nombre };
  },
});

export const entradaCambiarMesa = z
  .object({
    mesa_id: id,
    zona_id: id.optional(),
    nombre: nombreDeMesa.optional(),
    plazas: z.number().int().min(1).max(50).optional(),
    forma: forma.optional(),
    x: enElPlano.optional(),
    y: enElPlano.optional(),
    /** Nulo: vuelve al tamaño que le toca por sus plazas. */
    ancho: medida.nullable().optional(),
    fondo: medida.nullable().optional(),
    giro: giro.optional(),
  })
  .strict();
export type EntradaCambiarMesa = z.infer<typeof entradaCambiarMesa>;

export const cambiarMesa = comando<EntradaCambiarMesa, { mesaId: string }>({
  nombre: 'cambiar_mesa',
  entrada: entradaCambiarMesa,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const mesa = await laMesaDelPlano(contexto, localId, entrada.mesa_id);
    if (entrada.zona_id !== undefined) await laZona(contexto, localId, entrada.zona_id);

    // **Al cambiar las plazas o la forma, crece sola** (Anexo 11.9): vuelve al tamaño que
    // le toca, salvo que en la misma orden se diga otro.
    const creceSola =
      (entrada.plazas !== undefined && entrada.plazas !== mesa.plazas) ||
      (entrada.forma !== undefined && entrada.forma !== mesa.forma);
    const laForma = entrada.forma ?? mesa.forma;
    const plazas = entrada.plazas ?? mesa.plazas;
    const propio = tamanoDeLaMesa(laForma, plazas);
    const ancho = entrada.ancho !== undefined ? entrada.ancho : creceSola ? null : mesa.ancho;
    const fondo = entrada.fondo !== undefined ? entrada.fondo : creceSola ? null : mesa.fondo;
    const caja = dentroDelPlano({
      x: entrada.x ?? mesa.x,
      y: entrada.y ?? mesa.y,
      ancho: ancho ?? propio.ancho,
      fondo: fondo ?? propio.fondo,
    });

    await contexto.sql`
      update estook.mesa
         set zona_id = coalesce(${entrada.zona_id ?? null}::uuid, zona_id),
             nombre = coalesce(${entrada.nombre ?? null}, nombre),
             plazas = ${plazas},
             forma = ${laForma},
             x = ${caja.x},
             y = ${caja.y},
             ancho = ${ancho === null ? null : caja.ancho}::smallint,
             fondo = ${fondo === null ? null : caja.fondo}::smallint,
             giro = coalesce(${entrada.giro ?? null}::smallint, giro)
       where id = ${mesa.id}::uuid
    `.catch((e: unknown) => yaExiste(e, 'una mesa'));
    await anotar(contexto, 'cambiar', 'mesa', mesa.id, localId, {
      ...entrada,
      mesa: mesa.nombre,
    });
    await tocarElServicio(contexto, localId);
    return { mesaId: mesa.id };
  },
});

export const archivarMesa = comando<{ mesa_id: string }, { mesaId: string }>({
  nombre: 'archivar_mesa',
  entrada: z.object({ mesa_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const mesa = await laMesaDelPlano(contexto, localId, entrada.mesa_id);
    // **Una mesa abierta no se quita** (Anexo 11.9): se mueve, pero no se borra.
    await ningunaAbierta(contexto, { mesa_id: mesa.id });
    await contexto.sql`
      update estook.mesa set archivada_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${mesa.id}::uuid
    `;
    await anotar(contexto, 'archivar', 'mesa', mesa.id, localId, { nombre: mesa.nombre });
    await tocarElServicio(contexto, localId);
    return { mesaId: mesa.id };
  },
});

// ═══ Lo que hay en la sala y no se abre ═══════════════════════════════════════

async function ponerLaCosa(
  contexto: Contexto,
  localId: string,
  zonaId: string,
  laCosa: {
    tipo: z.infer<typeof cosa>;
    caja: Caja;
    giro: number;
    texto: string | null;
  },
): Promise<string> {
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.elemento_de_sala (local_id, zona_id, tipo, texto, x, y, ancho, fondo, giro)
    values (
      ${localId}::uuid, ${zonaId}::uuid, ${laCosa.tipo},
      ${laCosa.tipo === 'texto' ? (laCosa.texto ?? 'Texto') : null},
      ${laCosa.caja.x}, ${laCosa.caja.y}, ${laCosa.caja.ancho}, ${laCosa.caja.fondo}, ${laCosa.giro}
    )
    returning id::text as id
  `;
  return (filas[0] as { id: string }).id;
}

export const entradaCrearCosa = z
  .object({
    zona_id: id,
    tipo: cosa,
    x: enElPlano.optional(),
    y: enElPlano.optional(),
    ancho: medida.optional(),
    fondo: medida.optional(),
    giro: giro.optional(),
    texto: texto.optional(),
  })
  .strict();

export const crearCosaDeLaSala = comando<z.infer<typeof entradaCrearCosa>, { cosaId: string }>({
  nombre: 'crear_cosa_de_la_sala',
  entrada: entradaCrearCosa,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    const propio = tamanoDeLaCosa(entrada.tipo);
    const caja = dentroDelPlano({
      x: entrada.x ?? 40,
      y: entrada.y ?? 40,
      ancho: entrada.ancho ?? propio.ancho,
      fondo: entrada.fondo ?? propio.fondo,
    });
    const cosaId = await ponerLaCosa(contexto, localId, zona.id, {
      tipo: entrada.tipo,
      caja,
      giro: entrada.giro ?? 0,
      texto: entrada.texto ?? null,
    });
    await anotar(contexto, 'crear', 'elemento_de_sala', cosaId, localId, {
      tipo: entrada.tipo,
      zona: zona.nombre,
    });
    await tocarElServicio(contexto, localId);
    return { cosaId };
  },
});

export const entradaCambiarCosa = z
  .object({
    cosa_id: id,
    zona_id: id.optional(),
    x: enElPlano.optional(),
    y: enElPlano.optional(),
    ancho: medida.optional(),
    fondo: medida.optional(),
    giro: giro.optional(),
    texto: texto.optional(),
  })
  .strict();

export const cambiarCosaDeLaSala = comando<z.infer<typeof entradaCambiarCosa>, { cosaId: string }>({
  nombre: 'cambiar_cosa_de_la_sala',
  entrada: entradaCambiarCosa,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const laCosa = await laCosaDelPlano(contexto, localId, entrada.cosa_id);
    if (entrada.zona_id !== undefined) await laZona(contexto, localId, entrada.zona_id);
    const caja = dentroDelPlano({
      x: entrada.x ?? laCosa.x,
      y: entrada.y ?? laCosa.y,
      ancho: entrada.ancho ?? laCosa.ancho,
      fondo: entrada.fondo ?? laCosa.fondo,
    });
    await contexto.sql`
        update estook.elemento_de_sala
           set zona_id = coalesce(${entrada.zona_id ?? null}::uuid, zona_id),
               x = ${caja.x}, y = ${caja.y}, ancho = ${caja.ancho}, fondo = ${caja.fondo},
               giro = coalesce(${entrada.giro ?? null}::smallint, giro),
               texto = case when tipo = 'texto' then coalesce(${entrada.texto ?? null}, texto) else null end
         where id = ${laCosa.id}::uuid
      `;
    await anotar(contexto, 'cambiar', 'elemento_de_sala', laCosa.id, localId, entrada);
    await tocarElServicio(contexto, localId);
    return { cosaId: laCosa.id };
  },
});

export const quitarCosaDeLaSala = comando<{ cosa_id: string }, { cosaId: string }>({
  nombre: 'quitar_cosa_de_la_sala',
  entrada: z.object({ cosa_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const laCosa = await laCosaDelPlano(contexto, localId, entrada.cosa_id);
    await contexto.sql`
      update estook.elemento_de_sala set archivado_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${laCosa.id}::uuid
    `;
    await anotar(contexto, 'archivar', 'elemento_de_sala', laCosa.id, localId, {
      tipo: laCosa.tipo,
    });
    await tocarElServicio(contexto, localId);
    return { cosaId: laCosa.id };
  },
});

// ═══ Mover, estirar y girar varias a la vez ═══════════════════════════════════

const unaColocacion = z
  .object({
    mesa_id: id.optional(),
    cosa_id: id.optional(),
    x: enElPlano,
    y: enElPlano,
    ancho: medida.optional(),
    fondo: medida.optional(),
    giro: giro.optional(),
  })
  .strict()
  .refine((c) => (c.mesa_id === undefined) !== (c.cosa_id === undefined), {
    message: 'Cada una es una mesa o una cosa de la sala, y solo una.',
  });

/**
 * **Lo que se suelta, se guarda** (Anexo 11.9): una orden con todo lo que se ha movido,
 * estirado o girado de una vez —una mesa, o varias elegidas a la vez—, en una sola
 * transacción, para que deshacer las devuelva todas juntas. **Mover una mesa abierta no
 * toca su cuenta.**
 */
export const colocarEnElPlano = comando<
  { cosas: z.infer<typeof unaColocacion>[] },
  { colocadas: number }
>({
  nombre: 'colocar_en_el_plano',
  entrada: z.object({ cosas: z.array(unaColocacion).min(1).max(100) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    for (const c of entrada.cosas) {
      if (c.mesa_id !== undefined) {
        const mesa = await laMesaDelPlano(contexto, localId, c.mesa_id);
        const propio = tamanoDeLaMesa(mesa.forma, mesa.plazas);
        const ancho = c.ancho ?? mesa.ancho;
        const fondo = c.fondo ?? mesa.fondo;
        const caja = dentroDelPlano({
          x: c.x,
          y: c.y,
          ancho: ancho ?? propio.ancho,
          fondo: fondo ?? propio.fondo,
        });
        await contexto.sql`
          update estook.mesa
             set x = ${caja.x}, y = ${caja.y},
                 ancho = ${ancho === null ? null : caja.ancho}::smallint,
                 fondo = ${fondo === null ? null : caja.fondo}::smallint,
                 giro = coalesce(${c.giro ?? null}::smallint, giro)
           where id = ${mesa.id}::uuid
        `;
      } else if (c.cosa_id !== undefined) {
        const laCosa = await laCosaDelPlano(contexto, localId, c.cosa_id);
        const caja = dentroDelPlano({
          x: c.x,
          y: c.y,
          ancho: c.ancho ?? laCosa.ancho,
          fondo: c.fondo ?? laCosa.fondo,
        });
        await contexto.sql`
          update estook.elemento_de_sala
             set x = ${caja.x}, y = ${caja.y}, ancho = ${caja.ancho}, fondo = ${caja.fondo},
                 giro = coalesce(${c.giro ?? null}::smallint, giro)
           where id = ${laCosa.id}::uuid
        `;
      }
    }
    await tocarElServicio(contexto, localId);
    return { colocadas: entrada.cosas.length };
  },
});

// ═══ Empezar con una plantilla ════════════════════════════════════════════════

export const empezarConUnaPlantilla = comando<
  { plantilla: string },
  { zonaId: string; mesas: number }
>({
  nombre: 'empezar_con_una_plantilla',
  entrada: z
    .object({
      plantilla: z.enum(PLANTILLAS_DE_SALA.map((p) => p.clave) as [string, ...string[]]),
    })
    .strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelDibujo(contexto);
    const plantilla = PLANTILLAS_DE_SALA.find((p) => p.clave === entrada.plantilla);
    if (plantilla === undefined) throw new FalloDeAplicacion('no_existe');

    // **Una sala nueva**, con el nombre de la plantilla; si ya hay una así, «Terraza 2».
    const salas = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.zona_de_sala where local_id = ${localId}::uuid and archivada_en is null
    `;
    const ocupadas = new Set(salas.map((s) => s.nombre.trim().toLowerCase()));
    let nombre = plantilla.sala;
    for (let n = 2; ocupadas.has(nombre.toLowerCase()); n++)
      nombre = `${plantilla.sala} ${String(n)}`;
    const zonaId = await crearLaSala(contexto, localId, nombre);

    let mesas = 0;
    for (const puesto of loQuePoneLaPlantilla(
      plantilla,
      await losNombresDeLasMesas(contexto, localId),
    )) {
      if (esUnaMesa(puesto.que)) {
        await ponerLaMesa(contexto, localId, zonaId, {
          nombre: puesto.nombre ?? String(mesas + 1),
          plazas: puesto.plazas ?? 4,
          forma: puesto.que,
          caja: puesto.caja,
          estirada: false,
          giro: puesto.giro,
        });
        mesas += 1;
      } else {
        await ponerLaCosa(contexto, localId, zonaId, {
          tipo: puesto.que,
          caja: puesto.caja,
          giro: puesto.giro,
          texto: puesto.texto,
        });
      }
    }
    await anotar(contexto, 'plantilla', 'zona_de_sala', zonaId, localId, {
      plantilla: plantilla.nombre,
      mesas,
    });
    await tocarElServicio(contexto, localId);
    return { zonaId, mesas };
  },
});
