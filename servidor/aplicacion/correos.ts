import {
  MINUTOS_DEL_CODIGO_DE_REGISTRO,
  type CifraDelCorreo,
  type CorreoDeLaCuenta,
} from '@estook/dominio';
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
  // Una tabla no puede ir dentro de un párrafo: el programa de correo lo rompería.
  const cuerpo = parrafos
    .map((p) =>
      p.startsWith('<table')
        ? `<div style="margin:0 0 16px">${p}</div>`
        : `<p style="margin:0 0 16px">${p}</p>`,
    )
    .join('');
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

// ── A2 · Cambiar el correo de acceso, con doble confirmación (0041) ─────────

/** El enlace de la app para confirmar o parar el cambio: el token va tras la almohadilla. */
export function enlaceDelCambioDeCorreo(que: 'confirmar' | 'parar', token: string): string {
  return `https://estook.com/app/#/correo?${que}=${encodeURIComponent(token)}`;
}

/** Al correo **nuevo**: confirmarlo es lo que lo cambia. */
export function correoParaConfirmarElNuevo(
  para: string,
  nombre: string,
  enlace: string,
): CorreoParaMandar {
  const saludo = `Hola, ${nombre}:`;
  const frase =
    'Estook va a cambiar el correo con el que entras a este. Para que el cambio se haga, confírmalo desde aquí en las próximas 24 horas.';
  return {
    para,
    asunto: 'Confirma tu nuevo correo de Estook',
    texto: [saludo, '', frase, '', enlace, '', 'Si no lo has pedido tú, no hagas nada.'].join('\n'),
    html: envolver([
      escapar(saludo),
      escapar(frase),
      `<a href="${escapar(enlace)}" style="display:inline-block;background:#ff7a00;color:#1d2a2e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">Confirmar el correo</a>`,
      'Si no lo has pedido tú, no hagas nada.',
    ]),
  };
}

/** Al correo **de ahora**: el aviso, y un enlace para pararlo si no ha sido quien entra. */
export function correoDeAvisoAlDeAhora(
  para: string,
  nombre: string,
  nuevo: string,
  enlace: string,
): CorreoParaMandar {
  const saludo = `Hola, ${nombre}:`;
  const frase = `Nos han pedido cambiar el correo con el que entras en Estook a ${nuevo}. Si lo has pedido tú, no hagas nada. Si no, páralo desde aquí: tu cuenta se queda como está.`;
  return {
    para,
    asunto: 'Van a cambiar tu correo de Estook',
    texto: [saludo, '', frase, '', enlace].join('\n'),
    html: envolver([
      escapar(saludo),
      escapar(frase),
      `<a href="${escapar(enlace)}" style="display:inline-block;background:#1d2a2e;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">No he sido yo: pararlo</a>`,
    ]),
  };
}

// ── R · El correo de un aviso (0052) ────────────────────────────────────────

export interface AvisoParaElCorreo {
  readonly titulo: string;
  readonly detalle: string | null;
  /** A dónde lleva dentro de la app: `/almacen/compras/pedidos?pedido=…`. */
  readonly ir: string | null;
  /** Las cifras de un informe (R2 · 0053): van en una tabla, encima de las frases. */
  readonly cifras?: readonly CifraDelCorreo[] | null;
}

/**
 * La tabla de cifras de un informe, **con estilos en línea**: los programas de
 * correo quitan las hojas de estilo. El color solo acompaña a la flecha, nunca la
 * sustituye (B8): «+12 %» se lee igual sin él.
 */
function tablaDeCifras(cifras: readonly CifraDelCorreo[]): string {
  const filas = cifras
    .map((cifra) => {
      const color =
        cifra.bueno === true ? '#1f7a4d' : cifra.bueno === false ? '#b3261e' : '#6b7478';
      const cambio =
        cifra.cambio === null
          ? ''
          : `<span style="color:${color};font-size:13px;font-weight:600">${escapar(cifra.cambio)}</span>`;
      return [
        '<tr>',
        `<td style="padding:8px 0;border-bottom:1px solid #ece9e3">${escapar(cifra.nombre)}</td>`,
        `<td style="padding:8px 0;border-bottom:1px solid #ece9e3;text-align:right;font-weight:700;white-space:nowrap">${escapar(cifra.valor)}</td>`,
        `<td style="padding:8px 0 8px 12px;border-bottom:1px solid #ece9e3;text-align:right;white-space:nowrap">${cambio}</td>`,
        '</tr>',
      ].join('');
    })
    .join('');
  return `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">${filas}</table>`;
}

/**
 * Un aviso que alguien ha pedido recibir también por correo (0017, regla 1).
 *
 * Lo mismo que dice la campana, con un botón que lleva a resolverlo (regla 4: un
 * aviso siempre dice qué hacer) y, abajo, **cómo dejar de recibirlo**, que es lo
 * primero que busca quien recibe un correo que no esperaba.
 */
/**
 * El correo del chat (C2 · 0075): a quien no tiene el móvil puesto, sus privados y lo
 * que le nombra, sin leer, uno al día como mucho. **Sin el texto de los mensajes**, y
 * abajo cómo cambiarlo: poner el móvil, y entonces le suena ahí en vez de esto.
 */
export function correoDelChatParaMandar(
  para: string,
  dice: { readonly titulo: string; readonly detalle: string },
): CorreoParaMandar {
  const enlace = 'https://estook.com/app/#/chat';
  const ajustes = 'https://estook.com/app/#/ajustes/avisos';
  return {
    para,
    asunto: dice.titulo,
    texto: [
      'Hola:',
      '',
      dice.titulo,
      dice.detalle,
      '',
      `Ábrelo en Estook: ${enlace}`,
      '',
      `Te llega porque no tienes los avisos del móvil puestos. Si los pones, te suena en el móvil y deja de llegarte esto: ${ajustes}`,
    ].join('\n'),
    html: envolver([
      'Hola:',
      `<strong>${escapar(dice.titulo)}</strong>`,
      escapar(dice.detalle),
      `<a href="${enlace}" style="display:inline-block;background:#ff7a00;color:#1d2a2e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">Abrir el chat</a>`,
      `<span style="color:#6b7478;font-size:13px">Te llega porque no tienes los avisos del móvil puestos. Si los pones en <a href="${ajustes}" style="color:#6b7478">Ajustes → Avisos</a>, te suena en el móvil y deja de llegarte esto.</span>`,
    ]),
  };
}

export function correoDeUnAviso(para: string, aviso: AvisoParaElCorreo): CorreoParaMandar {
  const enlace = `https://estook.com/app/#${aviso.ir ?? '/'}`;
  const ajustes = 'https://estook.com/app/#/ajustes/avisos';
  const cifras = aviso.cifras ?? [];
  const texto = [
    'Hola:',
    '',
    aviso.titulo,
    ...cifras.map((c) => `· ${c.nombre}: ${c.valor}${c.cambio === null ? '' : ` (${c.cambio})`}`),
    ...(aviso.detalle === null ? [] : [aviso.detalle]),
    '',
    `Míralo en Estook: ${enlace}`,
    '',
    `Te llega porque lo tienes encendido en Ajustes → Avisos: ${ajustes}`,
  ].join('\n');

  return {
    para,
    asunto: aviso.titulo,
    texto,
    html: envolver([
      'Hola:',
      `<strong>${escapar(aviso.titulo)}</strong>`,
      ...(cifras.length === 0 ? [] : [tablaDeCifras(cifras)]),
      ...(aviso.detalle === null ? [] : [escapar(aviso.detalle)]),
      `<a href="${escapar(enlace)}" style="display:inline-block;background:#ff7a00;color:#1d2a2e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">Verlo en Estook</a>`,
      `<span style="color:#6b7478;font-size:13px">Te llega porque lo tienes encendido en <a href="${ajustes}" style="color:#6b7478">Ajustes → Avisos</a>. Desde ahí lo apagas.</span>`,
    ]),
  };
}
