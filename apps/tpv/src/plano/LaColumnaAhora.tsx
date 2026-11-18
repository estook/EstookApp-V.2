import type { ReactNode } from 'react';
import { puedeEditar } from '@estook/permisos';
import {
  IconoAdelante,
  IconoAtencion,
  IconoBien,
  IconoCuaderno,
  IconoCuenta,
  IconoDinero,
  IconoEnviar,
  type Icono,
} from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { CuentaEnElPlano, ElPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { HORAS_PARA_AVISAR, llevaDemasiado, minutosCortos } from '../logica/comoVaLaMesa.ts';
import { cuantoLlevan, eurosConSimbolo } from '../logica/texto.ts';

/**
 * **La columna «Ahora»** (el rediseño, 0148; maqueta aprobada el 18-nov): lo que pide atención
 * en la sala, por orden y con su botón, para no tener que buscarlo en el plano.
 *
 *   · **Te toca**: marchar el siguiente pase, la mesa sentada sin pedir y lo apuntado sin mandar
 *   · **¿Cuenta?**: las que comieron y llevan un rato, la que más lleva primero (0131)
 *   · **Efectivo por cobrar**: lo que dejó un camarero en la caja (0145), solo en la caja
 *   · **Para el encargado**: una mesa abierta más de seis horas, que se quedó sin cobrar
 *
 * En el PC va a la derecha del plano, siempre a la vista; en la tablet, en el botón «Ahora». Lo
 * mismo que antes salía en franjas encima del plano, que en el móvil siguen ahí.
 */
export function LaColumnaAhora({
  plano,
  abiertas,
  alMarchar,
  alAbrir,
}: {
  readonly plano: ElPlano;
  /** Las cuentas abiertas, ya filtradas por «Mías» si está puesto. */
  readonly abiertas: readonly CuentaEnElPlano[];
  readonly alMarchar: (cuentaId: string, pase: number) => void;
  /** Abre la mesa (en la columna del PC o en su hoja). */
  readonly alAbrir: (cuentaId: string) => void;
}) {
  const { yo, aparato } = usarSesion();
  const ids = new Set(abiertas.map((c) => c.cuentaId));
  const marchar = plano.tocaMarchar.filter((t) => ids.has(t.cuentaId));
  const sinPedir = abiertas.filter((c) => c.comoVa === 'sin_pedir' || c.comoVa === 'por_mandar');
  const paraCobrar = abiertas
    .filter((c) => c.comoVa === 'para_cobrar')
    .sort((a, b) => (b.minutosEnElEstado ?? 0) - (a.minutosEnElEstado ?? 0));
  const enLaCaja = aparato.funcion === 'caja';
  const efectivo = enLaCaja ? abiertas.filter((c) => (c.pendientes ?? []).length > 0) : [];
  const esEncargado = puedeEditar(yo.permisos, 'accion.quitar_de_cocina');
  const demasiado = esEncargado ? abiertas.filter((c) => llevaDemasiado(c)) : [];
  const nada =
    marchar.length + sinPedir.length + paraCobrar.length + efectivo.length + demasiado.length === 0;

  if (nada) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-e2 p-e5 text-center text-texto-suave">
        <IconoBien size={28} aria-hidden className="text-bien" />
        <span className="font-bold text-texto">Todo en orden</span>
        <span className="text-secundario">Aquí sale lo que pida atención en la sala.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4 p-e4">
      {(marchar.length > 0 || sinPedir.length > 0) && (
        <Grupo titulo="Te toca">
          {marchar.map((t) => (
            <Fila
              key={`marchar-${t.cuentaId}`}
              icono={IconoAdelante}
              color="bg-mesa-marchar text-sobre-mesa-marchar"
              titulo={`${t.titulo} · marchar el ${elPase(t.pase)}`}
              detalle={`Ha salido todo el ${elPase(t.salioEl)}`}
              boton="Marchar"
              principal
              alTocar={() => {
                alMarchar(t.cuentaId, t.pase);
              }}
            />
          ))}
          {sinPedir.map((c) => (
            <Fila
              key={`pedir-${c.cuentaId}`}
              icono={c.comoVa === 'por_mandar' ? IconoEnviar : IconoCuaderno}
              color="bg-mesa-te-toca text-sobre-mesa-te-toca"
              titulo={`${c.titulo} · ${c.comoVa === 'por_mandar' ? 'sin mandar' : 'sin pedir'}`}
              detalle={[
                c.camarero,
                c.comoVa === 'sin_pedir' ? `sentados hace ${cuantoLlevan(c.minutos)}` : null,
              ]
                .filter((x) => x !== null)
                .join(' · ')}
              boton="Abrir"
              alTocar={() => {
                alAbrir(c.cuentaId);
              }}
            />
          ))}
        </Grupo>
      )}

      {paraCobrar.length > 0 && (
        <Grupo titulo="¿Cuenta?">
          {paraCobrar.map((c) => (
            <Fila
              key={`cuenta-${c.cuentaId}`}
              icono={IconoCuenta}
              color="bg-mesa-cuenta text-sobre-mesa-cuenta"
              titulo={`${c.titulo} · ${eurosConSimbolo(c.totalCentimos)}`}
              detalle={[c.camarero, `acabaron hace ${minutosCortos(c.minutosEnElEstado ?? 0)}`]
                .filter((x) => x !== null)
                .join(' · ')}
              boton="Cobrar"
              alTocar={() => {
                alAbrir(c.cuentaId);
              }}
            />
          ))}
        </Grupo>
      )}

      {efectivo.length > 0 && (
        <Grupo titulo="Efectivo por cobrar">
          {efectivo.flatMap((c) =>
            (c.pendientes ?? []).map((p) => (
              <Fila
                key={`efectivo-${p.id}`}
                icono={IconoDinero}
                color="bg-atencion-suave text-atencion"
                titulo={`${eurosConSimbolo(p.enEfectivo)} · ${c.titulo}`}
                detalle={`Lo dejó ${p.por}`}
                boton="Cobrar"
                alTocar={() => {
                  alAbrir(c.cuentaId);
                }}
              />
            )),
          )}
        </Grupo>
      )}

      {demasiado.length > 0 && (
        <Grupo titulo="Para el encargado">
          {demasiado.map((c) => (
            <Fila
              key={`demasiado-${c.cuentaId}`}
              icono={IconoAtencion}
              color="bg-mal-suave text-mal"
              titulo={`${c.titulo}, abierta hace ${cuantoLlevan(c.minutos)}`}
              detalle={`Más de ${String(HORAS_PARA_AVISAR)} h · ${eurosConSimbolo(c.totalCentimos)} sin cobrar`}
              boton="Ver"
              alTocar={() => {
                alAbrir(c.cuentaId);
              }}
            />
          ))}
        </Grupo>
      )}
    </div>
  );
}

/** Cuántas cosas pide «Ahora»: el número del botón en la tablet. */
export function cuantoPideAhora(
  plano: ElPlano,
  abiertas: readonly CuentaEnElPlano[],
  enLaCaja: boolean,
  esEncargado: boolean,
): number {
  const ids = new Set(abiertas.map((c) => c.cuentaId));
  return (
    plano.tocaMarchar.filter((t) => ids.has(t.cuentaId)).length +
    abiertas.filter(
      (c) => c.comoVa === 'sin_pedir' || c.comoVa === 'por_mandar' || c.comoVa === 'para_cobrar',
    ).length +
    (enLaCaja ? abiertas.reduce((n, c) => n + (c.pendientes ?? []).length, 0) : 0) +
    (esEncargado ? abiertas.filter((c) => llevaDemasiado(c)).length : 0)
  );
}

function Grupo({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-e2">
      <h3 className="text-etiqueta font-bold uppercase tracking-[0.07em] text-texto-tenue">
        {titulo}
      </h3>
      <ul className="flex flex-col gap-e2">{children}</ul>
    </section>
  );
}

function Fila({
  icono: Dibujo,
  color,
  titulo,
  detalle,
  boton,
  principal = false,
  alTocar,
}: {
  readonly icono: Icono;
  readonly color: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly boton: string;
  readonly principal?: boolean;
  readonly alTocar: () => void;
}) {
  return (
    <li className="flex items-center gap-e3 rounded-grande border border-borde bg-fondo p-e2">
      <span
        aria-hidden
        className={['flex size-10 shrink-0 items-center justify-center rounded-medio', color].join(
          ' ',
        )}
      >
        <Dibujo size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-bold">{titulo}</span>
        {detalle !== '' && (
          <span className="truncate text-secundario text-texto-tenue">{detalle}</span>
        )}
      </span>
      <button
        type="button"
        onClick={alTocar}
        aria-label={`${boton}: ${titulo}`}
        className={[
          'min-h-toque shrink-0 rounded-medio px-e3 text-secundario font-bold',
          principal
            ? 'bg-naranja text-sobre-naranja'
            : boton === 'Cobrar'
              ? 'bg-mesa-cuenta text-sobre-mesa-cuenta'
              : 'border border-borde bg-superficie',
        ].join(' ')}
      >
        {boton}
      </button>
    </li>
  );
}
