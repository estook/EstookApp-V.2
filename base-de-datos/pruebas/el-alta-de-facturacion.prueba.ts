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
 *   · solo el gerente, la dirección y el administrador de cuenta; un camarero, nada
 *   · el NIF, con su forma y en Hacienda, **otra vez en el servidor**; el nombre, el de Hacienda
 *   · un paso no se salta, y **el País Vasco, Navarra, el SII y Ceuta paran**, con su motivo
 *   · las series: distintas, sin chocar con otro local de la empresa, y **solo se insertan**
 *   · el alta en Verifacti, que si no contesta no apunta nada
 *   · la autorización: **solo el titular**, una firma en curso se recupera (no se paga otra)
 *   · el segundo local usa la empresa sin escribir nada; otra cuenta no puede usar el NIF
 *   · el admin: la empresa de pruebas, las once condiciones y **pasar a real, que no pasa**
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
    autorizacion: { estado: string; firmante: string | null };
  } | null;
  series: Record<string, string | null>;
  propuestas: Record<string, string>;
  soyElTitular: boolean;
  pideTuFactura: boolean;
  otrasEmpresas: { id: string; nombre: string }[];
  puedenSerTitular: { id: string; nombre: string }[];
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

describe('quién hace el alta (Roles 1.12)', () => {
  it('el gerente la ve en el paso 1; un camarero no la ve ni la toca', async () => {
    const lo = await mia(rosa);
    expect(lo.conectada).toBe(true);
    expect(lo.como).toMatchObject({ estado: 'en_marcha', paso: 1 });
    expect(lo.propuestas.ticket).toMatch(/^T-[A-Z0-9]{3}$/);
    expect(lo.puedenSerTitular.map((p) => p.id)).toContain(rosaId);
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

  it('con el SII, tampoco; y sin ninguno de los dos, sigue', async () => {
    const sii = losDatos<{ como: Como }>(
      await api.ejecutar(rosa, 'contestar_donde_tributa', { en_sii: true, foral: 'no' }),
    );
    expect(sii.como.parada?.motivo).toBe('sii');
    const sigue = losDatos<{ como: Como }>(
      await api.ejecutar(rosa, 'contestar_donde_tributa', { en_sii: false, foral: 'no' }),
    );
    expect(sigue.como).toMatchObject({ estado: 'en_marcha', paso: 3 });
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

describe('un NIF es una empresa', () => {
  it('otra cuenta no puede dar de alta el mismo NIF', async () => {
    const pablo = await api.entrar('pablo@ejemplo.estook.com');
    const pabloId = await base.personaPorCorreo('pablo@ejemplo.estook.com');
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
  });
});
