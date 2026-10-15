import { useRef, useState } from 'react';
import { Boton, Botones, FotoDeProducto, Hoja, clases } from '@estook/ui';
import { IconoCamara } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { Respuesta } from '@estook/cliente-api';
import { reducirFoto } from '../almacen/reducirFoto.ts';

/** Cuando el teléfono no sabe abrir la foto, o no cabe ni reducida. */
const NO_SE_HA_PODIDO_LEER: ErrorDeLaApi = {
  codigo: 'faltan_datos',
  quePasa: 'No hemos podido leer esa foto.',
  queSePuedeHacer: 'Prueba a hacerla otra vez, o elige otra.',
  boton: null,
};

/** Lo que sube: la foto y su miniatura, ya reducidas en el teléfono. */
export interface FotoReducida {
  readonly tipo: string;
  readonly foto: string;
  readonly miniatura: string;
}

/**
 * La foto de una ficha —un producto, un plato (0086)—, con poner, ver, cambiar y
 * quitar. Nació como la del producto (entrega V, punto 5):
 *
 * Arriba del todo, al lado de las pastillas de qué es, de quién y en qué envase:
 * es lo primero que hace falta para reconocerlo, y a un cocinero nuevo le dice más
 * una foto de la garrafa que «Aceite de oliva · 5 l». **Pequeña**, para no empujar
 * hacia abajo lo que hay en cámara, que es a lo que se viene; tocándola se ve
 * grande, y ahí se cambia o se quita.
 *
 * Sin foto y con permiso, el recuadro **es** el botón de ponerla: en el móvil abre
 * la cámara o la galería, que es la pregunta que hace el propio teléfono. Sin
 * permiso, la inicial con el color de su categoría, como en la lista.
 *
 * La foto se reduce en el teléfono antes de subir (`reducirFoto`): lo que viaja
 * son unos cien kilobytes, no los cuatro megas que saca la cámara.
 */
export function FotoQueSePone({
  nombre,
  categoria,
  foto,
  miniatura,
  puedeTocar,
  poner,
  quitar: quitarLaFoto,
  alHecho,
  alFallar,
}: {
  readonly nombre: string;
  /** Para el color de la inicial cuando no hay foto. */
  readonly categoria: string | null;
  readonly foto: string | null;
  readonly miniatura: string | null;
  readonly puedeTocar: boolean;
  readonly poner: (reducida: FotoReducida) => Promise<Respuesta<unknown>>;
  readonly quitar: () => Promise<Respuesta<unknown>>;
  /** Lo que se ha hecho, en una frase, para el aviso de la ficha. */
  readonly alHecho: (frase: string) => Promise<void>;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const elFichero = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState<'subiendo' | 'quitando' | null>(null);
  const [viendo, setViendo] = useState(false);

  const tiene = foto !== null;

  function elegir() {
    elFichero.current?.click();
  }

  async function subir(fichero: File) {
    setTrabajando('subiendo');
    try {
      const reducida = await reducirFoto(fichero);
      const respuesta = await poner(reducida);
      if (!respuesta.ok) alFallar(respuesta.error);
      else {
        setViendo(false);
        await alHecho(tiene ? 'Foto cambiada' : 'Foto puesta');
      }
    } catch {
      // Lo que falla aquí es el teléfono, no la API: una foto que no sabe abrir
      // (un formato raro) o que no cabe ni reducida. Se dice igual que un error
      // del servidor, en el mismo sitio de la ficha.
      alFallar(NO_SE_HA_PODIDO_LEER);
    }
    setTrabajando(null);
  }

  async function quitar() {
    setTrabajando('quitando');
    const respuesta = await quitarLaFoto();
    setTrabajando(null);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }
    setViendo(false);
    await alHecho('Foto quitada');
  }

  const recuadro = (
    <FotoDeProducto nombre={nombre} categoria={categoria} enlace={miniatura} lado={88} />
  );

  return (
    <>
      {tiene ? (
        <button
          type="button"
          aria-label={`Ver la foto de ${nombre}`}
          onClick={() => {
            setViendo(true);
          }}
          className="shrink-0 rounded-grande"
        >
          {recuadro}
        </button>
      ) : puedeTocar ? (
        <button
          type="button"
          aria-label={`Poner una foto de ${nombre}`}
          onClick={elegir}
          disabled={trabajando !== null}
          className={clases(
            'flex size-[88px] shrink-0 flex-col items-center justify-center gap-e1 rounded-grande',
            'border-2 border-dashed border-borde-fuerte text-texto-suave',
            'transition-colors duration-rapido hover:border-naranja hover:text-texto',
            'disabled:cursor-wait disabled:opacity-60',
          )}
        >
          <IconoCamara size={22} />
          <span className="text-etiqueta font-medium">
            {trabajando === 'subiendo' ? 'Subiendo' : 'Poner foto'}
          </span>
        </button>
      ) : (
        recuadro
      )}

      {puedeTocar && (
        <input
          ref={elFichero}
          type="file"
          // «image/*» y no una lista: en el teléfono es lo que ofrece hacer la foto
          // con la cámara, y el iPhone convierte sus HEIC a JPG por el camino.
          accept="image/*"
          className="sr-only"
          aria-label={`Elegir la foto de ${nombre}`}
          onChange={(evento) => {
            const fichero = evento.currentTarget.files?.[0];
            if (fichero) void subir(fichero);
            // Se limpia para que elegir la misma foto otra vez vuelva a valer.
            evento.currentTarget.value = '';
          }}
        />
      )}

      <Hoja
        abierta={viendo}
        alCerrar={() => {
          setViendo(false);
        }}
        titulo={nombre}
        {...(puedeTocar
          ? {
              pie: (
                <Botones>
                  <Boton
                    tono="secundario"
                    cargando={trabajando === 'quitando'}
                    textoCargando="Quitando"
                    disabled={trabajando !== null}
                    onClick={() => {
                      void quitar();
                    }}
                  >
                    Quitar la foto
                  </Boton>
                  <Boton
                    tono="principal"
                    icono={<IconoCamara size={18} />}
                    cargando={trabajando === 'subiendo'}
                    textoCargando="Subiendo"
                    disabled={trabajando !== null}
                    onClick={elegir}
                  >
                    Cambiar la foto
                  </Boton>
                </Botones>
              ),
            }
          : {})}
      >
        {foto !== null && (
          <img
            src={foto}
            alt={`Foto de ${nombre}`}
            className="mx-auto max-h-[60vh] w-full rounded-grande bg-fondo object-contain"
          />
        )}
      </Hoja>
    </>
  );
}
