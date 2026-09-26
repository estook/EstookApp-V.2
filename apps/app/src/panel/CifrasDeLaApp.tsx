import { useLocation, useNavigate } from 'react-router-dom';
import {
  LAS_CIFRAS_DE,
  type AppConCifras,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import { puedeTenerElIndicador, puedeVer } from '@estook/permisos';
import { ElegirPeriodo, TarjetaDeIndicador, appPorId, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { DONDE_SE_MIRA, usarElIndicador } from '../ganchos/usarElIndicador.ts';
import { usarElPeriodoDeLasCifras } from '../ganchos/usarElPeriodoDeLasCifras.ts';

/**
 * «Cómo va» · las cifras con flecha de cada app (mejoras antes de M8, V, punto 2).
 *
 * «Flechas y gráficas pequeñas también en Almacén, Servicio y Equipo.» Son las
 * tarjetas del Panel —la misma pieza, de `@estook/ui`— con las cifras de cada app,
 * y lo que decidió Richi el 23 de septiembre de 2026:
 *
 *   · **En la primera pantalla de cada app**, debajo de lo urgente. Lo que hay que
 *     atender va antes que cualquier cifra (Evolución, capítulo 5), y el punto 3
 *     —cada app abre con su resumen— se apoya en esto sin moverlo.
 *   · **Siempre las mismas** (`LAS_CIFRAS_DE`), y cada persona ve las que su rol le
 *     deja. Elegir y colocar las suyas es del Panel.
 *
 * Una fila de tarjetas pequeñas, dos por fila en el móvil y cuatro en una pantalla
 * ancha, y **cada tarjeta entera lleva a su detalle**. Sin ninguna cifra que ver,
 * no se pinta nada: un título sobre una fila vacía es una promesa rota.
 */
export function CifrasDeLaApp({
  app,
  clase,
}: {
  readonly app: AppConCifras;
  /** Para colocarla en la rejilla de la pantalla: en «Hoy» va a todo lo ancho. */
  readonly clase?: string;
}) {
  const { permisos, yo } = usarSesion();
  const [dias, setDias] = usarElPeriodoDeLasCifras();

  const cifras = LAS_CIFRAS_DE[app].filter((indicador) =>
    puedeTenerElIndicador((permiso) => puedeVer(permisos, permiso), indicador),
  );
  if (yo?.local === null || yo?.local === undefined || cifras.length === 0) return null;

  const acento = appPorId(app)?.acento ?? 'var(--color-naranja)';

  return (
    <section
      aria-labelledby={`cifras-de-${app}`}
      data-cifras-de={app}
      className={clases('flex flex-col gap-e3', clase)}
    >
      <div className="flex flex-wrap items-center justify-between gap-e3">
        <h2 id={`cifras-de-${app}`} className="text-seccion font-semibold">
          Cómo va
        </h2>
        <ElegirPeriodo periodo={dias} alElegir={setDias} etiqueta="Cómo va, de cuántos días" />
      </div>
      <div className="grid grid-cols-2 gap-e3 xl:grid-cols-4">
        {cifras.map((indicador) => (
          <UnaCifra key={indicador} indicador={indicador} dias={dias} acento={acento} />
        ))}
      </div>
    </section>
  );
}

function UnaCifra({
  indicador,
  dias,
  acento,
}: {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly acento: string;
}) {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const { datos, fallo } = usarElIndicador(indicador, dias);

  // No se enlaza a la pantalla en la que ya se está: las cifras de Servicio viven
  // en el Cierre, y llevar al Cierre desde el Cierre es un toque que no hace nada.
  const destino = DONDE_SE_MIRA[indicador];
  const llevaAOtroSitio = destino !== null && !pathname.startsWith(destino);

  return (
    <div data-cifra={indicador}>
      <TarjetaDeIndicador
        indicador={indicador}
        dias={dias}
        datos={datos}
        fallo={fallo}
        tamano="chico"
        acento={acento}
        sinPeriodoEnElTitulo
        enlazada
        {...(llevaAOtroSitio
          ? {
              alVer: () => {
                navegar(destino);
              },
            }
          : {})}
      />
    </div>
  );
}
