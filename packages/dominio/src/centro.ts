import { esAlergeno, type Alergeno } from './referencia.ts';
import type { LaComandaQueSeImprime, PaseDeLaComanda } from './impresion.ts';

/**
 * **La caja de centro** (T5 · 2 · 2, decisión 0123; Anexo 3.6 y 6.4): sin internet, lo que se
 * manda y se marcha en un comandero llega a la caja por el wifi del local, y ella lo imprime
 * y lo enseña a la pantalla de cocina. Aquí, **lo que viaja**: cálculo puro, sin red, para
 * que el comandero lo arme, la caja lo imprima y la pantalla lo pinte igual.
 *
 * Lo arma el comandero, que tiene la mesa y lo pedido; la caja **no decide nada de la sala**:
 * guarda, imprime y reparte. Lo que Estook dé por bueno al volver es lo que vale (0122).
 */

/** El puerto en el que escucha la caja, siempre el mismo: sin internet no se puede preguntar. */
export const PUERTO_DEL_CENTRO = 47100;

/** Lo que se guarda en la caja de una vez sin internet: un servicio largo, como el turno. */
export const LO_DEL_CENTRO_DURA_MS = 16 * 60 * 60 * 1000;

/** «192.168.1.20:47100»: una dirección de la red del local, con su puerto. */
const DIRECCION_DEL_LOCAL =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1):\d{2,5}$/;

/**
 * Solo direcciones de la red del local (o la propia caja): el comandero nunca le habla a
 * internet por aquí, y Chrome solo deja hablar en http con una dirección privada escrita tal cual.
 */
export function esDireccionDelLocal(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !DIRECCION_DEL_LOCAL.test(valor)) return false;
  const [ip = '', puerto = ''] = valor.split(':');
  return ip.split('.').every((n) => Number(n) <= 255) && Number(puerto) <= 65_535;
}

export interface PlatoPorLaCaja {
  /** El de la línea, nacido en el comandero: Estook lo reconoce al subir. */
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly nota: string | null;
  readonly opciones: readonly string[];
  readonly pesoGramos: number | null;
  readonly alergenos: readonly string[];
  readonly destino: 'cocina' | 'barra';
  /** Nulo en la barra y en lo que no va por pases. */
  readonly pase: number | null;
  readonly delMenu: boolean;
}

export interface MesaPorLaCaja {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly camareroId: string | null;
  readonly notaParaCocina: string | null;
  /** Lo de llevar programado (0121), en ISO. */
  readonly paraLas: string | null;
  readonly porPases: boolean;
  readonly alergias: readonly string[];
}

/** Lo que el comandero le pasa a la caja: lo mandado nuevo, o la marcha de un pase. */
export type LoQueSePasaPorLaCaja =
  | {
      readonly que: 'nueva';
      /** La clave de lo hecho en el comandero: la misma con la que sube a Estook. */
      readonly id: string;
      readonly mesa: MesaPorLaCaja;
      readonly platos: readonly PlatoPorLaCaja[];
      /** Los pases que se quedan esperando a que la sala los marche. */
      readonly esperan: readonly number[];
      /** «21:38», en la hora del comandero. */
      readonly hora: string;
      /** El aparato desde el que se mandó, para el pie del papel. */
      readonly aparato: string;
    }
  | {
      readonly que: 'marcha';
      readonly id: string;
      readonly mesa: MesaPorLaCaja;
      readonly pase: number;
      /** Lo que falta por salir de ese pase. */
      readonly platos: readonly PlatoPorLaCaja[];
      readonly hora: string;
      readonly aparato: string;
    };

/** Lo que guarda la caja: lo pasado, con la hora a la que le llegó en su reloj. */
export type LoQueTieneLaCaja = LoQueSePasaPorLaCaja & { readonly llegoEn: string };

// ── Mirarlo al llegar ────────────────────────────────────────────────────────

const esTexto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const esTextoONulo = (v: unknown, max: number): v is string | null => v === null || esTexto(v, max);
const esEntero = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const esLista = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max;

function esPlato(v: unknown): v is PlatoPorLaCaja {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    esTexto(p['id'], 64) &&
    esTexto(p['nombre'], 200) &&
    esEntero(p['cantidad'], 1, 999) &&
    esTextoONulo(p['nota'], 300) &&
    esLista(p['opciones'], 30) &&
    p['opciones'].every((o) => esTexto(o, 120)) &&
    (p['pesoGramos'] === null || esEntero(p['pesoGramos'], 1, 100_000)) &&
    esLista(p['alergenos'], 20) &&
    p['alergenos'].every((a) => esTexto(a, 40)) &&
    (p['destino'] === 'cocina' || p['destino'] === 'barra') &&
    (p['pase'] === null || esEntero(p['pase'], 1, 9)) &&
    typeof p['delMenu'] === 'boolean'
  );
}

function esMesa(v: unknown): v is MesaPorLaCaja {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    esTexto(m['cuentaId'], 64) &&
    esTexto(m['titulo'], 120) &&
    esTexto(m['tipo'], 30) &&
    (m['personas'] === null || esEntero(m['personas'], 1, 999)) &&
    esTextoONulo(m['camarero'], 120) &&
    esTextoONulo(m['camareroId'], 64) &&
    esTextoONulo(m['notaParaCocina'], 300) &&
    esTextoONulo(m['paraLas'], 40) &&
    typeof m['porPases'] === 'boolean' &&
    esLista(m['alergias'], 20) &&
    m['alergias'].every((a) => esTexto(a, 40))
  );
}

/**
 * Si lo que llega a la caja tiene la forma que se espera. Llega cifrado y de un aparato del
 * local, pero la caja no imprime ni guarda nada que no sepa leer.
 */
export function esLoQueSePasaPorLaCaja(valor: unknown): valor is LoQueSePasaPorLaCaja {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  const comun =
    esTexto(v['id'], 64) &&
    esMesa(v['mesa']) &&
    esLista(v['platos'], 200) &&
    v['platos'].every(esPlato) &&
    esTexto(v['hora'], 8) &&
    esTexto(v['aparato'], 80);
  if (!comun) return false;
  if (v['que'] === 'nueva') {
    return esLista(v['esperan'], 9) && v['esperan'].every((n) => esEntero(n, 1, 9));
  }
  return v['que'] === 'marcha' && esEntero(v['pase'], 1, 9);
}

// ── En papel ─────────────────────────────────────────────────────────────────

/**
 * **La comanda en papel** de lo que llegó a la caja, para un sitio (cocina o barra): la misma
 * que saldría con internet (`laComandaEnPapel`). Nula si a ese sitio no le toca nada.
 */
export function laComandaPorLaCaja(
  lo: LoQueSePasaPorLaCaja,
  sitio: 'cocina' | 'barra',
): LaComandaQueSeImprime | null {
  const platos = lo.platos.filter((p) => p.destino === sitio);
  if (platos.length === 0) return null;
  const esperan = new Set(lo.que === 'nueva' ? lo.esperan : []);
  const porPase = new Map<number | null, PlatoPorLaCaja[]>();
  for (const p of platos) {
    const pase = sitio === 'cocina' ? p.pase : null;
    porPase.set(pase, [...(porPase.get(pase) ?? []), p]);
  }
  const pases: PaseDeLaComanda[] = [...porPase.entries()]
    .sort(([a], [b]) => (a ?? 0) - (b ?? 0))
    .map(([numero, ps]) => ({
      numero,
      espera: lo.que === 'nueva' && numero !== null && esperan.has(numero),
      lineas: ps.map((p) => ({
        cantidad: p.cantidad,
        nombre: p.nombre,
        opciones: p.opciones,
        nota: p.nota,
        pesoGramos: p.pesoGramos,
        alergenos: p.alergenos,
      })),
    }));
  const alergias = lo.mesa.alergias.filter((a): a is Alergeno => esAlergeno(a));
  return {
    sitio,
    que: lo.que,
    copia: false,
    mesa: lo.mesa.titulo,
    personas: lo.mesa.personas,
    camarero: lo.mesa.camarero,
    hora: lo.hora,
    alergiasDeLaMesa: alergias,
    notaDeLaMesa: lo.que === 'nueva' ? lo.mesa.notaParaCocina : null,
    paraLas: lo.mesa.paraLas === null ? null : horaDeIso(lo.mesa.paraLas),
    pases,
    motivo: null,
    quien: null,
    aparato: lo.aparato,
  };
}

/** «21:30» de un instante en ISO, en la hora del aparato que lo lee (la del local). */
function horaDeIso(iso: string): string | null {
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  return instante.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
