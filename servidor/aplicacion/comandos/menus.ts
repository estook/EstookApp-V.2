import { z } from 'zod';
import {
  DIAS_DEL_MENU_DEL_DIA,
  SECCIONES_DEL_MENU_DEL_DIA,
  fechaOperativa,
  losDiasQueSeSirve,
  masDias,
  type FechaOperativa,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaCarta } from '../consultas/mi-carta.ts';
import { comoLista } from '../listas.ts';
import {
  elDiaMontadoQueVale,
  elDiaQueSeToca,
  elMenuDelLocal,
  hoyEnElLocal,
  montarElDia,
  sePuedeTocar,
  type MenuLeido,
} from '../menus.ts';

/**
 * Los menús (M10 · 2, decisiones 0103 y 0104): montarlos, cambiarlos y decir si el local
 * los sirve. Lo hace quien edita la Carta (`app.carta`), y lo vuelven a mirar las
 * políticas de la 0079.
 *
 *   sirve_menus                 «¿Tu local sirve menús?»: con sí, nace el menú del día
 *   crear_menu                  otro menú (el ejecutivo, el de grupo), con sus secciones
 *   cambiar_menu                el nombre, el precio, si entra pan, café o postre, los
 *                               días que se sirve y lo que cuestan el pan y el café
 *   archivar_menu               quitar otro menú (se recupera); el del día no se quita
 *   poner_seccion_de_menu, cambiar_seccion_de_menu, quitar_seccion_de_menu,
 *   ordenar_secciones_de_menu   las secciones
 *   poner_plato_en_el_menu      uno de la carta, o uno nuevo que nace solo en el menú
 *   cambiar_plato_del_menu      su suplemento
 *   quitar_plato_del_menu
 *   copiar_la_semana_pasada     la semana de antes, día por día
 *   poner_en_la_carta           el plato del menú que se queda, a la carta
 *
 * **Lo que ya pasó no se toca**, y lo de un día se monta al tocarlo (`montarElDia`): los
 * otros días no se mueven. Cada cambio, en el historial del menú.
 */

const idDe = z.string().uuid();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nombreDeMenu = z.string().trim().min(1).max(80);
const nombreDeSeccion = z.string().trim().min(1).max(60);
const nombreDePlato = z.string().trim().min(1).max(120);
const centimos = z.number().int().min(0).max(1_000_000);

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'menu' | 'plato' | 'local',
  id: string,
  localId: string,
  antes: unknown,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${id},
      ${localId}::uuid,
      ${antes === null ? null : JSON.stringify(antes)}::text::jsonb,
      ${despues === null ? null : JSON.stringify(despues)}::text::jsonb,
      null
    )
  `;
}

/** Un menú con las secciones de fábrica (0103): Primeros, Segundos, Postre apagado y Bebida. */
async function crearElMenu(
  contexto: Contexto,
  localId: string,
  nombre: string,
  clase: 'del_dia' | 'otro',
): Promise<string> {
  const dias = clase === 'del_dia' ? DIAS_DEL_MENU_DEL_DIA : [1, 2, 3, 4, 5, 6, 7];
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.menu (local_id, nombre, clase, dias, orden, creado_por)
    values (${localId}::uuid, ${nombre}, ${clase}::estook.clase_de_menu,
            ${comoLista(dias)}::text::smallint[],
            coalesce((select max(orden) + 1 from estook.menu where local_id = ${localId}::uuid), 0),
            ${contexto.personaId}::uuid)
    returning id
  `;
  const menuId = filas[0]?.id;
  if (menuId === undefined) throw new FalloDeAplicacion('sin_permiso');
  let orden = 0;
  for (const s of SECCIONES_DEL_MENU_DEL_DIA) {
    await contexto.sql`
      insert into estook.seccion_de_menu (menu_id, local_id, nombre, orden, es_postre, incluida)
      values (${menuId}::uuid, ${localId}::uuid, ${s.nombre}, ${orden}, ${s.esPostre}, ${s.incluida})
    `;
    orden += 1;
  }
  await anotar(contexto, 'crear', 'menu', menuId, localId, null, { nombre, clase });
  return menuId;
}

/** El nombre, libre en el local: dos «Menú ejecutivo» serían un error de tecleo. */
async function elNombreEstaLibre(
  contexto: Contexto,
  localId: string,
  nombre: string,
  salvo: string | null,
): Promise<void> {
  const otro = await contexto.sql<{ id: string }[]>`
    select id from estook.menu
     where local_id = ${localId}::uuid and (${salvo}::uuid is null or id <> ${salvo}::uuid)
       and estook.sin_acentos(nombre) = estook.sin_acentos(${nombre})
  `;
  if (otro[0] !== undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['nombre'],
      porque: 'Ya hay un menú que se llama así en este local.',
    });
  }
}

// ═══ ¿Tu local sirve menús? ═══════════════════════════════════════════════════

export const sirveMenus = comando<{ sirve: boolean }, { sirve: boolean; menuDelDia: string | null }>({
  nombre: 'sirve_menus',
  entrada: z.object({ sirve: z.boolean() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const filas = await contexto.sql<{ antes: boolean | null }[]>`
      update estook.local l set sirve_menus = ${entrada.sirve}
        from (select sirve_menus as antes from estook.local where id = ${localId}::uuid) a
       where l.id = ${localId}::uuid
      returning a.antes
    `;
    if (filas[0] === undefined) throw new FalloDeAplicacion('sin_permiso');
    await anotar(contexto, 'cambiar', 'local', localId, localId, { sirve_menus: filas[0].antes }, {
      sirve_menus: entrada.sirve,
    });

    let menuDelDia: string | null = null;
    if (entrada.sirve) {
      // Con «sí», el menú del día ya montado de fábrica: lo primero que se ve es él.
      const ya = await contexto.sql<{ id: string }[]>`
        select id from estook.menu
         where local_id = ${localId}::uuid and clase = 'del_dia' and activo
      `;
      menuDelDia = ya[0]?.id ?? (await crearElMenu(contexto, localId, 'Menú del día', 'del_dia'));
    }
    return { sirve: entrada.sirve, menuDelDia };
  },
});

// ═══ Los menús ════════════════════════════════════════════════════════════════

export const crearMenu = comando<{ nombre: string }, { menuId: string }>({
  nombre: 'crear_menu',
  entrada: z.object({ nombre: nombreDeMenu }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    await elNombreEstaLibre(contexto, localId, entrada.nombre, null);
    // Si todavía no había dicho que sirve menús, crear uno lo dice.
    await contexto.sql`
      update estook.local set sirve_menus = true
       where id = ${localId}::uuid and sirve_menus is not true
    `;
    return { menuId: await crearElMenu(contexto, localId, entrada.nombre, 'otro') };
  },
});

const loQueEntra = z
  .object({ producto_id: idDe, raciones: z.number().int().min(1).max(1000) })
  .strict()
  .nullable();

export const entradaCambiarMenu = z
  .object({
    menu_id: idDe,
    version: z.number().int().min(1),
    nombre: nombreDeMenu.optional(),
    precio_centimos: centimos.nullable().optional(),
    entra_pan: z.boolean().optional(),
    entra_cafe: z.boolean().optional(),
    entra_postre: z.boolean().optional(),
    dias_que_se_sirve: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
    // El producto del Almacén y cuántas raciones da cada unidad («una barra da 6»).
    pan: loQueEntra.optional(),
    cafe: loQueEntra.optional(),
  })
  .strict();
export type EntradaCambiarMenu = z.infer<typeof entradaCambiarMenu>;

/** Que el producto sea de este local y esté activo. */
async function elProductoDelLocal(
  contexto: Contexto,
  localId: string,
  productoId: string,
): Promise<void> {
  const filas = await contexto.sql<{ id: string }[]>`
    select id from estook.producto
     where id = ${productoId}::uuid and local_id = ${localId}::uuid and activo
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese producto no está en tu Almacén.' });
  }
}

/** Enciende o apaga el postre: su sección, sin perder sus platos; si no la hay, nace. */
async function elPostre(
  contexto: Contexto,
  localId: string,
  menuId: string,
  entra: boolean,
): Promise<void> {
  const cambiadas = await contexto.sql<{ id: string }[]>`
    update estook.seccion_de_menu set incluida = ${entra}
     where menu_id = ${menuId}::uuid and es_postre
    returning id
  `;
  if (cambiadas.length > 0 || !entra) return;
  await contexto.sql`
    insert into estook.seccion_de_menu (menu_id, local_id, nombre, orden, es_postre, incluida)
    values (${menuId}::uuid, ${localId}::uuid, 'Postre',
            coalesce((select max(orden) + 1 from estook.seccion_de_menu where menu_id = ${menuId}::uuid), 0),
            true, true)
    on conflict do nothing
  `;
}

export const cambiarMenu = comando<EntradaCambiarMenu, { menuId: string; version: number }>({
  nombre: 'cambiar_menu',
  entrada: entradaCambiarMenu,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await elMenuDelLocal(contexto, localId, entrada.menu_id);
    if (antes.version !== entrada.version) throw new FalloDeAplicacion('lo_cambio_otra_persona');
    if (entrada.nombre !== undefined) {
      await elNombreEstaLibre(contexto, localId, entrada.nombre, entrada.menu_id);
    }
    if (entrada.pan) await elProductoDelLocal(contexto, localId, entrada.pan.producto_id);
    if (entrada.cafe) await elProductoDelLocal(contexto, localId, entrada.cafe.producto_id);

    const dias =
      entrada.dias_que_se_sirve === undefined
        ? antes.diasQueSeSirve
        : [...new Set(entrada.dias_que_se_sirve)].sort((a, b) => a - b);
    const pan =
      entrada.pan === undefined
        ? { producto: antes.panProductoId, raciones: antes.panRaciones }
        : { producto: entrada.pan?.producto_id ?? null, raciones: entrada.pan?.raciones ?? null };
    const cafe =
      entrada.cafe === undefined
        ? { producto: antes.cafeProductoId, raciones: antes.cafeRaciones }
        : { producto: entrada.cafe?.producto_id ?? null, raciones: entrada.cafe?.raciones ?? null };

    const filas = await contexto.sql<{ version: number }[]>`
      update estook.menu
         set nombre = ${entrada.nombre ?? antes.nombre},
             precio_centimos = ${entrada.precio_centimos === undefined ? antes.precioCentimos : entrada.precio_centimos},
             entra_pan = ${entrada.entra_pan ?? antes.entraPan},
             entra_cafe = ${entrada.entra_cafe ?? antes.entraCafe},
             dias = ${comoLista(dias)}::text::smallint[],
             pan_producto_id = ${pan.producto}::uuid, pan_raciones = ${pan.raciones},
             cafe_producto_id = ${cafe.producto}::uuid, cafe_raciones = ${cafe.raciones},
             actualizado_en = now()
       where id = ${entrada.menu_id}::uuid and local_id = ${localId}::uuid
      returning version
    `;
    const version = filas[0]?.version;
    if (version === undefined) throw new FalloDeAplicacion('sin_permiso');
    if (entrada.entra_postre !== undefined) {
      await elPostre(contexto, localId, entrada.menu_id, entrada.entra_postre);
    }

    const { menu_id: _menu, version: _version, ...cambios } = entrada;
    await anotar(contexto, 'cambiar', 'menu', entrada.menu_id, localId, null, cambios);
    return { menuId: entrada.menu_id, version };
  },
});

export const archivarMenu = comando<{ menu_id: string }, { menuId: string }>({
  nombre: 'archivar_menu',
  entrada: z.object({ menu_id: idDe }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const menu = await elMenuDelLocal(contexto, localId, entrada.menu_id);
    if (menu.clase === 'del_dia') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'El menú del día no se quita: si no lo sirves, apágalo en Ajustes › Tu local.',
      });
    }
    await contexto.sql`
      update estook.menu set activo = false, actualizado_en = now()
       where id = ${entrada.menu_id}::uuid and local_id = ${localId}::uuid
    `;
    await anotar(contexto, 'archivar', 'menu', entrada.menu_id, localId, null, { nombre: menu.nombre });
    return { menuId: entrada.menu_id };
  },
});

// ═══ Las secciones ════════════════════════════════════════════════════════════

async function laSeccionDelMenu(
  contexto: Contexto,
  localId: string,
  seccionId: string,
): Promise<{ menuId: string; nombre: string; esPostre: boolean }> {
  const filas = await contexto.sql<{ menu_id: string; nombre: string; es_postre: boolean }[]>`
    select s.menu_id, s.nombre, s.es_postre from estook.seccion_de_menu s
      join estook.menu m on m.id = s.menu_id and m.activo
     where s.id = ${seccionId}::uuid and s.local_id = ${localId}::uuid
  `;
  const fila = filas[0];
  if (fila === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa sección no está en este menú.' });
  }
  return { menuId: fila.menu_id, nombre: fila.nombre, esPostre: fila.es_postre };
}

async function laSeccionEstaLibre(
  contexto: Contexto,
  menuId: string,
  nombre: string,
  salvo: string | null,
): Promise<void> {
  const otra = await contexto.sql<{ id: string }[]>`
    select id from estook.seccion_de_menu
     where menu_id = ${menuId}::uuid and (${salvo}::uuid is null or id <> ${salvo}::uuid)
       and estook.sin_acentos(nombre) = estook.sin_acentos(${nombre})
  `;
  if (otra[0] !== undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['nombre'],
      porque: 'Este menú ya tiene una sección que se llama así.',
    });
  }
}

export const ponerSeccionDeMenu = comando<{ menu_id: string; nombre: string }, { seccionId: string }>({
  nombre: 'poner_seccion_de_menu',
  entrada: z.object({ menu_id: idDe, nombre: nombreDeSeccion }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    await elMenuDelLocal(contexto, localId, entrada.menu_id);
    await laSeccionEstaLibre(contexto, entrada.menu_id, entrada.nombre, null);
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.seccion_de_menu (menu_id, local_id, nombre, orden)
      values (${entrada.menu_id}::uuid, ${localId}::uuid, ${entrada.nombre},
              coalesce((select max(orden) + 1 from estook.seccion_de_menu
                         where menu_id = ${entrada.menu_id}::uuid), 0))
      returning id
    `;
    const seccionId = filas[0]?.id;
    if (seccionId === undefined) throw new FalloDeAplicacion('sin_permiso');
    await anotar(contexto, 'crear_seccion', 'menu', entrada.menu_id, localId, null, {
      seccion: entrada.nombre,
    });
    return { seccionId };
  },
});

export const cambiarSeccionDeMenu = comando<
  { seccion_id: string; nombre: string },
  { seccionId: string }
>({
  nombre: 'cambiar_seccion_de_menu',
  entrada: z.object({ seccion_id: idDe, nombre: nombreDeSeccion }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const seccion = await laSeccionDelMenu(contexto, localId, entrada.seccion_id);
    await laSeccionEstaLibre(contexto, seccion.menuId, entrada.nombre, entrada.seccion_id);
    await contexto.sql`
      update estook.seccion_de_menu set nombre = ${entrada.nombre}
       where id = ${entrada.seccion_id}::uuid and local_id = ${localId}::uuid
    `;
    await anotar(contexto, 'cambiar_seccion', 'menu', seccion.menuId, localId, {
      seccion: seccion.nombre,
    }, { seccion: entrada.nombre });
    return { seccionId: entrada.seccion_id };
  },
});

export const quitarSeccionDeMenu = comando<{ seccion_id: string }, { seccionId: string }>({
  nombre: 'quitar_seccion_de_menu',
  entrada: z.object({ seccion_id: idDe }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const seccion = await laSeccionDelMenu(contexto, localId, entrada.seccion_id);
    const hoy = await hoyEnElLocal(contexto, localId);
    // **Lo que ya se sirvió no se toca**: si la sección tiene platos de días pasados, no
    // se borra (se quedaría sin historia); se dice que se puede apagar o vaciar.
    const pasados = await contexto.sql<{ cuantos: number }[]>`
      select count(*)::int as cuantos from estook.plato_de_menu
       where seccion_id = ${entrada.seccion_id}::uuid and fecha < ${hoy}::date
    `;
    if ((pasados[0]?.cuantos ?? 0) > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: seccion.esPostre
          ? 'El postre ya se ha servido otros días: quita «¿Entra postre?» y deja de salir.'
          : 'Esta sección ya se ha servido otros días: quítale los platos y no saldrá.',
      });
    }
    await contexto.sql`
      delete from estook.seccion_de_menu
       where id = ${entrada.seccion_id}::uuid and local_id = ${localId}::uuid
    `;
    await anotar(contexto, 'quitar_seccion', 'menu', seccion.menuId, localId, {
      seccion: seccion.nombre,
    }, null);
    return { seccionId: entrada.seccion_id };
  },
});

export const ordenarSeccionesDeMenu = comando<
  { menu_id: string; secciones: string[] },
  { menuId: string }
>({
  nombre: 'ordenar_secciones_de_menu',
  entrada: z.object({ menu_id: idDe, secciones: z.array(idDe).min(1).max(20) }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    await elMenuDelLocal(contexto, localId, entrada.menu_id);
    let orden = 0;
    for (const seccionId of entrada.secciones) {
      await contexto.sql`
        update estook.seccion_de_menu set orden = ${orden}
         where id = ${seccionId}::uuid and menu_id = ${entrada.menu_id}::uuid
      `;
      orden += 1;
    }
    return { menuId: entrada.menu_id };
  },
});

// ═══ Los platos de cada día ═══════════════════════════════════════════════════

interface ElDia {
  readonly menu: MenuLeido;
  readonly fecha: FechaOperativa;
}

/** El menú y el día que se toca, comprobado: que sea suyo, que no haya pasado y montado. */
async function elDiaQueSeCambia(
  contexto: Contexto,
  localId: string,
  menuId: string,
  pedida: string,
): Promise<ElDia> {
  const menu = await elMenuDelLocal(contexto, localId, menuId);
  const hoy = await hoyEnElLocal(contexto, localId);
  const dia = elDiaQueSeToca(menu, fechaOperativa(pedida), hoy);
  sePuedeTocar(dia, hoy);
  await montarElDia(contexto, localId, menu.id, dia);
  return { menu, fecha: dia };
}

/**
 * Un plato para el menú: uno de la carta, o uno nuevo que nace solo en el menú (0103: «el
 * plato nuevo se podrá desgranar en el escandallo»). Si ya hay uno con ese nombre, es
 * ese: dos «Lentejas» serían un error de tecleo.
 */
async function elPlatoParaElMenu(
  contexto: Contexto,
  localId: string,
  platoId: string | undefined,
  nuevo: string | undefined,
): Promise<{ id: string; nombre: string; nuevo: boolean }> {
  if (platoId !== undefined) {
    const filas = await contexto.sql<{ id: string; nombre: string }[]>`
      select id, nombre from estook.plato
       where id = ${platoId}::uuid and local_id = ${localId}::uuid and activo
    `;
    const plato = filas[0];
    if (plato === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese plato no está en tu carta.' });
    }
    return { ...plato, nuevo: false };
  }
  if (nuevo === undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['plato_id'],
      porque: 'Elige un plato de tu carta o escribe uno nuevo.',
    });
  }
  const ya = await contexto.sql<{ id: string; nombre: string; activo: boolean }[]>`
    select id, nombre, activo from estook.plato
     where local_id = ${localId}::uuid
       and estook.sin_acentos(nombre) = estook.sin_acentos(${nuevo})
  `;
  const existente = ya[0];
  if (existente !== undefined) {
    if (!existente.activo) {
      // El que estaba archivado vuelve, solo para el menú: es el mismo plato, con su
      // historial y su escandallo.
      await contexto.sql`
        update estook.plato set activo = true, en_la_carta = false, actualizado_en = now()
         where id = ${existente.id}::uuid
      `;
      await anotar(contexto, 'recuperar', 'plato', existente.id, localId, { activo: false }, {
        activo: true,
        en_la_carta: false,
      });
    }
    return { id: existente.id, nombre: existente.nombre, nuevo: false };
  }
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.plato (local_id, nombre, en_la_carta, creado_por)
    values (${localId}::uuid, ${nuevo}, false, ${contexto.personaId}::uuid)
    returning id
  `;
  const id = filas[0]?.id;
  if (id === undefined) throw new FalloDeAplicacion('sin_permiso');
  await anotar(contexto, 'crear', 'plato', id, localId, null, { nombre: nuevo, en_la_carta: false });
  return { id, nombre: nuevo, nuevo: true };
}

export const entradaPonerPlatoEnElMenu = z
  .object({
    menu_id: idDe,
    fecha,
    seccion_id: idDe,
    plato_id: idDe.optional(),
    nuevo: nombreDePlato.optional(),
    suplemento_centimos: centimos.optional(),
  })
  .strict();
export type EntradaPonerPlatoEnElMenu = z.infer<typeof entradaPonerPlatoEnElMenu>;

export const ponerPlatoEnElMenu = comando<
  EntradaPonerPlatoEnElMenu,
  { platoId: string; nombre: string; nuevo: boolean; fecha: string; yaEstaba: boolean }
>({
  nombre: 'poner_plato_en_el_menu',
  entrada: entradaPonerPlatoEnElMenu,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const seccion = await laSeccionDelMenu(contexto, localId, entrada.seccion_id);
    if (seccion.menuId !== entrada.menu_id) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa sección no está en este menú.' });
    }
    const dia = await elDiaQueSeCambia(contexto, localId, entrada.menu_id, entrada.fecha);
    const plato = await elPlatoParaElMenu(contexto, localId, entrada.plato_id, entrada.nuevo);
    const puestos = await contexto.sql<{ id: string }[]>`
      insert into estook.plato_de_menu
        (menu_id, fecha, seccion_id, plato_id, local_id, suplemento_centimos, orden)
      values (${entrada.menu_id}::uuid, ${dia.fecha}::date, ${entrada.seccion_id}::uuid,
              ${plato.id}::uuid, ${localId}::uuid, ${entrada.suplemento_centimos ?? 0},
              coalesce((select max(orden) + 1 from estook.plato_de_menu
                         where menu_id = ${entrada.menu_id}::uuid and fecha = ${dia.fecha}::date
                           and seccion_id = ${entrada.seccion_id}::uuid), 0))
      on conflict do nothing
      returning id
    `;
    const yaEstaba = puestos.length === 0;
    if (!yaEstaba) {
      await anotar(contexto, 'poner_plato', 'menu', entrada.menu_id, localId, null, {
        fecha: dia.fecha,
        seccion: seccion.nombre,
        plato: plato.nombre,
      });
    }
    return { platoId: plato.id, nombre: plato.nombre, nuevo: plato.nuevo, fecha: dia.fecha, yaEstaba };
  },
});

const elPlatoDeUnDia = z
  .object({ menu_id: idDe, fecha, seccion_id: idDe, plato_id: idDe })
  .strict();

export const cambiarPlatoDelMenu = comando<
  z.infer<typeof elPlatoDeUnDia> & { suplemento_centimos: number },
  { platoId: string; fecha: string }
>({
  nombre: 'cambiar_plato_del_menu',
  entrada: elPlatoDeUnDia.extend({ suplemento_centimos: centimos }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const dia = await elDiaQueSeCambia(contexto, localId, entrada.menu_id, entrada.fecha);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.plato_de_menu set suplemento_centimos = ${entrada.suplemento_centimos}
       where menu_id = ${entrada.menu_id}::uuid and fecha = ${dia.fecha}::date
         and seccion_id = ${entrada.seccion_id}::uuid and plato_id = ${entrada.plato_id}::uuid
      returning id
    `;
    if (filas[0] === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese plato no está en el menú ese día.' });
    }
    await anotar(contexto, 'cambiar_suplemento', 'menu', entrada.menu_id, localId, null, {
      fecha: dia.fecha,
      plato: entrada.plato_id,
      suplemento: entrada.suplemento_centimos,
    });
    return { platoId: entrada.plato_id, fecha: dia.fecha };
  },
});

export const quitarPlatoDelMenu = comando<
  z.infer<typeof elPlatoDeUnDia>,
  { platoId: string; fecha: string }
>({
  nombre: 'quitar_plato_del_menu',
  entrada: elPlatoDeUnDia,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const dia = await elDiaQueSeCambia(contexto, localId, entrada.menu_id, entrada.fecha);
    const quitados = await contexto.sql<{ id: string }[]>`
      delete from estook.plato_de_menu
       where menu_id = ${entrada.menu_id}::uuid and fecha = ${dia.fecha}::date
         and seccion_id = ${entrada.seccion_id}::uuid and plato_id = ${entrada.plato_id}::uuid
      returning id
    `;
    if (quitados.length > 0) {
      await anotar(contexto, 'quitar_plato', 'menu', entrada.menu_id, localId, {
        fecha: dia.fecha,
        plato: entrada.plato_id,
      }, null);
    }
    return { platoId: entrada.plato_id, fecha: dia.fecha };
  },
});

export const copiarLaSemanaPasada = comando<
  { menu_id: string; lunes: string },
  { copiados: number; dias: string[] }
>({
  nombre: 'copiar_la_semana_pasada',
  entrada: z.object({ menu_id: idDe, lunes: fecha }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const menu = await elMenuDelLocal(contexto, localId, entrada.menu_id);
    if (menu.clase !== 'del_dia') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Solo el menú del día cambia por días.',
      });
    }
    const hoy = await hoyEnElLocal(contexto, localId);
    // De la semana que se pide, los días que se sirven y no han pasado.
    const dias = losDiasQueSeSirve(fechaOperativa(entrada.lunes), menu.diasQueSeSirve).filter(
      (d) => d >= hoy,
    );
    let copiados = 0;
    for (const dia of dias) {
      sePuedeTocar(dia, hoy);
      // Lo que valía ese mismo día la semana pasada (el suyo, o el que repetía).
      const vale = await elDiaMontadoQueVale(contexto, menu.id, masDias(dia, -7));
      await montarElDia(contexto, localId, menu.id, dia);
      await contexto.sql`
        delete from estook.plato_de_menu
         where menu_id = ${menu.id}::uuid and fecha = ${dia}::date
      `;
      if (vale === null) continue;
      const puestos = await contexto.sql<{ id: string }[]>`
        insert into estook.plato_de_menu
          (menu_id, fecha, seccion_id, plato_id, local_id, suplemento_centimos, orden)
        select menu_id, ${dia}::date, seccion_id, plato_id, local_id, suplemento_centimos, orden
          from estook.plato_de_menu
         where menu_id = ${menu.id}::uuid and fecha = ${vale}::date
        returning id
      `;
      copiados += puestos.length;
    }
    await anotar(contexto, 'copiar_semana', 'menu', menu.id, localId, null, {
      lunes: entrada.lunes,
      dias,
    });
    return { copiados, dias };
  },
});

export const ponerEnLaCarta = comando<{ plato_id: string }, { platoId: string }>({
  nombre: 'poner_en_la_carta',
  entrada: z.object({ plato_id: idDe }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.plato set en_la_carta = true, actualizado_en = now()
       where id = ${entrada.plato_id}::uuid and local_id = ${localId}::uuid and activo
         and not en_la_carta
      returning id
    `;
    if (filas[0] !== undefined) {
      await anotar(contexto, 'poner_en_la_carta', 'plato', entrada.plato_id, localId, {
        en_la_carta: false,
      }, { en_la_carta: true });
    }
    return { platoId: entrada.plato_id };
  },
});
