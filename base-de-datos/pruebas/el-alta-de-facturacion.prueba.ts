import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import { EL_SISTEMA } from '../../servidor/facturacion/sistema.ts';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T6 · 1 · El alta de facturación** (decisión 0126; Anexo 4.3; migración 0099), contra la base
 * y con el Verifacti de mentira:
 *
 *   · de fábrica, **solo la dirección**; ella se la da a quien manda en el local (0128), y a
 *     un camarero, nada; la base no deja que nadie más se la dé
 *   · el NIF, con su forma y en Hacienda, **otra vez en el servidor**; el nombre, el de Hacienda
 *   · un paso no se salta, y **el País Vasco, Navarra, el SII y Ceuta paran**, con su motivo
 *   · las series: distintas, sin chocar con otro local de la empresa, y **solo se insertan**
 *   · el alta en Verifacti, que si no contesta no apunta nada
 *   · la autorización: **solo el titular**, una firma en curso se recupera (no se paga otra)
 *   · el segundo local usa la empresa sin escribir nada; otra cuenta no puede usar el NIF
 *   · el admin: la empresa de pruebas, **que no se firma** (0128), las once condiciones y
 *     **pasar a real, que no pasa**
 *   · sin la clave de Verifacti, se dice; y la declaración, un borrador con la versión de Verifacti
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const pdf = pdfDeMentira();

let rosa: string;
let sara: string;
let elena: string;
let vera: string;
let admin: string;
let barCentro: string;
let barPuerto: string;
let barRibera: string;
let rosaId: string;
let elenaId: string;
let veraId: string;
let pabloId: string;

interface Como {
  estado: 'lista' | 'parada' | 'en_marcha';
  paso?: number;
  parada?: { motivo: string; todaviaNo: boolean };
}
interface MiFacturacion {
  conectada: boolean;
  como: Como;
  empresa: {
    id: string;
    nif: string;
    nombre: string;
    provincia: string;
    enVerifacti: boolean;
    modalidad: string;
    autorizacion: { estado: string; firmante: string | null };
  } | null;
  series: Record<string, string | null>;
  propuestas: Record<string, string>;
  soyElTitular: boolean;
  pideTuFactura: boolean;
  otrasEmpresas: { id: string; nombre: string }[];
  puedenSerTitular: { id: string; nombre: string }[];
  quienLaLleva:
    | {
        personaId: string;
        nombre: string;
        rol: string;
        siempre: boolean;
        laLleva: boolean;
        esTitular: boolean;
      }[]
    | null;
}

const mia = async (token: string) =>
  losDatos<MiFacturacion>(await api.consultar(token, 'mi_facturacion'));

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

async function aLocal(token: string, localId: string) {
  losDatos(await api.ejecutar(token, 'cambiar_de_contexto', { local_id: localId }));
}

const empresaDeRosa = {
  empresa_id: null,
  nif: 'b12345674',
  nombre: 'Ikatz restauracion',
  calle: 'Calle Mayor',
  numero: '1',
  codigo_postal: '28013',
  municipio: 'Madrid',
};

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, pdf });
  rosa = await api.entrar('rosa@ejemplo.estook.com');
  sara = await api.entrar('sara@ejemplo.estook.com');
  elena = await api.entrar('elena@ejemplo.estook.com');
  vera = await api.entrar('vera@ejemplo.estook.com');
  barCentro = await base.localPorCodigo('bar-centro');
  barPuerto = await base.localPorCodigo('bar-puerto');
  barRibera = await base.localPorCodigo('bar-ribera');
  rosaId = await base.personaPorCorreo('rosa@ejemplo.estook.com');
  elenaId = await base.personaPorCorreo('elena@ejemplo.estook.com');
  veraId = await base.personaPorCorreo('vera@ejemplo.estook.com');
  pabloId = await base.personaPorCorreo('pablo@ejemplo.estook.com');
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, new Date(Date.now())),
    }),
  );
  admin = entrada.token;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('quién hace el alta (Roles 1.12 y 0128)', () => {
  it('la gerente a quien se la han dado la ve en el paso 1; un camarero no', async () => {
    const lo = await mia(rosa);
    expect(lo.conectada).toBe(true);
    expect(lo.como).toMatchObject({ estado: 'en_marcha', paso: 1 });
    expect(lo.propuestas.ticket).toBe('T-BC');
    expect(lo.puedenSerTitular.map((p) => p.id)).toContain(rosaId);
    // No es la dirección: no ve a quién se le ha dado.
    expect(lo.quienLaLleva).toBeNull();
    expect(elFallo(await api.consultar(sara, 'mi_facturacion'))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(sara, 'guardar_la_empresa', { ...empresaDeRosa, titular_id: rosaId }),
      ),
    ).toBe('sin_permiso');
  });
});

describe('paso 1 · la empresa', () => {
  it('un NIF mal escrito se dice sin preguntar a Hacienda', async () => {
    const antes = verifacti.llamadas.length;
    expect(elFallo(await api.ejecutar(rosa, 'comprobar_un_nif', { nif: 'B12345670' }))).toBe(
      'nif_no_vale',
    );
    expect(verifacti.llamadas.length).toBe(antes);
  });

  it('Hacienda dice si lo conoce, y con qué nombre', async () => {
    expect(
      losDatos(await api.ejecutar(rosa, 'comprobar_un_nif', { nif: ' b-12.345.674 ' })),
    ).toEqual({
      nif: 'B12345674',
      persona: 'juridica',
      enHacienda: 'identificado',
      nombreEnHacienda: 'IKATZ RESTAURACION SL',
    });
    expect(
      losDatos<{ enHacienda: string }>(
        await api.ejecutar(rosa, 'comprobar_un_nif', { nif: 'B84935048' }),
      ).enHacienda,
    ).toBe('identificado');
    expect(
      losDatos<{ enHacienda: string }>(
        await api.ejecutar(rosa, 'comprobar_un_nif', { nif: 'A58818501' }),
      ).enHacienda,
    ).toBe('no_identificado');
  });

  it('el titular tiene que poder hacer el alta: un camarero no autoriza nada', async () => {
    const saraId = await base.personaPorCorreo('sara@ejemplo.estook.com');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'guardar_la_empresa', { ...empresaDeRosa, titular_id: saraId }),
      ),
    ).toBe('titular_sin_permiso');
  });

  it('se guarda con el nombre de Hacienda y la provincia del código postal', async () => {
    const hecho = losDatos<{ nombre: string; foralPropuesta: string | null }>(
      await api.ejecutar(rosa, 'guardar_la_empresa', { ...empresaDeRosa, titular_id: rosaId }),
    );
    expect(hecho).toMatchObject({ nombre: 'IKATZ RESTAURACION SL', foralPropuesta: null });
    const lo = await mia(rosa);
    expect(lo.empresa).toMatchObject({ nif: 'B12345674', provincia: 'Madrid' });
    expect(lo.soyElTitular).toBe(true);
    expect(lo.como).toMatchObject({ estado: 'en_marcha', paso: 2 });
    // Y queda en la auditoría, que solo crece.
    const [rastro] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.auditoria where entidad = 'empresa' and local_id = $1`,
      [barCentro],
    );
    expect(rastro?.cuantos).toBeGreaterThan(0);
  });

  it('un NIF que Hacienda no conoce no se guarda', async () => {
    const lo = await mia(rosa);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'guardar_la_empresa', {
          ...empresaDeRosa,
          empresa_id: lo.empresa?.id,
          nif: 'A58818501',
          titular_id: rosaId,
        }),
      ),
    ).toBe('nif_no_esta_en_hacienda');
  });
});

describe('paso 2 · dónde tributa: el territorio no se pregunta, y lo foral para', () => {
  it('un paso no se salta: sin contestar, no hay series', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_las_series', {
          ticket: 'T-BC',
          factura: 'F-BC',
          rectificativa: 'R-BC',
          otro_programa: false,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('con el domicilio en Bizkaia se para, con su motivo, y no sigue', async () => {
    const { como } = losDatos<{ como: Como }>(
      await api.ejecutar(rosa, 'contestar_donde_tributa', { en_sii: false, foral: 'bizkaia' }),
    );
    expect(como).toMatchObject({
      estado: 'parada',
      parada: { motivo: 'pais_vasco', todaviaNo: true },
    });
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_las_series', {
          ticket: 'T-BC',
          factura: 'F-BC',
          rectificativa: 'R-BC',
          otro_programa: false,
        }),
      ),
    ).toBe('alta_parada');
  });

  it('con el SII no para: va fuera de VERI*FACTU (0127); sin él, vuelve a VERI*FACTU', async () => {
    const sii = losDatos<{ como: Como }>(
      await api.ejecutar(rosa, 'contestar_donde_tributa', { en_sii: true, foral: 'no' }),
    );
    expect(sii.como).toMatchObject({ estado: 'en_marcha', paso: 3 });
    expect((await mia(rosa)).empresa?.modalidad).toBe('fuera_sii');
    // Fuera no se elige: va con el SII.
    expect(
      elFallo(await api.ejecutar(rosa, 'elegir_la_modalidad', { modalidad: 'verifactu' })),
    ).toBe('fuera_solo_con_el_sii');
    const sigue = losDatos<{ como: Como }>(
      await api.ejecutar(rosa, 'contestar_donde_tributa', { en_sii: false, foral: 'no' }),
    );
    expect(sigue.como).toMatchObject({ estado: 'en_marcha', paso: 3 });
    expect((await mia(rosa)).empresa?.modalidad).toBe('verifactu');
  });

  it('sin envío todavía no se puede elegir, y lo dice; VERI*FACTU, sí', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'elegir_la_modalidad', { modalidad: 'sin_envio' })),
    ).toBe('sin_envio_todavia_no');
    losDatos(await api.ejecutar(rosa, 'elegir_la_modalidad', { modalidad: 'verifactu' }));
    expect((await mia(rosa)).empresa?.modalidad).toBe('verifactu');
    // Y fuera sin el SII no se puede ni a mano en la base.
    await expect(
      base.bd.query(
        `update estook.empresa set modalidad = 'fuera_sii'
          where id = (select empresa_id from estook.local where id = $1)`,
        [barCentro],
      ),
    ).rejects.toThrow(/empresa_fuera_solo_con_el_sii/);
  });
});

describe('paso 3 · las series', () => {
  it('distintas, con su forma, y en mayúscula', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_las_series', {
          ticket: 'T-BC',
          factura: 'T-BC',
          rectificativa: 'R-BC',
          otro_programa: false,
        }),
      ),
    ).toBe('series_repetidas');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_las_series', {
          ticket: 'T--BC',
          factura: 'F-BC',
          rectificativa: 'R-BC',
          otro_programa: false,
        }),
      ),
    ).toBe('serie_no_vale');
    const { series } = losDatos<{ series: Record<string, string> }>(
      await api.ejecutar(rosa, 'poner_las_series', {
        ticket: 't-bc',
        factura: 'F-BC',
        rectificativa: 'R-BC',
        otro_programa: true,
      }),
    );
    expect(series).toEqual({ ticket: 'T-BC', factura: 'F-BC', rectificativa: 'R-BC' });
  });

  it('ponerlas igual no apunta nada; cambiar una, una fila más; y nunca se tocan', async () => {
    const cuantas = async () =>
      (
        await comoDuena<{ n: number }>(
          'select count(*)::int as n from facturacion.serie where local_id = $1',
          [barCentro],
        )
      )[0]?.n;
    expect(await cuantas()).toBe(3);
    losDatos(
      await api.ejecutar(rosa, 'poner_las_series', {
        ticket: 'T-BC',
        factura: 'F-BC',
        rectificativa: 'R-BC',
        otro_programa: true,
      }),
    );
    expect(await cuantas()).toBe(3);
    losDatos(
      await api.ejecutar(rosa, 'poner_las_series', {
        ticket: 'TK-BC',
        factura: 'F-BC',
        rectificativa: 'R-BC',
        otro_programa: true,
      }),
    );
    expect(await cuantas()).toBe(4);
    expect((await mia(rosa)).series.ticket).toBe('TK-BC');

    // **Solo se inserta**: ni cambiar, ni borrar, ni vaciar, tampoco como dueña de la base.
    await expect(base.bd.query("update facturacion.serie set prefijo = 'X'")).rejects.toThrow(
      /solo se inserta/,
    );
    await expect(base.bd.query('delete from facturacion.serie')).rejects.toThrow(/solo se inserta/);
    await expect(base.bd.query('truncate facturacion.serie')).rejects.toThrow(/solo se inserta/);
  });

  it('la API no escribe la empresa ni las series a mano', async () => {
    await base.bd.exec('begin');
    try {
      await base.bd.exec('set local role estook_api');
      await expect(base.bd.query("update estook.empresa set nombre = 'X'")).rejects.toThrow();
    } finally {
      await base.bd.exec('rollback');
    }
    await base.bd.exec('begin');
    try {
      await base.bd.exec('set local role estook_api');
      await expect(
        base.bd.query(
          `insert into facturacion.serie (local_id, empresa_id, tipo, prefijo)
           select local_id, empresa_id, tipo, 'Z' from facturacion.serie limit 1`,
        ),
      ).rejects.toThrow();
    } finally {
      await base.bd.exec('rollback');
    }
  });
});

describe('paso 4 · el alta en Verifacti', () => {
  it('si Verifacti no contesta, se dice y no se apunta nada', async () => {
    verifacti.callar(true);
    expect(elFallo(await api.ejecutar(rosa, 'dar_de_alta_en_verifacti', {}))).toBe(
      'verifacti_no_contesta',
    );
    verifacti.callar(false);
    expect((await mia(rosa)).empresa?.enVerifacti).toBe(false);
  });

  it('se hace sola, en pruebas, y repetirla no la repite', async () => {
    losDatos(await api.ejecutar(rosa, 'dar_de_alta_en_verifacti', {}));
    const lo = await mia(rosa);
    expect(lo.empresa?.enVerifacti).toBe(true);
    expect(lo.como).toMatchObject({ estado: 'en_marcha', paso: 5 });
    expect(verifacti.llamadas).toContain('alta test B12345674');
    const altas = verifacti.llamadas.filter((l) => l.startsWith('alta')).length;
    losDatos(await api.ejecutar(rosa, 'dar_de_alta_en_verifacti', {}, crypto.randomUUID()));
    expect(verifacti.llamadas.filter((l) => l.startsWith('alta')).length).toBe(altas);
  });
});

describe('paso 5 · la autorización de una sociedad, con su certificado', () => {
  it('una sociedad no firma en línea', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'firmar_en_linea', {
          nombre: 'Rosa',
          apellidos: 'Iglesias',
          calle: 'Mayor',
          numero: '1',
          municipio: 'Madrid',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('el titular descarga el modelo relleno, y un PDF firmado lo deja lista', async () => {
    const modelo = losDatos<{ tipo: string; base64: string }>(
      await api.ejecutar(rosa, 'el_modelo_para_firmar', {
        nombre: 'Rosa Iglesias',
        nif: '12345678Z',
        calle: 'Mayor',
        numero: '1',
        municipio: 'Madrid',
      }),
    );
    expect(modelo.tipo).toBe('application/pdf');
    expect(atob(modelo.base64).startsWith('%PDF-')).toBe(true);

    expect(
      elFallo(
        await api.ejecutar(rosa, 'mandar_el_modelo_firmado', {
          base64: btoa('esto no es un pdf, es otra cosa que alguien subió por error'.repeat(3)),
          firmante: 'Rosa Iglesias',
        }),
      ),
    ).toBe('faltan_datos');

    const firmado = losDatos<{ estado: string }>(
      await api.ejecutar(rosa, 'mandar_el_modelo_firmado', {
        base64: btoa(`%PDF-1.7 firmado ${'x'.repeat(120)}`),
        firmante: 'Rosa Iglesias',
      }),
    );
    expect(firmado.estado).toBe('correcta');
    const lo = await mia(rosa);
    expect(lo.como).toEqual({ estado: 'lista' });
    expect(lo.empresa?.autorizacion.firmante).toBe('Rosa Iglesias');
  });
});

describe('quién la lleva (0128): de fábrica, solo la dirección', () => {
  it('la dirección ve quién manda en el local, y nadie más', async () => {
    await aLocal(elena, barRibera);
    const lo = await mia(elena);
    const nombres = (lo.quienLaLleva ?? []).map((p) => p.nombre);
    expect(lo.quienLaLleva?.find((p) => p.personaId === elenaId)).toMatchObject({
      rol: 'direccion',
      siempre: true,
      laLleva: true,
    });
    // A Vera se la dio (la semilla).
    expect(lo.quienLaLleva?.find((p) => p.personaId === veraId)).toMatchObject({
      rol: 'gerente',
      siempre: false,
      laLleva: true,
    });
    expect(lo.quienLaLleva?.find((p) => p.nombre === 'Asesoria Cuenta Clara')).toMatchObject({
      rol: 'gestoria',
      laLleva: false,
    });
    expect(nombres).toContain('Asesoria Cuenta Clara');
    // Ni la sala, ni la cocina, ni el area manager de otra zona.
    expect(nombres).not.toContain('Nuria Sanmartin');
    expect(nombres).not.toContain('Luis Amunarriz');
    expect(nombres).not.toContain('Ignacio Bordas');
  });

  it('se la quita a la gerente y deja de verla; se la vuelve a dar y la ve', async () => {
    await aLocal(vera, barRibera);
    losDatos(
      await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: veraId, la_lleva: false }),
    );
    expect(elFallo(await api.consultar(vera, 'mi_facturacion'))).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: veraId, la_lleva: true }),
    );
    const suya = await mia(vera);
    expect(suya.como).toMatchObject({ estado: 'en_marcha', paso: 1 });
    expect(suya.quienLaLleva).toBeNull();
    expect(suya.puedenSerTitular.map((p) => p.id)).toContain(veraId);
    // Y las dos cosas quedan en la auditoría.
    const rastro = await comoDuena<{ accion: string }>(
      `select accion from estook.auditoria
        where entidad = 'quien_la_lleva' and local_id = $1 order by id`,
      [barRibera],
    );
    expect(rastro.map((f) => f.accion)).toEqual(['quitar', 'dar']);
  });

  it('solo la dirección la da, y solo a quien manda en ese local', async () => {
    const nuriaId = await base.personaPorCorreo('nuria@ejemplo.estook.com');
    const asesoriaId = await base.personaPorCorreo('asesoria@ejemplo.estook.com');
    expect(
      elFallo(
        await api.ejecutar(vera, 'dar_la_facturacion', { persona_id: asesoriaId, la_lleva: true }),
      ),
    ).toBe('solo_la_direccion');
    expect(
      elFallo(
        await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: nuriaId, la_lleva: true }),
      ),
    ).toBe('no_puede_llevarla');
    // Ni saltándose el servidor: un recorte de la facturación solo lo pone la dirección.
    await expect(
      base.comoPersona(veraId, () =>
        base.bd.query(
          `insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel)
           select m.id, $2, 'accion.alta_de_facturacion', 'ver_y_editar'
             from estook.membresia m where m.persona_id = $1`,
          [asesoriaId, barRibera],
        ),
      ),
    ).rejects.toThrow(/solo_la_direccion/);
  });
});

describe('una persona (autónomo) en la cadena: firma en línea, y solo el titular', () => {
  it('Elena da de alta Bar Puerto con su DNI y es la titular', async () => {
    await aLocal(elena, barPuerto);
    losDatos(
      await api.ejecutar(elena, 'guardar_la_empresa', {
        empresa_id: null,
        nif: '12345678Z',
        nombre: 'Garcia Lopez Ana',
        calle: 'Muelle',
        numero: '3',
        codigo_postal: '15001',
        municipio: 'A Coruña',
        titular_id: elenaId,
      }),
    );
    losDatos(await api.ejecutar(elena, 'contestar_donde_tributa', { en_sii: false, foral: 'no' }));
    losDatos(
      await api.ejecutar(elena, 'poner_las_series', {
        ticket: 'T-BP',
        factura: 'F-BP',
        rectificativa: 'R-BP',
        otro_programa: false,
      }),
    );
    losDatos(await api.ejecutar(elena, 'dar_de_alta_en_verifacti', {}));
    expect((await mia(elena)).como).toMatchObject({ paso: 5 });
  });

  it('el enlace de firma solo lo pide el titular; dos veces, el mismo (no se paga otra)', async () => {
    const firma = {
      nombre: 'Ana',
      apellidos: 'Garcia Lopez',
      calle: 'Muelle',
      numero: '3',
      municipio: 'A Coruña',
    };
    const primera = losDatos<{ estado: string; enlace: string | null; caduca: string | null }>(
      await api.ejecutar(elena, 'firmar_en_linea', firma),
    );
    expect(primera).toMatchObject({
      estado: 'pendiente',
      enlace: 'https://firma.ejemplo/12345678Z',
    });
    expect(primera.caduca).not.toBeNull();
    const segunda = losDatos<{ enlace: string | null }>(
      await api.ejecutar(elena, 'firmar_en_linea', firma, crypto.randomUUID()),
    );
    expect(segunda.enlace).toBe(primera.enlace);
    expect(verifacti.llamadas.filter((l) => l === 'firma 12345678Z')).toHaveLength(1);
  });

  it('el segundo local usa la empresa sin escribir nada, y sus series no chocan', async () => {
    await aLocal(vera, barRibera);
    const lo = await mia(vera);
    expect(lo.otrasEmpresas.map((e) => e.nombre)).toContain('GARCIA LOPEZ ANA');
    const otra = lo.otrasEmpresas.find((e) => e.nombre === 'GARCIA LOPEZ ANA');
    losDatos(await api.ejecutar(vera, 'usar_la_empresa', { empresa_id: otra?.id }));
    losDatos(await api.ejecutar(vera, 'contestar_donde_tributa', { en_sii: false, foral: 'no' }));
    expect(
      elFallo(
        await api.ejecutar(vera, 'poner_las_series', {
          ticket: 'T-BP',
          factura: 'F-BR',
          rectificativa: 'R-BR',
          otro_programa: false,
        }),
      ),
    ).toBe('serie_de_otro_local');
    losDatos(
      await api.ejecutar(vera, 'poner_las_series', {
        ticket: 'T-BR',
        factura: 'F-BR',
        rectificativa: 'R-BR',
        otro_programa: false,
      }),
    );
    // La empresa ya estaba en Verifacti: no se vuelve a dar de alta.
    expect((await mia(vera)).como).toMatchObject({ paso: 5 });
  });

  it('Vera puede hacer el alta, pero no autorizar: no es la titular', async () => {
    expect(
      elFallo(
        await api.ejecutar(vera, 'firmar_en_linea', {
          nombre: 'Ana',
          apellidos: 'Garcia Lopez',
          calle: 'Muelle',
          numero: '3',
          municipio: 'A Coruña',
        }),
      ),
    ).toBe('solo_el_titular');
    // Mirar sí, pero el enlace no le llega.
    const mira = losDatos<{ estado: string; enlace: string | null }>(
      await api.ejecutar(vera, 'mirar_la_autorizacion', {}),
    );
    expect(mira).toEqual(expect.objectContaining({ estado: 'pendiente', enlace: null }));
    // Ni la base la deja empezar, aunque alguien se saltara el servidor.
    await expect(
      base.comoPersona(veraId, () =>
        base.bd.query(
          `select estook.apuntar_la_autorizacion($1, 'pendiente', true, 'en_linea', 'X', null, null)`,
          [barRibera],
        ),
      ),
    ).rejects.toThrow(/solo_el_titular/);
  });

  it('cuando la titular firma, los dos locales quedan listos', async () => {
    verifacti.firmar('12345678Z');
    const mira = losDatos<{ estado: string }>(
      await api.ejecutar(vera, 'mirar_la_autorizacion', {}),
    );
    expect(mira.estado).toBe('correcta');
    expect((await mia(vera)).como).toEqual({ estado: 'lista' });
    expect((await mia(elena)).como).toEqual({ estado: 'lista' });
  });
});

describe('quitársela (0128)', () => {
  it('al titular no se le quita; a los demás, sí', async () => {
    await aLocal(elena, barRibera);
    const [empresa] = await comoDuena<{ id: string }>(
      'select empresa_id as id from estook.local where id = $1',
      [barRibera],
    );
    // Vera pasa a ser la titular: la que firma ante Hacienda no se queda sin la facturación.
    await base.bd.query('update estook.empresa set titular_id = $1 where id = $2', [
      veraId,
      empresa?.id,
    ]);
    expect(
      elFallo(
        await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: veraId, la_lleva: false }),
      ),
    ).toBe('es_el_titular');
    await base.bd.query('update estook.empresa set titular_id = $1 where id = $2', [
      elenaId,
      empresa?.id,
    ]);
    const lo = await mia(elena);
    expect(lo.quienLaLleva?.find((p) => p.personaId === elenaId)?.esTitular).toBe(true);
    losDatos(
      await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: veraId, la_lleva: false }),
    );
    expect(elFallo(await api.consultar(vera, 'mi_facturacion'))).toBe('sin_permiso');
    // Se deja como estaba para lo demás.
    losDatos(
      await api.ejecutar(elena, 'dar_la_facturacion', { persona_id: veraId, la_lleva: true }),
    );
  });
});

describe('una empresa en el SII factura fuera de VERI*FACTU (0127)', () => {
  it('Elena da de alta Bar Playa con el SII: series y lista, sin Verifacti ni firma', async () => {
    const barPlaya = await base.localPorCodigo('bar-playa');
    await aLocal(elena, barPlaya);
    losDatos(
      await api.ejecutar(elena, 'guardar_la_empresa', {
        empresa_id: null,
        nif: 'B84935048',
        nombre: 'Ejemplo Norte',
        calle: 'Paseo',
        numero: '2',
        codigo_postal: '15002',
        municipio: 'A Coruña',
        titular_id: elenaId,
      }),
    );
    losDatos(await api.ejecutar(elena, 'contestar_donde_tributa', { en_sii: true, foral: 'no' }));
    const altas = verifacti.llamadas.filter((l) => l.startsWith('alta')).length;
    losDatos(
      await api.ejecutar(elena, 'poner_las_series', {
        ticket: 'T-PLA',
        factura: 'F-PLA',
        rectificativa: 'R-PLA',
        otro_programa: false,
      }),
    );
    const lo = await mia(elena);
    expect(lo.como).toEqual({ estado: 'lista' });
    expect(lo.empresa?.modalidad).toBe('fuera_sii');
    // Ni alta en Verifacti ni autorización: no hace falta, y no se llama a nadie.
    expect(elFallo(await api.ejecutar(elena, 'dar_de_alta_en_verifacti', {}))).toBe('faltan_datos');
    expect(verifacti.llamadas.filter((l) => l.startsWith('alta')).length).toBe(altas);
  });
});

describe('un NIF es una empresa', () => {
  it('otra cuenta no puede dar de alta el mismo NIF', async () => {
    const pablo = await api.entrar('pablo@ejemplo.estook.com');
    expect(
      elFallo(
        await api.ejecutar(pablo, 'guardar_la_empresa', {
          ...empresaDeRosa,
          titular_id: pabloId,
        }),
      ),
    ).toBe('nif_de_otra_empresa');
  });

  it('el NIF de una empresa ya dada de alta no se cambia', async () => {
    const lo = await mia(rosa);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'guardar_la_empresa', {
          ...empresaDeRosa,
          empresa_id: lo.empresa?.id,
          nif: 'B84935048',
          nombre: 'Ejemplo Norte',
          titular_id: rosaId,
        }),
      ),
    ).toBe('nif_no_se_cambia');
  });
});

describe('«Pide tu factura» (0125)', () => {
  it('viene encendido, y el gerente lo apaga', async () => {
    expect((await mia(rosa)).pideTuFactura).toBe(true);
    losDatos(await api.ejecutar(rosa, 'poner_pide_tu_factura', { encendido: false }));
    expect((await mia(rosa)).pideTuFactura).toBe(false);
  });
});

describe('el admin', () => {
  it('nadie de un restaurante entra en lo del admin', async () => {
    expect(elFallo(await api.consultar(rosa, 'admin_facturacion'))).toBe('sin_permiso');
    expect(
      elFallo(await api.ejecutar(rosa, 'admin_pasar_a_real', { empresa_id: crypto.randomUUID() })),
    ).toBe('sin_permiso');
  });

  it('la empresa de pruebas, solo en una cuenta de la casa', async () => {
    const casaLola = await base.localPorCodigo('casa-lola');
    // Las de ejemplo nacen de la casa (0047): se quita para ver que un cliente no la tiene.
    await base.bd.query(
      `update estook.suscripcion set de_la_casa = false
        where organizacion_id = (select organizacion_id from estook.local where id = $1)`,
      [casaLola],
    );
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_poner_la_empresa_de_pruebas', { local_id: casaLola }),
      ),
    ).toBe('no_es_de_la_casa');
    await base.bd.query(
      `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
       select organizacion_id, 'activa', true from estook.local where id = $1
       on conflict (organizacion_id) do update set de_la_casa = true`,
      [casaLola],
    );
    losDatos(
      await api.ejecutar(admin, 'admin_poner_la_empresa_de_pruebas', { local_id: casaLola }),
    );
    const pablo = await api.entrar('pablo@ejemplo.estook.com');
    const lo = await mia(pablo);
    expect(lo.empresa).toMatchObject({ nif: 'B75777847', enVerifacti: true });
    expect(lo.como).toMatchObject({ estado: 'en_marcha', paso: 3 });
    // No se cambia desde el local.
    expect(
      elFallo(await api.ejecutar(pablo, 'contestar_donde_tributa', { en_sii: false, foral: 'no' })),
    ).toBe('empresa_de_pruebas');
    losDatos(
      await api.ejecutar(pablo, 'poner_las_series', {
        ticket: 'T-CL',
        factura: 'F-CL',
        rectificativa: 'R-CL',
        otro_programa: false,
      }),
    );
    expect((await mia(pablo)).como).toEqual({ estado: 'lista' });
  });

  it('la empresa de pruebas no se firma: es de Verifacti (0128)', async () => {
    const casaLola = await base.localPorCodigo('casa-lola');
    const pablo = await api.entrar('pablo@ejemplo.estook.com');
    // Aunque Verifacti no la dé por autorizada, el alta queda lista: no hay nada que firmar.
    await base.bd.query(
      `update estook.empresa set autorizacion = 'sin_empezar', autorizacion_correcta_en = null
        where de_pruebas`,
    );
    expect((await mia(pablo)).como).toEqual({ estado: 'lista' });
    const llamadas = verifacti.llamadas.length;
    expect(
      elFallo(
        await api.ejecutar(pablo, 'el_modelo_para_firmar', {
          nombre: 'Pablo Ferrer',
          nif: '12345678Z',
          calle: 'Mayor',
          numero: '1',
          municipio: 'Madrid',
        }),
      ),
    ).toBe('empresa_de_pruebas');
    expect(
      elFallo(
        await api.ejecutar(pablo, 'mandar_el_modelo_firmado', {
          base64: btoa(`%PDF-1.7 firmado ${'x'.repeat(120)}`),
          firmante: 'Pablo Ferrer',
        }),
      ),
    ).toBe('empresa_de_pruebas');
    // Ni se ha llamado a Verifacti, ni la base lo apunta aunque alguien se salte el servidor.
    expect(verifacti.llamadas.length).toBe(llamadas);
    await expect(
      base.comoPersona(pabloId, () =>
        base.bd.query(
          `select estook.apuntar_la_autorizacion($1, 'rechazada', true, 'con_certificado', 'X', null, 'Certificado incorrecto')`,
          [casaLola],
        ),
      ),
    ).rejects.toThrow(/empresa_de_pruebas/);
  });

  it('las once condiciones: marcar una pide la prueba, y sin las once nada pasa a real', async () => {
    const lo = losDatos<{
      condiciones: { numero: number }[];
      empresas: { id: string; nombre: string; nif: string; persona: string }[];
    }>(await api.consultar(admin, 'admin_facturacion'));
    expect(lo.condiciones).toHaveLength(11);
    // El NIF de una persona se ve lo justo para reconocerla.
    const deAna = lo.empresas.find((e) => e.persona === 'fisica');
    expect(deAna?.nif).toBe('•••••678Z');
    expect(
      elFallo(await api.ejecutar(admin, 'admin_marcar_condicion', { numero: 1, cumplida: true })),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(admin, 'admin_marcar_condicion', {
        numero: 1,
        cumplida: true,
        nota: 'GitHub, la vuelta de main del 4-nov',
      }),
    );
    const ikatz = lo.empresas.find((e) => e.nombre === 'IKATZ RESTAURACION SL');
    const llamadas = verifacti.llamadas.length;
    expect(
      elFallo(await api.ejecutar(admin, 'admin_pasar_a_real', { empresa_id: ikatz?.id })),
    ).toBe('faltan_condiciones');
    // Y no se ha llamado a Verifacti: dar de alta en producción se cobra.
    expect(verifacti.llamadas.length).toBe(llamadas);
    const [entorno] = await comoDuena<{ entorno: string }>(
      'select entorno from estook.empresa where id = $1',
      [ikatz?.id],
    );
    expect(entorno?.entorno).toBe('pruebas');
  });

  it('con las once y la empresa terminada, pasa a real (y en Verifacti, a producción)', async () => {
    for (let numero = 2; numero <= 11; numero += 1) {
      losDatos(
        await api.ejecutar(admin, 'admin_marcar_condicion', {
          numero,
          cumplida: true,
          nota: 'prueba',
        }),
      );
    }
    const lo = losDatos<{ empresas: { id: string; nombre: string }[] }>(
      await api.consultar(admin, 'admin_facturacion'),
    );
    const pruebas = lo.empresas.find((e) => e.nombre === 'BILBABIT SL');
    expect(
      elFallo(await api.ejecutar(admin, 'admin_pasar_a_real', { empresa_id: pruebas?.id })),
    ).toBe('empresa_sin_terminar');
    const ikatz = lo.empresas.find((e) => e.nombre === 'IKATZ RESTAURACION SL');
    losDatos(await api.ejecutar(admin, 'admin_pasar_a_real', { empresa_id: ikatz?.id }));
    expect(verifacti.llamadas).toContain('alta prod B12345674');
    const [entorno] = await comoDuena<{ entorno: string }>(
      'select entorno from estook.empresa where id = $1',
      [ikatz?.id],
    );
    expect(entorno?.entorno).toBe('real');
    // Se deja como estaba para lo demás.
    await base.bd.query(
      'update plataforma.condicion_para_facturar set cumplida_en = null, cumplida_por = null, nota = null',
    );
  });
});

describe('la declaración responsable (Anexo 4.14)', () => {
  interface Declaracion {
    borrador: boolean;
    sistema: { nombre: string; id: string; version: string };
    verifacti: { version: string } | null;
    productor: { nombre: string | null };
  }

  it('la ve cualquiera que haya entrado; es un borrador; lleva la versión de Verifacti de ahora', async () => {
    const d = losDatos<Declaracion>(await api.consultar(sara, 'la_declaracion_responsable'));
    expect(d.borrador).toBe(true);
    // **Lo que declara es lo que hay en el código**, de un solo sitio.
    expect(d.sistema).toEqual({ ...EL_SISTEMA });
    expect(d.verifacti?.version).toBe('1.0.0');
    expect(d.productor.nombre).toBeNull();
  });

  it('firmarla pide el texto del asesor; con todo, deja de ser borrador', async () => {
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_guardar_el_productor', {
          nombre: 'Productor de prueba',
          nif: 'B84935048',
          direccion: 'Calle de prueba 1, Madrid',
          lugar: 'Madrid',
          firmada_el: '2026-11-04',
          texto_del_asesor: null,
        }),
      ),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(admin, 'admin_guardar_el_productor', {
        nombre: 'Productor de prueba',
        nif: 'B84935048',
        direccion: 'Calle de prueba 1, Madrid',
        lugar: 'Madrid',
        firmada_el: '2026-11-04',
        texto_del_asesor: 'Texto de prueba del asesor.',
      }),
    );
    const d = losDatos<Declaracion>(await api.consultar(rosa, 'la_declaracion_responsable'));
    expect(d.borrador).toBe(false);
    const enPdf = losDatos<{ tipo: string }>(
      await api.consultar(rosa, 'la_declaracion_responsable_en_pdf'),
    );
    expect(enPdf.tipo).toBe('application/pdf');
    await base.bd.query(
      'update plataforma.productor set nombre = null, nif = null, direccion = null, lugar = null, firmada_el = null, texto_del_asesor = null',
    );
  });
});

describe('sin la clave de Verifacti', () => {
  it('el alta dice que no está conectada, y no se rompe', async () => {
    const sinClave = montarLaApi(base.bd, { facturacion: null });
    const deRosa = await sinClave.entrar('rosa@ejemplo.estook.com');
    expect(
      losDatos<{ conectada: boolean }>(await sinClave.consultar(deRosa, 'mi_facturacion'))
        .conectada,
    ).toBe(false);
    expect(elFallo(await sinClave.ejecutar(deRosa, 'comprobar_un_nif', { nif: 'B12345674' }))).toBe(
      'facturacion_sin_conectar',
    );
    // La declaración se enseña igual, sin la versión de Verifacti.
    const d = losDatos<{ verifacti: unknown }>(
      await sinClave.consultar(deRosa, 'la_declaracion_responsable'),
    );
    expect(d.verifacti).toBeNull();
  });
});

describe('un solo sitio habla con Verifacti (Anexo 2, regla 4)', () => {
  it('su dirección solo está en servidor/facturacion', async () => {
    const raiz = new URL('../../', import.meta.url);
    const fuera: string[] = [];
    async function mirar(carpeta: string): Promise<void> {
      for (const entrada of await readdir(new URL(carpeta, raiz), { withFileTypes: true })) {
        const camino = join(carpeta, entrada.name);
        if (entrada.isDirectory()) {
          if (entrada.name === 'node_modules' || entrada.name === 'dist') continue;
          await mirar(`${camino}/`);
        } else if (/\.(ts|tsx|mjs)$/.test(entrada.name)) {
          const texto = await readFile(new URL(camino, raiz), 'utf8');
          if (
            texto.includes('api.verifacti.com') &&
            !camino.replace(/\\/g, '/').startsWith('servidor/facturacion/')
          ) {
            fuera.push(camino);
          }
        }
      }
    }
    await mirar('servidor/');
    await mirar('apps/');
    await mirar('packages/');
    expect(fuera).toEqual([]);
  }, 60_000);
});
