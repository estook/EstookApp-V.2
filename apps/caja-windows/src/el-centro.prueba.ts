import { afterEach, describe, expect, it } from 'vitest';
import {
  abrirElSobre,
  cerrarElSobre,
  laClaveConLaCaja,
  laHuellaDeLaLlave,
  type LoQueSePasaPorLaCaja,
  type PapelCompuesto,
} from '@estook/dominio';
import { ElCentro, type LoQueSabeElCentro, type ManosDelCentro } from './el-centro.ts';

/**
 * **La caja de centro, sin internet** (T5 · 2 · 2, 0123): un comandero de mentira le habla en
 * http al 127.0.0.1 con sus sobres cerrados, como lo haría por el wifi del local. La impresora
 * es de mentira: se apunta lo que le llegaría.
 */

const ORIGEN = 'https://estook.com';
const CAJA = '00000000-0000-4000-8000-0000000000ca';
const COMANDERO = '00000000-0000-4000-8000-00000000c0de';
const OTRO_LOCAL = '00000000-0000-4000-8000-0000000000aa';
const LA_IMPRESORA = '192.168.1.50:9100';

const SABE: LoQueSabeElCentro = {
  caja: CAJA,
  aparatos: [COMANDERO],
  cocinaSaleEn: 'papel',
  barraSaleEn: 'pantalla',
  impresoras: [{ direccion: LA_IMPRESORA, anchoMm: 80, imprime: ['cocina', 'caja'] }],
};

function loMandado(id: string): LoQueSePasaPorLaCaja {
  return {
    que: 'nueva',
    id,
    mesa: {
      cuentaId: '11111111-1111-4111-8111-111111111111',
      titulo: 'Mesa 4',
      tipo: 'mesa',
      personas: 2,
      camarero: 'Lucía',
      camareroId: null,
      notaParaCocina: null,
      paraLas: null,
      porPases: true,
      alergias: [],
    },
    platos: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        nombre: 'Croquetas',
        cantidad: 2,
        nota: null,
        opciones: [],
        pesoGramos: null,
        alergenos: [],
        destino: 'cocina',
        pase: 1,
        delMenu: false,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        nombre: 'Caña',
        cantidad: 1,
        nota: null,
        opciones: [],
        pesoGramos: null,
        alergenos: [],
        destino: 'barra',
        pase: null,
        delMenu: false,
      },
    ],
    esperan: [],
    hora: '21:38',
    aparato: 'Móvil de Lucía',
  };
}

interface Mentira {
  readonly manos: ManosDelCentro;
  readonly impreso: { direccion: string; papel: PapelCompuesto }[];
  disco: string | null;
  saleBien: boolean;
}

function unasManos(): Mentira {
  const m: Mentira = {
    impreso: [],
    disco: null,
    saleBien: true,
    manos: {
      imprimir: (direccion, _ancho, papel) => {
        if (!m.saleBien) return Promise.resolve({ salio: false, porque: 'No responde' });
        m.impreso.push({ direccion, papel });
        return Promise.resolve({ salio: true, porque: null });
      },
      guardar: (texto) => {
        m.disco = texto;
      },
      leer: () => m.disco,
      ahora: () => Date.now(),
    },
  };
  return m;
}

const encendidos: ElCentro[] = [];
afterEach(() => {
  for (const c of encendidos.splice(0)) c.parar();
});

async function unCentro(m = unasManos()) {
  const huella = await laHuellaDeLaLlave('la-llave-de-la-caja-de-pruebas-0123456789');
  const centro = new ElCentro([ORIGEN], '1.1.0', m.manos);
  centro.saber(huella, SABE);
  await centro.empezar(0, '127.0.0.1');
  encendidos.push(centro);
  const donde = `http://127.0.0.1:${String(centro.elPuerto())}`;
  const clave = await laClaveConLaCaja(huella, COMANDERO);
  const hablar = async (cuerpo: unknown, quien = COMANDERO, conClave = clave) => {
    const sobre = await cerrarElSobre(conClave, quien, cuerpo);
    const respuesta = await fetch(`${donde}/`, { method: 'POST', body: sobre });
    if (!respuesta.ok) return { estado: respuesta.status, cuerpo: null, sobre };
    const abierto = await abrirElSobre(conClave, await respuesta.text());
    return { estado: respuesta.status, cuerpo: abierto?.cuerpo as Record<string, unknown>, sobre };
  };
  return { centro, m, donde, huella, hablar };
}

describe('la caja de centro', () => {
  it('contesta «¿estás ahí?» sin decir nada del local', async () => {
    const { donde } = await unCentro();
    const respuesta = await fetch(`${donde}/hola`, { headers: { origin: ORIGEN } });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('access-control-allow-origin')).toBe(ORIGEN);
    expect(await respuesta.json()).toEqual({ estook: 'caja', version: '1.1.0', lista: true });
  });

  it('solo deja pedir desde Estook TPV: otra web no recibe permiso', async () => {
    const { donde } = await unCentro();
    const ajena = await fetch(`${donde}/`, {
      method: 'OPTIONS',
      headers: { origin: 'https://otra-web.example' },
    });
    expect(ajena.headers.get('access-control-allow-origin')).toBeNull();
    const suya = await fetch(`${donde}/`, { method: 'OPTIONS', headers: { origin: ORIGEN } });
    expect(suya.headers.get('access-control-allow-private-network')).toBe('true');
  });

  it('lo mandado sin internet sale en la impresora de cocina, una vez, y lo de la barra no', async () => {
    const { hablar, m } = await unCentro();
    const primera = await hablar({ que: 'pasar', lo: loMandado('aaaaaaaa-0000-4000-8000-000000000001') });
    expect(primera.cuerpo).toEqual({ ok: true, enPapel: 1, repetido: false });
    expect(m.impreso).toHaveLength(1);
    expect(m.impreso[0]?.direccion).toBe(LA_IMPRESORA);
    const textos = JSON.stringify(m.impreso[0]?.papel);
    expect(textos).toContain('MESA 4');
    expect(textos).toContain('Croquetas');
    expect(textos).not.toContain('Caña');

    // El comandero no oyó la respuesta y lo vuelve a mandar: no sale otra vez.
    const otraVez = await hablar({ que: 'pasar', lo: loMandado('aaaaaaaa-0000-4000-8000-000000000001') });
    expect(otraVez.cuerpo).toEqual({ ok: true, enPapel: 0, repetido: true });
    expect(m.impreso).toHaveLength(1);
  });

  it('se lo da a la pantalla de cocina', async () => {
    const { hablar } = await unCentro();
    await hablar({ que: 'pasar', lo: loMandado('aaaaaaaa-0000-4000-8000-000000000002') });
    const cocina = await hablar({ que: 'la_cocina' });
    const llegado = cocina.cuerpo?.['llegado'] as { id: string; llegoEn: string }[];
    expect(llegado.map((l) => l.id)).toEqual(['aaaaaaaa-0000-4000-8000-000000000002']);
    expect(Number.isNaN(Date.parse(llegado[0]?.llegoEn ?? ''))).toBe(false);
  });

  it('no contesta a un aparato de otro local, ni a un sobre repetido, ni a uno tocado', async () => {
    const { hablar, huella, donde } = await unCentro();
    const deOtro = await hablar({ que: 'hola' }, OTRO_LOCAL, await laClaveConLaCaja(huella, OTRO_LOCAL));
    expect(deOtro.estado).toBe(401);

    const bueno = await hablar({ que: 'hola' });
    expect(bueno.cuerpo).toEqual({ ok: true });
    const repetido = await fetch(`${donde}/`, { method: 'POST', body: bueno.sobre });
    expect(repetido.status).toBe(401);

    // Con la clave de otro aparato, diciendo ser el comandero: no se abre.
    const conOtraClave = await hablar({ que: 'hola' }, COMANDERO, await laClaveConLaCaja(huella, CAJA));
    expect(conOtraClave.estado).toBe(401);
  });

  it('lo que no sale se queda para la vuelta siguiente, y sobrevive a cerrar el programa', async () => {
    const m = unasManos();
    m.saleBien = false;
    const { hablar, centro } = await unCentro(m);
    await hablar({ que: 'pasar', lo: loMandado('aaaaaaaa-0000-4000-8000-000000000003') });
    expect(centro.comoEsta().porImprimir).toBe(1);
    centro.parar();

    const otraVez = new ElCentro([ORIGEN], '1.1.0', m.manos);
    expect(otraVez.loLlegado().map((l) => l.id)).toEqual(['aaaaaaaa-0000-4000-8000-000000000003']);
    expect(otraVez.comoEsta().porImprimir).toBe(1);
  });

  it('al desvincular la caja no queda nada del local en el disco', async () => {
    const { hablar, centro, m } = await unCentro();
    await hablar({ que: 'pasar', lo: loMandado('aaaaaaaa-0000-4000-8000-000000000004') });
    centro.olvidar();
    expect(m.disco).not.toContain('Mesa 4');
    const despues = await hablar({ que: 'hola' });
    expect(despues.estado).toBe(401);
  });
});
