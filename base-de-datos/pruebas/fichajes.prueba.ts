import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  comoSeLeenLasHoras,
  comoVaConSuContrato,
  costeDeUnaHora,
  duracionDelTurno,
  loQueCuesta,
  partidaDe,
  valorDeLaMerma,
  MOTIVOS_DE_MERMA,
} from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M6½ · fichajes, retribución y merma, contra Postgres de verdad.
 *
 * «Toda regla de acceso se prueba **llamando a la API a pelo**» (regla 4). Aquí se
 * llama incluso más abajo: contra el SQL, con `set role estook_api` y las
 * políticas aplicando, que es exactamente lo que hace la capa de aplicación.
 *
 * ── Lo que se comprueba aquí y no se puede comprobar en ningún otro sitio ───
 *
 *   · que **nadie ficha por otro**, ni pidiéndolo a la base
 *   · que **un fichaje no se borra**, ni con permisos
 *   · que **las horas propias se ven siempre**, aunque no se tenga Equipo
 *   · que **un sueldo no lo ve quien no tiene `dato.coste_de_personal`**, y eso
 *     incluye a un jefe de cocina, que sí ve las horas de esa misma persona
 *   · que una merma **no se puede apuntar sin motivo**
 *   · y que la partida que decide SQL es **la misma** que decide el dominio, que
 *     es la clase de cosa que se separa en cuanto nadie la mira
 */
let base: BaseDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function como<T>(
  correo: string,
  consulta: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  const quien = await base.personaPorCorreo(correo);
  return base.comoPersona(quien, async () => {
    const { rows } = await base.bd.query<T>(consulta, parametros);
    return rows;
  });
}

// ── El fichaje ───────────────────────────────────────────────────────────────

describe('fichar', () => {
  it('un cocinero ficha lo suyo, y le queda su turno abierto', async () => {
    const marcos = await base.personaPorCorreo(MARCOS);
    const centro = await base.localPorCodigo('bar-centro');

    const puestos = await como<{ id: string }>(
      MARCOS,
      `insert into estook.fichaje (
         local_id, persona_id, fecha_operativa, entro_en, entro_latitud, entro_longitud
       )
       values ($1, $2, current_date, now() - interval '3 hours', 43.3, -1.98)
       returning id::text as id`,
      [centro, marcos],
    );

    expect(puestos).toHaveLength(1);
  });

  it('y NO puede fichar por otra persona', async () => {
    // Es el fraude clásico del control horario, y no se impide escondiendo un
    // botón: la política solo deja insertar `persona_id = estook.persona_actual()`.
    const sara = await base.personaPorCorreo(SARA);
    const centro = await base.localPorCodigo('bar-centro');

    await expect(
      como(
        MARCOS,
        `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en, entro_sin_donde)
         values ($1, $2, current_date, now(), 'la_nego')`,
        [centro, sara],
      ),
    ).rejects.toThrow();
  });

  it('solo puede tener uno abierto a la vez, y en ningún local', async () => {
    // El índice es **por persona**, no por persona y local: quien lleva dos
    // locales de la misma cadena podría fichar en los dos y cobrar el doble.
    const marcos = await base.personaPorCorreo(MARCOS);
    const puerto = await base.localPorCodigo('bar-puerto');

    await expect(
      comoDuena(
        `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en, entro_sin_donde)
         values ($1, $2, current_date, now(), 'sin_senal')`,
        [puerto, marcos],
      ),
    ).rejects.toThrow(/fichaje_uno_abierto_por_persona|duplicate key/i);
  });

  it('o hay ubicación o hay motivo por el que no la hay, nunca las dos ni ninguna', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const centro = await base.localPorCodigo('bar-centro');

    await expect(
      comoDuena(
        `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en)
         values ($1, $2, current_date, now())`,
        [centro, sara],
      ),
    ).rejects.toThrow(/fichaje_entrada_dice_donde/i);

    await expect(
      comoDuena(
        `insert into estook.fichaje (
           local_id, persona_id, fecha_operativa, entro_en,
           entro_latitud, entro_longitud, entro_sin_donde
         )
         values ($1, $2, current_date, now(), 43.3, -1.98, 'la_nego')`,
        [centro, sara],
      ),
    ).rejects.toThrow(/fichaje_entrada_dice_donde/i);
  });

  it('un fichaje NO se puede borrar, ni siendo la gerente', async () => {
    // No hay política de `delete`. Es la misma regla que el libro de movimientos:
    // si se pudiera borrar, el registro horario no serviría para lo único para lo
    // que sirve.
    const marcos = await base.personaPorCorreo(MARCOS);
    const borradas = await como<{ id: string }>(
      ROSA,
      `delete from estook.fichaje where persona_id = $1 returning id::text as id`,
      [marcos],
    );
    expect(borradas).toEqual([]);
  });

  it('corregir el de otra persona exige nombre Y motivo', async () => {
    const marcos = await base.personaPorCorreo(MARCOS);
    const [suyo] = await comoDuena<{ id: string }>(
      `select id::text as id from estook.fichaje where persona_id = $1 limit 1`,
      [marcos],
    );

    await expect(
      comoDuena(
        `update estook.fichaje set corregido_por = $2, corregido_en = now() where id = $1::bigint`,
        [suyo?.id, marcos],
      ),
    ).rejects.toThrow(/fichaje_correccion_con_nombre_y_motivo/i);
  });

  it('cada uno ve sus horas aunque no tenga Equipo, y no ve las de nadie más', async () => {
    // Marcos es cocinero: **no tiene `app.equipo`**. Sus horas son suyas y las ve;
    // las de la camarera, no.
    const marcos = await base.personaPorCorreo(MARCOS);
    const mias = await como<{ persona_id: string }>(
      MARCOS,
      `select persona_id::text as persona_id from estook.fichaje`,
    );
    expect(mias.length).toBeGreaterThan(0);
    expect(mias.every((f) => f.persona_id === marcos)).toBe(true);
  });

  it('la gerente ve los de su equipo', async () => {
    const suyos = await como<{ id: string }>(ROSA, `select id::text as id from estook.fichaje`);
    expect(suyos.length).toBeGreaterThan(0);
  });
});

// ── La distancia ─────────────────────────────────────────────────────────────

describe('a cuántos metros', () => {
  it('el mismo punto son cero metros, y nulo si falta alguna coordenada', async () => {
    const [mismo] = await comoDuena<{ metros: number | null }>(
      `select estook.metros_entre(43.3, -1.98, 43.3, -1.98) as metros`,
    );
    expect(mismo?.metros).toBe(0);

    const [falta] = await comoDuena<{ metros: number | null }>(
      `select estook.metros_entre(43.3, -1.98, null, -1.98) as metros`,
    );
    expect(falta?.metros).toBeNull();
  });

  it('un grado de latitud son unos 111 km', async () => {
    // La comprobación de que la fórmula no está del revés ni le falta el radio.
    const [uno] = await comoDuena<{ metros: number }>(
      `select estook.metros_entre(43.0, -1.98, 44.0, -1.98) as metros`,
    );
    expect(uno?.metros).toBeGreaterThan(110_000);
    expect(uno?.metros).toBeLessThan(112_000);
  });
});

// ── La retribución ───────────────────────────────────────────────────────────

describe('lo que cobra cada uno', () => {
  it('la gerente puede ponerlo y el cocinero NO puede leerlo', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const centro = await base.localPorCodigo('bar-centro');
    const [local] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id::text as organizacion_id from estook.local where id = $1`,
      [centro],
    );

    const puestas = await como<{ id: string }>(
      ROSA,
      `insert into estook.retribucion (
         organizacion_id, persona_id, forma, importe_centimos, horas_semanales, puesto
       )
       values ($1, $2, 'por_hora', 1250, 40, 'Camarera')
       returning id`,
      [local?.organizacion_id, sara],
    );
    expect(puestas).toHaveLength(1);

    // Marcos es cocinero: tiene Inventario entera, Servicio, Escandallos… y **no
    // tiene `dato.coste_de_personal`**. No ve un solo euro de nadie.
    const loQueVeMarcos = await como<{ id: string }>(
      MARCOS,
      `select id from estook.retribucion`,
    );
    expect(loQueVeMarcos).toEqual([]);
  });

  it('cada uno ve la suya', async () => {
    const laDeSara = await como<{ importe_centimos: string }>(
      SARA,
      `select importe_centimos::text as importe_centimos from estook.retribucion`,
    );
    expect(laDeSara).toHaveLength(1);
    expect(laDeSara[0]?.importe_centimos).toBe('1250');
  });

  it('un sueldo mensual sin horas de contrato no se puede guardar', async () => {
    // Sin las horas no se puede repartir por hora, y entonces el coste de un turno
    // sería un invento. La base lo impide.
    const marcos = await base.personaPorCorreo(MARCOS);
    const centro = await base.localPorCodigo('bar-centro');
    const [local] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id::text as organizacion_id from estook.local where id = $1`,
      [centro],
    );

    await expect(
      comoDuena(
        `insert into estook.retribucion (organizacion_id, persona_id, forma, importe_centimos)
         values ($1, $2, 'mensual', 180000)`,
        [local?.organizacion_id, marcos],
      ),
    ).rejects.toThrow(/retribucion_mensual_con_horas/i);
  });

  it('solo puede haber una vigente por persona y ámbito', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const centro = await base.localPorCodigo('bar-centro');
    const [local] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id::text as organizacion_id from estook.local where id = $1`,
      [centro],
    );

    await expect(
      comoDuena(
        `insert into estook.retribucion (organizacion_id, persona_id, forma, importe_centimos)
         values ($1, $2, 'por_hora', 1400)`,
        [local?.organizacion_id, sara],
      ),
    ).rejects.toThrow(/retribucion_una_vigente|duplicate key/i);
  });
});

// ── La merma ─────────────────────────────────────────────────────────────────

/**
 * Un producto sobre el que apuntar mermas.
 *
 * Las semillas no traen género —los ejemplos los pone el propio local desde el
 * Panel—, así que se crea aquí. Como dueña y no con un comando: lo que se prueba
 * en este bloque son las restricciones y las políticas de la merma, no el alta.
 */
let elProducto = '';

describe('la merma', () => {
  beforeAll(async () => {
    const centro = await base.localPorCodigo('bar-centro');
    const [puesto] = await comoDuena<{ id: string }>(
      `insert into estook.producto (local_id, nombre, unidad_de_uso, factor, rendimiento)
       values ($1, 'Pulpo de prueba', 'kg', 1, 1)
       returning id::text as id`,
      [centro],
    );
    elProducto = puesto?.id ?? '';
  });

  it('no se puede apuntar sin motivo, y nada que no sea merma puede llevarlo', async () => {
    const centro = await base.localPorCodigo('bar-centro');

    await expect(
      comoDuena(
        `insert into estook.movimiento_de_stock (
           local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
           fecha_operativa
         )
         values ($1, $2, 'merma', -2, 0, 0, current_date)`,
        [centro, elProducto],
      ),
    ).rejects.toThrow(/movimiento_merma_con_su_motivo/i);

    await expect(
      comoDuena(
        `insert into estook.movimiento_de_stock (
           local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
           fecha_operativa, motivo_de_merma
         )
         values ($1, $2, 'salida', -2, 0, 0, current_date, 'caducado')`,
        [centro, elProducto],
      ),
    ).rejects.toThrow(/movimiento_merma_con_su_motivo/i);
  });

  it('«otro» sin explicar no vale', async () => {
    const centro = await base.localPorCodigo('bar-centro');

    await expect(
      comoDuena(
        `insert into estook.movimiento_de_stock (
           local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
           fecha_operativa, motivo_de_merma
         )
         values ($1, $2, 'merma', -2, 0, 0, current_date, 'otro')`,
        [centro, elProducto],
      ),
    ).rejects.toThrow(/movimiento_merma_otro_se_explica/i);
  });

  it('una camarera puede apuntar una merma y NO una entrada de género', async () => {
    // Es el motivo por el que la política de apunte cambió en la 0028: el permiso
    // `accion.registrar_merma` lo tiene desde M1 y no había forma de usarlo.
    const centro = await base.localPorCodigo('bar-centro');

    const suya = await como<{ id: string }>(
      SARA,
      `insert into estook.movimiento_de_stock (
         local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
         fecha_operativa, motivo_de_merma
       )
       values ($1, $2, 'merma', -1, 0, 0, current_date, 'roto')
       returning id::text as id`,
      [centro, elProducto],
    );
    expect(suya).toHaveLength(1);

    await expect(
      como(
        SARA,
        `insert into estook.movimiento_de_stock (
           local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
           fecha_operativa
         )
         values ($1, $2, 'entrada', 5, 5, 100, current_date)`,
        [centro, elProducto],
      ),
    ).rejects.toThrow();
  });

  it('la partida que decide SQL es la misma que decide el dominio', async () => {
    // **Esta es la prueba que importa de todo el bloque.** La clasificación
    // «esto es una pérdida y esto es comida del personal» está escrita dos veces
    // —en SQL para poder agrupar, y en el dominio para poder pintar— y dos copias
    // de una regla se separan en cuanto nadie las mira. Aquí se miran.
    for (const motivo of MOTIVOS_DE_MERMA) {
      const [fila] = await comoDuena<{ partida: string }>(
        `select estook.partida_de_la_merma($1::estook.motivo_de_merma)::text as partida`,
        [motivo],
      );
      expect(fila?.partida, `el motivo «${motivo}»`).toBe(partidaDe(motivo));
    }
  });
});

// ── El cierre de caja ────────────────────────────────────────────────────────

describe('el cierre de caja', () => {
  it('un cocinero NO ve la facturación', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    await comoDuena(
      `insert into estook.cierre_de_caja (local_id, fecha_operativa, total_centimos, tickets)
       values ($1, current_date, 128050, 42)`,
      [centro],
    );

    const loQueVeMarcos = await como<{ id: string }>(
      MARCOS,
      `select id from estook.cierre_de_caja`,
    );
    expect(loQueVeMarcos).toEqual([]);

    const loQueVeRosa = await como<{ total_centimos: string }>(
      ROSA,
      `select total_centimos::text as total_centimos from estook.cierre_de_caja`,
    );
    expect(loQueVeRosa[0]?.total_centimos).toBe('128050');
  });

  it('no puede haber dos cierres del mismo día', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    await expect(
      comoDuena(
        `insert into estook.cierre_de_caja (local_id, fecha_operativa, total_centimos)
         values ($1, current_date, 999)`,
        [centro],
      ),
    ).rejects.toThrow(/cierre_uno_por_jornada|duplicate key/i);
  });

  it('el concepto se normaliza solo, para que M20 pueda emparejar', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    const [cierre] = await comoDuena<{ id: string }>(
      `select id from estook.cierre_de_caja where local_id = $1 limit 1`,
      [centro],
    );

    const [linea] = await comoDuena<{ concepto_normalizado: string }>(
      `insert into estook.linea_de_cierre (cierre_id, concepto, concepto_normalizado, unidades)
       values ($1, '  Tortilla de Patatas  ', '', 12)
       returning concepto_normalizado`,
      [cierre?.id],
    );
    expect(linea?.concepto_normalizado).toBe('tortilla de patatas');
  });
});

// ── Y el motor de horas, que es puro ─────────────────────────────────────────

describe('las horas y lo que cuestan', () => {
  it('un turno abierto no dura cero minutos: dura «todavía no se sabe»', () => {
    const entro = new Date('2026-09-10T09:00:00Z');
    expect(duracionDelTurno(entro, null)).toBeNull();
    expect(duracionDelTurno(entro, new Date('2026-09-10T17:30:00Z'))).toBe(510);
  });

  it('los segundos sueltos no cuentan como medio minuto trabajado', () => {
    const entro = new Date('2026-09-10T09:00:00Z');
    // 59 segundos de más: no es un minuto, y hacia arriba no se redondea nunca.
    expect(duracionDelTurno(entro, new Date('2026-09-10T09:10:59Z'))).toBe(10);
  });

  it('se leen en horas y minutos, que es como habla la gente', () => {
    expect(comoSeLeenLasHoras(510)).toBe('8 h 30 min');
    expect(comoSeLeenLasHoras(480)).toBe('8 h');
    expect(comoSeLeenLasHoras(45)).toBe('45 min');
  });

  it('un sueldo mensual sin horas de contrato no da coste por hora: da nulo', () => {
    // Suponer cuarenta horas a quien tiene veinte le duplica el coste en el food
    // cost. Nulo quiere decir «no lo sé», y la pantalla pinta una raya.
    expect(
      costeDeUnaHora({ forma: 'mensual', importeCentimos: 180_000, horasSemanales: null }),
    ).toBeNull();

    // 1.800 € al mes con 40 h a la semana: 40 × 52/12 = 173,33 h/mes → 10,38 €/h.
    expect(
      costeDeUnaHora({ forma: 'mensual', importeCentimos: 180_000, horasSemanales: 40 }),
    ).toBe(1038);
  });

  it('lo que cuesta un turno se cuenta por minutos, no por horas redondeadas', () => {
    const retribucion = { forma: 'por_hora' as const, importeCentimos: 1200, horasSemanales: 40 };
    // 8 h 30 min a 12 €/h son 102 €, no 96 ni 108.
    expect(loQueCuesta(510, retribucion)).toBe(10_200);
  });

  it('«quién se está pasando» es nulo si no hay contrato, no cero', () => {
    expect(comoVaConSuContrato(2400, null, 30)).toBeNull();
    // 40 h/semana durante 7 días son 2.400 minutos: justo lo que toca.
    expect(comoVaConSuContrato(2400, 40, 7)).toBe(0);
    expect(comoVaConSuContrato(2700, 40, 7)).toBe(300);
  });

  it('la merma se valora al coste medio, y en milésimas de céntimo', () => {
    // **La unidad importa y aquí se equivocó al escribirlo.** Las milésimas de
    // Estook son milésimas de **céntimo**, no de euro: 4.199 milésimas son 4,199
    // céntimos el kilo. Así que 2,5 kg son 10,4975 céntimos → 10 céntimos.
    //
    // Se deja escrito porque es la clase de error que no se ve: el número sale,
    // es plausible, y está cien veces mal. Lo cazó esta prueba.
    expect(valorDeLaMerma(2.5, 4199)).toBe(10);
    // Un producto de verdad: 8,50 € el kilo son 850 céntimos = 850.000 milésimas.
    // Dos kilos y medio de eso son 21,25 €, es decir 2.125 céntimos.
    expect(valorDeLaMerma(2.5, 850_000)).toBe(2125);
    // El signo da igual: en el libro va negativa y aquí se pregunta cuánto vale.
    expect(valorDeLaMerma(-2.5, 850_000)).toBe(2125);
  });
});
