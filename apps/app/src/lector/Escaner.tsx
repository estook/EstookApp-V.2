import { useEffect, useRef, useState } from 'react';
import { Aviso, Boton, Campo, Hoja } from '@estook/ui';
import { crearDetector } from './detector.ts';
import { limpiarElCodigo } from './codigos.ts';

/**
 * El lector de códigos con la cámara (entrega L · el lector, adelantada el 25-sep).
 *
 * Una hoja con la cámara de atrás a todo el ancho y un recuadro donde poner el
 * código. Lee sola —no hay que pulsar nada— y **quien lo usa decide qué pasa**:
 * abrir el producto, darlo de alta, sumar uno al inventario o marcar la línea del
 * albarán. Con `seguido`, sigue abierta después de cada lectura, que es como se
 * cuenta una estantería.
 *
 * Y siempre **se puede escribir el código a mano**: sin cámara, sin permiso, o con
 * una etiqueta arrugada que no hay forma de leer.
 */
export interface EscanerProps {
  readonly titulo: string;
  /** Lo que se hace con cada código leído. */
  readonly alLeer: (codigo: string) => void;
  readonly alCerrar: () => void;
  /** Sigue leyendo después de cada código (el inventario). */
  readonly seguido?: boolean;
  /** Lo último que ha pasado, dicho debajo de la cámara: «Leche entera · 3». */
  readonly ultimo?: string | null;
}

/** Cada cuánto se mira la imagen: cuatro veces por segundo lee de sobra y no calienta el móvil. */
const CADA_MS = 250;
/** El mismo código seguido no cuenta dos veces si llega antes de esto. */
const MISMO_CODIGO_MS = 1500;

type ComoVa = 'abriendo' | 'leyendo' | 'sin-camara' | 'sin-permiso';

export function Escaner({
  titulo,
  alLeer,
  alCerrar,
  seguido = false,
  ultimo = null,
}: EscanerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [como, setComo] = useState<ComoVa>('abriendo');
  const [escrito, setEscrito] = useState('');
  const alLeerAhora = useRef(alLeer);
  alLeerAhora.current = alLeer;

  useEffect(() => {
    // Se lee con una función: leído a pelo, TypeScript lo daría por verdadero dentro
    // de estas funciones, y quien lo cambia es el desmontaje.
    const estado = { vivo: true };
    const sigueVivo = () => estado.vivo;
    let flujo: MediaStream | null = null;
    let reloj: number | undefined;
    let ultimoCodigo = '';
    let ultimaVez = 0;

    async function empezar() {
      // Sin `https` (o en un navegador viejo) no hay cámara que pedir.
      if (!('mediaDevices' in navigator)) {
        setComo('sin-camara');
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (fallo) {
        if (sigueVivo())
          setComo(
            fallo instanceof DOMException && fallo.name === 'NotAllowedError'
              ? 'sin-permiso'
              : 'sin-camara',
          );
        return;
      }
      if (!sigueVivo() || video.current === null) return;
      video.current.srcObject = flujo;
      await video.current.play().catch(() => undefined);
      const detector = await crearDetector().catch(() => null);
      if (!sigueVivo()) return;
      if (detector === null) {
        setComo('sin-camara');
        return;
      }
      setComo('leyendo');

      const mirar = async () => {
        if (!sigueVivo() || video.current === null) return;
        const codigo = await detector.leer(video.current).catch(() => null);
        const limpio = codigo === null ? null : limpiarElCodigo(codigo);
        const ahora = Date.now();
        if (limpio !== null && (limpio !== ultimoCodigo || ahora - ultimaVez > MISMO_CODIGO_MS)) {
          ultimoCodigo = limpio;
          ultimaVez = ahora;
          alLeerAhora.current(limpio);
          if (!seguido) return;
        }
        if (sigueVivo()) reloj = window.setTimeout(() => void mirar(), CADA_MS);
      };
      void mirar();
    }

    void empezar();
    return () => {
      estado.vivo = false;
      if (reloj !== undefined) window.clearTimeout(reloj);
      for (const pista of flujo?.getTracks() ?? []) pista.stop();
    };
  }, [seguido]);

  const aMano = limpiarElCodigo(escrito);

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={titulo}>
      <div className="flex flex-col gap-e3">
        {(como === 'abriendo' || como === 'leyendo') && (
          <div className="relative overflow-hidden rounded-grande bg-charcoal">
            <video
              ref={video}
              muted
              playsInline
              aria-label="Lo que ve la cámara"
              className="block aspect-[4/3] w-full object-cover"
            />
            {/* El recuadro donde se pone el código: dice dónde, sin texto. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[34%] -translate-y-1/2 rounded-grande border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
            />
            <p className="absolute inset-x-0 bottom-e2 text-center text-secundario font-medium text-white">
              {como === 'abriendo' ? 'Abriendo la cámara…' : 'Pon el código dentro del recuadro'}
            </p>
          </div>
        )}

        {como === 'sin-permiso' && (
          <Aviso tono="atencion" titulo="La cámara no tiene permiso">
            Dale permiso a Estook para usar la cámara en los ajustes del navegador, o escribe el
            código abajo.
          </Aviso>
        )}
        {como === 'sin-camara' && (
          <Aviso tono="info" titulo="Aquí no hay cámara que leer">
            Escribe el código abajo. Un lector de mano (USB o Bluetooth) también vale: se usa en
            cualquier pantalla sin configurar nada.
          </Aviso>
        )}

        {ultimo !== null && (
          <p
            aria-live="polite"
            className="rounded-medio bg-fondo px-e3 py-e2 text-cuerpo font-medium"
          >
            {ultimo}
          </p>
        )}

        <form
          className="flex items-end gap-e2"
          onSubmit={(e) => {
            e.preventDefault();
            if (aMano === null) return;
            alLeer(aMano);
            setEscrito('');
          }}
        >
          <div className="min-w-0 flex-1">
            <Campo
              etiqueta="O escribe el código"
              inputMode="numeric"
              value={escrito}
              onChange={(e) => {
                setEscrito(e.currentTarget.value);
              }}
            />
          </div>
          <Boton tono="secundario" type="submit" disabled={aMano === null}>
            Usar
          </Boton>
        </form>
      </div>
    </Hoja>
  );
}
