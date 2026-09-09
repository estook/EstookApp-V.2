import { useRef, useState } from 'react';
import {
  Aviso,
  Boton,
  Interruptor,
  Logo,
  Tarjeta,
  clases,
  derivarAcento,
  esColorHex,
  usarSeVeOscuro,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { reducirImagen } from './reducirImagen.ts';

/**
 * Tu marca, en Ajustes · el logo, el color, y si el color pinta la aplicación.
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * El logo y el color se pedían **una sola vez**, en el paso 5 del alta, y no
 * había forma de cambiarlos después: el paso vive dentro del alta y el alta no se
 * repite. Un local que subía el logo de la cadena en vez del suyo, o que
 * rediseñaba su imagen, se quedaba con lo de aquel día para siempre.
 *
 * Es la misma familia de fallo que «no había botón de quitar el logo», que se
 * arregló en M5: algo que se puede poner y no se puede cambiar no está terminado.
 *
 * ── Y lo que añade: que el color sea de verdad el color de la app ────────────
 *
 * Hasta ahora el color de marca pintaba la cabecera y poco más. Con el
 * interruptor, pinta el acento de toda la aplicación: botones, pastillas, el
 * anillo de foco, el sector activo de la rueda.
 *
 * **Apagado de fábrica**, y no por prudencia: ese color se eligió en el alta
 * pensando en una cabecera, y encenderlo por nuestra cuenta cambiaría de golpe el
 * aspecto de todos los locales que ya lo tienen puesto sin que nadie lo haya
 * pedido.
 *
 * ── Por qué se enseña el color ajustado, y se dice ───────────────────────────
 *
 * Porque el color que se guarda y el que se pinta no siempre son el mismo: si el
 * elegido no llega a los mínimos de B8, se ajusta hasta que llega
 * (`packages/ui/src/color.ts`). Callárselo sería que alguien pusiera su amarillo
 * corporativo, viera un mostaza y pensara que Estook no sabe leer un color.
 */

/** Los mismos que propone el alta, para no tener dos listas. */
export const COLORES_DE_PARTIDA = [
  { valor: '#ff7a00', nombre: 'Naranja Estook' },
  { valor: '#8a3b12', nombre: 'Terracota' },
  { valor: '#0d5c63', nombre: 'Verde mar' },
  { valor: '#1f3a5f', nombre: 'Azul noche' },
  { valor: '#5c1a33', nombre: 'Granate' },
  { valor: '#3f4b32', nombre: 'Oliva' },
] as const;

export function TuMarca() {
  const { yo, cliente, refrescar } = usarSesion();
  const seVeOscuro = usarSeVeOscuro();

  const local = yo?.local ?? null;
  const [color, setColor] = useState(local?.colorDeMarca ?? '#ff7a00');
  const [enLaApp, setEnLaApp] = useState(local?.colorEnLaApp ?? false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const elFichero = useRef<HTMLInputElement>(null);

  // Sin local no hay marca que cambiar: quien está en el consolidado de una
  // cadena no está en ninguno, y el color es de cada local.
  if (local === null) return null;

  const sinGuardar = esColorHex(color) && color !== (local.colorDeMarca ?? '#ff7a00');

  const pintable = esColorHex(color)
    ? derivarAcento(color, {
        superficie: seVeOscuro ? '#182124' : '#ffffff',
        texto: seVeOscuro ? '#eef2f3' : '#111c1f',
        oscuro: seVeOscuro ? '#26333a' : '#111c1f',
      })
    : null;

  async function guardar(nuevoColor: string, nuevoEnLaApp: boolean) {
    setTrabajando(true);
    setAviso(null);

    const respuesta = await cliente.ejecutar('guardar_color_de_marca', {
      color: nuevoColor,
      en_la_app: nuevoEnLaApp,
    });

    if (!respuesta.ok) {
      setAviso(respuesta.error.quePasa);
      // Se vuelve a lo que hay guardado: dejar la pantalla con lo que no se ha
      // guardado es la forma de que alguien crea que sí.
      setColor(local?.colorDeMarca ?? '#ff7a00');
      setEnLaApp(local?.colorEnLaApp ?? false);
      setTrabajando(false);
      return;
    }

    await refrescar();
    setTrabajando(false);
  }

  async function elegirLogo(fichero: File) {
    setTrabajando(true);
    setAviso(null);

    try {
      const reducida = await reducirImagen(fichero);
      const respuesta = await cliente.ejecutar('poner_logo', {
        tipo: reducida.tipo,
        contenido: reducida.base64,
      });
      if (!respuesta.ok) {
        setAviso(respuesta.error.quePasa);
        setTrabajando(false);
        return;
      }
      await refrescar();
    } catch {
      setAviso('No hemos podido leer esa imagen. Prueba con un PNG o un JPG.');
    }

    setTrabajando(false);
  }

  async function quitarElLogo() {
    setTrabajando(true);
    setAviso(null);
    const respuesta = await cliente.ejecutar('quitar_logo', {});
    if (!respuesta.ok) setAviso(respuesta.error.quePasa);
    else await refrescar();
    setTrabajando(false);
  }

  return (
    <Tarjeta titulo="Tu marca" {...(pintable === null ? {} : { acento: pintable.acento })}>
      {/* El ancla de «tu marca»: el buscador y «tu cuenta» llevan aquí. */}
      <span id="tu-marca" />

      <p className="text-secundario text-texto-suave">
        El logo y el color de <strong>{local.nombre}</strong>. Salen en la cabecera y en los
        documentos que se imprimen, y se pueden cambiar cuando quieras.
      </p>

      {aviso !== null && (
        <div className="mt-e3">
          <Aviso tono="mal" titulo="No se ha podido guardar">
            {aviso}
          </Aviso>
        </div>
      )}

      {/* ── El logo ─────────────────────────────────────────────────────── */}
      <div className="mt-e4 flex flex-wrap items-center gap-e3">
        <span
          className="grid size-[64px] shrink-0 place-items-center overflow-hidden rounded-medio border border-borde bg-fondo"
          aria-hidden
        >
          {local.logo === null ? (
            <Logo alto={20} />
          ) : (
            <img src={local.logo} alt="" className="max-h-[52px] max-w-[52px] object-contain" />
          )}
        </span>

        <div className="flex flex-wrap gap-e2">
          <Boton tono="secundario" disabled={trabajando} onClick={() => elFichero.current?.click()}>
            {local.logo === null ? 'Subir un logo' : 'Cambiar el logo'}
          </Boton>
          {local.logo !== null && (
            <Boton
              tono="secundario"
              disabled={trabajando}
              onClick={() => {
                void quitarElLogo();
              }}
            >
              Quitarlo
            </Boton>
          )}
        </div>

        <input
          ref={elFichero}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Elegir el logo de tu local"
          onChange={(evento) => {
            const fichero = evento.currentTarget.files?.[0];
            if (fichero) void elegirLogo(fichero);
            // Se limpia para que elegir el mismo fichero otra vez vuelva a valer.
            evento.currentTarget.value = '';
          }}
        />
      </div>

      {/* ── El color ────────────────────────────────────────────────────── */}
      <h3 className="mt-e5 text-seccion font-semibold">Tu color</h3>

      <div
        role="radiogroup"
        aria-label="El color de tu marca"
        className="mt-e2 flex flex-wrap gap-e2"
      >
        {COLORES_DE_PARTIDA.map((cual) => (
          <button
            key={cual.valor}
            type="button"
            role="radio"
            aria-checked={cual.valor === color}
            disabled={trabajando}
            onClick={() => {
              setColor(cual.valor);
              void guardar(cual.valor, enLaApp);
            }}
            className={clases(
              'inline-flex min-h-toque items-center gap-e2 rounded-medio border px-e3',
              cual.valor === color
                ? 'border-naranja bg-naranja-suave text-texto'
                : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
            )}
          >
            <span
              aria-hidden
              className="size-[18px] shrink-0 rounded-redondo border border-borde-fuerte"
              style={{ background: cual.valor }}
            />
            <span className="text-secundario">{cual.nombre}</span>
          </button>
        ))}

        <label className="inline-flex min-h-toque items-center gap-e2 rounded-medio border border-borde-fuerte bg-superficie px-e3">
          <span className="text-secundario text-texto-suave">El mío</span>
          <input
            type="color"
            value={esColorHex(color) ? color : '#ff7a00'}
            disabled={trabajando}
            aria-label="Escribe el color exacto de tu marca"
            className="size-[26px] cursor-pointer rounded-chico border border-borde bg-transparent p-0"
            onChange={(evento) => {
              setColor(evento.currentTarget.value);
            }}
          />
        </label>
      </div>

      {/*
        Y un botón para guardarlo, que antes no había.

        Se guardaba al salir del campo, y eso tiene dos problemas: **no se ve**
        —nadie sabe si se ha guardado— y depende de un gesto que en un móvil casi
        no existe. Las seis pastillas de arriba sí se guardan al tocarlas, porque
        elegir una es un gesto terminado; arrastrar un tono no lo es.

        El botón solo aparece cuando lo elegido no es lo guardado, así que en el
        caso normal la tarjeta no tiene un botón de más.
      */}
      {sinGuardar && (
        <div className="mt-e3 flex flex-wrap items-center gap-e3">
          <Boton
            tono="principal"
            disabled={trabajando}
            onClick={() => {
              void guardar(color, enLaApp);
            }}
          >
            Guardar este color
          </Boton>
          <span className="text-secundario text-texto-suave">
            Todavía no está guardado: lo que se ve arriba es una prueba.
          </span>
        </div>
      )}

      {/* ── El interruptor, con lo que hace escrito al lado ──────────────── */}
      <div className="mt-e4">
        <Interruptor
          etiqueta="Usar mi color en toda la aplicación"
          ayuda="Los botones, las pastillas y el resaltado dejan de ser naranjas y pasan a ser de tu color. Los documentos llevan tu color en cualquier caso."
          puesto={enLaApp}
          disabled={trabajando}
          alCambiar={(nuevo) => {
            setEnLaApp(nuevo);
            void guardar(color, nuevo);
          }}
        />
      </div>

      {pintable !== null && pintable.seAjusto && (
        <p className="mt-e3 text-secundario text-texto-suave">
          Para que se lea sobre el fondo, ese color se pinta un poco{' '}
          {seVeOscuro ? 'más claro' : 'más oscuro'} de lo que lo has elegido. El que se guarda es el
          tuyo: en los documentos sale tal cual.
        </p>
      )}
    </Tarjeta>
  );
}
