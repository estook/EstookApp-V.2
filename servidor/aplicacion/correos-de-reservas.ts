import type { CorreoParaMandar } from '../infraestructura/correo.ts';

/**
 * Los correos al cliente que reserva por la web (la Ampliación 5 · 2, decisión 0153, sección 6). **Solo si el
 * local enciende «Avisar al cliente por correo»** (Richi, 24-nov): la reserva con su código, el recordatorio
 * del día antes, que se ha cancelado sola, y «se ha liberado una mesa».
 *
 * Van **con el nombre del local**, que es con quien ha reservado; Estook solo firma abajo. Cortos, y los
 * botones abren la web de reservas: **confirmar o cancelar se hace allí, con un toque**, nunca solo por
 * abrir el enlace (los programas de correo abren los enlaces para revisarlos, y cancelarían reservas).
 */

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function envolver(local: string, parrafos: readonly string[]): string {
  const cuerpo = parrafos
    .map((p) =>
      p.startsWith('<table') || p.startsWith('<a ')
        ? `<div style="margin:0 0 16px">${p}</div>`
        : `<p style="margin:0 0 16px">${p}</p>`,
    )
    .join('');
  return [
    // Con su ancho de móvil: sin esto, el navegador del móvil lo pinta a 980 y hay que ampliar.
    '<!doctype html><html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:16px;background:#f5f3ef;',
    'font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1d2a2e;font-size:16px;line-height:1.5">',
    '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    `<p style="margin:0 0 24px;font-weight:700;font-size:20px">${escapar(local)}</p>`,
    cuerpo,
    '<p style="margin:24px 0 0;color:#6b7478;font-size:13px">Reserva hecha con Estook · estook.com</p>',
    '</div></body></html>',
  ].join('');
}

function boton(texto: string, enlace: string, color: string): string {
  return `<a href="${escapar(enlace)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:10px;background:${color};color:#ffffff;font-weight:700;text-decoration:none">${escapar(texto)}</a>`;
}

/** La caja con la reserva: el día, la hora, cuántos y el código. */
function laCaja(r: LoDeLaReserva): string {
  return [
    '<table role="presentation" style="width:100%;border-collapse:collapse;background:#f1effe;border-radius:12px">',
    '<tr><td style="padding:16px">',
    `<div style="font-size:14px;color:#5433c4;font-weight:700">${escapar(r.dia)}</div>`,
    `<div style="font-size:30px;font-weight:800">${escapar(r.hora)}</div>`,
    `<div>${escapar(r.nombre)} · ${String(r.comensales)} ${r.comensales === 1 ? 'persona' : 'personas'}</div>`,
    `<div style="margin-top:6px">Código <strong style="letter-spacing:.15em">${escapar(r.codigo)}</strong></div>`,
    '</td></tr></table>',
  ].join('');
}

export interface LoDeLaReserva {
  readonly para: string;
  readonly local: string;
  /** «Sábado 28 de noviembre». */
  readonly dia: string;
  readonly hora: string;
  readonly comensales: number;
  readonly nombre: string;
  readonly codigo: string;
  /** «20:45», si el local pide que confirmen; nulo si no. */
  readonly confirmarAntesDe: string | null;
  /** La web de reservas del local, ya abierta en esta reserva. */
  readonly enlace: string;
}

/** Nada más reservar: su reserva con el código, y si tiene que confirmarla. */
export function correoDeLaReserva(r: LoDeLaReserva): CorreoParaMandar {
  const confirmar =
    r.confirmarAntesDe === null
      ? null
      : `Confírmala antes de las ${r.confirmarAntesDe}: si no, se cancela sola y la mesa queda libre para otros.`;
  return {
    para: r.para,
    asunto: `Tu reserva en ${r.local}: ${r.dia}, ${r.hora}`,
    texto: [
      `Hola, ${r.nombre}:`,
      '',
      `Tienes reserva en ${r.local} el ${r.dia.toLowerCase()} a las ${r.hora}, para ${String(r.comensales)}.`,
      `Tu código es ${r.codigo}.`,
      ...(confirmar === null ? [] : ['', confirmar]),
      '',
      `Para confirmarla o cancelarla: ${r.enlace}`,
    ].join('\n'),
    html: envolver(r.local, [
      `Hola, ${escapar(r.nombre)}:`,
      'Tienes reserva. Te esperamos:',
      laCaja(r),
      ...(confirmar === null ? [] : [escapar(confirmar)]),
      boton(
        r.confirmarAntesDe === null ? 'Ver mi reserva' : 'Confirmar o cancelar',
        r.enlace,
        '#5433c4',
      ),
      'Si no la has hecho tú, no hagas nada: sin tu teléfono y el código nadie puede tocarla.',
    ]),
  };
}

/** El día antes (o al momento, si se reservó para hoy): «Confirmo» y «Cancelar». */
export function correoDelRecordatorio(
  r: LoDeLaReserva & { readonly esHoy: boolean },
): CorreoParaMandar {
  const cuando = r.esHoy ? 'hoy' : 'mañana';
  return {
    para: r.para,
    asunto: `${r.esHoy ? 'Hoy' : 'Mañana'} te esperamos en ${r.local} a las ${r.hora}`,
    texto: [
      `Hola, ${r.nombre}:`,
      '',
      `Te recordamos tu reserva en ${r.local} ${cuando} a las ${r.hora}, para ${String(r.comensales)}.`,
      ...(r.confirmarAntesDe === null
        ? []
        : [`Confírmala antes de las ${r.confirmarAntesDe}, o se cancelará sola.`]),
      '',
      `Confirmar o cancelar: ${r.enlace}`,
    ].join('\n'),
    html: envolver(r.local, [
      `Hola, ${escapar(r.nombre)}:`,
      `Te recordamos tu reserva de ${cuando}:`,
      laCaja(r),
      ...(r.confirmarAntesDe === null
        ? []
        : [escapar(`Confírmala antes de las ${r.confirmarAntesDe}, o se cancelará sola.`)]),
      `${boton('Confirmo que vamos', `${r.enlace}&que=confirmar`, '#11804f')}${boton('Cancelar', `${r.enlace}&que=cancelar`, '#ad2149')}`,
      'Si no podéis venir, cancélala: así otra mesa la aprovecha.',
    ]),
  };
}

/** Se ha cancelado sola: no se confirmó a tiempo. */
export function correoDeCanceladaSola(
  r: Omit<LoDeLaReserva, 'confirmarAntesDe'> & { readonly reservar: string },
): CorreoParaMandar {
  return {
    para: r.para,
    asunto: `Tu reserva en ${r.local} se ha cancelado`,
    texto: [
      `Hola, ${r.nombre}:`,
      '',
      `Tu reserva del ${r.dia.toLowerCase()} a las ${r.hora} se ha cancelado porque no se confirmó a tiempo.`,
      `Si aún queréis venir, mirad si queda mesa: ${r.reservar}`,
    ].join('\n'),
    html: envolver(r.local, [
      `Hola, ${escapar(r.nombre)}:`,
      escapar(
        `Tu reserva del ${r.dia.toLowerCase()} a las ${r.hora} se ha cancelado porque no se confirmó a tiempo, y la mesa ha quedado libre.`,
      ),
      boton('Mirar si queda mesa', r.reservar, '#5433c4'),
    ]),
  };
}

/** «Avísame si se libera»: se ha liberado una mesa el día que pidió. */
export function correoDeSeHaLiberado(r: {
  readonly para: string;
  readonly local: string;
  readonly nombre: string;
  readonly dia: string;
  readonly reservar: string;
}): CorreoParaMandar {
  return {
    para: r.para,
    asunto: `Se ha liberado una mesa en ${r.local} el ${r.dia.toLowerCase()}`,
    texto: [
      `Hola, ${r.nombre}:`,
      '',
      `Nos pediste que te avisáramos: se ha liberado una mesa el ${r.dia.toLowerCase()}.`,
      `No te la guardamos: el primero que reserva, se la queda. ${r.reservar}`,
    ].join('\n'),
    html: envolver(r.local, [
      `Hola, ${escapar(r.nombre)}:`,
      escapar(`Nos pediste que te avisáramos: se ha liberado una mesa el ${r.dia.toLowerCase()}.`),
      'No te la guardamos: el primero que reserva, se la queda.',
      boton('Reservar', r.reservar, '#5433c4'),
    ]),
  };
}
