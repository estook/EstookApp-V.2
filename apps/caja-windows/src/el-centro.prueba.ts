import { pbkdf2Sync } from 'node:crypto';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  abrirElSobre,
  cerrarElSobre,
  laClaveConLaCaja,
  laHuellaDeLaLlave,
  type LoQueSePasaPorLaCaja,
  type LosPinDelCentro,
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
    const primera = await hablar({
      que: 'pasar',
      lo: loMandado('aaaaaaaa-0000-4000-8000-000000000001'),
    });
    expect(primera.cuerpo).toEqual({ ok: true, enPapel: 1, repetido: false });
    expect(m.impreso).toHaveLength(1);
    expect(m.impreso[0]?.direccion).toBe(LA_IMPRESORA);
    const textos = JSON.stringify(m.impreso[0]?.papel);
    expect(textos).toContain('MESA 4');
    expect(textos).toContain('Croquetas');
    expect(textos).not.toContain('Caña');

    // El comandero no oyó la respuesta y lo vuelve a mandar: no sale otra vez.
    const otraVez = await hablar({
      que: 'pasar',
      lo: loMandado('aaaaaaaa-0000-4000-8000-000000000001'),
    });
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
    const deOtro = await hablar(
      { que: 'hola' },
      OTRO_LOCAL,
      await laClaveConLaCaja(huella, OTRO_LOCAL),
    );
    expect(deOtro.estado).toBe(401);

    const bueno = await hablar({ que: 'hola' });
    expect(bueno.cuerpo).toEqual({ ok: true });
    const repetido = await fetch(`${donde}/`, { method: 'POST', body: bueno.sobre });
    expect(repetido.status).toBe(401);

    // Con la clave de otro aparato, diciendo ser el comandero: no se abre.
    const conOtraClave = await hablar(
      { que: 'hola' },
      COMANDERO,
      await laClaveConLaCaja(huella, CAJA),
    );
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

// ── T5 · 2 · 2 · 2 · Los PIN y Aparatos (0124) ───────────────────────────────

/** La huella como la guarda Estook, con pocas vueltas para que la prueba no tarde. */
function laHuellaDelPin(pin: string): string {
  const sal = Buffer.from('6f1c2e9a0b7d4c3e8f5a1b2c3d4e5f60', 'utf8');
  const resultado = pbkdf2Sync(pin, sal, 1000, 32, 'sha256');
  return `pbkdf2-sha256$1000$${sal.toString('base64url')}$${resultado.toString('base64url')}`;
}

const ANA = 'aaaaaaaa-1111-4000-8000-00000000a0a0';
const LUIS = 'aaaaaaaa-1111-4000-8000-00000000b0b0';

function lasPersonas(pausasEnUso = true): LosPinDelCentro {
  return {
    pausasEnUso,
    personas: [
      {
        id: ANA,
        nombre: 'Ana G.',
        iniciales: 'AN',
        huella: laHuellaDelPin('482913'),
        paradoHasta: null,
        permisos: { 'accion.tomar_nota': 'ver_y_editar', 'accion.fichar': 'ver_y_editar' },
        fichaje: 'fuera',
        desde: null,
      },
      {
        id: LUIS,
        nombre: 'Luis',
        iniciales: 'LU',
        huella: laHuellaDelPin('730561'),
        paradoHasta: null,
        permisos: { 'accion.tomar_nota': 'ver_y_editar', 'accion.fichar': 'ver_y_editar' },
        fichaje: 'dentro',
        desde: '2026-11-02T18:00:00.000Z',
      },
    ],
  };
}

describe('la caja de centro comprueba el PIN de cualquiera', () => {
  it('un comandero entra con el PIN de cualquiera del local: quién es, qué puede y si fichó', async () => {
    const { centro, hablar } = await unCentro();
    centro.saberLasPersonas(lasPersonas());
    const dicho = await hablar({ que: 'pin', pin: '482913' });
    expect(dicho.cuerpo).toMatchObject({
      ok: true,
      persona: { id: ANA, nombre: 'Ana G.', iniciales: 'AN' },
      permisos: { 'accion.tomar_nota': 'ver_y_editar', 'accion.fichar': 'ver_y_editar' },
      fichaje: 'fuera',
      pausasEnUso: true,
      // Luis toma nota y está fichado: a él se le pueden pasar las mesas.
      companeros: [{ id: LUIS, nombre: 'Luis' }],
    });
    // Nunca viaja una huella de vuelta.
    expect(JSON.stringify(dicho.cuerpo)).not.toContain('pbkdf2');
  });

  it('sin las personas guardadas, o con un PIN que no es de nadie, no entra nadie', async () => {
    const { centro, hablar } = await unCentro();
    expect((await hablar({ que: 'pin', pin: '482913' })).cuerpo).toEqual({
      ok: false,
      porque: 'sin_personas',
    });
    centro.saberLasPersonas(lasPersonas());
    expect((await hablar({ que: 'pin', pin: '111222' })).cuerpo).toEqual({
      ok: false,
      porque: 'pin_desconocido',
    });
  });

  it('diez fallos seguidos paran ese aparato cinco minutos; la caja sigue', async () => {
    const m = unasManos();
    let ahora = Date.parse('2026-11-02T21:00:00Z');
    const conReloj: Mentira = { ...m, manos: { ...m.manos, ahora: () => ahora } };
    const { centro, hablar, huella } = await unCentro(conReloj);
    centro.saberLasPersonas(lasPersonas());
    for (let i = 0; i < 10; i += 1) await hablar({ que: 'pin', pin: '000111' });
    expect((await hablar({ que: 'pin', pin: '482913' })).cuerpo).toEqual({
      ok: false,
      porque: 'aparato_parado',
    });
    const desdeLaCaja = await hablar(
      { que: 'pin', pin: '482913' },
      CAJA,
      await laClaveConLaCaja(huella, CAJA),
    );
    expect(desdeLaCaja.cuerpo).toMatchObject({ ok: true });
    ahora += 5 * 60 * 1000 + 1;
    expect((await hablar({ que: 'pin', pin: '482913' })).cuerpo).toMatchObject({ ok: true });
  });

  it('un PIN parado en Estook por fallarlo sigue parado en la caja', async () => {
    const { centro, hablar } = await unCentro();
    const lista = lasPersonas();
    centro.saberLasPersonas({
      ...lista,
      personas: lista.personas.map((p) =>
        p.id === ANA ? { ...p, paradoHasta: new Date(Date.now() + 60_000).toISOString() } : p,
      ),
    });
    expect((await hablar({ que: 'pin', pin: '482913' })).cuerpo).toEqual({
      ok: false,
      porque: 'demasiados_intentos',
    });
  });

  it('se ficha en la caja, no en un comandero; y lo fichado vale para entrar en el comandero', async () => {
    const { centro, hablar, huella } = await unCentro();
    centro.saberLasPersonas(lasPersonas());
    const claveDeLaCaja = await laClaveConLaCaja(huella, CAJA);
    const enLaCaja = (cuerpo: unknown) => hablar(cuerpo, CAJA, claveDeLaCaja);

    expect((await hablar({ que: 'fichar', pin: '482913', accion: 'entrada' })).cuerpo).toEqual({
      ok: false,
    });
    const entrada = await enLaCaja({ que: 'fichar', pin: '482913', accion: 'entrada' });
    expect(entrada.cuerpo).toMatchObject({ ok: true, fichaje: 'dentro' });
    expect(Number.isNaN(Date.parse(String(entrada.cuerpo?.['desde'])))).toBe(false);
    expect((await hablar({ que: 'pin', pin: '482913' })).cuerpo).toMatchObject({
      fichaje: 'dentro',
    });

    // Entrar otra vez estando dentro no toca; la pausa, sí; y la salida, también desde la pausa.
    const otraEntrada = await enLaCaja({ que: 'fichar', pin: '482913', accion: 'entrada' });
    expect(otraEntrada.cuerpo).toMatchObject({ ok: false, porque: 'no_toca', fichaje: 'dentro' });
    const pausa = await enLaCaja({ que: 'fichar', pin: '482913', accion: 'pausa' });
    expect(pausa.cuerpo).toMatchObject({ ok: true, fichaje: 'en_pausa' });
    const salida = await enLaCaja({ que: 'fichar', pin: '482913', accion: 'salida' });
    expect(salida.cuerpo).toMatchObject({ ok: true, fichaje: 'fuera', desde: null });
  });

  it('quien no ficha en su puesto no ficha tampoco sin internet, como en Estook', async () => {
    const { centro, hablar, huella } = await unCentro();
    const lista = lasPersonas();
    centro.saberLasPersonas({
      ...lista,
      personas: lista.personas.map((p) =>
        p.id === ANA ? { ...p, permisos: { 'accion.tomar_nota': 'ver_y_editar' as const } } : p,
      ),
    });
    const entrada = await hablar(
      { que: 'fichar', pin: '482913', accion: 'entrada' },
      CAJA,
      await laClaveConLaCaja(huella, CAJA),
    );
    expect(entrada.cuerpo).toEqual({ ok: false, porque: 'sin_permiso' });
  });

  it('sin pausas en el local no hay pausa', async () => {
    const { centro, hablar, huella } = await unCentro();
    centro.saberLasPersonas(lasPersonas(false));
    const pausa = await hablar(
      { que: 'fichar', pin: '730561', accion: 'pausa' },
      CAJA,
      await laClaveConLaCaja(huella, CAJA),
    );
    expect(pausa.cuerpo).toMatchObject({ ok: false, porque: 'no_toca' });
  });

  it('las personas sobreviven a cerrar el programa, y al desvincular no queda ninguna huella', async () => {
    const m = unasManos();
    const { centro } = await unCentro(m);
    centro.saberLasPersonas(lasPersonas());
    centro.parar();
    const otraVez = new ElCentro([ORIGEN], '1.2.0', m.manos);
    expect(otraVez.conoceLasPersonas()).toBe(true);
    otraVez.olvidar();
    expect(m.disco).not.toContain('pbkdf2');
    expect(otraVez.conoceLasPersonas()).toBe(false);
  });

  it('dos «empezar» a la vez (el programa y la pantalla al arrancar) son uno: sin «puerto ocupado»', async () => {
    // Un puerto libre, fijo para los dos, como el 47100 de verdad.
    const libre = await new Promise<number>((resolver) => {
      const prueba = createServer().listen(0, '127.0.0.1', () => {
        const donde = prueba.address();
        prueba.close(() => {
          resolver(typeof donde === 'object' && donde !== null ? donde.port : 0);
        });
      });
    });
    const centro = new ElCentro([ORIGEN], '1.2.0', unasManos().manos);
    encendidos.push(centro);
    await Promise.all([centro.empezar(libre, '127.0.0.1'), centro.empezar(libre, '127.0.0.1')]);
    expect(centro.comoEsta()).toMatchObject({ escucha: true, porque: null });
  });

  it('solo por dentro no dice dónde está, y al abrirse a la red sigue en su puerto', async () => {
    const { centro, hablar } = await unCentro();
    expect(centro.comoEsta()).toMatchObject({
      escucha: true,
      soloPorDentro: true,
      direcciones: [],
    });
    const puerto = centro.elPuerto();
    // En la prueba, «la red» es otra vez el propio PC: Windows no tiene que preguntar nada.
    await centro.abrirALaRed('127.0.0.1');
    expect(centro.elPuerto()).toBe(puerto);
    expect((await hablar({ que: 'hola' })).cuerpo).toEqual({ ok: true });
  });
});
