import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { diaDeLaSemana, fechaEnElLocal, masDias, type FechaOperativa } from '@estook/dominio';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { lugaresDeMentira } from '../../servidor/infraestructura/google.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * R2 · el pedido sugerido, los informes y la nota en Google (0051 · decisión 0053),
 * con el despachador y la base de verdad.
 *
 *   · **El pedido sugerido** reparte el gasto por días de la semana con dos semanas
 *     de historia, y no vuelve a pedir lo que ya está mandado.
 *   · **El reloj, a las ocho**: «mañana toca pedir» a quien manda los pedidos; Tu
 *     día cada mañana, Tu semana los lunes y Tu mes el día 1, contados a nombre de
 *     quien los recibe y, de fábrica, la semana y el mes también por correo; lo bajo
 *     mínimo solo a quien lo enciende; y sin datos, nada.
 *   · **La nota en Google**: cada tres días y al mirarla si tiene más de uno, dentro
 *     del tope; su evolución; el aviso si baja; y solo de cuentas que pagan.
 *
 * En Bar Centro, que aquí deja de ser un ejemplo para que el reloj lo mire: Rosa es la
 * gerente (ve Negocio y manda pedidos), Marcos cocina y Sara hace sala.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const google = lugaresDeMentira();

const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const SECRETO = 'el-secreto-del-reloj-de-r2';

let rosa: string;
let marcos: string;
let sara: string;
let barCentro: string;
let frutas: string;
let carnes: string;
let tomate: string;

/** Hoy en Madrid, y el lunes de esta semana (hoy, si es lunes). */
const HOY = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');
const LUNES = masDias(HOY, -(diaDeLaSemana(HOY) - 1));

interface Aviso {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  ir: string | null;
  leido: boolean;
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

/** La API a una hora dada: para apuntar días pasados y para el reloj. */
function apiEl(instante: string): ApiDePrueba {
  return montarLaApi(base.bd, { correo, google, ahora: () => new Date(instante) });
}

/** Un latido del reloj a las 09:10 de Madrid en verano (08:10 en invierno) de ese día. */
async function latirEl(dia: FechaOperativa | string) {
  return apiEl(`${dia}T07:10:00Z`).despachador.latir(
    { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
    SECRETO,
  );
}

async function susAvisos(token: string): Promise<Aviso[]> {
  return losDatos<{ avisos: Aviso[] }>(await api.consultar(token, 'mis_avisos')).avisos;
}

async function deTipo(token: string, tipo: string): Promise<Aviso[]> {
  return (await susAvisos(token)).filter((a) => a.tipo === tipo);
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, google });

  // Bar Centro deja de ser un ejemplo: el reloj no avisa a los ejemplos.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  barCentro = await base.localPorCodigo('bar-centro');

  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);

  // Frutas reparte todos los días (se le pide la víspera); Carnes, solo los viernes.
  frutas = losDatos<{ proveedorId: string }>(
    await api.ejecutar(rosa, 'crear_proveedor', {
      nombre: 'Frutas R2',
      dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      plazo_de_entrega: 1,
    }),
  ).proveedorId;
  carnes = losDatos<{ proveedorId: string }>(
    await api.ejecutar(rosa, 'crear_proveedor', {
      nombre: 'Carnes R2',
      dias_de_reparto: [5],
      plazo_de_entrega: 1,
    }),
  ).proveedorId;
  losDatos(
    await api.ejecutar(rosa, 'crear_producto', {
      nombre: 'Chuletón R2',
      unidad_de_uso: 'kg',
      factor: 1,
      proveedor_id: carnes,
      precio_centimos: 2_500,
      cantidad_inicial: 50,
    }),
  );

  // El tomate, con tres semanas de historia: 5 kg al día y 15 los sábados. Se da de
  // alta hace 22 días con lo justo para que hoy queden 2 kg.
  const inicio = masDias(HOY, -22);
  let gastado = 0;
  for (let hace = 21; hace >= 1; hace--) {
    gastado += diaDeLaSemana(masDias(HOY, -hace)) === 6 ? 15 : 5;
  }
  tomate = losDatos<{ productoId: string }>(
    await apiEl(`${inicio}T10:00:00Z`).ejecutar(rosa, 'crear_producto', {
      nombre: 'Tomate R2',
      unidad_de_uso: 'kg',
      factor: 1,
      minimo: 20,
      proveedor_id: frutas,
      precio_centimos: 180,
      cantidad_inicial: gastado + 2,
    }),
  ).productoId;
  for (let hace = 21; hace >= 1; hace--) {
    const dia = masDias(HOY, -hace);
    losDatos(
      await apiEl(`${dia}T12:00:00Z`).ejecutar(rosa, 'apuntar_salida', {
        producto_id: tomate,
        cuanto: diaDeLaSemana(dia) === 6 ? 15 : 5,
      }),
    );
  }

  // Las cajas: tres días de la semana pasada y dos de la anterior.
  const cajas: [FechaOperativa, number][] = [
    [masDias(LUNES, -1), 150_000],
    [masDias(LUNES, -2), 120_000],
    [masDias(LUNES, -3), 100_000],
    [masDias(LUNES, -8), 110_000],
    [masDias(LUNES, -9), 100_000],
  ];
  for (const [fecha, total] of cajas) {
    losDatos(
      await apiEl(`${fecha}T21:00:00Z`).ejecutar(rosa, 'cerrar_la_caja', {
        fecha,
        total_centimos: total,
        tickets: 40,
      }),
    );
  }

  // Lo que ha dejado montar todo esto no es de lo que se prueba.
  for (const token of [rosa, marcos, sara]) losDatos(await api.ejecutar(token, 'leer_avisos', {}));
}, 240_000);

afterAll(async () => {
  await base.cerrar();
});

// ── El pedido sugerido ───────────────────────────────────────────────────────

interface Sugerencia {
  lineas: { productoId: string; sugerencia: { formatos: number; motivo: string } }[];
}

describe('el pedido sugerido', () => {
  it('con dos semanas de historia, reparte el gasto por días de la semana', async () => {
    const sugerida = losDatos<Sugerencia>(
      await api.consultar(rosa, 'sugerencia_de_pedido', { proveedor_id: frutas }),
    );
    const linea = sugerida.lineas.find((l) => l.productoId === tomate);
    expect(linea?.sugerencia.motivo).toContain('contando lo que se gasta cada día de la semana');
  });

  it('lo mandado que no ha llegado se descuenta, y se dice', async () => {
    const antes = losDatos<Sugerencia>(
      await api.consultar(rosa, 'sugerencia_de_pedido', { proveedor_id: frutas }),
    ).lineas.find((l) => l.productoId === tomate);

    const { pedidoId } = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: frutas,
        lineas: [{ producto_id: tomate, cantidad: 3 }],
      }),
    );
    // Llega **dentro de tres días**, y no mañana, por la prueba del reloj de más abajo
    // (lección 128): el reloj late el lunes de esta semana y mira el reparto del
    // miércoles. Con «mañana», los martes este pedido llegaba justo ese miércoles, el
    // reloj entendía —bien— que ya estaba pedido, y «mañana toca pedir» no salía. Con
    // tres días cae como pronto el jueves, sea el día que sea.
    losDatos(
      await api.ejecutar(rosa, 'enviar_pedido', {
        pedido_id: pedidoId,
        canal: 'telefono',
        llega_el: masDias(HOY, 3),
      }),
    );

    const despues = losDatos<Sugerencia>(
      await api.consultar(rosa, 'sugerencia_de_pedido', { proveedor_id: frutas }),
    ).lineas.find((l) => l.productoId === tomate);
    expect(despues?.sugerencia.motivo).toContain('Ya hay 3 kg pedidos que no han llegado');
    expect(despues?.sugerencia.formatos).toBe((antes?.sugerencia.formatos ?? 0) - 3);
  });
});

// ── El reloj, a las ocho ─────────────────────────────────────────────────────

describe('el reloj, el lunes a las ocho', () => {
  let antesDelCorreo = 0;

  beforeAll(async () => {
    antesDelCorreo = correo.mandados.length;
    expect(await latirEl(LUNES)).toMatchObject({ diario: true });
  });

  it('«mañana toca pedir» a quien manda los pedidos, y lleva a prepararlo', async () => {
    const tocan = await deTipo(rosa, 'pedido.toca');
    const deFrutas = tocan.find((a) => a.titulo === 'Mañana toca pedir a Frutas R2');
    expect(deFrutas?.ir).toBe(`/almacen/compras/pedidos?pedir=${frutas}`);
    expect(deFrutas?.detalle).toContain('Tócalo y se prepara el pedido');
    // Carnes se pide los jueves: el martes no toca.
    expect(tocan.some((a) => a.titulo.includes('Carnes R2'))).toBe(false);
    // Marcos no manda pedidos.
    expect(await deTipo(marcos, 'pedido.toca')).toEqual([]);
  });

  it('Tu día, a quien ve Negocio, con sus frases y sin correo de fábrica', async () => {
    const [dia] = await deTipo(rosa, 'informe.dia');
    expect(dia?.titulo).toMatch(/^Tu día en Bar Centro: el domingo /);
    // 1.500 € el domingo frente a 1.100 € el anterior.
    expect(dia?.detalle).toBe(
      'Lo mejor: las ventas, 1.500,00 €, un 36,4 % más que el domingo anterior. Nada más que mirar: todo en su sitio.',
    );
    expect(dia?.ir).toBe(`/negocio/informes/dia?del=${masDias(LUNES, -1)}`);
    expect(await deTipo(sara, 'informe.dia')).toEqual([]);
    expect(await deTipo(marcos, 'informe.dia')).toEqual([]);
  });

  it('Tu semana, el lunes, también por correo, con su tabla de cifras', async () => {
    const [semana] = await deTipo(rosa, 'informe.semana');
    expect(semana?.titulo).toMatch(/^Tu semana en Bar Centro: del /);
    // 3.700 € frente a 2.100 €: lo mejor son las ventas. Y faltan cuatro cajas.
    expect(semana?.detalle).toContain('Lo mejor: las ventas, 3.700,00 €');
    expect(semana?.detalle).toContain('4 días sin caja cerrada');

    const suyos = correo.mandados.slice(antesDelCorreo).filter((c) => c.para === ROSA);
    const deLaSemana = suyos.find((c) => c.asunto.startsWith('Tu semana en Bar Centro'));
    expect(deLaSemana?.html).toContain('<table');
    expect(deLaSemana?.html).toContain('3.700,00 €');
    expect(deLaSemana?.texto).toContain('· Ventas: 3.700,00 € (+');
    // El del día, de fábrica, no va por correo.
    expect(suyos.some((c) => c.asunto.startsWith('Tu día'))).toBe(false);
  });

  it('la semana del informe es la misma que enseña Negocio → Informes', async () => {
    // Se mira **el lunes a las ocho**, como el reloj, y no a la hora de verdad
    // (lección 128): un lunes entre las 00:00 y la hora de corte el local sigue en la
    // jornada del domingo, la semana todavía no está cerrada y Negocio enseña la de
    // antes. Es lo correcto en la app; la prueba no podía depender de a qué hora pasa.
    const informe = losDatos<{
      periodo: { desde: string; hasta: string };
      cifras: { indicador: string; total: number | null; anterior: number | null }[];
    }>(
      await apiEl(`${LUNES}T07:10:00Z`).consultar(rosa, 'mi_informe', {
        tipo: 'semana',
        del: masDias(LUNES, -3),
      }),
    );
    expect(informe.periodo).toMatchObject({
      desde: masDias(LUNES, -7),
      hasta: masDias(LUNES, -1),
    });
    const ventas = informe.cifras.find((c) => c.indicador === 'ventas');
    expect(ventas).toMatchObject({ total: 370_000, anterior: 210_000 });
  });

  it('lo bajo mínimo no llega si nadie lo enciende', async () => {
    expect(await deTipo(rosa, 'almacen.bajo_minimo')).toEqual([]);
  });
});

describe('el reloj, otros días', () => {
  it('sin datos del periodo, no manda informes', async () => {
    losDatos(await api.ejecutar(rosa, 'leer_avisos', {}));
    const antes = (await susAvisos(rosa)).filter((a) => a.tipo.startsWith('informe.')).length;
    // Un lunes de hace casi dos años: ni cajas ni género.
    expect(await latirEl('2025-01-06')).toMatchObject({ diario: true });
    const despues = (await susAvisos(rosa)).filter((a) => a.tipo.startsWith('informe.')).length;
    expect(despues).toBe(antes);
  });

  it('Tu día de hoy deja viejo el de ayer: la campana no se llena', async () => {
    const [dia] = await deTipo(rosa, 'informe.dia');
    expect(dia).toBeDefined();
    // Una caja para el martes, y el reloj del miércoles.
    const martes = masDias(LUNES, 1);
    losDatos(
      await apiEl(`${martes}T21:00:00Z`).ejecutar(rosa, 'cerrar_la_caja', {
        fecha: martes,
        total_centimos: 90_000,
      }),
    );
    expect(await latirEl(masDias(LUNES, 2))).toMatchObject({ diario: true });
    const dias = await deTipo(rosa, 'informe.dia');
    expect(dias).toHaveLength(1);
    expect(dias[0]?.titulo).toMatch(/^Tu día en Bar Centro: el martes /);
  });

  it('lo bajo mínimo, encendido, llega con sus nombres y por correo', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_mis_avisos', {
        tipo: 'almacen.bajo_minimo',
        en_la_app: true,
        por_correo: true,
      }),
    );
    const antes = correo.mandados.length;
    expect(await latirEl('2025-01-07')).toMatchObject({ diario: true });
    const [bajo] = await deTipo(rosa, 'almacen.bajo_minimo');
    expect(bajo?.detalle).toContain('Tomate R2');
    expect(bajo?.ir).toBe('/almacen/productos/bajo-minimo');
    expect(
      correo.mandados.slice(antes).some((c) => c.para === ROSA && c.asunto.includes('bajo mínimo')),
    ).toBe(true);
  });
});

// ── La nota en Google ────────────────────────────────────────────────────────

describe('la nota en Google', () => {
  const G = '2025-01-08';

  beforeAll(async () => {
    losDatos(
      await api.ejecutar(rosa, 'elegir_mi_local_de_google', {
        id: 'lugar-de-prueba',
        sesion: null,
        usar_su_posicion: false,
      }),
    );
  });

  it('al enlazarla se apunta la nota del día', async () => {
    const notas = await comoDuena<{ valoracion: string }>(
      `select valoracion::text as valoracion from estook.nota_en_google where local_id = $1`,
      [barCentro],
    );
    expect(notas.map((n) => n.valoracion)).toEqual(['4.4']);
  });

  it('el reloj la pone al día a los tres días, deja su evolución y avisa si baja', async () => {
    await comoDuena(
      `update estook.local set google_leido_en = $2::timestamptz - interval '4 days' where id = $1`,
      [barCentro, `${G}T07:10:00Z`],
    );
    google.cambiar({ valoracion: 4.2, resenas: 220 });
    const llamadas = google.llamadas.n;

    expect(await latirEl(G)).toMatchObject({ diario: true, notas: 1 });
    expect(google.llamadas.n).toBe(llamadas + 1);

    const [aviso] = await deTipo(rosa, 'google.nota');
    expect(aviso).toMatchObject({
      titulo: 'Tu nota en Google baja de 4,4 a 4,2',
      ir: '/negocio/resenas',
    });
    // A quien no ve Negocio, no.
    expect(await deTipo(marcos, 'google.nota')).toEqual([]);

    const vista = losDatos<{
      nota: { valoracion: number; resenas: number } | null;
      evolucion: { dia: string; valoracion: number }[];
    }>(await api.consultar(rosa, 'mi_nota_en_google'));
    expect(vista.nota).toMatchObject({ valoracion: 4.2, resenas: 220 });
    // La nota de cada día que se leyó. Negocio enseña medio año, contado desde hoy:
    // la del reloj de enero de 2025 queda fuera de la vista, y está en la tabla.
    expect(vista.evolucion.map((e) => [e.dia, e.valoracion])).toEqual([[HOY, 4.4]]);
    const notas = await comoDuena<{ dia: string; valoracion: string }>(
      `select to_char(dia, 'YYYY-MM-DD') as dia, valoracion::text as valoracion
         from estook.nota_en_google where local_id = $1 order by dia`,
      [barCentro],
    );
    expect(notas.map((n) => [n.dia, n.valoracion])).toEqual([
      [G, '4.2'],
      [HOY, '4.4'],
    ]);
  });

  it('y no la vuelve a pedir antes de tres días', async () => {
    const llamadas = google.llamadas.n;
    expect(await latirEl('2025-01-09')).toMatchObject({ diario: true, notas: 0 });
    expect(google.llamadas.n).toBe(llamadas);
  });

  it('al mirarla, si tiene más de un día, se trae otra vez; si no, no', async () => {
    const llamadas = google.llamadas.n;
    // La última lectura es del 8 de enero de 2025: toca.
    expect(
      losDatos<{ actualizada: boolean }>(await api.ejecutar(rosa, 'mirar_mi_nota_de_google', {})),
    ).toEqual({ actualizada: true });
    expect(
      losDatos<{ actualizada: boolean }>(await api.ejecutar(rosa, 'mirar_mi_nota_de_google', {})),
    ).toEqual({ actualizada: false });
    expect(google.llamadas.n).toBe(llamadas + 1);
  });

  it('la nota la ve quien ve Negocio, y nadie más', async () => {
    expect(elFallo(await api.consultar(marcos, 'mi_nota_en_google'))).toBe('sin_permiso');
    expect(elFallo(await api.ejecutar(marcos, 'mirar_mi_nota_de_google', {}))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'mi_informe', { tipo: 'dia' }))).toBe('sin_permiso');
  });

  it('nadie escribe la nota de un local a mano: solo el sistema', async () => {
    const [rosaId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [ROSA],
    );
    await expect(
      base.comoPersona(rosaId?.id ?? '', () =>
        base.bd.query(
          `insert into estook.nota_en_google (local_id, dia, valoracion) values ($1, '2025-02-01', 5)`,
          [barCentro],
        ),
      ),
    ).rejects.toThrow();
  });

  it('una cuenta que no paga no se mira ni recibe nada del reloj', async () => {
    await comoDuena(
      `update estook.suscripcion set de_la_casa = false, estado = 'pendiente_de_pago'
        where organizacion_id = (select organizacion_id from estook.local where id = $1)`,
      [barCentro],
    );
    await comoDuena(
      `update estook.local set google_leido_en = '2024-12-01T00:00:00Z' where id = $1`,
      [barCentro],
    );
    const llamadas = google.llamadas.n;
    expect(await latirEl('2025-01-13')).toMatchObject({ diario: true, avisos: 0, notas: 0 });
    expect(google.llamadas.n).toBe(llamadas);
  });
});
