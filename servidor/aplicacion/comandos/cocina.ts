import { z } from 'zod';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  apuntarEnLaMesa,
  elLocalDelServicio,
  lasCuentas,
  losPases,
  losPlatos,
  rehacerElFueraDelPase,
  type FilaDeLinea,
} from '../sala.ts';

/**
 * Lo que hace la cocina (M20A · 1, decisión 0106; Roles 1.12, `accion.cocinar`).
 *
 *   tachar      el plato sale: queda tachado con su hora, y la sala lo ve
 *   destachar   tachado sin querer: vuelve a estar pendiente
 *   todo_fuera  la mesa entera sale de un toque
 *   recuperar   una mesa que se fue a «Fuera» por error vuelve a «En marcha»
 *
 * **La cocina nunca marcha**: no ve cuándo una mesa va acabando el primero. Cuando
 * tacha el último plato de un pase, el pase queda fuera y la sala recibe al segundo que
 * ya puede marchar el siguiente. Tachar no pide PIN (Anexo 3.4).
 */

const id = z.string().uuid();

/** Un plato que está en cocina, de este local. */
async function elPlatoEnCocina(
  contexto: Contexto,
  localId: string,
  lineaId: string,
): Promise<FilaDeLinea> {
  const filas = await contexto.sql<{ cuenta_id: string }[]>`
    select cuenta_id::text as cuenta_id from estook.linea_de_cuenta
     where id = ${lineaId}::uuid and local_id = ${localId}::uuid
  `;
  const cuentaId = filas[0]?.cuenta_id;
  const linea =
    cuentaId === undefined
      ? undefined
      : (await losPlatos(contexto, [cuentaId])).find((l) => l.id === lineaId);
  if (linea === undefined || linea.destino !== 'cocina' || linea.mandada_en === null) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese plato no está en la cocina de este local.',
    });
  }
  if (linea.quitada_en !== null) {
    throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese plato se anuló: no hay que sacarlo.' });
  }
  return linea;
}

export const tachar = comando<{ linea_id: string }, { lineaId: string; paseFuera: boolean }>({
  nombre: 'tachar',
  entrada: z.object({ linea_id: id }).strict(),
  exige: 'accion.cocinar',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const linea = await elPlatoEnCocina(contexto, localId, entrada.linea_id);
    if (linea.salio_en !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese plato ya está tachado.' });
    }
    const pase = (await losPases(contexto, [linea.cuenta_id])).find((p) => p.numero === linea.pase);
    if (pase?.marchado_en === null || pase === undefined) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ese pase aún no está marchado: lo marcha la sala cuando la mesa va acabando.',
      });
    }
    await contexto.sql`
      update estook.linea_de_cuenta
         set salio_en = ${contexto.ahora.toISOString()}::timestamptz, salio_por = ${contexto.personaId}::uuid
       where id = ${linea.id}::uuid
    `;
    await rehacerElFueraDelPase(contexto, linea.cuenta_id, linea.pase as number);
    const paseFuera = (await losPases(contexto, [linea.cuenta_id])).some(
      (p) => p.numero === linea.pase && p.fuera_en !== null,
    );
    await apuntarEnLaMesa(contexto, 'tachar', linea.cuenta_id, localId, {
      plato: linea.nombre,
      ...(paseFuera ? { pase_fuera: linea.pase } : {}),
    });
    await tocarElServicio(contexto, localId);
    return { lineaId: linea.id, paseFuera };
  },
});

export const destachar = comando<{ linea_id: string }, { lineaId: string }>({
  nombre: 'destachar',
  entrada: z.object({ linea_id: id }).strict(),
  exige: 'accion.cocinar',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const linea = await elPlatoEnCocina(contexto, localId, entrada.linea_id);
    if (linea.salio_en === null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese plato no está tachado.' });
    }
    await contexto.sql`
      update estook.linea_de_cuenta set salio_en = null, salio_por = null where id = ${linea.id}::uuid
    `;
    await rehacerElFueraDelPase(contexto, linea.cuenta_id, linea.pase as number);
    await apuntarEnLaMesa(contexto, 'destachar', linea.cuenta_id, localId, { plato: linea.nombre });
    await tocarElServicio(contexto, localId);
    return { lineaId: linea.id };
  },
});

async function laCuentaDeCocina(contexto: Contexto, localId: string, cuentaId: string) {
  const [cuenta] = await lasCuentas(contexto, localId, [cuentaId]);
  if (cuenta === undefined || cuenta.anulada_en !== null) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Esa mesa no está en la cocina de este local.',
    });
  }
  return cuenta;
}

export const todoFuera = comando<{ cuenta_id: string }, { tachados: number }>({
  nombre: 'todo_fuera',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.cocinar',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaDeCocina(contexto, localId, entrada.cuenta_id);
    const ahora = contexto.ahora.toISOString();
    // Sale lo marchado: lo que espera a la sala no se toca.
    const tachados = await contexto.sql<{ id: string }[]>`
      update estook.linea_de_cuenta l
         set salio_en = ${ahora}::timestamptz, salio_por = ${contexto.personaId}::uuid
        from estook.pase p
       where l.cuenta_id = ${cuenta.id}::uuid and p.cuenta_id = l.cuenta_id and p.numero = l.pase
         and p.marchado_en is not null
         and l.destino = 'cocina' and l.mandada_en is not null
         and l.salio_en is null and l.quitada_en is null
      returning l.id::text as id
    `;
    await contexto.sql`
      update estook.pase set fuera_en = ${ahora}::timestamptz
       where cuenta_id = ${cuenta.id}::uuid and marchado_en is not null and fuera_en is null
    `;
    await apuntarEnLaMesa(contexto, 'todo_fuera', cuenta.id, localId, {
      tachados: tachados.length,
    });
    await tocarElServicio(contexto, localId);
    return { tachados: tachados.length };
  },
});

export const recuperar = comando<{ cuenta_id: string }, { destachados: number }>({
  nombre: 'recuperar',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.cocinar',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const cuenta = await laCuentaDeCocina(contexto, localId, entrada.cuenta_id);
    const pases = (await losPases(contexto, [cuenta.id])).filter((p) => p.fuera_en !== null);
    const ultimo = pases.sort((a, b) => (b.fuera_en ?? '').localeCompare(a.fuera_en ?? ''))[0];
    if (ultimo === undefined) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Esa mesa no está en «Fuera».' });
    }
    // Vuelve lo último que se tachó de ese pase: es lo que se dio por salido sin querer.
    const destachados = await contexto.sql<{ id: string }[]>`
      update estook.linea_de_cuenta
         set salio_en = null, salio_por = null
       where cuenta_id = ${cuenta.id}::uuid and pase = ${ultimo.numero} and quitada_en is null
         and salio_en = (
           select max(salio_en) from estook.linea_de_cuenta
            where cuenta_id = ${cuenta.id}::uuid and pase = ${ultimo.numero} and quitada_en is null
         )
      returning id::text as id
    `;
    await contexto.sql`
      update estook.pase set fuera_en = null
       where cuenta_id = ${cuenta.id}::uuid and numero = ${ultimo.numero}
    `;
    await apuntarEnLaMesa(contexto, 'recuperar', cuenta.id, localId, {
      pase: ultimo.numero,
      destachados: destachados.length,
    });
    await tocarElServicio(contexto, localId);
    return { destachados: destachados.length };
  },
});
