import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T2 · La sala, dibujada en Estook TPV** (decisión 0110, migración 0085), contra una base
 * de verdad: las pruebas del Anexo 11.15 de las mesas y del plano.
 *
 *   · Rosa dibuja el salón en la caja, **sin un número de centímetros**: una mesa de 6
 *     nace más grande que una de 2, con el número siguiente; se estira, se gira y vuelve
 *     a su tamaño; la barra y una pared; varias se mueven a la vez
 *   · una plantilla monta la terraza entera
 *   · **mover una mesa abierta no toca su cuenta**, y quitarla no se puede; ni la sala
 *   · la camarera no dibuja, ni el móvil de nadie, ni Estook con su sesión
 *   · **todas las mesas a la vista de todos**: Rosa se queda la mesa de Sara, y Sara una que no es suya
 *   · la mesa de quien ha fichado la salida lo dice
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera

let barCentro: string;
let saraId: string;
let rosaId: string;
let llaveDeLaCaja: string;
let llaveDeLaTablet: string;
let llaveDelMovil: string;

async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await api.ejecutar(null, 'entrar_con_pin', { llave, pin: base.pinDe(correo, 'bar-centro') }),
  );
  return tokenDelAparato(dentro.turno, llave);
}

interface MesaDibujada {
  id: string;
  nombre: string;
  plazas: number;
  forma: string;
  x: number;
  y: number;
  ancho: number;
  fondo: number;
  estirada: boolean;
  giro: number;
  abierta: boolean;
}

interface ElPlanoParaDibujar {
  salas: {
    id: string;
    nombre: string;
    mesas: MesaDibujada[];
    cosas: {
      id: string;
      tipo: string;
      texto: string | null;
      x: number;
      ancho: number;
      giro: number;
    }[];
    conAlgoAbierto: boolean;
  }[];
}

async function elDibujo(token: string): Promise<ElPlanoParaDibujar> {
  return losDatos<ElPlanoParaDibujar>(await api.consultar(token, 'el_plano_del_local'));
}

async function laMesa(token: string, nombre: string): Promise<MesaDibujada> {
  const mesa = (await elDibujo(token)).salas
    .flatMap((s) => s.mesas)
    .find((m) => m.nombre === nombre);
  if (mesa === undefined) throw new Error(`No está la mesa ${nombre}`);
  return mesa;
}

let salon: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  barCentro = await base.localPorCodigo('bar-centro');
  saraId = await base.personaPorCorreo(SARA);
  rosaId = await base.personaPorCorreo(ROSA);
  // La caja, con el correo de Rosa; la tablet de la sala y el móvil de Sara, con su código.
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
  const rosa = await enElAparato(llaveDeLaCaja, ROSA);
  const codigo = async (que: Record<string, unknown>) =>
    losDatos<{ codigo: string }>(await api.ejecutar(rosa, 'sacar_codigo_para_vincular', que))
      .codigo;
  llaveDeLaTablet = losDatos<{ llave: string }>(
    await api.ejecutar(null, 'vincular_con_codigo', {
      codigo: await codigo({ funcion: 'comandero', nombre: 'Tablet' }),
    }),
  ).llave;
  llaveDelMovil = losDatos<{ llave: string }>(
    await api.ejecutar(null, 'vincular_con_codigo', {
      codigo: await codigo({ funcion: 'comandero', nombre: 'Móvil de Sara', persona_id: saraId }),
    }),
  ).llave;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('Rosa dibuja el salón en la caja, a ojo', () => {
  it('una mesa de 6 nace más grande que una de 2, y cada nueva con el número siguiente', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    salon = losDatos<{ zonaId: string }>(
      await api.ejecutar(rosa, 'crear_zona_de_sala', { nombre: 'Salón' }),
    ).zonaId;
    const de2 = losDatos<{ nombre: string }>(
      await api.ejecutar(rosa, 'crear_mesa', { zona_id: salon, plazas: 2, x: 60, y: 60 }),
    );
    const de6 = losDatos<{ nombre: string }>(
      await api.ejecutar(rosa, 'crear_mesa', { zona_id: salon, plazas: 6, x: 300, y: 60 }),
    );
    expect([de2.nombre, de6.nombre]).toEqual(['1', '2']);
    const pequena = await laMesa(rosa, '1');
    const grande = await laMesa(rosa, '2');
    expect(grande.ancho * grande.fondo).toBeGreaterThan(pequena.ancho * pequena.fondo);
    expect(grande.estirada).toBe(false);
  });

  it('se estira, se gira y vuelve al tamaño de sus plazas', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const mesa = await laMesa(rosa, '2');
    losDatos(
      await api.ejecutar(rosa, 'colocar_en_el_plano', {
        cosas: [{ mesa_id: mesa.id, x: mesa.x, y: mesa.y, ancho: mesa.ancho + 60, giro: 45 }],
      }),
    );
    const estirada = await laMesa(rosa, '2');
    expect(estirada).toMatchObject({ ancho: mesa.ancho + 60, giro: 45, estirada: true });

    losDatos(
      await api.ejecutar(rosa, 'cambiar_mesa', { mesa_id: mesa.id, ancho: null, fondo: null }),
    );
    expect(await laMesa(rosa, '2')).toMatchObject({ ancho: mesa.ancho, estirada: false });

    // Al cambiar sus plazas, crece sola.
    losDatos(
      await api.ejecutar(rosa, 'cambiar_mesa', {
        mesa_id: mesa.id,
        plazas: 10,
        forma: 'rectangular',
      }),
    );
    const de10 = await laMesa(rosa, '2');
    expect(de10.forma).toBe('rectangular');
    expect(de10.ancho).toBeGreaterThan(mesa.ancho);
  });

  it('la barra, una pared y un texto; y varias se mueven a la vez', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const barra = losDatos<{ cosaId: string }>(
      await api.ejecutar(rosa, 'crear_cosa_de_la_sala', {
        zona_id: salon,
        tipo: 'barra',
        x: 60,
        y: 700,
      }),
    ).cosaId;
    losDatos(
      await api.ejecutar(rosa, 'crear_cosa_de_la_sala', {
        zona_id: salon,
        tipo: 'pared',
        x: 0,
        y: 0,
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'crear_cosa_de_la_sala', {
        zona_id: salon,
        tipo: 'texto',
        texto: 'Zona ventanas',
        x: 600,
        y: 600,
      }),
    );
    const antes = await elDibujo(rosa);
    const sala = antes.salas.find((s) => s.id === salon);
    expect(sala?.cosas.map((c) => c.tipo).sort()).toEqual(['barra', 'pared', 'texto']);
    expect(sala?.cosas.find((c) => c.tipo === 'texto')?.texto).toBe('Zona ventanas');

    const m1 = await laMesa(rosa, '1');
    losDatos(
      await api.ejecutar(rosa, 'colocar_en_el_plano', {
        cosas: [
          { mesa_id: m1.id, x: m1.x + 100, y: m1.y },
          { cosa_id: barra, x: 160, y: 700 },
        ],
      }),
    );
    const despues = await elDibujo(rosa);
    expect(despues.salas[0]?.mesas.find((m) => m.id === m1.id)?.x).toBe(m1.x + 100);
    expect(despues.salas[0]?.cosas.find((c) => c.id === barra)?.x).toBe(160);
  });

  it('lo puesto en la esquina no se sale del plano', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const mesa = await laMesa(rosa, '1');
    losDatos(
      await api.ejecutar(rosa, 'colocar_en_el_plano', {
        cosas: [{ mesa_id: mesa.id, x: 1000, y: 1000 }],
      }),
    );
    const puesta = await laMesa(rosa, '1');
    expect(puesta.x + puesta.ancho).toBeLessThanOrEqual(1000);
    expect(puesta.y + puesta.fondo).toBeLessThanOrEqual(1000);
  });

  it('una plantilla monta la terraza entera, con sus mesas detrás de las que hay', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const hecha = losDatos<{ zonaId: string; mesas: number }>(
      await api.ejecutar(rosa, 'empezar_con_una_plantilla', { plantilla: 'terraza' }),
    );
    expect(hecha.mesas).toBe(8);
    const terraza = (await elDibujo(rosa)).salas.find((s) => s.id === hecha.zonaId);
    expect(terraza?.nombre).toBe('Terraza');
    expect(terraza?.mesas.map((m) => m.nombre)).toContain('3');
    expect(terraza?.cosas.length).toBeGreaterThan(0);
  });

  it('las salas se ordenan', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const salas = (await elDibujo(rosa)).salas.map((s) => s.id);
    losDatos(await api.ejecutar(rosa, 'ordenar_las_salas', { zonas: [...salas].reverse() }));
    expect((await elDibujo(rosa)).salas.map((s) => s.id)).toEqual([...salas].reverse());
  });
});

describe('quién dibuja', () => {
  it('la camarera no; el móvil de nadie tampoco; ni Estook con su sesión', async () => {
    const sara = await enElAparato(llaveDeLaTablet, SARA);
    expect(elFallo(await api.ejecutar(sara, 'crear_mesa', { zona_id: salon }))).toBe('sin_permiso');
    // El móvil de Sara es suyo, y aunque teclease la gerente no se dibuja en un móvil.
    const enElMovil = await enElAparato(llaveDelMovil, SARA);
    expect(elFallo(await api.consultar(enElMovil, 'el_plano_del_local'))).toBe('sin_permiso');
    const rosaEnEstook = await api.entrar(ROSA);
    expect(elFallo(await api.ejecutar(rosaEnEstook, 'crear_mesa', { zona_id: salon }))).toBe(
      'sin_permiso',
    );
  });

  it('el plano del servicio trae lo dibujado, y el lápiz solo para quien dibuja', async () => {
    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    const deRosa = losDatos<{
      puedeDibujar: boolean;
      zonas: {
        id: string;
        mesas: { forma: string; ancho: number; giro: number }[];
        cosas: unknown[];
      }[];
    }>(await api.consultar(rosa, 'el_plano'));
    expect(deRosa.puedeDibujar).toBe(true);
    const elSalon = deRosa.zonas.find((z) => z.id === salon);
    expect(elSalon?.cosas.length).toBe(3);
    expect(elSalon?.mesas.some((m) => m.forma === 'rectangular')).toBe(true);
    const sara = await enElAparato(llaveDeLaTablet, SARA);
    expect(
      losDatos<{ puedeDibujar: boolean }>(await api.consultar(sara, 'el_plano')).puedeDibujar,
    ).toBe(false);
  });
});

describe('en pleno servicio', () => {
  let cuenta: string;

  it('mover una mesa abierta no toca su cuenta; quitarla, ni su sala, no se puede', async () => {
    const sara = await enElAparato(llaveDeLaTablet, SARA);
    const mesa = await laMesa(await enElAparato(llaveDeLaCaja, ROSA), '1');
    cuenta = crypto.randomUUID();
    losDatos(
      await api.ejecutar(sara, 'abrir_mesa', {
        cuenta_id: cuenta,
        tipo: 'mesa',
        mesa_id: mesa.id,
        personas: 2,
      }),
    );

    const rosa = await enElAparato(llaveDeLaCaja, ROSA);
    expect((await laMesa(rosa, '1')).abierta).toBe(true);
    losDatos(
      await api.ejecutar(rosa, 'colocar_en_el_plano', {
        cosas: [{ mesa_id: mesa.id, x: 500, y: 300 }],
      }),
    );
    const sigue = losDatos<{ abierta: boolean; mesaId: string | null }>(
      await api.consultar(await enElAparato(llaveDeLaTablet, SARA), 'la_mesa', {
        cuenta_id: cuenta,
      }),
    );
    expect(sigue).toMatchObject({ abierta: true, mesaId: mesa.id });

    const rosaOtraVez = await enElAparato(llaveDeLaCaja, ROSA);
    expect(elFallo(await api.ejecutar(rosaOtraVez, 'archivar_mesa', { mesa_id: mesa.id }))).toBe(
      'ya_hecho',
    );
    expect(
      elFallo(await api.ejecutar(rosaOtraVez, 'archivar_zona_de_sala', { zona_id: salon })),
    ).toBe('ya_hecho');
    expect((await elDibujo(rosaOtraVez)).salas.find((s) => s.id === salon)?.conAlgoAbierto).toBe(
      true,
    );
  });

  it('todas las mesas a la vista de todos: Rosa se queda la de Sara', async () => {
    const rosa = await enElAparato(llaveDeLaTablet, ROSA);
    const plano = losDatos<{
      zonas: {
        mesas: { cuenta: { cuentaId: string; iniciales: string | null; esMia: boolean } | null }[];
      }[];
    }>(await api.consultar(rosa, 'el_plano'));
    const suya = plano.zonas.flatMap((z) => z.mesas).find((m) => m.cuenta?.cuentaId === cuenta);
    expect(suya?.cuenta).toMatchObject({ iniciales: 'SA', esMia: false });

    losDatos(
      await api.ejecutar(rosa, 'pasar_a_otro_camarero', {
        cuenta_ids: [cuenta],
        camarero_id: rosaId,
      }),
    );
    const ahora = losDatos<{
      zonas: { mesas: { cuenta: { cuentaId: string; esMia: boolean } | null }[] }[];
    }>(await api.consultar(rosa, 'el_plano'));
    expect(
      ahora.zonas.flatMap((z) => z.mesas).find((m) => m.cuenta?.cuentaId === cuenta)?.cuenta?.esMia,
    ).toBe(true);
  });

  it('y una camarera también se queda una que no es suya (0107: el control de toda la sala)', async () => {
    const sara = await enElAparato(llaveDeLaTablet, SARA);
    losDatos(
      await api.ejecutar(sara, 'pasar_a_otro_camarero', {
        cuenta_ids: [cuenta],
        camarero_id: saraId,
      }),
    );
  });

  it('la mesa de quien ha fichado la salida lo dice en el plano', async () => {
    // Sara ficha la entrada y la salida desde su móvil, en Estook: sus mesas se quedan a su
    // nombre hasta que alguien se las quede.
    const saraEnEstook = await api.entrar(SARA);
    losDatos(await api.ejecutar(saraEnEstook, 'fichar_entrada', { sin_donde: 'sin_senal' }));
    losDatos(await api.ejecutar(saraEnEstook, 'fichar_salida', { sin_donde: 'sin_senal' }));
    const rosa = await enElAparato(llaveDeLaTablet, ROSA);
    const plano = losDatos<{
      zonas: { mesas: { cuenta: { cuentaId: string; suCamareroSeHaIdo: boolean } | null }[] }[];
    }>(await api.consultar(rosa, 'el_plano'));
    expect(
      plano.zonas.flatMap((z) => z.mesas).find((m) => m.cuenta?.cuentaId === cuenta)?.cuenta
        ?.suCamareroSeHaIdo,
    ).toBe(true);
  });
});
