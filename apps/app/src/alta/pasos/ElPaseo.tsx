import { useState } from 'react';
import { IconoChat, IconoDocumento, IconoPanel, IconoRejilla } from '@estook/iconos';
import { Boton, IconoDeFogon, clases } from '@estook/ui';
import { GuiaDeInstalacion } from '../GuiaDeInstalacion.tsx';
import { esUnMovil } from '../queAparato.ts';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 8 · el paseo (M5).
 *
 * «**El paseo:** cinco pantallas cortas sobre el Panel, la rueda, Generar PDF, el
 *  chat y Fogón» (Manifiesto 8).
 *
 * ── Por qué cinco y por qué cortas ───────────────────────────────────────────
 *
 * Porque un tutorial largo se salta entero, y entonces no se ha enseñado nada.
 * Cinco pantallas de una frase se leen sin querer mientras se pulsa «siguiente»,
 * que es exactamente lo que se busca: que la primera vez que alguien necesite la
 * rueda **sepa que existe**.
 *
 * Y por eso ninguna promete nada que no haya: no se enseña lo que Estook hará en
 * M12, se enseña dónde están las cosas.
 *
 * ── Y la guía de instalación, que va aquí y no en un correo ──────────────────
 *
 * «Guía de instalación distinta para iPhone y Android» (Plan, M5). Va al final
 * del paseo porque es el momento en que alguien está con el móvil en la mano y
 * acaba de entender para qué sirve la aplicación. Un correo con instrucciones se
 * lee tres días después, o nunca.
 */

const PANTALLAS = [
  {
    icono: IconoPanel,
    titulo: 'El Panel',
    frase:
      'Lo primero que ves cada mañana: lo que necesita tu atención hoy, antes que ningún número.',
  },
  {
    icono: IconoRejilla,
    titulo: 'La rueda',
    frase:
      'El botón del centro abre tus apps. Solo salen las tuyas, así que la de cada uno es distinta.',
  },
  {
    icono: IconoDocumento,
    titulo: 'Los documentos',
    frase:
      'Fichas técnicas, cartas, informes y hojas de alérgenos salen en PDF con tu logo, en un toque.',
  },
  {
    icono: IconoChat,
    titulo: 'El chat',
    frase:
      'Para hablar con tu equipo sin salir de aquí, con el contexto de lo que estáis mirando delante.',
  },
  {
    icono: IconoDeFogon,
    titulo: 'Fogón',
    frase:
      'Te explica por qué se ha movido un número. Nunca guarda nada por su cuenta: propone, y decides tú.',
  },
] as const;

export function ElPaseo({ alGuardar }: PropsDeUnPaso) {
  const [donde, setDonde] = useState(0);
  const [instalando, setInstalando] = useState(false);

  /**
   * **Ponerlo en la pantalla de inicio solo se ofrece en el móvil.**
   *
   * Estaba al revés de las dos maneras, y las dos molestan:
   *
   *   · En el ordenador salía «Ponerlo en mi móvil» y detrás una pantalla que
   *     dice «toca el botón de compartir». Delante de alguien con un ratón.
   *   · Y en el móvil, que es donde sirve, había que pasar las cinco pantallas
   *     del paseo para llegar. Quien pulsaba «Saltar el paseo» —lo normal— no la
   *     veía nunca.
   *
   * Ahora en el teléfono el último botón lleva a la guía, y en el ordenador
   * termina el alta y punto. Lo que no encaja con el aparato que se tiene
   * delante no es un detalle: es la aplicación diciendo que no sabe dónde está.
   */
  const enUnMovil = esUnMovil();

  if (instalando) {
    return (
      <div className="flex flex-col gap-e4">
        <GuiaDeInstalacion />
        <Boton
          tono="principal"
          ancho
          onClick={() => {
            void alGuardar();
          }}
        >
          Ya está, vamos allá
        </Boton>
      </div>
    );
  }

  const pantalla = PANTALLAS[donde];
  if (pantalla === undefined) return null;

  const Icono = pantalla.icono;
  const ultima = donde === PANTALLAS.length - 1;

  return (
    <div className="flex flex-col gap-e5">
      <div className="flex flex-col items-center gap-e3 rounded-medio border border-borde bg-superficie px-e4 py-e6 text-center">
        <span className="text-naranja">
          <Icono size={40} />
        </span>
        <h2 className="text-pantalla font-semibold">{pantalla.titulo}</h2>
        <p className="max-w-[26rem] text-cuerpo text-texto-suave">{pantalla.frase}</p>
      </div>

      {/* Dónde estás de los cinco. Se puede saltar a cualquiera. */}
      <div className="flex justify-center gap-e2">
        {PANTALLAS.map((una, i) => (
          <button
            key={una.titulo}
            type="button"
            onClick={() => {
              setDonde(i);
            }}
            aria-label={`Ir a ${una.titulo}`}
            aria-current={i === donde}
            className={clases(
              'h-2 w-8 rounded-redondo',
              i === donde ? 'bg-naranja' : 'bg-borde hover:bg-borde-fuerte',
            )}
          />
        ))}
      </div>

      <Boton
        tono="principal"
        ancho
        onClick={() => {
          if (!ultima) setDonde(donde + 1);
          else if (enUnMovil) setInstalando(true);
          else void alGuardar();
        }}
      >
        {!ultima ? 'Siguiente' : enUnMovil ? 'Ponerlo en mi móvil' : 'Ya está, vamos allá'}
      </Boton>

      <div className="flex flex-col items-center gap-e1">
        {/*
          En el móvil, a un toque desde cualquier pantalla del paseo. Antes solo
          se llegaba pasando las cinco, y quien pulsaba «Saltar el paseo» —lo
          normal— no la veía nunca. Es justo el aparato donde sirve.
        */}
        {enUnMovil && (
          <Boton
            tono="texto"
            onClick={() => {
              setInstalando(true);
            }}
          >
            Ponerlo en mi pantalla de inicio
          </Boton>
        )}

        <Boton
          tono="texto"
          onClick={() => {
            void alGuardar();
          }}
        >
          Saltar el paseo
        </Boton>
      </div>
    </div>
  );
}
