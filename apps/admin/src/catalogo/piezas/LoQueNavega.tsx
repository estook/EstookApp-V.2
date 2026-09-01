import { useState } from 'react';
import { APPS, Migas, RuedaDeApps, Tarjeta, clases } from '@estook/ui';
import { Fila, Pieza } from '../Pieza.tsx';

/**
 * Lo que sirve para moverse: las migas, la rueda y las fichas de color.
 *
 * La rueda se puede abrir aquí con las ocho apps, que es como no se ve nunca en
 * la aplicación salvo siendo gerente. Sirve para mirarla de cerca: los sectores,
 * el reparto, el arrastre desde el centro y las flechas del teclado.
 */
export function LoQueNavega() {
  const [rueda, setRueda] = useState(false);

  return (
    <>
      <Pieza
        nombre="Migas"
        cuando="Máximo tres niveles: app → vista → ficha. El tipo lo obliga, así que un cuarto nivel no compila. En móvil se convierten en una flecha de volver."
      >
        <div className="flex flex-col gap-e3">
          <Migas camino={[{ nombre: 'Panel' }]} />
          <Migas camino={[{ nombre: 'Panel', ir: () => undefined }, { nombre: 'Inventario' }]} />
          <Migas
            camino={[
              { nombre: 'Panel', ir: () => undefined },
              { nombre: 'Inventario', ir: () => undefined },
              { nombre: 'Tomate pera' },
            ]}
          />
        </div>
      </Pieza>

      <Pieza
        nombre="RuedaDeApps"
        cuando="Se pulsa un sector, o se mantiene el centro y se arrastra hacia él. Con teclado: flechas y Enter. Con «reducir movimiento» puesto, es una rejilla con la misma información."
      >
        <Fila>
          <button
            type="button"
            onClick={() => {
              setRueda(true);
            }}
            className="inline-flex min-h-toque items-center rounded-medio border border-borde-fuerte bg-superficie px-e4 text-cuerpo hover:bg-fondo"
          >
            Abrir la rueda con las ocho
          </button>
          <p className="self-center text-secundario text-texto-suave">
            Prueba el arrastre desde el centro, y las flechas
          </p>
        </Fila>

        <RuedaDeApps
          abierta={rueda}
          alCerrar={() => {
            setRueda(false);
          }}
          apps={APPS}
          alElegir={() => {
            setRueda(false);
          }}
          pendientes={{ inventario: 3, servicio: 12, cuaderno: 1 }}
        />
      </Pieza>

      <Pieza
        nombre="Los acentos de las ocho apps"
        cuando="Cada app con su icono y su acento. El acento va en el icono, en la línea de la cabecera y en el sector de la rueda; el fondo y los botones no cambian."
      >
        <ul className="grid gap-e2 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map((app) => (
            <li key={app.id}>
              <Tarjeta acento={app.acento}>
                <span className="flex items-center gap-e2">
                  <span style={{ color: app.acento }}>
                    <app.icono size={22} />
                  </span>
                  <span className="text-cuerpo font-semibold">{app.nombre}</span>
                </span>
                <p className="mt-e1 text-secundario text-texto-suave">{app.queHace}</p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      </Pieza>

      <Pieza
        nombre="Las fichas de B1"
        cuando="Los colores, el espaciado y los radios. Si un valor no está aquí, no existe: no se escribe un color a mano en ninguna pantalla."
      >
        <div className="flex flex-col gap-e5">
          <Muestras
            titulo="Marca y superficie"
            fichas={[
              'charcoal',
              'naranja',
              'naranja-suave',
              'fondo',
              'superficie',
              'borde',
              'borde-fuerte',
            ]}
          />
          <Muestras titulo="Texto" fichas={['texto', 'texto-suave', 'texto-tenue']} />
          <Muestras titulo="Estado" fichas={['bien', 'atencion', 'mal', 'info']} />

          <div>
            <p className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">
              Espaciado · escala de 4
            </p>
            <div className="flex flex-wrap items-end gap-e3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="flex flex-col items-center gap-e1">
                  <span
                    aria-hidden
                    className="block bg-naranja"
                    style={{ width: `var(--spacing-e${n})`, height: `var(--spacing-e${n})` }}
                  />
                  <span className="text-etiqueta text-texto-suave">e{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">Radios</p>
            <div className="flex flex-wrap gap-e3">
              {['chico', 'medio', 'grande', 'mayor', 'redondo'].map((r) => (
                <div key={r} className="flex flex-col items-center gap-e1">
                  <span
                    aria-hidden
                    className="block size-[52px] border border-borde-fuerte bg-superficie"
                    style={{ borderRadius: `var(--radius-${r})` }}
                  />
                  <span className="text-etiqueta text-texto-suave">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Pieza>
    </>
  );
}

function Muestras({ titulo, fichas }: { readonly titulo: string; readonly fichas: string[] }) {
  return (
    <div>
      <p className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">{titulo}</p>
      <div className="flex flex-wrap gap-e3">
        {fichas.map((ficha) => (
          <div key={ficha} className="flex w-[8.5rem] flex-col gap-e1">
            <span
              aria-hidden
              className={clases('block h-[44px] rounded-medio border border-borde')}
              style={{ background: `var(--color-${ficha})` }}
            />
            <span className="text-etiqueta text-texto-suave">--{ficha}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
