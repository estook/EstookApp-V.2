import { useState, type ReactNode } from 'react';
import { Aviso, Boton, Cargando, EstadoVacio, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { EnlaceAEstook } from '../sesion/LaPuerta.tsx';
import { DIRECCION_DE_ESTOOK } from '../datos/cliente.ts';
import { FalloDeLaSala, usarAcciones, usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano, ElPlano as ElPlanoDeLaApi, MesaDelPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { irALaMesa } from '../navegar.ts';
import { AbrirMesa } from './AbrirMesa.tsx';
import { OpcionesDeLaMesa } from '../mesa/OpcionesDeLaMesa.tsx';
import { MesaEnElPlano, TarjetaSinMesa } from './MesaEnElPlano.tsx';
import type { ErrorDeLaApi } from '@estook/cliente-api';

/**
 * El plano (0106, «Main»): las zonas, cada mesa con cómo va, y arriba lo que toca
 * marchar, con su botón. Tocar una mesa libre la abre; una ocupada, sus opciones.
 *
 * En la tablet, el plano como está dibujado en Ajustes › Sala; en el móvil, las mesas en
 * una lista, que en una pantalla de diez centímetros un plano no se toca bien.
 */

const BARRA = 'barra';

export function ElPlano() {
  const { yo } = usarSesion();
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  const ejecutar = usarAcciones();
  const [zonaElegida, setZonaElegida] = useState<string | null>(null);
  const [soloMias, setSoloMias] = useState(false);
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
  const zonas = datos.zonas.filter((z) => z.mesas.length > 0);
  const zona =
    zonaElegida === BARRA
      ? BARRA
      : (zonas.find((z) => z.id === zonaElegida)?.id ?? zonas[0]?.id ?? BARRA);
  const deLaZona = zonas.find((z) => z.id === zona);
  const filtrar = (m: MesaDelPlano) => !soloMias || m.cuenta?.esMia === true;
  const abiertas = [
    ...datos.zonas.flatMap((z) => z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta]))),
    ...datos.sinMesa,
  ];
  const cuantas = abiertas.length;
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
      <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e3 md:px-e5">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-seccion font-bold">{yo.local?.nombre ?? 'La sala'}</h1>
          <span className="text-secundario text-texto-suave">Estook TPV · la sala</span>
        </div>
        <nav
          aria-label="Zonas"
          className="flex max-w-full gap-e1 overflow-x-auto rounded-redondo bg-fondo p-e1 md:ml-e4"
        >
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
        <button
          type="button"
          aria-pressed={soloMias}
          onClick={() => {
            setSoloMias(!soloMias);
          }}
          className={[
            'flex min-h-toque items-center gap-e2 rounded-redondo border px-e4 font-medium',
            soloMias
              ? 'border-app-servicio bg-app-servicio text-white'
              : 'border-borde bg-superficie text-texto',
          ].join(' ')}
        >
          Mis mesas
        </button>
        <div className="flex-1" />
        {/* Quien está dentro, y por dónde se vuelve a Estook (cambiar de local, salir). */}
        <a
          href={DIRECCION_DE_ESTOOK}
          aria-label={`${yo.nombre}: volver a Estook`}
          className="flex min-h-toque items-center gap-e2 rounded-redondo bg-fondo py-e1 pl-e1 pr-e4 font-semibold"
        >
          <span className="flex size-8 items-center justify-center rounded-redondo bg-app-servicio text-etiqueta text-white">
            {iniciales(yo.nombre)}
          </span>
          {yo.nombre}
        </a>
      </header>

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
          <SinPlano />
        ) : (
          <>
            {/* La tablet: el plano como se dibujó. */}
            <div className="relative hidden aspect-[16/10] w-full rounded-mayor bg-superficie shadow-s2 md:block">
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
            {/* El móvil: en lista. */}
            <div className="grid grid-cols-2 gap-e3 sm:grid-cols-3 md:hidden">
              {deLaZona.mesas.filter(filtrar).map((m) => (
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
}: {
  readonly puesto: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesto}
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

function SinPlano() {
  return (
    <div className="rounded-mayor bg-superficie">
      <EstadoVacio
        titulo="Tu sala aún no tiene mesas"
        frase="Dibújalas una vez en Estook, en Ajustes › Sala, y saldrán aquí. Mientras, puedes pedir en «Barra y llevar»."
        dibujo="local"
        accion={<EnlaceAEstook texto="Ir a Estook" />}
      />
    </div>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return (partes[0] ?? '').slice(0, 2).toUpperCase();
  return partes
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}
