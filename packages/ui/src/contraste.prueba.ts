import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * M3 · accesibilidad (Parte B8 del Plan).
 *
 * «**Contraste minimo 4,5:1 en texto y 3:1 en iconos con significado.**»
 *
 * ── Por que se leen los colores del CSS y no se copian aqui ──────────────────
 *
 * Porque copiarlos seria tener la paleta en dos sitios (regla 6), y el dia que
 * alguien aclarase un gris para que «se vea mejor», la prueba seguiria pasando
 * con el color viejo y no serviria de nada. Se lee `fichas.css`, que es el unico
 * dueno.
 *
 * ── Y por que esta prueba y no una herramienta ───────────────────────────────
 *
 * Una herramienta de accesibilidad mira la pantalla pintada, y para eso hay que
 * tener pantallas. Esto mira **la paleta**, que es de donde vienen los fallos de
 * contraste: si un color no llega, no llega en las cuarenta pantallas que vengan
 * despues. Se caza aqui, una vez, y no cuarenta.
 */
const FICHAS = readFileSync(
  fileURLToPath(new URL('../estilos/fichas.css', import.meta.url)),
  'utf8',
);

/** Los colores tal como estan escritos en B1. */
function color(nombre: string): string {
  const encontrado = new RegExp(`--color-${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(FICHAS);
  if (!encontrado?.[1]) throw new Error(`No esta declarado --color-${nombre} en fichas.css`);
  return encontrado[1];
}

/** Luminancia relativa, tal cual la define WCAG. */
function luminancia(hex: string): number {
  const canal = (desde: number) => {
    const v = Number.parseInt(hex.slice(desde, desde + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** La razon de contraste entre dos colores, de 1 a 21. */
export function contraste(uno: string, otro: string): number {
  const a = luminancia(uno);
  const b = luminancia(otro);
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

const FONDO = () => color('fondo');
const SUPERFICIE = () => color('superficie');
const BLANCO = '#ffffff';

/** Los dos minimos de B8. */
const TEXTO = 4.5;
const ICONO = 3;

const ACENTOS = [
  'inventario',
  'escandallos',
  'carta',
  'calendario',
  'equipo',
  'servicio',
  'negocio',
  'cuaderno',
] as const;

/*
 * ── LO QUE ESTA PRUEBA DESCUBRIO, Y QUE HAY QUE DECIDIR ──────────────────────
 *
 * B1 fija la paleta y B8 pide 4,5:1 para el texto. **Las dos cosas juntas no se
 * pueden cumplir** con algunos colores de B1, y no es opinable:
 *
 *   blanco sobre --naranja ............. 2,61:1   (B8 pide 3 para un icono)
 *   --naranja sobre --fondo ............ 2,50:1   (el anillo de foco)
 *   --texto-tenue sobre --fondo ........ 2,97:1   (B8 pide 4,5 para texto)
 *   --bien sobre --fondo ............... 3,96:1
 *   --atencion sobre --fondo ........... 3,31:1
 *   blanco sobre el acento de Inventario 3,46:1
 *
 * Lo que se ha hecho en M3, y por que: **no se ha tocado ni un color de B1**, que
 * es la marca. Se ha cambiado **como se usan**, que si es cosa nuestra:
 *
 *   · El anillo de foco lleva un filo charcoal por fuera (base.css).
 *   · Los botones y los iconos sobre naranja van en charcoal, no en blanco.
 *   · El texto de un aviso o de una etiqueta va en --texto; el color del estado
 *     se queda en el icono, el borde y el fondo.
 *   · El sector senalado de la rueda se tinta y se rodea del acento, en vez de
 *     rellenarse de el, para no tener que poner texto blanco encima.
 *   · --texto-tenue **no se usa para texto**. Solo para lo que no se lee.
 *
 * Con eso B8 se cumple sin inventarse marca. Pero queda una pregunta de producto
 * que no es nuestra: **si --texto-tenue, --bien y --atencion deben oscurecerse un
 * punto** para poder usarse como texto sin rodeos. Esta apuntada en ESTADO.md.
 */

describe('B8 · el texto llega a 4,5:1', () => {
  for (const cual of ['texto', 'texto-suave']) {
    it(`--${cual}, sobre el fondo de la app y sobre una tarjeta`, () => {
      expect(contraste(color(cual), FONDO())).toBeGreaterThanOrEqual(TEXTO);
      expect(contraste(color(cual), SUPERFICIE())).toBeGreaterThanOrEqual(TEXTO);
    });
  }

  it('--texto-tenue NO llega, y por eso no se usa para texto', () => {
    // Esta prueba esta escrita al reves a proposito. Si alguien oscurece el
    // color, falla y avisa de que ya se puede usar (y de que hay que revisar
    // este comentario). Si alguien lo usa para texto sin oscurecerlo, lo caza la
    // prueba de mas abajo.
    expect(contraste(color('texto-tenue'), FONDO())).toBeLessThan(TEXTO);
  });

  it('el texto de un aviso o una etiqueta se lee sobre los cinco fondos suaves', () => {
    // Van en --texto justamente por esto.
    for (const suave of [
      'bien-suave',
      'atencion-suave',
      'mal-suave',
      'info-suave',
      'naranja-suave',
    ]) {
      expect(contraste(color('texto'), color(suave))).toBeGreaterThanOrEqual(TEXTO);
    }
  });

  it('el nombre de la app se lee en el sector senalado de la rueda', () => {
    // El sector senalado se tinta de --naranja-suave y el nombre va en --texto:
    // por eso se lee igual en las ocho, y no depende del acento de cada una.
    expect(contraste(color('texto'), color('naranja-suave'))).toBeGreaterThanOrEqual(TEXTO);
    expect(contraste(color('texto'), SUPERFICIE())).toBeGreaterThanOrEqual(TEXTO);
  });

  it('el contador de pendientes se lee, en los ocho acentos', () => {
    // Va en blanco sobre charcoal, con el acento de aro. Por eso no depende del
    // acento y se lee igual en los ocho.
    expect(contraste(BLANCO, color('charcoal'))).toBeGreaterThanOrEqual(TEXTO);
  });

  it('el texto del boton principal se lee', () => {
    // Charcoal sobre naranja: 6,64:1. En blanco serian 2,61 y no valdria.
    expect(contraste(color('charcoal'), color('naranja'))).toBeGreaterThanOrEqual(TEXTO);
  });

  it('la barra de deshacer se lee: va sobre charcoal', () => {
    expect(contraste(BLANCO, color('charcoal'))).toBeGreaterThanOrEqual(TEXTO);
    expect(contraste(color('naranja'), color('charcoal'))).toBeGreaterThanOrEqual(TEXTO);
  });
});

describe('B8 · los iconos con significado llegan a 3:1', () => {
  for (const app of ACENTOS) {
    it(`el acento de ${app} se distingue de los dos fondos`, () => {
      expect(contraste(color(`app-${app}`), FONDO())).toBeGreaterThanOrEqual(ICONO);
      expect(contraste(color(`app-${app}`), SUPERFICIE())).toBeGreaterThanOrEqual(ICONO);
    });
  }

  it('los iconos de estado se distinguen sobre su fondo suave', () => {
    for (const estado of ['bien', 'atencion', 'mal', 'info']) {
      expect(contraste(color(estado), color(`${estado}-suave`))).toBeGreaterThanOrEqual(ICONO);
      expect(contraste(color(estado), FONDO())).toBeGreaterThanOrEqual(ICONO);
    }
  });

  it('el icono del boton de la rueda se ve sobre el naranja', () => {
    expect(contraste(color('charcoal'), color('naranja'))).toBeGreaterThanOrEqual(ICONO);
  });

  it('el anillo de foco se ve, gracias a su filo charcoal', () => {
    // «Foco visible siempre, con anillo naranja de 2 px» (B8). El naranja solo da
    // 2,5:1 contra el fondo; el filo de fuera es lo que lo hace visible, y el
    // naranja se distingue del filo.
    expect(contraste(color('naranja'), FONDO())).toBeLessThan(ICONO);
    expect(contraste(color('charcoal'), FONDO())).toBeGreaterThanOrEqual(ICONO);
    expect(contraste(color('naranja'), color('charcoal'))).toBeGreaterThanOrEqual(ICONO);
  });
});

describe('B3 · los ocho acentos', () => {
  it('son ocho colores distintos', () => {
    // «Cada app con su icono y **su** acento de color»: dos apps del mismo color
    // dejarian de reconocerse de un vistazo.
    const colores = ACENTOS.map((a) => color(`app-${a}`));
    expect(new Set(colores).size).toBe(colores.length);
  });

  it('el del Panel es el charcoal, como dice la tabla de B3', () => {
    expect(color('app-panel')).toBe(color('charcoal'));
  });

  it('el de Fogon es el naranja, como dice la tabla de B3', () => {
    expect(color('app-fogon')).toBe(color('naranja'));
  });
});

describe('los colores de M3 no se han inventado: son los de B1', () => {
  it('la paleta de marca esta tal cual', () => {
    expect(color('charcoal')).toBe('#111c1f');
    expect(color('naranja')).toBe('#ff7a00');
    expect(color('naranja-suave')).toBe('#fff1e5');
    expect(color('fondo')).toBe('#fafaf8');
    expect(color('superficie')).toBe('#ffffff');
    expect(color('borde')).toBe('#e6e3de');
    expect(color('borde-fuerte')).toBe('#cfcac2');
  });

  it('los de texto y los de estado tambien', () => {
    expect(color('texto')).toBe('#111c1f');
    expect(color('texto-suave')).toBe('#5a6568');
    expect(color('texto-tenue')).toBe('#8a9497');
    expect(color('bien')).toBe('#1e8e5a');
    expect(color('atencion')).toBe('#c77700');
    expect(color('mal')).toBe('#c4372b');
    expect(color('info')).toBe('#2c6e9b');
  });
});

describe('nadie usa --texto-tenue para texto', () => {
  /*
   * Esto es una prueba sobre el codigo fuente, y es a proposito.
   *
   * `--texto-tenue` da 2,97:1 y no llega al 4,5 que pide B8. Se deja en la paleta
   * porque esta en B1, pero **solo puede usarse donde no hay que leer**: el icono
   * decorativo de un estado vacio, un texto de ejemplo dentro de un campo (que
   * nunca es la unica etiqueta, B8), y lo deshabilitado.
   *
   * Sin esta prueba, la regla duraria hasta la primera pantalla con prisa.
   */
  const PERMITIDO = [
    // Un texto de ejemplo dentro del campo. Nunca es la unica etiqueta.
    'placeholder:text-texto-tenue',
    // Lo deshabilitado, que ademas se marca con el cursor y con `disabled`.
    'disabled:text-texto-tenue',
  ];

  it('solo aparece donde no hay que leer', () => {
    const fuentes = leerComponentes();
    const malos: string[] = [];

    for (const [fichero, codigo] of fuentes) {
      for (const linea of codigo.split('\n')) {
        if (!linea.includes('text-texto-tenue')) continue;
        if (PERMITIDO.some((p) => linea.includes(p))) continue;
        // El icono de un estado vacio va con `aria-hidden`: es decoracion.
        if (
          linea.includes('aria-hidden') ||
          codigo.includes('aria-hidden className="text-texto-tenue"')
        ) {
          continue;
        }
        malos.push(`${fichero}: ${linea.trim()}`);
      }
    }

    expect(malos).toEqual([]);
  });
});

function leerComponentes(): [string, string][] {
  const raiz = fileURLToPath(new URL('.', import.meta.url));
  const salida: [string, string][] = [];

  const recorrer = (carpeta: string) => {
    for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
      const camino = `${carpeta}/${entrada.name}`;
      if (entrada.isDirectory()) recorrer(camino);
      else if (/\.tsx?$/.test(entrada.name) && !entrada.name.includes('.prueba.')) {
        salida.push([entrada.name, readFileSync(camino, 'utf8')]);
      }
    }
  };

  recorrer(raiz);
  return salida;
}
