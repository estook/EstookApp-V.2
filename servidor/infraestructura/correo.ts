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
/**
 * Los dominios desde los que **nunca** se puede enviar.
 *
 * No es una lista de seguridad: es una lista de cosas que no funcionan. Resend
 * —y cualquier otro— solo deja enviar desde un dominio que hayas verificado, y
 * el correo de Gmail con el que abriste la cuenta **no es tuyo**: es de Google.
 *
 * Está escrita porque pasó. El 21 de septiembre se puso `CORREO_REMITENTE` a
 * `estookapp@gmail.com` —que es el correo de la cuenta, y parece lo razonable— y
 * crear cuenta dejó de funcionar. Resend contestaba **«The gmail.com domain is
 * not verified»**, y se perdió un día buscando el fallo en `estook.com`, que
 * llevaba verificado desde el 17.
 */
const DE_ESTOS_NO_SE_PUEDE_ENVIAR = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'live.com',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
];

/** El dominio de un remitente, venga como `Nombre <a@b.com>` o como `a@b.com`. */
export function dominioDelRemitente(remitente: string): string {
  const dentroDeAngulos = /<([^>]+)>/.exec(remitente);
  const direccion = (dentroDeAngulos?.[1] ?? remitente).trim();
  return (direccion.split('@')[1] ?? '').toLowerCase();
}

/**
 * Por qué un remitente no vale, o nulo si vale.
 *
 * Se comprueba **antes de llamar a Resend**, para que el fallo lo diga la lista
 * de claves y no un 403 traducido tres capas más arriba. Es la lección 65 otra
 * vez: un valor de configuración se comprueba contra lo que de verdad exige el
 * servicio, no contra lo que parece razonable.
 */
export function porQueNoValeElRemitente(remitente: string): string | null {
  const dominio = dominioDelRemitente(remitente);
  if (dominio === '') {
    return `«${remitente}» no tiene una dirección de correo dentro. Se escribe «Estook <hola@estook.com>».`;
  }
  if (DE_ESTOS_NO_SE_PUEDE_ENVIAR.includes(dominio)) {
    return (
      `Desde «${dominio}» no se puede enviar: ese dominio no es tuyo y no se puede verificar. ` +
      'CORREO_REMITENTE tiene que ser una dirección de un dominio verificado en Resend, ' +
      'como «Estook <hola@estook.com>».'
    );
  }
  return null;
}

/**
 * Quién firma. Tiene que ser de un dominio verificado en Resend.
 *
 * Si `CORREO_REMITENTE` no vale, **se ignora y se usa el de siempre**, dejando
 * dicho por qué en el registro. Quedarse con un remitente imposible sería
 * cambiar un fallo de configuración por un correo que no sale nunca, y eso ya
 * costó un día.
 */
function remitente(): string {
  const porDefecto = 'Estook <hola@estook.com>';
  const puesto = variable('CORREO_REMITENTE');
  if (puesto === undefined || puesto.trim() === '') return porDefecto;

  const porque = porQueNoValeElRemitente(puesto);
  if (porque === null) return puesto;

  console.error(
    JSON.stringify({
      nivel: 'error',
      mensaje: 'CORREO_REMITENTE no vale, se usa el de siempre',
      detalle: porque,
    }),
  );
  return porDefecto;
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
