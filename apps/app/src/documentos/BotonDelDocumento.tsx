import { useState } from 'react';
import { Boton, ErrorEnCristiano } from '@estook/ui';
import { IconoDocumento } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El botón que trae un documento del servidor (H1 · decisión 0068).
 *
 * **El PDF lo hace el servidor**, nunca este navegador (regla 7): aquí solo se pide,
 * llega hecho en base64 y se entrega.
 *
 * **Se descarga siempre, y además se puede compartir** (30-sep, Richi). La primera
 * versión compartía si el aparato sabía y solo descargaba si no: en un ordenador con
 * Windows, que también sabe compartir, no había forma de guardarlo. Ahora el primer
 * toque lo descarga, y debajo sale «Compartir» para mandarlo por WhatsApp o por
 * correo. Va en un segundo toque a propósito: el navegador solo deja abrir la hoja
 * de compartir justo después de tocar algo, y el PDF tarda unos segundos en llegar.
 *
 * Si los PDF todavía no están encendidos, lo dice el servidor con su frase, y la
 * pantalla sigue igual: lo que se quería ver ya está delante.
 */

export interface UnDocumento {
  readonly nombre: string;
  readonly tipo: string;
  readonly base64: string;
}

function deBase64(base64: string, tipo: string): Blob {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

function descargar(fichero: File): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(fichero);
  enlace.download = fichero.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(enlace.href);
  }, 10_000);
}

/** Si este aparato sabe mandar un fichero a otra app (el móvil, y algunos ordenadores). */
function sabeCompartir(fichero: File): boolean {
  const compartir = navigator as Navigator & {
    canShare?: (datos: { files: File[] }) => boolean;
  };
  return typeof compartir.canShare === 'function' && compartir.canShare({ files: [fichero] });
}

export function BotonDelDocumento({
  consulta,
  parametros,
  texto,
  tono = 'secundario',
}: {
  /** La consulta que lo hace: `mi_informe_en_pdf`, `registro_de_jornada`. */
  readonly consulta: string;
  readonly parametros: Record<string, string>;
  readonly texto: string;
  readonly tono?: 'principal' | 'secundario' | 'texto';
}) {
  const { cliente } = usarSesion();
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  /** El último que llegó: se puede compartir o volver a bajar sin pedirlo otra vez. */
  const [listo, setListo] = useState<File | null>(null);

  async function pedir() {
    setPidiendo(true);
    setError(null);
    setListo(null);
    const respuesta = await cliente.consultar<UnDocumento>(consulta, parametros);
    setPidiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    const { nombre, tipo, base64 } = respuesta.datos;
    const fichero = new File([deBase64(base64, tipo)], nombre, { type: tipo });
    descargar(fichero);
    setListo(fichero);
  }

  async function compartir(fichero: File) {
    try {
      await navigator.share({ files: [fichero], title: fichero.name });
    } catch {
      // Quien cierra la hoja de compartir no quiere nada, y no es un error.
    }
  }

  return (
    <div className="flex flex-col gap-e2">
      <div>
        <Boton
          tono={tono}
          icono={<IconoDocumento size={18} />}
          cargando={pidiendo}
          textoCargando="Haciéndolo"
          onClick={() => {
            void pedir();
          }}
        >
          {texto}
        </Boton>
      </div>
      {listo !== null && (
        <div className="flex flex-wrap items-center gap-e2">
          <p role="status" className="text-secundario text-texto-suave">
            Descargado: {listo.name}
          </p>
          {sabeCompartir(listo) && (
            <Boton
              tono="texto"
              onClick={() => {
                void compartir(listo);
              }}
            >
              Compartir
            </Boton>
          )}
          <Boton
            tono="texto"
            onClick={() => {
              descargar(listo);
            }}
          >
            Bajarlo otra vez
          </Boton>
        </div>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
    </div>
  );
}
