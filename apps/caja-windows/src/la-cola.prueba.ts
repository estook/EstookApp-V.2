import { createServer, type Server } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { laComandaEnPapel, type PapelCompuesto } from '@estook/dominio';
import { enLaPagina858 } from '@estook/impresion';
import { comoEstaLaImpresora, laDireccion, mandarALaImpresora, suNombre } from './la-impresora.ts';
import { lasQueContestan, lasQueSeProbaran, lasRedesDelPc } from './buscar.ts';
import {
  LaColaEnMarcha,
  unaVuelta,
  type LoDeFuera,
  type LoQueSeApunta,
  type TrabajoParaLaCaja,
} from './la-cola.ts';

/**
 * **La caja para Windows contra una impresora de mentira** (T5 · 1, 0119; Anexo 6.8): un
 * servidor en el 127.0.0.1 que hace de impresora ESC/POS —guarda lo que le llega, contesta cómo
 * está el papel y dice su nombre— y que se puede apagar.
 */

interface ImpresoraDeMentira {
  readonly direccion: string;
  readonly recibido: Buffer[];
  papel: number;
  apagar(): Promise<void>;
}

const abiertas: Server[] = [];

afterEach(async () => {
  await Promise.all(
    abiertas.splice(0).map(
      (s) =>
        new Promise((r) => {
          s.close(() => {
            r(null);
          });
        }),
    ),
  );
});

async function unaImpresora(puerto = 0): Promise<ImpresoraDeMentira> {
  const recibido: Buffer[] = [];
  const impresora = { papel: 0x12 };
  const servidor = createServer((conexion) => {
    let trozos = Buffer.alloc(0);
    conexion.on('data', (datos: Buffer) => {
      // «¿Cómo está el papel?» y «¿cómo te llamas?» se contestan; lo demás es para imprimir.
      if (datos.length === 3 && datos[0] === 0x10 && datos[1] === 0x04 && datos[2] === 0x04) {
        conexion.write(Uint8Array.from([impresora.papel]));
        return;
      }
      if (datos.length === 3 && datos[0] === 0x1d && datos[1] === 0x49 && datos[2] === 0x43) {
        conexion.write(
          Buffer.concat([Buffer.from([0x5f]), Buffer.from('TM-T20III'), Buffer.from([0])]),
        );
        return;
      }
      trozos = Buffer.concat([trozos, datos]);
    });
    conexion.on('end', () => {
      if (trozos.length > 0) recibido.push(trozos);
    });
  });
  abiertas.push(servidor);
  await new Promise<void>((r) => {
    servidor.listen(puerto, '127.0.0.1', () => {
      r();
    });
  });
  const direccion = servidor.address();
  if (direccion === null || typeof direccion === 'string') throw new Error('sin puerto');
  return Object.assign(impresora, {
    direccion: `127.0.0.1:${String(direccion.port)}`,
    recibido,
    apagar: () =>
      new Promise<void>((r) => {
        servidor.close(() => {
          r();
        });
      }),
  });
}

/** Una dirección donde no escucha nadie. */
async function unaApagada(): Promise<string> {
  const impresora = await unaImpresora();
  await impresora.apagar();
  return impresora.direccion;
}

function comanda(mesa: string): PapelCompuesto {
  return laComandaEnPapel({
    sitio: 'cocina',
    que: 'nueva',
    copia: false,
    mesa,
    personas: 2,
    camarero: 'Sara',
    hora: '13:42',
    alergiasDeLaMesa: [],
    notaDeLaMesa: null,
    pases: [
      {
        numero: 1,
        espera: false,
        lineas: [
          {
            cantidad: 1,
            nombre: 'Croquetas',
            opciones: [],
            nota: null,
            pesoGramos: null,
            alergenos: [],
          },
        ],
      },
    ],
    motivo: null,
    quien: null,
    aparato: 'Comandero',
  });
}

/** Una API de mentira: lo pendiente se da hasta que se apunta impreso, como la de verdad. */
function unaApi(trabajos: TrabajoParaLaCaja[], impresoras: LaColaQueDaLaApiImpresoras = []) {
  const apuntado: LoQueSeApunta[] = [];
  const impreso = new Set<string>();
  return {
    apuntado,
    impreso,
    leerLaCola: () =>
      Promise.resolve({
        trabajos: trabajos.filter((t) => !impreso.has(t.id)),
        temaAlSegundo: 'tema',
        impresoras,
      }),
    apuntar: (lo: LoQueSeApunta) => {
      apuntado.push(lo);
      for (const t of lo.trabajos) if (t.salio) impreso.add(t.id);
      return Promise.resolve();
    },
  };
}
type LaColaQueDaLaApiImpresoras = { id: string; nombre: string; direccion: string }[];

function conLaRed(api: ReturnType<typeof unaApi>): LoDeFuera {
  return {
    ...api,
    mandar: (direccion, bytes) => mandarALaImpresora(direccion, bytes, 1_000),
    comoEsta: (direccion) => comoEstaLaImpresora(direccion, 500),
  };
}

function trabajo(id: string, direccion: string, reserva: string | null = null): TrabajoParaLaCaja {
  return {
    id,
    tipo: 'comanda',
    papel: comanda(`Mesa ${id}`),
    impresora: { id: 'cocina', nombre: 'Cocina', direccion, anchoMm: 80 },
    reserva: reserva === null ? null : { id: 'caja', direccion: reserva, anchoMm: 80 },
  };
}

const contiene = (b: Buffer, texto: string) => b.includes(Buffer.from(enLaPagina858(texto)));

describe('hablar con la impresora', () => {
  it('lee las direcciones, con el 9100 si no lo dicen', () => {
    expect(laDireccion('192.168.1.50:9100')).toEqual({ host: '192.168.1.50', puerto: 9100 });
    expect(laDireccion('192.168.1.50')).toEqual({ host: '192.168.1.50', puerto: 9100 });
    expect(laDireccion('[fe80::1]:9101')).toEqual({ host: 'fe80::1', puerto: 9101 });
    expect(laDireccion('no vale nada')).toBeNull();
    expect(laDireccion('1.2.3.4:99999')).toBeNull();
  });

  it('manda los bytes enteros, y dice cómo está el papel y cómo se llama', async () => {
    const impresora = await unaImpresora();
    expect(
      await mandarALaImpresora(impresora.direccion, Uint8Array.from([1, 2, 3]), 1_000),
    ).toEqual({
      salio: true,
      porque: null,
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(impresora.recibido.map((b) => [...b])).toEqual([[1, 2, 3]]);
    expect(await comoEstaLaImpresora(impresora.direccion, 500)).toBe('bien');
    impresora.papel = 0x12 | 0x60;
    expect(await comoEstaLaImpresora(impresora.direccion, 500)).toBe('sin_papel');
    expect(await suNombre(impresora.direccion, 500)).toBe('Epson TM-T20III');
  });

  it('apagada, no responde: ni sale ni se queda colgada', async () => {
    const apagada = await unaApagada();
    expect(await mandarALaImpresora(apagada, Uint8Array.from([1]), 1_000)).toEqual({
      salio: false,
      porque: 'No responde',
    });
    expect(await comoEstaLaImpresora(apagada, 500)).toBe('no_responde');
  });
});

describe('la cola de la caja', () => {
  it('imprime en orden, lo apunta, y lo impreso no se repite', async () => {
    const impresora = await unaImpresora();
    const api = unaApi([trabajo('1', impresora.direccion), trabajo('2', impresora.direccion)]);
    const vuelta = await unaVuelta(conLaRed(api));
    expect(vuelta).toMatchObject({ impresos: 2, fallidos: 0, temaAlSegundo: 'tema' });
    await unaVuelta(conLaRed(api));
    await new Promise((r) => setTimeout(r, 50));
    expect(impresora.recibido).toHaveLength(2);
    expect(contiene(impresora.recibido[0] ?? Buffer.alloc(0), 'MESA 1')).toBe(true);
    expect(contiene(impresora.recibido[1] ?? Buffer.alloc(0), 'MESA 2')).toBe(true);
    expect(api.apuntado[0]?.impresoras).toEqual([{ id: 'cocina', estado: 'lista' }]);
  });

  it('apagada: tres comandas esperan; al encenderla salen las tres, en orden y una vez (Anexo 6.8)', async () => {
    const encendida = await unaImpresora();
    const direccion = encendida.direccion;
    const puerto = Number(direccion.split(':')[1]);
    await encendida.apagar();
    const api = unaApi(['1', '2', '3'].map((id) => trabajo(id, direccion)));

    const apagada = await unaVuelta(conLaRed(api));
    expect(apagada).toMatchObject({ impresos: 0, fallidos: 3 });
    expect(api.apuntado[0]?.impresoras).toEqual([{ id: 'cocina', estado: 'no_responde' }]);

    const otraVez = await unaImpresora(puerto);
    const vuelta = await unaVuelta(conLaRed(api));
    expect(vuelta).toMatchObject({ impresos: 3, fallidos: 0 });
    await unaVuelta(conLaRed(api));
    await new Promise((r) => setTimeout(r, 50));
    expect(
      otraVez.recibido.map((b) => ['1', '2', '3'].find((m) => contiene(b, `MESA ${m}`))),
    ).toEqual(['1', '2', '3']);
  });

  it('si la suya no responde o no tiene papel, sale por la de reserva', async () => {
    const reserva = await unaImpresora();
    const api = unaApi([trabajo('1', await unaApagada(), reserva.direccion)]);
    await unaVuelta(conLaRed(api));
    expect(api.apuntado[0]?.trabajos).toEqual([
      { id: '1', salio: true, por_la_reserva: true, error: null },
    ]);

    const sinPapel = await unaImpresora();
    sinPapel.papel = 0x72;
    const otra = unaApi([trabajo('2', sinPapel.direccion, reserva.direccion)]);
    await unaVuelta(conLaRed(otra));
    await new Promise((r) => setTimeout(r, 50));
    expect(sinPapel.recibido).toHaveLength(0);
    expect(otra.apuntado[0]?.trabajos[0]).toMatchObject({ salio: true, por_la_reserva: true });
    expect(otra.apuntado[0]?.impresoras).toContainEqual({ id: 'cocina', estado: 'sin_papel' });
  });

  it('sin internet, la vuelta falla sin pararse, y la siguiente lo intenta', async () => {
    let veces = 0;
    const cola = new LaColaEnMarcha({
      leerLaCola: () => {
        veces += 1;
        return Promise.reject(new Error('sin internet'));
      },
      apuntar: () => Promise.resolve(),
      mandar: () => Promise.resolve({ salio: true, porque: null }),
      comoEsta: () => Promise.resolve('bien' as const),
    });
    cola.despertar();
    await cola.esperar();
    cola.despertar();
    await cola.esperar();
    expect(veces).toBe(2);
    expect(cola.comoVa().conectada).toBe(false);
  });
});

describe('buscar impresoras', () => {
  it('prueba las redes del PC, sin la suya ni la de «sin red», y la de Epson sin router', () => {
    const redes = lasRedesDelPc({
      Ethernet: [
        {
          address: '192.168.1.20',
          family: 'IPv4',
          internal: false,
          netmask: '255.255.255.0',
          mac: '',
          cidr: null,
        },
      ],
      'Sin red': [
        {
          address: '169.254.3.4',
          family: 'IPv4',
          internal: false,
          netmask: '255.255.0.0',
          mac: '',
          cidr: null,
        },
      ],
      Loopback: [
        {
          address: '127.0.0.1',
          family: 'IPv4',
          internal: true,
          netmask: '255.0.0.0',
          mac: '',
          cidr: null,
        },
      ],
    });
    expect(redes).toEqual([{ red: '192.168.1.', propia: '192.168.1.20' }]);
    const todas = lasQueSeProbaran(redes);
    expect(todas).toHaveLength(254);
    expect(todas).not.toContain('192.168.1.20');
    expect(todas).toContain('192.168.192.168');
  });

  it('encuentra la que contesta en su puerto', async () => {
    const impresora = await unaImpresora();
    const puerto = Number(impresora.direccion.split(':')[1]);
    const encontradas = await lasQueContestan(['127.0.0.2', '127.0.0.1'], {
      puerto,
      esperaMs: 300,
    });
    expect(encontradas).toEqual([`127.0.0.1:${String(puerto)}`]);
  });
});
