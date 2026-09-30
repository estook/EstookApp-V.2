import { pieDelDocumento, type MarcaDelDocumento } from '@estook/documentos';
import { MotorNoContesta } from '../infraestructura/pdf.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Hacer un PDF (H1 · decisión 0068).
 *
 * Todas las consultas que dan un PDF pasan por aquí: escriben su página con
 * `@estook/documentos` y esto la manda al motor, y traduce lo que salga mal a una
 * frase. **Sin motor, se dice**: «los PDF todavía no están encendidos».
 *
 * El PDF viaja en la respuesta, en base64, y **no se guarda en ningún sitio**: se hace
 * cuando alguien lo pide, con lo que hay en ese momento. Así nunca hay un PDF viejo
 * por ahí que diga otra cosa que la app.
 */

export interface UnPdf {
  /** Con qué nombre se guarda: «tu-semana-2026-09-21.pdf». */
  readonly nombre: string;
  readonly tipo: 'application/pdf';
  readonly base64: string;
}

/** Cuánto vale el enlace del logo: lo justo para que el motor lo lea. */
const LO_QUE_DURA_EL_ENLACE_DEL_LOGO = 300;

/** El nombre, el color y el logo del local, para la cabecera de sus documentos. */
export async function laMarcaDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<MarcaDelDocumento & { readonly zonaHoraria: string }> {
  const filas = await contexto.sql<
    {
      nombre: string;
      color_de_marca: string | null;
      logo_clave: string | null;
      zona_horaria: string;
    }[]
  >`
    select nombre, color_de_marca, logo_clave, zona_horaria from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('local_ajeno');
  const logo =
    fila.logo_clave === null || contexto.almacen === null
      ? null
      : await contexto.almacen
          .enlace(fila.logo_clave, LO_QUE_DURA_EL_ENLACE_DEL_LOGO)
          .catch(() => null);
  return {
    nombreDelLocal: fila.nombre,
    color: fila.color_de_marca,
    logo,
    zonaHoraria: fila.zona_horaria,
  };
}

/** «Hecho el 30 de septiembre de 2026, 19:40», con la hora del local. */
export function hechoEl(ahora: Date, zonaHoraria: string): string {
  const dia = new Intl.DateTimeFormat('es-ES', {
    timeZone: zonaHoraria,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(ahora);
  const hora = new Intl.DateTimeFormat('es-ES', {
    timeZone: zonaHoraria,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ahora);
  return `Hecho el ${dia}, ${hora}`;
}

/** Bytes a base64 sin `Buffer`, que en Deno no está sin pedirlo. */
export function enBase64(bytes: Uint8Array): string {
  let texto = '';
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    texto += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(texto);
}

/** La página, hecha PDF por el motor, o la frase de por qué no. */
export async function hacerElPdf(
  contexto: Contexto,
  html: string,
  opciones: { readonly nombre: string; readonly pie: string; readonly apaisado?: boolean },
): Promise<UnPdf> {
  if (contexto.pdf === null) throw new FalloDeAplicacion('pdf_sin_encender');
  try {
    const bytes = await contexto.pdf.hacer(html, {
      apaisado: opciones.apaisado === true,
      pie: pieDelDocumento(opciones.pie),
    });
    return { nombre: opciones.nombre, tipo: 'application/pdf', base64: enBase64(bytes) };
  } catch (fallo) {
    // Lo que contestó el motor va al registro, nunca a la pantalla.
    console.error(
      JSON.stringify({
        nivel: 'error',
        mensaje: 'el PDF no ha salido',
        correlacion_id: contexto.correlacionId,
        motor: contexto.pdf.quien,
        estado: fallo instanceof MotorNoContesta ? fallo.estado : null,
        detalle: fallo instanceof Error ? fallo.message : String(fallo),
      }),
    );
    throw new FalloDeAplicacion('pdf_no_disponible');
  }
}
