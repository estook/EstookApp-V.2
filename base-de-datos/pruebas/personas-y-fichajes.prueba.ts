import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * H1 · Personas y fichajes (decisiones 0057, 0062 y 0068), por la API de verdad.
 *
 *   · la persona **sin correo**, y ponérselo después sin unir a nadie por error
 *   · **el aparato del local**: ponerlo, ficharlo todo con un PIN, pararse ante el
 *     que prueba PIN al azar, y dejar de valer al quitarlo
 *   · **la pausa**, que no cuenta como trabajo salvo que el local diga lo contrario
 *   · **la corrección** que deja lo de antes y avisa al trabajador
 *   · **el registro para la Inspección**, con su huella, y los PDF con su motor
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let sinMotor: ApiDePrueba;
const motor = pdfDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

let rosa: string;
let centro: string;
let organizacion: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { pdf: motor });
  sinMotor = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  centro = await base.localPorCodigo('bar-centro');
  const { rows } = await base.bd.query<{ organizacion_id: string }>(
    'select organizacion_id from estook.local where id = $1',
    [centro],
  );
  organizacion = rows[0]?.organizacion_id ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

// ── La persona sin correo ────────────────────────────────────────────────────

let omar: { personaId: string; pin: string };

describe('la persona sin correo (0057)', () => {
  it('se da de alta con su nombre y un PIN, sin correo', async () => {
    const salida = losDatos<{ personaId: string; pin: string | null; yaExistia: boolean }>(
      await api.ejecutar(rosa, 'invitar_persona', {
        nombre: 'Omar',
        apellidos: 'Sanz',
        rol: 'cocinero',
        local_id: centro,
        organizacion_id: organizacion,
      }),
    );
    expect(salida.yaExistia).toBe(false);
    expect(salida.pin).toMatch(/^\d{6}$/);
    omar = { personaId: salida.personaId, pin: salida.pin ?? '' };

    const [fila] = await comoDuena<{ correo: string | null }>(
      'select correo from estook.persona where id = $1',
      [omar.personaId],
    );
    expect(fila?.correo).toBeNull();
  });

  it('dos personas sin correo son dos personas, aunque se llamen igual', async () => {
    const otro = losDatos<{ personaId: string }>(
      await api.ejecutar(rosa, 'invitar_persona', {
        nombre: 'Omar',
        apellidos: 'Sanz',
        rol: 'camarero',
        local_id: centro,
        organizacion_id: organizacion,
      }),
    );
    expect(otro.personaId).not.toBe(omar.personaId);
  });

  it('sin correo, su puesto tiene que ser de un local: no tendría dónde entrar', async () => {
    const fuera = await api.ejecutar(rosa, 'invitar_persona', {
      nombre: 'Sin sitio',
      rol: 'direccion',
      organizacion_id: organizacion,
    });
    expect(elFallo(fuera)).toBe('faltan_datos');
  });

  it('su ficha dice que no tiene correo, y quien da acceso se lo puede poner', async () => {
    const ficha = losDatos<{ sinCorreo: boolean; puedePonerCorreo: boolean }>(
      await api.consultar(rosa, 'una_persona', { persona_id: omar.personaId }),
    );
    expect(ficha.sinCorreo).toBe(true);
    expect(ficha.puedePonerCorreo).toBe(true);
  });

  it('el correo de otra persona no se le pone: no se une a nadie por error', async () => {
    const choca = await api.ejecutar(rosa, 'poner_correo', {
      persona_id: omar.personaId,
      correo: MARCOS,
    });
    expect(elFallo(choca)).toBe('correo_de_otra_persona');
  });
});

// ── El aparato del local para fichar ─────────────────────────────────────────

let llave: string;

describe('el aparato del local para fichar (0068)', () => {
  it('lo pone quien lleva el local, y la llave solo se ve una vez', async () => {
    const puesto = losDatos<{ terminalId: string; llave: string }>(
      await api.ejecutar(rosa, 'poner_aparato_para_fichar', { nombre: 'Tablet de la entrada' }),
    );
    llave = puesto.llave;
    expect(llave.length).toBeGreaterThan(20);

    // De la llave solo se guarda su huella.
    const [fila] = await comoDuena<{ huella: string }>(
      'select huella from estook.terminal where id = $1',
      [puesto.terminalId],
    );
    expect(fila?.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(fila?.huella).not.toBe(llave);
  });

  it('un cocinero no lo puede poner', async () => {
    const marcos = await api.entrar(MARCOS);
    expect(
      elFallo(await api.ejecutar(marcos, 'poner_aparato_para_fichar', { nombre: 'La mía' })),
    ).toBe('sin_permiso');
  });

  it('sin sesión de nadie, con su llave, dice de qué local es', async () => {
    const aparato = losDatos<{ nombre: string; local: string }>(
      await api.consultar(null, 'el_aparato_para_fichar', { llave }),
    );
    expect(aparato.nombre).toBe('Tablet de la entrada');
    expect(aparato.local).toBe('Bar Centro');
  });

  it('quien no tiene correo ficha la entrada, la pausa, la vuelta y la salida con su PIN', async () => {
    const quien = losDatos<{ nombre: string; estado: string }>(
      await api.ejecutar(null, 'quien_ficha_aqui', { llave, pin: omar.pin }),
    );
    expect(quien.nombre).toBe('Omar S.');
    expect(quien.estado).toBe('fuera');

    const fichar = async (que: string) =>
      losDatos<{ estado: string }>(
        await api.ejecutar(null, 'fichar_aqui', { llave, pin: omar.pin, que }),
      ).estado;

    expect(await fichar('entrada')).toBe('dentro');
    expect(await fichar('pausa')).toBe('en_pausa');
    expect(await fichar('vuelta')).toBe('dentro');
    expect(await fichar('salida')).toBe('fuera');

    const [fichaje] = await comoDuena<{ sin_donde: string; terminal: boolean; pausas: number }>(
      `select f.entro_sin_donde as sin_donde, f.terminal_id is not null as terminal,
              (select count(*)::int from estook.pausa p where p.fichaje_id = f.id) as pausas
         from estook.fichaje f where f.persona_id = $1`,
      [omar.personaId],
    );
    expect(fichaje).toEqual({ sin_donde: 'aparato_del_local', terminal: true, pausas: 1 });
  });

  it('entrar dos veces dice que ya está dentro, y no duplica nada', async () => {
    losDatos(await api.ejecutar(null, 'fichar_aqui', { llave, pin: omar.pin, que: 'entrada' }));
    expect(
      elFallo(await api.ejecutar(null, 'fichar_aqui', { llave, pin: omar.pin, que: 'entrada' })),
    ).toBe('ya_hecho');
    losDatos(await api.ejecutar(null, 'fichar_aqui', { llave, pin: omar.pin, que: 'salida' }));
  });

  it('un PIN que no es de nadie no dice de quién podría ser, y diez seguidos paran el aparato', async () => {
    const malo = async () =>
      elFallo(await api.ejecutar(null, 'quien_ficha_aqui', { llave, pin: '000000' }));
    for (let i = 0; i < 10; i++) expect(await malo()).toBe('pin_desconocido');
    expect(await malo()).toBe('aparato_parado');
    // Y con uno bueno, también: está parado para todos, cinco minutos.
    expect(elFallo(await api.ejecutar(null, 'quien_ficha_aqui', { llave, pin: omar.pin }))).toBe(
      'aparato_parado',
    );
    await comoDuena('update estook.terminal set parado_hasta = null, intentos_fallidos = 0');
  });

  it('una llave inventada no abre nada', async () => {
    expect(
      elFallo(await api.consultar(null, 'el_aparato_para_fichar', { llave: 'x'.repeat(43) })),
    ).toBe('aparato_retirado');
  });

  it('al quitarlo, deja de valer al momento', async () => {
    const lista = losDatos<{ terminalId: string }[]>(
      await api.consultar(rosa, 'aparatos_para_fichar', {}),
    );
    expect(lista).toHaveLength(1);
    losDatos(
      await api.ejecutar(rosa, 'quitar_aparato_para_fichar', {
        terminal_id: lista[0]?.terminalId,
      }),
    );
    expect(elFallo(await api.ejecutar(null, 'quien_ficha_aqui', { llave, pin: omar.pin }))).toBe(
      'aparato_retirado',
    );
  });
});

// ── La pausa y lo que se trabaja ─────────────────────────────────────────────

describe('la pausa de descanso (0068)', () => {
  it('desde el móvil: se empieza y se vuelve, una a la vez', async () => {
    const sara = await api.entrar(SARA);
    losDatos(await api.ejecutar(sara, 'fichar_entrada', { sin_donde: 'sin_senal' }));
    losDatos(await api.ejecutar(sara, 'empezar_pausa', {}));
    expect(elFallo(await api.ejecutar(sara, 'empezar_pausa', {}))).toBe('ya_hecho');

    const yo = losDatos<{ enPausaDesde: string | null }>(
      await api.consultar(sara, 'mi_fichaje', {}),
    );
    expect(yo.enPausaDesde).not.toBeNull();

    losDatos(await api.ejecutar(sara, 'acabar_pausa', {}));
    expect(elFallo(await api.ejecutar(sara, 'acabar_pausa', {}))).toBe('no_existe');
    losDatos(await api.ejecutar(sara, 'fichar_salida', { sin_donde: 'sin_senal' }));
  });

  it('irse con la pausa abierta la cierra', async () => {
    const sara = await api.entrar(SARA);
    losDatos(await api.ejecutar(sara, 'fichar_entrada', { sin_donde: 'sin_senal' }));
    losDatos(await api.ejecutar(sara, 'empezar_pausa', {}));
    losDatos(await api.ejecutar(sara, 'fichar_salida', { sin_donde: 'sin_senal' }));
    const saraId = await base.personaPorCorreo(SARA);
    expect(
      await comoDuena('select 1 from estook.pausa where persona_id = $1 and acabo_en is null', [
        saraId,
      ]),
    ).toHaveLength(0);
  });

  it('lo trabajado no cuenta la pausa, salvo que el local diga que cuenta', async () => {
    const saraId = await base.personaPorCorreo(SARA);
    const [f] = await comoDuena<{ id: string }>(
      `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en, salio_en,
                                   entro_sin_donde, salio_sin_donde)
       values ($1, $2, current_date - 3, now() - interval '3 days 3 hours', now() - interval '3 days',
               'sin_senal', 'sin_senal')
       returning id::text as id`,
      [centro, saraId],
    );
    await comoDuena(
      `insert into estook.pausa (fichaje_id, local_id, persona_id, empezo_en, acabo_en)
       values ($1::bigint, $2, $3, now() - interval '3 days 2 hours', now() - interval '3 days 1 hour 30 minutes')`,
      [f?.id, centro, saraId],
    );
    const trabajado = async () =>
      (
        await comoDuena<{ s: string }>(
          `select estook.segundos_trabajados(f, now())::text as s from estook.fichaje f where f.id = $1::bigint`,
          [f?.id],
        )
      )[0]?.s;

    // Tres horas, menos media de pausa.
    expect(Number(await trabajado())).toBe(9000);

    losDatos(
      await api.ejecutar(rosa, 'guardar_las_pausas', { en_uso: true, cuenta_como_trabajo: true }),
    );
    expect(Number(await trabajado())).toBe(10800);
    losDatos(
      await api.ejecutar(rosa, 'guardar_las_pausas', { en_uso: true, cuenta_como_trabajo: false }),
    );
  });

  it('un local que no usa pausas no deja empezar una', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_las_pausas', { en_uso: false, cuenta_como_trabajo: false }),
    );
    const sara = await api.entrar(SARA);
    losDatos(await api.ejecutar(sara, 'fichar_entrada', { sin_donde: 'sin_senal' }));
    expect(elFallo(await api.ejecutar(sara, 'empezar_pausa', {}))).toBe('sin_permiso');
    losDatos(await api.ejecutar(sara, 'fichar_salida', { sin_donde: 'sin_senal' }));
    losDatos(
      await api.ejecutar(rosa, 'guardar_las_pausas', { en_uso: true, cuenta_como_trabajo: false }),
    );
  });
});

// ── La corrección que no borra ───────────────────────────────────────────────

describe('la corrección de un fichaje (0062)', () => {
  it('deja lo de antes a la vista, y al trabajador le llega el aviso', async () => {
    const [suyo] = await comoDuena<{ id: string; entro: string }>(
      `select id::text as id, entro_en::text as entro from estook.fichaje
        where persona_id = $1 order by id limit 1`,
      [omar.personaId],
    );
    const nueva = new Date(Date.now() - 5 * 3_600_000).toISOString();
    losDatos(
      await api.ejecutar(rosa, 'corregir_fichaje', {
        fichaje_id: suyo?.id,
        entro_en: nueva,
        motivo: 'Entró antes y se le olvidó fichar',
      }),
    );

    const fichajes = losDatos<{
      fichajes: {
        fichajeId: string;
        correcciones: { numero: number; motivo: string; quien: string }[];
      }[];
    }>(await api.consultar(rosa, 'fichajes_de_una_persona', { persona_id: omar.personaId }));
    const corregido = fichajes.fichajes.find((f) => f.fichajeId === suyo?.id);
    expect(corregido?.correcciones).toHaveLength(1);
    expect(corregido?.correcciones[0]?.motivo).toBe('Entró antes y se le olvidó fichar');
    expect(corregido?.correcciones[0]?.quien).toBe('Rosa');

    const avisos = await comoDuena<{ titulo: string; ir: string }>(
      `select titulo, ir from estook.aviso where persona_id = $1 and tipo = 'fichaje.corregido'`,
      [omar.personaId],
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.titulo).toMatch(/^Rosa ha corregido tu fichaje del/);
    expect(avisos[0]?.ir).toBe('/mis-fichajes');
  });
});

// ── El registro para la Inspección y los PDF ────────────────────────────────

function deBase64(texto: string): string {
  return Buffer.from(texto, 'base64').toString('utf8');
}

describe('el registro de jornada y los PDF (0068)', () => {
  const hoy = new Date(Date.now()).toISOString().slice(0, 10);
  const haceUnMes = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);

  it('la hoja lleva cada fichaje, desde dónde se hizo y lo corregido, con su huella', async () => {
    const hoja = losDatos<{ nombre: string; tipo: string; base64: string; huella: string }>(
      await api.consultar(rosa, 'registro_de_jornada', {
        desde: haceUnMes,
        hasta: hoy,
        formato: 'hoja',
      }),
    );
    expect(hoja.tipo).toBe('text/csv');
    expect(hoja.huella).toMatch(/^[0-9a-f]{64}$/);
    const texto = deBase64(hoja.base64);
    expect(texto).toContain('Persona;Día;Entrada;Salida');
    expect(texto).toContain('Omar Sanz');
    expect(texto).toContain('Aparato del local');
    expect(texto).toContain('Entró antes y se le olvidó fichar');
  });

  it('el PDF lleva la huella de la misma hoja', async () => {
    const pdf = losDatos<{ tipo: string; base64: string; huella: string }>(
      await api.consultar(rosa, 'registro_de_jornada', {
        desde: haceUnMes,
        hasta: hoy,
        formato: 'pdf',
      }),
    );
    expect(pdf.tipo).toBe('application/pdf');
    expect(deBase64(pdf.base64).startsWith('%PDF-')).toBe(true);
    const pagina = motor.hechos.at(-1);
    expect(pagina?.html).toContain('Registro de jornada');
    expect(pagina?.html).toContain(pdf.huella);
    expect(pagina?.opciones.apaisado).toBe(true);
  });

  it('un cocinero no saca el registro del local', async () => {
    const marcos = await api.entrar(MARCOS);
    expect(
      elFallo(
        await api.consultar(marcos, 'registro_de_jornada', {
          desde: haceUnMes,
          hasta: hoy,
          formato: 'hoja',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('el informe también sale en PDF, y sin motor se dice que no está encendido', async () => {
    const pdf = losDatos<{ nombre: string }>(
      await api.consultar(rosa, 'mi_informe_en_pdf', { tipo: 'semana' }),
    );
    expect(pdf.nombre).toMatch(/^tu-semana-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(motor.hechos.at(-1)?.html).toContain('Tu semana');

    const rosaSinMotor = await sinMotor.entrar(ROSA);
    expect(
      elFallo(await sinMotor.consultar(rosaSinMotor, 'mi_informe_en_pdf', { tipo: 'semana' })),
    ).toBe('pdf_sin_encender');
  });

  it('si el motor está ocupado, se dice y no se rompe nada', async () => {
    motor.ocupar(1);
    expect(elFallo(await api.consultar(rosa, 'mi_informe_en_pdf', { tipo: 'dia' }))).toBe(
      'pdf_no_disponible',
    );
  });
});
