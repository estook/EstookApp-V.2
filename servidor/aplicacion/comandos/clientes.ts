import { z } from 'zod';
import { comoCsv, masDias, NOMBRE_DE_LA_ACTIVIDAD, type FechaOperativa } from '@estook/dominio';
import { huellaDeToken, tokenNuevo } from '../../dominio/secretos.ts';
import { anotarEnElAdmin, comprobarMiCodigo } from '../admin.ts';
import { hacerLaFotoDelUso } from '../clientes.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  correoDeAvisoAlDeAhora,
  correoParaConfirmarElNuevo,
  enlaceDelCambioDeCorreo,
} from '../correos.ts';
import { aplicarLoDeStripe, cambiarLaSuscripcion, conStripe, hoyEnMadrid } from '../pago.ts';
import {
  entradaLosClientes,
  losClientes,
  losQueCaben,
  ordenar,
  type ClienteEnLista,
} from '../consultas/clientes.ts';
import { estaEnLaPestana } from '@estook/dominio';

/**
 * Lo que el admin hace con un cliente (A2 · 0041, y lo que decidió Richi el 25-sep).
 *
 * **Todo deja rastro dos veces**: en la auditoría del admin, y —si toca al
 * cliente— en la del cliente, que lo ve (Roles 4.3). **Lo delicado pide motivo**; y
 * cambiar el correo de acceso o exportar, además, **el código otra vez**.
 *
 * De la suscripción, **tres gestos y nada más** (Richi): alargar la prueba, marcar de
 * la casa y cancelar al acabar el periodo. El plan lo cambia el cliente, y lo raro
 * —devolver un cobro— se hace en Stripe, con el enlace de su ficha.
 */

const motivo = z.string().trim().min(3, 'Di por qué, en unas palabras.').max(500);
const organizacion = z.string().uuid();

/** El cliente, leído como lo ve la lista: el contrato ya contado. */
async function elCliente(contexto: Contexto, organizacionId: string): Promise<ClienteEnLista> {
  const { clientes } = await losClientes(contexto);
  const cliente = clientes.find((c) => c.organizacionId === organizacionId);
  if (cliente === undefined)
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está.' });
  return cliente;
}

/** Lo que el admin hace sobre un cliente, también en la auditoría del cliente. */
async function anotarEnElCliente(
  contexto: Contexto,
  organizacionId: string,
  linea: {
    accion: string;
    entidad: string;
    antes?: Record<string, unknown> | null;
    despues?: Record<string, unknown> | null;
    motivo?: string | null;
  },
): Promise<void> {
  await contexto.sql`
    select estook.anotar_desde_el_admin(
      ${organizacionId}::uuid, ${linea.accion}, ${linea.entidad}, ${organizacionId},
      ${linea.antes === undefined || linea.antes === null ? null : JSON.stringify(linea.antes)}::text::jsonb,
      ${linea.despues === undefined || linea.despues === null ? null : JSON.stringify(linea.despues)}::text::jsonb,
      ${linea.motivo ?? null}
    )
  `;
}

function quienSoy(contexto: Contexto): string {
  return `admin:${contexto.personaId ?? ''}`;
}

// ── La ficha comercial ───────────────────────────────────────────────────────

export const entradaFichaComercial = z
  .object({
    organizacion_id: organizacion,
    responsable: z.string().trim().max(160).nullable(),
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+ ()-]{7,24}$/, 'Un teléfono son cifras, espacios, + y guiones.')
      .nullable(),
    correo: z
      .string()
      .trim()
      .toLowerCase()
      .email('Ese correo no parece un correo.')
      .max(320)
      .nullable(),
    tipo: z.enum(['independiente', 'grupo', 'cadena']).nullable(),
  })
  .strict();

export type EntradaFichaComercial = z.infer<typeof entradaFichaComercial>;

export const adminGuardarLaFichaComercial = comando<EntradaFichaComercial, { guardada: true }>({
  nombre: 'admin_guardar_la_ficha_comercial',
  entrada: entradaFichaComercial,
  soloAdmin: true,

  async ejecutar(contexto, e) {
    await elCliente(contexto, e.organizacion_id);
    const antes = await contexto.sql<Record<string, unknown>[]>`
      select responsable, telefono, correo, tipo from plataforma.ficha_comercial
       where organizacion_id = ${e.organizacion_id}
    `;
    await contexto.sql`
      insert into plataforma.ficha_comercial (
        organizacion_id, responsable, telefono, correo, tipo, actualizado_en, actualizado_por
      )
      values (
        ${e.organizacion_id}, ${e.responsable}, ${e.telefono}, ${e.correo}, ${e.tipo}, now(),
        ${contexto.personaId}
      )
      on conflict (organizacion_id) do update set
        responsable = excluded.responsable, telefono = excluded.telefono, correo = excluded.correo,
        tipo = excluded.tipo, actualizado_en = now(), actualizado_por = excluded.actualizado_por
    `;
    await anotarEnElAdmin(contexto, {
      accion: 'editar',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: antes[0] ?? null,
      despues: { responsable: e.responsable, telefono: e.telefono, correo: e.correo, tipo: e.tipo },
    });
    return { guardada: true };
  },
});

// ── El nombre, que es del cliente: con motivo, y se le dice ─────────────────

export const adminCambiarElNombre = comando<
  { organizacion_id: string; nombre: string; motivo: string },
  { antes: string }
>({
  nombre: 'admin_cambiar_el_nombre',
  entrada: z
    .object({ organizacion_id: organizacion, nombre: z.string().trim().min(2).max(120), motivo })
    .strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const [fila] = await contexto.sql<{ antes: string }[]>`
      select estook.renombrar_desde_el_admin(${e.organizacion_id}::uuid, ${e.nombre}) as antes
    `;
    const antes = fila?.antes ?? '';
    await anotarEnElAdmin(contexto, {
      accion: 'editar',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { nombre: antes },
      despues: { nombre: e.nombre },
      motivo: e.motivo,
    });
    await anotarEnElCliente(contexto, e.organizacion_id, {
      accion: 'modificar',
      entidad: 'organizacion',
      antes: { nombre: antes },
      despues: { nombre: e.nombre, por: 'Estook' },
      motivo: e.motivo,
    });
    return { antes };
  },
});

// ── Las notas ────────────────────────────────────────────────────────────────

export const adminEscribirUnaNota = comando<
  { organizacion_id: string; texto: string },
  { notaId: number }
>({
  nombre: 'admin_escribir_una_nota',
  entrada: z
    .object({ organizacion_id: organizacion, texto: z.string().trim().min(1).max(2000) })
    .strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    await elCliente(contexto, e.organizacion_id);
    const [nota] = await contexto.sql<{ id: string }[]>`
      insert into plataforma.nota_de_cliente (organizacion_id, autor_id, texto)
      values (${e.organizacion_id}, ${contexto.personaId}, ${e.texto})
      returning id::text as id
    `;
    await anotarEnElAdmin(contexto, {
      accion: 'anotar',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      despues: { nota: nota?.id ?? null },
    });
    return { notaId: Number(nota?.id ?? 0) };
  },
});

export const adminFijarUnaNota = comando<{ nota_id: number; fijada: boolean }, { fijada: boolean }>(
  {
    nombre: 'admin_fijar_una_nota',
    entrada: z.object({ nota_id: z.number().int().positive(), fijada: z.boolean() }).strict(),
    soloAdmin: true,

    async ejecutar(contexto, e) {
      const filas = await contexto.sql<{ organizacion_id: string }[]>`
      update plataforma.nota_de_cliente set fijada = ${e.fijada} where id = ${e.nota_id}
      returning organizacion_id
    `;
      if (filas.length === 0)
        throw new FalloDeAplicacion('no_existe', { porque: 'Esa nota no está.' });
      return { fijada: e.fijada };
    },
  },
);

// ── Los tres gestos de la suscripción ────────────────────────────────────────

/** Alargar la prueba N días: en Stripe si la prueba es suya, y aquí si no. */
export const adminAlargarLaPrueba = comando<
  { organizacion_id: string; dias: number; motivo: string },
  { hasta: string }
>({
  nombre: 'admin_alargar_la_prueba',
  entrada: z
    .object({ organizacion_id: organizacion, dias: z.number().int().min(1).max(60), motivo })
    .strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, e) {
    const cliente = await elCliente(contexto, e.organizacion_id);
    if (cliente.como !== 'prueba' || cliente.pruebaHasta === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Solo se alarga una prueba que está en marcha.',
      });
    }
    const hasta = masDias(cliente.pruebaHasta as FechaOperativa, e.dias);
    const pagos = contexto.pagos;
    const deStripe = cliente.conStripe && pagos !== null && cliente.stripe !== null;

    if (deStripe) {
      const filas = await contexto.sql<{ stripe_suscripcion: string | null }[]>`
        select stripe_suscripcion from estook.los_clientes() where organizacion_id = ${e.organizacion_id}
      `;
      const id = filas[0]?.stripe_suscripcion ?? '';
      const actual = await conStripe(contexto, () => pagos.leerSuscripcion(id));
      const nueva = await conStripe(contexto, () =>
        pagos.cambiarSuscripcion(id, {
          linea: actual.linea,
          // A mediodía de Madrid del último día: la prueba acaba ese día, no el anterior.
          pruebaHasta: new Date(`${hasta}T12:00:00+02:00`),
        }),
      );
      await aplicarLoDeStripe(
        contexto,
        e.organizacion_id,
        nueva,
        pagos.modo,
        quienSoy(contexto),
        `prueba alargada: ${e.motivo}`,
      );
    } else {
      await cambiarLaSuscripcion(
        contexto,
        e.organizacion_id,
        { prueba_hasta: hasta },
        quienSoy(contexto),
        `prueba alargada: ${e.motivo}`,
      );
    }

    const cambio = { pruebaHasta: { antes: cliente.pruebaHasta, ahora: hasta } };
    await anotarEnElAdmin(contexto, {
      accion: 'alargar_la_prueba',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { pruebaHasta: cliente.pruebaHasta },
      despues: { pruebaHasta: hasta, dias: e.dias },
      motivo: e.motivo,
    });
    await anotarEnElCliente(contexto, e.organizacion_id, {
      accion: 'modificar',
      entidad: 'suscripcion',
      antes: { pruebaHasta: cliente.pruebaHasta },
      despues: { pruebaHasta: hasta, por: 'Estook' },
      motivo: e.motivo,
    });
    return { hasta: cambio.pruebaHasta.ahora };
  },
});

/** De la casa: no paga. Solo si no tiene una suscripción que se esté cobrando. */
export const adminDeLaCasa = comando<
  { organizacion_id: string; de_la_casa: boolean; motivo: string },
  { deLaCasa: boolean }
>({
  nombre: 'admin_de_la_casa',
  entrada: z.object({ organizacion_id: organizacion, de_la_casa: z.boolean(), motivo }).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, e) {
    const cliente = await elCliente(contexto, e.organizacion_id);
    if (cliente.deLaCasa === e.de_la_casa) return { deLaCasa: e.de_la_casa };
    if (
      e.de_la_casa &&
      cliente.conStripe &&
      !cliente.cancelaAlAcabar &&
      (cliente.como === 'al_dia' || cliente.como === 'prueba' || cliente.como === 'impago')
    ) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          'Tiene una suscripción que se cobra. Cancélala al acabar el periodo primero, para no cobrarle a alguien que ya no paga.',
      });
    }
    await contexto.sql`
      select estook.poner_de_la_casa(${e.organizacion_id}::uuid, ${e.de_la_casa}, ${e.motivo})
    `;
    await anotarEnElAdmin(contexto, {
      accion: e.de_la_casa ? 'de_la_casa' : 'deja_de_ser_de_la_casa',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { deLaCasa: cliente.deLaCasa },
      despues: { deLaCasa: e.de_la_casa },
      motivo: e.motivo,
    });
    await anotarEnElCliente(contexto, e.organizacion_id, {
      accion: 'modificar',
      entidad: 'suscripcion',
      antes: { deLaCasa: cliente.deLaCasa },
      despues: { deLaCasa: e.de_la_casa, por: 'Estook' },
      motivo: e.motivo,
    });
    return { deLaCasa: e.de_la_casa };
  },
});

/** Cancelar al acabar el periodo, o deshacerlo: en Stripe, que es quien cobra. */
export const adminCancelarAlAcabar = comando<
  { organizacion_id: string; cancelar: boolean; motivo: string },
  { cancelaAlAcabar: boolean }
>({
  nombre: 'admin_cancelar_al_acabar',
  entrada: z.object({ organizacion_id: organizacion, cancelar: z.boolean(), motivo }).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, e) {
    const cliente = await elCliente(contexto, e.organizacion_id);
    const pagos = contexto.pagos;
    if (!cliente.conStripe || pagos === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Este cliente no tiene una suscripción en Stripe que cancelar.',
      });
    }
    const filas = await contexto.sql<{ stripe_suscripcion: string | null }[]>`
      select stripe_suscripcion from estook.los_clientes() where organizacion_id = ${e.organizacion_id}
    `;
    const id = filas[0]?.stripe_suscripcion ?? '';
    const actual = await conStripe(contexto, () => pagos.leerSuscripcion(id));
    const nueva = await conStripe(contexto, () =>
      pagos.cambiarSuscripcion(id, { linea: actual.linea, cancelarAlAcabar: e.cancelar }),
    );
    await aplicarLoDeStripe(
      contexto,
      e.organizacion_id,
      nueva,
      pagos.modo,
      quienSoy(contexto),
      `${e.cancelar ? 'cancela al acabar' : 'sigue'}: ${e.motivo}`,
    );
    await anotarEnElAdmin(contexto, {
      accion: e.cancelar ? 'cancelar_al_acabar' : 'reanudar',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { cancelaAlAcabar: cliente.cancelaAlAcabar },
      despues: { cancelaAlAcabar: nueva.cancelaAlAcabar },
      motivo: e.motivo,
    });
    await anotarEnElCliente(contexto, e.organizacion_id, {
      accion: 'modificar',
      entidad: 'suscripcion',
      antes: { cancelaAlAcabar: cliente.cancelaAlAcabar },
      despues: { cancelaAlAcabar: nueva.cancelaAlAcabar, por: 'Estook' },
      motivo: e.motivo,
    });
    return { cancelaAlAcabar: nueva.cancelaAlAcabar };
  },
});

// ── El correo de acceso, con doble confirmación ─────────────────────────────

/** Lo que tarda en caducar el enlace de confirmar: un día. */
const HORAS_PARA_CONFIRMAR = 24;

export const adminCambiarElCorreo = comando<
  {
    organizacion_id: string;
    persona_id: string;
    correo_nuevo: string;
    motivo: string;
    codigo: string;
  },
  { mandados: true }
>({
  nombre: 'admin_cambiar_el_correo',
  entrada: z
    .object({
      organizacion_id: organizacion,
      persona_id: z.string().uuid(),
      correo_nuevo: z
        .string()
        .trim()
        .toLowerCase()
        .email('Ese correo no parece un correo.')
        .max(320),
      motivo,
      codigo: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'El código son seis cifras.'),
    })
    .strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, e) {
    await comprobarMiCodigo(contexto, e.codigo);
    if (contexto.correo === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque: 'Sin correo no se puede cambiar el correo de nadie: no llegaría la confirmación.',
      });
    }
    const [dentro] = await contexto.sql<
      { datos: { personas: { id: string; nombre: string }[] } }[]
    >`
      select estook.un_cliente(${e.organizacion_id}::uuid) as datos
    `;
    const persona = dentro?.datos.personas.find((p) => p.id === e.persona_id);
    if (persona === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa persona no es de este cliente.' });
    }

    const confirmar = tokenNuevo();
    const parar = tokenNuevo();
    let viejo: string;
    try {
      const [fila] = await contexto.sql<{ viejo: string }[]>`
        select plataforma.pedir_cambio_de_correo(
          ${e.persona_id}::uuid, ${e.correo_nuevo},
          ${await huellaDeToken(confirmar)}, ${await huellaDeToken(parar)},
          ${e.motivo}, ${new Date(contexto.ahora.getTime() + HORAS_PARA_CONFIRMAR * 3_600_000).toISOString()}::timestamptz
        ) as viejo
      `;
      viejo = fila?.viejo ?? '';
    } catch (fallo) {
      if (fallo instanceof Error && /ya es de otra cuenta/.test(fallo.message)) {
        throw new FalloDeAplicacion('ya_hecho', {
          porque: 'Ese correo ya es de otra cuenta de Estook.',
        });
      }
      throw fallo;
    }

    await contexto.correo.mandar(
      correoParaConfirmarElNuevo(
        e.correo_nuevo,
        persona.nombre,
        enlaceDelCambioDeCorreo('confirmar', confirmar),
      ),
    );
    await contexto.correo.mandar(
      correoDeAvisoAlDeAhora(
        viejo,
        persona.nombre,
        e.correo_nuevo,
        enlaceDelCambioDeCorreo('parar', parar),
      ),
    );

    await anotarEnElAdmin(contexto, {
      accion: 'pedir_cambio_de_correo',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { persona: e.persona_id, correo: viejo },
      despues: { correo: e.correo_nuevo },
      motivo: e.motivo,
    });
    await anotarEnElCliente(contexto, e.organizacion_id, {
      accion: 'modificar',
      entidad: 'persona',
      antes: { correo: viejo },
      despues: {
        correo: e.correo_nuevo,
        pendiente: 'de confirmar desde el correo nuevo',
        por: 'Estook',
      },
      motivo: e.motivo,
    });
    return { mandados: true };
  },
});

/**
 * Confirmarlo, desde el enlace del correo nuevo. **Sin sesión**: se abre desde el
 * correo, y la app lo llama sin token aunque haya alguien dentro —si no, una cuenta
 * sin pagar o la sesión de otro no lo dejarían pasar—.
 */
export const confirmarElCorreoNuevo = comando<{ token: string }, { correo: string | null }>({
  nombre: 'confirmar_el_correo_nuevo',
  entrada: z.object({ token: z.string().min(20).max(200) }).strict(),
  sinSesion: true,

  async ejecutar(contexto, e) {
    const filas = await contexto.sql<{ correo_nuevo: string }[]>`
      select correo_nuevo from plataforma.confirmar_cambio_de_correo(${await huellaDeToken(e.token)})
    `;
    const hecho = filas[0];
    if (hecho === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese enlace ya no vale: se ha usado, se ha parado o ha caducado.',
      });
    }
    return { correo: hecho.correo_nuevo };
  },
});

/** Pararlo, desde el enlace del correo de ahora. */
export const pararElCambioDeCorreo = comando<{ token: string }, { parado: boolean }>({
  nombre: 'parar_el_cambio_de_correo',
  entrada: z.object({ token: z.string().min(20).max(200) }).strict(),
  sinSesion: true,

  async ejecutar(contexto, e) {
    const [fila] = await contexto.sql<{ parado: boolean }[]>`
      select plataforma.parar_cambio_de_correo(${await huellaDeToken(e.token)}) as parado
    `;
    return { parado: fila?.parado ?? false };
  },
});

// ── Exportar, que es lo más delicado del panel ──────────────────────────────

export const adminExportarLosClientes = comando<
  z.infer<typeof entradaLosClientes> & { codigo: string },
  { csv: string; cuantos: number; dia: string }
>({
  nombre: 'admin_exportar_los_clientes',
  entrada: entradaLosClientes.extend({
    codigo: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'El código son seis cifras.'),
  }),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, { codigo, ...filtros }) {
    await comprobarMiCodigo(contexto, codigo);
    const { clientes } = await losClientes(contexto);
    const pestana = filtros.pestana ?? 'todos';
    const lista = ordenar(
      losQueCaben(clientes, filtros).filter((c) => estaEnLaPestana(pestana, c)),
      filtros.orden ?? 'alta',
      filtros.sentido ?? 'desc',
    );
    const csv = comoCsv(
      [
        'Cliente',
        'Código',
        'Contrato',
        'Actividad',
        'Alta',
        'Último acceso',
        'Plan',
        'Cuota al mes (€)',
        'Locales',
        'Correos',
      ],
      lista.map((c) => [
        c.nombre,
        c.codigo,
        c.como,
        c.actividad === null ? '' : NOMBRE_DE_LA_ACTIVIDAD[c.actividad],
        c.alta,
        c.ultimoAcceso?.slice(0, 10) ?? '',
        c.plan,
        c.cuotaAlMes === null ? '' : (c.cuotaAlMes / 100).toFixed(2).replace('.', ','),
        c.locales,
        c.correos.join(' '),
      ]),
    );
    await anotarEnElAdmin(contexto, {
      accion: 'exportar',
      entidad: 'clientes',
      entidadId: null,
      despues: { cuantos: lista.length, filtros },
    });
    // El día del nombre del fichero lo da el servidor, como toda fecha (regla 10).
    return { csv, cuantos: lista.length, dia: hoyEnMadrid(contexto.ahora) };
  },
});

// ── La foto del uso, ahora ───────────────────────────────────────────────────

/** La que hace el reloj cada noche, en el momento: sirve el primer día. */
export const adminCalcularElUso = comando<Record<string, never>, { clientes: number }>({
  nombre: 'admin_calcular_el_uso',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar(contexto) {
    const clientes = await hacerLaFotoDelUso(contexto, hoyEnMadrid(contexto.ahora));
    await anotarEnElAdmin(contexto, {
      accion: 'calcular_el_uso',
      entidad: 'clientes',
      entidadId: null,
      despues: { clientes },
    });
    return { clientes };
  },
});
