import { useState, type ReactNode } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CosaEnElPlano } from './dibujo.tsx';
import { Aviso, Boton, Cargando, EstadoVacio, ErrorEnCristiano } from '@estook/ui';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { FalloDeLaSala, usarAcciones, usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano, ElPlano as ElPlanoDeLaApi, MesaDelPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { irA, irALaMesa } from '../navegar.ts';
import { AbrirMesa } from './AbrirMesa.tsx';
import { OpcionesDeLaMesa } from '../mesa/OpcionesDeLaMesa.tsx';
import { MesaEnElPlano, TarjetaSinMesa } from './MesaEnElPlano.tsx';
import type { ErrorDeLaApi } from '@estook/cliente-api';

/**
 * **Las mesas en servicio** (T2 · La sala, maqueta 8; Anexo 11.8): las salas en pestañas,
 * **todas las mesas a la vista de todos**, cada una con cómo va y las iniciales de su
 * camarero, y arriba lo que toca marchar con su botón. Tocar una mesa libre la abre; una
 * ocupada, sus opciones.
 *
 * **Todas · Mías**, a un toque: el aparato recuerda el último, y el móvil de un camarero
 * empieza en «Mías». En la tablet y en la caja, **el plano como se dibujó** en el TPV, con
 * su barra y sus paredes; en el móvil, **una cuadrícula de tres en fila**, en el orden de
 * sus nombres: un plano dibujado no cabe en una mano.
 */

const BARRA = 'barra';
/** Sin sala dibujada: quien puede dibujarla empieza ahí, con «Dibujar la sala». */
const SIN_SALA = 'sin_sala';

/** Lo que recuerda el aparato del filtro: en su navegador, aparte de todo lo demás. */
const CLAVE_DEL_FILTRO = 'estook.tpv.mias';

function leerElFiltro(esPersonal: boolean): boolean {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DEL_FILTRO);
    if (guardado === null) return esPersonal;
    return guardado === 'si';
  } catch {
    return esPersonal;
  }
}

function guardarElFiltro(soloMias: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_DEL_FILTRO, soloMias ? 'si' : 'no');
  } catch {
    // En una ventana privada no se guarda: el filtro dura lo que la pantalla.
  }
}

/** «1», «2», «10»: en el orden en que se cuentan, no en el de las letras. */
function porSuNombre(a: { readonly nombre: string }, b: { readonly nombre: string }): number {
  return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
}

export function ElPlano() {
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  const ejecutar = usarAcciones();
  const { aparato } = usarSesion();
  const [zonaElegida, setZonaElegida] = useState<string | null>(null);
  const [soloMias, setSoloMiasEnMemoria] = useState(() => leerElFiltro(aparato.esPersonal));
  const setSoloMias = (mias: boolean) => {
    setSoloMiasEnMemoria(mias);
    guardarElFiltro(mias);
  };
  const [abriendo, setAbriendo] = useState<MesaDelPlano | 'barra' | null>(null);
  const [opciones, setOpciones] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  if (plano.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="el plano" />
      </main>
    );
  }
  if (plano.data === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo p-e5">
        {plano.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={plano.error.error} />
        ) : (
          <Aviso tono="mal" titulo="No llegamos al plano">
            Puede ser la conexión. Se vuelve a probar solo.
          </Aviso>
        )}
      </main>
    );
  }

  const datos = plano.data;
  const zonas = datos.zonas.filter((z) => z.mesas.length > 0 || z.cosas.length > 0);
  const zona =
    zonaElegida === BARRA
      ? BARRA
      : (zonas.find((z) => z.id === zonaElegida)?.id ??
        zonas[0]?.id ??
        (datos.puedeDibujar ? SIN_SALA : BARRA));
  const deLaZona = zonas.find((z) => z.id === zona);
  const filtrar = (m: MesaDelPlano) => !soloMias || m.cuenta?.esMia === true;
  const abiertas = [
    ...datos.zonas.flatMap((z) => z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta]))),
    ...datos.sinMesa,
  ];
  const cuantas = abiertas.length;
  const mias = abiertas.filter((c) => c.esMia).length;
  const comensales = abiertas.reduce((n, c) => n + (c.personas ?? 0), 0);
  const laCuenta = (cuentaId: string): CuentaEnElPlano | undefined =>
    abiertas.find((c) => c.cuentaId === cuentaId);

  async function marchar(cuentaId: string, pase: number) {
    setFallo(null);
    const hecho = await ejecutar('marchar', { cuenta_id: cuentaId, pase });
    if (!hecho.ok) setFallo(hecho.error);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba>
        <nav
          aria-label="Zonas"
          className="flex max-w-full gap-e1 overflow-x-auto rounded-redondo bg-fondo p-e1 md:ml-e4"
        >
          {zonas.length === 0 && datos.puedeDibujar && (
            <BotonDeZona
              puesto={zona === SIN_SALA}
              onClick={() => {
                setZonaElegida(null);
              }}
            >
              Sala
            </BotonDeZona>
          )}
          {zonas.map((z) => (
            <BotonDeZona
              key={z.id}
              puesto={zona === z.id}
              onClick={() => {
                setZonaElegida(z.id);
              }}
            >
              {z.nombre}
            </BotonDeZona>
          ))}
          <BotonDeZona
            puesto={zona === BARRA}
            onClick={() => {
              setZonaElegida(BARRA);
            }}
          >
            Barra y llevar{datos.sinMesa.length > 0 ? ` · ${datos.sinMesa.length}` : ''}
          </BotonDeZona>
        </nav>
        <div
          role="radiogroup"
          aria-label="Qué mesas"
          className="flex gap-e1 rounded-redondo bg-fondo p-e1"
        >
          <BotonDeZona
            puesto={!soloMias}
            radio
            onClick={() => {
              setSoloMias(false);
            }}
          >
            Todas
          </BotonDeZona>
          <BotonDeZona
            puesto={soloMias}
            radio
            onClick={() => {
              setSoloMias(true);
            }}
          >
            {mias > 0 ? `Mías · ${String(mias)}` : 'Mías'}
          </BotonDeZona>
        </div>
        {datos.puedeDibujar && (
          <button
            type="button"
            onClick={() => {
              irA('sala/editar');
            }}
            className="hidden min-h-toque items-center gap-e2 rounded-redondo border-2 border-borde px-e4 font-semibold md:flex"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
            </svg>
            Editar sala
          </button>
        )}
      </LaBarraDeArriba>

      {datos.tocaMarchar.map((t) => (
        <div
          key={t.cuentaId}
          className="mx-e4 mt-e3 flex flex-wrap items-center gap-e3 rounded-grande bg-info-suave py-e2 pl-e4 pr-e2 md:mx-e5"
        >
          <span className="flex-1 font-bold text-info">
            {t.titulo} · ha salido todo el {elPase(t.salioEl)}
          </span>
          <Boton
            tono="principal"
            onClick={() => {
              void marchar(t.cuentaId, t.pase);
            }}
          >
            Marchar el {elPase(t.pase)}
          </Boton>
        </div>
      ))}
      {fallo !== null && (
        <div className="mx-e4 mt-e3 md:mx-e5">
          <ErrorEnCristiano error={fallo} />
        </div>
      )}

      <main className="mx-e4 mt-e3 flex-1 md:mx-e5">
        {zona === BARRA ? (
          <LaBarra
            cuentas={datos.sinMesa}
            alAbrir={() => {
              setAbriendo('barra');
            }}
            alTocar={(cuentaId) => {
              setOpciones(cuentaId);
            }}
          />
        ) : deLaZona === undefined ? (
          <SinPlano puedeDibujar={datos.puedeDibujar} />
        ) : (
          <>
            {/* La tablet y la caja: el plano como se dibujó, con su barra y sus paredes. */}
            <div className="relative hidden aspect-[16/10] w-full overflow-hidden rounded-mayor bg-superficie shadow-s2 md:block">
              {deLaZona.cosas.map((c) => (
                <CosaEnElPlano key={c.id} cosa={c} />
              ))}
              {deLaZona.mesas.filter(filtrar).map((m) => (
                <MesaEnElPlano
                  key={m.id}
                  mesa={m}
                  enElPlano
                  alTocar={() => {
                    if (m.cuenta === null) setAbriendo(m);
                    else setOpciones(m.cuenta.cuentaId);
                  }}
                />
              ))}
            </div>
            {/* El móvil: de tres en fila, en el orden de sus nombres. */}
            <div className="grid grid-cols-3 gap-e2 md:hidden">
              {[...deLaZona.mesas]
                .sort(porSuNombre)
                .filter(filtrar)
                .map((m) => (
                  <MesaEnElPlano
                    key={m.id}
                    mesa={m}
                    enElPlano={false}
                    alTocar={() => {
                      if (m.cuenta === null) setAbriendo(m);
                      else setOpciones(m.cuenta.cuentaId);
                    }}
                  />
                ))}
            </div>
          </>
        )}
      </main>

      <footer className="flex flex-wrap items-center gap-e3 px-e4 py-e3 text-secundario text-texto-suave md:px-e5">
        <span>
          {cuantas === 1 ? '1 mesa abierta' : `${cuantas} mesas abiertas`}
          {comensales > 0 ? ` · ${comensales} personas` : ''}
        </span>
        <div className="flex-1" />
        <span
          className={[
            'rounded-redondo px-e3 py-e1 font-semibold',
            conectado ? 'bg-bien-suave text-bien' : 'bg-superficie text-texto-suave',
          ].join(' ')}
        >
          {conectado ? 'Cocina y sala, al segundo' : 'Al día cada pocos segundos'}
        </span>
      </footer>

      {abriendo !== null && (
        <AbrirMesa
          mesa={abriendo === 'barra' ? null : abriendo}
          alCerrar={() => {
            setAbriendo(null);
          }}
        />
      )}
      {opciones !== null && laCuenta(opciones) !== undefined && (
        <OpcionesDeLaMesa
          cuenta={laCuenta(opciones) as CuentaEnElPlano}
          plano={datos}
          alCerrar={() => {
            setOpciones(null);
          }}
          alAbrir={() => {
            irALaMesa(opciones);
          }}
        />
      )}
    </div>
  );
}

function BotonDeZona({
  puesto,
  onClick,
  children,
  radio = false,
}: {
  readonly puesto: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly radio?: boolean;
}) {
  return (
    <button
      type="button"
      {...(radio ? { role: 'radio', 'aria-checked': puesto } : { 'aria-pressed': puesto })}
      onClick={onClick}
      className={[
        'min-h-toque shrink-0 rounded-redondo px-e4 font-semibold',
        puesto ? 'bg-charcoal text-white' : 'bg-transparent text-texto',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function LaBarra({
  cuentas,
  alAbrir,
  alTocar,
}: {
  readonly cuentas: ElPlanoDeLaApi['sinMesa'];
  readonly alAbrir: () => void;
  readonly alTocar: (cuentaId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-e3">
      <div className="grid grid-cols-2 gap-e3 sm:grid-cols-3 lg:grid-cols-5">
        {cuentas.map((c) => (
          <TarjetaSinMesa
            key={c.cuentaId}
            cuenta={c}
            alTocar={() => {
              alTocar(c.cuentaId);
            }}
          />
        ))}
        <button
          type="button"
          onClick={alAbrir}
          className="flex min-h-[7.5rem] flex-col items-start justify-center gap-e1 rounded-mayor border-2 border-dashed border-borde-fuerte bg-superficie p-e4 text-left"
        >
          <span className="text-seccion font-bold">+ En barra o para llevar</span>
          <span className="text-secundario text-texto-suave">
            Sin mesa, con un nombre si quieres
          </span>
        </button>
      </div>
    </div>
  );
}

function SinPlano({ puedeDibujar }: { readonly puedeDibujar: boolean }) {
  return (
    <div className="rounded-mayor bg-superficie">
      {puedeDibujar ? (
        <EstadoVacio
          titulo="Tu sala aún no tiene mesas"
          frase="Dibújala aquí mismo, a ojo: empieza con una plantilla de tu tipo de local o con la sala vacía. Mientras, puedes pedir en «Barra y llevar»."
          dibujo="local"
          accion={
            <Boton
              tono="principal"
              onClick={() => {
                irA('sala/editar');
              }}
            >
              Dibujar la sala
            </Boton>
          }
        />
      ) : (
        <EstadoVacio
          titulo="Tu sala aún no tiene mesas"
          frase="La dibuja quien lleva el local, en la caja o en la tablet: Editar sala. Mientras, puedes pedir en «Barra y llevar»."
          dibujo="local"
          sinAccionPorque="La sala la dibuja quien lleva el local."
        />
      )}
    </div>
  );
}
