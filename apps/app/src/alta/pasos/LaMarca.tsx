import { useRef, useState } from 'react';
import { Aviso, Boton, Logo, clases } from '@estook/ui';
import { usarSesion } from '../../sesion/Sesion.tsx';
import { reducirImagen, TOPE_DEL_LOGO } from '../reducirImagen.ts';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 5 · «Sube tu logo y elige tu color» (M5).
 *
 * «Se aplican a la app y a todos los documentos, **con previsualización**»
 * (Manifiesto 8).
 *
 * ── La previsualización es de verdad ─────────────────────────────────────────
 *
 * No es una muestra de color: es la cabecera de la aplicación, pintada con lo
 * elegido, encima del formulario. Es la única forma de que alguien vea que su
 * naranja corporativo, sobre el fondo de Estook, no se lee.
 *
 * ── La imagen se reduce antes de subir ───────────────────────────────────────
 *
 * «La foto pesa 8 MB → se reduce antes de subir → barra de progreso, y nada más»
 * (Auditoría, parte 5). Se reduce aquí, en el navegador, a 512 px de lado. El
 * servidor comprueba el tope otra vez, porque esconder algo en la pantalla no es
 * protegerlo (regla 4): quien llame a la API a pelo con un fichero de 40 MB
 * recibe un no.
 */

/** Los colores de partida. Se puede escribir cualquiera, pero casi nadie quiere. */
const COLORES = [
  { valor: '#ff7a00', nombre: 'Naranja Estook' },
  { valor: '#8a3b12', nombre: 'Terracota' },
  { valor: '#0d5c63', nombre: 'Verde mar' },
  { valor: '#1f3a5f', nombre: 'Azul noche' },
  { valor: '#5c1a33', nombre: 'Granate' },
  { valor: '#3f4b32', nombre: 'Oliva' },
];

export function LaMarca({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const { yo, refrescar } = usarSesion();

  const [color, setColor] = useState(alta.ficha.colorDeMarca ?? '#ff7a00');
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(yo?.local?.logo ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const elFichero = useRef<HTMLInputElement>(null);

  async function elegirLogo(fichero: File) {
    setSubiendo(true);
    setAviso(null);

    try {
      const reducida = await reducirImagen(fichero);

      // Se enseña antes de subir: si el recorte no gusta, se cambia sin haber
      // gastado una subida.
      setVistaPrevia(`data:${reducida.tipo};base64,${reducida.base64}`);

      const respuesta = await cliente.ejecutar('poner_logo', {
        tipo: reducida.tipo,
        contenido: reducida.base64,
      });

      if (!respuesta.ok) {
        alFallar(respuesta.error);
        setVistaPrevia(yo?.local?.logo ?? null);
        setSubiendo(false);
        return;
      }

      // La cabecera de toda la aplicación lee el logo de `quien_soy`, así que hay
      // que volver a preguntar para que aparezca en el resto de pantallas.
      await refrescar();
    } catch {
      setAviso('No hemos podido leer esa imagen. Prueba con un PNG o un JPG.');
      setVistaPrevia(yo?.local?.logo ?? null);
    }

    setSubiendo(false);
  }

  async function continuar() {
    setEnviando(true);
    const respuesta = await cliente.ejecutar('guardar_color_de_marca', { color });
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setEnviando(false);
      return;
    }
    await refrescar();
    await alGuardar();
    setEnviando(false);
  }

  return (
    <div className="flex flex-col gap-e4">
      {/* La previsualización: la cabecera de verdad, con lo elegido. */}
      <div className="overflow-hidden rounded-medio border border-borde">
        <div
          className="flex items-center gap-e3 px-e4 py-e3"
          style={{ backgroundColor: color }}
          aria-label="Así se verá tu cabecera"
        >
          {vistaPrevia === null ? (
            // Sin logo propio, el de Estook sobre una pastilla clara: el
            // logotipo es oscuro y sobre un color fuerte no se leería.
            <span className="rounded-chico bg-superficie px-e2 py-e1">
              <Logo alto={18} />
            </span>
          ) : (
            <img
              src={vistaPrevia}
              alt=""
              className="h-8 w-8 rounded-chico bg-superficie object-contain"
            />
          )}
          <span className="text-cuerpo font-semibold text-superficie">{alta.nombre}</span>
        </div>
        <p className="bg-superficie px-e4 py-e2 text-secundario text-texto-suave">
          Así se verá tu cabecera, y así saldrán tus documentos.
        </p>
      </div>

      <div>
        <p className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">Tu color</p>
        <div className="flex flex-wrap gap-e2">
          {COLORES.map((uno) => (
            <button
              key={uno.valor}
              type="button"
              onClick={() => {
                setColor(uno.valor);
              }}
              aria-pressed={color === uno.valor}
              aria-label={uno.nombre}
              title={uno.nombre}
              className={clases(
                'h-toque w-toque rounded-medio border-2',
                color === uno.valor ? 'border-texto' : 'border-borde',
              )}
              style={{ backgroundColor: uno.valor }}
            />
          ))}

          {/*
            Y el que no está. Un `color` nativo trae el selector del sistema, que
            en móvil es el que la gente ya sabe usar.
          */}
          <label className="flex h-toque min-w-toque cursor-pointer items-center justify-center rounded-medio border-2 border-dashed border-borde-fuerte px-e2 text-secundario text-texto-suave">
            Otro
            <input
              type="color"
              value={color}
              onChange={(evento) => {
                setColor(evento.target.value);
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">Tu logo</p>
        <input
          ref={elFichero}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(evento) => {
            const fichero = evento.target.files?.[0];
            if (fichero) void elegirLogo(fichero);
          }}
        />
        <Boton
          tono="secundario"
          cargando={subiendo}
          textoCargando="Subiendo"
          onClick={() => elFichero.current?.click()}
        >
          {vistaPrevia === null ? 'Elegir una imagen' : 'Cambiar la imagen'}
        </Boton>
        <p className="mt-e2 text-secundario text-texto-suave">
          PNG, JPG o WebP. La reducimos nosotros, así que da igual lo que pese.
        </p>
      </div>

      {aviso !== null && (
        <Aviso tono="atencion" titulo="Con esa imagen no hemos podido">
          {aviso}
        </Aviso>
      )}

      <Boton
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        onClick={() => {
          void continuar();
        }}
      >
        Continuar
      </Boton>

      <p className="text-center text-secundario text-texto-suave">
        Como mucho {Math.trunc(TOPE_DEL_LOGO / 1024)} KB una vez reducida.
      </p>
    </div>
  );
}
