import { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
  useSortable,
  type AnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clases } from '../clases.ts';
import { usarSeVeEnModoCocina } from '../ganchos/usarModoCocina.ts';
import { Casilla, HuecoDeAnadir } from './Casilla.tsx';
import { CLASES_DE_LA_REJILLA, CLASES_DEL_TAMANO, type RejillaConVacios } from './rejilla.ts';
import type { WidgetPuesto } from './catalogo.ts';

/**
 * **Donde está el dedo, ahí va** (25-sep). Con `closestCenter` mandaba el centro del
 * widget que se arrastra, no el dedo: un widget grande cogido por su borde tiene el
 * centro muy lejos de donde se toca, y al soltarlo encima de «Fichar» se iba a otro
 * sitio. Una prueba lo hacía unas veces sí y otras no, según lo alto que saliera cada
 * widget con los datos del día. Como en la pantalla de inicio del móvil, decide el
 * dedo; y sin dedo —con el teclado— el centro, como antes.
 */
const dondeEstaElDedo: CollisionDetection = (argumentos) => {
  const bajoElDedo = pointerWithin(argumentos);
  return bajoElDedo.length > 0 ? bajoElDedo : closestCenter(argumentos);
};

/**
 * La rejilla en edición, con arrastre de verdad (M7, 0039).
 *
 * Vive en su propio fichero para que **`@dnd-kit` solo se descargue al editar**: el
 * Panel se abre cien veces por cada vez que se reordena.
 *
 * ── Cómo se mueve, y por qué así ─────────────────────────────────────────────
 *
 * El orden cambia **mientras se arrastra**, no al soltar: al pasar sobre otro
 * widget, la lista se reordena, la rejilla vuelve a colocar cada uno con CSS —con
 * sus tamaños y su flujo denso— y los que cambian de sitio **se deslizan** hasta
 * él. El que se lleva va en una capa aparte pegada al dedo, y en su sitio queda un
 * hueco. Así se ve dónde va a caer antes de soltarlo.
 *
 * Se hace así y no con las transformaciones que calcula la librería porque los
 * widgets **no miden lo mismo**: con uno ancho y uno pequeño, mover cajas de sitio
 * a mano estira o encoge lo que se mueve. Dejar que la rejilla coloque es lo que
 * hace que salga bien con cualquier mezcla.
 *
 * ── Dedo, ratón y teclado ────────────────────────────────────────────────────
 *
 *   · **Dedo**: hay que dejarlo quieto un momento (150 ms) antes de arrastrar.
 *     Sin eso, hacer scroll por el Panel en edición cogería el primer widget que
 *     se toque.
 *   · **Ratón**: en cuanto se mueve cinco píxeles.
 *   · **Teclado**: tabulador hasta el widget, espacio para cogerlo, flechas para
 *     moverlo, espacio para dejarlo y `Esc` para dejarlo donde estaba. Cada paso se
 *     anuncia en castellano para quien usa un lector de pantalla.
 */
export default function RejillaQueSeEdita(props: RejillaConVacios) {
  const { puestos, pintar, alReordenar, alSoltar, nombreDe, alAnadir } = props;
  const [cogido, setCogido] = useState<string | null>(null);
  /** El orden de antes de coger, para dejarlo como estaba si se cancela. */
  const antes = useRef<readonly WidgetPuesto[] | null>(null);

  /*
    En modo cocina **no se arrastra** (entrega V, mejora 1).

    Un guante de nitrilo toca bien pero no desliza fino, y mantener pulsado con la
    mano mojada dispara el arrastre sin querer: mover un widget se convierte en
    mover el que no era. Así que ahí el dedo y el ratón dejan de coger nada y
    salen los botones de subir y bajar.

    **El teclado se queda**, y no es un descuido: no estorba a nadie con guantes,
    y quitarlo dejaría el Panel sin forma de reordenarse para quien no usa el
    ratón. Un modo pensado para que más gente pueda usarlo no puede quitarle el
    acceso a nadie.
  */
  const conGuantes = usarSeVeEnModoCocina();

  /*
    Los tres sensores se crean **siempre**. `useSensor` usa `useMemo` por dentro,
    así que crearlos dentro de un `if` rompería las reglas de los ganchos de
    verdad, no solo para el linter: React cuenta las llamadas y se desincronizaría
    al cambiar de modo. Quien deja de arrastrar es cada widget, con `disabled`,
    que es lo que la librería tiene para esto.
  */
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Mueve un widget un puesto, que es lo que hacen los botones de modo cocina. */
  const mover = (indice: number, hacia: 'arriba' | 'abajo') => {
    const hasta = hacia === 'arriba' ? indice - 1 : indice + 1;
    if (hasta < 0 || hasta >= puestos.length) return;
    alReordenar(arrayMove([...puestos], indice, hasta));
    // El mismo aviso que al soltar: sin esto el orden se vería y no se guardaría.
    alSoltar?.();
  };

  const posicion = (id: string | number) => puestos.findIndex((p) => p.id === id) + 1;
  const nombre = (id: string | number) => nombreDe(String(id));

  const anuncios: Announcements = {
    onDragStart: ({ active }) =>
      `Has cogido ${nombre(active.id)}. Está en el puesto ${posicion(active.id)} de ${puestos.length}.`,
    onDragOver: ({ active, over }) =>
      over === null
        ? `${nombre(active.id)} no está sobre ningún sitio.`
        : `${nombre(active.id)} va al puesto ${posicion(over.id)} de ${puestos.length}.`,
    onDragEnd: ({ active }) =>
      `${nombre(active.id)} se queda en el puesto ${posicion(active.id)} de ${puestos.length}.`,
    onDragCancel: ({ active }) => `${nombre(active.id)} vuelve a donde estaba.`,
  };

  const alCoger = ({ active }: DragStartEvent) => {
    antes.current = puestos;
    setCogido(String(active.id));
  };

  const alPasar = ({ active, over }: DragOverEvent) => {
    if (over === null || active.id === over.id) return;
    const desde = puestos.findIndex((p) => p.id === active.id);
    const hasta = puestos.findIndex((p) => p.id === over.id);
    if (desde === -1 || hasta === -1) return;
    alReordenar(arrayMove([...puestos], desde, hasta));
  };

  const alDejar = (_evento: DragEndEvent) => {
    setCogido(null);
    antes.current = null;
    alSoltar?.();
  };

  const alCancelar = () => {
    setCogido(null);
    if (antes.current !== null) alReordenar(antes.current);
    antes.current = null;
    alSoltar?.();
  };

  const elCogido = puestos.find((p) => p.id === cogido);

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={dondeEstaElDedo}
      onDragStart={alCoger}
      onDragOver={alPasar}
      onDragEnd={alDejar}
      onDragCancel={alCancelar}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable:
            'Para mover este widget, pulsa espacio. Con las flechas lo llevas a otro sitio; espacio lo deja ahí y Escape lo devuelve a donde estaba.',
        },
      }}
    >
      {/* Sin estrategia de transformaciones: coloca la rejilla, ver arriba. */}
      <SortableContext items={puestos.map((p) => p.id)} strategy={() => null}>
        <div className={CLASES_DE_LA_REJILLA}>
          {puestos.map((puesto, indice) => (
            <CasillaQueSeMueve
              key={puesto.id}
              puesto={puesto}
              indice={indice}
              cogido={cogido === puesto.id}
              conGuantes={conGuantes}
              alMover={(hacia) => {
                mover(indice, hacia);
              }}
              esElPrimero={indice === 0}
              esElUltimo={indice === puestos.length - 1}
              {...props}
            >
              {pintar(puesto)}
            </CasillaQueSeMueve>
          ))}
          <HuecoDeAnadir alAnadir={alAnadir} />
        </div>
      </SortableContext>

      {/* Lo que va pegado al dedo: el mismo widget, levantado. */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {elCogido === undefined ? null : (
          <div
            className={clases(
              CLASES_DEL_TAMANO[elCogido.tamano],
              'h-full scale-[1.03] cursor-grabbing rounded-mayor shadow-s3',
            )}
          >
            {pintar(elCogido)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Que los que cambian de sitio se deslicen siempre, y no solo al soltar.
 *
 * Por defecto la librería anima el cambio de sitio de un elemento solo después
 * de soltar. Aquí el orden cambia mientras se arrastra, así que hay que pedirle
 * que anime también entonces: es lo que hace que los demás «se aparten».
 */
const deslizarSiempre: AnimateLayoutChanges = (argumentos) =>
  defaultAnimateLayoutChanges({ ...argumentos, wasDragging: true });

function CasillaQueSeMueve({
  puesto,
  indice,
  cogido,
  conGuantes,
  alMover,
  esElPrimero,
  esElUltimo,
  editando,
  vacios,
  avisarDeVacio,
  alQuitar,
  alCambiarTamano,
  tamanosDe,
  nombreDe,
  children,
}: RejillaConVacios & {
  readonly puesto: WidgetPuesto;
  readonly indice: number;
  readonly cogido: boolean;
  /** En modo cocina no se arrastra: se mueve con los dos botones. */
  readonly conGuantes: boolean;
  readonly alMover: (hacia: 'arriba' | 'abajo') => void;
  readonly esElPrimero: boolean;
  readonly esElUltimo: boolean;
  readonly children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: puesto.id,
    animateLayoutChanges: deslizarSiempre,
    // Con guantes, el dedo y el ratón dejan de coger. El teclado sigue moviendo:
    // `disabled` con un objeto apaga solo lo que se le dice.
    disabled: conGuantes ? { draggable: true, droppable: false } : false,
  });

  return (
    <Casilla
      ref={setNodeRef}
      id={puesto.id}
      nombre={nombreDe(puesto.id)}
      tamano={puesto.tamano}
      tamanos={tamanosDe(puesto.id)}
      indice={indice}
      editando={editando}
      vacio={vacios.has(puesto.id)}
      hueco={cogido}
      avisarDeVacio={avisarDeVacio}
      alQuitar={() => {
        alQuitar(puesto.id);
      }}
      alCambiarTamano={(tamano) => {
        alCambiarTamano(puesto.id, tamano);
      }}
      // Los botones de subir y bajar salen **solo con guantes**: fuera de ahí se
      // arrastra, y ofrecer las dos cosas serían dos formas de mover lo mismo.
      {...(conGuantes ? { alMover, esElPrimero, esElUltimo } : {})}
      estilo={{ transform: CSS.Translate.toString(transform), transition }}
      className={clases(
        'touch-manipulation rounded-grande focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-naranja',
        // Sin guantes el cursor dice «esto se arrastra». Con guantes no se
        // arrastra, así que decirlo sería mentir.
        conGuantes ? 'cursor-default' : cogido ? 'cursor-grabbing' : 'cursor-grab',
      )}
      {...attributes}
      // Un grupo y no un botón: dentro van el «quitar» y el tamaño, y un botón no
      // puede llevar botones dentro.
      role="group"
      aria-roledescription="widget que se puede mover"
      aria-label={`${nombreDe(puesto.id)}. Mover`}
      {...listeners}
    >
      {children}
    </Casilla>
  );
}
