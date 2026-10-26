import { useState } from 'react';
import { Boton, EstadoVacio } from '@estook/ui';
import type { LaMesa, MenuDeLaSala, SeccionDelMenuDeLaSala } from '../datos/tipos.ts';
import { anadirAlMenu, anadirMenus, type Borrador } from '../logica/comanda.ts';
import { euros } from '../logica/texto.ts';
import { Contador } from './LaCuenta.tsx';

/**
 * El menú del día en la sala (0106, «Menu»): cuántos menús, y de cada sección lo que
 * eligen («Primeros · 2 de 2»). Se añade de una vez y cada menú sale en su cuenta con su
 * precio; sus platos van a cocina en su pase (Primeros el 1.º, Segundos el 2.º) y la
 * bebida, a la barra.
 *
 * **El postre, al final** (0106): cuando la mesa ya tiene menús, aquí se elige el postre
 * de cada uno, y va dentro de su menú, sin cobrarse aparte.
 */
export function ElMenuDelDia({
  menus,
  mesa,
  borrador,
  alCambiarElBorrador,
  avisar,
}: {
  readonly menus: readonly MenuDeLaSala[];
  readonly mesa: LaMesa;
  readonly borrador: Borrador;
  readonly alCambiarElBorrador: (b: Borrador) => void;
  /** El aviso de la alergia de la mesa (0117), antes de elegir lo que la lleva. */
  readonly avisar: (nombre: string, loQueLleva: readonly string[], pedir: () => void) => void;
}) {
  const [menuId, setMenuId] = useState(menus[0]?.id ?? '');
  const menu = menus.find((m) => m.id === menuId) ?? menus[0];
  const yaHay =
    mesa.platos.some((p) => p.menuId !== null) || borrador.some((l) => l.menuId !== null);
  const [cuantos, setCuantos] = useState(yaHay ? 1 : Math.max(1, mesa.personas ?? 1));
  const [elegidos, setElegidos] = useState<Record<string, Record<string, number>>>({});

  if (menu === undefined) {
    return (
      <EstadoVacio
        compacto
        titulo="Hoy no hay menú"
        frase="El menú del día se monta en Estook › Carta › Menús, con su precio."
        dibujo="platos"
        sinAccionPorque="El menú se monta en Estook, no en la sala."
      />
    );
  }

  const deComida = menu.secciones.filter((s) => !s.esPostre);
  const delPostre = menu.secciones.find((s) => s.esPostre && s.platos.length > 0);
  const cuantosEn = (s: SeccionDelMenuDeLaSala) =>
    Object.values(elegidos[s.id] ?? {}).reduce((n, c) => n + c, 0);
  // La bebida no hace falta elegirla ahora: a veces la piden luego.
  const completo = deComida
    .filter((s) => !s.esBebida && s.platos.length > 0)
    .every((s) => cuantosEn(s) === cuantos);
  const suplementos = deComida.reduce(
    (total, s) =>
      total +
      s.platos.reduce((n, p) => n + p.suplementoCentimos * (elegidos[s.id]?.[p.platoId] ?? 0), 0),
    0,
  );

  function cambiar(seccion: SeccionDelMenuDeLaSala, platoId: string, mas: number) {
    const ahora = elegidos[seccion.id]?.[platoId] ?? 0;
    if (mas > 0 && cuantosEn(seccion) >= cuantos) return;
    setElegidos({
      ...elegidos,
      [seccion.id]: { ...(elegidos[seccion.id] ?? {}), [platoId]: Math.max(0, ahora + mas) },
    });
  }

  function anadir() {
    if (menu === undefined) return;
    alCambiarElBorrador(
      anadirMenus(
        borrador,
        menu,
        cuantos,
        deComida.map((s) => ({
          seccion: { pase: s.pase, esBebida: s.esBebida },
          platos: s.platos
            .filter((p) => (elegidos[s.id]?.[p.platoId] ?? 0) > 0)
            .map((p) => ({
              platoId: p.platoId,
              nombre: p.nombre,
              suplementoCentimos: p.suplementoCentimos,
              cuantos: elegidos[s.id]?.[p.platoId] ?? 0,
            })),
        })),
      ),
    );
    setElegidos({});
    setCuantos(1);
  }

  // Los menús de la mesa que aún no tienen postre.
  const lineasDelMenu = [
    ...mesa.platos
      .filter((p) => p.menuId === menu.id && p.parteDe === null && p.estado !== 'quitado')
      .map((p) => p.id),
    ...borrador.filter((l) => l.menuId === menu.id).map((l) => l.id),
  ];
  const postres = new Set(delPostre?.platos.map((p) => p.platoId) ?? []);
  const conPostre = new Set([
    ...mesa.platos
      .filter(
        (p) =>
          p.parteDe !== null &&
          p.platoId !== null &&
          postres.has(p.platoId) &&
          p.estado !== 'quitado',
      )
      .map((p) => p.parteDe),
    ...borrador
      .filter((l) => l.parteDe !== null && l.platoId !== null && postres.has(l.platoId))
      .map((l) => l.parteDe),
  ]);
  const sinPostre = lineasDelMenu.filter((id) => !conPostre.has(id));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-e3">
      {menus.length > 1 && (
        <div className="mb-e4 flex flex-wrap gap-e2">
          {menus.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === menu.id}
              onClick={() => {
                setMenuId(m.id);
                setElegidos({});
              }}
              className={[
                'min-h-toque rounded-redondo px-e4 font-semibold',
                m.id === menu.id ? 'bg-charcoal text-white' : 'border border-borde bg-superficie',
              ].join(' ')}
            >
              {m.nombre} · {euros(m.precioCentimos)}
            </button>
          ))}
        </div>
      )}

      {delPostre !== undefined && sinPostre.length > 0 && (
        <section className="mb-e5 rounded-grande bg-naranja-suave p-e3">
          <h2 className="mb-e2 font-bold">
            {delPostre.nombre} del menú ·{' '}
            {sinPostre.length === 1 ? 'falta 1' : `faltan ${sinPostre.length}`}
          </h2>
          <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
            {delPostre.platos.map((p) => (
              <BotonDePlato
                key={p.platoId}
                nombre={p.nombre}
                detalle={
                  p.agotado
                    ? 'Agotado'
                    : p.suplementoCentimos > 0
                      ? `+${euros(p.suplementoCentimos)}`
                      : ''
                }
                cuantos={0}
                apagado={p.agotado}
                alTocar={() => {
                  const primero = sinPostre[0];
                  if (primero === undefined) return;
                  avisar(p.nombre, p.alergenos ?? [], () => {
                    alCambiarElBorrador(
                      anadirAlMenu(borrador, primero, p, {
                        pase: delPostre.pase,
                        esBebida: delPostre.esBebida,
                      }),
                    );
                  });
                }}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mb-e4">
        <Contador valor={cuantos} alCambiar={setCuantos} etiqueta="¿Cuántos menús?" />
      </div>

      {deComida.map((s) => (
        <section key={s.id} className="mb-e5">
          <h2 className="mb-e2 flex items-baseline gap-e2 font-bold">
            {s.nombre}
            {!s.esBebida && (
              <span
                className={[
                  'text-secundario',
                  cuantosEn(s) === cuantos ? 'text-bien' : 'text-texto-suave',
                ].join(' ')}
              >
                {cuantosEn(s)} de {cuantos}
              </span>
            )}
            {s.esBebida && <span className="text-secundario text-texto-suave">a la barra</span>}
          </h2>
          {s.platos.length === 0 ? (
            <p className="text-secundario text-texto-suave">Hoy no hay nada puesto aquí.</p>
          ) : (
            <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
              {s.platos.map((p) => (
                <BotonDePlato
                  key={p.platoId}
                  nombre={p.nombre}
                  detalle={
                    p.agotado
                      ? 'Agotado'
                      : p.suplementoCentimos > 0
                        ? `+${euros(p.suplementoCentimos)}`
                        : ''
                  }
                  cuantos={elegidos[s.id]?.[p.platoId] ?? 0}
                  apagado={p.agotado}
                  alTocar={() => {
                    // Se avisa al elegir el primero: con cuatro menús no se avisa cuatro veces.
                    if ((elegidos[s.id]?.[p.platoId] ?? 0) > 0) cambiar(s, p.platoId, 1);
                    else
                      avisar(p.nombre, p.alergenos ?? [], () => {
                        cambiar(s, p.platoId, 1);
                      });
                  }}
                  alQuitar={() => {
                    cambiar(s, p.platoId, -1);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      <p className="mb-e3 text-secundario text-texto-suave">
        {[
          menu.entraPan ? 'Pan incluido' : null,
          menu.entraCafe ? 'café incluido' : null,
          delPostre === undefined ? null : 'el postre, al final',
        ]
          .filter((x) => x !== null)
          .join(' · ')}
      </p>
      <Boton tono="principal" tamano="l" ancho disabled={!completo} onClick={anadir}>
        Añadir {cuantos === 1 ? '1 menú' : `${cuantos} menús`} ·{' '}
        {euros(menu.precioCentimos * cuantos + suplementos)} €
      </Boton>
    </div>
  );
}

function BotonDePlato({
  nombre,
  detalle,
  cuantos,
  apagado,
  alTocar,
  alQuitar,
}: {
  readonly nombre: string;
  readonly detalle: string;
  readonly cuantos: number;
  readonly apagado: boolean;
  readonly alTocar: () => void;
  readonly alQuitar?: () => void;
}) {
  return (
    <div
      className={[
        'relative flex min-h-[4.5rem] rounded-grande border bg-superficie',
        cuantos > 0 ? 'border-naranja' : 'border-borde',
        apagado ? 'opacity-50' : '',
      ].join(' ')}
    >
      <button
        type="button"
        disabled={apagado}
        onClick={alTocar}
        className="flex flex-1 flex-col items-start justify-center px-e3 py-e2 text-left"
      >
        <span className="font-semibold leading-tight">{nombre}</span>
        {detalle !== '' && <span className="text-secundario text-texto-suave">{detalle}</span>}
      </button>
      {cuantos > 0 && alQuitar !== undefined && (
        <button
          type="button"
          aria-label={`Uno menos de ${nombre}`}
          onClick={alQuitar}
          className="m-e1 flex min-w-toque items-center justify-center gap-e1 rounded-medio bg-naranja px-e2 font-bold text-sobre-naranja"
        >
          {cuantos} −
        </button>
      )}
    </div>
  );
}
