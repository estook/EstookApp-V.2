import { useState } from 'react';
import { clases } from '@estook/ui';
import { elQueParece, type Sistema } from './queAparato.ts';

/**
 * Cómo poner Estook en la pantalla de inicio (M5).
 *
 * «Guía de instalación **distinta para iPhone y Android**» (Plan, M5).
 *
 * ── Por qué son dos guías y no una ───────────────────────────────────────────
 *
 * Porque los pasos no se parecen en nada. En Android sale un cartel solo y basta
 * con aceptarlo; en iPhone **no sale nada**, hay que abrirlo en Safari, buscar el
 * botón de compartir y tocar «Añadir a pantalla de inicio». Una guía genérica
 * —«añádelo a tu pantalla de inicio»— es la que deja al usuario de iPhone
 * buscando un botón que no existe.
 *
 * Es la misma regla que el Manifiesto pone para el asistente del TPV: «cada uno
 * tiene su propia explicación, con su sistema y lo que hay que pedir. **Nunca
 * una instrucción genérica.**»
 *
 * ── Y por qué se pregunta el sistema en vez de detectarlo ────────────────────
 *
 * Se detecta, y se usa para poner delante el que toca. Pero **los dos están a un
 * toque**: la detección por agente de usuario falla —un iPad se hace pasar por
 * Mac desde hace años— y quedarse enseñando la guía equivocada sin salida es
 * peor que preguntar.
 */

const PASOS: Readonly<Record<Sistema, readonly string[]>> = {
  iphone: [
    'Abre Estook en Safari. Desde otro navegador no se puede: lo decide Apple, no nosotros.',
    'Toca el botón de compartir, el cuadrado con la flecha hacia arriba.',
    'Baja y toca «Añadir a pantalla de inicio».',
    'Toca «Añadir». Ya tienes el icono al lado de las demás.',
  ],
  android: [
    'Abre Estook en Chrome.',
    'Si sale el cartel de «Instalar aplicación», tócalo y ya está.',
    'Si no sale, abre el menú de los tres puntos, arriba a la derecha.',
    'Toca «Instalar aplicación» o «Añadir a pantalla de inicio».',
  ],
  ordenador: [
    'Aquí ya está todo: Estook funciona igual en el ordenador, sin instalar nada.',
    'Si lo quieres a mano, mira el icono de instalar al final de la barra de direcciones. Chrome y Edge lo ponen ahí.',
    'Y para tenerlo en el móvil, abre esta misma dirección en el teléfono y elige tu sistema arriba.',
  ],
};

const COMO_SE_LLAMA: Readonly<Record<Sistema, string>> = {
  iphone: 'iPhone',
  android: 'Android',
  ordenador: 'Ordenador',
};

export function GuiaDeInstalacion() {
  const [sistema, setSistema] = useState<Sistema>(elQueParece);

  return (
    <div className="flex flex-col gap-e4 rounded-medio border border-borde bg-superficie p-e4">
      <div>
        <h2 className="text-cuerpo font-semibold">
          {sistema === 'ordenador'
            ? 'Estook en el ordenador y en el móvil'
            : 'Ponlo en tu pantalla de inicio'}
        </h2>
        <p className="text-secundario text-texto-suave">
          {sistema === 'ordenador'
            ? 'En el móvil se abre como una aplicación, a pantalla completa y sin la barra del navegador. Y sigue funcionando cuando el wifi de la cocina se cae.'
            : 'Se abre como una aplicación, a pantalla completa y sin la barra del navegador. Y sigue funcionando cuando el wifi de la cocina se cae.'}
        </p>
      </div>

      <div className="flex gap-e2" role="tablist" aria-label="Elige tu aparato">
        {(['ordenador', 'iphone', 'android'] as const).map((cual) => (
          <button
            key={cual}
            type="button"
            role="tab"
            aria-selected={sistema === cual}
            onClick={() => {
              setSistema(cual);
            }}
            className={clases(
              'min-h-toque flex-1 rounded-medio border px-e3 text-cuerpo font-medium',
              sistema === cual
                ? 'border-naranja bg-naranja-suave'
                : 'border-borde-fuerte bg-superficie hover:bg-fondo',
            )}
          >
            {COMO_SE_LLAMA[cual]}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-e3">
        {PASOS[sistema].map((paso, i) => (
          <li key={paso} className="flex gap-e3">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-redondo bg-charcoal text-etiqueta font-semibold text-superficie"
            >
              {i + 1}
            </span>
            <span className="text-cuerpo">{paso}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
