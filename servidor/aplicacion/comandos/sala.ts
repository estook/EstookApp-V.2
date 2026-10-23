import { z } from 'zod';
import { horaDeCorte, jornadaDe, losPasesQueSalenAlMandar } from '@estook/dominio';
import { losAgotadosDelLocal } from '../agotados.ts';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import {
  apuntarEnLaMesa,
  comoPaseDeLaMesa,
  comoPlatoDeLaMesa,
  elLocalDelServicio,
  laCuentaAbierta,
  losPases,
  losPlatos,
  rehacerElFueraDelPase,
  type FilaDeLinea,
} from '../sala.ts';

/**
 * Lo que hace la sala (M20A · 1, decisión 0106; Roles 1.12, `accion.tomar_nota`).
 *
 *   abrir_mesa            una mesa, la barra o para llevar; con su id nacido en el aparato
 *   pedir                 añadir platos (de la carta, un menú y sus platos, bebidas)
 *   cambiar_plato_de_la_mesa  cuántos (sin mandar), su nota y su pase
 *   quitar_plato          sin mandar, libre; ya en cocina, con motivo y lo quita un jefe
 *   devolver_a_cocina     un plato que salió y se rehace: «VUELVE»
 *   mandar_a_cocina       lo nuevo, a cocina y a la barra; sale el pase que toca
 *   marchar               el siguiente pase. **Nunca la cocina** (0106)
 *   cambiar_la_mesa       personas, la nota para cocina y «por pases» o «todo junto»
 *   cambiar_de_mesa       la cuenta entera a otra mesa libre
 *   juntar_mesas          dos cuentas en una
 *   pasar_a_otro_camarero las mesas de quien se va, a quien entra
 *   liberar_mesa          la mesa queda libre (hasta M20C se cobra en el TPV de siempre)
 *   anular_mesa           con motivo; lo hace un jefe
 *
 * Todo lo que cambia una mesa se apunta en la auditoría y se avisa al segundo a la sala
 * y a la cocina. Cada plato y cada mesa nacen con su id en el aparato: repetir no duplica.
 */

const id = z.string().uuid();

async function avisar(
  contexto: Contexto,
  localId: string,
  accion: string,
  cuentaId: string,
  despues: unknown,
): Promise<void> {
  await apuntarEnLaMesa(contexto, accion, cuentaId, localId, despues);
  await tocarElServicio(contexto, localId);
}

/** La jornada de hoy del local: el día del menú que se sirve ahora (M16a). */
async function laJornadaDeHoy(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}::uuid
  `;
  const local = filas[0];
  if (local === undefined) throw new FalloDeAplicacion('local_ajeno');
  return jornadaDe(contexto.ahora, local.zona_horaria, horaDeCorte(local.hora_de_corte));
}

/** Un plato de la cuenta, de este local. */
async function elPlatoDeLaCuenta(
  contexto: Contexto,
  localId: string,
  lineaId: string,
): Promise<FilaDeLinea> {
  const filas = await contexto.sql<{ cuenta_id: string }[]>`
    select cuenta_id::text as cuenta_id from estook.linea_de_cuenta
     where id = ${lineaId}::uuid and local_id = ${localId}::uuid
  `;
  const cuentaId = filas[0]?.cuenta_id;
  if (cuentaId === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese plato no está en ninguna mesa de este local.',
    });
  }
  await laCuentaAbierta(contexto, localId, cuentaId);
  const linea = (await losPlatos(contexto, [cuentaId])).find((l) => l.id === lineaId);
  if (linea === undefined) throw new FalloDeAplicacion('no_existe');
  return linea;
}

// ═══ Abrir ════════════════════════════════════════════════════════════════════

export const entradaAbrirMesa = z
  .object({
    cuenta_id: id,
    tipo: z.enum(['mesa', 'barra', 'para_llevar']).optional(),
    mesa_id: id.optional(),
    nombre: z.string().trim().min(1).max(40).optional(),
    personas: z.number().int().min(1).max(99).optional(),
    por_pases: z.boolean().optional(),
  })
  .strict();
export type EntradaAbrirMesa = z.infer<typeof entradaAbrirMesa>;

export const abrirMesa = comando<EntradaAbrirMesa, { cuentaId: string; yaEstaba: boolean }>({
  nombre: 'abrir_mesa',
  entrada: entradaAbrirMesa,
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const tipo = entrada.tipo ?? 'mesa';
    const porPases = entrada.por_pases ?? true;
    if ((tipo === 'mesa') !== (entrada.mesa_id !== undefined)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Una mesa se abre eligiendo la mesa; la barra y lo de llevar, sin mesa.',
      });
    }
    const yaEstaba = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.cuenta where id = ${entrada.cuenta_id}::uuid
    `;
    if (yaEstaba.length > 0) return { cuentaId: entrada.cuenta_id, yaEstaba: true };

    if (entrada.mesa_id !== undefined) {
      const mesa = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.mesa
         where id = ${entrada.mesa_id}::uuid and local_id = ${localId}::uuid and archivada_en is null
      `;
      if (mesa.length === 0) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Esa mesa no está en el plano de este local.',
        });
      }
      const ocupada = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.cuenta
         where mesa_id = ${entrada.mesa_id}::uuid and liberada_en is null and anulada_en is null
      `;
      if (ocupada[0] !== undefined) {
        throw new FalloDeAplicacion('ya_hecho', {
          porque: 'Esa mesa ya está abierta: entra en ella para seguir pidiendo.',
          cuentaId: ocupada[0].id,
        });
      }
    }

    await contexto.sql`
      insert into estook.cuenta
        (id, local_id, tipo, mesa_id, nombre, personas, camarero_id, por_pases, abierta_en, abierta_por)
      values (
        ${entrada.cuenta_id}::uuid, ${localId}::uuid, ${tipo},
        ${entrada.mesa_id ?? null}::uuid, ${entrada.nombre ?? null}, ${entrada.personas ?? null},
        ${contexto.personaId}::uuid, ${porPases},
        ${contexto.ahora.toISOString()}::timestamptz, ${contexto.personaId}::uuid
      )
    `;
    await avisar(contexto, localId, 'abrir_mesa', entrada.cuenta_id, {
      tipo,
      personas: entrada.personas ?? null,
      por_pases: porPases,
    });
    return { cuentaId: entrada.cuenta_id, yaEstaba: false };
  },
});

// ═══ Pedir ════════════════════════════════════════════════════════════════════

const unPlato = z
  .object({
    id,
    /** Un plato de la carta, o el plato elegido dentro de un menú. */
    plato_id: id.optional(),
    /** Un menú: la línea del menú, que no se cocina (se cocinan sus platos). */
    menu_id: id.optional(),
    /** El plato elegido de un menú: la línea del menú a la que pertenece. */
    parte_de: id.optional(),
    cantidad: z.number().int().min(1).max(999).optional(),
    destino: z.enum(['cocina', 'barra']).optional(),
    pase: z.number().int().min(1).max(9).optional(),
    nota: z.string().trim().max(200).optional(),
  })
  .strict();

export const entradaPedir = z
  .object({ cuenta_id: id, platos: z.array(unPlato).min(1).max(100) })
  .strict();
export type EntradaPedir = z.infer<typeof entradaPedir>;

export const pedir = comando<EntradaPedir, { pedidos: number; yaEstaban: number }>({
  nombre: 'pedir',
  entrada: entradaPedir,
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);

    const yaEstan = new Set(
      (
        await contexto.sql<{ id: string }[]>`
          select id::text as id from estook.linea_de_cuenta
           where id = any (${comoLista(entrada.platos.map((p) => p.id))}::text::uuid[])
        `
      ).map((f) => f.id),
    );
    const nuevos = entrada.platos.filter((p) => !yaEstan.has(p.id));
    const hoy = await laJornadaDeHoy(contexto, localId);
    const lineasDeMenu = new Set(nuevos.filter((p) => p.menu_id !== undefined).map((p) => p.id));
    // Lo agotado no se pide (M10 · 1): la pantalla lo enseña apagado, y esto lo vuelve a mirar.
    const agotados = await losAgotadosDelLocal(contexto, localId);

    for (const p of nuevos) {
      if ((p.plato_id === undefined) === (p.menu_id === undefined)) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'Cada línea es un plato o un menú.',
        });
      }
      let nombre: string;
      let precio: number;
      let destino: 'cocina' | 'barra' | 'ninguno' = p.destino ?? 'cocina';
      let menuId: string | null = null;

      if (p.menu_id !== undefined) {
        const filas = await contexto.sql<{ nombre: string; precio_centimos: number | null }[]>`
          select nombre, precio_centimos from estook.menu
           where id = ${p.menu_id}::uuid and local_id = ${localId}::uuid
        `;
        const menu = filas[0];
        if (menu === undefined) {
          throw new FalloDeAplicacion('no_existe', { porque: 'Ese menú no es de este local.' });
        }
        if (menu.precio_centimos === null) {
          throw new FalloDeAplicacion('faltan_datos', {
            porque: `«${menu.nombre}» no tiene precio: pónselo en Carta › Menús.`,
          });
        }
        nombre = menu.nombre;
        precio = menu.precio_centimos;
        destino = 'ninguno';
        menuId = p.menu_id;
      } else {
        const filas = await contexto.sql<
          { nombre: string; precio_centimos: number | null; activo: boolean }[]
        >`
          select nombre, precio_centimos, activo from estook.plato
           where id = ${p.plato_id ?? null}::uuid and local_id = ${localId}::uuid
        `;
        const plato = filas[0];
        if (plato === undefined || !plato.activo) {
          throw new FalloDeAplicacion('no_existe', {
            porque: 'Ese plato no está en la carta de este local.',
          });
        }
        nombre = plato.nombre;
        if (agotados.has(p.plato_id ?? '')) {
          throw new FalloDeAplicacion('faltan_datos', {
            porque: `«${plato.nombre}» está agotado: elige otro, o quítalo de agotados si ya hay.`,
          });
        }
        if (p.parte_de !== undefined) {
          // El plato elegido de un menú: se cobra solo su suplemento, el del último día montado.
          const padre = await contexto.sql<{ menu_id: string | null }[]>`
            select menu_id::text as menu_id from estook.linea_de_cuenta
             where id = ${p.parte_de}::uuid and cuenta_id = ${cuenta.id}::uuid
          `;
          const menuDelPadre =
            padre[0]?.menu_id ??
            (lineasDeMenu.has(p.parte_de)
              ? (nuevos.find((n) => n.id === p.parte_de)?.menu_id ?? null)
              : null);
          if (menuDelPadre === null) {
            throw new FalloDeAplicacion('faltan_datos', {
              porque: 'El plato de un menú va dentro de la línea de su menú.',
            });
          }
          const suplemento = await contexto.sql<{ suplemento_centimos: number }[]>`
            select suplemento_centimos from estook.plato_de_menu
             where menu_id = ${menuDelPadre}::uuid and plato_id = ${p.plato_id ?? null}::uuid
               and fecha <= ${hoy}::date
             order by fecha desc
             limit 1
          `;
          precio = suplemento[0]?.suplemento_centimos ?? 0;
        } else {
          if (plato.precio_centimos === null) {
            throw new FalloDeAplicacion('faltan_datos', {
              porque: `«${plato.nombre}» no tiene precio en la carta: pónselo en Carta.`,
            });
          }
          precio = plato.precio_centimos;
        }
      }

      // Con «todo junto» todo sale a la vez: un solo pase.
      const pase = destino === 'cocina' ? (cuenta.por_pases ? (p.pase ?? 1) : 1) : null;
      await contexto.sql`
        insert into estook.linea_de_cuenta
          (id, cuenta_id, local_id, plato_id, menu_id, parte_de, nombre, cantidad, precio_centimos,
           destino, pase, nota, pedida_en, pedida_por)
        values (
          ${p.id}::uuid, ${cuenta.id}::uuid, ${localId}::uuid, ${p.plato_id ?? null}::uuid,
          ${menuId}::uuid, ${p.parte_de ?? null}::uuid, ${nombre}, ${p.cantidad ?? 1}, ${precio},
          ${destino}, ${pase}, ${p.nota === undefined || p.nota === '' ? null : p.nota},
          ${contexto.ahora.toISOString()}::timestamptz, ${contexto.personaId}::uuid
        )
        on conflict (id) do nothing
      `;
    }
    if (nuevos.length > 0) {
      await avisar(contexto, localId, 'pedir', cuenta.id, { platos: nuevos.length });
    }
    return { pedidos: nuevos.length, yaEstaban: entrada.platos.length - nuevos.length };
  },
});

// ═══ Cambiar y quitar un plato ═══════════════════════════════════════════════

export const entradaCambiarPlato = z
  .object({
    linea_id: id,
    cantidad: z.number().int().min(1).max(999).optional(),
    nota: z.string().trim().max(200).nullable().optional(),
    pase: z.number().int().min(1).max(9).optional(),
  })
  .strict();
export type EntradaCambiarPlato = z.infer<typeof entradaCambiarPlato>;

export const cambiarPlatoDeLaMesa = comando<EntradaCambiarPlato, { lineaId: string }>({
  nombre: 'cambiar_plato_de_la_mesa',
  entrada: entradaCambiarPlato,
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const linea = await elPlatoDeLaCuenta(contexto, localId, entrada.linea_id);
    if (linea.quitada_en !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese plato ya está quitado.' });
    }
    const mandada = linea.mandada_en !== null;
    if (mandada && entrada.cantidad !== undefined && entrada.cantidad !== linea.cantidad) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ya está en cocina: quítalo con su motivo y pide los que sean.',
      });
    }
    if (entrada.pase !== undefined && linea.destino !== 'cocina') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Solo lo que va a cocina tiene pase.',
      });
    }
    const nota =
      entrada.nota === undefined ? linea.nota : entrada.nota === '' ? null : entrada.nota;
    const notaCambiada = mandada && nota !== linea.nota;
    await contexto.sql`
      update estook.linea_de_cuenta
         set cantidad = ${entrada.cantidad ?? linea.cantidad},
             nota = ${nota},
             nota_cambiada_en = ${notaCambiada ? contexto.ahora.toISOString() : linea.nota_cambiada_en}::timestamptz,
             pase = ${entrada.pase ?? linea.pase}
       where id = ${linea.id}::uuid
    `;
    if (entrada.pase !== undefined && mandada) {
      // Un plato que pasa a un pase ya marchado sale en marcha; a uno nuevo, espera.
      await contexto.sql`
        insert into estook.pase (cuenta_id, numero, local_id)
        values (${linea.cuenta_id}::uuid, ${entrada.pase}, ${localId}::uuid)
        on conflict (cuenta_id, numero) do update set fuera_en = null
      `;
    }
    await avisar(contexto, localId, 'cambiar_plato_de_la_mesa', linea.cuenta_id, {
      plato: linea.nombre,
      ...(entrada.cantidad === undefined ? {} : { cantidad: entrada.cantidad }),
      ...(entrada.nota === undefined ? {} : { nota }),
      ...(entrada.pase === undefined ? {} : { pase: entrada.pase }),
    });
    return { lineaId: linea.id };
  },
});

export const entradaQuitarPlato = z
  .object({ linea_id: id, motivo: z.string().trim().min(3).max(300).optional() })
  .strict();
export type EntradaQuitarPlato = z.infer<typeof entradaQuitarPlato>;

export const quitarPlato = comando<EntradaQuitarPlato, { lineaId: string; borrado: boolean }>({
  nombre: 'quitar_plato',
  entrada: entradaQuitarPlato,
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const linea = await elPlatoDeLaCuenta(contexto, localId, entrada.linea_id);
    if (linea.quitada_en !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese plato ya está quitado.' });
    }

    if (linea.mandada_en === null) {
      // Antes de mandar, quitar es libre: se borra con sus platos de menú.
      await contexto.sql`
        delete from estook.linea_de_cuenta
         where (id = ${linea.id}::uuid or parte_de = ${linea.id}::uuid) and mandada_en is null
      `;
      await tocarElServicio(contexto, localId);
      return { lineaId: linea.id, borrado: true };
    }

    // Ya en cocina: con motivo, y lo quita un jefe (Roles 1.12). Puede estar en la plancha.
    if (entrada.motivo === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          'Ya está en cocina: escribe por qué se quita («no lo pidieron», «se equivocó de mesa»).',
      });
    }
    const puede = await loQuePuede(contexto, localId, ['accion.quitar_de_cocina']);
    if (!puede.editar('accion.quitar_de_cocina')) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Lo que ya está en cocina lo quita un jefe de sala o quien lleva el local.',
      });
    }
    await contexto.sql`
      update estook.linea_de_cuenta
         set quitada_en = ${contexto.ahora.toISOString()}::timestamptz,
             quitada_por = ${contexto.personaId}::uuid,
             motivo_de_quitar = ${entrada.motivo}
       where (id = ${linea.id}::uuid or parte_de = ${linea.id}::uuid) and quitada_en is null
    `;
    // Si era lo último que faltaba de su pase, el pase ha salido.
    if (linea.pase !== null) await rehacerElFueraDelPase(contexto, linea.cuenta_id, linea.pase);
    await avisar(contexto, localId, 'quitar_plato', linea.cuenta_id, {
      plato: linea.nombre,
      motivo: entrada.motivo,
      salio: linea.salio_en !== null,
    });
    return { lineaId: linea.id, borrado: false };
  },
});

export const devolverACocina = comando<{ linea_id: string; motivo: string }, { lineaId: string }>({
  nombre: 'devolver_a_cocina',
  entrada: z.object({ linea_id: id, motivo: z.string().trim().min(1).max(200) }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const linea = await elPlatoDeLaCuenta(contexto, localId, entrada.linea_id);
    if (linea.destino !== 'cocina' || linea.salio_en === null || linea.quitada_en !== null) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Solo se devuelve a cocina un plato que ya salió.',
      });
    }
    await contexto.sql`
      update estook.linea_de_cuenta
         set salio_en = null, salio_por = null,
             vuelve_en = ${contexto.ahora.toISOString()}::timestamptz,
             motivo_de_vuelve = ${entrada.motivo}
       where id = ${linea.id}::uuid
    `;
    await contexto.sql`
      update estook.pase set fuera_en = null
       where cuenta_id = ${linea.cuenta_id}::uuid and numero = ${linea.pase}
    `;
    await avisar(contexto, localId, 'devolver_a_cocina', linea.cuenta_id, {
      plato: linea.nombre,
      motivo: entrada.motivo,
    });
    return { lineaId: linea.id };
  },
});

// ═══ Mandar y marchar ══════════════════════════════════════════════════════════

export interface SalidaMandar {
  readonly aCocina: number;
  readonly aLaBarra: number;
  /** Los pases que han salido en marcha con esto. */
  readonly salen: readonly number[];
  /** Los que se quedan esperando a que la sala los marche. */
  readonly esperan: readonly number[];
}

export const mandarACocina = comando<{ cuenta_id: string }, SalidaMandar>({
  nombre: 'mandar_a_cocina',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const antes = await losPlatos(contexto, [cuenta.id]);
    const nuevos = antes.filter((l) => l.mandada_en === null && l.quitada_en === null);
    if (nuevos.length === 0) return { aCocina: 0, aLaBarra: 0, salen: [], esperan: [] };

    const ahora = contexto.ahora.toISOString();
    await contexto.sql`
      update estook.linea_de_cuenta
         set mandada_en = ${ahora}::timestamptz, mandada_por = ${contexto.personaId}::uuid
       where cuenta_id = ${cuenta.id}::uuid and mandada_en is null and quitada_en is null
    `;
    const pasesNuevos = [
      ...new Set(nuevos.filter((l) => l.destino === 'cocina').map((l) => l.pase as number)),
    ];
    for (const numero of pasesNuevos) {
      // Un plato nuevo en un pase que ya había salido lo devuelve a «En marcha».
      await contexto.sql`
        insert into estook.pase (cuenta_id, numero, local_id)
        values (${cuenta.id}::uuid, ${numero}, ${localId}::uuid)
        on conflict (cuenta_id, numero) do update set fuera_en = null
      `;
    }

    const platos = await losPlatos(contexto, [cuenta.id]);
    const pases = await losPases(contexto, [cuenta.id]);
    const salen = losPasesQueSalenAlMandar(
      platos.map(comoPlatoDeLaMesa),
      pases.map(comoPaseDeLaMesa),
      cuenta.por_pases,
    );
    for (const numero of salen) {
      await contexto.sql`
        update estook.pase
           set marchado_en = ${ahora}::timestamptz, marchado_por = ${contexto.personaId}::uuid
         where cuenta_id = ${cuenta.id}::uuid and numero = ${numero} and marchado_en is null
      `;
    }
    const esperan = (await losPases(contexto, [cuenta.id]))
      .filter((p) => p.marchado_en === null)
      .map((p) => p.numero);

    const salida = {
      aCocina: nuevos.filter((l) => l.destino === 'cocina').length,
      aLaBarra: nuevos.filter((l) => l.destino === 'barra').length,
      salen,
      esperan,
    };
    await avisar(contexto, localId, 'mandar_a_cocina', cuenta.id, salida);
    return salida;
  },
});

export const marchar = comando<{ cuenta_id: string; pase: number }, { pase: number }>({
  nombre: 'marchar',
  entrada: z.object({ cuenta_id: id, pase: z.number().int().min(1).max(9) }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const marchados = await contexto.sql<{ numero: number }[]>`
      update estook.pase
         set marchado_en = ${contexto.ahora.toISOString()}::timestamptz,
             marchado_por = ${contexto.personaId}::uuid
       where cuenta_id = ${cuenta.id}::uuid and numero = ${entrada.pase} and marchado_en is null
      returning numero
    `;
    if (marchados.length === 0) {
      const existe = await contexto.sql<{ numero: number }[]>`
        select numero from estook.pase where cuenta_id = ${cuenta.id}::uuid and numero = ${entrada.pase}
      `;
      throw new FalloDeAplicacion(existe.length === 0 ? 'no_existe' : 'ya_hecho', {
        porque:
          existe.length === 0
            ? `Esta mesa no tiene nada en el ${entrada.pase}.º.`
            : `El ${entrada.pase}.º ya está marchado.`,
      });
    }
    await avisar(contexto, localId, 'marchar', cuenta.id, { pase: entrada.pase });
    return { pase: entrada.pase };
  },
});

// ═══ La mesa ══════════════════════════════════════════════════════════════════

export const entradaCambiarLaMesa = z
  .object({
    cuenta_id: id,
    personas: z.number().int().min(1).max(99).optional(),
    nota_para_cocina: z.string().trim().max(200).nullable().optional(),
    por_pases: z.boolean().optional(),
  })
  .strict();
export type EntradaCambiarLaMesa = z.infer<typeof entradaCambiarLaMesa>;

export const cambiarLaMesa = comando<EntradaCambiarLaMesa, { cuentaId: string }>({
  nombre: 'cambiar_la_mesa',
  entrada: entradaCambiarLaMesa,
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const nota =
      entrada.nota_para_cocina === undefined
        ? cuenta.nota_para_cocina
        : entrada.nota_para_cocina === ''
          ? null
          : entrada.nota_para_cocina;
    await contexto.sql`
      update estook.cuenta
         set personas = ${entrada.personas ?? cuenta.personas},
             nota_para_cocina = ${nota},
             por_pases = ${entrada.por_pases ?? cuenta.por_pases}
       where id = ${cuenta.id}::uuid
    `;
    if (entrada.por_pases === false) {
      // «Marchar todo»: lo que espera, sale ya.
      await contexto.sql`
        update estook.pase
           set marchado_en = ${contexto.ahora.toISOString()}::timestamptz,
               marchado_por = ${contexto.personaId}::uuid
         where cuenta_id = ${cuenta.id}::uuid and marchado_en is null
      `;
    }
    await avisar(contexto, localId, 'cambiar_la_mesa', cuenta.id, {
      ...(entrada.personas === undefined ? {} : { personas: entrada.personas }),
      ...(entrada.nota_para_cocina === undefined ? {} : { nota_para_cocina: nota }),
      ...(entrada.por_pases === undefined ? {} : { por_pases: entrada.por_pases }),
    });
    return { cuentaId: cuenta.id };
  },
});

export const cambiarDeMesa = comando<{ cuenta_id: string; mesa_id: string }, { cuentaId: string }>({
  nombre: 'cambiar_de_mesa',
  entrada: z.object({ cuenta_id: id, mesa_id: id }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const mesa = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.mesa
       where id = ${entrada.mesa_id}::uuid and local_id = ${localId}::uuid and archivada_en is null
    `;
    if (mesa[0] === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa mesa no está en el plano de este local.',
      });
    }
    const ocupada = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.cuenta
       where mesa_id = ${entrada.mesa_id}::uuid and liberada_en is null and anulada_en is null
         and id <> ${cuenta.id}::uuid
    `;
    if (ocupada.length > 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Esa mesa está ocupada: para ponerlas juntas, «Juntar mesas».',
      });
    }
    await contexto.sql`
      update estook.cuenta set tipo = 'mesa', mesa_id = ${entrada.mesa_id}::uuid
       where id = ${cuenta.id}::uuid
    `;
    await avisar(contexto, localId, 'cambiar_de_mesa', cuenta.id, {
      de: cuenta.mesa,
      a: mesa[0].nombre,
    });
    return { cuentaId: cuenta.id };
  },
});

export const juntarMesas = comando<{ cuenta_id: string; con: string }, { cuentaId: string }>({
  nombre: 'juntar_mesas',
  entrada: z.object({ cuenta_id: id, con: id }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    if (entrada.cuenta_id === entrada.con) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Elige otra mesa para juntarla con esta.',
      });
    }
    const queda = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const otra = await laCuentaAbierta(contexto, localId, entrada.con);

    // Los pases de la otra se juntan con los de esta: el marchado antes y el «fuera» se
    // rehace con lo que llega.
    for (const pase of await losPases(contexto, [otra.id])) {
      await contexto.sql`
        insert into estook.pase (cuenta_id, numero, local_id, marchado_en, marchado_por)
        values (${queda.id}::uuid, ${pase.numero}, ${localId}::uuid, ${pase.marchado_en}::timestamptz, null)
        on conflict (cuenta_id, numero) do update
           set marchado_en = coalesce(
                 least(estook.pase.marchado_en, excluded.marchado_en),
                 estook.pase.marchado_en, excluded.marchado_en),
               fuera_en = null
      `;
    }
    await contexto.sql`
      update estook.linea_de_cuenta set cuenta_id = ${queda.id}::uuid
       where cuenta_id = ${otra.id}::uuid
    `;
    await contexto.sql`
      update estook.cuenta
         set personas = coalesce(${queda.personas}::smallint, 0) + coalesce(${otra.personas}::smallint, 0)
       where id = ${queda.id}::uuid and (${queda.personas}::smallint is not null or ${otra.personas}::smallint is not null)
    `;
    await contexto.sql`
      update estook.cuenta
         set unida_a = ${queda.id}::uuid,
             liberada_en = ${contexto.ahora.toISOString()}::timestamptz,
             liberada_por = ${contexto.personaId}::uuid
       where id = ${otra.id}::uuid
    `;
    await avisar(contexto, localId, 'juntar_mesas', queda.id, { con: otra.mesa ?? otra.nombre });
    return { cuentaId: queda.id };
  },
});

export const pasarAOtroCamarero = comando<
  { cuenta_ids: string[]; camarero_id: string },
  { pasadas: number }
>({
  nombre: 'pasar_a_otro_camarero',
  entrada: z.object({ cuenta_ids: z.array(id).min(1).max(100), camarero_id: id }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const quien = await contexto.sql<{ nivel: string | null; nombre: string }[]>`
      select estook.nivel_de_permiso(p.id, ${localId}::uuid, 'accion.tomar_nota')::text as nivel, p.nombre
        from estook.persona p
       where p.id = ${entrada.camarero_id}::uuid
         and p.id in (select estook.quien_lleva_el_servicio(${localId}::uuid))
    `;
    if (quien[0] === undefined || quien[0].nivel !== 'ver_y_editar') {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa persona no toma nota en este local.',
      });
    }
    const puede = await loQuePuede(contexto, localId, ['accion.quitar_de_cocina']);
    let pasadas = 0;
    for (const cuentaId of entrada.cuenta_ids) {
      const cuenta = await laCuentaAbierta(contexto, localId, cuentaId);
      // El camarero pasa las suyas; un jefe, cualquiera (Roles 1.12).
      if (cuenta.camarero_id !== contexto.personaId && !puede.editar('accion.quitar_de_cocina')) {
        throw new FalloDeAplicacion('sin_permiso', {
          porque: 'Cada camarero pasa sus mesas; las de otro las pasa un jefe de sala.',
        });
      }
      if (cuenta.camarero_id === entrada.camarero_id) continue;
      await contexto.sql`
        update estook.cuenta set camarero_id = ${entrada.camarero_id}::uuid where id = ${cuenta.id}::uuid
      `;
      await apuntarEnLaMesa(contexto, 'pasar_a_otro_camarero', cuenta.id, localId, {
        de: cuenta.camarero,
        a: quien[0].nombre,
      });
      pasadas += 1;
    }
    if (pasadas > 0) await tocarElServicio(contexto, localId);
    return { pasadas };
  },
});

export const liberarMesa = comando<{ cuenta_id: string }, { cuentaId: string }>({
  nombre: 'liberar_mesa',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    await contexto.sql`
      update estook.cuenta
         set liberada_en = ${contexto.ahora.toISOString()}::timestamptz,
             liberada_por = ${contexto.personaId}::uuid
       where id = ${cuenta.id}::uuid
    `;
    await avisar(contexto, localId, 'liberar_mesa', cuenta.id, {});
    return { cuentaId: cuenta.id };
  },
});

export const anularMesa = comando<{ cuenta_id: string; motivo: string }, { cuentaId: string }>({
  nombre: 'anular_mesa',
  entrada: z.object({ cuenta_id: id, motivo: z.string().trim().min(3).max(300) }).strict(),
  exige: 'accion.quitar_de_cocina',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    await contexto.sql`
      update estook.cuenta
         set anulada_en = ${contexto.ahora.toISOString()}::timestamptz,
             anulada_por = ${contexto.personaId}::uuid,
             motivo_de_anular = ${entrada.motivo}
       where id = ${cuenta.id}::uuid
    `;
    await avisar(contexto, localId, 'anular_mesa', cuenta.id, { motivo: entrada.motivo });
    return { cuentaId: cuenta.id };
  },
});
