import { LOS_COLORES_DE_LA_SALA } from '../plano/losColores.ts';
import { HORAS_PARA_AVISAR } from '../logica/comoVaLaMesa.ts';

/**
 * **Los colores de la sala, explicados** (el rediseño, 0148; Richi, 17-nov: «una guía de colores
 * explicándolos en ajustes, en pequeño, tipo leyenda, al final»). Para todos: también quien
 * empieza hoy tiene que saber qué quiere decir cada mesa.
 */
export function LosColoresDeLaSala() {
  return (
    <section aria-label="Los colores de la sala" className="flex flex-col gap-e2">
      <h2 className="text-cuerpo font-bold text-texto-suave">Los colores de la sala</h2>
      <ul className="grid gap-e3 rounded-mayor bg-superficie p-e4 sm:grid-cols-2 lg:grid-cols-4">
        {LOS_COLORES_DE_LA_SALA.map((c) => (
          <li key={c.nombre} className="flex items-center gap-e3">
            <span aria-hidden className={['size-8 shrink-0 rounded-medio', c.fondo].join(' ')} />
            <span className="flex flex-col leading-tight">
              <span className="font-bold">{c.nombre}</span>
              <span className="text-secundario text-texto-suave">{c.explica}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center gap-e3">
          <span
            aria-hidden
            className="size-8 shrink-0 rounded-medio border-[3px] border-dashed border-mal"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-bold">Más de {HORAS_PARA_AVISAR} h</span>
            <span className="text-secundario text-texto-suave">
              Abierta desde hace mucho: cóbrala o ciérrala
            </span>
          </span>
        </li>
        <li className="flex items-center gap-e3">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-medio bg-charcoal text-etiqueta font-bold"
          >
            AB
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-bold">Su camarero</span>
            <span className="text-secundario text-texto-suave">
              Las iniciales de quien la lleva; las tuyas, en blanco
            </span>
          </span>
        </li>
      </ul>
    </section>
  );
}
