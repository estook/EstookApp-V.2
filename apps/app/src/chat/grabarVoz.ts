import { SEGUNDOS_DE_VOZ } from '@estook/dominio';

/**
 * Grabar una nota de voz con lo que trae el móvil (C1 · 0073), sin librerías.
 *
 * Cada navegador graba en lo suyo: **WebM** con Opus en Android y en el ordenador, y
 * **MP4** en el iPhone, que no sabe grabar WebM. Se pide el primero que el navegador
 * dice que sabe, y se manda con su tipo: el servidor comprueba que los bytes son de
 * verdad de ese tipo. Y para oírlas, los dos lados entienden los dos formatos en los
 * navegadores de hoy; se prueba en un Android y en un iPhone antes de dar C1 por buena.
 */

const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** Si este navegador sabe grabar. En uno que no, el botón del micrófono no sale. */
export function sabeGrabar(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    'mediaDevices' in navigator &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export interface NotaGrabada {
  /** El tipo sin parámetros, que es lo que entiende el servidor: `audio/webm`. */
  readonly mime: string;
  /** En base64, sin el `data:` delante. */
  readonly contenido: string;
  readonly segundos: number;
  /** Para oírla antes de mandarla. Se suelta al terminar. */
  readonly direccion: string;
}

export interface Grabacion {
  /** Para y devuelve la nota. Nula si no ha dado tiempo a grabar nada. */
  terminar(): Promise<NotaGrabada | null>;
  /** Para y tira lo grabado. */
  descartar(): void;
}

/**
 * Empieza a grabar. Pide el permiso del micrófono la primera vez (al tocar el botón:
 * el iPhone no deja de otra forma). A los tres minutos para sola (0071, 12).
 */
export async function empezarAGrabar(alLlegarAlTope: () => void): Promise<Grabacion> {
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
  const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
  const grabadora = new MediaRecorder(
    flujo,
    formato === undefined ? undefined : { mimeType: formato },
  );
  const trozos: Blob[] = [];
  grabadora.addEventListener('dataavailable', (evento) => {
    if (evento.data.size > 0) trozos.push(evento.data);
  });
  const empezo = performance.now();
  grabadora.start(250);
  const tope = window.setTimeout(alLlegarAlTope, SEGUNDOS_DE_VOZ * 1000);

  function soltar(): void {
    window.clearTimeout(tope);
    for (const pista of flujo.getTracks()) pista.stop();
  }

  return {
    terminar() {
      return new Promise((resolver) => {
        grabadora.addEventListener(
          'stop',
          () => {
            soltar();
            const segundos = Math.min(
              SEGUNDOS_DE_VOZ,
              Math.ceil((performance.now() - empezo) / 1000),
            );
            const mime =
              (grabadora.mimeType || formato || 'audio/webm').split(';')[0] ?? 'audio/webm';
            const nota = new Blob(trozos, { type: mime });
            if (nota.size === 0 || segundos < 1) {
              resolver(null);
              return;
            }
            const lector = new FileReader();
            lector.addEventListener('load', () => {
              const resultado = typeof lector.result === 'string' ? lector.result : '';
              resolver({
                mime,
                contenido: resultado.replace(/^data:[^,]*,/, ''),
                segundos,
                direccion: URL.createObjectURL(nota),
              });
            });
            lector.addEventListener('error', () => {
              resolver(null);
            });
            lector.readAsDataURL(nota);
          },
          { once: true },
        );
        if (grabadora.state === 'inactive') grabadora.dispatchEvent(new Event('stop'));
        else grabadora.stop();
      });
    },
    descartar() {
      if (grabadora.state !== 'inactive') grabadora.stop();
      soltar();
    },
  };
}

/** Un fichero a base64, sin el `data:` delante. */
export function aBase64(fichero: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.addEventListener('load', () => {
      const resultado = typeof lector.result === 'string' ? lector.result : '';
      resolver(resultado.replace(/^data:[^,]*,/, ''));
    });
    lector.addEventListener('error', () => {
      rechazar(new Error('No se ha podido leer el fichero.'));
    });
    lector.readAsDataURL(fichero);
  });
}
