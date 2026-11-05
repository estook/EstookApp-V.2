import { z } from 'zod';
import { comoEsElNif, laAutorizacionDe } from '@estook/dominio';
import { variable } from '@estook/utiles';
import {
  esLaDeUnNif,
  NIF_DE_LA_EMPRESA_DE_PRUEBAS,
  VerifactiNoContesta,
} from '../../facturacion/verifacti.ts';
import { anotarEnElAdmin } from '../admin.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { enLaBase, laVerifacti, loQueNoHizoVerifacti } from '../facturacion.ts';

/**
 * **La facturación, en el admin** (T6 · 1, decisión 0126; Anexo, capítulo 9; 0125).
 *
 *   admin_facturacion                  las once condiciones, el productor, las empresas
 *   admin_probar_verifacti             la clave de la cuenta, y la versión de Verifacti
 *   admin_marcar_condicion             una de las once, con dónde está la prueba
 *   admin_guardar_el_productor         quién hace Estook, para su declaración responsable
 *   admin_poner_la_empresa_de_pruebas  la de Verifacti en un local de una cuenta de la casa
 *   admin_quitar_la_empresa_de_pruebas y quitarla de ese local, si se puso donde no era (0129)
 *   admin_pasar_a_real                 una empresa, **solo con las once cumplidas**
 *
 * Todo del admin total, y cada cambio a la auditoría del admin.
 */

export interface LaFacturacionEnElAdmin {
  readonly conectada: boolean;
  readonly condiciones: readonly {
    readonly numero: number;
    readonly texto: string;
    readonly cumplidaEn: string | null;
    readonly nota: string | null;
  }[];
  readonly productor: {
    readonly nombre: string | null;
    readonly nif: string | null;
    readonly direccion: string | null;
    readonly lugar: string | null;
    readonly firmadaEl: string | null;
    readonly textoDelAsesor: string | null;
  };
  readonly empresas: readonly {
    readonly id: string;
    readonly organizacion: string;
    readonly nombre: string;
    readonly nif: string;
    readonly persona: string;
    readonly dePruebas: boolean;
    readonly entorno: string;
    readonly modalidad: string;
    readonly enVerifacti: boolean;
    readonly autorizacion: string;
    readonly locales: number;
  }[];
  readonly localesDeLaCasa: readonly {
    readonly localId: string;
    readonly local: string;
    readonly organizacion: string;
    readonly empresa: string | null;
    readonly dePruebas: boolean;
  }[];
}

export const laFacturacionEnElAdmin = consulta<Record<string, never>, LaFacturacionEnElAdmin>({
  nombre: 'admin_facturacion',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar(contexto) {
    const condiciones = await contexto.sql<
      { numero: number; texto: string; cumplida_en: Date | null; nota: string | null }[]
    >`select numero, texto, cumplida_en, nota from plataforma.condicion_para_facturar order by numero`;
    const [p] = await contexto.sql<
      {
        nombre: string | null;
        nif: string | null;
        direccion: string | null;
        lugar: string | null;
        firmada_el: string | null;
        texto_del_asesor: string | null;
      }[]
    >`
      select nombre, nif, direccion, lugar, to_char(firmada_el, 'YYYY-MM-DD') as firmada_el,
             texto_del_asesor
        from plataforma.productor where unica
    `;
    const empresas = await contexto.sql<
      {
        empresa_id: string;
        organizacion: string;
        nombre: string;
        nif_visible: string;
        persona: string;
        de_pruebas: boolean;
        entorno: string;
        modalidad: string;
        en_verifacti: boolean;
        autorizacion: string;
        locales: number;
      }[]
    >`select * from plataforma.las_empresas()`;
    const locales = await contexto.sql<
      {
        local_id: string;
        local: string;
        organizacion: string;
        empresa: string | null;
        de_pruebas: boolean;
      }[]
    >`select * from plataforma.los_locales_de_la_casa()`;
    return {
      conectada: (contexto.facturacion ?? null) !== null,
      condiciones: condiciones.map((c) => ({
        numero: c.numero,
        texto: c.texto,
        cumplidaEn: c.cumplida_en === null ? null : new Date(c.cumplida_en).toISOString(),
        nota: c.nota,
      })),
      productor: {
        nombre: p?.nombre ?? null,
        nif: p?.nif ?? null,
        direccion: p?.direccion ?? null,
        lugar: p?.lugar ?? null,
        firmadaEl: p?.firmada_el ?? null,
        textoDelAsesor: p?.texto_del_asesor ?? null,
      },
      empresas: empresas.map((e) => ({
        id: e.empresa_id,
        organizacion: e.organizacion,
        nombre: e.nombre,
        nif: e.nif_visible,
        persona: e.persona,
        dePruebas: e.de_pruebas,
        entorno: e.entorno,
        modalidad: e.modalidad,
        enVerifacti: e.en_verifacti,
        autorizacion: e.autorizacion,
        locales: e.locales,
      })),
      localesDeLaCasa: locales.map((l) => ({
        localId: l.local_id,
        local: l.local,
        organizacion: l.organizacion,
        empresa: l.empresa,
        dePruebas: l.de_pruebas,
      })),
    };
  },
});

export type LaPruebaDeVerifacti =
  | {
      readonly funciona: true;
      readonly nifs: number;
      readonly version: string | null;
      readonly milisegundos: number;
    }
  | { readonly funciona: false; readonly porque: string; readonly estado: number | null };

/**
 * Probar la conexión, como la de Fogón (19-oct): la clave de la cuenta lista los NIF, y la
 * versión de Verifacti sale de su declaración. Si falla, **qué falla**, en castellano.
 */
export const probarVerifacti = comando<Record<string, never>, LaPruebaDeVerifacti>({
  nombre: 'admin_probar_verifacti',
  entrada: z.object({}).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto) {
    const verifacti = contexto.facturacion ?? null;
    if (verifacti === null) {
      return {
        funciona: false,
        porque:
          'Falta la clave: en Supabase → Edge Functions → Secrets no hay ningún VERIFACTI_CLAVE_DE_CUENTA.',
        estado: null,
      };
    }
    const empieza = Date.now();
    try {
      const { nifs } = await verifacti.probar();
      const declaracion = await verifacti.laDeclaracion().catch(() => null);
      return {
        funciona: true,
        nifs,
        version: declaracion?.sistema?.version ?? null,
        milisegundos: Date.now() - empieza,
      };
    } catch (fallo) {
      if (!(fallo instanceof VerifactiNoContesta)) throw fallo;
      const puesta = variable('VERIFACTI_CLAVE_DE_CUENTA') ?? '';
      return {
        funciona: false,
        estado: fallo.estado,
        porque:
          fallo.estado === 401 && esLaDeUnNif(puesta)
            ? 'La clave puesta es la de un NIF (empieza por vf_test_ o vf_prod_). Hace falta la de la cuenta: Verifacti → Ajustes de la cuenta → API key, que empieza por vfn_.'
            : fallo.estado === 401
              ? 'Verifacti no reconoce la clave. Cópiala otra vez de Ajustes de la cuenta → API key y ponla sin espacios.'
              : fallo.estado === 403
                ? 'La cuenta de Verifacti no tiene la API de NIF: hace falta la suscripción de pago.'
                : fallo.estado === null
                  ? 'Verifacti no ha contestado a tiempo. Prueba otra vez en un minuto.'
                  : 'Verifacti ha contestado con un error. Prueba otra vez en un minuto.',
      };
    }
  },
});

export const marcarCondicion = comando<
  { numero: number; cumplida: boolean; nota?: string | undefined },
  { readonly numero: number; readonly cumplida: boolean }
>({
  nombre: 'admin_marcar_condicion',
  entrada: z
    .object({
      numero: z.number().int().min(1).max(11),
      cumplida: z.boolean(),
      nota: z.string().trim().max(500).optional(),
    })
    .strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    // **Marcarla cumplida pide decir dónde está la prueba**: un «sí» sin nota no vale.
    if (entrada.cumplida && (entrada.nota ?? '').trim() === '') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Escribe dónde está la prueba: un enlace, un documento o una fecha.',
      });
    }
    await contexto.sql`
      update plataforma.condicion_para_facturar
         set cumplida_en = ${entrada.cumplida ? contexto.ahora.toISOString() : null}::timestamptz,
             cumplida_por = ${entrada.cumplida ? sesion.personaId : null}::uuid,
             nota = ${entrada.nota ?? null}
       where numero = ${entrada.numero}
    `;
    await anotarEnElAdmin(contexto, {
      accion: entrada.cumplida ? 'cumplir_condicion' : 'quitar_condicion',
      entidad: 'condicion_para_facturar',
      entidadId: String(entrada.numero),
      antes: null,
      despues: { cumplida: entrada.cumplida, nota: entrada.nota ?? null },
    });
    return { numero: entrada.numero, cumplida: entrada.cumplida };
  },
});

const entradaDelProductor = z
  .object({
    nombre: z.string().trim().max(120).nullable(),
    nif: z.string().trim().max(20).nullable(),
    direccion: z.string().trim().max(200).nullable(),
    lugar: z.string().trim().max(80).nullable(),
    firmada_el: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    texto_del_asesor: z.string().trim().max(4000).nullable(),
  })
  .strict();

/**
 * Quién hace Estook, para su declaración (Orden HAC/1177/2024, art. 15). **Sus datos no van en
 * el código, que es público**: se escriben aquí. Firmarla pide el texto del asesor.
 */
export const guardarElProductor = comando<
  z.infer<typeof entradaDelProductor>,
  { readonly guardado: true }
>({
  nombre: 'admin_guardar_el_productor',
  entrada: entradaDelProductor,
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    if (entrada.nif !== null && entrada.nif !== '' && !comoEsElNif(entrada.nif).valido) {
      throw new FalloDeAplicacion('nif_no_vale');
    }
    if (entrada.firmada_el !== null && (entrada.texto_del_asesor ?? '') === '') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Se firma el texto del asesor: sin él, la declaración sigue siendo un borrador.',
      });
    }
    const limpio = (t: string | null) => (t === null || t.trim() === '' ? null : t.trim());
    await contexto.sql`
      update plataforma.productor
         set nombre = ${limpio(entrada.nombre)}, nif = ${limpio(entrada.nif)},
             direccion = ${limpio(entrada.direccion)}, lugar = ${limpio(entrada.lugar)},
             firmada_el = ${entrada.firmada_el}::date,
             texto_del_asesor = ${limpio(entrada.texto_del_asesor)},
             cambiado_en = now(), cambiado_por = ${sesion.personaId}::uuid
       where unica
    `;
    // A la auditoría, sin el NIF ni la dirección: son datos de una persona.
    await anotarEnElAdmin(contexto, {
      accion: 'guardar_el_productor',
      entidad: 'productor',
      entidadId: null,
      antes: null,
      despues: {
        firmada: entrada.firmada_el !== null,
        conTextoDelAsesor: limpio(entrada.texto_del_asesor) !== null,
      },
    });
    return { guardado: true };
  },
});

/**
 * La empresa de pruebas de Verifacti en un local de una cuenta de la casa (0125, respuesta 3):
 * **sus datos los dice Verifacti**, y su autorización también. El alta de ese local salta así el
 * alta del NIF y la firma, que ya vienen hechas.
 */
export const ponerLaEmpresaDePruebas = comando<
  { local_id: string },
  { readonly empresaId: string }
>({
  nombre: 'admin_poner_la_empresa_de_pruebas',
  entrada: z.object({ local_id: z.string().uuid() }).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    // Un local con su propia empresa no se pisa (0129): se soltaría sin avisar y su NIF quedaría
    // ocupado. Primero se quita desde su Ajustes › Facturación.
    // El admin no lee las empresas de los clientes: lo mira la función que ya lo dice por local.
    const [suya] = await contexto.sql<{ nombre: string }[]>`
      select empresa as nombre from plataforma.los_locales_de_la_casa()
       where local_id = ${entrada.local_id}::uuid and empresa is not null and not de_pruebas
    `;
    if (suya !== undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `Ese local ya tiene su empresa (${suya.nombre}). Quítala antes desde su Ajustes › Facturación.`,
      });
    }
    const verifacti = laVerifacti(contexto);
    let datos;
    let autorizacion;
    try {
      datos = await verifacti.elNif('test', NIF_DE_LA_EMPRESA_DE_PRUEBAS);
      autorizacion = await verifacti.laAutorizacion(NIF_DE_LA_EMPRESA_DE_PRUEBAS);
    } catch (fallo) {
      return loQueNoHizoVerifacti(contexto, fallo, 'la empresa de pruebas');
    }
    if (datos === null) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Verifacti no tiene la empresa de pruebas en esta cuenta.',
      });
    }
    const empresaId = await enLaBase(async () => {
      const [fila] = await contexto.sql<{ id: string }[]>`
        select plataforma.poner_la_empresa_de_pruebas(
          ${entrada.local_id}::uuid, ${datos.nif}, ${datos.nombre || 'Empresa de pruebas de Verifacti'},
          ${datos.direccion || 'Sin dirección'}, ${/^[0-9]{5}$/.test(datos.cp) ? datos.cp : '48992'},
          ${datos.poblacion || 'Getxo'}, ${datos.provincia || 'Bizkaia'},
          ${laAutorizacionDe(autorizacion.estado)}
        ) as id
      `;
      return fila?.id ?? '';
    });
    await anotarEnElAdmin(contexto, {
      accion: 'poner_la_empresa_de_pruebas',
      entidad: 'local',
      entidadId: entrada.local_id,
      antes: null,
      despues: { empresa: empresaId },
    });
    return { empresaId };
  },
});

/**
 * **Quitar la empresa de pruebas** de un local (0129): si se puso donde no era. El local se queda
 * sin empresa y su alta vuelve al paso 1; la empresa de pruebas sigue en la cuenta, para volver a
 * ponerla. No se llama a Verifacti.
 */
export const quitarLaEmpresaDePruebas = comando<{ local_id: string }, { readonly quitada: true }>({
  nombre: 'admin_quitar_la_empresa_de_pruebas',
  entrada: z.object({ local_id: z.string().uuid() }).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    await enLaBase(
      () => contexto.sql`select plataforma.quitar_la_empresa_de_pruebas(${entrada.local_id}::uuid)`,
    );
    await anotarEnElAdmin(contexto, {
      accion: 'quitar_la_empresa_de_pruebas',
      entidad: 'local',
      entidadId: entrada.local_id,
      antes: null,
      despues: null,
    });
    return { quitada: true };
  },
});

/**
 * **Pasar a real** (0125): solo con las once condiciones cumplidas y la empresa terminada. Se
 * mira antes de llamar a Verifacti, porque **dar de alta un NIF en producción se cobra**: con
 * una condición sin cumplir, no se toca nada.
 */
export const pasarAReal = comando<{ empresa_id: string }, { readonly entorno: 'real' }>({
  nombre: 'admin_pasar_a_real',
  entrada: z.object({ empresa_id: z.string().uuid() }).strict(),
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const [faltan] = await contexto.sql<{ cuantas: number }[]>`
      select count(*)::int as cuantas from plataforma.condicion_para_facturar where cumplida_en is null
    `;
    if ((faltan?.cuantas ?? 0) > 0) throw new FalloDeAplicacion('faltan_condiciones');
    const [empresa] = await contexto.sql<
      {
        de_pruebas: boolean;
        en_verifacti: boolean;
        autorizacion: string;
        entorno: string;
        modalidad: string;
      }[]
    >`
      select de_pruebas, en_verifacti, autorizacion, entorno, modalidad
        from plataforma.las_empresas() where empresa_id = ${entrada.empresa_id}::uuid
    `;
    if (empresa === undefined) throw new FalloDeAplicacion('no_existe');
    const conVerifactu = empresa.modalidad === 'verifactu';
    if (
      empresa.de_pruebas ||
      empresa.modalidad === 'sin_envio' ||
      (conVerifactu && (!empresa.en_verifacti || empresa.autorizacion !== 'correcta'))
    ) {
      throw new FalloDeAplicacion('empresa_sin_terminar');
    }
    // Con todo comprobado, el NIF se da de alta en producción (se cobra): la autorización
    // ya vale, porque Verifacti la pide una vez por NIF para los dos entornos. Fuera de
    // VERI*FACTU, por el SII, no hay nada que dar de alta (0127).
    if (conVerifactu) await darDeAltaEnProduccion(contexto, entrada.empresa_id);
    await enLaBase(() => contexto.sql`select plataforma.pasar_a_real(${entrada.empresa_id}::uuid)`);
    await anotarEnElAdmin(contexto, {
      accion: 'pasar_a_real',
      entidad: 'empresa',
      entidadId: entrada.empresa_id,
      antes: { entorno: empresa.entorno },
      despues: { entorno: 'real' },
    });
    return { entorno: 'real' };
  },
});

/** El NIF, en el Verifacti de producción, al pasar a real con VERI*FACTU. */
async function darDeAltaEnProduccion(contexto: Contexto, empresaId: string): Promise<void> {
  const verifacti = laVerifacti(contexto);
  const [d] = await contexto.sql<
    {
      nif: string;
      nombre: string;
      direccion: string;
      codigo_postal: string;
      municipio: string;
      provincia: string;
      organizacion: string;
    }[]
  >`select * from plataforma.la_empresa_para_real(${empresaId}::uuid)`;
  if (d === undefined) throw new FalloDeAplicacion('no_existe');
  try {
    await verifacti.darDeAlta({
      nif: d.nif,
      nombre: d.nombre,
      direccion: d.direccion,
      cp: d.codigo_postal,
      poblacion: d.municipio,
      provincia: d.provincia,
      entorno: 'prod',
      etiqueta: d.organizacion.slice(0, 120),
    });
  } catch (fallo) {
    return loQueNoHizoVerifacti(contexto, fallo, 'dar de alta un NIF en producción');
  }
}
