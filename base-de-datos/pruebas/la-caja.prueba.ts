import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **R3 · 1 · La caja** (decisión 0144, migración 0116), contra la base y con el Verifacti de mentira:
 *
 *   · abrir: quien no puede, lo aprueba un encargado; el primer día se cuenta; repetir no abre dos
 *   · cobrar: la cuenta entera, por platos y a partes iguales; un cobro, un ticket; el mismo cobro dos
 *     veces cobra una vez; la cuenta que cambió no se cobra a ciegas; la mesa queda libre con lo último
 *   · el cajón: siempre con para qué, y lo aprueba un encargado si hace falta
 *   · cerrar: a ciegas, con la diferencia de verdad; el día se cierra solo con la última caja
 *   · lo cobrado, los pagos y una caja cerrada no se tocan, ni siendo la dueña de la base
 *   · «También camareros» deja a la sala abrir y cerrar
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let rosaEnEstook: string;
let turno: string;
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

const loQueHayEnLaCola = async (tipo: string) =>
  (
    await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.trabajo_de_impresion where local_id = $1 and tipo = $2`,
      [barCentro, tipo],
    )
  )[0]?.n ?? 0;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti });
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

describe('abrir caja', () => {
  it('sin abrir no se cobra, y la caja dice que está cerrada', async () => {
    const caja = losDatos<{
      abierta: unknown;
      loDeLaUltimaVez: number | null;
      cajon: { nombre: string };
    }>(await api.consultar(await enLaCaja(SARA), 'la_caja', {}));
    expect(caja.abierta).toBeNull();
    expect(caja.loDeLaUltimaVez).toBeNull();
    expect(caja.cajon.nombre).toBe('Caja 1');

    const { cuenta } = await unaMesaPedida(0);
    const fallo = await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
      cobro_id: crypto.randomUUID(),
      cuenta_id: cuenta,
      que: 'toda',
      importe: 4000,
      pagos: [{ forma: 'tarjeta', importe: 4000 }],
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
    expect(JSON.stringify(fallo)).toContain('Abre la caja para cobrar');
  });

  it('una camarera no la abre sola: lo aprueba un encargado con su PIN', async () => {
    const id = crypto.randomUUID();
    const contado = { '2000': 5, '1000': 5 };
    expect(
      elFallo(await api.ejecutar(await enLaCaja(SARA), 'abrir_caja', { turno_id: id, contado })),
    ).toBe('lo_aprueba_un_encargado');
    const abierta = losDatos<{ fondo: number }>(
      await api.ejecutar(await enLaCaja(SARA), 'abrir_caja', {
        turno_id: id,
        contado,
        pin_del_encargado: base.pinDe(ROSA, 'bar-centro'),
      }),
    );
    expect(abierta.fondo).toBe(15000);
    turno = id;
    const [fila] = await comoDuena<{ abierta_aprobada_por: string | null }>(
      `select abierta_aprobada_por::text from estook.turno_de_caja where id = $1`,
      [id],
    );
    expect(fila?.abierta_aprobada_por).not.toBeNull();
    // El cajón se abre para meter el fondo.
    expect(await loQueHayEnLaCola('cajon')).toBe(1);
  });

  it('abrir otra vez con el mismo toque no abre dos; y con otro, dice quién la abrió', async () => {
    const otra = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
        turno_id: turno,
        contado: { '5000': 3 },
      }),
    );
    expect(otra.yaEstaba).toBe(true);
    const fallo = await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
      turno_id: crypto.randomUUID(),
      contado: { '5000': 3 },
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
    expect(JSON.stringify(fallo)).toContain('ya está abierta');
  });

  it('no acepta billetes que no existen', async () => {
    expect(
      elFallo(
        await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
          turno_id: crypto.randomUUID(),
          contado: { '300': 1 },
        }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('cobrar', () => {
  it('la cuenta entera en efectivo: un ticket, el cambio, el cajón y la mesa libre', async () => {
    const [primera] = await comoDuena<{ id: string }>(
      `select id from estook.cuenta where local_id = $1 and liberada_en is null order by abierta_en limit 1`,
      [barCentro],
    );
    const cuenta = primera?.id ?? '';
    const cobroId = crypto.randomUUID();
    const entrada = {
      cobro_id: cobroId,
      cuenta_id: cuenta,
      que: 'toda',
      importe: 4000,
      pagos: [{ forma: 'efectivo', importe: 4000, entregado: 5000 }],
    };
    const cajonAntes = await loQueHayEnLaCola('cajon');
    const cobrado = losDatos<{ numero: string; cambio: number; liberada: boolean; queda: number }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', entrada),
    );
    expect(cobrado.numero).toBe('T-BC-2026-000001');
    expect(cobrado.cambio).toBe(1000);
    expect(cobrado.liberada).toBe(true);
    expect(cobrado.queda).toBe(0);
    expect(await loQueHayEnLaCola('cajon')).toBe(cajonAntes + 1);
    // El ticket sale solo, con su QR, en cuanto contesta Hacienda.
    expect(await loQueHayEnLaCola('ticket')).toBe(1);

    // El mismo cobro otra vez (la respuesta se perdió): no cobra dos veces.
    const otraVez = losDatos<{ numero: string; yaEstaba: boolean }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', entrada),
    );
    expect(otraVez.yaEstaba).toBe(true);
    expect(otraVez.numero).toBe('T-BC-2026-000001');
    const [n] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.cobro where cuenta_id = $1`,
      [cuenta],
    );
    expect(n?.n).toBe(1);
  });

  it('por platos: cada cobro con sus platos, y el resto mezclando efectivo y tarjeta', async () => {
    const { cuenta, lineas } = await unaMesaPedida(1);
    const croquetas = losDatos<{ queda: number; liberada: boolean }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'platos',
        lineas: [lineas[0]],
        importe: 1800,
        pagos: [{ forma: 'tarjeta', importe: 1800 }],
      }),
    );
    expect(croquetas.queda).toBe(2200);
    expect(croquetas.liberada).toBe(false);
    // Las croquetas ya están cobradas: no se pueden cobrar otra vez.
    expect(
      elFallo(
        await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
          cobro_id: crypto.randomUUID(),
          cuenta_id: cuenta,
          que: 'platos',
          lineas: [lineas[0]],
          importe: 1800,
          pagos: [{ forma: 'tarjeta', importe: 1800 }],
        }),
      ),
    ).toBe('lo_cambio_otra_persona');
    const resto = losDatos<{ liberada: boolean; cambio: number }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 2200,
        pagos: [
          { forma: 'efectivo', importe: 1000, entregado: 1000 },
          { forma: 'tarjeta', importe: 1200 },
        ],
      }),
    );
    expect(resto.liberada).toBe(true);
    const pagos = await comoDuena<{ forma: string; importe: number }>(
      `select p.forma, p.importe from estook.pago p join estook.cobro c on c.id = p.cobro_id
        where c.cuenta_id = $1 order by p.forma, p.importe`,
      [cuenta],
    );
    expect(pagos).toEqual([
      { forma: 'efectivo', importe: 1000 },
      { forma: 'tarjeta', importe: 1200 },
      { forma: 'tarjeta', importe: 1800 },
    ]);
  });

  it('a partes iguales: suman el total, cada parte una vez, y la mesa se libera con la última', async () => {
    const { cuenta } = await unaMesaPedida(2);
    const cobrarParte = async (parte: number, importe: number) =>
      api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'parte',
        parte,
        de: 3,
        importe,
        pagos: [{ forma: 'tarjeta', importe }],
      });
    expect(losDatos<{ queda: number }>(await cobrarParte(1, 1334)).queda).toBe(2666);
    expect(elFallo(await cobrarParte(1, 1334))).toBe('ya_hecho');
    // La cuenta que cambió entre medias no se cobra a ciegas.
    expect(elFallo(await cobrarParte(2, 1300))).toBe('lo_cambio_otra_persona');
    expect(losDatos<{ queda: number }>(await cobrarParte(2, 1333)).queda).toBe(1333);
    const ultima = losDatos<{ queda: number; liberada: boolean }>(await cobrarParte(3, 1333));
    expect(ultima).toMatchObject({ queda: 0, liberada: true });
    const tickets = await comoDuena<{ lineas: { nombre: string }[] }>(
      `select d.lineas from facturacion.documento d join estook.cobro c on c.documento_id = d.id
        where c.cuenta_id = $1 order by c.parte`,
      [cuenta],
    );
    expect(tickets.map((t) => t.lineas[0]?.nombre)).toEqual([
      'Servicio de restauración · Mesa 3 · parte 1 de 3',
      'Servicio de restauración · Mesa 3 · parte 2 de 3',
      'Servicio de restauración · Mesa 3 · parte 3 de 3',
    ]);
  });

  it('una forma de pago apagada no se usa; y los pagos tienen que sumar', async () => {
    const { cuenta } = await unaMesaPedida(3);
    const cobrarCon = async (pagos: unknown[]) =>
      api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 4000,
        pagos,
      });
    expect(elFallo(await cobrarCon([{ forma: 'bizum', importe: 4000 }]))).toBe('faltan_datos');
    expect(elFallo(await cobrarCon([{ forma: 'tarjeta', importe: 3000 }]))).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'guardar_ajustes_de_la_caja', {
        caja_la_abren: 'encargados',
        recuento_al_abrir: false,
        contar_a_ciegas: true,
        fondo_de_siempre: 15000,
        con_bizum: true,
        con_cheque: true,
      }),
    );
    const conBizum = losDatos<{ liberada: boolean }>(
      await cobrarCon([
        { forma: 'bizum', importe: 1000 },
        { forma: 'cheque', importe: 3000 },
      ]),
    );
    expect(conBizum.liberada).toBe(true);
  });
});

describe('abrir el cajón', () => {
  it('sacar dinero: siempre con para qué, y una camarera con el PIN de un encargado', async () => {
    const id = crypto.randomUUID();
    expect(
      elFallo(
        await api.ejecutar(await enLaCaja(ROSA), 'mover_dinero', {
          movimiento_id: id,
          que: 'sacar',
          importe: 3500,
          motivo: 'Porque sí',
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(await enLaCaja(SARA), 'mover_dinero', {
          movimiento_id: id,
          que: 'sacar',
          importe: 3500,
          motivo: 'Un proveedor',
          nota: 'El pan',
        }),
      ),
    ).toBe('lo_aprueba_un_encargado');
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'mover_dinero', {
        movimiento_id: id,
        que: 'sacar',
        importe: 3500,
        motivo: 'Un proveedor',
        nota: 'El pan',
        pin_del_encargado: base.pinDe(ROSA, 'bar-centro'),
      }),
    );
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'mover_dinero', {
        movimiento_id: crypto.randomUUID(),
        que: 'cambio',
      }),
    );
  });

  it('«Cómo va» suma lo cobrado y lo movido: lo que debería haber', async () => {
    expect(elFallo(await api.consultar(await enLaCaja(SARA), 'como_va_la_caja', {}))).toBe(
      'sin_permiso',
    );
    const x = losDatos<{
      fondo: number;
      efectivo: number;
      tarjeta: number;
      bizum: number;
      cheque: number;
      tickets: number;
      deberiaHaber: number;
      cajonSinVenta: number;
    }>(await api.consultar(await enLaCaja(ROSA), 'como_va_la_caja', {}));
    // 150 de fondo + 40 + 10 en efectivo − 35 sacados.
    expect(x).toMatchObject({
      fondo: 15000,
      efectivo: 5000,
      tarjeta: 1800 + 1200 + 4000,
      bizum: 1000,
      cheque: 3000,
      tickets: 7,
      deberiaHaber: 15000 + 5000 - 3500,
      cajonSinVenta: 1,
    });
  });
});

describe('cerrar caja', () => {
  it('a ciegas: la diferencia es la de verdad, y el día se cierra solo con la última caja', async () => {
    // Faltan 5 €: 160 € contados de los 165 que debería haber.
    const cerrada = losDatos<{
      deberiaHaber: number;
      contado: number;
      diferencia: number;
      diaCerrado: boolean;
      retiras: number;
      diferenciaDeTarjeta: number | null;
    }>(
      await api.ejecutar(await enLaCaja(ROSA), 'cerrar_caja', {
        turno_id: turno,
        contado: { '5000': 2, '2000': 3 },
        datafono: 7000,
        para_manana: 15000,
      }),
    );
    expect(cerrada).toMatchObject({
      deberiaHaber: 16500,
      contado: 16000,
      diferencia: -500,
      diaCerrado: true,
      retiras: 1000,
      diferenciaDeTarjeta: 0,
    });
    const [dia] = await comoDuena<{ origen: string; total_centimos: number; estado: string }>(
      `select origen, total_centimos, estado from estook.cierre_de_caja where local_id = $1`,
      [barCentro],
    );
    expect(dia).toEqual({ origen: 'tpv', total_centimos: 5000 + 7000 + 4000, estado: 'cerrada' });
  });

  it('el motivo se pone después, una vez; y una caja cerrada no se toca', async () => {
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'explicar_la_diferencia', {
        turno_id: turno,
        motivo: 'no_se_sabe',
      }),
    );
    expect(
      elFallo(
        await api.ejecutar(await enLaCaja(ROSA), 'explicar_la_diferencia', {
          turno_id: turno,
          motivo: 'error_al_dar_el_cambio',
        }),
      ),
    ).toBe('ya_hecho');
    await expect(
      comoDuena(`update estook.turno_de_caja set contado_total = 16500 where id = $1`, [turno]),
    ).rejects.toThrow(/no se toca/);
    await expect(
      comoDuena(`update estook.pago set importe = 1 where local_id = $1`, [barCentro]),
    ).rejects.toThrow(/solo se añade/);
    await expect(
      comoDuena(`delete from estook.cobro where local_id = $1`, [barCentro]),
    ).rejects.toThrow(/solo se añade/);
  });

  it('se propone lo que se dejó; abrir otra vez el mismo día reabre el día', async () => {
    const caja = losDatos<{ loDeLaUltimaVez: number }>(
      await api.consultar(await enLaCaja(ROSA), 'la_caja', {}),
    );
    expect(caja.loDeLaUltimaVez).toBe(15000);
    const otra = crypto.randomUUID();
    losDatos(await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', { turno_id: otra }));
    const [dia] = await comoDuena<{ estado: string }>(
      `select estado from estook.cierre_de_caja where local_id = $1`,
      [barCentro],
    );
    expect(dia?.estado).toBe('reabierta');
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'cerrar_caja', {
        turno_id: otra,
        contado: { '5000': 3 },
        datafono: null,
        para_manana: 15000,
      }),
    );
    const [otraVez] = await comoDuena<{ estado: string }>(
      `select estado from estook.cierre_de_caja where local_id = $1`,
      [barCentro],
    );
    expect(otraVez?.estado).toBe('cerrada');
  });

  it('con «También camareros», Sara abre y cierra sin que nadie lo apruebe', async () => {
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'guardar_ajustes_de_la_caja', {
        caja_la_abren: 'todos',
        recuento_al_abrir: true,
        contar_a_ciegas: true,
        fondo_de_siempre: 15000,
        con_bizum: true,
        con_cheque: true,
      }),
    );
    const id = crypto.randomUUID();
    // Con el recuento obligatorio, «Está correcto» no vale.
    expect(elFallo(await api.ejecutar(await enLaCaja(SARA), 'abrir_caja', { turno_id: id }))).toBe(
      'faltan_datos',
    );
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'abrir_caja', {
        turno_id: id,
        contado: { '5000': 3 },
      }),
    );
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'cerrar_caja', {
        turno_id: id,
        contado: { '5000': 3 },
        datafono: null,
        para_manana: 15000,
      }),
    );
  });
});

describe('en Estook, los cierres de caja', () => {
  it('un día por fila con su total, y dentro cada caja con su Z', async () => {
    const lista = losDatos<{ dias: { fecha: string; total: number; cajas: number }[] }>(
      await api.consultar((rosaEnEstook = await api.entrar(ROSA)), 'cierres_de_caja', {}),
    );
    expect(lista.dias).toHaveLength(1);
    expect(lista.dias[0]).toMatchObject({ total: 16000, cajas: 3 });
    const dia = losDatos<{ cajas: { diferencia: number | null; motivo: string | null }[] }>(
      await api.consultar(rosaEnEstook, 'un_dia_de_caja', { fecha: lista.dias[0]?.fecha ?? '' }),
    );
    expect(dia.cajas[0]).toMatchObject({ diferencia: -500, motivo: 'no_se_sabe' });
    // Una camarera no ve las ventas: no ve los cierres.
    expect(elFallo(await api.consultar(await api.entrar(SARA), 'cierres_de_caja', {}))).toBe(
      'sin_permiso',
    );
  });
});
