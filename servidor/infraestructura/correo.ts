import { variable } from '@estook/utiles';

/**
 * El correo que sale de Estook (0017, encendido en la 0042).
 *
 * Un puerto, como el almacén y Google: la capa de aplicación sabe mandar un
 * correo y no sabe que detrás está Resend. Así se prueba con un correo de mentira
 * que guarda lo que se ha mandado, y en producción **se enciende al poner la
 * clave** (`RESEND_API_KEY`). Sin ella es nulo, y lo que necesita mandar un correo
 * lo dice en vez de romperse (0022).
 */

export interface CorreoParaMandar {
  readonly para: string;
  readonly asunto: string;
  /** El texto plano, que es lo que leen los que no pintan HTML. */
  readonly texto: string;
  readonly html: string;
}

export interface CorreoSaliente {
  mandar(correo: CorreoParaMandar): Promise<void>;
}

/** Resend no ha contestado bien. Lo traduce a una frase la capa de aplicación. */
export class CorreoNoSale extends Error {
  readonly estado: number;

  constructor(estado: number) {
    super(`Resend ha contestado ${estado}`);
    this.name = 'CorreoNoSale';
    this.estado = estado;
  }
}

/**
 * Quién firma. Tiene que ser de un dominio verificado en Resend, y por eso se puede
 * cambiar sin tocar código; si no se dice, `hola@estook.com`.
 */
function remitente(): string {
  const puesto = variable('CORREO_REMITENTE');
  return puesto !== undefined && puesto.trim() !== '' ? puesto : 'Estook <hola@estook.com>';
}

export function correoDeResend(
  clave: string | undefined = variable('RESEND_API_KEY'),
): CorreoSaliente | null {
  if (clave === undefined || clave.trim() === '') return null;

  return {
    async mandar(correo) {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: remitente(),
          to: [correo.para],
          subject: correo.asunto,
          text: correo.texto,
          html: correo.html,
        }),
      });
      if (!respuesta.ok) throw new CorreoNoSale(respuesta.status);
    },
  };
}

/** Uno de mentira: guarda lo que se manda, para que las pruebas lean el código. */
export function correoEnMemoria(): CorreoSaliente & { readonly mandados: CorreoParaMandar[] } {
  const mandados: CorreoParaMandar[] = [];
  return {
    mandados,
    mandar(correo) {
      mandados.push(correo);
      return Promise.resolve();
    },
  };
}
