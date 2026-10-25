import { useState, type ReactNode } from 'react';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import { irA, irALaMesa } from '../navegar.ts';
import { LaBarraDeArriba } from './LaBarraDeArriba.tsx';

/**
 * **El inicio de la caja** (maquetas 4 y 23; Anexo 11.5): lo primero que ve el primero que
 * entra cada día. **Solo sale lo que funciona**: las mesas, los agotados y los Ajustes del
 * TPV; fichar, arriba en naranja (0115). Un comandero no tiene inicio: va a la sala. La caja, las ventas y la venta
 * rápida llegan con su entrega, no se enseñan apagadas.
 *
 * A la derecha (abajo en el móvil), **«Ahora»**: lo que toca marchar, con su botón. Si no
 * hay nada que decir, no dice nada.
 */
export function ElInicio() {
  const { yo } = usarSesion();
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  const agota = puedeEditar(yo.permisos, 'accion.marcar_agotado');
  // El inicio es de la caja (0115): sus ajustes, también. Fichar está arriba, en naranja.
  const ajustes =
    puedeEditar(yo.permisos, 'accion.vincular_aparatos') ||
    puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');

  const baldosas = [
    ...(agota
      ? [
          {
            titulo: 'Agotados',
            frase: 'Marcar y desmarcar lo que se ha acabado',
            alTocar: () => {
              irA('agotados');
            },
          },
        ]
      : []),
    ...(ajustes
      ? [
          {
            titulo: 'Ajustes del TPV',
            frase: 'Los aparatos, el PIN y el bloqueo',
            alTocar: () => {
              irA('ajustes');
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba />
      <main className="flex flex-1 flex-col gap-e4 p-e4 md:p-e5 lg:flex-row">
        <div className="grid flex-1 auto-rows-min gap-e4 sm:grid-cols-2 lg:grid-cols-3">
          {tomaNota && <LasMesas />}
          {baldosas.map((b, i) => (
            <Baldosa
              key={b.titulo}
              titulo={b.titulo}
              frase={b.frase}
              alTocar={b.alTocar}
              ancho={i === baldosas.length - 1 ? loQueSobra(tomaNota, baldosas.length) : ''}
            />
          ))}
        </div>
        {tomaNota && <Ahora />}
      </main>
    </div>
  );
}

/**
 * **Mosaico sin huecos**: la última baldosa se estira hasta el final de su fila, en dos
 * columnas y en tres. Las mesas ocupan dos.
 */
function loQueSobra(conMesas: boolean, pequenas: number): string {
  const celdas = (conMesas ? 2 : 0) + pequenas;
  const enDos = celdas % 2 === 0 ? '' : 'sm:col-span-2';
  const resto = celdas % 3;
  const enTres = resto === 0 ? 'lg:col-span-1' : resto === 1 ? 'lg:col-span-3' : 'lg:col-span-2';
  return `${enDos} ${enTres}`;
}

function Baldosa({
  titulo,
  frase,
  alTocar,
  ancho,
  children,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly alTocar: () => void;
  readonly ancho: string;
  readonly children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alTocar}
      className={`flex min-h-[7.5rem] flex-col items-start gap-e2 rounded-mayor border-2 border-borde bg-superficie p-e5 text-left active:bg-charcoal ${ancho}`}
    >
      <span className="text-pantalla font-bold">{titulo}</span>
      <span className="text-secundario text-texto-suave">{frase}</span>
      {children}
    </button>
  );
}

/** La baldosa grande: cuántas mesas abiertas, cuántas personas y cuántas toca marchar. */
function LasMesas() {
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  const datos = plano.data;
  const abiertas =
    datos === undefined ? [] : datos.zonas.flatMap((z) => z.mesas).filter((m) => m.cuenta !== null);
  const totalMesas = datos === undefined ? 0 : datos.zonas.reduce((n, z) => n + z.mesas.length, 0);
  const personas = abiertas.reduce((n, m) => n + (m.cuenta?.personas ?? 0), 0);
  return (
    <button
      type="button"
      onClick={() => {
        irA('');
      }}
      className="flex min-h-[10rem] flex-col gap-e4 rounded-mayor border-2 border-borde bg-charcoal p-e5 text-left sm:col-span-2"
    >
      <span className="flex items-center gap-e3">
        <span className="flex size-12 items-center justify-center rounded-grande bg-naranja text-sobre-naranja">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <circle cx="17.5" cy="17.5" r="3.5" />
          </svg>
        </span>
        <span className="text-cifra-media font-bold">Mesas</span>
      </span>
      {datos !== undefined && (
        <span className="flex flex-wrap gap-e6">
          <Cifra valor={abiertas.length} que={`abiertas de ${String(totalMesas)}`} />
          <Cifra valor={personas} que="personas" />
          <Cifra valor={datos.tocaMarchar.length} que="toca marchar" resalta />
        </span>
      )}
    </button>
  );
}

function Cifra({
  valor,
  que,
  resalta = false,
}: {
  readonly valor: number;
  readonly que: string;
  readonly resalta?: boolean;
}) {
  return (
    <span className="flex flex-col">
      <span
        className={`text-cifra font-bold tabular-nums ${resalta && valor > 0 ? 'text-info' : ''}`}
      >
        {valor}
      </span>
      <span className="text-secundario text-texto-tenue">{que}</span>
    </span>
  );
}

/** «Ahora»: lo que toca marchar. Lo demás que dice el Anexo (la caja, el reparto, la impresora) llega con lo suyo. */
function Ahora() {
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  const { cliente } = usarSesion();
  const toca = plano.data?.tocaMarchar ?? [];
  const [marchando, setMarchando] = useState<string | null>(null);
  if (toca.length === 0) return null;
  return (
    <aside className="flex flex-col gap-e3 rounded-mayor border border-borde bg-superficie p-e4 lg:w-[20rem]">
      <span className="text-seccion font-bold">Ahora</span>
      {toca.map((t) => (
        <div key={t.cuentaId} className="flex flex-col gap-e2 rounded-grande bg-info-suave p-e3">
          <span className="font-bold text-info">
            {t.titulo} · ha salido todo el {String(t.salioEl)}.º
          </span>
          <div className="flex gap-e2">
            <button
              type="button"
              disabled={marchando !== null}
              onClick={() => {
                setMarchando(t.cuentaId);
                void (async () => {
                  await cliente.ejecutar('marchar', { cuenta_id: t.cuentaId, pase: t.pase });
                  await plano.refetch();
                  setMarchando(null);
                })();
              }}
              className="min-h-toque flex-1 rounded-grande bg-naranja font-bold text-sobre-naranja"
            >
              Marchar el {String(t.pase)}.º
            </button>
            <button
              type="button"
              onClick={() => {
                irALaMesa(t.cuentaId);
              }}
              className="min-h-toque rounded-grande border-2 border-borde px-e4 font-bold"
            >
              Abrir
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
