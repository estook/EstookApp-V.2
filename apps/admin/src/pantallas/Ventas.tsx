import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cargando, ErrorEnCristiano, Grafica, Tarjeta, Vistas, clases } from '@estook/ui';
import { FalloDeLaApi } from '@estook/cliente-api';
import {
  CONTRA_QUE,
  NOMBRE_DEL_ORIGEN,
  NOMBRE_DEL_PERIODO,
  PERIODOS_DE_VENTAS,
  centimos,
  conSimbolo,
  enEuros,
  type PeriodoDeVentas,
  type TableroDeVentas,
} from '@estook/dominio';
import { fechaCorta } from '../datos/clientes.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Las ventas (A4 · decisión 0077): cómo va Estook como negocio, en una pantalla.
 *
 * Cuántos pagan, cuánto entra al mes, cuántos llegan y por dónde, cuántos se van y
 * qué vendedor trae clientes que se quedan. **Todo lo cuenta el servidor**: aquí solo
 * se pinta. El dinero, **sin IVA** (Richi, 1A); con él, al pasar por la cifra.
 *
 * Poco texto: cada cifra con su flecha, cada gráfica con la pregunta que contesta, y
 * lo que hay que hacer —quién se está yendo— a la vista.
 */

export type PestanaQueSeAbre = 'pagando' | 'prueba' | 'se_van' | 'baja';

const euros = (n: number) => conSimbolo(centimos(n));
/** En el eje, sin céntimos: «1.250 €». */
const eurosRedondos = (n: number) => `${enEuros(centimos(n)).split(',')[0] ?? '0'} €`;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const elMes = (mes: string) => {
  const [anio, m] = mes.split('-').map(Number) as [number, number];
  return `${MESES[m - 1] ?? ''} ${String(anio).slice(2)}`;
};
const elDia = (dia: string) => {
  const [, m, d] = dia.split('-').map(Number) as [number, number, number];
  return `${String(d)} ${MESES[m - 1] ?? ''}`;
};

export function Ventas({
  alVerClientes,
}: {
  readonly alVerClientes: (pestana: PestanaQueSeAbre) => void;
}) {
  const { cliente } = usarSesion();
  const [periodo, setPeriodo] = useState<PeriodoDeVentas>('mes');

  const consulta = useQuery({
    queryKey: ['admin_las_ventas', periodo],
    // Se vuelve a leer al entrar: un cobro o un alta no avisan aquí.
    staleTime: 0,
    queryFn: async () => {
      const respuesta = await cliente.consultar<TableroDeVentas>('admin_las_ventas', { periodo });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
    placeholderData: (antes) => antes,
  });
  const t = consulta.data;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-col gap-e3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-pantalla font-semibold">Ventas</h1>
          {t !== undefined && (
            <p className="text-secundario text-texto-suave">
              Sin IVA · {CONTRA_QUE[t.periodo]}
              {t.clientes.deLaCasa > 0 ? ' · sin contar lo de la casa' : ''}
            </p>
          )}
        </div>
        <Vistas
          vistas={PERIODOS_DE_VENTAS.map((p) => ({ id: p, nombre: NOMBRE_DEL_PERIODO[p] }))}
          activa={periodo}
          acento="var(--color-naranja)"
          de="Ventas"
          alElegir={(id) => {
            setPeriodo(id as PeriodoDeVentas);
          }}
        />
      </div>

      {consulta.isPending ? (
        <Cargando que="las ventas" lineas={6} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : t === undefined ? null : (
        <>
          {t.modo === 'prueba' && (
            <p
              role="note"
              className="rounded-grande bg-atencion-suave px-e4 py-e3 text-secundario text-atencion"
            >
              Stripe está en modo prueba: nada de esto es dinero de verdad.
            </p>
          )}
          <LasCifras t={t} alVerClientes={alVerClientes} />
          {t.seVanQuienes.length > 0 && (
            <SeEstanYendo
              quienes={t.seVanQuienes}
              alVerlos={() => {
                alVerClientes('se_van');
              }}
            />
          )}
          <LasGraficas t={t} />
        </>
      )}
    </div>
  );
}

// ── Las cifras ───────────────────────────────────────────────────────────────

/** La flecha frente al periodo anterior. Sin anterior, nada. El color acompaña, no manda. */
function Flecha({
  ahora,
  antes,
  dinero = false,
  alReves = false,
}: {
  readonly ahora: number;
  readonly antes: number | null;
  readonly dinero?: boolean;
  readonly alReves?: boolean;
}) {
  if (antes === null) return null;
  const diferencia = ahora - antes;
  if (diferencia === 0) {
    return <span className="text-etiqueta text-texto-suave">= igual</span>;
  }
  const sube = diferencia > 0;
  const bueno = sube !== alReves;
  const cuanto = dinero ? euros(Math.abs(diferencia)) : String(Math.abs(diferencia));
  return (
    <span
      className={clases('text-etiqueta font-semibold', bueno ? 'text-bien' : 'text-mal')}
      aria-label={`${sube ? 'Sube' : 'Baja'} ${cuanto}`}
    >
      {sube ? '▲' : '▼'} {cuanto}
    </span>
  );
}

function Cifra({
  que,
  valor,
  bajo,
  titulo,
  tono,
  alTocar,
}: {
  readonly que: string;
  readonly valor: string;
  readonly bajo?: ReactNode;
  /** Lo que sale al pasar por encima: el dinero con IVA. */
  readonly titulo?: string;
  readonly tono?: 'atencion' | null;
  readonly alTocar?: () => void;
}) {
  const dentro = (
    <>
      <span
        className={clases(
          'text-pantalla font-semibold tabular-nums leading-tight',
          tono === 'atencion' && valor !== '0' && 'text-atencion',
        )}
      >
        {valor}
      </span>
      <span className="text-secundario text-texto-suave">{que}</span>
      {bajo !== undefined && <span className="min-h-[1.25rem]">{bajo}</span>}
    </>
  );
  const caja =
    'flex min-w-0 flex-col gap-e1 rounded-mayor border border-borde bg-superficie p-e4 text-left [box-shadow:var(--sombra-tarjeta)]';
  return alTocar === undefined ? (
    <div className={caja} {...(titulo === undefined ? {} : { title: titulo })}>
      {dentro}
    </div>
  ) : (
    <button
      type="button"
      onClick={alTocar}
      className={clases(caja, 'hover:border-borde-fuerte')}
      aria-label={`${que}: ${valor}. Ver en Clientes`}
      {...(titulo === undefined ? {} : { title: titulo })}
    >
      {dentro}
    </button>
  );
}

function LasCifras({
  t,
  alVerClientes,
}: {
  readonly t: TableroDeVentas;
  readonly alVerClientes: (pestana: PestanaQueSeAbre) => void;
}) {
  const c = t.clientes;
  const d = t.dinero;
  const perdida =
    d.perdida.bajas === null || d.perdida.pagaban === null
      ? '—'
      : d.perdida.porcentaje !== null
        ? `${d.perdida.porcentaje.toLocaleString('es-ES')} %`
        : `${String(d.perdida.bajas)} de ${String(d.perdida.pagaban)}`;

  return (
    <div className="grid grid-cols-2 gap-e3 md:grid-cols-4">
      <Cifra
        que={c.enPausa > 0 ? `Pagando · ${String(c.enPausa)} en Pausa` : 'Pagando'}
        valor={String(c.pagando.ahora)}
        bajo={<Flecha ahora={c.pagando.ahora} antes={c.pagando.antes} />}
        alTocar={() => {
          alVerClientes('pagando');
        }}
      />
      <Cifra
        que="Entra al mes"
        valor={euros(d.cuotaAlMes.ahora)}
        titulo={`${euros(d.cuotaAlMes.conIva)} con IVA`}
        bajo={<Flecha ahora={d.cuotaAlMes.ahora} antes={d.cuotaAlMes.antes} dinero />}
      />
      <Cifra
        que="Cobrado"
        valor={euros(d.cobrado.ahora)}
        titulo={`${euros(d.cobrado.conIva)} con IVA, quitado lo devuelto`}
        bajo={<Flecha ahora={d.cobrado.ahora} antes={d.cobrado.antes} dinero />}
      />
      <Cifra
        que="Se están yendo"
        valor={String(c.seVan)}
        tono="atencion"
        alTocar={() => {
          alVerClientes('se_van');
        }}
      />
      <Cifra
        que="Altas"
        valor={String(c.altas.ahora)}
        bajo={<Flecha ahora={c.altas.ahora} antes={c.altas.antes} />}
      />
      <Cifra
        que="Bajas"
        valor={c.bajas.ahora === null ? '—' : String(c.bajas.ahora)}
        {...(c.bajas.ahora === null && t.fotosDesde === null
          ? { titulo: 'Las bajas se cuentan desde mañana' }
          : {})}
        bajo={
          c.bajas.ahora === null ? undefined : (
            <Flecha ahora={c.bajas.ahora} antes={c.bajas.antes} alReves />
          )
        }
      />
      <Cifra
        que="En prueba"
        valor={String(c.enPrueba.ahora)}
        bajo={<Flecha ahora={c.enPrueba.ahora} antes={c.enPrueba.antes} />}
        alTocar={() => {
          alVerClientes('prueba');
        }}
      />
      <Cifra
        que="Sin pagar"
        valor={String(c.sinPagar)}
        alTocar={() => {
          alVerClientes('baja');
        }}
      />
      <Cifra
        que="Pérdida de clientes"
        valor={perdida}
        titulo={
          perdida === '—'
            ? 'Sale cuando haya foto de la víspera del periodo'
            : 'Las bajas del periodo entre los que pagaban al empezarlo'
        }
        {...(d.perdida.cuota === null || d.perdida.cuota === 0
          ? {}
          : {
              bajo: (
                <span className="text-etiqueta text-mal">−{euros(d.perdida.cuota)} al mes</span>
              ),
            })}
      />
      <Cifra
        que="Conversión"
        valor={`${String(c.conversion.pagan)} de ${String(c.conversion.cuentas)}`}
        titulo="De las cuentas nuevas del periodo, las que han llegado a pagar"
      />
      <Cifra
        que="Retención"
        valor={
          c.retencion === null
            ? '—'
            : `${String(c.retencion.siguen)} de ${String(c.retencion.pagaban)}`
        }
        titulo={
          c.retencion === null
            ? 'Sale cuando haya foto de la víspera del periodo'
            : 'De los que pagaban al empezar el periodo, los que siguen pagando'
        }
      />
      <Cifra
        que="Abren un enlace"
        valor={String(t.embudo.visitas)}
        titulo="Las veces que se ha abierto el enlace o el QR de un vendedor"
      />
    </div>
  );
}

// ── Quién se está yendo ──────────────────────────────────────────────────────

function SeEstanYendo({
  quienes,
  alVerlos,
}: {
  readonly quienes: TableroDeVentas['seVanQuienes'];
  readonly alVerlos: () => void;
}) {
  const primeros = quienes.slice(0, 5);
  return (
    <Tarjeta titulo="Se están yendo" acento="var(--color-atencion)" cuantos={quienes.length}>
      <ul className="flex flex-col divide-y divide-borde">
        {primeros.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-e3 py-e2">
            <span className="truncate font-medium">{q.nombre}</span>
            <span className="shrink-0 text-secundario text-texto-suave">{q.porque}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={alVerlos}
        className="mt-e2 min-h-toque text-secundario font-medium text-texto underline-offset-4 hover:underline"
      >
        {quienes.length > primeros.length
          ? `Ver los ${String(quienes.length)} en Clientes`
          : 'Verlos en Clientes'}
      </button>
    </Tarjeta>
  );
}

// ── Las gráficas ─────────────────────────────────────────────────────────────

function Vacio({ children }: { readonly children: ReactNode }) {
  return <p className="py-e4 text-secundario text-texto-suave">{children}</p>;
}

function Leyenda({ piezas }: { readonly piezas: readonly { nombre: string; color: string }[] }) {
  return (
    <p className="flex flex-wrap gap-x-e3 gap-y-e1 text-etiqueta text-texto-suave">
      {piezas.map((p) => (
        <span key={p.nombre} className="inline-flex items-center gap-e1">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-full"
            style={{ background: p.color }}
          />
          {p.nombre}
        </span>
      ))}
    </p>
  );
}

/** Una barra de una lista: el nombre, su barra y su cifra. Sin librería: es una tabla. */
function Barras({
  filas,
  color,
}: {
  readonly filas: readonly { nombre: string; valor: number; detalle?: string }[];
  readonly color: string;
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-e2">
      {filas.map((f) => (
        <li key={f.nombre} className="flex flex-col gap-e1">
          <span className="flex items-baseline justify-between gap-e2 text-secundario">
            <span className="truncate">{f.nombre}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {String(f.valor)}
              {f.detalle === undefined ? (
                ''
              ) : (
                <span className="font-normal text-texto-suave"> · {f.detalle}</span>
              )}
            </span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-fondo">
            <span
              className="block h-full rounded-full"
              style={{ width: `${String((f.valor / maximo) * 100)}%`, background: color }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

const ALTAS = 'var(--color-bien)';
const BAJAS = 'var(--color-mal)';
const AMPLIADA = 'var(--color-info)';
const PAGANDO = 'var(--color-naranja)';
const NEUTRO = 'var(--color-borde-fuerte)';

function LasGraficas({ t }: { readonly t: TableroDeVentas }) {
  const s = t.series;
  const desde =
    t.fotosDesde === null
      ? 'Empieza a contar mañana, con la foto de esta noche.'
      : `Cuenta desde el ${fechaCorta(t.fotosDesde)}.`;
  const hayAltasOBajas = s.semanas.some((x) => x.altas > 0 || x.bajas > 0);
  // Un mes sin movimiento no se dibuja: con una sola foto, todo sería cero.
  const mesesConMovimiento = s.meses.filter(
    (m) => m.nueva > 0 || m.ampliada > 0 || m.perdida > 0 || m.reducida > 0,
  );
  // Una línea necesita dos puntos: con uno, se dice la cifra.
  const ultimaSemana = s.pagando.at(-1);

  const hayCuota = mesesConMovimiento.length > 0;
  const hayCohortes = s.cohortes.length > 0;

  return (
    <div className="flex flex-col gap-e3">
      {/*
        En mosaico: cada tarjeta del alto de lo que lleva. Una gráfica que todavía no
        tiene datos es una línea de texto, no un hueco del alto de su vecina.
      */}
      <div className="columns-1 gap-e3 md:columns-2 [&>*]:mb-e3 [&>*]:break-inside-avoid">
        <Tarjeta titulo="¿Crecemos o solo reponemos?">
          {hayAltasOBajas && (
            <Leyenda
              piezas={[
                { nombre: 'Altas', color: ALTAS },
                { nombre: 'Bajas', color: BAJAS },
              ]}
            />
          )}
          <Grafica
            titulo="Altas y bajas por semana, las últimas doce"
            forma="barras"
            eje="semana"
            datos={
              hayAltasOBajas
                ? s.semanas.map((x) => ({
                    semana: elDia(x.lunes),
                    altas: x.altas,
                    bajas: -x.bajas,
                  }))
                : []
            }
            series={[
              { clave: 'altas', nombre: 'Altas', color: ALTAS },
              { clave: 'bajas', nombre: 'Bajas', color: BAJAS },
            ]}
            formato={(v) => String(Math.abs(v))}
            cuandoNoHay={<Vacio>Ni altas ni bajas en las últimas doce semanas.</Vacio>}
          />
        </Tarjeta>

        <Tarjeta titulo="¿De dónde sale lo que entra al mes?">
          {hayCuota && (
            <Leyenda
              piezas={[
                { nombre: 'Nuevo', color: ALTAS },
                { nombre: 'Ampliado', color: AMPLIADA },
                { nombre: 'Perdido', color: BAJAS },
              ]}
            />
          )}
          <Grafica
            titulo="La cuota al mes, sin IVA: lo nuevo, lo ampliado y lo perdido de cada mes"
            forma="barras"
            eje="mes"
            datos={mesesConMovimiento.map((m) => ({
              mes: elMes(m.mes),
              nueva: m.nueva,
              ampliada: m.ampliada,
              perdida: -(m.perdida + m.reducida),
            }))}
            series={[
              { clave: 'nueva', nombre: 'Nuevo', color: ALTAS },
              { clave: 'ampliada', nombre: 'Ampliado', color: AMPLIADA },
              { clave: 'perdida', nombre: 'Perdido', color: BAJAS },
            ]}
            formato={(v) => eurosRedondos(Math.abs(v))}
            cuandoNoHay={
              <Vacio>{t.fotosDesde === null ? desde : `Sin cambios en la cuota. ${desde}`}</Vacio>
            }
          />
        </Tarjeta>

        <Tarjeta titulo="¿Cuántos pagan?">
          <Grafica
            titulo="Clientes pagando, al acabar cada semana"
            forma="lineas"
            eje="semana"
            datos={
              s.pagando.length < 2
                ? []
                : s.pagando.map((x) => ({ semana: elDia(x.lunes), pagando: x.pagando }))
            }
            series={[{ clave: 'pagando', nombre: 'Pagando', color: PAGANDO }]}
            cuandoNoHay={
              <Vacio>
                {ultimaSemana === undefined
                  ? desde
                  : `${String(ultimaSemana.pagando)} pagando esta semana. La línea sale con la segunda.`}
              </Vacio>
            }
          />
        </Tarjeta>

        <Tarjeta titulo="¿Los de qué mes aguantan peor?">
          {hayCohortes && (
            <Leyenda
              piezas={[
                { nombre: 'Llegaron', color: NEUTRO },
                { nombre: 'Siguen', color: ALTAS },
              ]}
            />
          )}
          <Grafica
            titulo="De los que llegaron cada mes, cuántos siguen pagando o probando"
            forma="barras"
            eje="mes"
            datos={s.cohortes.map((x) => ({ mes: elMes(x.mes), altas: x.altas, siguen: x.siguen }))}
            series={[
              { clave: 'altas', nombre: 'Llegaron', color: NEUTRO },
              { clave: 'siguen', nombre: 'Siguen', color: ALTAS },
            ]}
            cuandoNoHay={<Vacio>Todavía no ha llegado nadie en estos seis meses.</Vacio>}
          />
        </Tarjeta>

        <Tarjeta titulo="¿Quién trae clientes que se quedan?">
          {t.vendedores.length === 0 ? (
            <Vacio>Ningún vendedor ha traído a nadie ni tiene visitas todavía.</Vacio>
          ) : (
            <ul className="flex flex-col divide-y divide-borde">
              {t.vendedores.map((v) => (
                <li key={v.id} className="flex flex-col gap-e1 py-e2">
                  <span className="flex items-baseline justify-between gap-e2">
                    <span className="truncate font-medium">{v.nombre}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {euros(v.cuotaAlMes)}
                      <span className="font-normal text-texto-suave"> al mes</span>
                    </span>
                  </span>
                  <span className="text-secundario text-texto-suave">
                    {String(v.traidos)} {v.traidos === 1 ? 'traído' : 'traídos'} · {String(v.pagan)}{' '}
                    {v.pagan === 1 ? 'paga' : 'pagan'} · {String(v.visitas)}{' '}
                    {v.visitas === 1 ? 'visita' : 'visitas'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="¿Qué canal funciona?">
          {t.origenes.length === 0 ? (
            <Vacio>Ninguna cuenta nueva en este periodo.</Vacio>
          ) : (
            <Barras
              color={PAGANDO}
              filas={t.origenes.map((o) => ({
                nombre: NOMBRE_DEL_ORIGEN[o.origen],
                valor: o.altas,
              }))}
            />
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="¿Dónde se pierden?">
        <Barras
          color={ALTAS}
          filas={[
            { nombre: 'Abren el enlace de un vendedor', valor: t.embudo.visitas },
            {
              nombre: 'Crean la cuenta',
              valor: t.embudo.cuentas,
              detalle: `${String(t.embudo.conVendedor)} con vendedor`,
            },
            { nombre: 'Eligen plan', valor: t.embudo.eligieronPlan },
            { nombre: 'Pagan', valor: t.embudo.pagan },
          ]}
        />
      </Tarjeta>
    </div>
  );
}
