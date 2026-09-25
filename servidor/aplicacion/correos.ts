import { MINUTOS_DEL_CODIGO_DE_REGISTRO, type CorreoDeLaCuenta } from '@estook/dominio';
import type { CorreoParaMandar } from '../infraestructura/correo.ts';

/**
 * Los correos que manda Estook al crear una cuenta (0042).
 *
 * Cortos, en español de España y sin nada que pinchar salvo lo imprescindible: un
 * correo con un código no necesita botones, y un enlace que «confirma tu cuenta»
 * es la forma exacta que tiene un correo falso. Se dice **qué hacer si no lo has
 * pedido tú**, que es lo primero que se pregunta quien lo recibe sin esperarlo.
 */

/** Lo que se mete en el HTML se escapa: un nombre es texto de otra persona. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function envolver(parrafos: readonly string[]): string {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
  return [
    '<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f5f3ef;',
    'font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1d2a2e;font-size:16px;line-height:1.5">',
    '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">',
    '<p style="margin:0 0 24px;font-weight:700;letter-spacing:.12em">ESTOOK</p>',
    cuerpo,
    '<p style="margin:24px 0 0;color:#6b7478;font-size:13px">Estook · estook.com</p>',
    '</div></body></html>',
  ].join('');
}

export function correoConElCodigo(para: string, nombre: string, codigo: string): CorreoParaMandar {
  const saludo = `Hola, ${nombre}:`;
  const texto = [
    saludo,
    '',
    `Tu código para crear tu cuenta de Estook es ${codigo}.`,
    `Vale durante ${MINUTOS_DEL_CODIGO_DE_REGISTRO} minutos.`,
    '',
    'Si no has sido tú, no hagas nada: sin este código no se crea ninguna cuenta.',
  ].join('\n');

  return {
    para,
    asunto: `${codigo} es tu código de Estook`,
    texto,
    html: envolver([
      escapar(saludo),
      'Tu código para crear tu cuenta de Estook es:',
      `<span style="font-size:32px;font-weight:700;letter-spacing:.2em">${codigo}</span>`,
      `Vale durante ${MINUTOS_DEL_CODIGO_DE_REGISTRO} minutos.`,
      'Si no has sido tú, no hagas nada: sin este código no se crea ninguna cuenta.',
    ]),
  };
}

/**
 * A quien intenta crear una cuenta con un correo que **ya tiene** una.
 *
 * La pantalla contesta exactamente lo mismo que si no la tuviera («te hemos
 * mandado un código»), para que nadie pueda averiguar qué correos usan Estook
 * probando direcciones. Quien de verdad es el dueño del correo se entera aquí.
 */
export function correoDeYaTienesCuenta(para: string): CorreoParaMandar {
  const texto = [
    'Hola:',
    '',
    'Alguien ha intentado crear una cuenta de Estook con este correo, pero ya tienes una.',
    'Entra en https://estook.com/app/ con tu correo y tu contraseña, o con Google.',
    '',
    'Si no has sido tú, no hagas nada: no se ha creado nada ni se ha cambiado tu cuenta.',
  ].join('\n');

  return {
    para,
    asunto: 'Ya tienes una cuenta de Estook',
    texto,
    html: envolver([
      'Hola:',
      'Alguien ha intentado crear una cuenta de Estook con este correo, pero <strong>ya tienes una</strong>.',
      'Entra en <a href="https://estook.com/app/">estook.com/app</a> con tu correo y tu contraseña, o con Google.',
      'Si no has sido tú, no hagas nada: no se ha creado nada ni se ha cambiado tu cuenta.',
    ]),
  };
}

/**
 * Los correos del pago (0048): el de cada día de impago, el de solo lectura y el de
 * fin de prueba. El texto lo escribe el dominio (`elCorreoDeHoy`); aquí se pinta, con
 * lo que va entre dos asteriscos en negrita y un enlace a Ajustes → Suscripción.
 */
export function correoDeLaCuenta(para: string, correo: CorreoDeLaCuenta): CorreoParaMandar {
  const enlace = 'https://estook.com/app/#/ajustes/suscripcion';
  const sinMarcas = (texto: string) => texto.replace(/\*\*(.+?)\*\*/g, '$1');
  const conNegrita = (texto: string) =>
    escapar(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return {
    para,
    asunto: correo.asunto,
    texto: [...correo.parrafos.map(sinMarcas), enlace].join('\n\n'),
    html: envolver([
      ...correo.parrafos.map(conNegrita),
      `<a href="${enlace}" style="display:inline-block;background:#ff7a00;color:#1d2a2e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">Ir a mi suscripción</a>`,
    ]),
  };
}
