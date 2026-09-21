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

/**
 * Resend no ha contestado bien. Lo traduce a una frase la capa de aplicación.
 *
 * ── Por qué lleva el motivo y no solo el código ──────────────────────────────
 *
 * Porque el código no dice nada y el motivo lo dice todo. Al encender el correo
 * en producción, crear cuenta devolvía «se nos ha roto algo por dentro» y **no
 * quedaba rastro de por qué**: el fallo se atrapaba, se traducía y se tiraba.
 * Desde fuera era indistinguible un dominio sin verificar de una caída de
 * Resend, y las dos se arreglan de forma opuesta.
 *
 * Ahora viaja lo que contesta Resend, que es donde está la frase de verdad
 * («The estook.com domain is not verified», «You can only send testing emails to
 * your own email address»). **No se le enseña a nadie de fuera**: va al registro
 * del servidor, que es quien tiene que verlo.
 */
export class CorreoNoSale extends Error {
  readonly estado: number;
  /** Lo que contestó Resend, recortado. Para el registro, nunca para la pantalla. */
  readonly motivo: string;

  constructor(estado: number, motivo = '') {
    super(`Resend ha contestado ${estado}${motivo === '' ? '' : `: ${motivo}`}`);
    this.name = 'CorreoNoSale';
    this.estado = estado;
    this.motivo = motivo;
  }

  /**
   * Si es cosa de cómo está configurado, y por tanto **no se arregla esperando**.
   *
   * Un 4xx de Resend es el dominio sin verificar, el remitente mal escrito o la
   * clave equivocada: dentro de un minuto va a fallar igual. Un 5xx o un corte de
   * red sí es pasajero. Se separan porque lo que hay que decirle a quien está
   * delante de la pantalla es distinto: a uno se le ofrece Google, al otro se le
   * pide que reintente.
   */
  get esDeConfiguracion(): boolean {
    return this.estado >= 400 && this.estado < 500;
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
      if (!respuesta.ok) {
        // El cuerpo es donde Resend explica qué pasa. Se lee con cuidado: si no
        // se puede leer, el fallo sigue siendo el fallo, y quedarse sin motivo es
        // peor que quedarse sin nada.
        const motivo = await respuesta
          .text()
          .then((texto) => texto.slice(0, 400))
          .catch(() => '');
        throw new CorreoNoSale(respuesta.status, motivo);
      }
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
