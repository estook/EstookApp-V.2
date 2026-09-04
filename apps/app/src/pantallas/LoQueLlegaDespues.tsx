import { Boton, Hoja } from '@estook/ui';

/**
 * Lo que hay detrás de un botón que todavía no está construido.
 *
 * ── Por qué esto existe ──────────────────────────────────────────────────────
 *
 * La barra lleva avisos, chat y Fogón desde M3, porque así lo describe B5. Los
 * tres estaban puestos como `() => undefined`: se pulsaban y **no pasaba nada
 * de nada**. Ese es exactamente el fallo que Richi encuentra una y otra vez
 * mirando la aplicación —«¿hay algún botón que prometa algo y no lo haga?»— y
 * en M5 fueron seis de catorce.
 *
 * Hay dos salidas honestas: quitar el botón, o que el botón diga la verdad.
 * Aquí se elige la segunda, porque la primera esconde una parte del producto
 * que sí está decidida y planificada, y porque la pregunta que contesta esta
 * hoja —«¿y la IA, dónde está?»— se la hace cualquiera que abra Estook hoy.
 *
 * El día que el módulo llegue, se borra su entrada de aquí y el botón hace lo
 * suyo. Mientras tanto **no hay ningún botón mudo**.
 */
export type LoQueFalta = 'avisos' | 'chat' | 'fogon';

interface Ficha {
  readonly titulo: string;
  readonly queEs: string;
  readonly queHara: readonly string[];
  readonly cuando: string;
  readonly mientrasTanto: string;
}

const FICHAS: Readonly<Record<LoQueFalta, Ficha>> = {
  avisos: {
    titulo: 'Los avisos',
    queEs: 'El sitio donde llega solo lo que necesita que hagas algo.',
    queHara: [
      'Cada aviso con qué pasa, por qué, qué impacto tiene y qué se recomienda.',
      'Y un botón que lo resuelve, sin tener que ir a buscar la pantalla.',
      'Ordenados por lo que más cuesta si se deja, no por hora de llegada.',
    ],
    cuando: 'Llegan con Fogón, el módulo 22.',
    mientrasTanto:
      'Lo que hay que atender hoy está en el Panel, y lo del género en Inventario · Hoy.',
  },
  chat: {
    titulo: 'El chat del equipo',
    queEs: 'Hablar con tu gente dentro de Estook, sin salir a otra aplicación.',
    queHara: [
      'Canales, mensajes directos, menciones y buscador.',
      'Silencio fuera de turno: a nadie le suena el teléfono en su día libre.',
      'Y lo que se escribe se puede convertir en incidencia, agotado o tarea, siempre pulsando tú.',
    ],
    cuando: 'Llega con el módulo 23.',
    mientrasTanto: 'Las notas y las incidencias del día se apuntan en el Cuaderno.',
  },
  fogon: {
    titulo: 'Fogón',
    queEs: 'La inteligencia de Estook. No es un chat aparte: trabaja dentro de cada pantalla.',
    queHara: [
      'Te dice lo que pasa antes de que se note: qué producto se va a agotar, qué plato ha dejado de dar margen, qué precio te ha subido y cuánto te cuesta.',
      'Dictarle en voz alta una merma, una temperatura o una incidencia con las manos ocupadas.',
      'Prepararte borradores —un pedido, un cuadrante, una respuesta a una reseña— que tú apruebas o tiras.',
    ],
    cuando: 'Llega con el módulo 22, y desde entonces está en todas las apps.',
    mientrasTanto:
      'Las cuentas que ya sabe hacer Estook las hace la base de datos, no un modelo: la previsión de cuándo se agota cada producto, con sus días mirados, ya está en Inventario.',
  },
};

export function LoQueLlegaDespues({
  que,
  alCerrar,
}: {
  readonly que: LoQueFalta | null;
  readonly alCerrar: () => void;
}) {
  const ficha = que === null ? null : FICHAS[que];

  return (
    <Hoja
      abierta={ficha !== null}
      alCerrar={alCerrar}
      titulo={ficha?.titulo ?? ''}
      pie={
        <Boton tono="principal" onClick={alCerrar}>
          Entendido
        </Boton>
      }
    >
      {ficha !== null && (
        <div className="flex flex-col gap-e4">
          <p className="text-cuerpo">{ficha.queEs}</p>

          <div>
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">Qué hará</p>
            <ul className="mt-e2 flex flex-col gap-e2">
              {ficha.queHara.map((linea) => (
                <li key={linea} className="flex gap-e2 text-cuerpo">
                  <span aria-hidden className="text-texto-suave">
                    ·
                  </span>
                  <span>{linea}</span>
                </li>
              ))}
            </ul>
          </div>

          {/*
            La fecha se dice en módulos y no en meses a propósito: una fecha que
            no se cumple es peor que no dar ninguna, y el orden de los módulos sí
            es firme.
          */}
          <p className="text-cuerpo font-medium">{ficha.cuando}</p>

          <div className="rounded-medio bg-fondo p-e3">
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">Mientras tanto</p>
            <p className="mt-e1 text-cuerpo">{ficha.mientrasTanto}</p>
          </div>
        </div>
      )}
    </Hoja>
  );
}
