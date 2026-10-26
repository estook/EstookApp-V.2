import { useQuery } from '@tanstack/react-query';
import type { FuncionDelAparato } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { EstadoVacio } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irA } from '../navegar.ts';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { FalloDeLaSala, usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import { IconoEnSuColor, type Dibujo, type Tono } from '../iconos.tsx';
import type { LosAparatos as LosAparatosDeLaApi } from '../datos/tipos.ts';
import { LosAparatos } from './LosAparatos.tsx';
import { PinYBloqueo } from './PinYBloqueo.tsx';
import { CocinaYBarra } from './CocinaYBarra.tsx';
import { Productos } from '../productos/Productos.tsx';

/**
 * **Ajustes del TPV**, detrás del engranaje (la entrada nueva, maqueta 2; Anexo 11.13): todo lo
 * que no es del servicio, **en grupos y con su dibujo y su color**, y una línea que dice cómo
 * está cada cosa. Solo lo de vender: la carta, los precios y el equipo se cambian en Estook.
 * **Solo en la caja** (0115), y cada apartado solo a quien puede tocarlo.
 *
 * Lo que llega con su entrega (la caja, las impresoras y el cajón, el datáfono) **no se enseña
 * hasta que funcione**. «Editar sala» vive aquí, en «La sala y las mesas».
 */

interface Apartado {
  readonly id: string;
  readonly nombre: string;
  readonly dibujo: Dibujo;
  readonly tono: Tono;
  readonly grupo: 'Hoy' | 'Lo que se vende' | 'Lo que se conecta' | 'Seguridad';
  /** A dónde lleva: la sala y los agotados son pantallas enteras. */
  readonly ir: string;
}

const GRUPOS = ['Hoy', 'Lo que se vende', 'Lo que se conecta', 'Seguridad'] as const;
const DE_AQUI_DENTRO: readonly string[] = ['productos', 'cocina', 'aparatos', 'pin'];

function losApartados(permisos: Parameters<typeof puedeEditar>[0]): Apartado[] {
  const ajusta = puedeEditar(permisos, 'accion.ajustes_del_tpv');
  const vincula = puedeEditar(permisos, 'accion.vincular_aparatos');
  const agota = puedeEditar(permisos, 'accion.marcar_agotado');
  return [
    ...(agota
      ? [
          {
            id: 'agotados',
            nombre: 'Agotados',
            dibujo: 'agotado',
            tono: 'rojo',
            grupo: 'Hoy',
            ir: 'agotados',
          } as const,
        ]
      : []),
    ...(ajusta
      ? ([
          {
            id: 'sala',
            nombre: 'La sala y las mesas',
            dibujo: 'sala',
            tono: 'verde',
            grupo: 'Lo que se vende',
            ir: 'sala/editar',
          },
          {
            id: 'productos',
            nombre: 'Productos y precios',
            dibujo: 'producto',
            tono: 'naranja',
            grupo: 'Lo que se vende',
            ir: 'ajustes/productos',
          },
          {
            id: 'cocina',
            nombre: 'Cocina y barra',
            dibujo: 'cocina',
            tono: 'ambar',
            grupo: 'Lo que se vende',
            ir: 'ajustes/cocina',
          },
        ] as const)
      : []),
    ...(vincula
      ? [
          {
            id: 'aparatos',
            nombre: 'Aparatos del local',
            dibujo: 'aparatos',
            tono: 'azul',
            grupo: 'Lo que se conecta',
            ir: 'ajustes/aparatos',
          } as const,
        ]
      : []),
    ...(ajusta
      ? [
          {
            id: 'pin',
            nombre: 'PIN y bloqueo',
            dibujo: 'candado',
            tono: 'gris',
            grupo: 'Seguridad',
            ir: 'ajustes/pin',
          } as const,
        ]
      : []),
  ];
}

export function AjustesDelTpv({ direccion }: { readonly direccion: string }) {
  const { yo, aparato } = usarSesion();
  const apartados = losApartados(yo.permisos);
  const elegido = direccion.split('/')[1];
  const resto = direccion.split('/').slice(2).join('/');
  // La sala y los agotados son pantallas enteras: aquí dentro, solo los otros cuatro.
  const puede = (id: string) => DE_AQUI_DENTRO.includes(id) && apartados.some((a) => a.id === id);

  if (aparato.funcion !== 'caja' || apartados.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col bg-fondo text-texto">
        <LaBarraDeArriba titulo="Ajustes" />
        <main className="p-e5">
          <EstadoVacio
            titulo="Aquí no se tocan los ajustes"
            frase={
              aparato.funcion !== 'caja'
                ? 'Los ajustes del TPV se tocan en la caja.'
                : 'Los ajustes del TPV los toca quien lleva el local.'
            }
            dibujo="candado"
            sinAccionPorque="No hay nada que hacer aquí."
          />
        </main>
      </div>
    );
  }

  // **El engranaje**: los grupos, con lo que dice cada uno.
  if (elegido === undefined || !puede(elegido)) {
    return (
      <div className="flex min-h-dvh flex-col bg-fondo text-texto">
        <LaBarraDeArriba titulo="Ajustes" />
        <main className="flex flex-col gap-e6 p-e4 md:p-e6">
          {GRUPOS.map((grupo) => {
            const suyos = apartados.filter((a) => a.grupo === grupo);
            if (suyos.length === 0) return null;
            return (
              <section key={grupo} aria-label={grupo} className="flex flex-col gap-e3">
                <h2 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
                  {grupo}
                </h2>
                <div className="grid gap-e3 sm:grid-cols-2 xl:grid-cols-3">
                  {suyos.map((a) => (
                    <Baldosa key={a.id} apartado={a} />
                  ))}
                </div>
              </section>
            );
          })}
          <p className="text-secundario text-texto-tenue">
            Lo de vender. La carta, los precios y el equipo, en Estook.
          </p>
        </main>
      </div>
    );
  }

  // **Un apartado**, con los demás a un lado para pasar de uno a otro.
  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Ajustes" />
      <div className="flex flex-1 flex-col md:flex-row">
        <nav
          aria-label="Ajustes del TPV"
          className="flex gap-e2 overflow-x-auto border-b border-borde bg-superficie p-e3 md:w-[16rem] md:flex-col md:border-b-0 md:border-r"
        >
          <button
            type="button"
            onClick={() => {
              irA('ajustes');
            }}
            className="min-h-toque shrink-0 rounded-grande px-e4 text-left font-semibold text-texto-suave"
          >
            ‹ Todos los ajustes
          </button>
          {apartados.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-current={elegido === a.id ? 'page' : undefined}
              onClick={() => {
                irA(a.ir);
              }}
              className={[
                'flex min-h-toque shrink-0 items-center gap-e3 rounded-grande px-e3 text-left font-semibold',
                elegido === a.id ? 'bg-charcoal font-bold' : '',
              ].join(' ')}
            >
              <IconoEnSuColor dibujo={a.dibujo} tono={a.tono} lado={32} />
              {a.nombre}
            </button>
          ))}
        </nav>
        <main className="flex-1 p-e4 md:p-e6">
          {elegido === 'productos' ? (
            <Productos resto={resto} />
          ) : elegido === 'pin' ? (
            <PinYBloqueo />
          ) : elegido === 'cocina' ? (
            <CocinaYBarra />
          ) : (
            <LosAparatos resto={resto} />
          )}
        </main>
      </div>
    </div>
  );
}

function Baldosa({ apartado: a }: { readonly apartado: Apartado }) {
  return (
    <button
      type="button"
      onClick={() => {
        irA(a.ir);
      }}
      className="flex min-h-[5.75rem] items-start gap-e3 rounded-mayor border-2 border-borde bg-superficie p-e4 text-left active:bg-charcoal"
    >
      <IconoEnSuColor dibujo={a.dibujo} tono={a.tono} />
      <span className="flex min-w-0 flex-col gap-e1">
        <span className="text-seccion font-bold">{a.nombre}</span>
        <span className="text-secundario text-texto-suave">
          <ComoEsta id={a.id} />
        </span>
      </span>
    </button>
  );
}

/** La línea de cada baldosa: cómo está ahora, o qué se hace ahí si no se sabe todavía. */
function ComoEsta({ id }: { readonly id: string }) {
  if (id === 'agotados') return <LosAgotadosDeHoy />;
  if (id === 'sala') return <LaSala />;
  if (id === 'productos') return <>La botonera, las opciones y las bebidas</>;
  if (id === 'cocina') return <LaCocina />;
  if (id === 'aparatos') return <LosAparatosDelLocal />;
  return <ElBloqueo />;
}

function LosAgotadosDeHoy() {
  const { cliente } = usarSesion();
  const platos = useQuery({
    queryKey: ['sala', 'los_agotados'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{
        platos: readonly { readonly nombre: string; readonly agotado: object | null }[];
      }>('los_agotados');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos.platos;
    },
  });
  const agotados = (platos.data ?? []).filter((p) => p.agotado !== null);
  if (platos.data === undefined) return <>Marcar lo que se ha acabado</>;
  if (agotados.length === 0) return <>Nada agotado. Marcar lo que se acaba</>;
  const nombres = agotados.slice(0, 3).map((p) => p.nombre);
  return (
    <>
      {agotados.length === 1 ? '1 plato' : `${String(agotados.length)} platos`}:{' '}
      {nombres.join(', ')}
      {agotados.length > 3 ? '…' : ''}
    </>
  );
}

function LaSala() {
  const conectado = usarAlSegundo();
  const plano = usarElPlano(conectado);
  const zonas = (plano.data?.zonas ?? []).filter((z) => z.mesas.length > 0 || z.cosas.length > 0);
  if (plano.data === undefined) return <>Dibujar, mover y añadir</>;
  if (zonas.length === 0) return <>Sin dibujar. Dibújala aquí, a ojo</>;
  const mesas = zonas.reduce((n, z) => n + z.mesas.length, 0);
  return (
    <>
      {zonas.length === 1 ? '1 zona' : `${String(zonas.length)} zonas`} ·{' '}
      {mesas === 1 ? '1 mesa' : `${String(mesas)} mesas`}. Dibujar, mover y añadir
    </>
  );
}

function LaCocina() {
  const { cliente } = usarSesion();
  const ajustes = useQuery({
    queryKey: ['la_cocina_y_la_barra'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{
        avisoMin: number;
        tardeMin: number;
        suena: boolean;
      }>('la_cocina_y_la_barra');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
  const a = ajustes.data;
  if (a === undefined) return <>Los minutos del color y el sonido</>;
  return (
    <>
      Ámbar a los {a.avisoMin} min, rojo a los {a.tardeMin} · {a.suena ? 'suena' : 'sin sonido'}
    </>
  );
}

const EN_SINGULAR: Readonly<Record<FuncionDelAparato, string>> = {
  caja: 'caja',
  comandero: 'comandero',
  cocina: 'pantalla de cocina',
  barra: 'pantalla de barra',
  fichar: 'para fichar',
};

const EN_PLURAL: Readonly<Record<FuncionDelAparato, string>> = {
  caja: 'cajas',
  comandero: 'comanderos',
  cocina: 'pantallas de cocina',
  barra: 'pantallas de barra',
  fichar: 'para fichar',
};

function LosAparatosDelLocal() {
  const { cliente } = usarSesion();
  const aparatos = useQuery({
    queryKey: ['los_aparatos'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LosAparatosDeLaApi>('los_aparatos');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
  if (aparatos.data === undefined) return <>Vincular, cambiar y quitar</>;
  const cuantos = new Map<FuncionDelAparato, number>();
  for (const a of aparatos.data.aparatos.filter((x) => x.vale)) {
    cuantos.set(a.funcion, (cuantos.get(a.funcion) ?? 0) + 1);
  }
  const partes = (['caja', 'comandero', 'cocina', 'barra', 'fichar'] as const).flatMap((f) => {
    const n = cuantos.get(f) ?? 0;
    if (n === 0) return [];
    return [n === 1 ? `1 ${EN_SINGULAR[f]}` : `${String(n)} ${EN_PLURAL[f]}`];
  });
  return <>{partes.join(' · ')}</>;
}

function ElBloqueo() {
  const { aparato } = usarSesion();
  const minutos = aparato.bloqueo.minutos;
  return (
    <>Se bloquea a {minutos === 1 ? 'el minuto' : `los ${String(minutos)} minutos`} sin tocar</>
  );
}
