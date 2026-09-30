import { z } from 'zod';
import { documentoDelRegistro, type FilaDelRegistro } from '@estook/documentos';
import { elLocalDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { enBase64, hacerElPdf, hechoEl, laMarcaDelLocal } from '../documentos.ts';

/**
 * El registro de jornada, para la Inspección (H1 · decisiones 0062 y 0068).
 *
 * «La empresa registra cada día el inicio y el fin de la jornada, lo guarda cuatro
 * años y lo tiene a disposición del trabajador, sus representantes y la Inspección»
 * (Estatuto de los Trabajadores, art. 34.9). Esto lo saca, del periodo que se pida,
 * en dos formas:
 *
 *   hoja  una hoja de cálculo (CSV con punto y coma, que Excel abre bien), con **una
 *         fila por fichaje** y sus correcciones al lado.
 *   pdf   el mismo registro en papel, con **la huella de la hoja** del mismo periodo:
 *         si alguien toca la hoja después, deja de cuadrar.
 *
 * Lo que sale lo deciden las políticas de la 0027: quien lo pide ve a quien lleva.
 * Una gerente saca el del local entero; un jefe de cocina, el de su cocina.
 *
 * **[VERIFICAR] cuando se publique el Real Decreto del registro horario digital**: el
 * formato que pida para la Inspección. Hasta entonces, esto, sin inventar ninguno.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-21.');

export const entradaRegistroDeJornada = z
  .object({
    desde: fecha,
    hasta: fecha,
    formato: z.enum(['hoja', 'pdf']),
  })
  .strict()
  .refine((e) => e.desde <= e.hasta, { message: 'El periodo empieza antes de acabar.' });

export type EntradaRegistroDeJornada = z.infer<typeof entradaRegistroDeJornada>;

export interface ElRegistro {
  readonly nombre: string;
  readonly tipo: 'application/pdf' | 'text/csv';
  readonly base64: string;
  /** SHA-256 de la hoja de cálculo del periodo: la misma que lleva el PDF. */
  readonly huella: string;
  readonly fichajes: number;
}

/** Un año como mucho de una vez: más no se lee, y la Inspección pide periodos. */
const DIAS_MAXIMOS = 366;

interface FilaDeLaBase {
  persona: string;
  fecha: string;
  entro_en: string;
  salio_en: string | null;
  segundos: string;
  pausas: string;
  sin_donde: string | null;
  metros: number | null;
  correcciones: number;
  entro_original: string | null;
  salio_original: string | null;
  motivo: string | null;
  quien: string | null;
  corregido_en: string | null;
}

/** Lo leído, con las horas ya como instantes. */
interface FilaLeida {
  persona: string;
  fecha: string;
  entro_en: Date;
  salio_en: Date | null;
  segundos: string;
  pausas: string;
  sin_donde: string | null;
  metros: number | null;
  correcciones: number;
  entro_original: Date | null;
  salio_original: Date | null;
  motivo: string | null;
  quien: string | null;
  corregido_en: Date | null;
}

async function leerElRegistro(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<FilaLeida[]> {
  const ahora = contexto.ahora.toISOString();
  const filas = await contexto.sql<FilaDeLaBase[]>`
    select trim(p.nombre || ' ' || coalesce(p.apellidos, '')) as persona,
           to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
           to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
           to_char(f.salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
           estook.segundos_trabajados(f, ${ahora}::timestamptz)::text as segundos,
           coalesce((
             select sum(extract(epoch from (coalesce(pa.acabo_en, f.salio_en, ${ahora}::timestamptz) - pa.empezo_en)))
               from estook.pausa pa where pa.fichaje_id = f.id
           ), 0)::text as pausas,
           f.entro_sin_donde as sin_donde, f.entro_metros as metros,
           f.correcciones,
           to_char(primera.entro_antes, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_original,
           to_char(primera.salio_antes, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_original,
           ultima.motivo, ultima.quien,
           to_char(ultima.corregido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as corregido_en
      from estook.fichaje f
      join estook.persona p on p.id = f.persona_id
      left join lateral (
        select c.entro_antes, c.salio_antes
          from estook.correccion_de_fichaje c
         where c.fichaje_id = f.id and c.numero = 1
      ) primera on true
      left join lateral (
        select c.motivo, q.nombre as quien, c.corregido_en
          from estook.correccion_de_fichaje c
          left join estook.persona q on q.id = c.corregido_por
         where c.fichaje_id = f.id
         order by c.numero desc
         limit 1
      ) ultima on true
     where f.local_id = ${localId}
       and f.fecha_operativa between ${desde}::date and ${hasta}::date
     order by persona, f.entro_en, f.id
  `;
  const instante = (texto: string | null) => (texto === null ? null : new Date(texto));
  return filas.map((f) => ({
    ...f,
    entro_en: new Date(f.entro_en),
    salio_en: instante(f.salio_en),
    entro_original: instante(f.entro_original),
    salio_original: instante(f.salio_original),
    corregido_en: instante(f.corregido_en),
  }));
}

// ── Cómo se escribe cada cosa ────────────────────────────────────────────────

function hora(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante);
}

function diaDelLocal(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(instante);
}

/** «lun 5 oct». */
function diaCorto(fechaOperativa: string): string {
  const [a, m, d] = fechaOperativa.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(Date.UTC(a, m - 1, d)))
    .replaceAll('.', '')
    .replace(',', '');
}

/** La salida, con «(+1)» si fue otro día: quien cierra a las dos sale al día siguiente. */
function laSalida(entro: Date, salio: Date | null, zona: string): string {
  if (salio === null) return 'Sin salida';
  const otroDia = diaDelLocal(salio, zona) !== diaDelLocal(entro, zona);
  return `${hora(salio, zona)}${otroDia ? ' (+1)' : ''}`;
}

/** «7 h 38 min», «45 min», «—» si es cero. */
export function enHorasYMinutos(minutos: number): string {
  if (minutos <= 0) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${String(m)} min`;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)} min`;
}

const POR_QUE_SIN_UBICACION: Readonly<Record<string, string>> = {
  la_nego: 'no dio permiso',
  sin_senal: 'sin señal',
  no_la_da_el_aparato: 'el aparato no la da',
};

function desdeDonde(f: FilaLeida): string {
  if (f.sin_donde === 'aparato_del_local') return 'Aparato del local';
  if (f.metros !== null) return `Móvil, a ${String(f.metros)} m`;
  if (f.sin_donde !== null)
    return `Móvil, sin ubicación (${POR_QUE_SIN_UBICACION[f.sin_donde] ?? f.sin_donde})`;
  return 'Móvil';
}

function minutosDe(segundos: string): number {
  return Math.floor(Number(segundos) / 60);
}

/** Una celda de la hoja: entre comillas si lleva punto y coma, comillas o saltos. */
function celda(valor: string | number): string {
  const texto = String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/**
 * La hoja: la cabecera y una fila por fichaje. **Con el original al lado** cuando se
 * corrigió, que es lo que la Inspección mira.
 */
export function laHoja(filas: readonly FilaLeida[], zona: string): string {
  const cabecera = [
    'Persona',
    'Día',
    'Entrada',
    'Salida',
    'Pausas (min)',
    'Trabajado (min)',
    'Desde',
    'Veces corregido',
    'Entrada original',
    'Salida original',
    'Motivo de la última corrección',
    'Corregido por',
    'Corregido el',
  ];
  const lineas = filas.map((f) =>
    [
      f.persona,
      f.fecha,
      hora(f.entro_en, zona),
      laSalida(f.entro_en, f.salio_en, zona),
      minutosDe(f.pausas),
      minutosDe(f.segundos),
      desdeDonde(f),
      f.correcciones,
      f.entro_original === null ? '' : hora(f.entro_original, zona),
      f.entro_original === null
        ? ''
        : f.salio_original === null
          ? 'Sin salida'
          : laSalida(f.entro_original, f.salio_original, zona),
      f.motivo ?? '',
      f.quien ?? '',
      f.corregido_en === null
        ? ''
        : `${diaDelLocal(f.corregido_en, zona)} ${hora(f.corregido_en, zona)}`,
    ]
      .map(celda)
      .join(';'),
  );
  // Con BOM y saltos de Windows: así Excel abre las tildes bien a la primera.
  return `\uFEFF${[cabecera.join(';'), ...lineas].join('\r\n')}\r\n`;
}

async function laHuella(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...resumen].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function diasEntre(desde: string, hasta: string): number {
  return (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000;
}

export const registroDeJornada = consulta<EntradaRegistroDeJornada, ElRegistro>({
  nombre: 'registro_de_jornada',
  entrada: entradaRegistroDeJornada,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    if (diasEntre(entrada.desde, entrada.hasta) >= DIAS_MAXIMOS) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['hasta'],
        porque: 'Como mucho, un año de una vez. Pide el resto en otro periodo.',
      });
    }
    if (entrada.formato === 'pdf' && contexto.pdf === null) {
      throw new FalloDeAplicacion('pdf_sin_encender');
    }

    const marca = await laMarcaDelLocal(contexto, localId);
    const filas = await leerElRegistro(contexto, localId, entrada.desde, entrada.hasta);
    const hoja = laHoja(filas, marca.zonaHoraria);
    const huella = await laHuella(hoja);
    const nombre = `registro-de-jornada-${entrada.desde}-a-${entrada.hasta}`;

    if (entrada.formato === 'hoja') {
      return {
        nombre: `${nombre}.csv`,
        tipo: 'text/csv',
        base64: enBase64(new TextEncoder().encode(hoja)),
        huella,
        fichajes: filas.length,
      };
    }

    const zona = marca.zonaHoraria;
    const filasDelPdf: FilaDelRegistro[] = filas.map((f) => ({
      persona: f.persona,
      fecha: diaCorto(f.fecha),
      entrada: hora(f.entro_en, zona),
      salida: laSalida(f.entro_en, f.salio_en, zona),
      pausas: enHorasYMinutos(minutosDe(f.pausas)),
      trabajado: enHorasYMinutos(minutosDe(f.segundos)),
      desde: desdeDonde(f),
      correccion:
        f.correcciones === 0 || f.entro_original === null
          ? null
          : {
              veces: f.correcciones,
              original: `${hora(f.entro_original, zona)} – ${f.salio_original === null ? 'sin salida' : laSalida(f.entro_original, f.salio_original, zona)}`,
              motivo: f.motivo ?? '',
              quienYCuando: `${f.quien ?? 'Alguien'}, el ${f.corregido_en === null ? '' : diaCorto(diaDelLocal(f.corregido_en, zona))}`,
            },
    }));

    const porPersona = new Map<string, { dias: Set<string>; minutos: number }>();
    for (const f of filas) {
      const suyo = porPersona.get(f.persona) ?? { dias: new Set<string>(), minutos: 0 };
      suyo.dias.add(f.fecha);
      suyo.minutos += minutosDe(f.segundos);
      porPersona.set(f.persona, suyo);
    }

    const periodo =
      entrada.desde === entrada.hasta
        ? diaCorto(entrada.desde)
        : `del ${diaCorto(entrada.desde)} al ${diaCorto(entrada.hasta)}`;

    const html = documentoDelRegistro({
      marca,
      periodo,
      hechoEl: hechoEl(contexto.ahora, zona),
      filas: filasDelPdf,
      totales: [...porPersona.entries()].map(([persona, t]) => ({
        persona,
        dias: t.dias.size,
        trabajado: enHorasYMinutos(t.minutos),
      })),
      huella,
      pausaCuenta: await laPausaCuenta(contexto, localId),
    });

    const pdf = await hacerElPdf(contexto, html, {
      nombre: `${nombre}.pdf`,
      pie: `Registro de jornada · ${marca.nombreDelLocal} · ${periodo}`,
      apaisado: true,
    });
    return { ...pdf, huella, fichajes: filas.length };
  },
});

async function laPausaCuenta(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ cuenta: boolean }[]>`
    select pausa_cuenta_como_trabajo as cuenta from estook.local where id = ${localId}
  `;
  return filas[0]?.cuenta === true;
}
