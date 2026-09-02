import { useState } from 'react';
import { IconoChat, IconoDocumento, IconoPanel, IconoRejilla } from '@estook/iconos';
import { Boton, IconoDeFogon, clases } from '@estook/ui';
import { GuiaDeInstalacion } from '../GuiaDeInstalacion.tsx';
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
          if (ultima) setInstalando(true);
          else setDonde(donde + 1);
        }}
      >
        {ultima ? 'Ponerlo en mi móvil' : 'Siguiente'}
      </Boton>

      <div className="flex justify-center">
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
