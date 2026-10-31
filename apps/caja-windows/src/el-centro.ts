import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import {
  LO_DEL_CENTRO_DURA_MS,
  PUERTO_DEL_CENTRO,
  abrirElSobre,
  cerrarElSobre,
  deQuienEsElSobre,
  esDireccionDelLocal,
  esLoQueSePasaPorLaCaja,
  laClaveConLaCaja,
  laComandaEnPapel,
  laComandaPorLaCaja,
  type LoQueTieneLaCaja,
  type PapelCompuesto,
} from '@estook/dominio';
import type { ComoSalio } from '@estook/impresion';

/**
 * **La caja de centro** (T5 · 2 · 2, decisión 0123; Anexo 3.6 y 6.4): sin internet, los
 * comanderos y la pantalla de cocina le hablan a la caja por el wifi del local, y ella imprime
 * lo de la cocina y lo reparte. Como el centro de Toast, pero con la caja que el local ya tiene.
 *
 *   · **Escucha siempre** en el wifi del local, en el mismo puerto, y **solo contesta a los
 *     aparatos de su local**: cada mensaje llega en un sobre cerrado con la clave de ese aparato
 *     (`centro-cifrado.ts`), y lo que no se abre no se mira.
 *   · **Con internet no hace nada**: los aparatos van a Estook como siempre. Solo le hablan
 *     cuando no llegan a Estook.
 *   · **No decide nada de la sala**: lo que le llega ya viene armado del comandero. Lo guarda en
 *     su disco, lo imprime si la cocina o la barra van en papel, y se lo da a la pantalla de
 *     cocina. Subirlo a Estook lo hace cada comandero al volver internet, con su clave: una vez.
 *   · Lo que no sale en la impresora se vuelve a intentar cada poco, sin parar nada.
 */

export interface LoQueSabeElCentro {
  readonly caja: string;
  readonly aparatos: readonly string[];
  readonly cocinaSaleEn: 'pantalla' | 'papel' | 'las_dos';
  readonly barraSaleEn: 'pantalla' | 'papel' | 'las_dos';
  readonly impresoras: readonly {
    readonly direccion: string;
    readonly anchoMm: 58 | 80;
    readonly imprime: readonly string[];
  }[];
}

/** Lo que el centro le pide al programa: imprimir, guardar en el disco y la hora. */
export interface ManosDelCentro {
  readonly imprimir: (direccion: string, anchoMm: 58 | 80, papel: PapelCompuesto) => Promise<ComoSalio>;
  readonly guardar: (texto: string) => void;
  readonly leer: () => string | null;
  readonly ahora: () => number;
}

interface PorImprimir {
  readonly id: string;
  readonly sitio: 'cocina' | 'barra';
  readonly intentos: number;
}

interface LoGuardado {
  readonly huella: string | null;
  readonly sabe: LoQueSabeElCentro | null;
  readonly llegado: readonly LoQueTieneLaCaja[];
  readonly porImprimir: readonly PorImprimir[];
}

export interface ComoEstaElCentro {
  readonly escucha: boolean;
  readonly direcciones: readonly string[];
  /** Por qué no escucha, dicho para quien lo lee. */
  readonly porque: string | null;
  readonly porImprimir: number;
}

/** Lo que se lee de un aparato, como mucho: una mesa grande con notas cabe de sobra. */
const CUERPO_COMO_MUCHO = 256 * 1024;
const REINTENTAR_CADA_MS = 10_000;
/** Un papel que no sale en un servicio entero se deja: ya lo habrán resuelto a mano. */
const INTENTOS_COMO_MUCHO = 360;
const NUMEROS_QUE_SE_RECUERDAN = 5000;

/** Las direcciones de este PC en la red del local, con el puerto del centro. */
export function lasDireccionesDelCentro(puerto = PUERTO_DEL_CENTRO): string[] {
  const direcciones: string[] = [];
  for (const lista of Object.values(networkInterfaces())) {
    for (const red of lista ?? []) {
      if (red.family !== 'IPv4' || red.internal) continue;
      const direccion = `${red.address}:${String(puerto)}`;
      if (esDireccionDelLocal(direccion)) direcciones.push(direccion);
    }
  }
  return direcciones.slice(0, 4);
}

export class ElCentro {
  private servidor: Server | null = null;
  private porque: string | null = null;
  private guardado: LoGuardado;
  private readonly claves = new Map<string, string>();
  private readonly numeros = new Set<string>();
  private reloj: ReturnType<typeof setInterval> | null = null;
  private imprimiendo = false;

  constructor(
    private readonly origenes: readonly string[],
    private readonly version: string,
    private readonly manos: ManosDelCentro,
  ) {
    this.guardado = this.leerLoGuardado();
  }

  /** Con internet, la caja dice quién es y qué sabe: se guarda para cuando falte. */
  saber(huella: string, sabe: LoQueSabeElCentro): void {
    if (huella !== this.guardado.huella) this.claves.clear();
    this.guardado = { ...this.guardado, huella, sabe };
    this.guardar();
  }

  /** Al desvincular la caja: nada del local se queda en el disco. */
  olvidar(): void {
    this.claves.clear();
    this.guardado = { huella: null, sabe: null, llegado: [], porImprimir: [] };
    this.guardar();
  }

  async empezar(puerto = PUERTO_DEL_CENTRO, host = '0.0.0.0'): Promise<void> {
    if (this.servidor !== null) return;
    const servidor = createServer((peticion, respuesta) => {
      void this.atender(peticion, respuesta);
    });
    await new Promise<void>((resolver) => {
      servidor.once('error', (fallo: NodeJS.ErrnoException) => {
        this.porque =
          fallo.code === 'EADDRINUSE'
            ? 'Otro programa usa el puerto de la caja. Cierra la otra caja abierta en este PC.'
            : 'Windows no deja a la caja escuchar en el wifi.';
        this.servidor = null;
        resolver();
      });
      servidor.listen(puerto, host, () => {
        this.porque = null;
        this.servidor = servidor;
        resolver();
      });
    });
    if (this.servidor !== null && this.reloj === null) {
      this.reloj = setInterval(() => {
        void this.imprimirLoQueFalta();
      }, REINTENTAR_CADA_MS);
    }
  }

  parar(): void {
    if (this.reloj !== null) clearInterval(this.reloj);
    this.reloj = null;
    this.servidor?.close();
    this.servidor = null;
  }

  /** El puerto en el que escucha de verdad (en las pruebas, uno libre). */
  elPuerto(): number | null {
    const donde = this.servidor?.address();
    return typeof donde === 'object' && donde !== null ? donde.port : null;
  }

  comoEsta(): ComoEstaElCentro {
    return {
      escucha: this.servidor !== null,
      direcciones: this.servidor === null ? [] : lasDireccionesDelCentro(this.elPuerto() ?? undefined),
      porque: this.porque,
      porImprimir: this.guardado.porImprimir.length,
    };
  }

  /** Lo llegado sin internet que aún vale (un servicio largo). */
  loLlegado(): readonly LoQueTieneLaCaja[] {
    const desde = this.manos.ahora() - LO_DEL_CENTRO_DURA_MS;
    return this.guardado.llegado.filter((l) => Date.parse(l.llegoEn) >= desde);
  }

  // ── La red ─────────────────────────────────────────────────────────────────

  private cabeceras(peticion: IncomingMessage): Record<string, string> {
    const origen = peticion.headers.origin ?? '';
    return this.origenes.includes(origen)
      ? {
          'access-control-allow-origin': origen,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          // Lo que pedía Chrome antes del permiso de red local; no estorba.
          'access-control-allow-private-network': 'true',
          'access-control-max-age': '600',
          vary: 'Origin',
        }
      : {};
  }

  private contestar(
    peticion: IncomingMessage,
    respuesta: ServerResponse,
    estado: number,
    cuerpo: string,
    tipo = 'application/json; charset=utf-8',
  ): void {
    respuesta.writeHead(estado, {
      ...this.cabeceras(peticion),
      'content-type': tipo,
      'cache-control': 'no-store',
    });
    respuesta.end(cuerpo);
  }

  private async atender(peticion: IncomingMessage, respuesta: ServerResponse): Promise<void> {
    try {
      const ruta = (peticion.url ?? '/').split('?')[0];
      if (peticion.method === 'OPTIONS') {
        respuesta.writeHead(204, this.cabeceras(peticion));
        respuesta.end();
        return;
      }
      // «¿Estás ahí?»: sin nada del local, para saber si se llega y para el permiso de Chrome.
      if (peticion.method === 'GET' && ruta === '/hola') {
        this.contestar(
          peticion,
          respuesta,
          200,
          JSON.stringify({ estook: 'caja', version: this.version, lista: this.guardado.sabe !== null }),
        );
        return;
      }
      if (peticion.method !== 'POST' || ruta !== '/') {
        this.contestar(peticion, respuesta, 404, '{}');
        return;
      }
      const texto = await leerElCuerpo(peticion);
      if (texto === null) {
        this.contestar(peticion, respuesta, 413, '{}');
        return;
      }
      const contestacion = await this.abrirYHacer(texto);
      if (contestacion === null) {
        this.contestar(peticion, respuesta, 401, '{}');
        return;
      }
      this.contestar(peticion, respuesta, 200, contestacion, 'text/plain; charset=utf-8');
    } catch {
      if (!respuesta.headersSent) this.contestar(peticion, respuesta, 500, '{}');
      else respuesta.end();
    }
  }

  /** Abre el sobre de un aparato del local, hace lo que pide y le contesta en otro sobre. */
  private async abrirYHacer(texto: string): Promise<string | null> {
    const { huella, sabe } = this.guardado;
    const terminalId = deQuienEsElSobre(texto);
    if (huella === null || sabe === null || terminalId === null) return null;
    if (terminalId !== sabe.caja && !sabe.aparatos.includes(terminalId)) return null;
    let clave = this.claves.get(terminalId);
    if (clave === undefined) {
      clave = await laClaveConLaCaja(huella, terminalId);
      this.claves.set(terminalId, clave);
    }
    const abierto = await abrirElSobre(clave, texto);
    if (abierto === null || this.numeros.has(abierto.numero)) return null;
    this.recordarElNumero(abierto.numero);
    const hecho = await this.hacer(abierto.cuerpo);
    return cerrarElSobre(clave, terminalId, hecho);
  }

  private recordarElNumero(numero: string): void {
    this.numeros.add(numero);
    if (this.numeros.size > NUMEROS_QUE_SE_RECUERDAN) {
      const primero = this.numeros.values().next().value;
      if (primero !== undefined) this.numeros.delete(primero);
    }
  }

  private async hacer(cuerpo: unknown): Promise<unknown> {
    const pide = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
    if (pide['que'] === 'hola') return { ok: true };
    if (pide['que'] === 'la_cocina') return { ok: true, llegado: this.loLlegado() };
    if (pide['que'] === 'pasar' && esLoQueSePasaPorLaCaja(pide['lo'])) {
      return { ok: true, ...(await this.recibir(pide['lo'])) };
    }
    return { ok: false };
  }

  // ── Lo que llega ───────────────────────────────────────────────────────────

  /**
   * Lo que manda un comandero. Repetido no hace nada dos veces (el comandero reintenta si no le
   * llega la respuesta): se reconoce por su clave.
   */
  private async recibir(
    lo: Parameters<typeof laComandaPorLaCaja>[0],
  ): Promise<{ readonly enPapel: number; readonly repetido: boolean }> {
    if (this.guardado.llegado.some((l) => l.id === lo.id)) return { enPapel: 0, repetido: true };
    const llegado: LoQueTieneLaCaja = { ...lo, llegoEn: new Date(this.manos.ahora()).toISOString() };
    const sitios = (['cocina', 'barra'] as const).filter(
      (s) => this.saleEnPapel(s) && laComandaPorLaCaja(lo, s) !== null,
    );
    const desde = this.manos.ahora() - LO_DEL_CENTRO_DURA_MS;
    this.guardado = {
      ...this.guardado,
      llegado: [...this.guardado.llegado.filter((l) => Date.parse(l.llegoEn) >= desde), llegado],
      porImprimir: [
        ...this.guardado.porImprimir,
        ...sitios.map((sitio) => ({ id: lo.id, sitio, intentos: 0 })),
      ],
    };
    this.guardar();
    await this.imprimirLoQueFalta();
    return { enPapel: sitios.length, repetido: false };
  }

  private saleEnPapel(sitio: 'cocina' | 'barra'): boolean {
    const sabe = this.guardado.sabe;
    if (sabe === null) return false;
    return (sitio === 'cocina' ? sabe.cocinaSaleEn : sabe.barraSaleEn) !== 'pantalla';
  }

  /** En orden, uno detrás de otro; lo que no sale se queda para la vuelta siguiente. */
  private async imprimirLoQueFalta(): Promise<void> {
    if (this.imprimiendo || this.guardado.porImprimir.length === 0) return;
    this.imprimiendo = true;
    try {
      const quedan: PorImprimir[] = [];
      for (const falta of this.guardado.porImprimir) {
        const lo = this.guardado.llegado.find((l) => l.id === falta.id);
        const comanda = lo === undefined ? null : laComandaPorLaCaja(lo, falta.sitio);
        const impresora = this.guardado.sabe?.impresoras.find((i) => i.imprime.includes(falta.sitio));
        if (comanda === null || impresora === undefined) continue;
        const salio = await this.manos
          .imprimir(impresora.direccion, impresora.anchoMm, laComandaEnPapel(comanda))
          .catch(() => ({ salio: false }) as ComoSalio);
        if (!salio.salio && falta.intentos + 1 < INTENTOS_COMO_MUCHO) {
          quedan.push({ ...falta, intentos: falta.intentos + 1 });
        }
      }
      this.guardado = { ...this.guardado, porImprimir: quedan };
      this.guardar();
    } finally {
      this.imprimiendo = false;
    }
  }

  // ── El disco ───────────────────────────────────────────────────────────────

  private leerLoGuardado(): LoGuardado {
    const vacio: LoGuardado = { huella: null, sabe: null, llegado: [], porImprimir: [] };
    try {
      const texto = this.manos.leer();
      if (texto === null) return vacio;
      const leido = JSON.parse(texto) as Partial<LoGuardado>;
      return {
        huella: typeof leido.huella === 'string' ? leido.huella : null,
        sabe: leido.sabe ?? null,
        llegado: Array.isArray(leido.llegado) ? leido.llegado : [],
        porImprimir: Array.isArray(leido.porImprimir) ? leido.porImprimir : [],
      };
    } catch {
      return vacio;
    }
  }

  private guardar(): void {
    try {
      this.manos.guardar(JSON.stringify(this.guardado));
    } catch {
      // Sin disco, sigue en la memoria hasta cerrar el programa.
    }
  }
}

function leerElCuerpo(peticion: IncomingMessage): Promise<string | null> {
  return new Promise((resolver, rechazar) => {
    const trozos: Buffer[] = [];
    let largo = 0;
    peticion.on('data', (trozo: Buffer) => {
      largo += trozo.length;
      if (largo > CUERPO_COMO_MUCHO) {
        resolver(null);
        peticion.destroy();
        return;
      }
      trozos.push(trozo);
    });
    peticion.on('end', () => {
      resolver(Buffer.concat(trozos).toString('utf8'));
    });
    peticion.on('error', rechazar);
  });
}
