import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **R3 · 2 · 1 · La caja, segunda parte** (decisión 0152, migración 0124), contra la base:
 *
 *   · contar escribiendo el total (E6), solo si el local lo deja
 *   · «Quédate el cambio» (E5): la propina sale del cambio, fuera del ticket, y suma en el cajón
 *   · «Retirar» (E2): solo a quien lleva la caja, con lo que pasa del fondo en billetes de 50 €
 *   · entregar la caja (E7): quien la recibe teclea su PIN; no cierra el día; nace con lo contado
 *   · repartir las propinas (E5): entre los que han fichado, una vez, y salen en el Z
 *   · el aviso del descuadre (E3): al gerente, si pasa de la cifra; uno por caja
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const motor = pdfDeMentira();

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let rosaEnEstook: string;
const plato: Record<string, string> = {};
const mesas: string[] = [];

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

/** En la caja hay una persona dentro: cada una teclea su PIN cuando le toca (un aparato, una persona). */
async function enLaCaja(correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llaveDeLaCaja, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llaveDeLaCaja);
}

/** Una mesa con dos croquetas y un entrecot: 40,00 €. */
async function unaMesaPedida(mesa: number): Promise<{ cuenta: string; lineas: string[] }> {
  const cuenta = crypto.randomUUID();
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'abrir_mesa', {
      cuenta_id: cuenta,
      mesa_id: mesas[mesa],
      personas: 2,
    }),
  );
  const lineas = [crypto.randomUUID(), crypto.randomUUID()];
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'pedir', {
      cuenta_id: cuenta,
      platos: [
        { id: lineas[0], plato_id: plato['Croquetas'], pase: 1, cantidad: 2 },
        { id: lineas[1], plato_id: plato['Entrecot'], pase: 2 },
      ],
    }),
  );
  return { cuenta, lineas };
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, pdf: motor });
  barCentro = await base.localPorCodigo('bar-centro');

  // Bar Centro, de la casa, con la empresa de pruebas de Verifacti y sus series (0125).
  await comoDuena(
    `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
     select organizacion_id, 'activa', true from estook.local where id = $1
     on conflict (organizacion_id) do update set de_la_casa = true`,
    [barCentro],
  );
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      // El código del segundo factor es el de este minuto, el del reloj de la API de prueba.
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, new Date(Date.now())),
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'admin_poner_la_empresa_de_pruebas', { local_id: barCentro }),
  );
  rosaEnEstook = await api.entrar(ROSA);
  losDatos(
    await api.ejecutar(rosaEnEstook, 'poner_las_series', {
      ticket: 'T-BC',
      factura: 'F-BC',
      rectificativa: 'R-BC',
      otro_programa: false,
    }),
  );

  // La caja, con su cajón, y su impresora con el cajón enchufado.
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(rosaEnEstook, 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Caja 1',
    }),
  ).llave;
  losDatos(
    await api.ejecutar(await enLaCaja(ROSA), 'guardar_impresora', {
      nombre: 'Caja',
      modelo: 'Epson TM-T20III',
      direccion: '192.168.77.31:9100',
      imprime: ['caja'],
      tiene_cajon: true,
    }),
  );

  // Vincular cierra la sesión de Estook en ese navegador: se vuelve a entrar.
  rosaEnEstook = await api.entrar(ROSA);
  for (const [seccion, nombre, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
  ] as const) {
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosaEnEstook, 'crear_seccion', { nombre: seccion }),
    );
    const hechos = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosaEnEstook, 'crear_platos', {
        seccion_id: seccionId,
        platos: [{ nombre, precio_centimos: precio }],
      }),
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
  }
  const { zonaId } = losDatos<{ zonaId: string }>(
    await api.ejecutar(await enLaCaja(ROSA), 'crear_zona_de_sala', { nombre: 'Salón' }),
  );
  for (const nombre of ['1', '2', '3', '4']) {
    mesas.push(
      losDatos<{ mesaId: string }>(
        await api.ejecutar(await enLaCaja(ROSA), 'crear_mesa', {
          zona_id: zonaId,
          nombre,
          plazas: 4,
        }),
      ).mesaId,
    );
  }
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

const AJUSTES_DE_SIEMPRE = {
  propina_al_cobrar: true,
  caja_la_abren: 'encargados',
  recuento_al_abrir: false,
  contar_a_ciegas: true,
  fondo_de_siempre: 15000,
  con_bizum: false,
  con_cheque: false,
};

async function losAjustes(cambios: Record<string, unknown>): Promise<void> {
  losDatos(
    await api.ejecutar(await enLaCaja(ROSA), 'guardar_ajustes_de_la_caja', {
      ...AJUSTES_DE_SIEMPRE,
      ...cambios,
    }),
  );
}

async function fichar(correo: string): Promise<void> {
  const r = await api.ejecutar(null, 'fichar_en_la_caja', {
    llave: llaveDeLaCaja,
    pin: base.pinDe(correo, 'bar-centro'),
    que: 'entrada',
  });
  // Ya fichado: vale igual.
  if (r.estado === 'fallo' && r.codigo !== 'ya_hecho') losDatos(r);
}

let turno = '';
let nueva = '';

describe('contar escribiendo el total (E6)', () => {
  it('apagado de fábrica: se cuenta billete a billete', async () => {
    const caja = losDatos<{ ajustes: Record<string, unknown> }>(
      await api.consultar(await enLaCaja(ROSA), 'la_caja', {}),
    );
    expect(caja.ajustes).toMatchObject({
      contarEscribiendo: false,
      propinaAlCobrar: true,
      repartirPropinas: false,
      retirarDesde: 80000,
      avisarDesde: 1000,
    });
    const fallo = await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
      turno_id: crypto.randomUUID(),
      contado_total: 15000,
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
    expect(JSON.stringify(fallo)).toContain('billete a billete');
  });

  it('encendido, se abre escribiendo el total, y no las dos cosas a la vez', async () => {
    await losAjustes({ contar_escribiendo: true });
    const dos = await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
      turno_id: crypto.randomUUID(),
      contado: { '5000': 3 },
      contado_total: 15000,
    });
    expect(elFallo(dos)).toBe('faltan_datos');

    turno = crypto.randomUUID();
    const abierta = losDatos<{ fondo: number }>(
      await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
        turno_id: turno,
        contado_total: 15000,
      }),
    );
    expect(abierta.fondo).toBe(15000);
    const [fila] = await comoDuena<{ contado_al_abrir: unknown }>(
      `select contado_al_abrir from estook.turno_de_caja where id = $1`,
      [turno],
    );
    // Contada, aunque sin billetes: el fondo lleva el total.
    expect(fila?.contado_al_abrir).toEqual({});
  });
});

describe('«Quédate el cambio» (E5)', () => {
  it('la propina sale del cambio, no va en el ticket y suma en el cajón', async () => {
    const { cuenta } = await unaMesaPedida(0);
    const cobrado = losDatos<{ cambio: number; propina: number; documentoId: string }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 4000,
        pagos: [{ forma: 'efectivo', importe: 4000, entregado: 4500 }],
        propina: 500,
      }),
    );
    expect(cobrado.cambio).toBe(0);
    expect(cobrado.propina).toBe(500);
    const [ticket] = await comoDuena<{ total: number }>(
      `select total from facturacion.documento where id = $1`,
      [cobrado.documentoId],
    );
    expect(ticket?.total).toBe(4000);

    const x = losDatos<{ propinas: number; deberiaHaber: number; movimientos: unknown[] }>(
      await api.consultar(await enLaCaja(ROSA), 'como_va_la_caja', {}),
    );
    expect(x.propinas).toBe(500);
    // 150 de fondo + 40 cobrados + 5 de propina.
    expect(x.deberiaHaber).toBe(19500);
    // Las propinas van en su línea, no una por cobro.
    expect(x.movimientos).toHaveLength(0);
  });

  it('no puede ser más que el cambio, ni sin el ajuste', async () => {
    const { cuenta } = await unaMesaPedida(1);
    const mas = await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
      cobro_id: crypto.randomUUID(),
      cuenta_id: cuenta,
      que: 'toda',
      importe: 4000,
      pagos: [{ forma: 'efectivo', importe: 4000, entregado: 4500 }],
      propina: 600,
    });
    expect(elFallo(mas)).toBe('faltan_datos');

    await losAjustes({ contar_escribiendo: true, propina_al_cobrar: false });
    const apagado = await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
      cobro_id: crypto.randomUUID(),
      cuenta_id: cuenta,
      que: 'toda',
      importe: 4000,
      pagos: [{ forma: 'efectivo', importe: 4000, entregado: 4500 }],
      propina: 500,
    });
    expect(elFallo(apagado)).toBe('faltan_datos');
    await losAjustes({ contar_escribiendo: true });
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 4000,
        pagos: [{ forma: 'efectivo', importe: 4000, entregado: 4000 }],
      }),
    );
  });
});

describe('«Retirar» (E2)', () => {
  it('solo a quien lleva la caja, con lo que pasa del fondo en billetes de 50 €', async () => {
    // En el cajón: 150 + 40 + 5 + 40 = 235 €. Con la cifra en 200 €, toca retirar.
    await losAjustes({ contar_escribiendo: true, retirar_desde: 20000 });
    const rosa = losDatos<{ retirar: { propuesta: number; desde: number; vez: number } | null }>(
      await api.consultar(await enLaCaja(ROSA), 'la_caja', {}),
    );
    // 235 − 150 = 85 → 50 €.
    expect(rosa.retirar).toEqual({ propuesta: 5000, desde: 20000, vez: 0 });
    const sara = losDatos<{ retirar: unknown }>(
      await api.consultar(await enLaCaja(SARA), 'la_caja', {}),
    );
    expect(sara.retirar).toBeNull();

    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'mover_dinero', {
        movimiento_id: crypto.randomUUID(),
        que: 'sacar',
        importe: 5000,
        motivo: 'A la caja fuerte',
      }),
    );
    const despues = losDatos<{ retirar: unknown }>(
      await api.consultar(await enLaCaja(ROSA), 'la_caja', {}),
    );
    expect(despues.retirar).toBeNull();
    await losAjustes({ contar_escribiendo: true });
  });
});

describe('entregar la caja (E7)', () => {
  it('a una camarera no, si solo la llevan los encargados', async () => {
    const fallo = await api.ejecutar(await enLaCaja(ROSA), 'entregar_la_caja', {
      turno_id: turno,
      nuevo_turno_id: crypto.randomUUID(),
      contado_total: 18500,
      pin: base.pinDe(SARA, 'bar-centro'),
    });
    expect(elFallo(fallo)).toBe('sin_permiso');
  });

  it('Sara la entrega a Rosa: su arqueo, sin cerrar el día, y la de Rosa nace con lo contado', async () => {
    // Debería haber 185 € (235 − 50 a la caja fuerte). Sara cuenta 183 €: faltan 2 €.
    nueva = crypto.randomUUID();
    const entregada = losDatos<{
      deberiaHaber: number;
      contado: number;
      diferencia: number;
      recibe: string;
    }>(
      await api.ejecutar(await enLaCaja(SARA), 'entregar_la_caja', {
        turno_id: turno,
        nuevo_turno_id: nueva,
        contado_total: 18300,
        pin: base.pinDe(ROSA, 'bar-centro'),
      }),
    );
    expect(entregada).toMatchObject({
      deberiaHaber: 18500,
      contado: 18300,
      diferencia: -200,
      recibe: 'Rosa',
    });
    const filas = await comoDuena<{
      id: string;
      entregada_a: string | null;
      recibida_de: string | null;
      fondo: number;
      cerrada_en: string | null;
      propinas: number | null;
    }>(
      `select id::text as id, entregada_a::text as entregada_a, recibida_de::text as recibida_de,
              fondo, cerrada_en::text as cerrada_en, propinas
         from estook.turno_de_caja where id in ($1, $2)`,
      [turno, nueva],
    );
    const vieja = filas.find((f) => f.id === turno);
    const laNueva = filas.find((f) => f.id === nueva);
    expect(vieja?.entregada_a).not.toBeNull();
    expect(vieja?.cerrada_en).not.toBeNull();
    expect(vieja?.propinas).toBe(500);
    expect(laNueva?.recibida_de).toBe(turno);
    expect(laNueva?.fondo).toBe(18300);
    expect(laNueva?.cerrada_en).toBeNull();
    // El día sigue abierto: la caja también.
    const [cierre] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.cierre_de_caja where local_id = $1`,
      [barCentro],
    );
    expect(cierre?.n).toBe(0);
    // Repetir con el mismo toque no entrega dos veces.
    const otraVez = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(await enLaCaja(SARA), 'entregar_la_caja', {
        turno_id: turno,
        nuevo_turno_id: nueva,
        contado_total: 18300,
        pin: base.pinDe(ROSA, 'bar-centro'),
      }),
    );
    expect(otraVez.yaEstaba).toBe(true);
    // Faltan 2 €: no pasa de 10, no hay aviso.
    const [avisos] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.aviso where tipo = 'caja.descuadre'`,
    );
    expect(avisos?.n).toBe(0);
    const x = losDatos<{ recibidaDe: string | null; fondo: number }>(
      await api.consultar(await enLaCaja(ROSA), 'como_va_la_caja', {}),
    );
    expect(x).toMatchObject({ recibidaDe: 'Sara', fondo: 18300 });
  });

  it('cerrar con más de 10 € de diferencia avisa al gerente; y las propinas se reparten una vez', async () => {
    await losAjustes({ contar_escribiendo: true, repartir_propinas: true });
    await fichar(SARA);
    await fichar(MARCOS);
    // Una propina más en la caja de Rosa: 3 €. Las del día, 8 €.
    const { cuenta } = await unaMesaPedida(2);
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 4000,
        pagos: [{ forma: 'efectivo', importe: 4000, entregado: 4300 }],
        propina: 300,
      }),
    );
    // Debería haber 183 + 40 + 3 = 226 €. Sara cierra contando 210 €: faltan 16 €.
    const cerrada = losDatos<{
      deberiaHaber: number;
      diferencia: number;
      propinas: number;
      diaCerrado: boolean;
      reparto: { fichados: { personaId: string; nombre: string; puesto: string | null }[] } | null;
    }>(
      await api.ejecutar(await enLaCaja(SARA), 'cerrar_caja', {
        turno_id: nueva,
        contado_total: 21000,
        datafono: null,
        para_manana: 15000,
        pin_del_encargado: base.pinDe(ROSA, 'bar-centro'),
      }),
    );
    expect(cerrada.deberiaHaber).toBe(22600);
    expect(cerrada.diferencia).toBe(-1600);
    expect(cerrada.diaCerrado).toBe(true);
    expect(cerrada.propinas).toBe(800);
    const nombres = (cerrada.reparto?.fichados ?? []).map((f) => f.nombre);
    expect(nombres).toContain('Sara');
    expect(nombres).toContain('Marcos');
    expect(cerrada.reparto?.fichados.find((f) => f.nombre === 'Marcos')?.puesto).toBe('Cocina');

    const avisos = await comoDuena<{ titulo: string }>(
      `select titulo from estook.aviso where tipo = 'caja.descuadre'`,
    );
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos[0]?.titulo).toBe('Caja 1 · faltan 16,00 €');

    // El día se cierra con las dos manos: 80 € antes de la entrega y 40 € después.
    const [dia] = await comoDuena<{ efectivo: number }>(
      `select efectivo_centimos as efectivo from estook.cierre_de_caja where local_id = $1`,
      [barCentro],
    );
    expect(dia?.efectivo).toBe(12000);

    const entre = (cerrada.reparto?.fichados ?? []).map((f) => f.personaId);
    const reparto = losDatos<{ reparto: { nombre: string; importe: number }[] }>(
      await api.ejecutar(await enLaCaja(SARA), 'repartir_las_propinas', {
        turno_id: nueva,
        personas: entre,
      }),
    );
    expect(reparto.reparto.reduce((s, r) => s + r.importe, 0)).toBe(800);
    // Otra vez: el mismo reparto, sin repartir dos veces.
    const otraVez = losDatos<{ reparto: unknown[] }>(
      await api.ejecutar(await enLaCaja(SARA), 'repartir_las_propinas', {
        turno_id: nueva,
        personas: entre.slice(0, 1),
      }),
    );
    expect(otraVez.reparto).toHaveLength(entre.length);
    // Lo repartido no se toca, ni siendo la dueña de la base.
    await expect(
      comoDuena(`update estook.reparto_de_propinas set importe = 0 where turno_id = $1`, [nueva]),
    ).rejects.toThrow();
  });

  it('en Estook, el día enseña las dos manos, las propinas y el reparto', async () => {
    const hoy = (
      await comoDuena<{ fecha: string }>(
        `select fecha_operativa::text as fecha from estook.turno_de_caja where id = $1`,
        [nueva],
      )
    )[0]?.fecha;
    const dia = losDatos<{
      propinas: number;
      cajas: { entregadaA: string | null; recibidaDe: string | null; reparto: unknown[] }[];
    }>(await api.consultar(rosaEnEstook, 'un_dia_de_caja', { fecha: hoy ?? '' }));
    expect(dia.propinas).toBe(800);
    expect(dia.cajas.map((c) => [c.entregadaA, c.recibidaDe])).toEqual([
      ['Rosa', null],
      [null, 'Sara'],
    ]);
    expect(dia.cajas[1]?.reparto.length).toBeGreaterThan(0);
    const lista = losDatos<{ dias: { cajas: number }[] }>(
      await api.consultar(rosaEnEstook, 'cierres_de_caja', {}),
    );
    // Una caja entregada sigue siendo una caja.
    expect(lista.dias[0]?.cajas).toBe(1);
  });
});
