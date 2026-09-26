import { useEffect, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
  Selector,
  Tabla,
  Tarjeta,
  Vistas,
  type Columna,
} from '@estook/ui';
import { IconoBuscar, IconoDescargar, IconoFiltros } from '@estook/iconos';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { centimos, conSimbolo, planPorCodigo } from '@estook/dominio';
import {
  cuandoEntro,
  elContrato,
  fechaCorta,
  laActividad,
  type ClienteEnLista,
  type LaLista,
  type Pestana,
} from '../datos/clientes.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDelCliente } from './FichaDelCliente.tsx';

/**
 * Los clientes (entrega A2 · decisión 0041 · panel de administración 2).
 *
 * Una lista con **pestañas que son filtros guardados**, y debajo lo demás: buscar,
 * filtrar, ordenar por columna y exportar. **Todo lo hace el servidor** (regla 51):
 * la lista llega de cincuenta en cincuenta y nunca se filtra lo ya cargado.
 *
 * Arriba, lo que antes era la pestaña Cuentas: quién paga y cuánto al mes. Y el
 * contrato —lo que paga— y la actividad —lo que usa— van en columnas separadas: así
 * sale sola la señal de «paga y apenas lo usa».
 */

const PESTANAS: readonly { readonly id: Pestana; readonly nombre: string }[] = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'prueba', nombre: 'En prueba' },
  { id: 'pagando', nombre: 'Pagando' },
  { id: 'se_van', nombre: 'Se están yendo' },
  { id: 'baja', nombre: 'Sin pagar' },
];

/** Los filtros de debajo de las pestañas. Vacío: sin filtrar. */
interface Filtros {
  readonly contrato: string;
  readonly actividad: string;
  readonly plan: string;
  readonly tipo: string;
  readonly alta: string;
  readonly acceso: string;
}

const SIN_FILTROS: Filtros = {
  contrato: '',
  actividad: '',
  plan: '',
  tipo: '',
  alta: '',
  acceso: '',
};

const OPCIONES: Readonly<
  Record<keyof Filtros, { etiqueta: string; opciones: readonly { valor: string; texto: string }[] }>
> = {
  contrato: {
    etiqueta: 'Contrato',
    opciones: [
      { valor: 'al_dia', texto: 'Al día' },
      { valor: 'prueba', texto: 'En prueba' },
      { valor: 'impago', texto: 'Cobro fallido' },
      { valor: 'solo_lectura', texto: 'Solo lectura' },
      { valor: 'sin_pagar', texto: 'Sin pagar' },
    ],
  },
  actividad: {
    etiqueta: 'Actividad',
    opciones: [
      { valor: 'activo', texto: 'Activo' },
      { valor: 'bajando', texto: 'Bajando' },
      { valor: 'dormido', texto: 'Dormido' },
      { valor: 'sin_estrenar', texto: 'Sin estrenar' },
      { valor: 'mira', texto: 'Entra sin apuntar' },
    ],
  },
  plan: {
    etiqueta: 'Plan',
    opciones: [
      { valor: 'esencial', texto: 'Esencial' },
      { valor: 'pro', texto: 'Pro' },
      { valor: 'cadena', texto: 'Cadena' },
      { valor: 'pausa', texto: 'Pausa' },
      { valor: 'sin_plan', texto: 'Sin plan' },
    ],
  },
  tipo: {
    etiqueta: 'Tipo',
    opciones: [
      { valor: 'independiente', texto: 'Independiente' },
      { valor: 'grupo', texto: 'Grupo' },
      { valor: 'cadena', texto: 'Cadena' },
    ],
  },
  alta: {
    etiqueta: 'Alta',
    opciones: [
      { valor: '30', texto: 'Últimos 30 días' },
      { valor: '90', texto: 'Últimos 90 días' },
      { valor: 'antes', texto: 'Hace más de 90 días' },
    ],
  },
  acceso: {
    etiqueta: 'Último acceso',
    opciones: [
      { valor: 'hoy', texto: 'Hoy' },
      { valor: '7', texto: 'Esta semana' },
      { valor: '30', texto: 'Este mes' },
      { valor: 'mas', texto: 'Hace más de un mes' },
      { valor: 'nunca', texto: 'Nunca' },
    ],
  },
};

type Orden = 'nombre' | 'alta' | 'ultimo_acceso' | 'cuota' | 'contrato' | 'actividad';

const ORDENES: readonly { readonly valor: string; readonly texto: string }[] = [
  { valor: 'alta:desc', texto: 'Los más nuevos' },
  { valor: 'alta:asc', texto: 'Los más antiguos' },
  { valor: 'nombre:asc', texto: 'Nombre, de la A a la Z' },
  { valor: 'ultimo_acceso:desc', texto: 'Entraron hace menos' },
  { valor: 'ultimo_acceso:asc', texto: 'Llevan más sin entrar' },
  { valor: 'cuota:desc', texto: 'Pagan más' },
  { valor: 'contrato:asc', texto: 'Contrato: lo urgente arriba' },
  { valor: 'actividad:asc', texto: 'Actividad: los dormidos arriba' },
];

export function Clientes() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [pestana, setPestana] = useState<Pestana>('todos');
  const [escrito, setEscrito] = useState('');
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [conEjemplos, setConEjemplos] = useState(false);
  const [verFiltros, setVerFiltros] = useState(false);
  const [orden, setOrden] = useState<{ clave: Orden; sentido: 'asc' | 'desc' }>({
    clave: 'alta',
    sentido: 'desc',
  });
  const [abierto, setAbierto] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [calculando, setCalculando] = useState(false);

  // Se busca al dejar de escribir, no en cada letra: cada búsqueda va al servidor.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscar(escrito.trim());
    }, 300);
    return () => {
      clearTimeout(espera);
    };
  }, [escrito]);

  const entrada: Record<string, string> = {
    pestana,
    orden: orden.clave,
    sentido: orden.sentido,
    ...(buscar === '' ? {} : { buscar }),
    ...(conEjemplos ? { ejemplos: 'si' } : {}),
    ...Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '')),
  };

  const consulta = useInfiniteQuery({
    queryKey: ['admin_los_clientes', entrada],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const respuesta = await cliente.consultar<LaLista>('admin_los_clientes', {
        ...entrada,
        desde: String(pageParam),
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
    getNextPageParam: (ultima, todas) =>
      ultima.hayMas ? todas.reduce((n, p) => n + p.clientes.length, 0) : undefined,
    placeholderData: (antes) => antes,
  });

  const primera = consulta.data?.pages[0];
  const clientes = consulta.data?.pages.flatMap((p) => p.clientes) ?? [];
  const cuantosFiltros =
    Object.values(filtros).filter((v) => v !== '').length + (conEjemplos ? 1 : 0);
  const esTotal = yo?.nivel === 'total';

  async function calcularAhora() {
    setCalculando(true);
    await cliente.ejecutar('admin_calcular_el_uso', {});
    setCalculando(false);
    await cache.invalidateQueries({ queryKey: ['admin_los_clientes'] });
  }

  function alOrdenar(clave: string) {
    setOrden((antes) =>
      antes.clave === clave
        ? { clave: antes.clave, sentido: antes.sentido === 'asc' ? 'desc' : 'asc' }
        : { clave: clave as Orden, sentido: clave === 'nombre' ? 'asc' : 'desc' },
    );
  }

  const columnas: readonly Columna<ClienteEnLista>[] = [
    {
      clave: 'nombre',
      titulo: 'Cliente',
      principal: true,
      ordenable: true,
      celda: (c) => (
        <button
          type="button"
          onClick={(evento) => {
            evento.stopPropagation();
            setAbierto(c.organizacionId);
          }}
          aria-label={`Abrir ${c.nombre}`}
          className="flex w-full max-w-[18rem] min-w-0 flex-col text-left"
        >
          <span className="truncate font-medium">{c.nombre}</span>
          <span className="truncate text-secundario text-texto-suave">
            {c.codigo}
            {c.esEjemplo ? ' · de ejemplo' : ''}
          </span>
        </button>
      ),
    },
    {
      clave: 'contrato',
      titulo: 'Contrato',
      ordenable: true,
      celda: (c) => {
        const contrato = elContrato(c);
        return <Etiqueta tono={contrato.tono}>{contrato.texto}</Etiqueta>;
      },
    },
    {
      clave: 'actividad',
      titulo: 'Actividad',
      ordenable: true,
      celda: (c) => {
        const actividad = laActividad(c.actividad);
        return <Etiqueta tono={actividad.tono}>{actividad.texto}</Etiqueta>;
      },
    },
    { clave: 'alta', titulo: 'Alta', ordenable: true, celda: (c) => fechaCorta(c.alta) },
    {
      clave: 'ultimo_acceso',
      titulo: 'Último acceso',
      ordenable: true,
      celda: (c) => <span className="whitespace-nowrap">{cuandoEntro(c.diasSinEntrar)}</span>,
    },
    {
      clave: 'plan',
      titulo: 'Plan',
      celda: (c) => (c.plan === null ? '—' : (planPorCodigo(c.plan)?.nombre ?? c.plan)),
    },
    {
      clave: 'cuota',
      titulo: 'Cuota/mes',
      numerica: true,
      ordenable: true,
      celda: (c) => (c.cuotaAlMes === null ? '—' : conSimbolo(centimos(c.cuotaAlMes))),
    },
  ];

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex items-start justify-between gap-e3">
        <div className="min-w-0">
          <h1 className="text-pantalla font-semibold">Clientes</h1>
          {primera !== undefined && (
            <p className="text-secundario text-texto-suave">
              {primera.cobro.pagan === 1 ? '1 paga' : `${String(primera.cobro.pagan)} pagan`} ·{' '}
              {conSimbolo(centimos(primera.cobro.alMes))} al mes
              {primera.cobro.alAno > 0
                ? ` y ${conSimbolo(centimos(primera.cobro.alAno))} al año`
                : ''}
              , IVA incluido
            </p>
          )}
          {primera !== undefined && (
            <p className="flex flex-wrap items-center gap-x-e2 text-secundario text-texto-suave">
              <span>
                {primera.foto === null
                  ? 'La actividad todavía no se ha calculado'
                  : `Actividad del ${fechaCorta(primera.foto)}`}
              </span>
              {esTotal && (
                <button
                  type="button"
                  disabled={calculando}
                  onClick={() => {
                    void calcularAhora();
                  }}
                  className="inline-flex min-h-toque items-center font-medium text-texto hover:underline disabled:text-texto-suave"
                >
                  {calculando ? 'Calculando…' : 'Calcular ahora'}
                </button>
              )}
            </p>
          )}
        </div>
        {esTotal && (
          <Boton
            tono="secundario"
            icono={<IconoDescargar size={18} />}
            aria-label="Exportar"
            onClick={() => {
              setExportando(true);
            }}
          >
            {/* En el móvil, solo el icono: el título y lo que se cobra caben al lado. */}
            <span className="hidden sm:inline">Exportar</span>
          </Boton>
        )}
      </div>

      <Vistas
        vistas={PESTANAS.map((p) => ({
          id: p.id,
          nombre:
            primera === undefined ? p.nombre : `${p.nombre} · ${String(primera.porPestana[p.id])}`,
        }))}
        activa={pestana}
        acento="var(--color-naranja)"
        de="Clientes"
        alElegir={(id) => {
          setPestana(id as Pestana);
        }}
      />

      <div className="flex flex-col gap-e3">
        <div className="flex items-end gap-e2">
          <div className="min-w-0 flex-1">
            <Campo
              etiqueta="Buscar"
              tipo="texto"
              name="buscar"
              value={escrito}
              placeholder="Nombre, correo o teléfono"
              delante={<IconoBuscar size={18} />}
              onChange={(evento) => {
                setEscrito(evento.target.value);
              }}
            />
          </div>
          <Boton
            tono={cuantosFiltros > 0 ? 'principal' : 'secundario'}
            icono={<IconoFiltros size={18} />}
            aria-expanded={verFiltros}
            aria-label={
              cuantosFiltros > 0 ? `Filtros, ${String(cuantosFiltros)} puestos` : 'Filtros'
            }
            onClick={() => {
              setVerFiltros((antes) => !antes);
            }}
          >
            {/* En el móvil, el icono y cuántos hay: el buscador se queda con el ancho. */}
            <span className="hidden sm:inline">Filtros</span>
            {cuantosFiltros > 0 && <span> · {cuantosFiltros}</span>}
          </Boton>
        </div>

        {verFiltros && (
          <div className="grid grid-cols-1 gap-e3 rounded-grande bg-superficie p-e4 shadow-s1 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(OPCIONES) as (keyof Filtros)[]).map((clave) => (
              <Selector
                key={clave}
                etiqueta={OPCIONES[clave].etiqueta}
                sinElegir="Todos"
                opciones={OPCIONES[clave].opciones}
                value={filtros[clave]}
                onChange={(evento) => {
                  const valor = evento.target.value;
                  setFiltros((antes) => ({ ...antes, [clave]: valor }));
                }}
              />
            ))}
            <div className="md:hidden">
              <Selector
                etiqueta="Ordenar"
                opciones={ORDENES}
                value={`${orden.clave}:${orden.sentido}`}
                onChange={(evento) => {
                  const [clave, sentido] = evento.target.value.split(':');
                  setOrden({ clave: clave as Orden, sentido: sentido === 'asc' ? 'asc' : 'desc' });
                }}
              />
            </div>
            <div className="flex items-end">
              <Interruptor
                etiqueta="Con los de ejemplo"
                puesto={conEjemplos}
                alCambiar={setConEjemplos}
              />
            </div>
            {cuantosFiltros > 0 && (
              <div className="flex items-end">
                <Boton
                  tono="texto"
                  onClick={() => {
                    setFiltros(SIN_FILTROS);
                    setConEjemplos(false);
                  }}
                >
                  Quitar los filtros
                </Boton>
              </div>
            )}
          </div>
        )}
      </div>

      {consulta.isPending ? (
        <Cargando que="los clientes" lineas={6} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : (
        <Tarjeta
          titulo={primera?.total === 1 ? '1 cliente' : `${String(primera?.total ?? 0)} clientes`}
        >
          <Tabla
            titulo="Clientes de Estook"
            filas={clientes}
            claveDe={(c) => c.organizacionId}
            nombreDeLaFila={(c) => c.nombre}
            alPulsar={(c) => {
              setAbierto(c.organizacionId);
            }}
            orden={orden}
            alOrdenar={alOrdenar}
            filaCompacta={(c) => {
              const contrato = elContrato(c);
              const actividad = laActividad(c.actividad);
              return (
                <span className="flex flex-col gap-e1 py-e1">
                  <span className="flex items-center justify-between gap-e2">
                    <span className="truncate font-medium">{c.nombre}</span>
                    <span className="shrink-0 text-secundario">
                      {c.cuotaAlMes === null ? '' : conSimbolo(centimos(c.cuotaAlMes))}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-e2">
                    <Etiqueta tono={contrato.tono}>{contrato.texto}</Etiqueta>
                    <Etiqueta tono={actividad.tono}>{actividad.texto}</Etiqueta>
                    <span className="text-secundario text-texto-suave">
                      {cuandoEntro(c.diasSinEntrar)}
                    </span>
                  </span>
                </span>
              );
            }}
            cuandoNoHay={
              <p className="py-e4 text-center text-texto-suave">
                {buscar === '' && cuantosFiltros === 0
                  ? 'Todavía no hay clientes aquí.'
                  : 'Nadie con eso.'}
              </p>
            }
            columnas={columnas}
          />
          {consulta.hasNextPage && (
            <div className="flex justify-center pt-e3">
              <Boton
                tono="secundario"
                cargando={consulta.isFetchingNextPage}
                textoCargando="Cargando"
                onClick={() => {
                  void consulta.fetchNextPage();
                }}
              >
                Ver más
              </Boton>
            </div>
          )}
        </Tarjeta>
      )}

      {abierto !== null && (
        <FichaDelCliente
          organizacionId={abierto}
          alCerrar={() => {
            setAbierto(null);
          }}
        />
      )}
      {exportando && (
        <Exportar
          entrada={entrada}
          alCerrar={() => {
            setExportando(false);
          }}
        />
      )}
    </div>
  );
}

// ── Exportar ─────────────────────────────────────────────────────────────────

/**
 * Exportar lo que se ve, con el código otra vez: sacar un CSV con los correos de
 * todos los clientes es lo más delicado del panel, y queda en la auditoría.
 */
function Exportar({
  entrada,
  alCerrar,
}: {
  readonly entrada: Record<string, string>;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ csv: string; cuantos: number; dia: string }>(
      'admin_exportar_los_clientes',
      { ...entrada, codigo },
    );
    setEnviando(false);
    setCodigo('');
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    descargar(respuesta.datos.csv, respuesta.datos.dia);
    alCerrar();
  }

  return (
    <Hoja abierta titulo="Exportar los clientes" alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <p className="text-secundario text-texto-suave">
          Lo que ves en la lista, con sus filtros, en un CSV que abre Excel. Queda apuntado en la
          auditoría.
        </p>
        <Campo
          etiqueta="Tu código, otra vez"
          tipo="pin"
          name="codigo"
          value={codigo}
          autoFocus
          onChange={(evento) => {
            setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          obligatorio
        />
        {error !== null && <ErrorEnCristiano error={error} />}
        <Botones>
          <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Exportando">
            Descargar el CSV
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}

/** El CSV, con la marca que le dice a Excel que es UTF-8: sin ella, «Mesón» sale roto. */
function descargar(csv: string, dia: string): void {
  // La marca va escrita con su número: pegada tal cual, no se ve y el lint la toma por un espacio raro.
  const marca = String.fromCharCode(0xfeff);
  const enlace = document.createElement('a');
  const url = URL.createObjectURL(new Blob([marca, csv], { type: 'text/csv;charset=utf-8' }));
  enlace.href = url;
  enlace.download = `clientes-estook-${dia}.csv`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
