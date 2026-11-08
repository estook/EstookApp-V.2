import { useQuery } from '@tanstack/react-query';
import type { FuncionDelAparato } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { IconoFlechaDerecha } from '@estook/iconos';
import { EstadoVacio } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irA } from '../navegar.ts';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { FalloDeLaSala, usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import { IconoEnSuColor, type Dibujo, type Tono } from '../iconos.tsx';
import type { LaBotonera, LosAparatos as LosAparatosDeLaApi } from '../datos/tipos.ts';
import { LosAparatos } from './LosAparatos.tsx';
import { PinYBloqueo } from './PinYBloqueo.tsx';
import { CocinaYBarra } from './CocinaYBarra.tsx';
import { ImpresorasYCajon } from './ImpresorasYCajon.tsx';
import { Productos } from '../productos/Productos.tsx';
import { LaDeclaracion } from './LaDeclaracion.tsx';
import { ComoFacturaEnUnaLinea, LaFacturacion } from './LaFacturacion.tsx';
import { ponerElTema, usarElTemaElegido, type TemaDelTpv } from '../ganchos/usarElTema.ts';

/**
 * **Ajustes del TPV**, detrás del engranaje (la entrada nueva, maqueta 2; Anexo 11.13): todo lo
 * que no es del servicio, **en grupos y con su dibujo y su color**, y una línea que dice cómo
 * está cada cosa. Solo lo de vender: la carta, los precios y el equipo se cambian en Estook.
 * **Solo en la caja** (0115), y cada apartado solo a quien puede tocarlo.
 *
 * **Desde R3 (0133), como los ajustes del teléfono**: cada grupo es una lista de filas de una
 * línea, con su título grande y legible; dos columnas en la tablet y una en el móvil, sin
 * huecos. Tres grupos: lo que se vende, lo que se conecta, y seguridad y Hacienda.
 *
 * Lo que llega con su entrega (la caja y el datáfono) **no se enseña hasta que funcione**; las
 * impresoras y el cajón, desde T5 · 1 (0119). «Editar sala» vive aquí, en «La sala y las mesas».
 */

interface Apartado {
  readonly id: string;
  readonly nombre: string;
  readonly dibujo: Dibujo;
  readonly tono: Tono;
  readonly grupo: (typeof GRUPOS)[number];
  /** A dónde lleva: la sala y los agotados son pantallas enteras. */
  readonly ir: string;
}

const GRUPOS = ['Lo que se vende', 'Lo que se conecta', 'Seguridad y Hacienda'] as const;
const DE_AQUI_DENTRO: readonly string[] = [
  'productos',
  'cocina',
  'aparatos',
  'impresoras',
  'pin',
  'facturacion',
  'declaracion',
];

function losApartados(permisos: Parameters<typeof puedeEditar>[0]): Apartado[] {
  const ajusta = puedeEditar(permisos, 'accion.ajustes_del_tpv');
  const vincula = puedeEditar(permisos, 'accion.vincular_aparatos');
  const agota = puedeEditar(permisos, 'accion.marcar_agotado');
  const factura = puedeEditar(permisos, 'accion.alta_de_facturacion');
  return [
    ...(agota
      ? [
          {
            id: 'agotados',
            nombre: 'Agotados',
            dibujo: 'agotado',
            tono: 'rojo',
            grupo: 'Lo que se vende',
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
            id: 'impresoras',
            nombre: 'Impresoras y cajón',
            dibujo: 'impresora',
            tono: 'naranja',
            grupo: 'Lo que se conecta',
            ir: 'ajustes/impresoras',
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
            grupo: 'Seguridad y Hacienda',
            ir: 'ajustes/pin',
          } as const,
        ]
      : []),
    // Cómo factura el local (0127): quien hace el alta, como en Estook.
    ...(factura
      ? [
          {
            id: 'facturacion',
            nombre: 'Facturación',
            dibujo: 'documento',
            tono: 'naranja',
            grupo: 'Seguridad y Hacienda',
            ir: 'ajustes/facturacion',
          } as const,
        ]
      : []),
    // La declaración responsable (0126), **para todos los de la caja**: la ley la pide a mano de
    // quien usa el programa, no solo de quien lo ajusta.
    {
      id: 'declaracion',
      nombre: 'Declaración responsable',
      dibujo: 'declaracion',
      tono: 'gris',
      grupo: 'Seguridad y Hacienda',
      ir: 'ajustes/declaracion',
    } as const,
  ];
}

export function AjustesDelTpv({ direccion }: { readonly direccion: string }) {
  const { yo, aparato } = usarSesion();
  const apartados = losApartados(yo.permisos);
  const elegido = direccion.split('/')[1];
  const resto = direccion.split('/').slice(2).join('/');
  // La sala y los agotados son pantallas enteras: aquí dentro, solo los otros cuatro.
  const puede = (id: string) => DE_AQUI_DENTRO.includes(id) && apartados.some((a) => a.id === id);

  // **«Tu sesión», en todos los aparatos** (0143): cambiar de persona y el tema se tocan
  // también en el comandero; lo demás, solo en la caja (0115).
  if (aparato.funcion !== 'caja' || apartados.length === 0) {
    return (
      <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
        <LaBarraDeArriba titulo="Ajustes" />
        <main className="flex w-full max-w-[40rem] flex-col gap-e5 p-e4 md:p-e5">
          <TuSesion desvincular={false} />
          <EstadoVacio
            compacto
            titulo={
              aparato.funcion !== 'caja' ? 'Lo demás, en la caja' : 'Lo demás, quien lleva el local'
            }
            frase={
              aparato.funcion !== 'caja'
                ? 'La sala, los productos, las impresoras y los aparatos se ajustan en la caja.'
                : 'La sala, los productos, las impresoras y los aparatos los ajusta quien lleva el local.'
            }
            dibujo="candado"
            sinAccionPorque="No hay nada más que hacer aquí."
          />
        </main>
      </div>
    );
  }

  // **El engranaje**: los grupos, con lo que dice cada uno. Dos columnas en la tablet que se
  // reparten solas, para que ningún grupo deje media fila vacía.
  if (elegido === undefined || !puede(elegido)) {
    return (
      <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
        <LaBarraDeArriba titulo="Ajustes" />
        <main className="flex flex-col gap-e4 p-e4 md:p-e5">
          <div className="gap-e5 md:columns-2">
            <div className="mb-e5 break-inside-avoid">
              <TuSesion desvincular={puedeEditar(yo.permisos, 'accion.vincular_aparatos')} />
            </div>
            {GRUPOS.map((grupo) => {
              const suyos = apartados.filter((a) => a.grupo === grupo);
              if (suyos.length === 0) return null;
              return (
                <section
                  key={grupo}
                  aria-label={grupo}
                  className="mb-e5 flex break-inside-avoid flex-col gap-e2"
                >
                  <h2 className="text-pantalla font-bold">{grupo}</h2>
                  <div className="flex flex-col overflow-hidden rounded-mayor bg-superficie">
                    {suyos.map((a) => (
                      <Fila key={a.id} apartado={a} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // **Un apartado**, con los demás a un lado para pasar de uno a otro.
  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
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
          ) : elegido === 'impresoras' ? (
            <ImpresorasYCajon />
          ) : elegido === 'facturacion' ? (
            <LaFacturacion />
          ) : elegido === 'declaracion' ? (
            <LaDeclaracion />
          ) : (
            <LosAparatos resto={resto} />
          )}
        </main>
      </div>
    </div>
  );
}

/** Una fila de la lista: su dibujo, su nombre y cómo está, en una línea cada uno. */
function Fila({ apartado: a }: { readonly apartado: Apartado }) {
  return (
    <button
      type="button"
      onClick={() => {
        irA(a.ir);
      }}
      className="flex min-h-[4.5rem] items-center gap-e4 border-b border-borde px-e4 py-e3 text-left last:border-b-0 active:bg-charcoal"
    >
      <IconoEnSuColor dibujo={a.dibujo} tono={a.tono} lado={44} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-seccion font-bold">{a.nombre}</span>
        <span className="truncate text-cuerpo text-texto-suave">
          <ComoEsta id={a.id} />
        </span>
      </span>
      <IconoFlechaDerecha size={22} className="shrink-0 text-texto-tenue" />
    </button>
  );
}

const LOS_TEMAS: readonly { readonly valor: TemaDelTpv; readonly texto: string }[] = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'auto', texto: 'Auto' },
];

/**
 * **Tu sesión** (el repaso del 8-nov, 0143): **cambiar de persona** (vuelve al PIN y deja el
 * aparato listo para el siguiente), **el tema** de este aparato y, a quien vincula aparatos en
 * la caja, **desvincular este aparato**, que lleva a su ficha y pide confirmar allí.
 */
function TuSesion({ desvincular }: { readonly desvincular: boolean }) {
  const { yo, aparato, bloquear } = usarSesion();
  const tema = usarElTemaElegido();
  return (
    <section aria-label="Tu sesión" className="flex flex-col gap-e2">
      <h2 className="text-pantalla font-bold">Tu sesión</h2>
      <div className="flex flex-col overflow-hidden rounded-mayor bg-superficie">
        <button
          type="button"
          onClick={bloquear}
          className="flex min-h-[4.5rem] items-center gap-e4 border-b border-borde px-e4 py-e3 text-left active:bg-charcoal"
        >
          <IconoEnSuColor dibujo="persona" tono="azul" lado={44} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-seccion font-bold">Cambiar de persona</span>
            <span className="truncate text-cuerpo text-texto-suave">
              Ahora {yo.nombre} · vuelve al PIN
            </span>
          </span>
          <IconoFlechaDerecha size={22} className="shrink-0 text-texto-tenue" />
        </button>
        <div className="flex min-h-[4.5rem] flex-wrap items-center gap-e4 px-e4 py-e3">
          <IconoEnSuColor dibujo="tema" tono="ambar" lado={44} />
          <span id="el-tema" className="flex-1 text-seccion font-bold">
            Tema
          </span>
          <div
            role="radiogroup"
            aria-labelledby="el-tema"
            className="flex rounded-grande bg-charcoal p-[3px]"
          >
            {LOS_TEMAS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={tema === t.valor}
                onClick={() => {
                  ponerElTema(t.valor);
                }}
                className={[
                  'min-h-toque rounded-medio px-e4 font-bold',
                  tema === t.valor ? 'bg-superficie text-texto shadow' : 'text-texto-suave',
                ].join(' ')}
              >
                {t.texto}
              </button>
            ))}
          </div>
        </div>
        {desvincular && (
          <button
            type="button"
            onClick={() => {
              irA(`ajustes/aparatos/${aparato.terminalId}`);
            }}
            className="flex min-h-[4.5rem] items-center gap-e4 border-t border-borde px-e4 py-e3 text-left active:bg-charcoal"
          >
            <IconoEnSuColor dibujo="salir" tono="rojo" lado={44} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-seccion font-bold text-mal">Desvincular este aparato</span>
              <span className="truncate text-cuerpo text-texto-suave">
                {aparato.nombre} deja de valer · se vuelve con un código
              </span>
            </span>
            <IconoFlechaDerecha size={22} className="shrink-0 text-texto-tenue" />
          </button>
        )}
      </div>
    </section>
  );
}

/** La línea de cada fila: cómo está ahora, o qué se hace ahí si no se sabe todavía. */
function ComoEsta({ id }: { readonly id: string }) {
  if (id === 'agotados') return <LosAgotadosDeHoy />;
  if (id === 'sala') return <LaSala />;
  if (id === 'productos') return <LosProductos />;
  if (id === 'cocina') return <LaCocina />;
  if (id === 'aparatos') return <LosAparatosDelLocal />;
  if (id === 'impresoras') return <LasImpresorasDelLocal />;
  if (id === 'facturacion') return <ComoFacturaEnUnaLinea />;
  if (id === 'declaracion') return <>Lo que Estook declara a Hacienda</>;
  return <ElBloqueo />;
}

/** «8 secciones · 40 productos», o qué se hace ahí si aún no hay botonera. */
function LosProductos() {
  const { cliente } = usarSesion();
  // La misma clave que Productos y precios: al entrar, ya está leída.
  const botonera = useQuery({
    queryKey: ['botonera'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaBotonera>('la_botonera');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
  const datos = botonera.data;
  if (datos === undefined || datos.camino === null)
    return <>Las secciones, sus productos y sus precios</>;
  const secciones = datos.paginas.length;
  const productos = datos.paginas.reduce((n, g) => n + g.botones.length, 0);
  return (
    <>
      {secciones === 1 ? '1 sección' : `${String(secciones)} secciones`} ·{' '}
      {productos === 1 ? '1 producto' : `${String(productos)} productos`}
    </>
  );
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
  if (agotados.length === 0) return <>Nada agotado</>;
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
      {mesas === 1 ? '1 mesa' : `${String(mesas)} mesas`}
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
      Ámbar {a.avisoMin}′, rojo {a.tardeMin}′ · {a.suena ? 'suena' : 'sin sonido'}
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

/** «2 impresoras · 1 cajón», o qué se hace ahí si todavía no hay ninguna. */
function LasImpresorasDelLocal() {
  const { cliente } = usarSesion();
  const lista = useQuery({
    queryKey: ['las_impresoras'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{
        impresoras: readonly { readonly tieneCajon: boolean; readonly estado: string }[];
      }>('las_impresoras');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
  const impresoras = lista.data?.impresoras;
  if (impresoras === undefined || impresoras.length === 0) {
    return <>Imprimir las comandas y la cuenta, y el cajón</>;
  }
  const cajones = impresoras.filter((i) => i.tieneCajon).length;
  const mal = impresoras.filter((i) => i.estado === 'sin_papel' || i.estado === 'no_responde');
  return (
    <>
      {impresoras.length === 1 ? '1 impresora' : `${String(impresoras.length)} impresoras`}
      {cajones === 0 ? '' : cajones === 1 ? ' · 1 cajón' : ` · ${String(cajones)} cajones`}
      {mal.length === 0 ? '' : ` · ${String(mal.length)} con un problema`}
    </>
  );
}

function ElBloqueo() {
  const { aparato } = usarSesion();
  const minutos = aparato.bloqueo.minutos;
  return <>Se bloquea {minutos === 1 ? 'al minuto' : `a los ${String(minutos)} min`}</>;
}
