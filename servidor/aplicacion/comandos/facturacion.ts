import { z } from 'zod';
import {
  comoEsElNif,
  foralDelCodigoPostal,
  laAutorizacionDe,
  leerElResultado,
  prefijoValido,
  provinciaDelCodigoPostal,
  sePuedeEmpezarOtra,
  type EstadoDeLaAutorizacion,
  type HaciendaForal,
  type NifEnHacienda,
} from '@estook/dominio';
import { documentoDeLaDeclaracion, type DeclaracionResponsable } from '@estook/documentos';
import { VerifactiNoContesta } from '../../facturacion/verifacti.ts';
import {
  EL_CUMPLIMIENTO_EN_BORRADOR,
  EL_SISTEMA,
  LA_FIRMA,
  LOS_COMPONENTES,
} from '../../facturacion/sistema.ts';
import { apuntarUnFallo } from '../../infraestructura/fallos.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { hacerElPdf, hechoEl, type UnPdf } from '../documentos.ts';
import {
  enLaBase,
  exigirElPaso,
  laVerifacti,
  loDelLocal,
  loQueNoHizoVerifacti,
  soloConVerifactu,
  type LoDelLocal,
} from '../facturacion.ts';

/**
 * **El alta de facturación** (T6 · 1, decisión 0126; Anexo 4.3; maquetas aprobadas el 2-nov).
 *
 * ── Ajustes › Facturación, en Estook ────────────────────────────────────────────
 *
 *   mi_facturacion              cómo va: la empresa, el paso, las series y la autorización
 *   comprobar_un_nif            el NIF en Hacienda, al escribirlo
 *   guardar_la_empresa          paso 1: la empresa, con su NIF comprobado otra vez aquí
 *   usar_la_empresa             paso 1, el segundo local: la que ya hay, sin escribir nada
 *   contestar_donde_tributa     paso 2: el SII y si el domicilio fiscal es foral
 *   poner_las_series            paso 3: las tres series y si ya factura con otro programa
 *   dar_de_alta_en_verifacti    paso 4: el alta del NIF, que se hace sola
 *   firmar_en_linea             paso 5, una persona: el enlace para firmar (2,90 € + IVA)
 *   el_modelo_para_firmar       paso 5, una sociedad: el PDF ya relleno, para su certificado
 *   mandar_el_modelo_firmado    paso 5, una sociedad: el PDF firmado
 *   mirar_la_autorizacion       cómo está la autorización ante Hacienda
 *   elegir_la_modalidad         con VERI*FACTU o sin envío (0127); también desde Estook TPV
 *   poner_pide_tu_factura       el QR del ticket para pedir factura (0125)
 *
 * ── En la app y en Estook TPV ─────────────────────────────────────────────────────
 *
 *   la_declaracion_responsable         lo que Estook declara a Hacienda (Anexo 4.14)
 *   la_declaracion_responsable_en_pdf  y en PDF
 *
 * **Todo en pruebas** (0125): el alta en Verifacti es la de su entorno de pruebas, y pasar a real
 * lo hace el admin con las once condiciones del Anexo, capítulo 9.
 */

const EXIGE = 'accion.alta_de_facturacion' as const;

// ── Cómo va ───────────────────────────────────────────────────────────────────────

export interface MiFacturacion extends LoDelLocal {
  /** Si Estook tiene conectada la facturación (la clave de Verifacti puesta). */
  readonly conectada: boolean;
  /** Si quien mira es el titular: solo él empieza la autorización (Roles 1.12). */
  readonly soyElTitular: boolean;
  /** Las otras empresas de la organización, para el segundo local. */
  readonly otrasEmpresas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly nif: string;
  }[];
  /** Quién puede ser el titular: quien puede hacer el alta en este local. */
  readonly puedenSerTitular: readonly { readonly id: string; readonly nombre: string }[];
  /** El año de hoy en el local, para enseñar cómo saldrá el primer número. */
  readonly ano: number;
}

export const miFacturacion = consulta<Record<string, never>, MiFacturacion>({
  nombre: 'mi_facturacion',
  entrada: z.object({}).strict(),
  exige: EXIGE,
  // También en los Ajustes de Estook TPV, que enseñan cómo factura el local (0127).
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    const otras = await contexto.sql<{ id: string; nombre: string; nif: string }[]>`
      select e.id, e.nombre, e.nif
        from estook.empresa e join estook.local l on l.organizacion_id = e.organizacion_id
       where l.id = ${localId}::uuid and not e.de_pruebas
         and e.id is distinct from l.empresa_id
       order by e.nombre
    `;
    const titulares = await contexto.sql<{ id: string; nombre: string }[]>`
      select p.id, btrim(p.nombre || ' ' || coalesce(p.apellidos, '')) as nombre
        from estook.persona p
       where p.activa
         and exists (
           select 1 from estook.membresia m join estook.local l on l.organizacion_id = m.organizacion_id
            where m.persona_id = p.id and l.id = ${localId}::uuid
              and m.desde <= current_date and (m.hasta is null or m.hasta >= current_date)
         )
         and estook.nivel_de_permiso(p.id, ${localId}::uuid, ${EXIGE}) = 'ver_y_editar'
       order by p.nombre, p.apellidos
    `;
    const [ano] = await contexto.sql<{ ano: number }[]>`
      select extract(year from (${contexto.ahora.toISOString()}::timestamptz at time zone l.zona_horaria))::int as ano
        from estook.local l where l.id = ${localId}::uuid
    `;
    return {
      ...lo,
      conectada: (contexto.facturacion ?? null) !== null,
      soyElTitular: lo.empresa?.titular?.id === contexto.personaId,
      otrasEmpresas: otras,
      puedenSerTitular: titulares,
      ano: ano?.ano ?? contexto.ahora.getUTCFullYear(),
    };
  },
});

// ── Paso 1 · la empresa ─────────────────────────────────────────────────────────────

export interface ElNifComprobado {
  readonly nif: string;
  readonly persona: 'fisica' | 'juridica';
  readonly enHacienda: NifEnHacienda;
  /** El nombre que tiene Hacienda: **es el que vale**, y el que sale en cada ticket. */
  readonly nombreEnHacienda: string | null;
}

/**
 * El NIF en Hacienda. Primero su forma y su letra, aquí, sin preguntar a nadie; después, a
 * Hacienda por Verifacti. A una persona física Hacienda le pide el nombre (su documentación).
 */
async function comprobar(
  contexto: Contexto,
  nif: string,
  nombre: string | null,
): Promise<ElNifComprobado> {
  const forma = comoEsElNif(nif);
  if (!forma.valido) throw new FalloDeAplicacion('nif_no_vale', { porque: forma.porque });
  if (forma.persona === 'fisica' && (nombre === null || nombre.trim() === '')) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Para una persona, Hacienda pide también sus apellidos y su nombre.',
    });
  }
  const verifacti = laVerifacti(contexto);
  try {
    const dice = await verifacti.comprobarNif(forma.nif, nombre === null ? null : nombre.trim());
    return {
      nif: forma.nif,
      persona: forma.persona,
      enHacienda: leerElResultado(dice.resultado),
      nombreEnHacienda: dice.nombre,
    };
  } catch (fallo) {
    return loQueNoHizoVerifacti(contexto, fallo, 'comprobar un NIF');
  }
}

export const comprobarUnNif = comando<
  { nif: string; nombre?: string | undefined },
  ElNifComprobado
>({
  nombre: 'comprobar_un_nif',
  entrada: z
    .object({
      nif: z.string().trim().min(1).max(20),
      nombre: z.string().trim().max(120).optional(),
    })
    .strict(),
  exige: EXIGE,
  // Se puede repetir sin miedo: no cambia nada.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    elLocalDeLaSesion(contexto);
    return comprobar(contexto, entrada.nif, entrada.nombre ?? null);
  },
});

const entradaDeLaEmpresa = z
  .object({
    /** Nulo, una nueva; o la del local, cambiada. */
    empresa_id: z.string().uuid().nullable(),
    nif: z.string().trim().min(1).max(20),
    nombre: z.string().trim().min(1).max(120),
    nombre_comercial: z.string().trim().max(120).optional(),
    calle: z.string().trim().min(1).max(120),
    numero: z.string().trim().min(1).max(20),
    codigo_postal: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/),
    municipio: z.string().trim().min(1).max(80),
    titular_id: z.string().uuid(),
  })
  .strict();

export const guardarLaEmpresa = comando<
  z.infer<typeof entradaDeLaEmpresa>,
  {
    readonly empresaId: string;
    readonly nombre: string;
    readonly foralPropuesta: HaciendaForal | null;
  }
>({
  nombre: 'guardar_la_empresa',
  entrada: entradaDeLaEmpresa,
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const provincia = provinciaDelCodigoPostal(entrada.codigo_postal);
    if (provincia === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Ese código postal no es de España. El domicilio fiscal tiene que estar aquí.',
      });
    }
    // **Se vuelve a comprobar aquí**: la pantalla ya lo hizo, pero lo que llega del navegador no
    // se cree. Y se guarda el nombre que tiene Hacienda, que es el que vale.
    const comprobado = await comprobar(contexto, entrada.nif, entrada.nombre);
    if (comprobado.enHacienda !== 'identificado' && comprobado.enHacienda !== 'parecido') {
      throw new FalloDeAplicacion('nif_no_esta_en_hacienda', {
        porque:
          comprobado.enHacienda === 'de_baja'
            ? 'Hacienda tiene ese NIF de baja.'
            : comprobado.enHacienda === 'revocado'
              ? 'Hacienda tiene ese NIF revocado.'
              : 'Hacienda no lo identifica con ese nombre.',
      });
    }
    const nombre = comprobado.nombreEnHacienda ?? entrada.nombre;
    const empresaId = await enLaBase(async () => {
      const [fila] = await contexto.sql<{ id: string }[]>`
        select estook.guardar_la_empresa(
          ${localId}::uuid, ${entrada.empresa_id}::uuid, ${comprobado.nif}, ${nombre},
          ${entrada.nombre_comercial ?? null}, ${comprobado.persona}, ${entrada.calle},
          ${entrada.numero}, ${entrada.codigo_postal}, ${entrada.municipio}, ${provincia},
          ${entrada.titular_id}::uuid, null, null
        ) as id
      `;
      return fila?.id ?? '';
    });
    return { empresaId, nombre, foralPropuesta: foralDelCodigoPostal(entrada.codigo_postal) };
  },
});

export const usarLaEmpresa = comando<{ empresa_id: string }, { readonly empresaId: string }>({
  nombre: 'usar_la_empresa',
  entrada: z.object({ empresa_id: z.string().uuid() }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await enLaBase(
      () =>
        contexto.sql`select estook.usar_la_empresa(${localId}::uuid, ${entrada.empresa_id}::uuid)`,
    );
    return { empresaId: entrada.empresa_id };
  },
});

// ── Paso 2 · dónde tributa ──────────────────────────────────────────────────────────

const FORALES = ['no', 'alava', 'gipuzkoa', 'bizkaia', 'navarra'] as const;

export const contestarDondeTributa = comando<
  { en_sii: boolean; foral: (typeof FORALES)[number] },
  { readonly como: LoDelLocal['como'] }
>({
  nombre: 'contestar_donde_tributa',
  entrada: z.object({ en_sii: z.boolean(), foral: z.enum(FORALES) }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const antes = await loDelLocal(contexto, localId);
    if (antes.empresa === null) throw new FalloDeAplicacion('falta_la_empresa');
    if (antes.empresa.dePruebas) throw new FalloDeAplicacion('empresa_de_pruebas');
    await enLaBase(
      () => contexto.sql`
        select estook.contestar_donde_tributa(${localId}::uuid, ${entrada.en_sii}, ${entrada.foral})
      `,
    );
    // Lo que sale de contestar: si sigue, o por qué se para (con su motivo verdadero).
    return { como: (await loDelLocal(contexto, localId)).como };
  },
});

// ── Paso 3 · las series ─────────────────────────────────────────────────────────────

const prefijo = z
  .string()
  .trim()
  .transform((p) => p.toUpperCase())
  .refine(prefijoValido, { message: 'serie_no_vale' });

export const ponerLasSeries = comando<
  { ticket: string; factura: string; rectificativa: string; otro_programa: boolean },
  { readonly series: LoDelLocal['series'] }
>({
  nombre: 'poner_las_series',
  entrada: z
    .object({
      ticket: z.string().max(40),
      factura: z.string().max(40),
      rectificativa: z.string().max(40),
      otro_programa: z.boolean(),
    })
    .strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const series = {
      ticket: prefijo.safeParse(entrada.ticket),
      factura: prefijo.safeParse(entrada.factura),
      rectificativa: prefijo.safeParse(entrada.rectificativa),
    };
    if (!series.ticket.success || !series.factura.success || !series.rectificativa.success) {
      throw new FalloDeAplicacion('serie_no_vale');
    }
    const ticket = series.ticket.data;
    const factura = series.factura.data;
    const rectificativa = series.rectificativa.data;
    exigirElPaso(await loDelLocal(contexto, localId), 3);
    await enLaBase(
      () => contexto.sql`
        select facturacion.poner_las_series(
          ${localId}::uuid, ${ticket}, ${factura}, ${rectificativa}, ${entrada.otro_programa}
        )
      `,
    );
    return { series: (await loDelLocal(contexto, localId)).series };
  },
});

// ── Paso 4 · el alta del NIF en Verifacti ──────────────────────────────────────────

export const darDeAltaEnVerifacti = comando<Record<string, never>, { readonly hecha: true }>({
  nombre: 'dar_de_alta_en_verifacti',
  entrada: z.object({}).strict(),
  exige: EXIGE,

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    exigirElPaso(lo, 4);
    soloConVerifactu(lo);
    const empresa = lo.empresa;
    if (empresa === null) throw new FalloDeAplicacion('falta_la_empresa');
    if (!empresa.enVerifacti) {
      const verifacti = laVerifacti(contexto);
      try {
        // **En pruebas**: el entorno de pruebas de Hacienda. A real lo pasa el admin (0125).
        // Si ya estaba (otro local de la misma empresa, o un reintento), dice «ya_estaba».
        await verifacti.darDeAlta({
          nif: empresa.nif,
          nombre: empresa.nombre,
          direccion: `${empresa.calle} ${empresa.numero}`,
          cp: empresa.codigoPostal,
          poblacion: empresa.municipio,
          provincia: empresa.provincia,
          entorno: 'test',
          etiqueta: `${lo.organizacion} · ${lo.nombreDelLocal}`.slice(0, 120),
        });
      } catch (fallo) {
        return loQueNoHizoVerifacti(contexto, fallo, 'dar de alta un NIF');
      }
    }
    await enLaBase(
      () => contexto.sql`select estook.apuntar_el_alta_en_verifacti(${localId}::uuid)`,
    );
    return { hecha: true };
  },
});

// ── Paso 5 · la autorización ante Hacienda ─────────────────────────────────────────

export interface LaAutorizacion {
  readonly estado: EstadoDeLaAutorizacion;
  /** El enlace para firmar: **solo al titular**, y solo mientras espera. */
  readonly enlace: string | null;
  readonly caduca: string | null;
  readonly error: string | null;
}

async function apuntarLaAutorizacion(
  contexto: Contexto,
  localId: string,
  estado: EstadoDeLaAutorizacion,
  opciones: {
    readonly empieza: boolean;
    readonly forma?: 'en_linea' | 'con_certificado';
    readonly firmante?: string;
    readonly caduca?: string | null;
    readonly error?: string | null;
  },
): Promise<void> {
  await enLaBase(
    () => contexto.sql`
      select estook.apuntar_la_autorizacion(
        ${localId}::uuid, ${estado}, ${opciones.empieza}, ${opciones.forma ?? null},
        ${opciones.firmante ?? null}, ${opciones.caduca ?? null}::timestamptz,
        ${opciones.error ?? null}
      )
    `,
  );
}

/** Lo que solo hace el titular (Roles 1.12): se mira antes de llamar a nadie, y la base otra vez. */
function soloElTitular(contexto: Contexto, lo: LoDelLocal): NonNullable<LoDelLocal['empresa']> {
  const empresa = lo.empresa;
  if (empresa === null) throw new FalloDeAplicacion('falta_la_empresa');
  if (empresa.titular?.id !== contexto.personaId) throw new FalloDeAplicacion('solo_el_titular');
  return empresa;
}

const entradaDeLaFirmaEnLinea = z
  .object({
    nombre: z.string().trim().min(1).max(60),
    apellidos: z.string().trim().min(1).max(80),
    calle: z.string().trim().min(1).max(120),
    numero: z.string().trim().min(1).max(20),
    municipio: z.string().trim().min(1).max(80),
  })
  .strict();

/**
 * **Una persona (autónomo)**: Verifacti le manda un enlace y firma con su DNI o pasaporte y un
 * vídeo, sin certificado. **Cuesta 2,90 € + IVA cada intento** (lo cobra a Estook), así que si
 * hay uno en curso **se recupera, no se pide otro** (Anexo 4.3).
 */
export const firmarEnLinea = comando<z.infer<typeof entradaDeLaFirmaEnLinea>, LaAutorizacion>({
  nombre: 'firmar_en_linea',
  entrada: entradaDeLaFirmaEnLinea,
  exige: EXIGE,
  // El enlace es para firmar en nombre de la empresa: no se guarda para repetirlo.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    exigirElPaso(lo, 5);
    soloConVerifactu(lo);
    const empresa = soloElTitular(contexto, lo);
    if (empresa.persona !== 'fisica') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Una sociedad firma con el certificado de su representante: descarga el modelo.',
      });
    }
    const verifacti = laVerifacti(contexto);

    // Primero, cómo está: si hay una en curso o ya está firmada, no se paga otra.
    let ahora;
    try {
      ahora = await verifacti.laAutorizacion(empresa.nif);
    } catch (fallo) {
      return loQueNoHizoVerifacti(contexto, fallo, 'mirar la autorización');
    }
    const estado = laAutorizacionDe(ahora.estado);
    if (!sePuedeEmpezarOtra(estado)) {
      await apuntarLaAutorizacion(contexto, localId, estado, {
        empieza: false,
        caduca: ahora.caduca,
        error: ahora.error,
      });
      return { estado, enlace: ahora.url, caduca: ahora.caduca, error: ahora.error };
    }

    const [persona] = await contexto.sql<{ correo: string | null }[]>`
      select correo from estook.persona where id = ${contexto.personaId}::uuid
    `;
    const correo = persona?.correo ?? null;
    if (correo === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Para firmar en línea, tu cuenta de Estook tiene que tener un correo.',
      });
    }
    try {
      const { url } = await verifacti.empezarLaFirmaEnLinea(empresa.nif, {
        nombre: entrada.nombre,
        apellidos: entrada.apellidos,
        municipio: entrada.municipio,
        calle: entrada.calle,
        numero: entrada.numero,
        email: correo,
      });
      const despues = await verifacti.laAutorizacion(empresa.nif).catch(() => null);
      await apuntarLaAutorizacion(contexto, localId, 'pendiente', {
        empieza: true,
        forma: 'en_linea',
        firmante: `${entrada.nombre} ${entrada.apellidos}`,
        caduca: despues?.caduca ?? null,
      });
      return { estado: 'pendiente', enlace: url, caduca: despues?.caduca ?? null, error: null };
    } catch (fallo) {
      // Un 400 con una firma ya en curso (otra pestaña, un doble toque): se recupera la suya.
      if (fallo instanceof VerifactiNoContesta && fallo.estado === 400) {
        const otra = await verifacti.laAutorizacion(empresa.nif).catch(() => null);
        if (otra !== null && !sePuedeEmpezarOtra(laAutorizacionDe(otra.estado))) {
          const suEstado = laAutorizacionDe(otra.estado);
          await apuntarLaAutorizacion(contexto, localId, suEstado, {
            empieza: false,
            caduca: otra.caduca,
          });
          return { estado: suEstado, enlace: otra.url, caduca: otra.caduca, error: otra.error };
        }
      }
      return loQueNoHizoVerifacti(contexto, fallo, 'empezar la firma en línea');
    }
  },
});

const entradaDelRepresentante = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    nif: z.string().trim().min(1).max(20),
    calle: z.string().trim().min(1).max(120),
    numero: z.string().trim().min(1).max(20),
    municipio: z.string().trim().min(1).max(80),
  })
  .strict();

/**
 * **Una sociedad**: el modelo de Hacienda, ya relleno por Verifacti, para que su representante lo
 * firme con su certificado (AutoFirma) y lo suba. Es gratis.
 */
export const elModeloParaFirmar = comando<z.infer<typeof entradaDelRepresentante>, UnPdf>({
  nombre: 'el_modelo_para_firmar',
  entrada: entradaDelRepresentante,
  exige: EXIGE,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    exigirElPaso(lo, 5);
    soloConVerifactu(lo);
    const empresa = soloElTitular(contexto, lo);
    if (empresa.persona !== 'juridica') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Una persona firma en línea, sin certificado.',
      });
    }
    const delRepresentante = comoEsElNif(entrada.nif);
    if (!delRepresentante.valido || delRepresentante.persona !== 'fisica') {
      throw new FalloDeAplicacion('nif_no_vale', {
        porque: 'El representante es una persona: su DNI o su NIE.',
      });
    }
    const verifacti = laVerifacti(contexto);
    try {
      const pdf = await verifacti.elModeloParaFirmar(empresa.nif, {
        nombreEntidad: empresa.nombre,
        municipioEntidad: empresa.municipio,
        calleEntidad: empresa.calle,
        numeroEntidad: empresa.numero,
        nombreRepresentante: entrada.nombre,
        nifRepresentante: delRepresentante.nif,
        municipioRepresentante: entrada.municipio,
        calleRepresentante: entrada.calle,
        numeroRepresentante: entrada.numero,
      });
      return {
        nombre: `modelo-de-representacion-${empresa.nif}.pdf`,
        tipo: 'application/pdf',
        base64: btoa(Array.from(pdf, (b) => String.fromCharCode(b)).join('')),
      };
    } catch (fallo) {
      return loQueNoHizoVerifacti(contexto, fallo, 'el modelo para firmar');
    }
  },
});

/** Un PDF firmado con certificado, como mucho de 5 MB (en base64, algo más). */
const TOPE_DEL_PDF = 5 * 1024 * 1024;

export const mandarElModeloFirmado = comando<{ base64: string; firmante: string }, LaAutorizacion>({
  nombre: 'mandar_el_modelo_firmado',
  entrada: z
    .object({
      base64: z
        .string()
        .min(100)
        .max(Math.ceil((TOPE_DEL_PDF * 4) / 3) + 1024),
      firmante: z.string().trim().min(1).max(120),
    })
    .strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    exigirElPaso(lo, 5);
    soloConVerifactu(lo);
    const empresa = soloElTitular(contexto, lo);
    let bytes: Uint8Array;
    try {
      const texto = atob(entrada.base64.replace(/^data:[^;]+;base64,/, ''));
      bytes = Uint8Array.from(texto, (c) => c.charCodeAt(0));
    } catch {
      throw new FalloDeAplicacion('faltan_datos', { porque: 'Ese fichero no se ha podido leer.' });
    }
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Tiene que ser el PDF del modelo, firmado. Otro tipo de fichero no vale.',
      });
    }
    const verifacti = laVerifacti(contexto);
    let dice;
    try {
      dice = await verifacti.mandarElModeloFirmado(empresa.nif, bytes);
    } catch (fallo) {
      return loQueNoHizoVerifacti(contexto, fallo, 'mandar el modelo firmado');
    }
    const estado = laAutorizacionDe(dice.estado);
    await apuntarLaAutorizacion(contexto, localId, estado, {
      empieza: true,
      forma: 'con_certificado',
      firmante: entrada.firmante,
      error: dice.error,
    });
    return { estado, enlace: null, caduca: null, error: dice.error };
  },
});

export const mirarLaAutorizacion = comando<Record<string, never>, LaAutorizacion>({
  nombre: 'mirar_la_autorizacion',
  entrada: z.object({}).strict(),
  exige: EXIGE,
  // El enlace va al titular: no se guarda para repetirlo.
  conSecreto: true,

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const lo = await loDelLocal(contexto, localId);
    const empresa = lo.empresa;
    if (empresa === null) throw new FalloDeAplicacion('falta_la_empresa');
    if (empresa.dePruebas) {
      return { estado: empresa.autorizacion.estado, enlace: null, caduca: null, error: null };
    }
    const verifacti = laVerifacti(contexto);
    let dice;
    try {
      dice = await verifacti.laAutorizacion(empresa.nif);
    } catch (fallo) {
      return loQueNoHizoVerifacti(contexto, fallo, 'mirar la autorización');
    }
    const estado = laAutorizacionDe(dice.estado);
    await apuntarLaAutorizacion(contexto, localId, estado, {
      empieza: false,
      caduca: dice.caduca,
      error: dice.error,
    });
    const esElTitular = empresa.titular?.id === contexto.personaId;
    return {
      estado,
      enlace: esElTitular && estado === 'pendiente' ? dice.url : null,
      caduca: dice.caduca,
      error: dice.error,
    };
  },
});

// ── Cómo factura (0127) ─────────────────────────────────────────────────────────────

/**
 * Con VERI*FACTU o sin envío. **Sin envío todavía no se puede elegir** (lo dice la base), y fuera
 * de VERI*FACTU va solo con el SII, en el paso 2. También desde los Ajustes de Estook TPV, con el
 * mismo permiso.
 */
export const elegirLaModalidad = comando<
  { modalidad: 'verifactu' | 'sin_envio' },
  { readonly modalidad: 'verifactu' | 'sin_envio' }
>({
  nombre: 'elegir_la_modalidad',
  entrada: z.object({ modalidad: z.enum(['verifactu', 'sin_envio']) }).strict(),
  exige: EXIGE,
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await enLaBase(
      () => contexto.sql`select estook.elegir_la_modalidad(${localId}::uuid, ${entrada.modalidad})`,
    );
    return { modalidad: entrada.modalidad };
  },
});

// ── «Pide tu factura» (0125) ────────────────────────────────────────────────────────

export const ponerPideTuFactura = comando<{ encendido: boolean }, { readonly encendido: boolean }>({
  nombre: 'poner_pide_tu_factura',
  entrada: z.object({ encendido: z.boolean() }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await enLaBase(
      () =>
        contexto.sql`select estook.poner_pide_tu_factura(${localId}::uuid, ${entrada.encendido})`,
    );
    return { encendido: entrada.encendido };
  },
});

// ── La declaración responsable (Anexo 4.14) ───────────────────────────────────────

interface FilaDelProductor {
  nombre: string | null;
  nif: string | null;
  direccion: string | null;
  lugar: string | null;
  firmada_el: string | null;
  texto_del_asesor: string | null;
}

/**
 * Lo que declara Estook, con la versión de Verifacti de ahora. **Es un borrador** mientras falte
 * el texto del asesor, la firma o los datos del productor: así lo dice arriba, y el PDF también.
 */
export async function laDeclaracion(contexto: Contexto): Promise<DeclaracionResponsable> {
  const [p] = await contexto.sql<FilaDelProductor[]>`
    select nombre, nif, direccion, lugar, to_char(firmada_el, 'DD/MM/YYYY') as firmada_el,
           texto_del_asesor
      from plataforma.productor where unica
  `;
  let verifacti: DeclaracionResponsable['verifacti'] = null;
  const conectado = contexto.facturacion ?? null;
  if (conectado !== null) {
    try {
      const dice = await conectado.laDeclaracion();
      if (dice.sistema !== null) {
        verifacti = { ...dice.sistema, url: dice.urlDeLaVersion ?? dice.url };
      }
    } catch (fallo) {
      // Sin su versión, se dice que no se ha podido leer: la declaración se enseña igual.
      await apuntarUnFallo(fallo, {
        mensaje: 'Verifacti · su declaración',
        correlacionId: contexto.correlacionId,
      });
    }
  }
  const productor = {
    nombre: p?.nombre ?? null,
    nif: p?.nif ?? null,
    direccion: p?.direccion ?? null,
  };
  const borrador =
    p === undefined ||
    p.texto_del_asesor === null ||
    p.firmada_el === null ||
    p.lugar === null ||
    productor.nombre === null ||
    productor.nif === null ||
    productor.direccion === null;
  return {
    borrador,
    sistema: { ...EL_SISTEMA },
    componentes: LOS_COMPONENTES,
    verifacti,
    soloVerifactu: true,
    variosObligados: true,
    firma: LA_FIRMA,
    productor,
    cumplimiento: p?.texto_del_asesor ?? EL_CUMPLIMIENTO_EN_BORRADOR,
    firmadaEl: borrador ? null : p.firmada_el,
    lugar: borrador ? null : p.lugar,
  };
}

export const laDeclaracionResponsable = consulta<Record<string, never>, DeclaracionResponsable>({
  nombre: 'la_declaracion_responsable',
  entrada: z.object({}).strict(),
  // **Legible y a mano de quien usa el programa** (Orden HAC/1177/2024, art. 15): cualquiera que
  // haya entrado, en la app y en Estook TPV.
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    return laDeclaracion(contexto);
  },
});

export const laDeclaracionResponsableEnPdf = consulta<Record<string, never>, UnPdf>({
  nombre: 'la_declaracion_responsable_en_pdf',
  entrada: z.object({}).strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const datos = await laDeclaracion(contexto);
    const html = documentoDeLaDeclaracion(datos, hechoEl(contexto.ahora, 'Europe/Madrid'));
    return hacerElPdf(contexto, html, {
      nombre: `declaracion-responsable-estook-${EL_SISTEMA.version}.pdf`,
      pie: datos.borrador
        ? 'Declaración responsable de Estook · BORRADOR'
        : 'Declaración responsable de Estook',
    });
  },
});
