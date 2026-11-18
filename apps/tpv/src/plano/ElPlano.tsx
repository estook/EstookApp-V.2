import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CosaEnElPlano } from './dibujo.tsx';
import { Aviso, Boton, Cargando, EstadoVacio, ErrorEnCristiano, Hoja, usarMedia } from '@estook/ui';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import {
  FalloDeLaSala,
  usarAcciones,
  usarAlSegundo,
  usarElPlano,
  usarLaCarta,
} from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano, ElPlano as ElPlanoDeLaApi, MesaDelPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { escucharLaDireccion, irA, irALaMesa, laDireccion } from '../navegar.ts';
import { LaColumnaAhora, cuantoPideAhora } from './LaColumnaAhora.tsx';
import { LOS_COLORES_DE_LA_SALA } from './losColores.ts';
import { AbrirMesa } from './AbrirMesa.tsx';
import { LaFranjaSinInternet } from '../sinInternet/LaFranjaSinInternet.tsx';
import { LaFranjaDeLaCaja } from '../sinInternet/LaFranjaDeLaCaja.tsx';
import { DescargaLaCajaParaWindows } from './LasImpresorasAvisan.tsx';
import { LaVentanaDeLaMesa } from '../mesa/OpcionesDeLaMesa.tsx';
import { MesaEnElPlano, TarjetaSinMesa } from './MesaEnElPlano.tsx';
import { minutosCortos } from '../logica/comoVaLaMesa.ts';
import { IconoAvisos, IconoCuenta, IconoPersona } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ElAvisoDeWindows } from '../sinInternet/ElAvisoDeWindows.tsx';
import { ponerSoloMias, usarSoloMias } from '../ganchos/usarElFiltroMias.ts';
import { LaBarraDeAbajo } from '../inicio/LaBarraDeAbajo.tsx';

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
 *
 * **Es la entrada del TPV** (la entrada nueva, 26-oct), y **el plano cabe entero**: se encoge o
 * se estira hasta llenar lo que queda de pantalla, sin barras de desplazamiento. «Editar sala»
 * está en el engranaje, en «La sala y las mesas».
 */

const BARRA = 'barra';
/** Sin sala dibujada: quien puede dibujarla empieza ahí, con «Dibujar la sala». */
const SIN_SALA = 'sin_sala';

/** «1», «2», «10»: en el orden en que se cuentan, no en el de las letras. */
function porSuNombre(a: { readonly nombre: string }, b: { readonly nombre: string }): number {
  return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
}

export function ElPlano() {
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  // La botonera se lee ya desde el plano, y se guarda: **sin internet se pide igual** aunque
  // aún no se hubiera abierto ninguna mesa en este aparato (T5 · 2 · 1).
  usarLaCarta();
  const ejecutar = usarAcciones();
  const { aparato, yo } = usarSesion();
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  // En el PC, la columna «Ahora» a la derecha y la mesa tocada dentro de ella (0148).
  const ancho = usarMedia('(min-width: 1280px)');
  const [conAhora, setConAhora] = useState(false);
  const [zonaElegida, setZonaElegida] = useState<string | null>(null);
  const soloMias = usarSoloMias(aparato.esPersonal);
  const [abriendo, setAbriendo] = useState<MesaDelPlano | 'barra' | null>(null);
  const [opciones, setOpciones] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  if (plano.isLoading) {
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo">
        <Cargando que="el plano" />
      </main>
    );
  }
  if (plano.data === undefined) {
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5">
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
  // «Para llevar», arriba, es la barra y lo de llevar (`#/llevar`, 0148).
  const zona =
    direccion === 'llevar'
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
    const hecho = await ejecutar('marchar', { cuenta_id: cuentaId, pase }, undefined, {
      que: `${laCuenta(cuentaId)?.titulo ?? 'Una mesa'} · marchar el ${pase}.º`,
      cuentaId,
      respuesta: { pase },
    });
    if (!hecho.ok) setFallo(hecho.error);
  }

  const filtradas = abiertas.filter((c) => !soloMias || c.esMia);
  const esEncargado = puedeEditar(yo.permisos, 'accion.quitar_de_cocina');
  const pideAhora = cuantoPideAhora(datos, filtradas, aparato.funcion === 'caja', esEncargado);
  const laColumna = (
    <LaColumnaAhora
      plano={datos}
      abiertas={filtradas}
      alMarchar={(cuentaId, pase) => {
        void marchar(cuentaId, pase);
      }}
      alAbrir={(cuentaId) => {
        setConAhora(false);
        setOpciones(cuentaId);
      }}
    />
  );

  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto md:h-pantalla md:min-h-0">
      <LaBarraDeArriba conBarraDeAbajo />

      <LaFranjaSinInternet />
      <LaFranjaDeLaCaja />
      <ElAvisoDeWindows />
      <DescargaLaCajaParaWindows />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* En el móvil, lo que pide atención sigue en franjas encima de las mesas. */}
          <div className="md:hidden">
            <ParaCobrar
              cuentas={filtradas}
              alTocar={(cuentaId) => {
                setOpciones(cuentaId);
              }}
            />
            {datos.tocaMarchar.map((t) => (
              <div
                key={t.cuentaId}
                className="mx-e4 mt-e3 flex flex-wrap items-center gap-e3 rounded-grande bg-mesa-marchar py-e2 pl-e4 pr-e2 text-sobre-mesa-marchar"
              >
                <span className="flex-1 font-bold">
                  {t.titulo} · ha salido todo el {elPase(t.salioEl)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void marchar(t.cuentaId, t.pase);
                  }}
                  className="min-h-toque rounded-medio bg-sobre-mesa-libre/20 px-e4 font-bold"
                >
                  Marchar el {elPase(t.pase)}
                </button>
              </div>
            ))}
          </div>
          {fallo !== null && (
            <div className="mx-e4 mt-e3 md:mx-e5">
              <ErrorEnCristiano error={fallo} />
            </div>
          )}

          {/* Las zonas de la sala, «Mías» y, en la tablet, «Ahora». */}
          {zona !== BARRA && (
            <nav
              aria-label="Zonas"
              className="mx-e4 mt-e3 flex min-w-0 items-center gap-e2 overflow-x-auto md:mx-e5"
            >
              {zonas.length === 0 && datos.puedeDibujar && (
                <BotonDeZona
                  puesto
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
                  cuantas={z.mesas.filter((m) => m.cuenta !== null).length}
                  onClick={() => {
                    setZonaElegida(z.id);
                  }}
                >
                  {z.nombre}
                </BotonDeZona>
              ))}
              <div className="flex-1" />
              <BotonMias soloMias={soloMias} mias={mias} alCambiar={ponerSoloMias} />
              {!ancho && (
                <button
                  type="button"
                  onClick={() => {
                    setConAhora(true);
                  }}
                  className="flex min-h-toque shrink-0 items-center gap-e2 rounded-grande bg-naranja px-e3 font-bold text-sobre-naranja max-md:hidden"
                >
                  <IconoAvisos size={18} aria-hidden />
                  Ahora
                  {pideAhora > 0 && (
                    <span className="rounded-redondo bg-sobre-naranja px-e2 text-etiqueta text-naranja">
                      {pideAhora}
                    </span>
                  )}
                </button>
              )}
            </nav>
          )}

          <main className="mx-e4 mt-e3 flex flex-1 flex-col md:mx-e5 md:min-h-0 md:overflow-y-auto">
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
                {/* La tablet y la caja: el plano como se dibujó, con su barra, sus paredes y las
                    sillas, y entero: del ancho que quepa sin pasarse del alto (16 por 10). */}
                <div className="hidden min-h-0 flex-1 items-center justify-center [container-type:size] md:flex">
                  <div
                    aria-label="El plano"
                    className="relative aspect-[16/10] w-[min(100cqw,160cqh)] rounded-mayor border border-borde bg-superficie"
                    style={{
                      backgroundImage:
                        'radial-gradient(var(--color-borde) 1.2px, transparent 1.3px)',
                      backgroundSize: '22px 22px',
                    }}
                  >
                    {deLaZona.cosas.map((c) => (
                      <CosaEnElPlano key={c.id} cosa={c} />
                    ))}
                    {deLaZona.mesas.filter(filtrar).map((m) => (
                      <MesaEnElPlano
                        key={m.id}
                        mesa={m}
                        enElPlano
                        elegida={ancho && opciones !== null && m.cuenta?.cuentaId === opciones}
                        alTocar={() => {
                          if (m.cuenta === null) setAbriendo(m);
                          else setOpciones(m.cuenta.cuentaId);
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* El móvil: de dos en fila, en el orden de sus nombres, que se tocan con el pulgar. */}
                <div className="grid grid-cols-2 gap-e3 md:hidden">
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

          <footer className="flex flex-wrap items-center gap-e3 px-e4 py-e3 text-secundario text-texto-suave max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-e5">
            <span>
              {cuantas === 1 ? '1 mesa abierta' : `${cuantas} mesas abiertas`}
              {comensales > 0
                ? ` · ${comensales === 1 ? '1 comensal' : `${String(comensales)} comensales`}`
                : ''}
            </span>
            <div className="flex-1" />
            <LaLeyenda />
            <span
              className={[
                'rounded-redondo px-e3 py-e1 font-semibold',
                conectado ? 'bg-bien-suave text-bien' : 'bg-superficie text-texto-suave',
              ].join(' ')}
            >
              {conectado ? 'Cocina y sala, al segundo' : 'Al día cada pocos segundos'}
            </span>
          </footer>
        </div>

        {/* **En el PC, la columna de la derecha** (0148): «Ahora», o la mesa tocada. */}
        {ancho && (
          <aside
            aria-label={opciones === null ? 'Ahora' : 'La mesa'}
            className="flex w-[24rem] shrink-0 flex-col border-l border-borde bg-superficie"
          >
            {opciones !== null ? (
              <LaVentanaDeLaMesa
                key={opciones}
                cuenta={laCuenta(opciones)}
                plano={datos}
                enLinea
                alCerrar={() => {
                  setOpciones(null);
                }}
                alAbrir={() => {
                  irALaMesa(opciones);
                }}
              />
            ) : (
              <>
                <header className="flex items-center gap-e2 border-b border-borde px-e4 py-e3">
                  <h2 className="flex-1 text-pantalla font-bold">Ahora</h2>
                  <span className="rounded-redondo bg-fondo px-e3 py-e1 text-secundario font-semibold text-texto-suave">
                    {cuantas === 1 ? '1 abierta' : `${String(cuantas)} abiertas`}
                  </span>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{laColumna}</div>
              </>
            )}
          </aside>
        )}
      </div>

      {!ancho && (
        <Hoja
          abierta={conAhora}
          ajustada
          alCerrar={() => {
            setConAhora(false);
          }}
          titulo="Ahora"
        >
          {laColumna}
        </Hoja>
      )}

      <LaBarraDeAbajo />

      {abriendo !== null && (
        <AbrirMesa
          mesa={abriendo === 'barra' ? null : abriendo}
          alCerrar={() => {
            setAbriendo(null);
          }}
        />
      )}
      {opciones !== null && !ancho && (
        <LaVentanaDeLaMesa
          key={opciones}
          cuenta={laCuenta(opciones)}
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

/**
 * **Para cobrar** (0131; Richi, 5-nov: «avisar a los camareros de pendiente de pago»): las
 * mesas que comieron y llevan 15 minutos desde lo último, la que más lleva primero. Sin
 * sonido: un compañero, no un policía. Se toca y se abre la mesa.
 */
function ParaCobrar({
  cuentas,
  alTocar,
}: {
  readonly cuentas: readonly CuentaEnElPlano[];
  readonly alTocar: (cuentaId: string) => void;
}) {
  const paraCobrar = cuentas
    .filter((c) => c.comoVa === 'para_cobrar')
    .sort((a, b) => (b.minutosEnElEstado ?? 0) - (a.minutosEnElEstado ?? 0));
  if (paraCobrar.length === 0) return null;
  return (
    <section
      aria-label="Para cobrar"
      className="mx-e4 mt-e3 flex flex-wrap items-center gap-e2 rounded-grande bg-mesa-cuenta py-e2 pl-e3 pr-e2 text-sobre-mesa-cuenta md:mx-e5"
    >
      <span className="flex items-center gap-e1 font-bold">
        <IconoCuenta size={18} aria-hidden />
        Para cobrar
      </span>
      {paraCobrar.map((c) => (
        <button
          key={c.cuentaId}
          type="button"
          onClick={() => {
            alTocar(c.cuentaId);
          }}
          className="min-h-toque rounded-medio bg-sobre-mesa-libre/20 px-e3 font-bold"
        >
          {c.titulo} · {minutosCortos(c.minutosEnElEstado ?? 0)}
        </button>
      ))}
    </section>
  );
}

function BotonDeZona({
  puesto,
  cuantas,
  onClick,
  children,
}: {
  readonly puesto: boolean;
  /** Las mesas abiertas de la zona: se ve dónde hay jaleo sin entrar. */
  readonly cuantas?: number;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesto}
      onClick={onClick}
      className={[
        'flex min-h-toque shrink-0 items-center gap-e2 rounded-grande border px-e4 font-bold',
        puesto
          ? 'border-texto bg-texto text-superficie'
          : 'border-borde bg-superficie text-texto-suave',
      ].join(' ')}
    >
      {children}
      {cuantas !== undefined && (
        <span
          aria-label={cuantas === 1 ? '1 abierta' : `${String(cuantas)} abiertas`}
          className={[
            'min-w-6 rounded-redondo px-e1 text-center text-etiqueta',
            puesto ? 'bg-naranja text-sobre-naranja' : 'bg-fondo',
          ].join(' ')}
        >
          {cuantas}
        </span>
      )}
    </button>
  );
}

/** «Mías», un solo botón que se pulsa y se suelta (0131). Puesto, solo se ven las mías. */
function BotonMias({
  soloMias,
  mias,
  alCambiar,
}: {
  readonly soloMias: boolean;
  readonly mias: number;
  readonly alCambiar: (mias: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={soloMias}
      onClick={() => {
        alCambiar(!soloMias);
      }}
      className={[
        'flex min-h-toque shrink-0 items-center gap-e1 rounded-grande border px-e3 font-bold max-md:hidden',
        soloMias ? 'border-texto bg-texto text-superficie' : 'border-borde bg-superficie',
      ].join(' ')}
    >
      <IconoPersona size={16} aria-hidden />
      {mias > 0 ? `Mías · ${String(mias)}` : 'Mías'}
    </button>
  );
}

/** La leyenda de los colores, pequeña al pie del plano (0148). */
function LaLeyenda() {
  return (
    <ul
      aria-label="Los colores de las mesas"
      className="flex flex-wrap items-center gap-e3 max-md:hidden"
    >
      {LOS_COLORES_DE_LA_SALA.map((c) => (
        <li key={c.nombre} className="flex items-center gap-e1 font-semibold">
          <span aria-hidden className={['size-3 rounded-[4px]', c.fondo].join(' ')} />
          {c.nombre}
        </li>
      ))}
    </ul>
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
          frase="Dibújala aquí mismo, a ojo: empieza con una plantilla de tu tipo de local o con la sala vacía. Mientras, puedes pedir en «Para llevar»."
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
          frase="La dibuja quien lleva el local, en la caja o en la tablet: Editar sala. Mientras, puedes pedir en «Para llevar»."
          dibujo="local"
          sinAccionPorque="La sala la dibuja quien lleva el local."
        />
      )}
    </div>
  );
}
