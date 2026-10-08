import { esDeLosQuePagan, estaEnLaPestana, type ActividadDeCliente } from './clientes.ts';
import { centimos, conSimbolo } from './dinero.ts';
import { sinIva } from './iva.ts';
import type { CifraDelCorreo } from './informes.ts';
import type { ComoEstaLaCuenta } from './suscripcion.ts';
import { diaDeLaSemana, masDias, type FechaOperativa } from './tiempo.ts';
import type { OrigenDeLlegada } from './vendedores.ts';

/**
 * Las ventas de Estook, en el admin (entrega A4 · decisión 0077).
 *
 * «Cómo va Estook como negocio, en una pantalla»: cuántos pagan, cuánto entra al mes,
 * cuántos llegan y por dónde, cuántos se van y qué vendedor trae clientes que se
 * quedan. Aquí vive **toda la cuenta**, sin leer nada: la API junta lo que hay —los
 * clientes de hoy, la foto de cada día, lo cobrado y las visitas— y esto decide.
 *
 * Lo que contestó Richi (8-oct): **el dinero sin IVA** (1A); **lo cobrado además de la
 * cuota** (2A); **las visitas, solo las de los enlaces de vendedor** (3B); y **un
 * correo cada lunes** (4A).
 *
 * Las reglas que no se ven, dichas una vez:
 *
 *   · **No cuentan** los de ejemplo, los de la casa (IKATZ) ni lo de otro modo de
 *     Stripe: hoy, con Stripe de prueba, cuenta lo de prueba; el día que se cobre de
 *     verdad, lo de prueba deja de contar solo.
 *   · **«Pagando» es lo mismo que en Clientes y en Vendedores** (`estaEnLaPestana`).
 *     Para la cuota y para saber quién se ha ido cuenta además el cobro fallido que
 *     aún no ha pasado a solo lectura (`esDeLosQuePagan`): todavía no se ha ido.
 *   · **Una baja** es un cliente que pagaba en una foto y en la siguiente ya no (y no
 *     está de prueba). Sale de las fotos de cada día, que dicen cómo estaba la cuenta
 *     desde A4: antes, no se sabe, y se dice «desde cuándo».
 *   · **La pérdida de clientes** (churn, panel de administración 4): las bajas del
 *     periodo entre los que pagaban al empezarlo. Con menos de diez, en «1 de 4» y no
 *     en tanto por ciento: un 25 % con cuatro clientes asusta y no dice nada.
 */

// ── El dinero, sin IVA (1A) ──────────────────────────────────────────────────

/** El IVA de las cuotas de Estook: el general, dentro del precio (0048). */
export const IVA_DE_LA_CUOTA = 0.21;

/** Lo que es de Estook de una cuota con el IVA dentro: 99 € son 81,82 €. */
export function laCuotaSinIva(conIva: number): number {
  return sinIva(centimos(conIva), IVA_DE_LA_CUOTA);
}

/** Con menos de estos pagando al empezar, la pérdida no se da en tanto por ciento. */
export const PAGANDO_PARA_UN_PORCENTAJE = 10;

// ── El periodo ───────────────────────────────────────────────────────────────

export const PERIODOS_DE_VENTAS = ['7', 'mes', 'trimestre', 'ano'] as const;
export type PeriodoDeVentas = (typeof PERIODOS_DE_VENTAS)[number];

export const NOMBRE_DEL_PERIODO: Readonly<Record<PeriodoDeVentas, string>> = {
  '7': '7 días',
  mes: 'Este mes',
  trimestre: 'Este trimestre',
  ano: 'Este año',
};

/** Con qué se compara, dicho para debajo de la cifra. */
export const CONTRA_QUE: Readonly<Record<PeriodoDeVentas, string>> = {
  '7': 'frente a los 7 días de antes',
  mes: 'frente a lo mismo del mes pasado',
  trimestre: 'frente a lo mismo del trimestre pasado',
  ano: 'frente a lo mismo del año pasado',
};

export interface Tramo {
  readonly desde: FechaOperativa;
  readonly hasta: FechaOperativa;
}

function primerDia(periodo: PeriodoDeVentas, fecha: FechaOperativa): FechaOperativa {
  const [anio, mes] = fecha.split('-').map(Number) as [number, number];
  const dos = (n: number) => String(n).padStart(2, '0');
  switch (periodo) {
    case '7':
      return masDias(fecha, -6);
    case 'mes':
      return `${String(anio)}-${dos(mes)}-01` as FechaOperativa;
    case 'trimestre':
      return `${String(anio)}-${dos(Math.floor((mes - 1) / 3) * 3 + 1)}-01` as FechaOperativa;
    case 'ano':
      return `${String(anio)}-01-01` as FechaOperativa;
  }
}

/**
 * El tramo de este periodo, hasta hoy, y **el mismo trozo del anterior**: el día 8 se
 * compara con los ocho primeros días del mes pasado, no con el mes entero, que
 * siempre ganaría. Si el anterior es más corto (31 de marzo), acaba en su último día.
 */
export function losTramos(
  periodo: PeriodoDeVentas,
  hoy: FechaOperativa,
): { readonly este: Tramo; readonly antes: Tramo } {
  const desde = primerDia(periodo, hoy);
  if (periodo === '7') {
    return {
      este: { desde, hasta: hoy },
      antes: { desde: masDias(desde, -7), hasta: masDias(desde, -1) },
    };
  }
  const finDelAnterior = masDias(desde, -1);
  const desdeAntes = primerDia(periodo, finDelAnterior);
  // El mismo día del calendario, unos meses antes: contar días se descuadra con los
  // meses de 30 y 31 y con los años bisiestos.
  const mismoDia = mesesAntes(hoy, MESES_DEL_PERIODO[periodo]);
  return {
    este: { desde, hasta: hoy },
    antes: { desde: desdeAntes, hasta: mismoDia < finDelAnterior ? mismoDia : finDelAnterior },
  };
}

const MESES_DEL_PERIODO: Readonly<Record<Exclude<PeriodoDeVentas, '7'>, number>> = {
  mes: 1,
  trimestre: 3,
  ano: 12,
};

/** El mismo día, `meses` antes; si ese mes no lo tiene (un 31), su último día. */
function mesesAntes(dia: FechaOperativa, meses: number): FechaOperativa {
  const [anio, mes, d] = dia.split('-').map(Number) as [number, number, number];
  const total = anio * 12 + (mes - 1) - meses;
  const a = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${String(a)}-${dos(m)}-${dos(Math.min(d, ultimo))}` as FechaOperativa;
}

const enElTramo = (fecha: string, t: Tramo) => fecha >= t.desde && fecha <= t.hasta;

/** El lunes de la semana de un día. */
export function elLunes(dia: FechaOperativa): FechaOperativa {
  return masDias(dia, 1 - diaDeLaSemana(dia));
}

// ── Lo que se cuenta ─────────────────────────────────────────────────────────

export type ModoDeCobro = 'prueba' | 'real';

/** Un cliente, como está hoy. */
export interface ClienteDeVentas {
  readonly id: string;
  readonly nombre: string;
  /** El día de alta, en Madrid. */
  readonly alta: FechaOperativa;
  readonly como: ComoEstaLaCuenta;
  readonly enPausa: boolean;
  readonly actividad: ActividadDeCliente | null;
  readonly cancelaAlAcabar: boolean;
  readonly diasSinEntrar: number | null;
  readonly esEjemplo: boolean;
  readonly deLaCasa: boolean;
  /** El modo de Stripe de su suscripción. Nulo: no ha pasado por Stripe. */
  readonly modo: ModoDeCobro | null;
  /** Lo que deja al mes, en céntimos y **con IVA**. Nulo sin plan. */
  readonly cuotaAlMes: number | null;
  readonly origen: OrigenDeLlegada;
  readonly vendedor: { readonly id: string; readonly nombre: string } | null;
  /** Si ha elegido plan: ha pasado por la página de pago. */
  readonly eligioPlan: boolean;
}

/** Cómo estaba un cliente un día: la foto de esa noche (A2), desde A4 con su cuenta. */
export interface FotoDeVentas {
  readonly organizacionId: string;
  readonly dia: FechaOperativa;
  readonly como: ComoEstaLaCuenta;
  readonly enPausa: boolean;
  /** Con IVA. Nulo si no pagaba. */
  readonly cuotaAlMes: number | null;
  readonly deLaCasa: boolean;
  readonly modo: ModoDeCobro | null;
}

/** Un cobro, o una devolución (en negativo). */
export interface ApunteDeDinero {
  readonly organizacionId: string;
  readonly dia: FechaOperativa;
  /** Con IVA, en céntimos. Negativo si es una devolución. */
  readonly importe: number;
  /** Sin IVA, como lo dice la factura. Negativo si es una devolución. */
  readonly sinIva: number;
  readonly modo: ModoDeCobro;
}

/** Las veces que se abrió el enlace de un código un día (3B). */
export interface VisitasDeUnDia {
  readonly vendedorId: string;
  readonly vendedor: string;
  readonly dia: FechaOperativa;
  readonly visitas: number;
}

/** Si un cliente cuenta en las ventas. */
export function cuentaEnVentas(c: ClienteDeVentas, modo: ModoDeCobro): boolean {
  return !c.esEjemplo && !c.deLaCasa && (c.modo === null || c.modo === modo);
}

function laFotoCuenta(f: FotoDeVentas, modo: ModoDeCobro): boolean {
  return !f.deLaCasa && (f.modo === null || f.modo === modo);
}

/** Si sigue con nosotros: paga o está probando. */
function sigue(c: { readonly como: ComoEstaLaCuenta; readonly enPausa: boolean }): boolean {
  return esDeLosQuePagan(c) || c.como === 'prueba';
}

// ── Lo que sale ──────────────────────────────────────────────────────────────

/** Una cifra de ahora, y la del periodo anterior para su flecha. Nula: no se sabe. */
export interface Cifra {
  readonly ahora: number;
  readonly antes: number | null;
}

/** Dinero: sin IVA (1A), y con él para quien toque la cifra. */
export interface CifraDeDinero {
  readonly ahora: number;
  readonly conIva: number;
  readonly antes: number | null;
}

export interface TableroDeVentas {
  readonly periodo: PeriodoDeVentas;
  readonly este: Tramo;
  readonly antes: Tramo;
  readonly modo: ModoDeCobro;
  /** El primer día con la cuenta en la foto: antes de él no se saben bajas ni cuota. */
  readonly fotosDesde: FechaOperativa | null;
  readonly clientes: {
    readonly pagando: Cifra;
    readonly enPausa: number;
    readonly enPrueba: Cifra;
    readonly seVan: number;
    readonly sinPagar: number;
    readonly deLaCasa: number;
    readonly altas: Cifra;
    /** Nula: no hay fotos con la cuenta de ese tramo. */
    readonly bajas: { readonly ahora: number | null; readonly antes: number | null };
    /** De las altas del periodo, cuántas han llegado a pagar. */
    readonly conversion: { readonly cuentas: number; readonly pagan: number };
    /** De los que pagaban al empezar el periodo, cuántos siguen pagando. */
    readonly retencion: { readonly pagaban: number; readonly siguen: number } | null;
  };
  readonly dinero: {
    readonly cuotaAlMes: CifraDeDinero;
    readonly cobrado: CifraDeDinero;
    readonly perdida: {
      readonly bajas: number | null;
      readonly pagaban: number | null;
      /** Solo con diez o más pagando al empezar. */
      readonly porcentaje: number | null;
      /** La cuota que se fue con ellos, sin IVA. */
      readonly cuota: number | null;
    };
  };
  readonly origenes: readonly { readonly origen: OrigenDeLlegada; readonly altas: number }[];
  readonly vendedores: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly traidos: number;
    readonly pagan: number;
    /** Sin IVA. */
    readonly cuotaAlMes: number;
    /** Las veces que se ha abierto alguno de sus enlaces, desde siempre. */
    readonly visitas: number;
  }[];
  readonly embudo: {
    /** Las veces que se abrió un enlace de vendedor en el periodo (3B). */
    readonly visitas: number;
    readonly cuentas: number;
    readonly conVendedor: number;
    readonly eligieronPlan: number;
    readonly pagan: number;
  };
  /** Los que se están yendo, con el porqué, los más urgentes primero. */
  readonly seVanQuienes: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly porque: string;
  }[];
  readonly series: {
    readonly semanas: readonly {
      readonly lunes: FechaOperativa;
      readonly altas: number;
      readonly bajas: number;
    }[];
    readonly pagando: readonly { readonly lunes: FechaOperativa; readonly pagando: number }[];
    /** Sin IVA. */
    readonly meses: readonly {
      readonly mes: string;
      readonly cuota: number;
      readonly nueva: number;
      readonly ampliada: number;
      readonly perdida: number;
      readonly reducida: number;
    }[];
    readonly cohortes: readonly {
      readonly mes: string;
      readonly altas: number;
      readonly siguen: number;
    }[];
  };
}

export interface LoQueHayParaLasVentas {
  readonly periodo: PeriodoDeVentas;
  readonly hoy: FechaOperativa;
  readonly modo: ModoDeCobro;
  readonly clientes: readonly ClienteDeVentas[];
  readonly fotos: readonly FotoDeVentas[];
  readonly dinero: readonly ApunteDeDinero[];
  readonly visitas: readonly VisitasDeUnDia[];
}

const SEMANAS_EN_LA_GRAFICA = 12;
const MESES_EN_LA_GRAFICA = 12;
const MESES_DE_COHORTES = 6;

/** Las fotos por día, y la de un día: la última que haya hasta él. */
function lasFotosPorDia(fotos: readonly FotoDeVentas[], modo: ModoDeCobro) {
  const porDia = new Map<string, Map<string, FotoDeVentas>>();
  for (const f of fotos) {
    let delDia = porDia.get(f.dia);
    if (delDia === undefined) {
      delDia = new Map();
      porDia.set(f.dia, delDia);
    }
    delDia.set(f.organizacionId, f);
  }
  const dias = [...porDia.keys()].sort();
  const cuentan = (delDia: ReadonlyMap<string, FotoDeVentas>) =>
    [...delDia.values()].filter((f) => laFotoCuenta(f, modo));

  /** Las fotos que cuentan del último día con foto que no pase de `dia`. */
  function delDia(dia: string): readonly FotoDeVentas[] | null {
    let elegido: string | null = null;
    for (const d of dias) {
      if (d > dia) break;
      elegido = d;
    }
    if (elegido === null) return null;
    return cuentan(porDia.get(elegido) ?? new Map());
  }

  /** Cada baja, con su día y la cuota que se llevó (con IVA). */
  const bajas: { dia: FechaOperativa; cuota: number }[] = [];
  for (let i = 1; i < dias.length; i += 1) {
    const ayer = porDia.get(dias[i - 1] ?? '') ?? new Map<string, FotoDeVentas>();
    const hoy = porDia.get(dias[i] ?? '') ?? new Map<string, FotoDeVentas>();
    for (const [id, antes] of ayer) {
      if (!laFotoCuenta(antes, modo) || !esDeLosQuePagan(antes)) continue;
      const ahora = hoy.get(id);
      if (ahora !== undefined && (esDeLosQuePagan(ahora) || ahora.como === 'prueba')) continue;
      bajas.push({ dia: (dias[i] ?? '') as FechaOperativa, cuota: antes.cuotaAlMes ?? 0 });
    }
  }

  return {
    primerDia: (dias[0] ?? null) as FechaOperativa | null,
    delDia,
    bajas,
    dias,
  };
}

const cuotaDe = (fotos: readonly FotoDeVentas[]) =>
  fotos.filter((f) => esDeLosQuePagan(f)).reduce((suma, f) => suma + (f.cuotaAlMes ?? 0), 0);

function elPorque(c: ClienteDeVentas): { porque: string; orden: number } | null {
  if (c.como === 'impago') return { porque: 'Tiene un cobro fallido', orden: 0 };
  if (c.cancelaAlAcabar) return { porque: 'Ha pedido cancelar', orden: 1 };
  if (c.actividad === 'dormido') {
    return {
      porque:
        c.diasSinEntrar === null
          ? 'No ha entrado nunca'
          : `${String(c.diasSinEntrar)} días sin entrar`,
      orden: 2,
    };
  }
  if (c.actividad === 'bajando') return { porque: 'Lo usa la mitad que hace un mes', orden: 3 };
  return null;
}

/** El tablero entero. **Todo lo cuenta el servidor**; la pantalla solo lo pinta. */
export function elTableroDeVentas(hay: LoQueHayParaLasVentas): TableroDeVentas {
  const { periodo, hoy, modo } = hay;
  const { este, antes } = losTramos(periodo, hoy);
  const clientes = hay.clientes.filter((c) => cuentaEnVentas(c, modo));
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const fotos = lasFotosPorDia(
    hay.fotos.filter((f) => f.dia <= hoy),
    modo,
  );
  const dinero = hay.dinero.filter((d) => d.modo === modo);

  const haPagado = new Set(dinero.filter((d) => d.importe > 0).map((d) => d.organizacionId));
  for (const c of clientes) if (esDeLosQuePagan(c)) haPagado.add(c.id);

  const enLa = (pestana: Parameters<typeof estaEnLaPestana>[0]) =>
    clientes.filter((c) => estaEnLaPestana(pestana, c)).length;

  // Al empezar el periodo: la foto de la víspera.
  const alEmpezar = fotos.delDia(masDias(este.desde, -1));
  const enLaFoto = (lista: readonly FotoDeVentas[], pestana: 'pagando' | 'prueba') =>
    lista.filter((f) =>
      estaEnLaPestana(pestana, {
        como: f.como,
        enPausa: f.enPausa,
        actividad: null,
        cancelaAlAcabar: false,
      }),
    ).length;

  const altasEn = (t: Tramo) => clientes.filter((c) => enElTramo(c.alta, t));
  const sabeBajasDe = (t: Tramo) => fotos.primerDia !== null && fotos.primerDia < t.hasta;
  const bajasEn = (t: Tramo) => fotos.bajas.filter((b) => enElTramo(b.dia, t));

  const cobradoEn = (t: Tramo) => {
    const suyos = dinero.filter((d) => enElTramo(d.dia, t));
    return {
      conIva: suyos.reduce((s, d) => s + d.importe, 0),
      sinIva: suyos.reduce((s, d) => s + d.sinIva, 0),
    };
  };

  const pagandoAlEmpezar = alEmpezar?.filter((f) => esDeLosQuePagan(f)) ?? null;
  const cuotaAhora = clientes
    .filter((c) => esDeLosQuePagan(c))
    .reduce((s, c) => s + (c.cuotaAlMes ?? 0), 0);

  const bajasAhora = sabeBajasDe(este) ? bajasEn(este) : null;
  const pagaban = pagandoAlEmpezar?.length ?? null;

  // Por dónde llegan, en el periodo.
  const porOrigen = new Map<OrigenDeLlegada, number>();
  for (const c of altasEn(este)) porOrigen.set(c.origen, (porOrigen.get(c.origen) ?? 0) + 1);

  // Los vendedores: los que han traído a alguien y los que tienen visitas.
  const vendedores = new Map<
    string,
    { id: string; nombre: string; traidos: number; pagan: number; cuota: number; visitas: number }
  >();
  const elVendedor = (id: string, nombre: string) => {
    let v = vendedores.get(id);
    if (v === undefined) {
      v = { id, nombre, traidos: 0, pagan: 0, cuota: 0, visitas: 0 };
      vendedores.set(id, v);
    }
    return v;
  };
  for (const c of clientes) {
    if (c.vendedor === null) continue;
    const v = elVendedor(c.vendedor.id, c.vendedor.nombre);
    v.traidos += 1;
    if (estaEnLaPestana('pagando', c)) v.pagan += 1;
    if (esDeLosQuePagan(c)) v.cuota += c.cuotaAlMes ?? 0;
  }
  for (const d of hay.visitas) elVendedor(d.vendedorId, d.vendedor).visitas += d.visitas;

  const altas = altasEn(este);

  // Las series.
  const lunesDeHoy = elLunes(hoy);
  const semanas = Array.from({ length: SEMANAS_EN_LA_GRAFICA }, (_, i) =>
    masDias(lunesDeHoy, -7 * (SEMANAS_EN_LA_GRAFICA - 1 - i)),
  );
  const laSemana = (lunes: FechaOperativa): Tramo => ({ desde: lunes, hasta: masDias(lunes, 6) });

  const elMes = (dia: string) => dia.slice(0, 7);
  const mesesAtras = (n: number) => {
    const [anio, mes] = hoy.split('-').map(Number) as [number, number];
    return Array.from({ length: n }, (_, i) => {
      const cuantos = n - 1 - i;
      const total = anio * 12 + (mes - 1) - cuantos;
      return `${String(Math.floor(total / 12))}-${String((total % 12) + 1).padStart(2, '0')}`;
    });
  };

  const meses = mesesAtras(MESES_EN_LA_GRAFICA)
    .map((mes) => {
      const primero = `${mes}-01` as FechaOperativa;
      const fin = masDias(`${mesSiguiente(mes)}-01` as FechaOperativa, -1);
      const alFinal = fotos.delDia(fin < hoy ? fin : hoy);
      // Al empezar: la víspera; si no hay, la primera foto del mes.
      const alPrincipio =
        fotos.delDia(masDias(primero, -1)) ??
        (fotos.primerDia !== null && elMes(fotos.primerDia) === mes
          ? fotos.delDia(fotos.primerDia)
          : null);
      if (alFinal === null || alPrincipio === null || elMes(primero) > elMes(hoy)) return null;
      if (fotos.primerDia !== null && fotos.primerDia > fin) return null;
      const cuotaEn = (lista: readonly FotoDeVentas[]) =>
        new Map(
          lista.filter((f) => esDeLosQuePagan(f)).map((f) => [f.organizacionId, f.cuotaAlMes ?? 0]),
        );
      const ini = cuotaEn(alPrincipio);
      const end = cuotaEn(alFinal);
      let nueva = 0;
      let ampliada = 0;
      let perdida = 0;
      let reducida = 0;
      for (const [id, e] of end) {
        const s = ini.get(id);
        if (s === undefined) nueva += e;
        else if (e > s) ampliada += e - s;
        else if (e < s) reducida += s - e;
      }
      for (const [id, s] of ini) if (!end.has(id)) perdida += s;
      const total = [...end.values()].reduce((a, b) => a + b, 0);
      return {
        mes,
        cuota: laCuotaSinIva(total),
        nueva: laCuotaSinIva(nueva),
        ampliada: laCuotaSinIva(ampliada),
        perdida: laCuotaSinIva(perdida),
        reducida: laCuotaSinIva(reducida),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const cohortes = mesesAtras(MESES_DE_COHORTES)
    .map((mes) => {
      const suyos = clientes.filter((c) => elMes(c.alta) === mes);
      return { mes, altas: suyos.length, siguen: suyos.filter((c) => sigue(c)).length };
    })
    .filter((c) => c.altas > 0);

  const seVanQuienes = clientes
    .filter((c) => estaEnLaPestana('se_van', c))
    .map((c) => ({ c, por: elPorque(c) }))
    .filter(
      (x): x is { c: ClienteDeVentas; por: { porque: string; orden: number } } => x.por !== null,
    )
    .sort((a, b) => a.por.orden - b.por.orden || a.c.nombre.localeCompare(b.c.nombre, 'es'))
    .map((x) => ({ id: x.c.id, nombre: x.c.nombre, porque: x.por.porque }));

  const cobradoAhora = cobradoEn(este);
  const cuotaPerdida = bajasAhora === null ? null : bajasAhora.reduce((s, b) => s + b.cuota, 0);

  return {
    periodo,
    este,
    antes,
    modo,
    fotosDesde: fotos.primerDia,
    clientes: {
      pagando: {
        ahora: enLa('pagando'),
        antes: alEmpezar === null ? null : enLaFoto(alEmpezar, 'pagando'),
      },
      enPausa: clientes.filter((c) => c.enPausa).length,
      enPrueba: {
        ahora: enLa('prueba'),
        antes: alEmpezar === null ? null : enLaFoto(alEmpezar, 'prueba'),
      },
      seVan: enLa('se_van'),
      sinPagar: enLa('baja'),
      deLaCasa: hay.clientes.filter((c) => c.deLaCasa && !c.esEjemplo).length,
      altas: { ahora: altas.length, antes: altasEn(antes).length },
      bajas: {
        ahora: bajasAhora?.length ?? null,
        antes: sabeBajasDe(antes) ? bajasEn(antes).length : null,
      },
      conversion: { cuentas: altas.length, pagan: altas.filter((c) => haPagado.has(c.id)).length },
      retencion:
        pagandoAlEmpezar === null
          ? null
          : {
              pagaban: pagandoAlEmpezar.length,
              siguen: pagandoAlEmpezar.filter((f) => {
                const ahora = porId.get(f.organizacionId);
                return ahora !== undefined && esDeLosQuePagan(ahora);
              }).length,
            },
    },
    dinero: {
      cuotaAlMes: {
        ahora: laCuotaSinIva(cuotaAhora),
        conIva: cuotaAhora,
        antes: pagandoAlEmpezar === null ? null : laCuotaSinIva(cuotaDe(pagandoAlEmpezar)),
      },
      cobrado: {
        ahora: cobradoAhora.sinIva,
        conIva: cobradoAhora.conIva,
        antes: cobradoEn(antes).sinIva,
      },
      perdida: {
        bajas: bajasAhora?.length ?? null,
        pagaban,
        porcentaje:
          bajasAhora === null || pagaban === null || pagaban < PAGANDO_PARA_UN_PORCENTAJE
            ? null
            : // Un tanto por ciento con un decimal: no es dinero, es una proporción.
              Number(((bajasAhora.length / pagaban) * 100).toFixed(1)),
        cuota: cuotaPerdida === null ? null : laCuotaSinIva(cuotaPerdida),
      },
    },
    origenes: [...porOrigen.entries()]
      .map(([origen, n]) => ({ origen, altas: n }))
      .sort((a, b) => b.altas - a.altas),
    vendedores: [...vendedores.values()]
      .map((v) => ({
        id: v.id,
        nombre: v.nombre,
        traidos: v.traidos,
        pagan: v.pagan,
        cuotaAlMes: laCuotaSinIva(v.cuota),
        visitas: v.visitas,
      }))
      .sort(
        (a, b) =>
          b.cuotaAlMes - a.cuotaAlMes ||
          b.traidos - a.traidos ||
          b.visitas - a.visitas ||
          a.nombre.localeCompare(b.nombre, 'es'),
      ),
    embudo: {
      visitas: hay.visitas.filter((v) => enElTramo(v.dia, este)).reduce((s, v) => s + v.visitas, 0),
      cuentas: altas.length,
      conVendedor: altas.filter((c) => c.vendedor !== null).length,
      eligieronPlan: altas.filter((c) => c.eligioPlan).length,
      pagan: altas.filter((c) => haPagado.has(c.id)).length,
    },
    seVanQuienes,
    series: {
      semanas: semanas.map((lunes) => ({
        lunes,
        altas: clientes.filter((c) => enElTramo(c.alta, laSemana(lunes))).length,
        bajas: fotos.bajas.filter((b) => enElTramo(b.dia, laSemana(lunes))).length,
      })),
      pagando: semanas
        .map((lunes) => {
          const fin = masDias(lunes, 6);
          const foto = fotos.delDia(fin < hoy ? fin : hoy);
          if (
            foto === null ||
            fotos.primerDia === null ||
            fotos.primerDia > (fin < hoy ? fin : hoy)
          )
            return null;
          return { lunes, pagando: enLaFoto(foto, 'pagando') };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      meses,
      cohortes,
    },
  };
}

function mesSiguiente(mes: string): string {
  const [anio, m] = mes.split('-').map(Number) as [number, number];
  return m === 12 ? `${String(anio + 1)}-01` : `${String(anio)}-${String(m + 1).padStart(2, '0')}`;
}

// ── El correo del lunes (4A) ─────────────────────────────────────────────────

function conSigno(n: number): string {
  if (n === 0) return '=';
  return n > 0 ? `+${String(n)}` : `−${String(Math.abs(n))}`;
}

/**
 * El correo de cada lunes, con la semana de lunes a domingo (el tablero de «7 días»
 * con hoy en el domingo). **Lo esencial y nada más**: cuántos pagan, lo que entra al
 * mes, altas y bajas, lo cobrado, y quién se está yendo, que es lo que hay que hacer.
 */
export function elCorreoDeLaSemana(t: TableroDeVentas): {
  readonly asunto: string;
  readonly cifras: readonly CifraDelCorreo[];
  readonly frases: readonly string[];
} {
  const c = t.clientes;
  const d = t.dinero;
  const cambio = (ahora: number, antes: number | null) =>
    antes === null ? null : conSigno(ahora - antes);
  const bueno = (ahora: number, antes: number | null, alReves = false) =>
    antes === null || ahora === antes ? null : ahora > antes !== alReves;
  const euros = (n: number) => conSimbolo(centimos(n));

  const cifras: CifraDelCorreo[] = [
    {
      nombre: 'Pagando',
      valor: String(c.pagando.ahora),
      cambio: cambio(c.pagando.ahora, c.pagando.antes),
      bueno: bueno(c.pagando.ahora, c.pagando.antes),
    },
    {
      nombre: 'Entra al mes, sin IVA',
      valor: euros(d.cuotaAlMes.ahora),
      cambio:
        d.cuotaAlMes.antes === null
          ? null
          : `${d.cuotaAlMes.ahora >= d.cuotaAlMes.antes ? '+' : '−'}${euros(Math.abs(d.cuotaAlMes.ahora - d.cuotaAlMes.antes))}`,
      bueno: bueno(d.cuotaAlMes.ahora, d.cuotaAlMes.antes),
    },
    {
      nombre: 'Altas',
      valor: String(c.altas.ahora),
      cambio: cambio(c.altas.ahora, c.altas.antes),
      bueno: bueno(c.altas.ahora, c.altas.antes),
    },
    {
      nombre: 'Bajas',
      valor: c.bajas.ahora === null ? '—' : String(c.bajas.ahora),
      cambio: c.bajas.ahora === null ? null : cambio(c.bajas.ahora, c.bajas.antes),
      bueno: c.bajas.ahora === null ? null : bueno(c.bajas.ahora, c.bajas.antes, true),
    },
    {
      nombre: 'Cobrado, sin IVA',
      valor: euros(d.cobrado.ahora),
      cambio: null,
      bueno: null,
    },
  ];

  const frases: string[] = [];
  if (t.seVanQuienes.length > 0) {
    const primeros = t.seVanQuienes
      .slice(0, 5)
      .map((x) => `${x.nombre} (${x.porque.toLowerCase()})`);
    const mas = t.seVanQuienes.length - primeros.length;
    frases.push(`Se están yendo: ${primeros.join(', ')}${mas > 0 ? ` y ${String(mas)} más` : ''}.`);
  } else {
    frases.push('Nadie se está yendo.');
  }
  if (t.modo === 'prueba')
    frases.push('Stripe está en modo prueba: nada de esto es dinero de verdad.');

  return {
    asunto: `Estook, la semana: ${String(c.pagando.ahora)} pagando · ${euros(d.cuotaAlMes.ahora)} al mes`,
    cifras,
    frases,
  };
}
