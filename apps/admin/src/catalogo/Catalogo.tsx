import { useEffect, useState } from 'react';
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
  const [oscuro, setOscuro] = useState(false);

  // ── Verlo en oscuro (entrega V) ──────────────────────────────────────────
  //
  // El admin no elige tema: solo la app lo hace, y lo guarda en el aparato. Pero
  // las piezas de aquí son las de la app, y **se tienen que poder mirar en los dos
  // temas**, que es la mitad del repaso del oscuro. Así que esto pone el tema en
  // la página mientras se mira el catálogo, sin guardarlo en ningún sitio —la app
  // comparte el almacén del navegador y no se le puede cambiar el suyo desde
  // aquí—, y al salir deja la página como estaba.
  useEffect(() => {
    const pagina = document.documentElement;
    const antes = pagina.dataset['tema'];
    pagina.dataset['tema'] = oscuro ? 'oscuro' : 'claro';
    return () => {
      if (antes === undefined) delete pagina.dataset['tema'];
      else pagina.dataset['tema'] = antes;
    };
  }, [oscuro]);

  return (
    <div className="min-h-dvh bg-fondo">
      <header className="sticky top-0 z-40 border-b border-borde bg-superficie pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[64rem] flex-wrap items-center gap-x-e4 gap-y-e2 px-e4 py-e3">
          <Logo alto={26} />
          {/* Con un mínimo de ancho: en un móvil de 320 px el selector de al lado le
              dejaba cero, y el título desaparecía. Así, el que baja es el selector. */}
          <div className="min-w-[10rem] flex-1">
            <h1 className="text-seccion font-semibold">Sistema de diseño</h1>
            <p className="text-secundario text-texto-suave">
              Cada componente de la Parte B, pintado en sus estados
            </p>
          </div>
          <div
            role="group"
            aria-label="Tema del catálogo"
            className="flex shrink-0 rounded-medio border border-borde p-[2px]"
          >
            {[
              { texto: 'Claro', esOscuro: false },
              { texto: 'Oscuro', esOscuro: true },
            ].map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                aria-pressed={oscuro === opcion.esOscuro}
                onClick={() => {
                  setOscuro(opcion.esOscuro);
                }}
                className={[
                  'min-h-toque rounded-chico px-e3 text-secundario font-medium',
                  oscuro === opcion.esOscuro
                    ? 'bg-texto text-superficie'
                    : 'text-texto-suave hover:text-texto',
                ].join(' ')}
              >
                {opcion.texto}
              </button>
            ))}
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
        {/* Las piezas de la familia, juntas: es lo que fotografían las capturas
            (entrega V). Lo de debajo lleva la sesión, que cambia en cada visita. */}
        <div data-familia={actual.id} className="flex flex-col gap-e5">
          <actual.Pieza />
        </div>

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
