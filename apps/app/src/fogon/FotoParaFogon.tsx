import { useRef, useState } from 'react';
import { LADO_DE_LA_FOTO_PARA_FOGON } from '@estook/dominio';
import { IconoCamara } from '@estook/iconos';
import { Boton, ErrorEnCristiano, IconoDeFogon } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { reducirParaLeer, type FotoParaLeer } from '../almacen/reducirFoto.ts';
import { creditos } from './contrato.ts';

/**
 * «Hazle una foto y lo lee Fogón» (Fogón 1 · 2, decisión 0098): el albarán, el Z, lo
 * que se tira. Un recuadro con un botón que abre la cámara (o la galería, en el
 * ordenador) y **dice lo que gasta**. La foto se reduce aquí, se le enseña a Fogón y
 * no se guarda. Lo que vuelve **es un borrador**: la pantalla lo rellena y la persona lo
 * revisa antes de apuntar nada.
 */
export function FotoParaFogon({
  titulo,
  ayuda,
  boton,
  gasta,
  alLeer,
  compacto = false,
}: {
  readonly titulo: string;
  readonly ayuda: string;
  readonly boton: string;
  readonly gasta: number;
  /** Manda la foto; devuelve el error si no ha salido. */
  readonly alLeer: (foto: FotoParaLeer) => Promise<ErrorDeLaApi | null>;
  /** Solo el botón, sin el recuadro: donde ya hay otro recuadro de Fogón. */
  readonly compacto?: boolean;
}) {
  const fichero = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noSeAbre, setNoSeAbre] = useState<string | null>(null);

  async function conLaFoto(elegido: File) {
    setError(null);
    setNoSeAbre(null);
    setLeyendo(true);
    let foto: FotoParaLeer;
    try {
      foto = await reducirParaLeer(elegido, LADO_DE_LA_FOTO_PARA_FOGON);
    } catch (fallo) {
      setLeyendo(false);
      setNoSeAbre(fallo instanceof Error ? fallo.message : 'No he podido abrir esa foto.');
      return;
    }
    const fallo = await alLeer(foto);
    setLeyendo(false);
    setError(fallo);
  }

  const elBoton = (
    <>
      <input
        ref={fichero}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={boton}
        className="hidden"
        onChange={(e) => {
          const elegido = e.currentTarget.files?.[0];
          // Se vacía: elegir la misma foto otra vez tiene que volver a leerla.
          e.currentTarget.value = '';
          if (elegido !== undefined) void conLaFoto(elegido);
        }}
      />
      <Boton
        tono="secundario"
        icono={<IconoCamara size={18} />}
        cargando={leyendo}
        textoCargando="Fogón está leyendo"
        onClick={() => {
          fichero.current?.click();
        }}
      >
        {boton} · {creditos(gasta)}
      </Boton>
      {noSeAbre !== null && <p className="text-secundario text-mal">{noSeAbre}</p>}
      {error !== null && <ErrorEnCristiano error={error} />}
    </>
  );

  if (compacto) return <div className="flex flex-col gap-e2">{elBoton}</div>;

  return (
    <div className="flex flex-col gap-e2 rounded-grande bg-fondo p-e4">
      <p className="flex items-center gap-e2 text-cuerpo font-semibold">
        <span aria-hidden className="text-naranja">
          <IconoDeFogon size={20} />
        </span>
        {titulo}
      </p>
      <p className="text-secundario text-texto-suave">{ayuda}</p>
      <div className="flex flex-col items-start gap-e2">{elBoton}</div>
    </div>
  );
}
