import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M20A · 1 · 1 · La sala y la cocina (decisión 0106, migración 0081), contra una base de
 * verdad y como cada persona. Se juega **la mesa 6 entera**, de principio a fin, como en
 * un servicio:
 *
 *   · Rosa dibuja el plano; Sara abre la 6 para cuatro
 *   · **primero las bebidas**, a la barra; luego la comida: dos de carta y dos menús,
 *     el 1.º y el 2.º, con la nota del entrecot
 *   · al mandar sale el 1.º y **el 2.º espera**; la cocina lo ve sin un euro
 *   · Marcos tacha el 1.º y a Sara le llega «toca marchar»; **marcha Sara, nunca Marcos**
 *   · lo pedido tarde llega NUEVO; la nota cambiada, CAMBIO; lo quitado, ANULADO, y solo
 *     lo quita un jefe con motivo; lo devuelto, VUELVE
 *   · «Fuera», «Recuperar» y «Todo fuera»; los postres del final salen solos
 *   · pasar la mesa a otro camarero, cambiarla de mesa, juntarla y liberarla
 *   · anular una mesa: la cocina la ve anulada, no desaparece sin más
 *   · «todo junto», la barra y lo que la base no deja aunque alguien se salte la API
 *   · Luis, de otro negocio, no ve ni toca nada
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const alSegundo = alSegundoDeMentira();

/** Martes 20-oct-2026, a las 14:00 en Madrid: en pleno servicio de comidas. */
let reloj = new Date('2026-10-20T12:00:00Z');
const HOY = '2026-10-20';
function pasan(minutos: number): void {
  reloj = new Date(reloj.getTime() + minutos * 60_000);
}

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: dibuja el plano, quita y anula
const SARA = 'sara@ejemplo.estook.com'; // camarera: toma nota y marcha
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: ve la cocina y tacha
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let marcos: string;
let luis: string;
// Desde T1 (0107) la sala solo se lleva desde un aparato vinculado, con el PIN de cada
// uno: la caja (Rosa), la tablet de la sala (Sara) y la del pase (Marcos).
let rosaTpv: string;
let saraTpv: string;
let marcosTpv: string;

const plato: Record<string, string> = {};
const mesa: Record<string, string> = {};
let menuDelDia: string;

interface Plano {
  zonas: {
    id: string;
    nombre: string;
    mesas: {
      id: string;
      nombre: string;
      estado: string;
      cuenta: {
        cuentaId: string;
        titulo: string;
        personas: number | null;
        camarero: string | null;
        esMia: boolean;
        totalCentimos: number;
        porPases: boolean;
        notaParaCocina: string | null;
        loSiguiente: { que: string; pase?: number };
      } | null;
    }[];
  }[];
  sinMesa: { cuentaId: string; titulo: string }[];
  tocaMarchar: { cuentaId: string; titulo: string; pase: number; salioEl: number }[];
  camareros: { id: string; nombre: string }[];
}

interface Mesa {
  cuentaId: string;
  titulo: string;
  personas: number | null;
  camarero: string | null;
  porPases: boolean;
  abierta: boolean;
  totalCentimos: number;
  platos: {
    id: string;
    nombre: string;
    cantidad: number;
    precioCentimos: number;
    destino: string;
    pase: number | null;
    nota: string | null;
    estado: string;
    motivoDeQuitar: string | null;
    vuelve: string | null;
  }[];
  pases: { numero: number; marchadoEn: string | null; haSalido: boolean }[];
  loSiguiente: { que: string; pase?: number };
}

interface PlatoEnCocina {
  id: string;
  nombre: string;
  cantidad: number;
  nota: string | null;
  delMenu: boolean;
  salioEn: string | null;
  nuevo: boolean;
  cambio: boolean;
  anulado: boolean;
  vuelve: string | null;
}
interface Tarjeta {
  cuentaId: string;
  titulo: string;
  personas: number | null;
  estado: string;
  anulada: string | null;
  ultimaMarcha: string | null;
  pases: { numero: number; marchadoEn: string | null; platos: PlatoEnCocina[] }[];
}
interface Cocina {
  enMarcha: Tarjeta[];
  esperando: Tarjeta[];
  fuera: Tarjeta[];
}

const elPlano = async (token: string) => losDatos<Plano>(await api.consultar(token, 'el_plano'));
const laMesa = async (cuentaId: string, token = saraTpv) =>
  losDatos<Mesa>(await api.consultar(token, 'la_mesa', { cuenta_id: cuentaId }));
const laCocina = async (token = marcos) =>
  losDatos<Cocina>(await api.consultar(token, 'la_cocina'));

function laMesaDelPlano(plano: Plano, nombre: string) {
  const encontrada = plano.zonas.flatMap((z) => z.mesas).find((m) => m.nombre === nombre);
  if (encontrada === undefined) throw new Error(`sin la mesa ${nombre}`);
  return encontrada;
}

/** Dónde está una cuenta en la cocina, y su tarjeta. */
function enCocina(cocina: Cocina, cuentaId: string): [keyof Cocina, Tarjeta] | null {
  for (const pestana of ['enMarcha', 'esperando', 'fuera'] as const) {
    const tarjeta = cocina[pestana].find((t) => t.cuentaId === cuentaId);
    if (tarjeta !== undefined) return [pestana, tarjeta];
  }
  return null;
}

function elPlatoEnCocina(tarjeta: Tarjeta | undefined, lineaId: string): PlatoEnCocina {
  const encontrado = tarjeta?.pases.flatMap((p) => p.platos).find((p) => p.id === lineaId);
  if (encontrado === undefined) throw new Error(`sin el plato ${lineaId} en cocina`);
  return encontrado;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { alSegundo, ahora: () => reloj });
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
  luis = await api.entrar(LUIS);

  // Los aparatos del local: la caja, vinculada con el correo de Rosa (en otra sesión,
  // que se cierra al vincular), y dos tablets con su código. Cada uno entra con su PIN.
  const enUnAparato = async (llave: string, correo: string) =>
    tokenDelAparato(
      losDatos<{ turno: string }>(
        await api.ejecutar(null, 'entrar_con_pin', {
          llave,
          pin: base.pinDe(correo, 'bar-centro'),
        }),
      ).turno,
      llave,
    );
  const laCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: await base.localPorCodigo('bar-centro'),
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
  rosaTpv = await enUnAparato(laCaja, ROSA);
  const unaTablet = async (nombre: string) => {
    const { codigo } = losDatos<{ codigo: string }>(
      await api.ejecutar(rosaTpv, 'sacar_codigo_para_vincular', { funcion: 'comandero', nombre }),
    );
    return losDatos<{ llave: string }>(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))
      .llave;
  };
  saraTpv = await enUnAparato(await unaTablet('Tablet de la sala'), SARA);
  marcosTpv = await enUnAparato(await unaTablet('Tablet del pase'), MARCOS);

  // La carta de Bar Centro.
  for (const [seccion, platos] of [
    [
      'Entrantes',
      [
        ['Croquetas', 900],
        ['Ensalada', 800],
      ],
    ],
    [
      'Principales',
      [
        ['Entrecot', 2200],
        ['Pollo asado', 1200],
      ],
    ],
    ['Postres', [['Tarta de queso', 600]]],
    [
      'Bebidas',
      [
        ['Caña', 250],
        ['Agua', 200],
      ],
    ],
  ] as const) {
    const seccionId = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: seccion }),
    ).seccionId;
    const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: seccionId,
        platos: platos.map(([nombre, precio_centimos]) => ({ nombre, precio_centimos })),
      }),
    );
    for (const p of hechos.creados) plato[p.nombre] = p.platoId;
  }

  // El menú del día de hoy, a 13,50 €: lentejas de primero; pollo o entrecot (+4 €).
  losDatos(await api.ejecutar(rosa, 'sirve_menus', { sirve: true }));
  const menus = losDatos<{
    menus: {
      id: string;
      clase: string;
      version: number;
      secciones: { id: string; nombre: string }[];
    }[];
  }>(await api.consultar(rosa, 'mis_menus'));
  const delDia = menus.menus.find((m) => m.clase === 'del_dia');
  if (delDia === undefined) throw new Error('sin menú del día');
  menuDelDia = delDia.id;
  losDatos(
    await api.ejecutar(rosa, 'cambiar_menu', {
      menu_id: delDia.id,
      version: delDia.version,
      precio_centimos: 1350,
    }),
  );
  const seccion = (nombre: string) => delDia.secciones.find((s) => s.nombre === nombre)?.id;
  plato['Lentejas'] = losDatos<{ platoId: string }>(
    await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
      menu_id: delDia.id,
      fecha: HOY,
      seccion_id: seccion('Primeros'),
      nuevo: 'Lentejas',
    }),
  ).platoId;
  for (const [nombre, suplemento] of [
    ['Pollo asado', 0],
    ['Entrecot', 400],
  ] as const) {
    losDatos(
      await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
        menu_id: delDia.id,
        fecha: HOY,
        seccion_id: seccion('Segundos'),
        plato_id: plato[nombre],
        suplemento_centimos: suplemento,
      }),
    );
  }

  // El tema al segundo de cada uno, como lo pide su pantalla.
  for (const token of [rosa, sara, marcos])
    losDatos(await api.ejecutar(token, 'abrir_el_chat', {}));
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ═══ El plano ═════════════════════════════════════════════════════════════════

describe('el plano lo dibuja quien lleva el local', () => {
  it('la camarera no lo dibuja', async () => {
    expect(elFallo(await api.ejecutar(sara, 'crear_zona_de_sala', { nombre: 'Salón' }))).toBe(
      'sin_permiso',
    );
  });

  it('Rosa dibuja el salón y la terraza, con sus mesas; un nombre repetido no entra', async () => {
    const salon = losDatos<{ zonaId: string }>(
      await api.ejecutar(rosa, 'crear_zona_de_sala', { nombre: 'Salón' }),
    ).zonaId;
    const terraza = losDatos<{ zonaId: string }>(
      await api.ejecutar(rosa, 'crear_zona_de_sala', { nombre: 'Terraza' }),
    ).zonaId;
    expect(elFallo(await api.ejecutar(rosa, 'crear_zona_de_sala', { nombre: 'salon' }))).toBe(
      'faltan_datos',
    );
    for (const [zona, nombre, x] of [
      [salon, '5', 100],
      [salon, '6', 300],
      [salon, '7', 500],
      [salon, '8', 700],
      [terraza, 'T1', 100],
    ] as const) {
      mesa[nombre] = losDatos<{ mesaId: string }>(
        await api.ejecutar(rosa, 'crear_mesa', { zona_id: zona, nombre, x, y: 200 }),
      ).mesaId;
    }
    expect(elFallo(await api.ejecutar(rosa, 'crear_mesa', { zona_id: salon, nombre: '6' }))).toBe(
      'faltan_datos',
    );
    losDatos(
      await api.ejecutar(rosa, 'cambiar_mesa', { mesa_id: mesa['5'], plazas: 2, forma: 'redonda' }),
    );
  });

  it('la sala lo ve con cada mesa libre; la cocina no lo ve', async () => {
    const plano = await elPlano(saraTpv);
    expect(plano.zonas.map((z) => [z.nombre, z.mesas.map((m) => m.nombre)])).toEqual([
      ['Salón', ['5', '6', '7', '8']],
      ['Terraza', ['T1']],
    ]);
    expect(plano.zonas.flatMap((z) => z.mesas).every((m) => m.estado === 'libre')).toBe(true);
    // A quién se le pueden pasar las mesas: quien toma nota, y no la cocina.
    expect(plano.camareros.map((c) => c.nombre)).toEqual(['Rosa', 'Sara']);
    expect(elFallo(await api.consultar(marcosTpv, 'el_plano'))).toBe('sin_permiso');
  });

  it('Ajustes › Sala lo lee para dibujarlo; la camarera no', async () => {
    const plano = losDatos<{
      puedeEditar: boolean;
      zonas: { nombre: string; mesas: { nombre: string; plazas: number; forma: string }[] }[];
    }>(await api.consultar(rosa, 'el_plano_del_local'));
    expect(plano.puedeEditar).toBe(true);
    expect(plano.zonas[0]?.mesas.find((m) => m.nombre === '5')).toMatchObject({
      plazas: 2,
      forma: 'redonda',
    });
    expect(elFallo(await api.consultar(sara, 'el_plano_del_local'))).toBe('sin_permiso');
  });

  it('una mesa que sobra se archiva', async () => {
    losDatos(await api.ejecutar(rosa, 'archivar_mesa', { mesa_id: mesa['8'] }));
    const plano = await elPlano(saraTpv);
    expect(plano.zonas[0]?.mesas.map((m) => m.nombre)).toEqual(['5', '6', '7']);
  });
});

// ═══ Lo que se pide ═════════════════════════════════════════════════════════════

interface LaCartaDeLaSala {
  hoy: string;
  secciones: {
    id: string | null;
    nombre: string;
    esBebida: boolean;
    platos: { id: string; nombre: string; precioCentimos: number; agotado: boolean }[];
  }[];
  menus: {
    id: string;
    nombre: string;
    precioCentimos: number;
    secciones: {
      nombre: string;
      esPostre: boolean;
      esBebida: boolean;
      pase: number | null;
      platos: { platoId: string; nombre: string; suplementoCentimos: number }[];
    }[];
  }[];
}

describe('lo que se pide: la carta de la sala y el menú de hoy', () => {
  it('la carta por secciones, con las de bebidas marcadas solas por su nombre', async () => {
    const carta = losDatos<LaCartaDeLaSala>(await api.consultar(saraTpv, 'la_carta_de_la_sala'));
    expect(carta.hoy).toBe(HOY);
    expect(carta.secciones.map((s) => [s.nombre, s.esBebida])).toEqual([
      ['Entrantes', false],
      ['Principales', false],
      ['Postres', false],
      ['Bebidas', true],
    ]);
    // Las lentejas nacieron en el menú: no se piden sueltas.
    const nombres = carta.secciones.flatMap((s) => s.platos.map((p) => p.nombre));
    expect(nombres).not.toContain('Lentejas');
    expect(carta.secciones[1]?.platos.map((p) => [p.nombre, p.precioCentimos])).toEqual([
      ['Entrecot', 2200],
      ['Pollo asado', 1200],
    ]);
    // Y la cocina no la lee: no ve un euro.
    expect(elFallo(await api.consultar(marcosTpv, 'la_carta_de_la_sala'))).toBe('sin_permiso');
  });

  it('el menú de hoy, con el pase de cada sección: primeros el 1.º, segundos el 2.º', async () => {
    const carta = losDatos<LaCartaDeLaSala>(await api.consultar(saraTpv, 'la_carta_de_la_sala'));
    const menu = carta.menus[0];
    expect(menu).toMatchObject({ id: menuDelDia, nombre: 'Menú del día', precioCentimos: 1350 });
    expect(menu?.secciones.map((s) => [s.nombre, s.pase, s.esBebida])).toEqual([
      ['Primeros', 1, false],
      ['Segundos', 2, false],
      ['Bebida', null, true],
    ]);
    expect(menu?.secciones[1]?.platos.map((p) => [p.nombre, p.suplementoCentimos])).toEqual([
      ['Pollo asado', 0],
      ['Entrecot', 400],
    ]);
  });

  it('una sección nueva «Vinos» nace de bebidas, y se cambia con un toque', async () => {
    const vinos = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Vinos' }),
    ).seccionId;
    const leer = async () =>
      losDatos<{ secciones: { id: string; esBebida: boolean }[] }>(
        await api.consultar(rosa, 'mi_carta'),
      ).secciones.find((s) => s.id === vinos)?.esBebida;
    expect(await leer()).toBe(true);
    losDatos(await api.ejecutar(rosa, 'cambiar_seccion', { seccion_id: vinos, es_bebida: false }));
    expect(await leer()).toBe(false);
    losDatos(await api.ejecutar(rosa, 'cambiar_seccion', { seccion_id: vinos, es_bebida: true }));
    expect(await leer()).toBe(true);
    expect(
      elFallo(await api.ejecutar(sara, 'cambiar_seccion', { seccion_id: vinos, es_bebida: false })),
    ).toBe('sin_permiso');
  });

  it('lo que no está hoy en el menú no entra en el menú, ni lo del menú se pide suelto', async () => {
    const cuenta = crypto.randomUUID();
    const menu = crypto.randomUUID();
    losDatos(await api.ejecutar(saraTpv, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pedir', {
          cuenta_id: cuenta,
          platos: [
            { id: menu, menu_id: menuDelDia },
            { id: crypto.randomUUID(), plato_id: plato['Croquetas'], parte_de: menu, pase: 1 },
          ],
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pedir', {
          cuenta_id: cuenta,
          platos: [{ id: crypto.randomUUID(), plato_id: plato['Lentejas'], pase: 1 }],
        }),
      ),
    ).toBe('faltan_datos');
    // La caña, sin decir a dónde va: a la barra, porque su sección es de bebidas.
    const cana = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: cuenta,
        platos: [{ id: cana, plato_id: plato['Caña'] }],
      }),
    );
    const lamesa = losDatos<{ platos: { id: string; destino: string; pase: number | null }[] }>(
      await api.consultar(saraTpv, 'la_mesa', { cuenta_id: cuenta }),
    );
    expect(lamesa.platos.find((p) => p.id === cana)).toMatchObject({
      destino: 'barra',
      pase: null,
    });
    losDatos(
      await api.ejecutar(rosaTpv, 'anular_mesa', { cuenta_id: cuenta, motivo: 'era una prueba' }),
    );
  });
});

// ═══ La mesa 6, de principio a fin ═════════════════════════════════════════════

describe('la mesa 6, de principio a fin', () => {
  const seis = crypto.randomUUID();
  const l = {
    cana: crypto.randomUUID(),
    agua: crypto.randomUUID(),
    croquetas: crypto.randomUUID(),
    ensalada: crypto.randomUUID(),
    entrecot: crypto.randomUUID(),
    menu1: crypto.randomUUID(),
    lentejas1: crypto.randomUUID(),
    entrecotMenu: crypto.randomUUID(),
    menu2: crypto.randomUUID(),
    lentejas2: crypto.randomUUID(),
    pollo: crypto.randomUUID(),
    croquetasTarde: crypto.randomUUID(),
    tarta: crypto.randomUUID(),
  };

  it('Sara la abre para cuatro; abrirla dos veces no abre dos', async () => {
    const abierta = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: seis,
        mesa_id: mesa['6'],
        personas: 4,
      }),
    );
    expect(abierta.yaEstaba).toBe(false);
    const otraVez = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: seis,
        mesa_id: mesa['6'],
        personas: 4,
      }),
    );
    expect(otraVez.yaEstaba).toBe(true);
    // Desde otro aparato, la misma mesa: ya está abierta.
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'abrir_mesa', {
          cuenta_id: crypto.randomUUID(),
          mesa_id: mesa['6'],
        }),
      ),
    ).toBe('ya_hecho');

    const seisEnElPlano = laMesaDelPlano(await elPlano(saraTpv), '6');
    expect(seisEnElPlano.estado).toBe('sin_pedir');
    expect(seisEnElPlano.cuenta).toMatchObject({
      titulo: 'Mesa 6',
      personas: 4,
      camarero: 'Sara',
      esMia: true,
      loSiguiente: { que: 'pedir' },
    });
    expect(laMesaDelPlano(await elPlano(rosaTpv), '6').cuenta?.esMia).toBe(false);
  });

  it('primero las bebidas: van a la barra, y la cocina no ve nada', async () => {
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: seis,
        platos: [
          { id: l.cana, plato_id: plato['Caña'], cantidad: 2, destino: 'barra' },
          { id: l.agua, plato_id: plato['Agua'], destino: 'barra' },
        ],
      }),
    );
    expect(laMesaDelPlano(await elPlano(saraTpv), '6').estado).toBe('por_mandar');
    const mandado = losDatos<{ aCocina: number; aLaBarra: number; salen: number[] }>(
      await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
    );
    expect(mandado).toEqual({ aCocina: 0, aLaBarra: 2, salen: [], esperan: [] });
    expect(enCocina(await laCocina(), seis)).toBeNull();
    expect((await laMesa(seis)).platos.map((p) => p.estado)).toEqual([
      'en_la_barra',
      'en_la_barra',
    ]);
  });

  it('la comida: dos de carta y dos menús, con su 1.º y su 2.º y la nota del entrecot', async () => {
    pasan(5);
    const comanda = {
      cuenta_id: seis,
      platos: [
        { id: l.croquetas, plato_id: plato['Croquetas'], pase: 1 },
        { id: l.ensalada, plato_id: plato['Ensalada'], pase: 1 },
        { id: l.entrecot, plato_id: plato['Entrecot'], pase: 2, nota: 'poco hecho' },
        { id: l.menu1, menu_id: menuDelDia },
        { id: l.lentejas1, plato_id: plato['Lentejas'], parte_de: l.menu1, pase: 1 },
        { id: l.entrecotMenu, plato_id: plato['Entrecot'], parte_de: l.menu1, pase: 2 },
        { id: l.menu2, menu_id: menuDelDia },
        { id: l.lentejas2, plato_id: plato['Lentejas'], parte_de: l.menu2, pase: 1 },
        { id: l.pollo, plato_id: plato['Pollo asado'], parte_de: l.menu2, pase: 2 },
      ],
    };
    expect(losDatos(await api.ejecutar(saraTpv, 'pedir', comanda))).toEqual({
      pedidos: 9,
      yaEstaban: 0,
    });
    // El mismo toque otra vez (la red se cortó): no pide dos veces.
    expect(losDatos(await api.ejecutar(saraTpv, 'pedir', comanda))).toEqual({
      pedidos: 0,
      yaEstaban: 9,
    });

    const lamesa = await laMesa(seis);
    const precio = (id: string) => lamesa.platos.find((p) => p.id === id)?.precioCentimos;
    // La carta, a su precio; el menú, a 13,50 €, y sus platos solo con su suplemento.
    expect([precio(l.entrecot), precio(l.menu1), precio(l.entrecotMenu), precio(l.pollo)]).toEqual([
      2200, 1350, 400, 0,
    ]);
    expect(lamesa.platos.find((p) => p.id === l.menu1)?.destino).toBe('ninguno');
    expect(lamesa.totalCentimos).toBe(500 + 200 + 900 + 800 + 2200 + 1350 + 400 + 1350);
    expect(lamesa.loSiguiente).toEqual({ que: 'mandar' });
  });

  it('al mandar sale el 1.º y el 2.º espera a que lo marche la sala', async () => {
    const mandado = losDatos<{ aCocina: number; salen: number[]; esperan: number[] }>(
      await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
    );
    expect(mandado).toMatchObject({ aCocina: 7, aLaBarra: 0, salen: [1], esperan: [2] });
    // Mandar otra vez no manda nada.
    expect(
      losDatos<{ aCocina: number }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
      ).aCocina,
    ).toBe(0);
    const lamesa = await laMesa(seis);
    const estado = (id: string) => lamesa.platos.find((p) => p.id === id)?.estado;
    expect([estado(l.croquetas), estado(l.entrecot)]).toEqual(['en_marcha', 'en_espera']);
    expect(lamesa.loSiguiente).toEqual({ que: 'cobrar' });
    expect(laMesaDelPlano(await elPlano(saraTpv), '6').estado).toBe('comiendo');
  });

  it('la cocina ve la mesa entera, con el 2.º en espera, y ni un euro', async () => {
    const cocina = await laCocina();
    const [pestana, tarjeta] = enCocina(cocina, seis) ?? [];
    expect(pestana).toBe('enMarcha');
    expect(tarjeta).toMatchObject({ titulo: 'Mesa 6', personas: 4 });
    expect(tarjeta?.pases.map((p) => [p.numero, p.marchadoEn !== null, p.platos.length])).toEqual([
      [1, true, 4],
      [2, false, 3],
    ]);
    expect(elPlatoEnCocina(tarjeta, l.entrecot).nota).toBe('poco hecho');
    expect(elPlatoEnCocina(tarjeta, l.lentejas1).delMenu).toBe(true);
    expect(elPlatoEnCocina(tarjeta, l.croquetas).delMenu).toBe(false);
    // Ni el menú (que no se cocina) ni las bebidas (que van a la barra).
    const nombres = tarjeta?.pases.flatMap((p) => p.platos.map((x) => x.nombre));
    expect(nombres).not.toContain('Menú del día');
    expect(nombres).not.toContain('Caña');
    // Sin un solo importe, tampoco en la respuesta (Anexo 3.2).
    expect(JSON.stringify(cocina)).not.toMatch(/recio|entimos|otal/);
  });

  it('cada uno a lo suyo: la sala no ve la cocina y la cocina no ve la cuenta ni marcha', async () => {
    expect(elFallo(await api.consultar(sara, 'la_cocina'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcosTpv, 'la_mesa', { cuenta_id: seis }))).toBe(
      'sin_permiso',
    );
    expect(elFallo(await api.ejecutar(marcosTpv, 'marchar', { cuenta_id: seis, pase: 2 }))).toBe(
      'sin_permiso',
    );
    expect(elFallo(await api.ejecutar(sara, 'tachar', { linea_id: l.croquetas }))).toBe(
      'sin_permiso',
    );
    // Lo que espera no se tacha: lo marcha la sala cuando la mesa va acabando.
    expect(elFallo(await api.ejecutar(marcos, 'tachar', { linea_id: l.entrecot }))).toBe(
      'ya_hecho',
    );
  });

  it('Marcos tacha el 1.º; al tachar el último, a Sara le toca marchar el 2.º', async () => {
    pasan(12);
    for (const id of [l.croquetas, l.ensalada, l.lentejas1]) {
      expect(
        losDatos<{ paseFuera: boolean }>(await api.ejecutar(marcos, 'tachar', { linea_id: id }))
          .paseFuera,
      ).toBe(false);
    }
    expect((await elPlano(saraTpv)).tocaMarchar).toEqual([]);
    expect(elFallo(await api.ejecutar(marcos, 'tachar', { linea_id: l.croquetas }))).toBe(
      'ya_hecho',
    );

    alSegundo.toques.length = 0;
    expect(
      losDatos<{ paseFuera: boolean }>(
        await api.ejecutar(marcos, 'tachar', { linea_id: l.lentejas2 }),
      ).paseFuera,
    ).toBe(true);

    const plano = await elPlano(saraTpv);
    expect(plano.tocaMarchar).toEqual([{ cuentaId: seis, titulo: 'Mesa 6', pase: 2, salioEl: 1 }]);
    expect(laMesaDelPlano(plano, '6').estado).toBe('toca_marchar');
    expect((await laMesa(seis)).loSiguiente).toEqual({ que: 'marchar', pase: 2 });
    // La cocina la tiene esperando: no puede marchar, pero sabe que viene.
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('esperando');

    // El aviso llega al segundo a la sala y a la cocina, sin nada de la mesa dentro.
    const temas = await base.bd.query<{ correo: string; tema: string }>(
      `select p.correo, t.tema from estook.tema_al_segundo t join estook.persona p on p.id = t.persona_id`,
    );
    const tocados = alSegundo.toques.map((t) => t.tema);
    for (const correo of [SARA, MARCOS, ROSA]) {
      expect(tocados).toContain(temas.rows.find((t) => t.correo === correo)?.tema);
    }
    expect(new Set(alSegundo.toques.map((t) => t.canalId)).size).toBe(1);
    expect(alSegundo.toques[0]?.canalId).toMatch(/^servicio:/);
  });

  it('la base tampoco deja marchar a la cocina, ni tachar a la sala, ni reescribir lo mandado', async () => {
    const marcosId = await base.personaPorCorreo(MARCOS);
    const saraId = await base.personaPorCorreo(SARA);
    await expect(
      base.comoPersona(marcosId, () =>
        base.bd.query(
          `update estook.pase set marchado_en = now() where cuenta_id = $1 and numero = 2`,
          [seis],
        ),
      ),
    ).rejects.toThrow(/marchar es de la sala/);
    await expect(
      base.comoPersona(saraId, () =>
        base.bd.query(`update estook.linea_de_cuenta set salio_en = now() where id = $1`, [
          l.entrecot,
        ]),
      ),
    ).rejects.toThrow(/tachar lo que sale es de la cocina/);
    await expect(
      base.comoPersona(saraId, () =>
        base.bd.query(`update estook.linea_de_cuenta set precio_centimos = 1 where id = $1`, [
          l.entrecot,
        ]),
      ),
    ).rejects.toThrow(/linea_mandada/);
    await expect(
      base.comoPersona(saraId, () =>
        base.bd.query(
          `update estook.linea_de_cuenta
              set quitada_en = now(), quitada_por = $2, motivo_de_quitar = 'no lo quieren'
            where id = $1`,
          [l.entrecot, saraId],
        ),
      ),
    ).rejects.toThrow(/lo aprueba un jefe/);
    const borrado = await base.comoPersona(saraId, () =>
      base.bd.query(`delete from estook.linea_de_cuenta where id = $1`, [l.entrecot]),
    );
    expect(borrado.affectedRows ?? 0).toBe(0);
    expect((await laMesa(seis)).platos.some((p) => p.id === l.entrecot)).toBe(true);
  });

  it('pedir otro principal mientras el 2.º espera no lo marcha: lo marcha Sara', async () => {
    const otro = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: seis,
        platos: [{ id: otro, plato_id: plato['Pollo asado'], pase: 2 }],
      }),
    );
    expect(
      losDatos<{ salen: number[]; esperan: number[] }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
      ),
    ).toMatchObject({ aCocina: 1, salen: [], esperan: [2] });
    expect((await laMesa(seis)).loSiguiente).toEqual({ que: 'marchar', pase: 2 });
    // No era: se quita antes de que la cocina lo haga (lo quita un jefe, ya está mandado).
    losDatos(
      await api.ejecutar(rosaTpv, 'quitar_plato', { linea_id: otro, motivo: 'era para otra mesa' }),
    );
  });

  it('Sara marcha el 2.º; marcharlo otra vez no hace nada', async () => {
    pasan(3);
    expect(losDatos(await api.ejecutar(saraTpv, 'marchar', { cuenta_id: seis, pase: 2 }))).toEqual({
      pase: 2,
    });
    expect(elFallo(await api.ejecutar(saraTpv, 'marchar', { cuenta_id: seis, pase: 2 }))).toBe(
      'ya_hecho',
    );
    expect(elFallo(await api.ejecutar(saraTpv, 'marchar', { cuenta_id: seis, pase: 5 }))).toBe(
      'no_existe',
    );
    const [pestana, tarjeta] = enCocina(await laCocina(), seis) ?? [];
    expect(pestana).toBe('enMarcha');
    expect(tarjeta?.ultimaMarcha).not.toBeNull();
    expect((await elPlano(saraTpv)).tocaMarchar).toEqual([]);
  });

  it('lo pedido tarde llega NUEVO, y la nota cambiada, CAMBIO', async () => {
    pasan(2);
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: seis,
        platos: [{ id: l.croquetasTarde, plato_id: plato['Croquetas'], pase: 2 }],
      }),
    );
    // El 2.º ya está marchado: lo nuevo entra directo en marcha, sin esperar a nadie.
    expect(
      losDatos<{ salen: number[]; esperan: number[] }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
      ),
    ).toMatchObject({ aCocina: 1, salen: [], esperan: [] });

    losDatos(
      await api.ejecutar(saraTpv, 'cambiar_plato_de_la_mesa', {
        linea_id: l.entrecot,
        nota: 'al punto',
      }),
    );
    // Lo que está en cocina no cambia de cantidad: se quita con motivo y se pide otra vez.
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'cambiar_plato_de_la_mesa', {
          linea_id: l.entrecot,
          cantidad: 2,
        }),
      ),
    ).toBe('ya_hecho');

    const tarjeta = enCocina(await laCocina(), seis)?.[1];
    expect(elPlatoEnCocina(tarjeta, l.croquetasTarde)).toMatchObject({
      nuevo: true,
      cambio: false,
    });
    expect(elPlatoEnCocina(tarjeta, l.entrecot)).toMatchObject({
      nota: 'al punto',
      nuevo: false,
      cambio: true,
    });
  });

  it('lo que ya está en cocina lo quita un jefe, con motivo, y la cocina lo ve ANULADO', async () => {
    // Sara lo pide, y lo aprueba un encargado con su PIN en el mismo aparato (T1, 0107:
    // se prueba entero en `la-puerta.prueba.ts`). Sin el PIN, no se quita.
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'quitar_plato', { linea_id: l.pollo, motivo: 'se equivocó' }),
      ),
    ).toBe('lo_aprueba_un_encargado');
    expect(elFallo(await api.ejecutar(rosaTpv, 'quitar_plato', { linea_id: l.pollo }))).toBe(
      'faltan_datos',
    );
    expect(
      losDatos<{ borrado: boolean }>(
        await api.ejecutar(rosaTpv, 'quitar_plato', {
          linea_id: l.pollo,
          motivo: 'quería el entrecot, no el pollo',
        }),
      ).borrado,
    ).toBe(false);
    const tarjeta = enCocina(await laCocina(), seis)?.[1];
    expect(elPlatoEnCocina(tarjeta, l.pollo).anulado).toBe(true);
    const lamesa = await laMesa(seis);
    expect(lamesa.platos.find((p) => p.id === l.pollo)).toMatchObject({
      estado: 'quitado',
      motivoDeQuitar: 'quería el entrecot, no el pollo',
    });
    // Lo quitado ya no se toca, ni se tacha.
    expect(elFallo(await api.ejecutar(marcos, 'tachar', { linea_id: l.pollo }))).toBe('ya_hecho');
  });

  it('lo agotado no se pide', async () => {
    losDatos(
      await api.ejecutar(sara, 'marcar_agotado', {
        plato_id: plato['Tarta de queso'],
        hasta: 'jornada',
      }),
    );
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pedir', {
          cuenta_id: seis,
          platos: [{ id: crypto.randomUUID(), plato_id: plato['Tarta de queso'], pase: 3 }],
        }),
      ),
    ).toBe('faltan_datos');
    losDatos(await api.ejecutar(sara, 'quitar_agotado', { plato_id: plato['Tarta de queso'] }));
  });

  it('lo que no se ha mandado se quita sin más, y no deja rastro en cocina', async () => {
    const otraAgua = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: seis,
        platos: [{ id: otraAgua, plato_id: plato['Agua'], destino: 'barra' }],
      }),
    );
    expect(
      losDatos<{ borrado: boolean }>(
        await api.ejecutar(saraTpv, 'quitar_plato', { linea_id: otraAgua }),
      ).borrado,
    ).toBe(true);
    expect((await laMesa(seis)).platos.some((p) => p.id === otraAgua)).toBe(false);
    expect((await laMesa(seis)).loSiguiente.que).not.toBe('mandar');
  });

  it('sale el 2.º: la mesa se va a «Fuera»; «Recuperar» la devuelve y «Todo fuera» la saca', async () => {
    pasan(10);
    losDatos(await api.ejecutar(marcos, 'tachar', { linea_id: l.entrecot }));
    losDatos(await api.ejecutar(marcos, 'tachar', { linea_id: l.entrecotMenu }));
    pasan(1);
    expect(
      losDatos<{ paseFuera: boolean }>(
        await api.ejecutar(marcos, 'tachar', { linea_id: l.croquetasTarde }),
      ).paseFuera,
    ).toBe(true);
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('fuera');
    expect((await laMesa(seis)).loSiguiente).toEqual({ que: 'cobrar' });

    // Se tachó sin querer: vuelve lo último tachado, y la mesa a «En marcha».
    expect(
      losDatos<{ destachados: number }>(
        await api.ejecutar(marcos, 'recuperar', { cuenta_id: seis }),
      ).destachados,
    ).toBe(1);
    const tarjeta = enCocina(await laCocina(), seis);
    expect(tarjeta?.[0]).toBe('enMarcha');
    expect(elPlatoEnCocina(tarjeta?.[1], l.croquetasTarde).salioEn).toBeNull();
    expect(elPlatoEnCocina(tarjeta?.[1], l.entrecot).salioEn).not.toBeNull();

    expect(
      losDatos<{ tachados: number }>(await api.ejecutar(marcos, 'todo_fuera', { cuenta_id: seis }))
        .tachados,
    ).toBe(1);
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('fuera');
    expect(elFallo(await api.ejecutar(sara, 'todo_fuera', { cuenta_id: seis }))).toBe(
      'sin_permiso',
    );
  });

  it('un plato devuelto vuelve a cocina, arriba, con su motivo: VUELVE', async () => {
    pasan(4);
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'devolver_a_cocina', { linea_id: l.cana, motivo: 'caliente' }),
      ),
    ).toBe('ya_hecho');
    losDatos(
      await api.ejecutar(saraTpv, 'devolver_a_cocina', {
        linea_id: l.entrecot,
        motivo: 'más hecho',
      }),
    );
    const [pestana, tarjeta] = enCocina(await laCocina(), seis) ?? [];
    expect(pestana).toBe('enMarcha');
    expect(elPlatoEnCocina(tarjeta, l.entrecot)).toMatchObject({
      salioEn: null,
      vuelve: 'más hecho',
    });
    expect((await laMesa(seis)).platos.find((p) => p.id === l.entrecot)?.vuelve).toBe('más hecho');

    pasan(4);
    expect(
      losDatos<{ paseFuera: boolean }>(
        await api.ejecutar(marcos, 'tachar', { linea_id: l.entrecot }),
      ).paseFuera,
    ).toBe(true);
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('fuera');
  });

  it('los postres del final salen solos: el 1.º y el 2.º ya salieron', async () => {
    pasan(15);
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: seis,
        platos: [{ id: l.tarta, plato_id: plato['Tarta de queso'], cantidad: 2, pase: 3 }],
      }),
    );
    expect(
      losDatos<{ salen: number[]; esperan: number[] }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: seis }),
      ),
    ).toMatchObject({ aCocina: 1, salen: [3], esperan: [] });
    const [pestana, tarjeta] = enCocina(await laCocina(), seis) ?? [];
    expect(pestana).toBe('enMarcha');
    expect(elPlatoEnCocina(tarjeta, l.tarta)).toMatchObject({ cantidad: 2, nuevo: true });
    losDatos(await api.ejecutar(marcos, 'todo_fuera', { cuenta_id: seis }));
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('fuera');
  });

  it('Sara se va: pasa sus mesas a Rosa; las de otro no las pasa ella', async () => {
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pasar_a_otro_camarero', {
          cuenta_ids: [seis],
          camarero_id: await base.personaPorCorreo(MARCOS),
        }),
      ),
    ).toBe('no_existe');
    expect(
      losDatos(
        await api.ejecutar(saraTpv, 'pasar_a_otro_camarero', {
          cuenta_ids: [seis],
          camarero_id: await base.personaPorCorreo(ROSA),
        }),
      ),
    ).toEqual({ pasadas: 1 });
    expect((await laMesa(seis)).camarero).toBe('Rosa');
    expect(laMesaDelPlano(await elPlano(rosaTpv), '6').cuenta?.esMia).toBe(true);
    // Ya no es suya: no la pasa ella; un jefe sí.
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pasar_a_otro_camarero', {
          cuenta_ids: [seis],
          camarero_id: await base.personaPorCorreo(SARA),
        }),
      ),
    ).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(rosaTpv, 'pasar_a_otro_camarero', {
        cuenta_ids: [seis],
        camarero_id: await base.personaPorCorreo(SARA),
      }),
    );
    expect((await laMesa(seis)).camarero).toBe('Sara');
  });

  it('se cambian a la 7; a una mesa ocupada no se cambia', async () => {
    losDatos(
      await api.ejecutar(saraTpv, 'cambiar_de_mesa', { cuenta_id: seis, mesa_id: mesa['7'] }),
    );
    const plano = await elPlano(saraTpv);
    expect(laMesaDelPlano(plano, '6').estado).toBe('libre');
    expect(laMesaDelPlano(plano, '7').cuenta?.cuentaId).toBe(seis);
    expect((await laMesa(seis)).titulo).toBe('Mesa 7');

    const cinco = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: cinco,
        mesa_id: mesa['5'],
        personas: 2,
      }),
    );
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'cambiar_de_mesa', { cuenta_id: seis, mesa_id: mesa['5'] }),
      ),
    ).toBe('ya_hecho');
    // Una mesa abierta no se archiva.
    expect(elFallo(await api.ejecutar(rosa, 'archivar_mesa', { mesa_id: mesa['5'] }))).toBe(
      'ya_hecho',
    );

    // Los de la 5 se juntan con ellos: una cuenta, seis personas, la 5 libre.
    const canaDeLaCinco = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: cinco,
        platos: [{ id: canaDeLaCinco, plato_id: plato['Caña'], destino: 'barra' }],
      }),
    );
    losDatos(await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: cinco }));
    expect(
      elFallo(await api.ejecutar(saraTpv, 'juntar_mesas', { cuenta_id: seis, con: seis })),
    ).toBe('faltan_datos');
    losDatos(await api.ejecutar(saraTpv, 'juntar_mesas', { cuenta_id: seis, con: cinco }));
    const juntas = await laMesa(seis);
    expect(juntas.personas).toBe(6);
    expect(juntas.platos.some((p) => p.id === canaDeLaCinco)).toBe(true);
    expect((await laMesa(cinco)).abierta).toBe(false);
    expect(laMesaDelPlano(await elPlano(saraTpv), '5').estado).toBe('libre');
  });

  it('se van: la mesa queda libre, y la cocina la sigue teniendo en «Fuera» hoy', async () => {
    losDatos(await api.ejecutar(saraTpv, 'liberar_mesa', { cuenta_id: seis }));
    expect(laMesaDelPlano(await elPlano(saraTpv), '7').estado).toBe('libre');
    expect(enCocina(await laCocina(), seis)?.[0]).toBe('fuera');
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'pedir', {
          cuenta_id: seis,
          platos: [{ id: crypto.randomUUID(), plato_id: plato['Agua'], destino: 'barra' }],
        }),
      ),
    ).toBe('ya_hecho');
  });

  it('todo queda en lo que ha pasado, con quién', async () => {
    const { rows } = await base.bd.query<{ accion: string }>(
      `select accion from estook.auditoria where entidad = 'cuenta' and entidad_id = $1
        order by ocurrido_en, id`,
      [seis],
    );
    const acciones = new Set(rows.map((r) => r.accion));
    for (const accion of [
      'abrir_mesa',
      'pedir',
      'mandar_a_cocina',
      'tachar',
      'marchar',
      'cambiar_plato_de_la_mesa',
      'quitar_plato',
      'recuperar',
      'todo_fuera',
      'devolver_a_cocina',
      'pasar_a_otro_camarero',
      'cambiar_de_mesa',
      'juntar_mesas',
      'liberar_mesa',
    ]) {
      expect(acciones, accion).toContain(accion);
    }
  });
});

// ═══ Otras mesas ══════════════════════════════════════════════════════════════

describe('anular una mesa', () => {
  const terraza = crypto.randomUUID();

  it('la anula un jefe con motivo, y la cocina la ve ANULADA en «Fuera»', async () => {
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: terraza,
        mesa_id: mesa['T1'],
        personas: 2,
      }),
    );
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: terraza,
        platos: [{ id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1 }],
      }),
    );
    losDatos(await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: terraza }));
    expect(enCocina(await laCocina(), terraza)?.[0]).toBe('enMarcha');

    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'anular_mesa', { cuenta_id: terraza, motivo: 'se fueron' }),
      ),
    ).toBe('sin_permiso');
    expect(
      elFallo(await api.ejecutar(rosaTpv, 'anular_mesa', { cuenta_id: terraza, motivo: '' })),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(rosaTpv, 'anular_mesa', {
        cuenta_id: terraza,
        motivo: 'se han ido sin comer',
      }),
    );
    const [pestana, tarjeta] = enCocina(await laCocina(), terraza) ?? [];
    expect(pestana).toBe('fuera');
    expect(tarjeta?.anulada).toBe('se han ido sin comer');
    expect(laMesaDelPlano(await elPlano(saraTpv), 'T1').estado).toBe('libre');
  });
});

describe('«todo junto», «marchar todo» y la barra', () => {
  it('con «todo junto» todo va en un pase y sale a la vez', async () => {
    const cinco = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: cinco,
        mesa_id: mesa['5'],
        personas: 2,
        por_pases: false,
      }),
    );
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: cinco,
        platos: [
          { id: crypto.randomUUID(), plato_id: plato['Ensalada'], pase: 1 },
          { id: crypto.randomUUID(), plato_id: plato['Entrecot'], pase: 2 },
        ],
      }),
    );
    expect((await laMesa(cinco)).platos.map((p) => p.pase)).toEqual([1, 1]);
    expect(
      losDatos<{ salen: number[] }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: cinco }),
      ).salen,
    ).toEqual([1]);
  });

  it('una mesa por pases que dice «sacadlo todo»: lo que esperaba sale ya', async () => {
    const terraza = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', { cuenta_id: terraza, mesa_id: mesa['T1'] }),
    );
    losDatos(
      await api.ejecutar(saraTpv, 'pedir', {
        cuenta_id: terraza,
        platos: [
          { id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1 },
          { id: crypto.randomUUID(), plato_id: plato['Pollo asado'], pase: 2 },
        ],
      }),
    );
    expect(
      losDatos<{ esperan: number[] }>(
        await api.ejecutar(saraTpv, 'mandar_a_cocina', { cuenta_id: terraza }),
      ).esperan,
    ).toEqual([2]);
    losDatos(
      await api.ejecutar(saraTpv, 'cambiar_la_mesa', {
        cuenta_id: terraza,
        por_pases: false,
        nota_para_cocina: 'tienen prisa',
      }),
    );
    const lamesa = await laMesa(terraza);
    expect(lamesa.pases.every((p) => p.marchadoEn !== null)).toBe(true);
    const tarjeta = enCocina(await laCocina(), terraza);
    expect(tarjeta?.[0]).toBe('enMarcha');
    expect(tarjeta?.[1]).toMatchObject({ notaParaCocina: 'tienen prisa', porPases: false });
    // El plano también lo sabe: sus opciones no empiezan con la nota en blanco.
    expect(laMesaDelPlano(await elPlano(saraTpv), 'T1').cuenta).toMatchObject({
      notaParaCocina: 'tienen prisa',
      porPases: false,
    });
  });

  it('la barra se abre sin mesa, con un nombre; una mesa sin elegir mesa no', async () => {
    const barra = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: barra,
        tipo: 'barra',
        nombre: 'Iker',
      }),
    );
    expect((await elPlano(saraTpv)).sinMesa.map((c) => c.titulo)).toContain('Barra · Iker');
    expect(
      elFallo(await api.ejecutar(saraTpv, 'abrir_mesa', { cuenta_id: crypto.randomUUID() })),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'abrir_mesa', {
          cuenta_id: crypto.randomUUID(),
          tipo: 'barra',
          mesa_id: mesa['6'],
        }),
      ),
    ).toBe('faltan_datos');
  });
});

// ═══ Otro negocio ═════════════════════════════════════════════════════════════

describe('Luis, de otro negocio, no ve ni toca nada', () => {
  it('su cocina está vacía, y lo de Bar Centro no existe para él', async () => {
    const suya = await laCocina(luis);
    expect([...suya.enMarcha, ...suya.esperando, ...suya.fuera]).toEqual([]);
    const algunPlato = (
      await base.bd.query<{ id: string; cuenta_id: string }>(
        `select id::text as id, cuenta_id::text as cuenta_id from estook.linea_de_cuenta
          where destino = 'cocina' limit 1`,
      )
    ).rows[0];
    expect(algunPlato).toBeDefined();
    expect(elFallo(await api.ejecutar(luis, 'tachar', { linea_id: algunPlato?.id }))).toBe(
      'no_existe',
    );
    expect(
      elFallo(await api.ejecutar(luis, 'todo_fuera', { cuenta_id: algunPlato?.cuenta_id })),
    ).toBe('no_existe');
    const luisId = await base.personaPorCorreo(LUIS);
    const ve = await base.comoPersona(luisId, async () => ({
      cuentas: (await base.bd.query('select id from estook.cuenta')).rows.length,
      platos: (await base.bd.query('select id from estook.linea_de_cuenta')).rows.length,
      mesas: (await base.bd.query('select id from estook.mesa')).rows.length,
    }));
    expect(ve).toEqual({ cuentas: 0, platos: 0, mesas: 0 });
  });
});
