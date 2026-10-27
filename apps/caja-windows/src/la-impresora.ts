import { Socket } from 'node:net';
import { PREGUNTAR_POR_EL_PAPEL, comoEstaElPapel, type ComoEstaElPapel } from '@estook/impresion';
import type { ComoSalio } from '@estook/impresion';

/**
 * **Hablar con una impresora de la red del local** (T5 · 1, decisión 0119; Anexo 6.1 y 6.3).
 *
 * Casi todas las impresoras de tickets escuchan en el puerto 9100 y reciben los bytes de
 * ESC/POS tal cual: se abre la conexión, se mandan, y se cierra. Es lo que un navegador no puede
 * hacer, y la razón de que exista este programa. **Por USB, en una entrega siguiente** (0119):
 * en Windows va por el controlador de cada marca, y se prueba con una de verdad.
 */

export const PUERTO_DE_SIEMPRE = 9100;

/** «192.168.1.50:9100», «192.168.1.50» (el 9100) o «[fe80::1]:9100». */
export function laDireccion(
  texto: string,
): { readonly host: string; readonly puerto: number } | null {
  const limpio = texto.trim();
  const conCorchetes = /^\[([0-9a-fA-F:.]+)\](?::(\d{1,5}))?$/.exec(limpio);
  const sencilla = /^([0-9A-Za-z.-]+)(?::(\d{1,5}))?$/.exec(limpio);
  const partes = conCorchetes ?? sencilla;
  if (partes === null) return null;
  const host = partes[1] ?? '';
  const puerto = partes[2] === undefined ? PUERTO_DE_SIEMPRE : Number(partes[2]);
  if (host === '' || !Number.isInteger(puerto) || puerto < 1 || puerto > 65535) return null;
  return { host, puerto };
}

function conectar(texto: string, esperaMs: number): Promise<Socket> {
  const direccion = laDireccion(texto);
  if (direccion === null) return Promise.reject(new Error('Esa dirección no tiene forma.'));
  return new Promise((resolver, rechazar) => {
    const conexion = new Socket();
    const reloj = setTimeout(() => {
      conexion.destroy();
      rechazar(new Error('No responde'));
    }, esperaMs);
    conexion.once('error', (fallo) => {
      clearTimeout(reloj);
      conexion.destroy();
      rechazar(fallo);
    });
    conexion.connect(direccion.puerto, direccion.host, () => {
      clearTimeout(reloj);
      conexion.removeAllListeners('error');
      resolver(conexion);
    });
  });
}

/**
 * **Manda los bytes y espera a que la impresora los tenga.** Si no contesta en `esperaMs` (10 s
 * de fábrica: lo que tarda en salir por la de reserva, 0119), no ha salido.
 */
export async function mandarALaImpresora(
  direccion: string,
  bytes: Uint8Array,
  esperaMs = 10_000,
): Promise<ComoSalio> {
  let conexion: Socket;
  try {
    conexion = await conectar(direccion, esperaMs);
  } catch {
    return { salio: false, porque: 'No responde' };
  }
  return new Promise((resolver) => {
    const reloj = setTimeout(() => {
      conexion.destroy();
      resolver({ salio: false, porque: 'No responde' });
    }, esperaMs);
    conexion.once('error', () => {
      clearTimeout(reloj);
      conexion.destroy();
      resolver({ salio: false, porque: 'Se cortó a medias' });
    });
    conexion.end(bytes, () => {
      clearTimeout(reloj);
      conexion.destroy();
      resolver({ salio: true, porque: null });
    });
  });
}

/**
 * **Cómo está el papel** (DLE EOT 4): la impresora contesta un byte al momento. La que no lo sabe
 * no contesta, y entonces se da por bien: lo que no se sabe no para el servicio.
 */
export async function comoEstaLaImpresora(
  direccion: string,
  esperaMs = 1_500,
): Promise<ComoEstaElPapel | 'no_responde'> {
  let conexion: Socket;
  try {
    conexion = await conectar(direccion, esperaMs);
  } catch {
    return 'no_responde';
  }
  return new Promise((resolver) => {
    const acabar = (como: ComoEstaElPapel) => {
      clearTimeout(reloj);
      conexion.destroy();
      resolver(como);
    };
    const reloj = setTimeout(() => {
      acabar('bien');
    }, esperaMs);
    conexion.once('data', (datos: Buffer) => {
      acabar(comoEstaElPapel(datos[0] ?? 0));
    });
    conexion.once('error', () => {
      acabar('bien');
    });
    conexion.write(PREGUNTAR_POR_EL_PAPEL);
  });
}

/**
 * **El nombre que dice de sí misma** (GS I 67, el «nombre de la impresora» de ESC/POS): las Epson
 * contestan «_TM-T20III». La que no lo dice, nula: se la llama por lo que imprime.
 */
export async function suNombre(direccion: string, esperaMs = 800): Promise<string | null> {
  let conexion: Socket;
  try {
    conexion = await conectar(direccion, esperaMs);
  } catch {
    return null;
  }
  return new Promise((resolver) => {
    let leido = Buffer.alloc(0);
    const acabar = (nombre: string | null) => {
      clearTimeout(reloj);
      conexion.destroy();
      resolver(nombre);
    };
    const reloj = setTimeout(() => {
      acabar(null);
    }, esperaMs);
    conexion.on('data', (datos: Buffer) => {
      leido = Buffer.concat([leido, datos]);
      const fin = leido.indexOf(0);
      if (leido[0] === 0x5f && fin > 1) {
        const nombre = leido.subarray(1, fin).toString('latin1').trim();
        acabar(nombre === '' ? null : `${nombre.startsWith('TM-') ? 'Epson ' : ''}${nombre}`);
      }
    });
    conexion.once('error', () => {
      acabar(null);
    });
    conexion.write(Uint8Array.from([0x1d, 0x49, 0x43]));
  });
}
