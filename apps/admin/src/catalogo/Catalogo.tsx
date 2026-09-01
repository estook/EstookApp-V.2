import { useState } from 'react';
import { estadoDeLasBanderas } from '@estook/utiles';
import type { Entorno } from '@estook/utiles';
import { Logo, Tarjeta } from '@estook/ui';
import { LasCapas } from './piezas/LasCapas.tsx';
import { LosAvisos } from './piezas/LosAvisos.tsx';
import { LosBotones } from './piezas/LosBotones.tsx';
import { LosCampos } from './piezas/LosCampos.tsx';
import { LosDatos } from './piezas/LosDatos.tsx';
import { LoQueNavega } from './piezas/LoQueNavega.tsx';

/**
 * El catálogo del sistema de diseño (M3).
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * B4 dice que los componentes «se construyen una vez en `packages/ui` y nadie
 * escribe uno nuevo sin justificarlo». Al cerrar M3, **once de los veinte no se
 * habían pintado ni una sola vez**: estaban escritos y tipados, pero ninguna
 * pantalla los usaba todavía, porque las suyas llegan de M6 en adelante.
 *
 * Un componente que no se ha renderizado nunca no está terminado: está escrito.
 * Y M3 ya enseñó cinco veces que los fallos de esta capa **no los ve el
 * compilador** —Montserrat que no se aplicaba, una clase que Tailwind entendía al
 * revés, un campo que no sabía leer su propio separador de miles—. Todos se
 * vieron pintando.
 *
 * Así que aquí se pinta cada uno, en sus estados. Sirve para tres cosas:
 *
 *   1. **Probar que renderizan.** Una prueba de extremo a extremo abre esta
 *      página y exige cero errores de consola y cero desbordes a 375 px.
 *   2. **Ser la referencia.** Cuando M6 necesite una tabla, la mira aquí en vez
 *      de inventarse una.
 *   3. **Que se note lo que falta.** Un hueco en esta página es un componente
 *      que nadie ha mirado.
 *
 * ── Y por qué en `admin` ─────────────────────────────────────────────────────
 *
 * Porque A4 lo llama «panel interno» y esto es una herramienta de dentro. En la
 * aplicación estorbaría; aquí es justo lo que toca, y de paso `admin` deja de ser
 * un marcador de sitio.
 */
export interface CatalogoProps {
  readonly entorno: Entorno;
  readonly sesionId: string;
}

const SECCIONES = [
  { id: 'botones', nombre: 'Botones', Pieza: LosBotones },
  { id: 'campos', nombre: 'Campos', Pieza: LosCampos },
  { id: 'datos', nombre: 'Datos', Pieza: LosDatos },
  { id: 'avisos', nombre: 'Avisos y vacíos', Pieza: LosAvisos },
  { id: 'capas', nombre: 'Capas', Pieza: LasCapas },
  { id: 'navegar', nombre: 'Navegar', Pieza: LoQueNavega },
] as const;

export function Catalogo({ entorno, sesionId }: CatalogoProps) {
  const [seccion, setSeccion] = useState<string>(SECCIONES[0].id);
  const actual = SECCIONES.find((s) => s.id === seccion) ?? SECCIONES[0];

  return (
    <div className="min-h-dvh bg-fondo">
      <header className="sticky top-0 z-40 border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-[64rem] items-center gap-e4 px-e4 py-e3">
          <Logo alto={26} />
          <div className="min-w-0">
            <h1 className="text-seccion font-semibold">Sistema de diseño</h1>
            <p className="text-secundario text-texto-suave">
              Cada componente de la Parte B, pintado en sus estados
            </p>
          </div>
        </div>

        <nav
          aria-label="Familias de componentes"
          className="mx-auto flex max-w-[64rem] gap-e1 overflow-x-auto px-e4 pb-e2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSeccion(s.id);
              }}
              aria-current={s.id === seccion ? 'page' : undefined}
              className={[
                'inline-flex min-h-toque shrink-0 items-center rounded-medio px-e3 text-cuerpo',
                s.id === seccion
                  ? 'bg-naranja-suave text-texto'
                  : 'text-texto-suave hover:bg-fondo hover:text-texto',
              ].join(' ')}
            >
              {s.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-[64rem] flex-col gap-e5 px-e4 py-e5">
        <actual.Pieza />

        <Tarjeta titulo="Cómo ha arrancado" origen="Comprobación de M0, que sigue en pie">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-e4 gap-y-e2 text-secundario">
            <dt className="text-texto-suave">Aplicacion</dt>
            <dd>admin</dd>
            <dt className="text-texto-suave">Entorno</dt>
            <dd>{entorno}</dd>
            <dt className="text-texto-suave">Sesion</dt>
            <dd className="break-all">{sesionId}</dd>
            <dt className="text-texto-suave">Base de datos</dt>
            <dd>{import.meta.env['VITE_SUPABASE_URL'] ? 'configurada' : 'sin configurar'}</dd>
            <dt className="text-texto-suave">Banderas</dt>
            <dd>
              {Object.entries(estadoDeLasBanderas(entorno, import.meta.env))
                .map(([nombre, encendida]) => `${nombre}: ${encendida ? 'si' : 'no'}`)
                .join(' · ')}
            </dd>
          </dl>
        </Tarjeta>
      </main>
    </div>
  );
}
