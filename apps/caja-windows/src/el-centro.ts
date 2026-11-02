import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import {
  LO_DEL_CENTRO_DURA_MS,
  PUERTO_DEL_CENTRO,
  abrirElSobre,
  cerrarElSobre,
  deQuienEsElPin,
  deQuienEsElSobre,
  esDireccionDelLocal,
  esLoQueSePasaPorLaCaja,
  laClaveConLaCaja,
  laComandaEnPapel,
  laComandaPorLaCaja,
  type EstadoDelFichajeEnLaCaja,
  type LoQueTieneLaCaja,
  type LosPinDelCentro,
  type PapelCompuesto,
  type PersonaDelCentro,
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
 *   · **Comprueba el PIN de cualquiera del local** (T5 · 2 · 2 · 2, 0124): con internet guarda
 *     las huellas de los PIN (las de Estook, nunca un PIN), y sin él dice de quién es un PIN a
 *     un comandero que quiere entrar, y deja fichar en la propia caja. Diez fallos seguidos
 *     desde un aparato lo paran cinco minutos, como en Estook.
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
  readonly imprimir: (
    direccion: string,
    anchoMm: 58 | 80,
    papel: PapelCompuesto,
  ) => Promise<ComoSalio>;
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
  /** Quién es cada persona del local, con la huella de su PIN (0124). */
  readonly personas: LosPinDelCentro | null;
}

export type QueSeFicha = 'entrada' | 'pausa' | 'vuelta' | 'salida';

/** Lo que pasa a ser cada uno al fichar, y desde qué estado se puede. */
const AL_FICHAR: Readonly<
  Record<
    QueSeFicha,
    {
      readonly desde: readonly EstadoDelFichajeEnLaCaja[];
      readonly queda: EstadoDelFichajeEnLaCaja;
    }
  >
> = {
  entrada: { desde: ['fuera'], queda: 'dentro' },
  pausa: { desde: ['dentro'], queda: 'en_pausa' },
  vuelta: { desde: ['en_pausa'], queda: 'dentro' },
  salida: { desde: ['dentro', 'en_pausa'], queda: 'fuera' },
};

const esQueSeFicha = (v: unknown): v is QueSeFicha =>
  v === 'entrada' || v === 'pausa' || v === 'vuelta' || v === 'salida';

export interface ComoEstaElCentro {
  readonly escucha: boolean;
  readonly direcciones: readonly string[];
  /** Por qué no escucha, dicho para quien lo lee. */
  readonly porque: string | null;
  readonly porImprimir: number;
  /** Escucha solo en el propio PC (0124): aún no se ha avisado de lo que preguntará Windows. */
  readonly soloPorDentro: boolean;
}

/** Solo en el propio PC: Windows no pregunta nada, y la pantalla de la caja ya le habla. */
export const SOLO_POR_DENTRO = '127.0.0.1';

/** Lo que se lee de un aparato, como mucho: una mesa grande con notas cabe de sobra. */
const CUERPO_COMO_MUCHO = 256 * 1024;
const REINTENTAR_CADA_MS = 10_000;
/** Un papel que no sale en un servicio entero se deja: ya lo habrán resuelto a mano. */
const INTENTOS_COMO_MUCHO = 360;
const NUMEROS_QUE_SE_RECUERDAN = 5000;
/** Como en Estook (0068): diez PIN fallados seguidos en un aparato lo paran cinco minutos. */
const FALLOS_COMO_MUCHO = 10;
const PARADO_MS = 5 * 60 * 1000;

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
  private host: string | null = null;
  private empezando: Promise<void> | null = null;
  private readonly fallos = new Map<string, { readonly veces: number; readonly hasta: number }>();

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

  /**
   * Con internet, quién es cada persona del local: se guarda para comprobar sus PIN cuando
   * falte (0124). Lo que dice Estook manda sobre lo fichado aquí sin internet, que ya subió.
   */
  saberLasPersonas(personas: LosPinDelCentro): void {
    this.guardado = { ...this.guardado, personas };
    this.guardar();
  }

  /** Si ya sabe quién es cada uno: sin eso, sin internet no comprueba ningún PIN. */
  conoceLasPersonas(): boolean {
    return (this.guardado.personas?.personas.length ?? 0) > 0;
  }

  /** Al desvincular la caja: nada del local se queda en el disco. */
  olvidar(): void {
    this.claves.clear();
    this.fallos.clear();
    this.guardado = { huella: null, sabe: null, llegado: [], porImprimir: [], personas: null };
    this.guardar();
  }

  /**
   * Empezar a escuchar. **Dos a la vez son una** (0124): al arrancar lo piden el programa y la
   * pantalla casi juntos, y el segundo daría «puerto ocupado» por el primero.
   */
  empezar(puerto = PUERTO_DEL_CENTRO, host = '0.0.0.0'): Promise<void> {
    this.empezando ??= this.escuchar(puerto, host).finally(() => {
      this.empezando = null;
    });
    return this.empezando;
  }

  private async escuchar(puerto: number, host: string): Promise<void> {
    if (this.servidor !== null) return;
    const servidor = createServer((peticion, respuesta) => {
      void this.atender(peticion, respuesta);
    });
    const escucha = await new Promise<boolean>((resolver) => {
      servidor.once('error', (fallo: NodeJS.ErrnoException) => {
        this.porque =
          fallo.code === 'EADDRINUSE'
            ? 'Otro programa usa el puerto de la caja. Cierra la otra caja abierta en este PC.'
            : 'Windows no deja a la caja escuchar en el wifi.';
        resolver(false);
      });
      servidor.listen(puerto, host, () => {
        this.porque = null;
        resolver(true);
      });
    });
    if (!escucha) return;
    this.servidor = servidor;
    this.host = host;
    if (this.reloj === null) {
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
    this.host = null;
  }

  /**
   * **De escuchar solo por dentro a escuchar en la red del local** (0124): la pantalla ya dijo
   * qué contestar a Windows, y es ahora cuando Windows pregunta. En el mismo puerto.
   */
  async abrirALaRed(host = '0.0.0.0'): Promise<void> {
    if (this.host !== SOLO_POR_DENTRO) return;
    const puerto = this.elPuerto() ?? PUERTO_DEL_CENTRO;
    this.parar();
    await this.empezar(puerto, host);
    // Si la red no la deja, sigue al menos por dentro: su propia pantalla le habla.
    if (this.servidor === null) await this.empezar(puerto, SOLO_POR_DENTRO);
  }

  /** El puerto en el que escucha de verdad (en las pruebas, uno libre). */
  elPuerto(): number | null {
    const donde = this.servidor?.address();
    return typeof donde === 'object' && donde !== null ? donde.port : null;
  }

  comoEsta(): ComoEstaElCentro {
    const soloPorDentro = this.servidor !== null && this.host === SOLO_POR_DENTRO;
    return {
      escucha: this.servidor !== null,
      // Solo por dentro no se dice dónde está: desde fuera no llegaría nadie.
      direcciones:
        this.servidor === null || soloPorDentro
          ? []
          : lasDireccionesDelCentro(this.elPuerto() ?? undefined),
      porque: this.porque,
      porImprimir: this.guardado.porImprimir.length,
      soloPorDentro,
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
          JSON.stringify({
            estook: 'caja',
            version: this.version,
            lista: this.guardado.sabe !== null,
          }),
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
    const hecho = await this.hacer(abierto.cuerpo, terminalId, terminalId === sabe.caja);
    return cerrarElSobre(clave, terminalId, hecho);
  }

  private recordarElNumero(numero: string): void {
    this.numeros.add(numero);
    if (this.numeros.size > NUMEROS_QUE_SE_RECUERDAN) {
      const primero = this.numeros.values().next().value;
      if (primero !== undefined) this.numeros.delete(primero);
    }
  }

  private async hacer(cuerpo: unknown, terminalId: string, esLaCaja: boolean): Promise<unknown> {
    const pide =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
    if (pide['que'] === 'hola') return { ok: true };
    if (pide['que'] === 'la_cocina') return { ok: true, llegado: this.loLlegado() };
    if (pide['que'] === 'pasar' && esLoQueSePasaPorLaCaja(pide['lo'])) {
      return { ok: true, ...(await this.recibir(pide['lo'])) };
    }
    if (pide['que'] === 'pin' && typeof pide['pin'] === 'string') {
      return this.quienEs(pide['pin'], terminalId);
    }
    // **Se ficha en la caja** (0115): un comandero no ficha, tampoco por aquí.
    if (
      pide['que'] === 'fichar' &&
      esLaCaja &&
      typeof pide['pin'] === 'string' &&
      esQueSeFicha(pide['accion'])
    ) {
      return this.fichar(pide['pin'], pide['accion'], terminalId);
    }
    return { ok: false };
  }

  // ── El PIN de cualquiera ───────────────────────────────────────────────────

  /** De quién es el PIN, contando los fallos de ese aparato; o por qué no se puede decir. */
  private async laPersonaDelPin(
    pin: string,
    terminalId: string,
  ): Promise<{ readonly persona: PersonaDelCentro } | { readonly porque: string }> {
    const ahora = this.manos.ahora();
    const fallos = this.fallos.get(terminalId);
    if (fallos !== undefined && fallos.hasta > ahora) return { porque: 'aparato_parado' };
    const personas = this.guardado.personas?.personas ?? [];
    if (personas.length === 0) return { porque: 'sin_personas' };
    const persona = await deQuienEsElPin(pin, personas);
    if (persona === null) {
      const veces = (fallos?.veces ?? 0) + 1;
      const parado = veces >= FALLOS_COMO_MUCHO;
      this.fallos.set(terminalId, {
        veces: parado ? 0 : veces,
        hasta: parado ? ahora + PARADO_MS : 0,
      });
      return { porque: 'pin_desconocido' };
    }
    this.fallos.delete(terminalId);
    if (persona.paradoHasta !== null && Date.parse(persona.paradoHasta) > ahora) {
      return { porque: 'demasiados_intentos' };
    }
    return { persona };
  }

  /** Lo que el aparato necesita para dejar entrar (o fichar) a esa persona sin internet. */
  private loDeLaPersona(persona: PersonaDelCentro) {
    const personas = this.guardado.personas?.personas ?? [];
    return {
      persona: { id: persona.id, nombre: persona.nombre, iniciales: persona.iniciales },
      permisos: persona.permisos,
      fichaje: persona.fichaje,
      desde: persona.desde,
      pausasEnUso: this.guardado.personas?.pausasEnUso ?? false,
      // A quién se le pueden pasar las mesas: quien toma nota y está fichado.
      companeros: personas
        .filter(
          (p) =>
            p.id !== persona.id &&
            p.fichaje !== 'fuera' &&
            p.permisos['accion.tomar_nota'] === 'ver_y_editar',
        )
        .map((p) => ({ id: p.id, nombre: p.nombre })),
    };
  }

  private async quienEs(pin: string, terminalId: string): Promise<unknown> {
    const dicho = await this.laPersonaDelPin(pin, terminalId);
    if ('porque' in dicho) return { ok: false, porque: dicho.porque };
    return { ok: true, ...this.loDeLaPersona(dicho.persona) };
  }

  /**
   * **Fichar sin internet en la caja**, con el PIN que comprueba ella. Lo apunta en lo que sabe
   * de esa persona (así entra en un comandero) y la caja lo sube al volver con el PIN cifrado:
   * lo que valga lo dice Estook entonces.
   */
  private async fichar(pin: string, accion: QueSeFicha, terminalId: string): Promise<unknown> {
    const dicho = await this.laPersonaDelPin(pin, terminalId);
    if ('porque' in dicho) return { ok: false, porque: dicho.porque };
    const { persona } = dicho;
    // Como en Estook: ficha quien tiene en su puesto el permiso de fichar en este local.
    if (persona.permisos['accion.fichar'] !== 'ver_y_editar')
      return { ok: false, porque: 'sin_permiso' };
    const regla = AL_FICHAR[accion];
    const sinPausas = accion === 'pausa' && this.guardado.personas?.pausasEnUso !== true;
    if (!regla.desde.includes(persona.fichaje) || sinPausas) {
      return { ok: false, porque: 'no_toca', ...this.loDeLaPersona(persona) };
    }
    const desde = regla.queda === 'fuera' ? null : new Date(this.manos.ahora()).toISOString();
    const fichada: PersonaDelCentro = { ...persona, fichaje: regla.queda, desde };
    const lista = this.guardado.personas;
    if (lista !== null) {
      this.guardado = {
        ...this.guardado,
        personas: {
          ...lista,
          personas: lista.personas.map((p) => (p.id === persona.id ? fichada : p)),
        },
      };
      this.guardar();
    }
    return { ok: true, ...this.loDeLaPersona(fichada) };
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
    const llegado: LoQueTieneLaCaja = {
      ...lo,
      llegoEn: new Date(this.manos.ahora()).toISOString(),
    };
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
        const impresora = this.guardado.sabe?.impresoras.find((i) =>
          i.imprime.includes(falta.sitio),
        );
        if (comanda === null || impresora === undefined) continue;
        const salio = await this.manos
          .imprimir(impresora.direccion, impresora.anchoMm, laComandaEnPapel(comanda))
          .catch((): ComoSalio => ({ salio: false, porque: 'No responde' }));
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
    const vacio: LoGuardado = {
      huella: null,
      sabe: null,
      llegado: [],
      porImprimir: [],
      personas: null,
    };
    try {
      const texto = this.manos.leer();
      if (texto === null) return vacio;
      const leido = JSON.parse(texto) as Partial<LoGuardado>;
      return {
        huella: typeof leido.huella === 'string' ? leido.huella : null,
        sabe: leido.sabe ?? null,
        llegado: Array.isArray(leido.llegado) ? leido.llegado : [],
        porImprimir: Array.isArray(leido.porImprimir) ? leido.porImprimir : [],
        personas: Array.isArray(leido.personas?.personas) ? leido.personas : null,
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
