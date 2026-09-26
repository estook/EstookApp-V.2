import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { direccionDeLaCarta } from '@estook/dominio';
import { IconoDescargar } from '@estook/iconos';
import { Boton, Cargando, Logo, Tarjeta } from '@estook/ui';
import {
  MARGEN,
  bajar,
  elCaminoDelQr,
  elPngDelQr,
  elSvgDelQr,
  laMatriz,
  type MatrizDelQr,
} from '../qr/elQr.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes · Tu local · Tu carta y su QR (entrega O, punto 20 · decisión 0047).
 *
 * **El QR definitivo**: se imprime una vez y no cambia nunca, ni al renombrar el
 * local. Enseña la carta que haya subido el local (repaso del 25-sep, 0049), su
 * dirección, su teléfono y su horario de Google; el día que haya platos, **el mismo
 * QR ya impreso los enseña**.
 *
 * En tres formas, como se piden en una imprenta y en un bar: SVG (se amplía sin
 * perder nada, para la imprenta), PNG (para quien no sepa abrir un SVG) y el cartel
 * para imprimir en casa, con el nombre del local y lo que hay que hacer.
 */
function comoNombreDeFichero(texto: string): string {
  return texto.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

export function TuCartaYSuQr() {
  const { yo } = usarSesion();
  const local = yo?.local ?? null;
  const [matriz, setMatriz] = useState<MatrizDelQr | null>(null);
  const [fallo, setFallo] = useState(false);
  const [copiada, setCopiada] = useState(false);

  const direccion = local === null ? null : direccionDeLaCarta(local.direccionDeLaCarta);

  useEffect(() => {
    if (direccion === null) return;
    let vigente = true;
    laMatriz(direccion)
      .then((leida) => {
        if (vigente) setMatriz(leida);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });
    return () => {
      vigente = false;
    };
  }, [direccion]);

  if (local === null || direccion === null) return null;
  const nombre = `qr-${comoNombreDeFichero(local.direccionDeLaCarta)}`;

  return (
    <Tarjeta titulo="El QR de tu carta" origen="Imprímelo una vez: no cambia nunca">
      <div className="flex flex-col gap-e4 sm:flex-row sm:items-start">
        <div className="mx-auto w-[180px] shrink-0 rounded-medio border border-borde bg-white p-e2 sm:mx-0">
          {matriz === null ? (
            fallo ? (
              <p className="text-secundario text-texto-suave">No se ha podido hacer el QR.</p>
            ) : (
              <Cargando que="tu QR" lineas={2} />
            )
          ) : (
            <DibujoDelQr matriz={matriz} etiqueta={`QR de la carta de ${local.nombre}`} />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-e3">
          <div>
            <p className="text-secundario text-texto-suave">Quien lo escanee llega a</p>
            <p className="break-all font-semibold">{direccion.replace('https://', '')}</p>
          </div>
          <p className="text-secundario text-texto-suave">
            Enseña tu carta —la que subas arriba—, dónde estás, tu teléfono y tu horario. Si cambias
            la carta, este mismo QR enseña la nueva, sin volver a imprimir nada.
          </p>

          <div className="flex flex-wrap gap-e2">
            <Boton
              tono="principal"
              disabled={matriz === null}
              onClick={() => {
                document.body.classList.add('imprimiendo-el-cartel');
                const quitar = () => {
                  document.body.classList.remove('imprimiendo-el-cartel');
                  window.removeEventListener('afterprint', quitar);
                };
                window.addEventListener('afterprint', quitar);
                window.print();
              }}
            >
              Imprimir el cartel
            </Boton>
            <Boton
              icono={<IconoDescargar size={18} />}
              disabled={matriz === null}
              onClick={() => {
                if (matriz !== null) {
                  bajar(new Blob([elSvgDelQr(matriz)], { type: 'image/svg+xml' }), `${nombre}.svg`);
                }
              }}
            >
              SVG para la imprenta
            </Boton>
            <Boton
              icono={<IconoDescargar size={18} />}
              disabled={matriz === null}
              onClick={() => {
                if (matriz === null) return;
                void elPngDelQr(matriz).then((png) => {
                  bajar(png, `${nombre}.png`);
                });
              }}
            >
              PNG
            </Boton>
            <Boton
              tono="texto"
              onClick={() => {
                void navigator.clipboard
                  .writeText(direccion)
                  .then(() => {
                    setCopiada(true);
                  })
                  .catch(() => {
                    setCopiada(false);
                  });
              }}
            >
              {copiada ? 'Dirección copiada' : 'Copiar la dirección'}
            </Boton>
          </div>
        </div>
      </div>

      {matriz !== null &&
        createPortal(
          <div
            data-cartel
            className="min-h-[95vh] flex-col items-center justify-center gap-[10mm] bg-white p-[15mm] text-center text-black"
          >
            <Logo alto={40} />
            <p className="text-[32pt] font-semibold leading-tight">{local.nombre}</p>
            <div className="w-[110mm]">
              <DibujoDelQr matriz={matriz} etiqueta={`QR de la carta de ${local.nombre}`} />
            </div>
            <p className="text-[20pt]">Escanea con la cámara del móvil</p>
            <p className="text-[12pt] text-[#555]">{direccion.replace('https://', '')}</p>
          </div>,
          document.body,
        )}
    </Tarjeta>
  );
}

function DibujoDelQr({
  matriz,
  etiqueta,
}: {
  readonly matriz: MatrizDelQr;
  readonly etiqueta: string;
}) {
  const lado = matriz.length + MARGEN * 2;
  return (
    <svg
      role="img"
      aria-label={etiqueta}
      viewBox={`0 0 ${String(lado)} ${String(lado)}`}
      shapeRendering="crispEdges"
      className="block h-auto w-full"
    >
      <rect width={lado} height={lado} fill="#fff" />
      <path fill="#000" d={elCaminoDelQr(matriz, MARGEN)} />
    </svg>
  );
}
