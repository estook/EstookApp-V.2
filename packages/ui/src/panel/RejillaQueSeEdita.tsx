import { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
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
import { Casilla, HuecoDeAnadir } from './Casilla.tsx';
import { CLASES_DE_LA_REJILLA, CLASES_DEL_TAMANO, type RejillaConVacios } from './rejilla.ts';
import type { WidgetPuesto } from './catalogo.ts';

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

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      collisionDetection={closestCenter}
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
              'h-full scale-[1.03] cursor-grabbing rounded-grande shadow-s3',
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
  readonly children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: puesto.id,
    animateLayoutChanges: deslizarSiempre,
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
      estilo={{ transform: CSS.Translate.toString(transform), transition }}
      className={clases(
        'touch-manipulation rounded-grande focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-naranja',
        cogido ? 'cursor-grabbing' : 'cursor-grab',
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
