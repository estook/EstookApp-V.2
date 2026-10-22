import { z } from 'zod';
import {
  elPaseHaSalido,
  horaDeCorte,
  jornadaDe,
  laJornadaEntera,
  laMesaEnCocina,
  loSiguienteDeLaMesa,
  type LaMesaEnCocina,
  type LoSiguiente,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  comoPaseDeLaMesa,
  comoPlatoDeLaMesa,
  elLocalDelServicio,
  elTituloDeLaCuenta,
  lasCuentas,
  losPases,
  losPlatos,
  type FilaDeCuenta,
  type FilaDeLinea,
  type FilaDePase,
} from '../sala.ts';

/**
 * Lo que se lee de la sala y la cocina (M20A · 1, decisión 0106).
 *
 *   el_plano    las zonas y sus mesas, cada una con cómo va
 *   la_mesa     una cuenta con sus platos, sus pases y lo siguiente que toca
 *   la_cocina   las mesas en marcha, esperando o fuera, **sin un solo importe**
 *
 * Lo de cada mesa sale del dominio (`sala.ts`): la sala y la cocina no pueden decir
 * cosas distintas porque las calcula la misma función.
 */

const MINUTO = 60_000;

function minutosDesde(contexto: Contexto, desde: string | null): number | null {
  if (desde === null) return null;
  return Math.max(0, Math.floor((contexto.ahora.getTime() - new Date(desde).getTime()) / MINUTO));
}

/** Las cuentas abiertas del local: las que tienen la mesa ocupada. */
async function lasAbiertas(contexto: Contexto, localId: string): Promise<string[]> {
  const filas = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.cuenta
     where local_id = ${localId}::uuid and liberada_en is null and anulada_en is null
     order by abierta_en
  `;
  return filas.map((f) => f.id);
}

function porCuenta<T extends { cuenta_id: string }>(filas: readonly T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const fila of filas) mapa.set(fila.cuenta_id, [...(mapa.get(fila.cuenta_id) ?? []), fila]);
  return mapa;
}

/** Lo que vale la cuenta: lo pedido y no quitado, con IVA, como en la carta. */
function elTotal(platos: readonly FilaDeLinea[]): number {
  return platos
    .filter((l) => l.quitada_en === null)
    .reduce((total, l) => total + l.precio_centimos * l.cantidad, 0);
}

function lasIniciales(nombre: string | null): string | null {
  if (nombre === null) return null;
  const partes = nombre.trim().split(/\s+/);
  return partes
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

// ═══ El plano ═════════════════════════════════════════════════════════════════

export type EstadoDeLaMesa = 'libre' | 'comiendo' | 'toca_marchar' | 'por_mandar';

export interface CuentaEnElPlano {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly iniciales: string | null;
  readonly esMia: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly loSiguiente: LoSiguiente;
}

export interface SalidaElPlano {
  readonly zonas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly mesas: readonly {
      readonly id: string;
      readonly nombre: string;
      readonly plazas: number;
      readonly forma: string;
      readonly x: number;
      readonly y: number;
      readonly estado: EstadoDeLaMesa;
      readonly cuenta: CuentaEnElPlano | null;
    }[];
  }[];
  /** La barra y lo de llevar: abierto y sin mesa. */
  readonly sinMesa: readonly CuentaEnElPlano[];
  /** «Mesa 6 · ha salido todo el 1.º»: lo que toca marchar ahora. */
  readonly tocaMarchar: readonly {
    readonly cuentaId: string;
    readonly titulo: string;
    readonly pase: number;
  }[];
}

function enElPlano(
  contexto: Contexto,
  cuenta: FilaDeCuenta,
  platos: readonly FilaDeLinea[],
  pases: readonly FilaDePase[],
): CuentaEnElPlano {
  return {
    cuentaId: cuenta.id,
    titulo: elTituloDeLaCuenta(cuenta),
    tipo: cuenta.tipo,
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    iniciales: lasIniciales(cuenta.camarero),
    esMia: cuenta.camarero_id !== null && cuenta.camarero_id === contexto.personaId,
    minutos: minutosDesde(contexto, cuenta.abierta_en) ?? 0,
    totalCentimos: elTotal(platos),
    loSiguiente: loSiguienteDeLaMesa(platos.map(comoPlatoDeLaMesa), pases.map(comoPaseDeLaMesa)),
  };
}

function elEstado(cuenta: CuentaEnElPlano | null): EstadoDeLaMesa {
  if (cuenta === null) return 'libre';
  if (cuenta.loSiguiente.que === 'marchar') return 'toca_marchar';
  if (cuenta.loSiguiente.que === 'mandar') return 'por_mandar';
  return 'comiendo';
}

export const elPlano = consulta<Record<string, never>, SalidaElPlano>({
  nombre: 'el_plano',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const zonas = await contexto.sql<{ id: string; nombre: string }[]>`
      select id::text as id, nombre from estook.zona_de_sala
       where local_id = ${localId}::uuid and archivada_en is null
       order by orden, nombre
    `;
    const mesas = await contexto.sql<
      {
        id: string;
        zona_id: string;
        nombre: string;
        plazas: number;
        forma: string;
        x: number;
        y: number;
      }[]
    >`
      select id::text as id, zona_id::text as zona_id, nombre, plazas, forma, x, y
        from estook.mesa
       where local_id = ${localId}::uuid and archivada_en is null
       order by nombre
    `;
    const ids = await lasAbiertas(contexto, localId);
    const cuentas = await lasCuentas(contexto, localId, ids);
    const platos = porCuenta(await losPlatos(contexto, ids));
    const pases = porCuenta(await losPases(contexto, ids));
    const enPlano = cuentas.map((c) => ({
      fila: c,
      cuenta: enElPlano(contexto, c, platos.get(c.id) ?? [], pases.get(c.id) ?? []),
    }));
    const porMesa = new Map(
      enPlano.filter((c) => c.fila.mesa_id !== null).map((c) => [c.fila.mesa_id, c.cuenta]),
    );

    return {
      zonas: zonas.map((z) => ({
        id: z.id,
        nombre: z.nombre,
        mesas: mesas
          .filter((m) => m.zona_id === z.id)
          .map((m) => {
            const cuenta = porMesa.get(m.id) ?? null;
            return {
              id: m.id,
              nombre: m.nombre,
              plazas: m.plazas,
              forma: m.forma,
              x: m.x,
              y: m.y,
              estado: elEstado(cuenta),
              cuenta,
            };
          }),
      })),
      sinMesa: enPlano.filter((c) => c.fila.mesa_id === null).map((c) => c.cuenta),
      tocaMarchar: enPlano.flatMap((c) =>
        c.cuenta.loSiguiente.que === 'marchar'
          ? [
              {
                cuentaId: c.cuenta.cuentaId,
                titulo: c.cuenta.titulo,
                pase: c.cuenta.loSiguiente.pase,
              },
            ]
          : [],
      ),
    };
  },
});

// ═══ Una mesa ═════════════════════════════════════════════════════════════════

export type EstadoDelPlato =
  'sin_mandar' | 'en_espera' | 'en_marcha' | 'salio' | 'en_la_barra' | 'quitado';

export interface PlatoDeLaCuenta {
  readonly id: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  readonly parteDe: string | null;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioCentimos: number;
  readonly destino: string;
  readonly pase: number | null;
  readonly nota: string | null;
  readonly estado: EstadoDelPlato;
  readonly salioEn: string | null;
  readonly motivoDeQuitar: string | null;
  readonly vuelve: string | null;
}

export interface SalidaLaMesa {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly mesaId: string | null;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly porPases: boolean;
  readonly notaParaCocina: string | null;
  readonly abierta: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly platos: readonly PlatoDeLaCuenta[];
  readonly pases: readonly {
    readonly numero: number;
    readonly marchadoEn: string | null;
    readonly haSalido: boolean;
  }[];
  readonly loSiguiente: LoSiguiente;
}

function elEstadoDelPlato(linea: FilaDeLinea, pases: readonly FilaDePase[]): EstadoDelPlato {
  if (linea.quitada_en !== null) return 'quitado';
  if (linea.mandada_en === null) return 'sin_mandar';
  if (linea.destino !== 'cocina') return 'en_la_barra';
  if (linea.salio_en !== null) return 'salio';
  const pase = pases.find((p) => p.numero === linea.pase);
  return pase?.marchado_en === null || pase === undefined ? 'en_espera' : 'en_marcha';
}

export const laMesa = consulta<{ cuenta_id: string }, SalidaLaMesa>({
  nombre: 'la_mesa',
  entrada: z.object({ cuenta_id: z.string().uuid() }).strict(),
  exige: 'accion.tomar_nota',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const [cuenta] = await lasCuentas(contexto, localId, [entrada.cuenta_id]);
    if (cuenta === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa mesa no está en este local.' });
    }
    const platos = await losPlatos(contexto, [cuenta.id]);
    const pases = await losPases(contexto, [cuenta.id]);
    const enElDominio = platos.map(comoPlatoDeLaMesa);
    return {
      cuentaId: cuenta.id,
      titulo: elTituloDeLaCuenta(cuenta),
      tipo: cuenta.tipo,
      mesaId: cuenta.mesa_id,
      personas: cuenta.personas,
      camarero: cuenta.camarero,
      porPases: cuenta.por_pases,
      notaParaCocina: cuenta.nota_para_cocina,
      abierta: cuenta.liberada_en === null && cuenta.anulada_en === null,
      minutos: minutosDesde(contexto, cuenta.abierta_en) ?? 0,
      totalCentimos: elTotal(platos),
      platos: platos.map((l) => ({
        id: l.id,
        platoId: l.plato_id,
        menuId: l.menu_id,
        parteDe: l.parte_de,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioCentimos: l.precio_centimos,
        destino: l.destino,
        pase: l.pase,
        nota: l.nota,
        estado: elEstadoDelPlato(l, pases),
        salioEn: l.salio_en,
        motivoDeQuitar: l.motivo_de_quitar,
        vuelve: l.motivo_de_vuelve,
      })),
      pases: pases.map((p) => ({
        numero: p.numero,
        marchadoEn: p.marchado_en,
        haSalido: elPaseHaSalido(enElDominio, p.numero),
      })),
      loSiguiente: loSiguienteDeLaMesa(enElDominio, pases.map(comoPaseDeLaMesa)),
    };
  },
});

// ═══ La cocina ════════════════════════════════════════════════════════════════

export interface PlatoEnCocina {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly nota: string | null;
  readonly delMenu: boolean;
  readonly salioEn: string | null;
  /** Pedido después de mandar la mesa: «NUEVO». */
  readonly nuevo: boolean;
  /** Su nota cambió después de mandarlo: «CAMBIO». */
  readonly cambio: boolean;
  /** Se quitó ya en cocina: «ANULADO». */
  readonly anulado: boolean;
  /** Se devolvió y se rehace: «VUELVE», con su motivo. */
  readonly vuelve: string | null;
}

export interface TarjetaDeCocina {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly notaParaCocina: string | null;
  readonly porPases: boolean;
  readonly estado: LaMesaEnCocina;
  readonly llegoEn: string;
  /** Desde la llegada, o desde la última marcha si la hubo. */
  readonly minutos: number;
  readonly ultimaMarcha: string | null;
  readonly fueraEn: string | null;
  readonly pases: readonly {
    readonly numero: number;
    readonly marchadoEn: string | null;
    readonly fueraEn: string | null;
    readonly platos: readonly PlatoEnCocina[];
  }[];
}

export interface SalidaLaCocina {
  readonly enMarcha: readonly TarjetaDeCocina[];
  readonly esperando: readonly TarjetaDeCocina[];
  readonly fuera: readonly TarjetaDeCocina[];
}

/** El principio de la jornada de hoy, con la hora de corte del local (M16a). */
async function elPrincipioDeHoy(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}::uuid
  `;
  const local = filas[0];
  if (local === undefined) throw new FalloDeAplicacion('local_ajeno');
  const corte = horaDeCorte(local.hora_de_corte);
  const hoy = jornadaDe(contexto.ahora, local.zona_horaria, corte);
  return laJornadaEntera(hoy, local.zona_horaria, corte).empieza.toISOString();
}

function laTarjeta(
  contexto: Contexto,
  cuenta: FilaDeCuenta,
  platos: readonly FilaDeLinea[],
  pases: readonly FilaDePase[],
): TarjetaDeCocina | null {
  const deCocina = platos.filter((l) => l.destino === 'cocina' && l.mandada_en !== null);
  if (deCocina.length === 0) return null;
  const estado = laMesaEnCocina(platos.map(comoPlatoDeLaMesa), pases.map(comoPaseDeLaMesa));
  const llegoEn = deCocina.map((l) => l.mandada_en as string).sort()[0] as string;
  const marchas = pases.flatMap((p) => (p.marchado_en === null ? [] : [p.marchado_en])).sort();
  const ultimaMarcha = marchas.length > 1 ? (marchas[marchas.length - 1] ?? null) : null;
  const fueras = pases.flatMap((p) => (p.fuera_en === null ? [] : [p.fuera_en])).sort();
  const numeros = [...new Set(deCocina.map((l) => l.pase as number))].sort((a, b) => a - b);
  return {
    cuentaId: cuenta.id,
    titulo: elTituloDeLaCuenta(cuenta),
    tipo: cuenta.tipo,
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    notaParaCocina: cuenta.nota_para_cocina,
    porPases: cuenta.por_pases,
    estado,
    llegoEn,
    minutos: minutosDesde(contexto, ultimaMarcha ?? llegoEn) ?? 0,
    ultimaMarcha,
    fueraEn: estado === 'fuera' ? (fueras[fueras.length - 1] ?? null) : null,
    pases: numeros.map((numero) => {
      const pase = pases.find((p) => p.numero === numero);
      return {
        numero,
        marchadoEn: pase?.marchado_en ?? null,
        fueraEn: pase?.fuera_en ?? null,
        // Sin precio: la cocina no recibe un importe, tampoco en la respuesta (Anexo 3.2).
        platos: deCocina
          .filter((l) => l.pase === numero)
          .map((l) => ({
            id: l.id,
            nombre: l.nombre,
            cantidad: l.cantidad,
            nota: l.nota,
            delMenu: l.parte_de !== null,
            salioEn: l.salio_en,
            nuevo: l.mandada_en !== null && l.mandada_en > llegoEn,
            cambio: l.nota_cambiada_en !== null,
            anulado: l.quitada_en !== null,
            vuelve: l.motivo_de_vuelve,
          })),
      };
    }),
  };
}

export const laCocina = consulta<Record<string, never>, SalidaLaCocina>({
  nombre: 'la_cocina',
  entrada: z.object({}).strict(),
  exige: 'accion.cocinar',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const desde = await elPrincipioDeHoy(contexto, localId);
    // Las abiertas, y las de hoy ya liberadas para «Fuera».
    const filas = await contexto.sql<{ id: string }[]>`
      select c.id::text as id
        from estook.cuenta c
       where c.local_id = ${localId}::uuid
         and c.anulada_en is null
         and (c.liberada_en is null or c.abierta_en >= ${desde}::timestamptz)
         and c.unida_a is null
         and exists (
           select 1 from estook.linea_de_cuenta l
            where l.cuenta_id = c.id and l.destino = 'cocina' and l.mandada_en is not null
         )
       order by c.abierta_en
    `;
    const ids = filas.map((f) => f.id);
    const cuentas = await lasCuentas(contexto, localId, ids);
    const platos = porCuenta(await losPlatos(contexto, ids));
    const pases = porCuenta(await losPases(contexto, ids));
    const tarjetas = cuentas.flatMap((c) => {
      const t = laTarjeta(contexto, c, platos.get(c.id) ?? [], pases.get(c.id) ?? []);
      return t === null ? [] : [t];
    });
    // Lo que va tarde, arriba: el que más lleva esperando primero.
    const enMarcha = tarjetas
      .filter((t) => t.estado === 'en_marcha')
      .sort((a, b) => b.minutos - a.minutos);
    return {
      enMarcha,
      esperando: tarjetas.filter((t) => t.estado === 'esperando'),
      fuera: tarjetas
        .filter((t) => t.estado === 'fuera')
        .sort((a, b) => (b.fueraEn ?? '').localeCompare(a.fueraEn ?? '')),
    };
  },
});
