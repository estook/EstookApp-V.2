import { get } from 'node:http';
import { Socket } from 'node:net';
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { PUERTO_DE_SIEMPRE } from './la-impresora.ts';

/**
 * **Buscar impresoras en la red del local** (T5 · 1, decisión 0119; maquetas de T5, 2): nadie
 * teclea una dirección. Se prueba el puerto 9100 de cada aparato de la red del PC, pocos a la
 * vez y con poca espera, y la que contesta es una impresora de tickets.
 *
 * Y una más: **192.168.192.168**, donde se pone una Epson cuando no hay router que le dé
 * dirección (el cable directo del PC a la impresora).
 *
 * **A lo que no se ha elegido no se le manda ni un byte** (29-oct, antes de probar en el local
 * del amigo de Richi): en el 9100 también escuchan las impresoras de oficina, y lo que les llega
 * por ahí lo imprimen. Buscar solo llama a la puerta y cuelga; el nombre de una desconocida se
 * lee **de su página web**, que solo se mira. Preguntarle por ESC/POS (`GS I`), solo a las que el
 * local ya dio de alta.
 */

export const LA_DE_EPSON_SIN_ROUTER = '192.168.192.168';

/** Las redes de este PC: «192.168.1.» por cada tarjeta con IPv4 que no sea la de dentro. */
export function lasRedesDelPc(
  tarjetas: NodeJS.Dict<readonly NetworkInterfaceInfo[]> = networkInterfaces(),
): { readonly red: string; readonly propia: string }[] {
  const redes: { red: string; propia: string }[] = [];
  for (const lista of Object.values(tarjetas)) {
    for (const t of lista ?? []) {
      if (t.family !== 'IPv4' || t.internal) continue;
      // La de «sin red» de Windows (169.254) no lleva a ninguna impresora.
      if (t.address.startsWith('169.254.')) continue;
      const partes = t.address.split('.');
      if (partes.length !== 4) continue;
      const red = `${partes.slice(0, 3).join('.')}.`;
      if (!redes.some((r) => r.red === red)) redes.push({ red, propia: t.address });
    }
  }
  return redes;
}

/** Todas las direcciones que se prueban, sin la del propio PC. */
export function lasQueSeProbaran(redes: readonly { red: string; propia: string }[]): string[] {
  const todas = new Set<string>();
  for (const { red, propia } of redes) {
    for (let n = 1; n <= 254; n++) {
      const direccion = `${red}${String(n)}`;
      if (direccion !== propia) todas.add(direccion);
    }
  }
  todas.add(LA_DE_EPSON_SIN_ROUTER);
  return [...todas];
}

/** Si en esa dirección hay algo escuchando en ese puerto. */
export function contesta(host: string, puerto: number, esperaMs: number): Promise<boolean> {
  return new Promise((resolver) => {
    const conexion = new Socket();
    const acabar = (si: boolean) => {
      clearTimeout(reloj);
      conexion.destroy();
      resolver(si);
    };
    const reloj = setTimeout(() => {
      acabar(false);
    }, esperaMs);
    conexion.once('error', () => {
      acabar(false);
    });
    conexion.connect(puerto, host, () => {
      acabar(true);
    });
  });
}

/** Prueba todas, `aLaVez` a la vez, y devuelve las que contestan, en orden. */
export async function lasQueContestan(
  candidatas: readonly string[],
  {
    puerto = PUERTO_DE_SIEMPRE,
    esperaMs = 400,
    aLaVez = 64,
    probar = contesta,
  }: {
    readonly puerto?: number;
    readonly esperaMs?: number;
    readonly aLaVez?: number;
    readonly probar?: (host: string, puerto: number, esperaMs: number) => Promise<boolean>;
  } = {},
): Promise<string[]> {
  const encontradas: string[] = [];
  let siguiente = 0;
  async function trabajar() {
    while (siguiente < candidatas.length) {
      const host = candidatas[siguiente];
      siguiente += 1;
      if (host !== undefined && (await probar(host, puerto, esperaMs))) {
        encontradas.push(`${host}:${String(puerto)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, aLaVez) }, () => trabajar()));
  const orden = new Map(candidatas.map((c, i) => [`${c}:${String(puerto)}`, i]));
  return encontradas.sort((a, b) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0));
}

/**
 * **El nombre que dice su página web** (el `<title>`): las Epson dicen «EPSON TM-T20III», y una de
 * oficina, la suya. Solo se lee: una petición a la web no imprime nada. Nulo si no tiene web o no
 * contesta a tiempo.
 */
export function elNombreDeSuWeb(host: string, puerto = 80, esperaMs = 800): Promise<string | null> {
  return new Promise((resolver) => {
    let leido = '';
    const peticion = get({ host, port: puerto, path: '/', timeout: esperaMs }, (respuesta) => {
      respuesta.setEncoding('latin1');
      respuesta.on('data', (trozo: string) => {
        leido += trozo;
        if (leido.length > 16_384) peticion.destroy();
      });
      respuesta.on('end', () => {
        resolver(elTitulo(leido));
      });
      respuesta.on('error', () => {
        resolver(elTitulo(leido));
      });
    });
    peticion.on('timeout', () => {
      peticion.destroy();
    });
    peticion.on('error', () => {
      resolver(elTitulo(leido));
    });
    peticion.on('close', () => {
      resolver(elTitulo(leido));
    });
  });
}

function elTitulo(html: string): string | null {
  const titulo = /<title[^>]*>([^<]{1,80})<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, ' ').trim();
  if (titulo === undefined || titulo === '') return null;
  // «EPSON TM-T20III» → «Epson TM-T20III», como lo dice la propia impresora por ESC/POS.
  return titulo.replace(/^EPSON\b/, 'Epson');
}

/**
 * **El nombre de cada una**, sin molestar a nadie: a las que el local ya dio de alta (que son de
 * tickets) se les pregunta por ESC/POS; a las demás, solo su página web.
 */
export async function losNombres(
  encontradas: readonly string[],
  yaDadas: ReadonlySet<string>,
  como: {
    readonly porEscPos: (direccion: string) => Promise<string | null>;
    readonly porSuWeb: (host: string) => Promise<string | null>;
  },
): Promise<{ readonly direccion: string; readonly modelo: string | null }[]> {
  return Promise.all(
    encontradas.map(async (direccion) => ({
      direccion,
      modelo: yaDadas.has(direccion)
        ? await como.porEscPos(direccion)
        : await como.porSuWeb(direccion.split(':')[0] ?? direccion),
    })),
  );
}
