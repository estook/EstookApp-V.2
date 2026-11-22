import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CUANTOS_SE_ESCAPAN_A_LA_VISTA,
  LO_POCO_QUE_SE_ESCAPA,
  MARGEN_DE_LO_QUE_SE_ESCAPA,
  MARGEN_DEL_FOOD_COST,
  comoPorcentaje,
  comoSeDiceElTipo,
} from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Segmentado,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero, conUnidadDeUso } from './contrato.ts';
import {
  diaCorto,
  type ElFoodCostDeLosEscandallos,
  type ElFoodCostReal,
  type LaDesviacion,
  type LoQueSeEscapaEnElAlmacen,
  type ProductoGastado,
  type ProductoQueSeEscapa,
} from './contratoDeLaDesviacion.ts';

/**
 * Almacén · Movimientos · Consumo (M8 · 0079; desde el 9-oct, 0080).
 *
 * De arriba abajo:
 *
 *   · **El food cost real**: de cada 100 € que se venden sin IVA, cuántos se van en
 *     género. Por semana, mes o trimestre (la pausa del 8-nov, 0142), o entre los dos
 *     últimos inventarios, frente a tu objetivo, con flechas para ir atrás. Con Estook
 *     TPV, **junto al de tus escandallos** y la diferencia (M20 · 2, 0151).
 *   · **Lo que se escapa**, con Estook TPV: los productos que se salen del margen entre
 *     los dos últimos inventarios, como mucho tres (M20 · 2, 0151).
 *   · **Lo gastado de verdad**, de cada producto contado dos veces. Con lo que se escapa
 *     encima, va plegado: es el detalle, no la respuesta.
 *
 * ── Por qué ya no hay «Lo que se vende tal cual» (Richi eligió la A, 9-oct) ──────
 *
 * Esto se llamaba «Desviación» y comparaba lo que salía de la cámara con lo que
 * vendía la caja, emparejando a mano cada línea de la caja con su producto. Richi:
 * «es ambiguo y liante para los hosteleros». Tenía razón por tres lados: pedía
 * emparejar también el chuletón y el atún, que van en varios platos; solo sirve si
 * la caja dice qué se vendió línea a línea, y hoy eso es teclearlo al cerrar; y
 * suma trabajo a quien no lo va a hacer.
 *
 * Así que aquí queda **lo que sale sin trabajo de más**: es la cuenta del consumo
 * que hace cualquier gestoría (existencias iniciales + compras − existencias
 * finales). El servidor sigue sabiendo emparejar (`emparejar_concepto`, la tabla
 * `concepto_de_caja`): vuelve a la pantalla cuando la caja traiga las ventas sola,
 * con Estook TPV. Y la desviación de los platos, con sus fichas (M9).
 */
export function Consumo() {
  const { permisos } = usarSesion();
  const cierra = puedeEditar(permisos, 'accion.cerrar_recuento');
  const conDinero =
    puedeVer(permisos, 'dato.ventas') && puedeVer(permisos, 'dato.precio_de_compra');
  const lectura = usarLectura<LaDesviacion>('la_desviacion', {}, cierra);

  if (!cierra) {
    return (
      <Tarjeta titulo="Consumo">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="El consumo lo ve quien cierra los inventarios."
          sinAccionPorque="Tu acceso no incluye cerrar inventarios."
        />
      </Tarjeta>
    );
  }

  if (lectura.isPending) return <Cargando que="lo gastado de verdad" forma="cifra" alto />;
  const datos = lectura.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido calcularlo">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }

  const seEscapa = datos.seEscapa ?? null;
  return (
    <div className="flex flex-col gap-e4">
      {conDinero && <FoodCostReal />}
      {seEscapa !== null && <LoQueSeEscapa datos={seEscapa} />}
      <LoGastado datos={datos} plegado={seEscapa !== null} />
    </div>
  );
}

// ── El food cost real ───────────────────────────────────────────────────────

const NOMBRE_DEL_SEMAFORO: Readonly<Record<ElFoodCostReal['semaforo'], string>> = {
  verde: 'En objetivo',
  ambar: 'Algo por encima',
  rojo: 'Por encima',
  sin_dato: 'Sin objetivo',
};

const TONO_DEL_SEMAFORO = {
  verde: 'bien',
  ambar: 'atencion',
  rojo: 'mal',
  sin_dato: 'neutro',
} as const;

type PeriodoDelFoodCost = ElFoodCostReal['periodo'];

const NOMBRE_DEL_PERIODO: Readonly<Record<PeriodoDelFoodCost, string>> = {
  semana: 'Semana',
  mes: 'Mes',
  trimestre: 'Trimestre',
  inventarios: 'Inventarios',
};

/**
 * El día que se mira, movido un periodo hacia atrás o hacia delante. Es el día de referencia
 * y no «cuántos atrás»: el servidor saca de él la semana, el mes o el trimestre (0142).
 */
function moverElDia(dia: string, periodo: PeriodoDelFoodCost, paso: -1 | 1): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  if (periodo === 'semana') {
    return new Date(Date.UTC(a, m - 1, d + 7 * paso)).toISOString().slice(0, 10);
  }
  const meses = periodo === 'trimestre' ? 3 : 1;
  return new Date(Date.UTC(a, m - 1 + meses * paso, 15)).toISOString().slice(0, 10);
}

function FoodCostReal() {
  const navegar = useNavigate();
  // El título no cambia con el periodo: con Estook TPV, son dos (el real y el de tus escandallos).
  const [periodo, setPeriodo] = useState<PeriodoDelFoodCost | ''>('');
  const [dia, setDia] = useState<string | null>(null);
  const lectura = usarLectura<ElFoodCostReal>('el_food_cost_real', {
    ...(periodo === '' ? {} : { periodo }),
    ...(dia === null || periodo === '' || periodo === 'inventarios'
      ? {}
      : periodo === 'semana'
        ? { dia }
        : { mes: dia.slice(0, 7) }),
  });

  const f = lectura.data;
  const elegido: PeriodoDelFoodCost = periodo === '' ? (f?.periodo ?? 'mes') : periodo;
  const conFlechas = elegido !== 'inventarios' && f !== undefined;
  const hayDespues = f !== undefined && f.hasta < f.hoy;

  function mover(paso: -1 | 1) {
    if (f === undefined) return;
    setPeriodo(elegido);
    setDia(moverElDia(dia ?? f.hoy, elegido, paso));
  }

  return (
    <Tarjeta
      titulo={f?.escandallos == null ? 'Food cost real' : 'Food cost'}
      origen="(lo que había + lo comprado − lo que queda) ÷ lo vendido sin IVA"
    >
      <div className="flex flex-col gap-e3">
        <div className="flex flex-wrap items-center gap-e2">
          <Segmentado
            etiqueta="Periodo"
            opciones={(['semana', 'mes', 'trimestre', 'inventarios'] as const)
              .filter((p) => p !== 'inventarios' || (f !== undefined && f.inventarios !== null))
              .map((p) => ({ valor: p, texto: NOMBRE_DEL_PERIODO[p] }))}
            valor={elegido}
            alElegir={(p) => {
              setPeriodo(p);
              setDia(null);
            }}
          />
          {conFlechas && (
            <div className="flex items-center gap-e1">
              <Boton
                tono="texto"
                icono={<IconoFlechaIzquierda size={18} />}
                aria-label="El periodo anterior"
                onClick={() => {
                  mover(-1);
                }}
              />
              <Boton
                tono="texto"
                icono={<IconoFlechaDerecha size={18} />}
                aria-label="El periodo siguiente"
                disabled={!hayDespues}
                onClick={() => {
                  mover(1);
                }}
              />
            </div>
          )}
        </div>

        {lectura.isPending ? (
          <p className="text-secundario text-texto-suave">Calculando…</p>
        ) : f === undefined ? (
          <Aviso tono="mal" titulo="No he podido calcularlo">
            Elige otro periodo, o vuelve a intentarlo.
          </Aviso>
        ) : (
          <>
            {/*
              ── Un gasto en negativo no es un gasto (9-oct) ─────────────────────
              En IKATZ salía «−27,96 € en género»: queda más de lo que había y entró. No
              es que se gastara menos que nada: es que algo entró sin apuntarse, o que
              se corrigió este mes un error del anterior (unas ventas de septiembre
              anuladas en octubre). Se dice eso, y no se da un porcentaje que no existe.
            */}
            {f.consumoRealCentimos < 0 && (
              <Aviso
                tono="atencion"
                titulo="No cuadra: queda más de lo que había y entró"
                accion={
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      navegar('/almacen/movimientos/historial');
                    }}
                  >
                    Ver el historial
                  </Boton>
                }
              >
                Suele ser una entrada sin apuntar, o un error de otro mes corregido en este.
              </Aviso>
            )}
            {f.escandallos == null ? (
              <>
                <div className="flex flex-wrap items-baseline gap-e3">
                  {f.real !== null && f.consumoRealCentimos >= 0 && (
                    <p className="text-titulo font-semibold tabular-nums">{enPorcentaje(f.real)}</p>
                  )}
                  {f.real !== null && f.consumoRealCentimos >= 0 && <ElSemaforo f={f} />}
                  <span className="text-secundario text-texto-suave">
                    Del {diaCorto(f.desde)} al {diaCorto(f.hasta)}
                  </span>
                </div>
                <p className={f.consumoRealCentimos < 0 ? 'hidden' : 'text-secundario'}>
                  {f.ventasSinImpuestoCentimos === null
                    ? `${comoDinero(f.consumoRealCentimos)} en género. Sin ventas en la caja, todavía no hay porcentaje.`
                    : `${comoDinero(f.consumoRealCentimos)} en género, de ${comoDinero(f.ventasSinImpuestoCentimos)} vendidos sin IVA.`}
                </p>
              </>
            ) : (
              <LosDosFoodCost f={f} escandallos={f.escandallos} />
            )}
            {f.faltanDiasDeCaja > 0 && (
              <Aviso tono="atencion" titulo={`Faltan ${diasEnLetra(f.faltanDiasDeCaja)} de caja`}>
                No es exacto: lo vendido esos días no está. Ciérralos en Servicio y sale entero.
              </Aviso>
            )}
            {f.tipoDeImpuesto === null && (
              <Aviso tono="atencion" titulo="No sé qué impuesto quitarle a tus ventas">
                Mira el régimen fiscal del local en Ajustes.
              </Aviso>
            )}
            <details className="text-secundario text-texto-suave">
              <summary className="cursor-pointer">Cómo sale</summary>
              <ul className="mt-e2 flex flex-col gap-e1 tabular-nums">
                <li>Había {comoDinero(f.habiaCentimos)}</li>
                <li>+ Compraste {comoDinero(f.comprasCentimos - (f.deAltaCentimos ?? 0))}</li>
                {(f.deAltaCentimos ?? 0) !== 0 && (
                  <li>
                    + Lo que había al dar de alta productos {comoDinero(f.deAltaCentimos ?? 0)}
                  </li>
                )}
                <li>− Queda {comoDinero(f.quedaCentimos)}</li>
                {f.aparteCentimos !== 0 && (
                  <li>− Comida del personal e invitaciones {comoDinero(f.aparteCentimos)}</li>
                )}
                {f.traspasosCentimos !== 0 && (
                  <li>− A otro local {comoDinero(f.traspasosCentimos)}</li>
                )}
                <li>
                  = <strong>{comoDinero(f.consumoRealCentimos)}</strong> gastados
                </li>
                <li>
                  Vendido: {comoDinero(f.ventasConImpuestoCentimos)} con IVA
                  {f.tipoDeImpuesto === null || f.ventasSinImpuestoCentimos === null
                    ? ''
                    : `, ${comoDinero(f.ventasSinImpuestoCentimos)} sin el ${comoSeDiceElTipo(f.tipoDeImpuesto)}`}
                  . {f.diasDelPeriodo - f.faltanDiasDeCaja} de {f.diasDelPeriodo} días con la caja
                  cerrada.
                </li>
                <li>
                  {f.contados === 0
                    ? 'Nada contado en el periodo: lo que queda sale del libro. Con un inventario, sale de verdad.'
                    : `Contados en el periodo: ${String(f.contados)} de ${String(f.productos)} productos${f.parteContada === null ? '' : `, el ${comoPorcentaje(f.parteContada)} del valor`}. Lo demás, según el libro.`}
                </li>
                {f.soloSusZonas && <li>Solo lo de tus zonas.</li>}
                {f.escandallos == null ? (
                  <li>
                    {f.soloSusZonas
                      ? 'El de tus escandallos no sale: sería de todo el local, y esto es de tus zonas.'
                      : 'Al vender con Estook TPV, sale aquí también el food cost de tus escandallos.'}
                  </li>
                ) : (
                  <ComoSaleElDeLosEscandallos f={f} escandallos={f.escandallos} />
                )}
              </ul>
            </details>
          </>
        )}
      </div>
    </Tarjeta>
  );
}

function diasEnLetra(cuantos: number): string {
  return cuantos === 1 ? '1 día' : `${String(cuantos)} días`;
}

/** «31,1 %»: el food cost ya llega con un decimal. */
function enPorcentaje(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')} %`;
}

/** «3,5 puntos», sin signo: el texto dice si es por encima o por debajo. */
function enPuntos(valor: number): string {
  const n = Math.abs(valor);
  return `${n.toFixed(1).replace('.', ',')} ${n === 1 ? 'punto' : 'puntos'}`;
}

function ElSemaforo({ f }: { readonly f: ElFoodCostReal }) {
  return (
    <Etiqueta tono={TONO_DEL_SEMAFORO[f.semaforo]}>
      {NOMBRE_DEL_SEMAFORO[f.semaforo]}
      {f.objetivo === null ? '' : ` · objetivo ${comoSeDiceElTipo(f.objetivo)}`}
    </Etiqueta>
  );
}

// ── El real y el de tus escandallos (M20 · 2, 0151) ─────────────────────────

/**
 * Las dos cifras lado a lado, una barra con lo que piden los escandallos y la diferencia, y una
 * frase con lo que quiere decir. Hasta `MARGEN_DEL_FOOD_COST` puntos es lo normal.
 */
function LosDosFoodCost({
  f,
  escandallos,
}: {
  readonly f: ElFoodCostReal;
  readonly escandallos: ElFoodCostDeLosEscandallos;
}) {
  const conReal = f.real !== null && f.consumoRealCentimos >= 0;
  return (
    <div className="flex flex-col gap-e3">
      <span className="text-secundario text-texto-suave">
        Del {diaCorto(f.desde)} al {diaCorto(f.hasta)}
      </span>
      <div className="grid grid-cols-1 gap-e2 sm:grid-cols-2">
        <div className="flex flex-col items-start gap-e1 rounded-medio bg-fondo p-e3">
          <span className="text-etiqueta font-semibold text-texto-suave">Real</span>
          <span className="text-titulo font-semibold tabular-nums">
            {conReal ? enPorcentaje(f.real) : '—'}
          </span>
          <span className="text-etiqueta tabular-nums text-texto-tenue">
            {!conReal || f.ventasSinImpuestoCentimos === null
              ? 'Sin ventas en la caja, todavía no hay porcentaje.'
              : `${comoDinero(f.consumoRealCentimos)} en género de ${comoDinero(f.ventasSinImpuestoCentimos)}`}
          </span>
          {conReal && <ElSemaforo f={f} />}
        </div>
        <div className="flex flex-col items-start gap-e1 rounded-medio bg-fondo p-e3">
          <span className="text-etiqueta font-semibold text-texto-suave">
            Según tus escandallos
          </span>
          <span className="text-titulo font-semibold tabular-nums">
            {enPorcentaje(escandallos.teorico)}
          </span>
          <span className="text-etiqueta tabular-nums text-texto-tenue">
            {escandallos.parteConEscandallo >= 1
              ? 'Con todo lo vendido'
              : `Con el ${comoPorcentaje(escandallos.parteConEscandallo)} de lo vendido`}
          </span>
        </div>
      </div>
      {conReal && <LaBarra real={f.real} teorico={escandallos.teorico} />}
      <ElVeredicto escandallos={escandallos} />
    </div>
  );
}

/** Lo que piden los escandallos, y la diferencia hasta el real. */
function LaBarra({ real, teorico }: { readonly real: number; readonly teorico: number }) {
  // Con aire por la derecha: la cifra más alta llega al 80 % de la barra.
  const tope = Math.max(real, teorico, 1) / 0.8;
  const enLaBarra = (valor: number) => `${((Math.max(valor, 0) / tope) * 100).toFixed(1)}%`;
  const porEncima = real > teorico;
  return (
    <div className="flex flex-col gap-e1">
      <div
        role="img"
        aria-label={`Real ${enPorcentaje(real)}; según tus escandallos ${enPorcentaje(teorico)}`}
        className="relative h-[10px] rounded-redondo bg-fondo"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-redondo bg-info/35"
          style={{ width: enLaBarra(porEncima ? teorico : real) }}
        />
        {porEncima && (
          <span
            className="absolute inset-y-0 rounded-redondo bg-atencion"
            style={{ left: enLaBarra(teorico), width: enLaBarra(real - teorico) }}
          />
        )}
      </div>
      <p className="flex flex-wrap gap-e3 text-etiqueta text-texto-suave">
        <span className="inline-flex items-center gap-e1">
          <span aria-hidden className="h-[10px] w-[10px] rounded-chico bg-info/35" />
          Lo que piden tus escandallos
        </span>
        {porEncima && (
          <span className="inline-flex items-center gap-e1">
            <span aria-hidden className="h-[10px] w-[10px] rounded-chico bg-atencion" />
            La diferencia
          </span>
        )}
      </p>
    </div>
  );
}

/** Una frase: cuadra, se va de más o se gasta menos de lo que piden los escandallos. */
function ElVeredicto({ escandallos }: { readonly escandallos: ElFoodCostDeLosEscandallos }) {
  const { puntos, centimos, dentroDeLoNormal } = escandallos;
  if (puntos === null || dentroDeLoNormal === null) return null;
  if (dentroDeLoNormal) {
    return (
      <Aviso tono="bien" titulo="Cuadra con tus escandallos">
        {puntos === 0
          ? 'Clavado.'
          : `${enPuntos(puntos)} de diferencia. Hasta ${String(MARGEN_DEL_FOOD_COST)} es lo normal.`}
      </Aviso>
    );
  }
  if (puntos > 0) {
    return (
      <Aviso
        tono="atencion"
        titulo={`${enPuntos(puntos)} por encima: ${comoDinero(centimos)} de más`}
      >
        Es lo que se tira y lo que se escapa. Hasta {MARGEN_DEL_FOOD_COST} puntos es lo normal.
      </Aviso>
    );
  }
  return (
    <Aviso tono="info" titulo={`${enPuntos(puntos)} por debajo de tus escandallos`}>
      Tus escandallos piden más de lo que se gasta, o entró género sin apuntar.
    </Aviso>
  );
}

/** Las líneas de «Cómo sale» del de tus escandallos: cada cifra, de dónde viene. */
function ComoSaleElDeLosEscandallos({
  f,
  escandallos,
}: {
  readonly f: ElFoodCostReal;
  readonly escandallos: ElFoodCostDeLosEscandallos;
}) {
  const sinEscandallo = escandallos.ventas - escandallos.ventasConCoste;
  return (
    <>
      <li>
        Según tus escandallos: {comoDinero(escandallos.coste)} de coste en{' '}
        {comoDinero(escandallos.ventasConCoste)} vendidos con escandallo ={' '}
        {enPorcentaje(escandallos.teorico)}.
      </li>
      {sinEscandallo > 0 && (
        <li>
          Los {comoDinero(sinEscandallo)} de platos sin escandallo no cuentan: no se sabe qué
          llevan.
        </li>
      )}
      {escandallos.centimos !== null && f.ventasSinImpuestoCentimos !== null && (
        <li>
          Diferencia: {comoDinero(f.consumoRealCentimos)} −{' '}
          {comoDinero(f.consumoRealCentimos - escandallos.centimos)}, lo que pedirían tus
          escandallos para {comoDinero(f.ventasSinImpuestoCentimos)}, ={' '}
          {comoDinero(escandallos.centimos)}.
        </li>
      )}
    </>
  );
}

// ── Lo que se escapa (M20 · 2, 0151) ────────────────────────────────────────

const POR_QUE_PUEDE_SER = [
  'Raciones más grandes que el escandallo.',
  'Comida del personal o invitaciones sin apuntar.',
  'Algo tirado sin apuntarlo como merma.',
  'Un error al contar o al recibir.',
] as const;

/**
 * Los productos que se salen del margen entre los dos últimos inventarios, el que más dinero se
 * lleva primero y como mucho tres. Si no hay ninguno, lo dice en una línea; si faltan datos, dice
 * cuáles y lleva a completarlos. **Nunca dice quién**: eso está en el libro.
 */
function LoQueSeEscapa({ datos }: { readonly datos: LoQueSeEscapaEnElAlmacen }) {
  const navegar = useNavigate();
  const aLaVista = datos.seSalen.slice(0, CUANTOS_SE_ESCAPAN_A_LA_VISTA);
  const masDeLaCuenta = datos.seSalen.length - aLaVista.length;
  const dentro = datos.vigilados - datos.seSalen.length;
  const margen = `hasta un ${comoPorcentaje(MARGEN_DE_LO_QUE_SE_ESCAPA)} o ${String(LO_POCO_QUE_SE_ESCAPA / 100).replace('.', ',')} €`;

  const faltanEscandallos =
    datos.platosSinEscandallo > 0 ? (
      <Aviso
        tono="info"
        titulo={`${datos.platosSinEscandallo === 1 ? '1 plato se vendió' : `${String(datos.platosSinEscandallo)} platos se vendieron`} sin escandallo`}
        accion={
          <Boton
            tono="secundario"
            onClick={() => {
              navegar('/escandallos/escandallos/carta');
            }}
          >
            Ir a Escandallos
          </Boton>
        }
      >
        {datos.sinEscandallo.join(', ')}
        {datos.platosSinEscandallo > datos.sinEscandallo.length
          ? ` y ${String(datos.platosSinEscandallo - datos.sinEscandallo.length)} más`
          : ''}
        . Con su escandallo, se vigila todo.
      </Aviso>
    ) : null;

  if (datos.vigilados === 0) {
    return (
      <Tarjeta titulo="Lo que se escapa">
        {faltanEscandallos ?? (
          <EstadoVacio
            compacto
            dibujo="libro"
            titulo="Falta un inventario"
            frase="Con dos inventarios desde que vendes con Estook TPV, aquí sale lo que se escapa."
          />
        )}
      </Tarjeta>
    );
  }

  const elMasGrande = Math.max(
    ...aLaVista.map((p) => Math.abs(p.centimos ?? p.parte ?? 0)),
    Number.EPSILON,
  );

  return (
    <Tarjeta
      titulo="Lo que se escapa"
      {...(datos.seSalen.length > 0 ? { cuantos: datos.seSalen.length } : {})}
    >
      <div className="flex flex-col gap-e3">
        {datos.desde !== null && datos.hasta !== null && (
          <p className="text-secundario text-texto-suave">
            Entre los dos últimos inventarios: del {diaCorto(datos.desde)} al{' '}
            {diaCorto(datos.hasta)}.
          </p>
        )}
        {aLaVista.length === 0 ? (
          <Aviso tono="bien" titulo="Todo dentro del margen">
            Lo que se gastó cuadra con lo vendido y lo apuntado.
          </Aviso>
        ) : (
          <ul className="flex flex-col">
            {aLaVista.map((p) => (
              <ProductoQueFalta key={p.id} p={p} elMasGrande={elMasGrande} />
            ))}
          </ul>
        )}
        {masDeLaCuenta > 0 && (
          <p className="text-etiqueta text-texto-tenue">
            {masDeLaCuenta === 1
              ? 'Y 1 producto más, de menos dinero.'
              : `Y ${String(masDeLaCuenta)} productos más, de menos dinero.`}
          </p>
        )}
        {faltanEscandallos}
        <details className="text-secundario text-texto-suave">
          <summary className="cursor-pointer">
            {aLaVista.length > 0 ? 'Por qué puede ser' : 'Cómo se mira'}
          </summary>
          <ul className="mt-e2 flex list-disc flex-col gap-e1 pl-e4">
            {aLaVista.length > 0 &&
              POR_QUE_PUEDE_SER.map((motivo) => <li key={motivo}>{motivo}</li>)}
            <li>
              Lo gastado entre los dos inventarios menos lo vendido, las mermas y lo sacado a mano.
            </li>
            <li>{dentroDelMargen(datos.seSalen.length, dentro, margen)}</li>
            {datos.aMedias > 0 && (
              <li>
                {datos.aMedias === 1
                  ? '1 producto no se mira esta vez: se vendieron platos sin escandallo.'
                  : `${String(datos.aMedias)} productos no se miran esta vez: se vendieron platos sin escandallo.`}
              </li>
            )}
          </ul>
        </details>
      </div>
    </Tarjeta>
  );
}

/** «Los otros 15 están dentro del margen: hasta un 5 % o 5 €.» */
function dentroDelMargen(seSalen: number, dentro: number, margen: string): string {
  if (dentro <= 0) return `Lo que cae dentro del margen no sale: ${margen}.`;
  if (seSalen === 0) {
    return dentro === 1
      ? `El producto vigilado está dentro del margen: ${margen}.`
      : `Los ${String(dentro)} productos vigilados están dentro del margen: ${margen}.`;
  }
  return dentro === 1
    ? `El otro está dentro del margen: ${margen}.`
    : `Los otros ${String(dentro)} están dentro del margen: ${margen}.`;
}

function ProductoQueFalta({
  p,
  elMasGrande,
}: {
  readonly p: ProductoQueSeEscapa;
  readonly elMasGrande: number;
}) {
  const conEuros = p.centimos !== undefined && p.centimos !== null;
  const peso = Math.abs(conEuros ? (p.centimos ?? 0) : (p.parte ?? 0)) / elMasGrande;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-e3 gap-y-e1 border-t border-borde py-e2 first:border-t-0 first:pt-0">
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{p.nombre}</span>
        <span className="text-etiqueta tabular-nums text-texto-tenue">
          Faltan {conUnidadDeUso(p.falta, p.unidadDeUso)} · debían salir{' '}
          {conUnidadDeUso(p.debiaSalir, p.unidadDeUso)}
          {p.parte === null ? '' : ` · ${comoPorcentaje(p.parte)}`}
        </span>
      </span>
      <span className="text-right font-semibold tabular-nums">
        {conEuros ? comoDinero(p.centimos) : p.parte === null ? '' : comoPorcentaje(p.parte)}
      </span>
      <span aria-hidden className="col-span-2 h-[5px] overflow-hidden rounded-redondo bg-fondo">
        <span
          className="block h-full rounded-redondo bg-atencion"
          style={{ width: `${(Math.min(peso, 1) * 100).toFixed(1)}%` }}
        />
      </span>
    </li>
  );
}

// ── Lo gastado de verdad ────────────────────────────────────────────────────

function LoGastado({
  datos,
  plegado,
}: {
  readonly datos: LaDesviacion;
  /** Con lo que se escapa encima, la tabla es el detalle: empieza plegada. */
  readonly plegado: boolean;
}) {
  // Lo que elige quien mira manda; sin elegir, plegada si hay lo que se escapa encima.
  const [elegido, setElegido] = useState<boolean | null>(null);
  const abierta = elegido ?? !plegado;
  const columnas: Columna<ProductoGastado>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      principal: true,
      celda: (p) => (
        <span className="flex flex-col">
          <span>{p.nombre}</span>
          <span className="text-etiqueta text-texto-tenue">
            Del {diaCorto(p.desde)} al {diaCorto(p.hasta)}
          </span>
        </span>
      ),
    },
    {
      clave: 'habia',
      titulo: 'Había',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.habia, p.unidadDeUso),
    },
    {
      clave: 'entro',
      titulo: 'Entró',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.entro, p.unidadDeUso),
    },
    {
      clave: 'queda',
      titulo: 'Queda',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.queda, p.unidadDeUso),
    },
    {
      clave: 'gastado',
      titulo: 'Gastado',
      numerica: true,
      celda: (p) => <strong>{conUnidadDeUso(p.gastado, p.unidadDeUso)}</strong>,
    },
    ...(datos.puedeVerPrecios
      ? [
          {
            clave: 'euros',
            titulo: 'En euros',
            numerica: true,
            celda: (p: ProductoGastado) => comoDinero(p.gastadoCentimos),
          },
        ]
      : []),
  ];

  return (
    <Tarjeta
      titulo="Lo gastado de verdad"
      pegado
      {...(datos.productos.length > 0 ? { cuantos: datos.productos.length } : {})}
      {...(plegado && datos.productos.length > 0
        ? {
            accion: (
              <Boton
                tono="texto"
                aria-expanded={abierta}
                onClick={() => {
                  setElegido(!abierta);
                }}
              >
                {abierta ? 'Ocultar' : 'Ver'}
              </Boton>
            ),
          }
        : {})}
    >
      {abierta || datos.productos.length === 0 ? (
        <Tabla
          titulo="Lo gastado de verdad, producto a producto"
          columnas={columnas}
          filas={datos.productos}
          claveDe={(p) => p.id}
          cuandoNoHay={
            <EstadoVacio
              compacto
              dibujo="libro"
              titulo="Hace falta contar dos veces"
              frase={
                datos.contadosUnaVez > 0
                  ? `${datos.contadosUnaVez === 1 ? '1 producto se ha contado' : `${String(datos.contadosUnaVez)} productos se han contado`} una vez: con el segundo inventario sale lo que se gastó de verdad.`
                  : 'Lo que había al contar + lo que entra − lo que hay al volver a contar. Empieza por un inventario.'
              }
            />
          }
        />
      ) : null}
    </Tarjeta>
  );
}
