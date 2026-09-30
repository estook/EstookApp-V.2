import { useState } from 'react';
import { Boton, ErrorEnCristiano } from '@estook/ui';
import { IconoDocumento } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El botón que trae un documento del servidor (H1 · decisión 0068).
 *
 * **El PDF lo hace el servidor**, nunca este navegador (regla 7): aquí solo se pide,
 * llega hecho en base64 y se entrega. En el móvil se abre la hoja de compartir —para
 * mandarlo por WhatsApp o guardarlo— y en el ordenador se descarga.
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

/** Compartir si el aparato sabe (el móvil), y si no, descargar. */
async function entregar(documento: UnDocumento): Promise<void> {
  const blob = deBase64(documento.base64, documento.tipo);
  const fichero = new File([blob], documento.nombre, { type: documento.tipo });
  const compartir = navigator as Navigator & {
    canShare?: (datos: { files: File[] }) => boolean;
  };
  if (typeof compartir.canShare === 'function' && compartir.canShare({ files: [fichero] })) {
    try {
      await navigator.share({ files: [fichero], title: documento.nombre });
      return;
    } catch {
      // Quien cierra la hoja de compartir no quiere nada: no se descarga detrás.
      return;
    }
  }
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = documento.nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(enlace.href);
  }, 10_000);
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

  async function pedir() {
    setPidiendo(true);
    setError(null);
    const respuesta = await cliente.consultar<UnDocumento>(consulta, parametros);
    setPidiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await entregar(respuesta.datos);
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
      {error !== null && <ErrorEnCristiano error={error} />}
    </div>
  );
}
