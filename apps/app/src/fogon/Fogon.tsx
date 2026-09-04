import { useLocation } from 'react-router-dom';
import { Boton, Hoja, IconoDeFogon, PanelLateral, clases, usarEsEscritorio } from '@estook/ui';

/**
 * Fogón · dónde vive y cómo se abre.
 *
 * ── La decisión que hay detrás ───────────────────────────────────────────────
 *
 * «Presente en **todas** las apps, trabajando con el contexto de la pantalla»
 * (Plan, M22). Eso deja abierta la pregunta de *cómo* está presente, y la
 * respuesta obvia —una pestaña «Fogón» dentro de cada app— es la mala: son ocho
 * pestañas más que quitan sitio a las que hacen algo, y obligan a **salir de lo
 * que estás haciendo** para preguntar por lo que estás haciendo.
 *
 * Se decidió lo contrario, y está escrito en
 * [`docs/decisiones/0015`](../../../../docs/decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md):
 *
 *   · **En móvil, una burbuja flotante** que va contigo por toda la aplicación.
 *   · **En escritorio, el icono de arriba a la derecha** que ya estaba en B5,
 *     abriendo un panel lateral que no tapa la pantalla.
 *   · **Sabe en qué página estás** en los dos casos, sin que se lo digas.
 *   · **Nunca una pestaña dentro de una app.** Las pestañas son para los
 *     análisis periódicos que Fogón deja hechos, no para hablar con él.
 *
 * ── Y por qué esto se construye antes que M22 ────────────────────────────────
 *
 * Porque **dónde vive un botón es una decisión de navegación, no de inteligencia**.
 * Dejarla para M22 significaría rehacer la barra, la rueda y el esqueleto cuando
 * llegue. Así queda el sitio hecho y probado, y M22 solo tiene que llenarlo.
 *
 * ── Lo que NO hay aquí, y se dice ────────────────────────────────────────────
 *
 * **No hay casilla para escribirle.** Poner una que no conteste sería el fallo
 * que este proyecto lleva persiguiendo desde M4: un control que promete algo y
 * no lo hace. Lo que sí hay es qué le vas a poder pedir **en esta pantalla**,
 * que es información de verdad y ayuda a decidir si algo falta.
 */

// ── Qué podrá hacer aquí ─────────────────────────────────────────────────────

interface LoDeAqui {
  readonly donde: string;
  readonly podras: readonly string[];
}

/**
 * Lo que Fogón podrá hacer en cada app.
 *
 * Sale de las fichas de M22, M14 y M23 del Plan, y de la Evolución 1.0. **No es
 * una lista de deseos**: cada línea está comprometida en un módulo.
 */
const POR_APP: Readonly<Record<string, LoDeAqui>> = {
  '': {
    donde: 'el Panel',
    podras: [
      'Preguntarle qué tal va el día, y que te conteste con las cifras de tu local en vez de con generalidades.',
      'Que te ordene lo que hay que atender por lo que más cuesta si se deja, no por hora de llegada.',
      'Pedirle el resumen de la semana para mandárselo a quien lleve las cuentas.',
    ],
  },
  inventario: {
    donde: 'Inventario',
    podras: [
      'Dictarle una merma con las manos ocupadas: «se me han caído dos kilos de pulpo».',
      'Pedirle el pedido de mañana, y que lo deje en borrador respetando los días de reparto.',
      'Preguntarle por qué ha subido el aceite y cuánto te cuesta al mes esa subida.',
      'Que rellene la ficha de un producto a partir de la foto de un albarán.',
    ],
  },
  escandallos: {
    donde: 'Escandallos',
    podras: [
      'Preguntarle qué plato ha dejado de dar margen y por culpa de qué ingrediente.',
      'Que te proponga cómo recuperar el margen sin tocar el precio de venta.',
      'Dictarle una ficha técnica entera y que la deje montada para que la revises.',
    ],
  },
  carta: {
    donde: 'Carta',
    podras: [
      'Preguntarle qué quitarías de la carta, con el número delante.',
      'Que te traduzca las fichas a otro idioma sin inventarse los alérgenos.',
      'Que te prepare un menú del día con lo que hay que gastar antes de que caduque.',
    ],
  },
  calendario: {
    donde: 'Calendario',
    podras: [
      'Pedirle el cuadrante de la semana, cruzando disponibilidad, contratos, ventas previstas y coste.',
      'Que te diga qué te va a costar ese cuadrante antes de publicarlo.',
      'Nunca lo publica solo: la propuesta nace en borrador.',
    ],
  },
  equipo: {
    donde: 'Equipo',
    podras: [
      'Preguntarle cuántas horas lleva cada uno y quién se está pasando del contrato.',
      'Que te avise de los fichajes raros antes de que se conviertan en una discusión.',
      'Y lo que no hará nunca: enseñar el sueldo de nadie a quien no tenga ese permiso.',
    ],
  },
  servicio: {
    donde: 'Servicio',
    podras: [
      'Dictarle una temperatura o una incidencia sin parar lo que estás haciendo.',
      'Que te prepare el cierre de la jornada y te señale lo que falta por registrar.',
      'Preguntarle en qué días y en qué platos se sirvió un lote concreto.',
    ],
  },
  negocio: {
    donde: 'Negocio',
    podras: [
      'Preguntarle a qué se debe una caída, y que mire ventas, costes y cuadrante antes de contestar.',
      'Que te explique una cifra del panel en una frase, sin jerga.',
      'Compararte con tu propio mes pasado, no con una media inventada.',
    ],
  },
  cuaderno: {
    donde: 'el Cuaderno',
    podras: [
      'Dictarle una incidencia y que la deje apuntada con su fecha y su responsable.',
      'Que convierta una nota suelta en una tarea con fecha, si tú lo apruebas.',
    ],
  },
  ajustes: {
    donde: 'Ajustes',
    podras: [
      'Preguntarle qué hace cada cosa de aquí, sin tener que buscarlo.',
      'Que te diga cuánto ha gastado Fogón este mes, y en qué.',
    ],
  },
  cadena: {
    donde: 'la vista de la cadena',
    podras: [
      'Preguntarle qué local se está desviando y en qué.',
      'Que convierta cada problema de una auditoría en tarea, responsable y fecha.',
    ],
  },
};

const POR_DEFECTO: LoDeAqui = {
  donde: 'esta pantalla',
  podras: [
    'Preguntarle por lo que estés mirando, sin tener que explicarle dónde estás.',
    'Pedirle que rellene o prepare algo, y aprobarlo tú antes de que se guarde.',
  ],
};

// ── La burbuja del móvil ─────────────────────────────────────────────────────

/**
 * «Mejor una burbuja flotante que detecte la página en la que estés.»
 *
 * Va **por encima de la barra de abajo**, no dentro: la barra de abajo es para
 * navegar (B5, y es lo que recomienda Apple), y Fogón no es un sitio al que se
 * va, es algo que está. Y a la derecha, que es donde llega el pulgar.
 *
 * En escritorio no sale: allí ya está el icono de arriba a la derecha que manda
 * B5, y dos puertas a lo mismo en la misma pantalla es una de más.
 */
export function BurbujaDeFogon({ alPulsar }: { readonly alPulsar: () => void }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label="Abrir Fogón"
      className={clases(
        'fixed right-e3 z-30 grid size-[56px] place-items-center lg:hidden',
        'rounded-redondo bg-superficie text-naranja shadow-s3 border border-borde',
        'bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e3))]',
      )}
    >
      <IconoDeFogon size={30} />
    </button>
  );
}

// ── La ventana: hoja en móvil, panel lateral en escritorio ───────────────────

/**
 * En escritorio **no tapa la pantalla**: entra por la derecha y deja ver lo que
 * estabas mirando, que es de lo que va preguntarle a Fogón por ello (B5, «la
 * ficha abriéndose en panel derecho sin tapar la lista»). En móvil no cabe un
 * panel al lado, así que sube una hoja, que es el gesto de siempre.
 */
export function VentanaDeFogon({
  abierta,
  alCerrar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
}) {
  const { pathname } = useLocation();
  // El unico corte de la aplicacion vive en `@estook/ui`, no aqui: si esta
  // pantalla se inventara el suyo, un dia dirian cosas distintas.
  const enEscritorio = usarEsEscritorio();

  const [, primero = ''] = pathname.split('/');
  const lo = POR_APP[primero] ?? POR_DEFECTO;

  const Ventana = enEscritorio ? PanelLateral : Hoja;

  return (
    <Ventana
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Fogón"
      pie={
        <Boton tono="principal" onClick={alCerrar}>
          Cerrar
        </Boton>
      }
    >
      <div className="flex flex-col gap-e4">
        {/*
          Lo primero, dónde está. Es la mitad de la promesa: «trabajando con el
          contexto de la pantalla» empieza por que se note que sabe dónde estás.
        */}
        <p className="text-secundario text-texto-suave">
          Estás en <span className="font-semibold text-texto">{lo.donde}</span>. Fogón lo sabe sin
          que se lo digas: por eso está aquí y no en una pantalla aparte.
        </p>

        <div>
          <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
            Lo que le vas a poder pedir aquí
          </p>
          <ul className="mt-e2 flex flex-col gap-e2">
            {lo.podras.map((linea) => (
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
          Y la verdad, sin adornos. No hay casilla para escribirle: una casilla
          que no contesta es un control muerto, y de eso este proyecto ya lleva
          bastantes.
        */}
        <div className="rounded-medio bg-fondo p-e3">
          <p className="text-cuerpo font-medium">Todavía no se puede hablar con él.</p>
          <p className="mt-e1 text-cuerpo text-texto-suave">
            Fogón llega con el módulo 22. Este sitio ya es el suyo —la burbuja en el móvil, el icono
            de arriba en el ordenador— y desde ahí hablarás con él y le pedirás cosas, sin salir de
            lo que estés haciendo.
          </p>
        </div>

        <div className="rounded-medio border border-borde p-e3">
          <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
            Y lo que ya hace Estook sin él
          </p>
          <p className="mt-e1 text-cuerpo text-texto-suave">
            Los números los calcula la base de datos, <strong>nunca el modelo</strong>. Cuándo se
            agota cada producto, cuánto se gasta al día y cuánto ha subido un precio ya están
            calculados, con sus días mirados al lado. Eso no es que le falte Fogón: es que ahí Fogón
            no pinta nada.
          </p>
        </div>
      </div>
    </Ventana>
  );
}
