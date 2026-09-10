import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ORDEN_DE_LA_RUEDA, appsVisibles, type PermisosResueltos } from '@estook/permisos';
import {
  APPS,
  MODULOS,
  PANEL,
  appPorId,
  appPorPermiso,
  destinosConstruidos,
  destinosQueLlegan,
  dondeEntra,
  rutaDe,
} from './apps.ts';
import { WIDGETS } from './panel/catalogo.ts';

/**
 * M3 · las ocho apps (Partes B3 y B5 del Plan).
 *
 * Este catalogo es el unico dueno de «que apps hay y por donde se navegan».
 *
 * ── Por que esta prueba lee el Plan en vez de llevarlo copiado ───────────────
 *
 * Porque la version de antes lo llevaba copiado, y **por eso estuvo en verde
 * mientras contradecia al documento maestro**. La tabla de B5 dice que Negocio
 * tiene `Resumen · Pulse · Costes · Más`; el catalogo del codigo ponia «Reseñas»
 * donde iba «Pulse»; y la prueba, que existia justo para cuadrar las dos cosas,
 * tenia dentro una tercera copia con el mismo fallo que el codigo. Tres sitios,
 * dos valores, y la comprobacion del lado equivocado.
 *
 * Es exactamente la leccion 12 de «como trabajamos» —«lo que no se mide, no esta
 * probado»— y su hermana pequena: **una prueba que compara el codigo con una copia
 * del documento no compara nada**. Ahora se lee el fichero de verdad, y si alguien
 * cambia la tabla del Plan sin tocar el codigo, salta aqui.
 */
const PLAN = readFileSync(
  fileURLToPath(new URL('../../../docs/maestros/Estook-Plan-de-Desarrollo.md', import.meta.url)),
  'utf8',
);

/** Las celdas de una fila de tabla de Markdown, ya recortadas. */
function celdasDe(linea: string): readonly string[] {
  return linea
    .split('|')
    .slice(1, -1)
    .map((celda) => celda.trim());
}

/**
 * Lee una tabla de dos columnas del Plan: la primera es la clave y la segunda una
 * lista separada por `·`.
 *
 * ── Por que se busca por el nombre de las columnas y no por la linea entera ───
 *
 * Porque la primera version buscaba la cabecera tal cual estaba escrita, con sus
 * espacios, y **`prettier` alinea las tablas de Markdown**: en cuanto se anadio
 * una fila con un nombre mas largo, el formateador movio los espacios de la
 * cabecera y la prueba dejo de encontrar la tabla. Una prueba que se cae porque el
 * formateador ha hecho su trabajo no esta comprobando lo que dice comprobar.
 *
 * No es un analizador de Markdown: es lo justo para estas dos tablas, y si alguien
 * les cambia **el nombre de las columnas** la prueba se cae, que es lo que tiene
 * que pasar.
 */
function tablaDelPlan(primera: string, segunda: string): Map<string, string[]> {
  const lineas = PLAN.split('\n');
  const cabecera = lineas.findIndex((linea) => {
    if (!linea.startsWith('|')) return false;
    const celdas = celdasDe(linea);
    return celdas.length === 2 && celdas[0] === primera && celdas[1] === segunda;
  });
  expect(cabecera, `la tabla «${primera} | ${segunda}» ya no esta en el Plan`).toBeGreaterThan(-1);

  const filas = new Map<string, string[]>();

  // La cabecera, el separador de guiones, y a partir de ahi las filas: se para en
  // la primera linea que ya no empieza por `|`.
  for (const linea of lineas.slice(cabecera + 2)) {
    if (!linea.startsWith('|')) break;
    const celdas = celdasDe(linea);
    const clave = celdas[0];
    const valores = celdas[1];
    if (clave === undefined || valores === undefined) continue;
    filas.set(
      clave,
      valores.split('·').map((valor) => valor.trim()),
    );
  }

  expect(filas.size, `la tabla «${primera}» ha salido vacia`).toBeGreaterThan(0);
  return filas;
}

describe('las ocho', () => {
  it('son ocho, ni una mas', () => {
    expect(APPS).toHaveLength(8);
  });

  it('van en el orden de la rueda, que lo fija @estook/permisos', () => {
    expect(APPS.map((a) => a.permiso)).toEqual([...ORDEN_DE_LA_RUEDA]);
  });

  it('cada una tiene su icono y su acento, y ninguno se repite', () => {
    // «Cada app con su icono y su acento de color» (Manifiesto, regla 11).
    expect(new Set(APPS.map((a) => a.acento)).size).toBe(8);
    expect(new Set(APPS.map((a) => a.icono)).size).toBe(8);
  });

  it('el acento es una variable de las fichas, nunca un color escrito a mano', () => {
    // Si alguien escribe `#C77700` aqui, el color pasaria a estar en dos sitios
    // y la prueba de contraste dejaria de valer para esta pantalla.
    for (const app of APPS) {
      expect(app.acento).toMatch(/^var\(--color-app-[a-z]+\)$/);
    }
  });

  it('ninguna pasa de cuatro destinos', () => {
    // «Como mucho cuatro» (B5). El tope es del catalogo, no de la barra: una
    // barra que aprieta cinco posiciones sigue teniendo cinco posiciones.
    for (const app of APPS) {
      expect(app.destinos.length).toBeLessThanOrEqual(4);
      expect(app.destinos.length).toBeGreaterThan(0);
    }
  });

  it('ninguna tiene un destino llamado «Mas»', () => {
    // El cajon de sastre, prohibido: «un "Mas" no responde a ninguna pregunta,
    // asi que nadie sabe que hay dentro hasta que lo abre» (B5).
    for (const app of APPS) {
      for (const destino of app.destinos) {
        expect(destino.nombre).not.toMatch(/^m[aá]s$/i);
      }
    }
  });

  it('los destinos de cada app son los de la tabla de B5, leida del Plan', () => {
    const delPlan = tablaDelPlan('App', 'Sus destinos');

    for (const app of APPS) {
      const esperado = delPlan.get(app.nombre);
      expect(esperado, `${app.nombre} no esta en la tabla de destinos de B5`).toBeDefined();
      expect(app.destinos.map((d) => d.nombre)).toEqual(esperado);
    }
  });

  it('las vistas de cada destino son las de B5, leidas del Plan', () => {
    const delPlan = tablaDelPlan('Destino', 'Sus vistas');

    // Todas las del Plan estan en el codigo...
    for (const [clave, esperado] of delPlan) {
      const [nombreDeLaApp, nombreDelDestino] = clave.split('·').map((t) => t.trim());
      const app = APPS.find((a) => a.nombre === nombreDeLaApp);
      expect(app, `«${clave}» nombra una app que no existe`).toBeDefined();
      const destino = app?.destinos.find((d) => d.nombre === nombreDelDestino);
      expect(destino, `«${clave}» nombra un destino que no existe`).toBeDefined();
      expect(destino?.vistas.map((v) => v.nombre)).toEqual(esperado);
    }

    // ...y todas las del codigo estan en el Plan. Sin esta mitad se podrian
    // anadir vistas sin escribirlas en el documento, que es la forma en la que un
    // maestro se queda atras sin que nadie se entere.
    for (const app of APPS) {
      for (const destino of app.destinos) {
        if (destino.vistas.length === 0) continue;
        expect(
          delPlan.has(`${app.nombre} · ${destino.nombre}`),
          `${app.nombre} · ${destino.nombre} tiene vistas y no esta en la tabla de B5`,
        ).toBe(true);
      }
    }
  });

  it('los destinos sin vistas no salen en la tabla de vistas', () => {
    const delPlan = tablaDelPlan('Destino', 'Sus vistas');
    for (const app of APPS) {
      for (const destino of app.destinos) {
        if (destino.vistas.length > 0) continue;
        expect(delPlan.has(`${app.nombre} · ${destino.nombre}`)).toBe(false);
      }
    }
  });

  it('los identificadores de destino y de vista valen para una direccion', () => {
    // Van en la barra de direcciones: sin acentos, sin espacios y en minusculas.
    for (const app of APPS) {
      expect(app.id).toMatch(/^[a-z]+$/);
      for (const destino of app.destinos) {
        expect(destino.id).toMatch(/^[a-z]+$/);
        for (const vista of destino.vistas) {
          expect(vista.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
      }
    }
  });

  it('cada destino dice que pregunta contesta, y acaba en interrogacion', () => {
    // «Si un destino no sabe que pregunta contesta, es un cajon» (B5).
    for (const app of APPS) {
      for (const destino of app.destinos) {
        expect(destino.queContesta.length).toBeGreaterThan(15);
        expect(destino.queContesta.endsWith('?')).toBe(true);
      }
    }
  });

  it('cada una dice que hace, en una frase', () => {
    for (const app of APPS) {
      expect(app.queHace.length).toBeGreaterThan(15);
      // Sin punto final: son frases de tarjeta, no parrafos.
      expect(app.queHace.endsWith('.')).toBe(false);
    }
  });
});

/**
 * Los numeros de modulo · el fallo que llego a la primera pantalla del dia.
 *
 * `ESTADO.md` decia que habia «una prueba al lado que los cuadra con el Plan», y
 * **no la habia**. Mientras tanto el Panel escribia los suyos a mano dentro del
 * texto de cada tarjeta, y dos estaban mal: decia que las ventas del TPV las traia
 * «M13», que es Equipo, y que Negocio era «M17», que es Cuaderno.
 *
 * Ahora el numero se escribe una vez —en el catalogo de navegacion— y el nombre
 * sale de `MODULOS`, y esta prueba cuadra las dos cosas contra los titulos de la
 * parte D del Plan.
 */
describe('los modulos que se nombran en pantalla', () => {
  /** Los titulos `### M9 · Escandallos` de la parte D, tal cual estan escritos. */
  const delPlan = new Map<string, string>();
  for (const linea of PLAN.split('\n')) {
    const encaja = /^### (M(\d+) · .+)$/.exec(linea.trim());
    if (encaja?.[1] !== undefined && encaja[2] !== undefined) {
      delPlan.set(`M${encaja[2]}`, encaja[1]);
    }
  }

  it('el Plan tiene sus treinta y una fichas de modulo', () => {
    // De M0 a M30. Si esto se cae, es que el Plan ha cambiado de forma y hay que
    // mirarlo antes de creerse el resto de esta descripcion.
    expect(delPlan.size).toBe(31);
  });

  it('cada modulo del catalogo se llama como en el Plan', () => {
    for (const [numero, nombre] of Object.entries(MODULOS)) {
      expect(delPlan.get(numero), `${numero} no tiene ficha en el Plan`).toBeDefined();
      expect(nombre).toBe(delPlan.get(numero));
    }
  });

  /**
   * Todos los modulos que se nombran, de los dos catalogos.
   *
   * Los dos, y no solo el de navegacion: los widgets del Panel tambien dicen «esto
   * llega con M21», y si el nombre de M21 solo se comprobara desde `apps.ts` un
   * widget podria nombrar un modulo inventado.
   */
  const nombrados = new Set<string>();
  for (const app of APPS) {
    for (const destino of app.destinos) {
      if (destino.modulo !== undefined) nombrados.add(destino.modulo);
      for (const vista of destino.vistas) {
        if (vista.modulo !== undefined) nombrados.add(vista.modulo);
      }
    }
  }
  for (const widget of WIDGETS) {
    if (widget.modulo !== undefined) nombrados.add(widget.modulo);
  }
  // M6 no lo nombra nada, porque es el que esta construido, y se queda a
  // proposito: lo nombran las pantallas de Inventario.
  nombrados.add('M6');

  it('todo modulo que se nombra en pantalla esta en el catalogo', () => {
    for (const modulo of nombrados) {
      expect(MODULOS[modulo], `${modulo} se nombra y no tiene nombre entero`).toBeDefined();
    }
  });

  it('no sobra ningun modulo en el catalogo', () => {
    // Un nombre que ya no nombra nada es un nombre que se queda desactualizado
    // sin que nadie lo note.
    expect([...Object.keys(MODULOS)].filter((m) => !nombrados.has(m))).toEqual([]);
  });
});

describe('lo construido y lo que llega', () => {
  /** Sin `!`: el lint los prohibe, y una app que no existe tiene que decirlo. */
  const laApp = (id: string) => {
    const app = appPorId(id);
    expect(app, `no hay app ${id}`).toBeDefined();
    if (app === undefined) throw new Error(id);
    return app;
  };

  it('Inventario tiene sus cuatro destinos construidos', () => {
    // Es la app de M6, y la que demuestra la regla: **ninguna posicion vacia**.
    // Antes tenia cuatro pestanas y dos no llevaban a ningun sitio.
    expect(destinosConstruidos(laApp('inventario'))).toHaveLength(4);
    expect(destinosQueLlegan(laApp('inventario'))).toHaveLength(0);
  });

  it('una app sin construir no tiene ningun destino en la barra', () => {
    expect(destinosConstruidos(laApp('carta'))).toHaveLength(0);
  });

  it('Equipo tiene Hoy, Personas y Resumen construidos', () => {
    // Personas la trajo M4. Hoy y Resumen, M6½: con los fichajes ya se puede
    // contestar quién está y cuántas horas lleva cada uno. Horarios sigue en M14.
    expect(destinosConstruidos(laApp('equipo')).map((d) => d.id)).toEqual([
      'hoy',
      'personas',
      'resumen',
    ]);
  });

  it('donde entra una app es su primer destino construido', () => {
    expect(dondeEntra(laApp('inventario'))?.id).toBe('hoy');
    // Equipo entra en Hoy, que ya no es un cartel: quién ha fichado y quién no.
    expect(dondeEntra(laApp('equipo'))?.id).toBe('hoy');
    // Y Servicio entra en la jornada por el cierre, que es lo que funciona.
    expect(rutaDe(laApp('servicio'))).toBe('/servicio/jornada/cierre');
  });

  it('la ruta lleva la primera vista cuando el destino tiene vistas', () => {
    const inventario = laApp('inventario');
    expect(rutaDe(inventario)).toBe('/inventario/hoy');
    const productos = inventario.destinos.find((d) => d.id === 'productos');
    expect(rutaDe(inventario, productos)).toBe('/inventario/productos/todo');
  });
});

describe('el Panel no es una de las ocho', () => {
  it('no entra en la rueda', () => {
    expect(APPS.map((a) => a.id)).not.toContain('panel');
  });

  it('no tiene destinos: es la pantalla de inicio', () => {
    expect(PANEL.destinos).toHaveLength(0);
  });
});

describe('buscar una app', () => {
  it('por su identificador', () => {
    expect(appPorId('inventario')?.nombre).toBe('Inventario');
    expect(appPorId('no-existe')).toBeUndefined();
  });

  it('por su permiso', () => {
    expect(appPorPermiso('app.carta')?.nombre).toBe('Carta');
  });

  it('los permisos que no son de la rueda no dan app', () => {
    // Fogon, Ajustes y la gestoria son permisos de app, pero no son sectores.
    expect(appPorPermiso('app.fogon')).toBeUndefined();
    expect(appPorPermiso('app.ajustes')).toBeUndefined();
    expect(appPorPermiso('app.gestoria')).toBeUndefined();
    expect(appPorPermiso('app.panel')).toBeUndefined();
  });
});

describe('la rueda se reparte entre las que el rol tiene', () => {
  const con = (...permisos: string[]): PermisosResueltos =>
    Object.fromEntries(permisos.map((p) => [p, 'ver']));

  it('un camarero ve cuatro', () => {
    // Las de la matriz: calendario, carta, servicio y cuaderno. El Panel no
    // cuenta, porque no es un sector.
    const suyas = appsVisibles(
      con('app.panel', 'app.calendario', 'app.carta', 'app.servicio', 'app.cuaderno'),
    );
    expect(suyas).toHaveLength(4);
  });

  it('quien no tiene ninguna app no ve ninguna, y eso no revienta', () => {
    expect(appsVisibles(con('app.panel'))).toEqual([]);
  });
});
