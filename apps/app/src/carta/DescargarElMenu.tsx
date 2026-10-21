import { useState } from 'react';
import { Boton, Hoja } from '@estook/ui';
import { IconoEnviar, IconoVer } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { elMenuEnTexto, type UnDiaDelMenu, type UnMenu } from './contratoDeLosMenus.ts';
import { dibujarLaImagen } from './imagenDelMenu.ts';

/**
 * Descargar el menú (0103): «que no salgan todas sueltas, sino descargar, que sea
 * ampliable y salgan las opciones». Un botón, y aquí las cuatro:
 *
 *   · **El cartel para el local**, en A3 y vectorial, con cómo imprimirlo y dónde ponerlo.
 *   · **El PDF**, en A4, para mandarlo o tenerlo.
 *   · **Mandarlo**, como texto, por WhatsApp o lo que tenga el móvil.
 *   · **Una imagen para redes**, cuadrada, para Instagram o el estado de WhatsApp.
 *
 * Los dos PDF los hace el servidor (regla 7); la imagen es un dibujo en el móvil, sin
 * librería, con lo mismo que se ve en la pantalla.
 */

export function DescargarElMenu({
  menu,
  dia,
  alCerrar,
}: {
  readonly menu: UnMenu;
  readonly dia: UnDiaDelMenu;
  readonly alCerrar: () => void;
}) {
  const { yo } = usarSesion();
  const [hecho, setHecho] = useState<string | null>(null);
  const parametros = { menu_id: menu.id, fecha: dia.fecha };
  const texto = elMenuEnTexto(menu, dia);
  const color = yo?.local?.colorDeMarca ?? '#FF7A00';

  async function mandar() {
    const comparte = navigator as Navigator & {
      share?: (datos: { text: string }) => Promise<void>;
    };
    if (typeof comparte.share === 'function') {
      try {
        await comparte.share({ text: texto });
      } catch {
        // Quien cierra la hoja de compartir no quiere nada, y no es un error.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  async function laImagen() {
    const fichero = await dibujarLaImagen(menu, dia, color);
    const comparte = navigator as Navigator & {
      canShare?: (datos: { files: File[] }) => boolean;
    };
    if (typeof comparte.canShare === 'function' && comparte.canShare({ files: [fichero] })) {
      try {
        await navigator.share({ files: [fichero], title: fichero.name });
        return;
      } catch {
        // Si no se comparte, se descarga.
      }
    }
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(fichero);
    enlace.download = fichero.name;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setHecho(`Descargada: ${fichero.name}`);
  }

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Descargar · ${menu.nombre}`}>
      <div className="flex flex-col gap-e5">
        <section className="flex flex-col gap-e2">
          <h3 className="text-cuerpo font-semibold">Cartel para el local</h3>
          <p className="text-secundario text-texto-suave">
            Para la puerta, el escaparate o la barra. Es vectorial: no pierde calidad. Imprímelo en
            A3 en una copistería, en papel grueso (de 200 g), o en A4 en tu impresora.
          </p>
          <BotonDelDocumento
            consulta="el_menu_en_pdf"
            parametros={{ ...parametros, forma: 'cartel' }}
            texto="Cartel en A3"
            tono="principal"
          />
        </section>

        <section className="flex flex-col gap-e2">
          <h3 className="text-cuerpo font-semibold">PDF</h3>
          <p className="text-secundario text-texto-suave">
            En A4, para mandarlo o tenerlo guardado.
          </p>
          <BotonDelDocumento
            consulta="el_menu_en_pdf"
            parametros={{ ...parametros, forma: 'hoja' }}
            texto="PDF en A4"
          />
        </section>

        <section className="flex flex-col gap-e2">
          <h3 className="text-cuerpo font-semibold">Mandarlo</h3>
          <p className="whitespace-pre-line rounded-mediano bg-fondo p-e3 text-secundario">
            {texto.replace(/\*/g, '')}
          </p>
          <div>
            <Boton
              tono="secundario"
              icono={<IconoEnviar size={16} />}
              onClick={() => void mandar()}
            >
              Por WhatsApp…
            </Boton>
          </div>
        </section>

        <section className="flex flex-col gap-e2">
          <h3 className="text-cuerpo font-semibold">Imagen para redes</h3>
          <p className="text-secundario text-texto-suave">
            Cuadrada, para Instagram o el estado de WhatsApp.
          </p>
          <div>
            <Boton tono="secundario" icono={<IconoVer size={16} />} onClick={() => void laImagen()}>
              Imagen
            </Boton>
          </div>
          {hecho !== null && (
            <p role="status" className="text-secundario text-texto-suave">
              {hecho}
            </p>
          )}
        </section>
      </div>
    </Hoja>
  );
}
