import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DE_LA_CAPA } from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import { Cargando, clases } from '@estook/ui';
import { IconoAjustes, IconoCalendario, IconoPrisa } from '@estook/iconos';
import { ElegirAtajos } from '../../acciones/ElegirAtajos.tsx';
import { usarHacer } from '../../ganchos/usarHacer.ts';
import { usarMisAtajos } from '../../ganchos/usarMisAtajos.ts';
import { usarSesion } from '../../sesion/Sesion.tsx';
import type { LoQueViene } from '../../compras/contrato.ts';
import { usarLoDelPanel } from '../../ganchos/usarLoDelPanel.ts';
import { NadaQueVer, Tarjeta } from './piezas.tsx';

/**
 * Lo que había en el Panel y la maqueta no dibuja, que **pasa a «Añadidos»** (la maqueta: «lo demás
 * se junta o pasa a Añadidos»; solo «Tus apps» sale, que ya está en el menú lateral). Con la
 * tarjeta nueva, para que el Panel se vea de una pieza.
 */

/** «Tus atajos»: los botones que cada uno elige, de cualquier app (0084). */
export function TusAtajos() {
  const mios = usarMisAtajos();
  const hacer = usarHacer();
  const [eligiendo, setEligiendo] = useState(false);
  const acciones = mios.atajos;
  return (
    <Tarjeta
      titulo="Tus atajos"
      icono={<IconoPrisa />}
      derecha={
        <button
          type="button"
          onClick={() => {
            setEligiendo(true);
          }}
          aria-label="Elegir tus atajos"
          title="Elegir tus atajos"
          className="grid size-[30px] place-items-center rounded-redondo border border-borde text-texto-suave hover:bg-fondo hover:text-texto"
        >
          <IconoAjustes size={15} />
        </button>
      }
    >
      {acciones.length === 0 ? (
        <NadaQueVer>No has elegido ninguno. Toca la rueda para poner los que uses.</NadaQueVer>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-e2">
          {acciones.slice(0, 4).map((accion) => (
            <button
              key={accion.id}
              type="button"
              onClick={() => {
                hacer(accion);
              }}
              className="flex min-h-[4rem] flex-col items-start justify-between gap-e1 rounded-grande border border-borde bg-fondo p-e2 text-left transition-colors duration-[--rapido] hover:border-borde-fuerte hover:bg-superficie"
            >
              <accion.icono size={18} />
              <span className="text-secundario font-semibold leading-tight">{accion.nombre}</span>
            </button>
          ))}
        </div>
      )}
      <ElegirAtajos
        abierta={eligiendo}
        alCerrar={() => {
          setEligiendo(false);
        }}
        puedo={mios.puedo}
        elegidas={mios.elegidos}
        alCambiar={mios.guardar}
        alVolverALosDeMiPuesto={mios.volverALosDeMiPuesto}
      />
    </Tarjeta>
  );
}

const COLOR_DE_LA_CAPA: Readonly<Record<string, string>> = {
  entrega: 'var(--color-app-almacen)',
  caducidad: 'var(--color-mal)',
  turno: 'var(--color-app-equipo)',
  appcc: 'var(--color-app-servicio)',
  mantenimiento: 'var(--color-app-servicio)',
  aviso: 'var(--color-info)',
};

/** «Lo que viene»: hoy y mañana, del Calendario (entregas, caducidades, turnos y avisos). */
export function LoQueVieneDelCalendario() {
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  const consulta = usarLoDelPanel<LoQueViene>(
    'lo_que_viene',
    {},
    puedeVer(permisos, 'app.calendario'),
  );
  const dias = (consulta.data?.dias ?? []).filter((d) => d.ocurrencias.length > 0);
  return (
    <Tarjeta titulo="Lo que viene" icono={<IconoCalendario />} ir="/calendario" leyendo={consulta}>
      {consulta.data === undefined ? (
        <Cargando que="lo que viene" lineas={3} />
      ) : dias.length === 0 ? (
        <NadaQueVer>Nada apuntado para hoy ni para mañana.</NadaQueVer>
      ) : (
        <div className="flex flex-col gap-e3 overflow-hidden">
          {dias.slice(0, 2).map((dia) => (
            <div key={dia.fecha}>
              <p className="mb-e1 text-etiqueta font-semibold text-texto-tenue">{dia.cuando}</p>
              <ol className="flex flex-col gap-[2px]">
                {dia.ocurrencias.slice(0, 3).map((o) => (
                  <li key={`${o.id}-${dia.fecha}`}>
                    <button
                      type="button"
                      disabled={o.ir === null}
                      onClick={() => {
                        if (o.ir !== null) navegar(o.ir);
                      }}
                      className="flex min-h-[2rem] w-full items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-redondo"
                        style={{
                          background: COLOR_DE_LA_CAPA[o.capa] ?? 'var(--color-texto-tenue)',
                        }}
                      />
                      {o.desde !== null && (
                        <span className="shrink-0 text-etiqueta font-semibold tabular-nums text-texto-suave">
                          {o.desde}
                        </span>
                      )}
                      <span
                        className={clases(
                          'min-w-0 flex-1 truncate text-secundario',
                          o.hecho && 'text-texto-suave line-through',
                        )}
                      >
                        {o.titulo}
                      </span>
                      <span className="shrink-0 text-etiqueta text-texto-tenue">
                        {NOMBRE_DE_LA_CAPA[o.capa]}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
