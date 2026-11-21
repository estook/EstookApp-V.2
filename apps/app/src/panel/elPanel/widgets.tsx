import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AVISAR_ANTES_DE_ENTRAR,
  alCentimo,
  NOMBRE_DEL_CANAL_DE_VENTA,
  minutosHasta,
  type CanalDeVentaDelPanel,
  type CifraDelSemaforo,
  type FormaDePago,
} from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import {
  Boton,
  Cargando,
  ElegirPeriodo,
  LaBaldosaDeLaSeccion,
  clases,
  elAcentoDelColor,
} from '@estook/ui';
import { usarElPeriodoDelWidget } from '../../ganchos/usarElPeriodoDelWidget.ts';
import {
  IconoAlmacen,
  IconoAnadir,
  IconoAtencion,
  IconoCarta,
  IconoChat,
  IconoCongelado,
  IconoCuenta,
  IconoCubiertos,
  IconoDinero,
  IconoEntrar,
  IconoEquipo,
  IconoEscandallos,
  IconoEstrella,
  IconoFlechaAbajo,
  IconoFlechaArriba,
  IconoNegocio,
  IconoOlla,
  IconoPrisa,
  IconoReloj,
  IconoReparto,
  IconoSalir,
  IconoTablon,
} from '@estook/iconos';
import { usarSesion } from '../../sesion/Sesion.tsx';
import { usarElIndicador } from '../../ganchos/usarElIndicador.ts';
import { usarMisObjetivos } from '../../ganchos/usarMisObjetivos.ts';
import { usarAlmacenHoy } from '../../ganchos/usarAlmacenHoy.ts';
import { usarElTablon } from '../../ganchos/usarElTablon.ts';
import { usarFichar } from '../../ganchos/usarFichar.ts';
import { BotonDePausa } from '../../equipo/BotonDePausa.tsx';
import { comoSeLeeLaHora, comoSeLeenMinutos, type FichajesDeHoy } from '../../equipo/contrato.ts';
import type { ComprasDeHoy } from '../../compras/contrato.ts';
import { conUnidadDeUso } from '../../almacen/contrato.ts';
import { comoSigueAgotado, type LosAgotados } from '../../carta/contrato.ts';
import type { QueHaCambiado } from '../../escandallos/contrato.ts';
import type { LoQueSeVende } from '../../servicio/contratoDeLoQueSeVende.ts';
import { LoQueVieneDelCalendario, TusAtajos } from './losDeAntes.tsx';
import { usarComoVaHoy, usarLoDelPanel } from '../../ganchos/usarLoDelPanel.ts';
import type { ComoVaHoy, ElMenuDeHoy, LosRecomendados } from './datos.ts';
import {
  BarraDeObjetivo,
  Cifra,
  Fila,
  GraficaDelPanel,
  Leyenda,
  LeyendaDeLaGrafica,
  Lista,
  MedioAnillo,
  NadaQueVer,
  Silueta,
  Tarjeta,
  Tendencia,
  conTip,
  conUnDecimal,
  entero,
  euros,
  eurosEnCorto,
  eurosConCentimos,
  partesDeLaCifra,
  porCiento,
  type PuntoDelPanel,
  type SentidoDeLaTendencia,
} from './piezas.tsx';

/**
 * Los widgets del Panel (el rediseño, entrega 3 · la maqueta aprobada, pestaña «El Panel»).
 *
 * Cada uno pide lo suyo al servidor —que lo cuenta, nunca la pantalla (regla 10)— y lo pinta como
 * la maqueta. **Y cada uno sabe cómo se ve el primer día** (la silueta, aceptada el 18-nov): lo
 * que habrá ahí y el paso que lo llena, con su botón. Nunca un cero que parece una cifra.
 *
 * Los mismos widgets van arriba, en los fijos de cada puesto, y abajo, en los añadidos: miden su
 * ancho (`@container`) y se ordenan solos.
 */
export function WidgetDelPanel({
  id,
  destacado = false,
}: {
  readonly id: string;
  readonly destacado?: boolean;
}) {
  switch (id) {
    case 'cifra-ventas':
      return <VentasDeHoy destacado={destacado} />;
    case 'cifra-tickets':
      return <Tickets destacado={destacado} />;
    case 'cifra-ticket-medio':
      return <TicketMedio destacado={destacado} />;
    case 'cifra-food-cost':
      return <FoodCost destacado={destacado} />;
    case 'cifra-merma':
      return <MermaDeLaSemana destacado={destacado} />;
    case 'cifra-compras':
      return <ComprasDeLaSemana destacado={destacado} />;
    case 'cifra-camara':
      return <LaCamaraVale destacado={destacado} />;
    case 'cifra-mesas':
      return <MesasAhoraCifra destacado={destacado} />;
    case 'cifra-espera':
      return <EsperaDeCocina destacado={destacado} />;
    case 'cifras-del-dia':
      return <LasCifrasDelDia />;
    case 'ventas-y-compras':
      return <VentasYCompras />;
    case 'cuando-se-vende':
      return <CuandoSeVende />;
    case 'lo-que-mas-sale':
      return <LoQueMasSale />;
    case 'por-secciones':
      return <PorSecciones />;
    case 'como-se-cobra':
      return <ComoSeCobra />;
    case 'mesas-ahora':
      return <MesasAhora />;
    case 'objetivos':
      return <Objetivos />;
    case 'almacen-pide':
      return <ElAlmacenPide />;
    case 'caducidades':
      return <CaducaPronto />;
    case 'bajo-minimo':
      return <BajoMinimo />;
    case 'repartos':
      return <Repartos />;
    case 'food-cost-y-merma':
      return <FoodCostYMerma />;
    case 'lo-que-se-escapa':
      return <LoQueSeEscapa />;
    case 'cocina-en-el-servicio':
      return <LaCocinaEnElServicio />;
    case 'agotados':
      return <Agotados />;
    case 'menu-del-dia':
      return <MenuDelDia />;
    case 'para-recomendar':
      return <ParaRecomendar />;
    case 'equipo-ahora':
      return <ElEquipoAhora titulo="El equipo ahora" />;
    case 'sala-ahora':
      return <ElEquipoAhora titulo="La sala ahora" />;
    case 'tu-dia':
      return <TuDia destacado={destacado} />;
    case 'mis-horas':
      return <MisHoras />;
    case 'tablon':
      return <ElTablon />;
    case 'atajos':
      return <Atajos />;
    case 'acciones-rapidas':
      return <TusAtajos />;
    case 'calendario':
      return <LoQueVieneDelCalendario />;
    case 'ventas-segun-canal':
      return <VentasSegunCanal />;
    default:
      return null;
  }
}

// ── Ayudas ──────────────────────────────────────────────────────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
const LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

function elDia(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

/** La letra del eje: la del día con siete; con treinta, el número cada cinco días y hoy. */
function elEje(fecha: string, i: number, cuantos: number): string {
  if (cuantos <= 7) return LETRA[elDia(fecha)] ?? '';
  return (cuantos - 1 - i) % 5 === 0 ? String(Number(fecha.slice(8, 10))) : '';
}

/** «miércoles» de «2026-11-18». */
function nombreDelDia(fecha: string): string {
  return DIAS[elDia(fecha)] ?? '';
}

/** «Miércoles 18». */
function diaConNumero(fecha: string): string {
  const nombre = nombreDelDia(fecha);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${String(Number(fecha.slice(8, 10)))}`;
}

/** «los miércoles», «los sábados». */
function losDias(fecha: string): string {
  const nombre = nombreDelDia(fecha);
  return `los ${nombre}${nombre.endsWith('s') ? '' : 's'}`;
}

/** Cuánto cambia en por ciento, con su signo: «+12 %». Nulo si no se puede comparar. */
function cuantoCambia(ahora: number | null, antes: number | null): number | null {
  if (ahora === null || antes === null || antes <= 0) return null;
  return ((ahora - antes) / antes) * 100;
}

function conSigno(n: number, cola: string): string {
  const redondo = conUnDecimal(n);
  const texto = String(Math.abs(redondo)).replace('.', ',');
  return `${redondo > 0 ? '+' : redondo < 0 ? '−' : '±'}${texto}${cola}`;
}

function conSignoEuros(centimos: number): string {
  return `${centimos > 0 ? '+' : centimos < 0 ? '−' : '±'}${eurosConCentimos(Math.abs(centimos))}`;
}

function minutos(n: number): string {
  return `${String(entero(n))}'`;
}

function usarPuede() {
  const { permisos } = usarSesion();
  return {
    ver: (p: Parameters<typeof puedeVer>[1]) => puedeVer(permisos, p),
    editar: (p: Parameters<typeof puedeEditar>[1]) => puedeEditar(permisos, p),
  };
}

/** La cifra de un widget de cifra: lo grande, la tendencia abajo, y lo que vaya en medio. */
function TarjetaDeCifra({
  titulo,
  icono,
  ir,
  destacado,
  leyendo,
  cifra,
  medio,
  tendencia,
}: {
  readonly titulo: string;
  readonly icono: ReactNode;
  readonly ir?: string;
  readonly destacado: boolean;
  readonly leyendo?: { readonly isError: boolean; readonly refetch: () => unknown };
  readonly cifra: ReactNode;
  readonly medio?: ReactNode;
  readonly tendencia?: ReactNode;
}) {
  return (
    // Sin la flecha de la esquina, como la maqueta: en una cifra cortaba el título («Ventas d…»).
    // A dónde lleva se dice al lector de pantalla con el título.
    <Tarjeta titulo={titulo} icono={icono} destacado={destacado} leyendo={leyendo} lleva={ir}>
      {cifra}
      {medio}
      {tendencia !== undefined && <div className="mt-auto pt-e2">{tendencia}</div>}
    </Tarjeta>
  );
}

function Cargandose({ que }: { readonly que: string }) {
  return <Cargando que={que} lineas={2} />;
}

// ── Ventas de hoy ───────────────────────────────────────────────────────────────

/**
 * **Ventas de hoy** (el destacado del gerente y del jefe de sala). Lo vendido, frente al mismo día
 * de la semana pasada **a esta misma hora**; el **objetivo de hoy** (el semanal repartido por días) y
 * **la semana**, con la rayita de dónde debería ir; y **la previsión al cierre**, con la curva de ese
 * día. Lo que contestó Richi el 21-nov.
 */
function VentasDeHoy({ destacado }: { readonly destacado: boolean }) {
  const consulta = usarComoVaHoy();
  const { yo } = usarSesion();
  const datos = consulta.data;
  const titulo = 'Ventas de hoy';
  if (datos === undefined) {
    return (
      <TarjetaDeCifra
        titulo={titulo}
        icono={<IconoNegocio />}
        destacado={destacado}
        leyendo={consulta}
        cifra={<Cargandose que="las ventas de hoy" />}
      />
    );
  }
  const { ventas, objetivo, prevision } = datos;
  const elOtro = nombreDelDia(ventas.elOtroDia);
  const comparar = datos.origen === 'tpv' ? ventas.aEstaHora : ventas.entero;
  const cambio = cuantoCambia(ventas.hoy, comparar);
  const conTpv = yo?.cuenta?.conEstookTpv === true;
  const [entera, centimos] = partesDeLaCifra(ventas.hoy ?? 0);

  return (
    <TarjetaDeCifra
      titulo={titulo}
      icono={<IconoNegocio />}
      ir="/negocio/ventas"
      destacado={destacado}
      leyendo={consulta}
      cifra={
        ventas.hoy === null && !conTpv ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno={centimos}>{entera}</Cifra>
        )
      }
      medio={
        <div className="mt-e2 flex flex-col gap-e2">
          {objetivo !== null && (
            <>
              <LineaDeObjetivo
                nombre="Hoy"
                parte={objetivo.hoy > 0 ? (ventas.hoy ?? 0) / objetivo.hoy : 0}
                texto={`${porCiento(objetivo.hoy > 0 ? ((ventas.hoy ?? 0) / objetivo.hoy) * 100 : 0, 0)} de ${euros(objetivo.hoy)}`}
                destacado={destacado}
                tip={[
                  'El objetivo de hoy',
                  objetivo.reparto === 'historial'
                    ? `${euros(objetivo.hoy)}: lo que suele pesar un ${nombreDelDia(datos.hoy)} en tu semana de ${euros(objetivo.semanal)}.`
                    : `${euros(objetivo.hoy)}: tu semana de ${euros(objetivo.semanal)} a partes iguales, hasta tener tres semanas de ventas.`,
                ]}
              />
              <LineaDeObjetivo
                nombre="Semana"
                parte={objetivo.llevas / objetivo.semanal}
                marca={objetivo.deberiasIr / objetivo.semanal}
                texto={`${euros(objetivo.llevas).replace(' €', '')} / ${euros(objetivo.semanal)}`}
                destacado={destacado}
                tip={[
                  'La semana',
                  `Llevas ${euros(objetivo.llevas)}. A estas alturas deberías ir por ${euros(objetivo.deberiasIr)} (la rayita): ${
                    objetivo.llevas >= objetivo.deberiasIr
                      ? `vas ${euros(objetivo.llevas - objetivo.deberiasIr)} por delante.`
                      : `vas ${euros(objetivo.deberiasIr - objetivo.llevas)} por detrás.`
                  }`,
                ]}
              />
            </>
          )}
          {prevision !== null && (
            <p
              className={clases(
                'text-etiqueta font-semibold',
                destacado ? 'text-sobre-naranja' : 'text-texto-suave',
              )}
              {...conTip(
                'La previsión al cierre',
                `Lo que se venderá hoy si sigue como ${losDias(datos.hoy)} de las últimas ${String(datos.semanasDeCurva)} semanas a esta hora.`,
              )}
              tabIndex={0}
            >
              Previsión al cierre <b className="font-extrabold">{euros(prevision)}</b>
              {objetivo !== null && (
                <>
                  {' · '}
                  {prevision >= objetivo.hoy
                    ? 'llegarías'
                    : `te faltarían ${euros(objetivo.hoy - prevision)}`}
                </>
              )}
            </p>
          )}
        </div>
      }
      tendencia={
        ventas.hoy === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            {conTpv ? 'Todavía nada hoy' : 'Cuando cobres la primera mesa'}
          </Tendencia>
        ) : cambio === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Sin un {elOtro} con que comparar
          </Tendencia>
        ) : (
          <Tendencia
            sentido={cambio >= 0 ? 'bien' : 'mal'}
            sube={cambio >= 0}
            destacado={destacado}
            detalle={`vs. el ${elOtro} pasado${datos.origen === 'tpv' ? ' a esta hora' : ''}`}
          >
            {conSigno(cambio, ' %')}
          </Tendencia>
        )
      }
    />
  );
}

function LineaDeObjetivo({
  nombre,
  parte,
  marca,
  texto,
  destacado,
  tip,
}: {
  readonly nombre: string;
  readonly parte: number;
  readonly marca?: number;
  readonly texto: string;
  readonly destacado: boolean;
  readonly tip: readonly [string, string];
}) {
  return (
    <div
      className="flex flex-col gap-[5px] rounded-chico outline-none focus-visible:ring-2 focus-visible:ring-texto"
      tabIndex={0}
      {...conTip(tip[0], tip[1])}
    >
      <span
        className={clases(
          'flex items-baseline justify-between gap-e2 text-etiqueta',
          destacado ? 'text-sobre-naranja' : 'text-texto-suave',
        )}
      >
        <b className="font-bold">{nombre}</b>
        <span className="truncate font-semibold tabular-nums">{texto}</span>
      </span>
      <BarraDeObjetivo
        parte={parte}
        marca={marca}
        etiqueta={`${nombre}: ${texto}`}
        color={
          destacado
            ? 'var(--color-sobre-naranja)'
            : parte >= 1
              ? 'var(--color-bien)'
              : 'var(--color-naranja)'
        }
        fondo={
          destacado ? 'color-mix(in srgb, var(--color-sobre-naranja) 16%, transparent)' : undefined
        }
        colorDeLaMarca={destacado ? 'var(--color-superficie)' : undefined}
      />
    </div>
  );
}

// ── Las otras cifras ────────────────────────────────────────────────────────────

function Tickets({ destacado }: { readonly destacado: boolean }) {
  const consulta = usarComoVaHoy();
  const datos = consulta.data;
  const t = datos?.tickets;
  const diferencia = t?.medio != null && t.medioAntes != null ? t.medio - t.medioAntes : null;
  return (
    <TarjetaDeCifra
      titulo="Tickets · medio"
      icono={<IconoCuenta />}
      ir="/negocio/ventas/tickets-y-facturas"
      destacado={destacado}
      leyendo={consulta}
      cifra={
        datos === undefined ? (
          <Cargandose que="los tickets" />
        ) : t?.hoy == null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno={t.medio === null ? undefined : ` · ${eurosConCentimos(t.medio)}`}>
            {t.hoy}
          </Cifra>
        )
      }
      tendencia={
        datos === undefined ? undefined : diferencia === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Ticket medio, al primer cobro
          </Tendencia>
        ) : (
          <Tendencia
            sentido={diferencia >= 0 ? 'bien' : 'mal'}
            sube={diferencia >= 0}
            destacado={destacado}
            detalle="de ticket medio"
          >
            {conSignoEuros(diferencia)}
          </Tendencia>
        )
      }
    />
  );
}

function TicketMedio({ destacado }: { readonly destacado: boolean }) {
  const consulta = usarComoVaHoy();
  const datos = consulta.data;
  const t = datos?.tickets;
  const diferencia = t?.medio != null && t.medioAntes != null ? t.medio - t.medioAntes : null;
  const [entera, centimos] = partesDeLaCifra(t?.medio ?? 0);
  return (
    <TarjetaDeCifra
      titulo="Ticket medio"
      icono={<IconoCuenta />}
      ir="/negocio/ventas/tickets-y-facturas"
      destacado={destacado}
      leyendo={consulta}
      cifra={
        datos === undefined ? (
          <Cargandose que="el ticket medio" />
        ) : t?.medio == null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno={centimos}>{entera}</Cifra>
        )
      }
      tendencia={
        datos === undefined ? undefined : diferencia === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Al primer cobro
          </Tendencia>
        ) : (
          <Tendencia
            sentido={diferencia >= 0 ? 'bien' : 'mal'}
            sube={diferencia >= 0}
            destacado={destacado}
            detalle={`vs. el ${nombreDelDia(datos.ventas.elOtroDia)} pasado`}
          >
            {conSignoEuros(diferencia)}
          </Tendencia>
        )
      }
    />
  );
}

/** El objetivo de materia prima, en puntos (30), de los objetivos del local. */
function usarElObjetivoDeFoodCost(): number | null {
  const objetivos = usarMisObjetivos();
  const cifra = objetivos.data?.cifras.find((c: CifraDelSemaforo) => c.que === 'materia_prima');
  return cifra?.objetivo == null ? null : cifra.objetivo * 100;
}

function FoodCost({ destacado }: { readonly destacado: boolean }) {
  const { datos, fallo } = usarElIndicador('food-cost', 7);
  const objetivo = usarElObjetivoDeFoodCost();
  // Un food cost del 0 % es que no hay nada sacado del almacén, no que el género salga gratis.
  const valor = datos?.total == null || datos.total === 0 ? null : datos.total;
  const diferencia = valor !== null && objetivo !== null ? valor - objetivo : null;
  return (
    <TarjetaDeCifra
      titulo="Food cost real"
      icono={<IconoOlla />}
      ir="/servicio/jornada/cierre"
      destacado={destacado}
      leyendo={{ isError: fallo, refetch: () => undefined }}
      cifra={
        datos === undefined ? (
          <Cargandose que="el food cost" />
        ) : valor === null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno=" %">{porCiento(valor).replace(' %', '')}</Cifra>
        )
      }
      medio={
        valor !== null && objetivo !== null ? (
          <div className="mt-e2">
            <BarraDeObjetivo
              parte={valor / objetivo}
              etiqueta={`Food cost ${porCiento(valor)} de un objetivo de ${porCiento(objetivo)}`}
              color={
                destacado
                  ? 'var(--color-sobre-naranja)'
                  : valor <= objetivo
                    ? 'var(--color-bien)'
                    : 'var(--color-mal)'
              }
              fondo={
                destacado
                  ? 'color-mix(in srgb, var(--color-sobre-naranja) 16%, transparent)'
                  : undefined
              }
            />
          </div>
        ) : undefined
      }
      tendencia={
        datos === undefined ? undefined : valor === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Con escandallos y ventas
          </Tendencia>
        ) : diferencia === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            En 7 días · sin objetivo puesto
          </Tendencia>
        ) : (
          <Tendencia
            sentido={diferencia <= 0 ? 'bien' : 'mal'}
            sube={diferencia > 0}
            destacado={destacado}
            detalle={`(${porCiento(objetivo ?? 0)})`}
          >
            {`${String(Math.abs(conUnDecimal(diferencia))).replace('.', ',')} pts ${diferencia <= 0 ? 'bajo' : 'sobre'} el objetivo`}
          </Tendencia>
        )
      }
    />
  );
}

/** «+22 € vs. los 7 días de antes», con su color según si subir es bueno. */
function LaTendenciaDeUnIndicador({
  total,
  anterior,
  subirEsBueno,
  destacado,
  detalle,
  sinDato,
}: {
  readonly total: number | null;
  readonly anterior: number | null;
  readonly subirEsBueno: boolean;
  readonly destacado: boolean;
  readonly detalle: string;
  readonly sinDato: string;
}) {
  // Sin nada ni antes ni ahora no hay tendencia que contar: «±0 €» no dice nada.
  if (total === null || anterior === null || (total === 0 && anterior === 0)) {
    return (
      <Tendencia sentido="igual" sube={null} destacado={destacado}>
        {sinDato}
      </Tendencia>
    );
  }
  const diferencia = total - anterior;
  const sentido: SentidoDeLaTendencia =
    diferencia === 0 ? 'igual' : diferencia > 0 === subirEsBueno ? 'bien' : 'mal';
  return (
    <Tendencia
      sentido={sentido}
      sube={diferencia === 0 ? null : diferencia > 0}
      destacado={destacado}
      detalle={detalle}
    >
      {`${diferencia > 0 ? '+' : diferencia < 0 ? '−' : '±'}${euros(Math.abs(diferencia))}`}
    </Tendencia>
  );
}

function MermaDeLaSemana({ destacado }: { readonly destacado: boolean }) {
  const { datos, fallo } = usarElIndicador('merma', 7);
  return (
    <TarjetaDeCifra
      titulo="Merma de la semana"
      icono={<IconoAtencion />}
      ir="/almacen/mermas"
      destacado={destacado}
      leyendo={{ isError: fallo, refetch: () => undefined }}
      cifra={
        datos === undefined ? (
          <Cargandose que="la merma" />
        ) : (
          <Cifra pequeno=" €">{euros(datos.total ?? 0).replace(' €', '')}</Cifra>
        )
      }
      tendencia={
        datos === undefined ? undefined : (datos.total ?? 0) === 0 &&
          (datos.anterior ?? 0) === 0 ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Nada apuntado todavía
          </Tendencia>
        ) : (
          <LaTendenciaDeUnIndicador
            total={datos.total}
            anterior={datos.anterior}
            subirEsBueno={false}
            destacado={destacado}
            detalle="vs. la semana pasada"
            sinDato="En 7 días"
          />
        )
      }
    />
  );
}

function ComprasDeLaSemana({ destacado }: { readonly destacado: boolean }) {
  const compras = usarElIndicador('compras', 7);
  const ventas = usarElIndicador('ventas', 7);
  const total = compras.datos?.total ?? null;
  const vendido = ventas.datos?.total ?? null;
  return (
    <TarjetaDeCifra
      titulo="Compras de la semana"
      icono={<IconoAlmacen />}
      ir="/almacen/compras/pedidos?ver=llegado"
      destacado={destacado}
      leyendo={{ isError: compras.fallo, refetch: () => undefined }}
      cifra={
        compras.datos === undefined ? (
          <Cargandose que="las compras" />
        ) : (
          <Cifra pequeno=" €">{euros(total ?? 0).replace(' €', '')}</Cifra>
        )
      }
      tendencia={
        compras.datos === undefined ? undefined : total === null || total === 0 ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Al recibir el primer pedido
          </Tendencia>
        ) : vendido !== null && vendido > 0 ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado} detalle="de lo vendido">
            {porCiento((total / vendido) * 100, 0)}
          </Tendencia>
        ) : (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            En 7 días
          </Tendencia>
        )
      }
    />
  );
}

function LaCamaraVale({ destacado }: { readonly destacado: boolean }) {
  const { datos, fallo } = usarElIndicador('valor-camara', 7);
  return (
    <TarjetaDeCifra
      titulo="La cámara vale"
      icono={<IconoCongelado />}
      ir="/almacen/productos"
      destacado={destacado}
      leyendo={{ isError: fallo, refetch: () => undefined }}
      cifra={
        datos === undefined ? (
          <Cargandose que="lo que vale la cámara" />
        ) : datos.total === null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno=" €">{euros(datos.total).replace(' €', '')}</Cifra>
        )
      }
      tendencia={
        datos === undefined ? undefined : (
          <LaTendenciaDeUnIndicador
            total={datos.total}
            anterior={datos.anterior}
            subirEsBueno
            destacado={destacado}
            detalle="en 7 días"
            sinDato="Con productos y precios"
          />
        )
      }
    />
  );
}

function MesasAhoraCifra({ destacado }: { readonly destacado: boolean }) {
  const consulta = usarComoVaHoy();
  const sala = consulta.data?.sala ?? null;
  return (
    <TarjetaDeCifra
      titulo="Mesas ahora"
      icono={<IconoCubiertos />}
      ir="/servicio/jornada/en-marcha"
      destacado={destacado}
      leyendo={consulta}
      cifra={
        consulta.data === undefined ? (
          <Cargandose que="las mesas" />
        ) : sala === null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra
            pequeno={
              sala.porCobrar === null || sala.porCobrar === 0
                ? undefined
                : ` · ${String(sala.porCobrar)} por cobrar`
            }
          >
            {sala.mesas}
          </Cifra>
        )
      }
      tendencia={
        consulta.data === undefined ? undefined : sala === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Al abrir la primera mesa
          </Tendencia>
        ) : (
          <Tendencia sentido="igual" sube={null} destacado={destacado} detalle="en sala">
            {`${String(sala.personas)} ${sala.personas === 1 ? 'comensal' : 'comensales'}`}
          </Tendencia>
        )
      }
    />
  );
}

function EsperaDeCocina({ destacado }: { readonly destacado: boolean }) {
  const consulta = usarComoVaHoy();
  const cocina = consulta.data?.cocina ?? null;
  const diferencia =
    cocina?.media != null && cocina.mediaAyer != null ? cocina.media - cocina.mediaAyer : null;
  return (
    <TarjetaDeCifra
      titulo="Espera de cocina"
      icono={<IconoReloj />}
      ir="/servicio/jornada/informacion"
      destacado={destacado}
      leyendo={consulta}
      cifra={
        consulta.data === undefined ? (
          <Cargandose que="la espera" />
        ) : cocina?.media == null ? (
          <Cifra apagada>—</Cifra>
        ) : (
          <Cifra pequeno=" min">{entero(cocina.media)}</Cifra>
        )
      }
      tendencia={
        consulta.data === undefined ? undefined : diferencia === null ? (
          <Tendencia sentido="igual" sube={null} destacado={destacado}>
            Al salir el primer plato
          </Tendencia>
        ) : (
          <Tendencia
            sentido={diferencia <= 0 ? 'bien' : 'mal'}
            sube={diferencia === 0 ? null : diferencia > 0}
            destacado={destacado}
            detalle="vs. ayer"
          >
            {conSigno(diferencia, "'")}
          </Tendencia>
        )
      }
    />
  );
}

/** «Las cifras del día», para quien no las tiene arriba: las cuatro en pequeño. */
function LasCifrasDelDia() {
  const puede = usarPuede();
  const hoy = usarComoVaHoy();
  const fc = usarElIndicador('food-cost', 7);
  const merma = usarElIndicador('merma', 7);
  const datos = hoy.data;
  const filas: { nombre: string; valor: string; tip: string }[] = [];
  if (datos !== undefined) {
    filas.push({
      nombre: 'Ventas de hoy',
      valor: datos.ventas.hoy === null ? '—' : euros(datos.ventas.hoy),
      tip: 'Con IVA, hasta ahora',
    });
    filas.push({
      nombre: 'Tickets',
      valor: datos.tickets.hoy === null ? '—' : String(datos.tickets.hoy),
      tip:
        datos.tickets.medio === null
          ? 'Hoy todavía no'
          : `Ticket medio ${eurosConCentimos(datos.tickets.medio)}`,
    });
  }
  if (fc.puede) {
    filas.push({
      nombre: 'Food cost',
      valor: fc.datos?.total == null ? '—' : porCiento(fc.datos.total),
      tip: 'En 7 días',
    });
  }
  if (merma.puede && puede.ver('app.almacen')) {
    filas.push({
      nombre: 'Merma',
      valor: euros(merma.datos?.total ?? 0),
      tip: 'En 7 días',
    });
  }
  return (
    <Tarjeta
      titulo="Las cifras del día"
      icono={<IconoNegocio />}
      ir="/negocio/ventas"
      leyendo={hoy}
    >
      {datos === undefined ? (
        <Cargandose que="las cifras" />
      ) : (
        <dl className="grid flex-1 grid-cols-2 gap-e3">
          {filas.map((f) => (
            <div
              key={f.nombre}
              className="flex flex-col justify-center rounded-grande bg-fondo p-e3 outline-none focus-visible:ring-2 focus-visible:ring-naranja"
              tabIndex={0}
              {...conTip(f.nombre, f.tip)}
            >
              <dt className="text-etiqueta font-semibold text-texto-tenue">{f.nombre}</dt>
              <dd className="truncate text-seccion font-extrabold tabular-nums">{f.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </Tarjeta>
  );
}

// ── Las gráficas ────────────────────────────────────────────────────────────────

function VentasYCompras() {
  const hoy = usarComoVaHoy();
  // El periodo dentro del widget, recordado en la cuenta (0083 y 0084): la semana o el mes.
  const [dias, ponerDias] = usarElPeriodoDelWidget('ventas-y-compras');
  const ventas = usarElIndicador('ventas', dias);
  const compras = usarElIndicador('compras', dias);
  const serie = ventas.datos?.serie ?? [];
  const ultima = serie.length - 1;
  const puntos: PuntoDelPanel[] = serie.map((d, i) => {
    const vendido = i === ultima && d.valor === null ? (hoy.data?.ventas.hoy ?? null) : d.valor;
    const comprado = compras.datos?.serie[i]?.valor ?? null;
    return {
      eje: elEje(d.fecha, i, serie.length),
      titulo: `${diaConNumero(d.fecha)}${i === ultima ? ' (hoy)' : ''}`,
      texto: `Ventas ${vendido === null ? 'sin caja cerrada' : euros(vendido)}${
        compras.puede ? ` · Compras ${comprado === null ? '0 €' : euros(comprado)}` : ''
      }`,
      linea: vendido,
      barra: compras.puede ? comprado : null,
    };
  });
  const totalVentas = puntos.reduce((s, p) => s + (p.linea ?? 0), 0);
  const totalCompras = puntos.reduce((s, p) => s + (p.barra ?? 0), 0);
  const sinNada = ventas.datos !== undefined && totalVentas === 0 && totalCompras === 0;

  return (
    <Tarjeta
      titulo="Ventas y compras"
      icono={<IconoNegocio />}
      ir="/negocio/ventas"
      leyendo={{ isError: ventas.fallo, refetch: () => undefined }}
      derecha={
        <ElegirPeriodo
          periodo={dias}
          alElegir={ponerDias}
          corto
          etiqueta="Ventas y compras, de cuántos días"
        />
      }
    >
      {ventas.datos === undefined ? (
        <Cargando que="las ventas de la semana" lineas={5} />
      ) : sinNada ? (
        <Silueta
          icono={<IconoNegocio />}
          paso={
            compras.puede
              ? { texto: 'Recibir el primer pedido', ir: '/almacen/compras/pedidos' }
              : undefined
          }
        >
          Aquí verás cada día lo que vendes y lo que compras, juntos.
        </Silueta>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-e3">
            <Cifra>{euros(totalVentas)}</Cifra>
            <small className="text-etiqueta font-semibold text-texto-tenue">
              en {dias} días{compras.puede ? ` · compras ${euros(totalCompras)}` : ''}
            </small>
            <span className="ml-auto">
              <LeyendaDeLaGrafica
                series={[
                  { nombre: 'Ventas', color: 'var(--color-naranja)', forma: 'punto' },
                  ...(compras.puede
                    ? [{ nombre: 'Compras', color: 'var(--color-info)', forma: 'barra' as const }]
                    : []),
                ]}
              />
            </span>
          </div>
          <GraficaDelPanel
            titulo={`Ventas y compras de los últimos ${String(dias)} días`}
            puntos={puntos}
            resaltar={ultima}
            formato={eurosEnCorto}
          />
        </>
      )}
    </Tarjeta>
  );
}

function FoodCostYMerma() {
  const [dias, ponerDias] = usarElPeriodoDelWidget('food-cost-y-merma');
  const fc = usarElIndicador('food-cost', dias);
  const merma = usarElIndicador('merma', dias);
  const objetivo = usarElObjetivoDeFoodCost();
  const serie = fc.datos?.serie ?? [];
  const ultima = serie.length - 1;
  const puntos: PuntoDelPanel[] = serie.map((d, i) => {
    const tirado = merma.datos?.serie[i]?.valor ?? 0;
    return {
      eje: elEje(d.fecha, i, serie.length),
      titulo: `${diaConNumero(d.fecha)}${i === ultima ? ' (hoy)' : ''}`,
      texto: `Food cost ${d.valor === null ? 'sin caja cerrada' : porCiento(d.valor)} · merma ${euros(tirado)}`,
      linea: d.valor,
    };
  });
  const conDato = puntos.some((p) => p.linea !== null);
  const valores = puntos.flatMap((p) => (p.linea == null ? [] : [p.linea]));
  const minimo = Math.max(0, Math.floor(Math.min(...valores, objetivo ?? 100) / 4) * 4 - 4);

  return (
    <Tarjeta
      titulo="Food cost y merma"
      icono={<IconoOlla />}
      ir="/servicio/jornada/cierre"
      leyendo={{ isError: fc.fallo, refetch: () => undefined }}
      derecha={
        <ElegirPeriodo
          periodo={dias}
          alElegir={ponerDias}
          corto
          etiqueta="Food cost y merma, de cuántos días"
        />
      }
    >
      {fc.datos === undefined ? (
        <Cargando que="el food cost" lineas={5} />
      ) : !conDato ? (
        <Silueta
          icono={<IconoOlla />}
          paso={{ texto: 'Hacer escandallos', ir: '/escandallos/escandallos' }}
        >
          El food cost de cada día frente a tu objetivo. Sale con los escandallos y la caja cerrada.
        </Silueta>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-e3">
            <Cifra>{fc.datos.total === null ? '—' : porCiento(fc.datos.total)}</Cifra>
            <small className="text-etiqueta font-semibold text-texto-tenue">
              en {dias} días · merma {euros(merma.datos?.total ?? 0)}
            </small>
            <span className="ml-auto">
              <LeyendaDeLaGrafica
                series={[
                  { nombre: 'Food cost', color: 'var(--color-naranja)', forma: 'punto' },
                  ...(objetivo !== null
                    ? [{ nombre: 'Objetivo', color: 'var(--color-bien)', forma: 'raya' as const }]
                    : []),
                ]}
              />
            </span>
          </div>
          <GraficaDelPanel
            titulo={`El food cost de los últimos ${String(dias)} días`}
            puntos={puntos}
            resaltar={ultima}
            objetivo={objetivo}
            minimo={minimo}
            formato={(n) => `${String(entero(n))} %`}
          />
        </>
      )}
    </Tarjeta>
  );
}

function CuandoSeVende() {
  const consulta = usarComoVaHoy();
  const datos = consulta.data;
  const curva = datos?.curva ?? [];
  const conVentas = curva.filter((h) => h.media > 0);
  const primera = curva.findIndex((h) => h.media > 0);
  const ultima = curva.length - 1 - [...curva].reverse().findIndex((h) => h.media > 0);
  const tramo = primera < 0 ? [] : curva.slice(primera, ultima + 1);
  const fuerte = tramo.reduce(
    (mejor, h, i) => (h.media > (tramo[mejor]?.media ?? -1) ? i : mejor),
    0,
  );
  const puntos: PuntoDelPanel[] = tramo.map((h) => ({
    eje: String(h.hora).padStart(2, '0'),
    titulo: `De ${String(h.hora).padStart(2, '0')}:00 a ${String((h.hora + 1) % 24).padStart(2, '0')}:00`,
    texto: `${euros(h.media)} de media`,
    barra: h.media,
  }));
  const laFuerte = tramo[fuerte];

  return (
    <Tarjeta
      titulo="Cuándo se vende"
      icono={<IconoNegocio />}
      ir="/servicio/jornada/informacion"
      leyendo={consulta}
      derecha={
        datos === undefined || conVentas.length === 0 ? undefined : `media de ${losDias(datos.hoy)}`
      }
    >
      {datos === undefined ? (
        <Cargando que="cuándo se vende" lineas={5} />
      ) : conVentas.length === 0 ? (
        <Silueta icono={<IconoReloj />}>
          Lo que se vende cada hora, de media, este día de la semana. Sale cuando lleves unos{' '}
          {nombreDelDia(datos.hoy)}
          {nombreDelDia(datos.hoy).endsWith('s') ? '' : 's'} cobrando con Estook TPV.
        </Silueta>
      ) : (
        <>
          {laFuerte !== undefined && (
            <div className="flex flex-wrap items-baseline gap-x-e3">
              <Cifra>{`${String(laFuerte.hora).padStart(2, '0')}:00`}</Cifra>
              <small className="text-etiqueta font-semibold text-texto-tenue">
                la hora fuerte · {euros(laFuerte.media)}
              </small>
            </div>
          )}
          <GraficaDelPanel
            titulo={`Lo que se vende cada hora, de media, ${losDias(datos.hoy)}`}
            puntos={puntos}
            resaltar={fuerte}
            soloBarras
            formato={eurosEnCorto}
          />
        </>
      )}
    </Tarjeta>
  );
}

// ── Lo que más sale y por secciones ─────────────────────────────────────────────

function usarLaSemanaQueSeVende() {
  return usarLoDelPanel<LoQueSeVende>('lo_que_se_vende', { periodo: 'semana' });
}

function LoQueMasSale() {
  const consulta = usarLaSemanaQueSeVende();
  const datos = consulta.data;
  const platos = (datos?.platos ?? []).filter((p) => p.uds > 0);
  const totalUds = platos.reduce((s, p) => s + p.uds, 0);
  const tres = platos.slice(0, 3);
  const secciones = new Map((datos?.secciones ?? []).map((s) => [s.nombre, s]));
  return (
    <Tarjeta
      titulo="Lo que más sale"
      icono={<IconoEstrella />}
      ir="/servicio/jornada/informacion"
      leyendo={consulta}
      derecha="esta semana"
    >
      {datos === undefined ? (
        <Cargando que="lo que más sale" lineas={3} />
      ) : tres.length === 0 ? (
        <Silueta
          icono={<IconoEstrella />}
          paso={{ texto: 'Poner fotos a la carta', ir: '/carta/carta' }}
        >
          Los platos que más se venden, con su foto. Sale al cobrar con Estook TPV.
        </Silueta>
      ) : (
        <ol className="grid flex-1 grid-cols-3 gap-e3">
          {tres.map((p, i) => {
            const parte = totalUds === 0 ? 0 : (p.uds / totalUds) * 100;
            const suya = p.seccion === null ? undefined : secciones.get(p.seccion);
            return (
              <li
                key={p.id}
                className="flex min-w-0 flex-col gap-[6px] rounded-grande outline-none focus-visible:ring-2 focus-visible:ring-naranja"
                tabIndex={0}
                {...conTip(
                  p.nombre,
                  `${String(p.uds)} vendidas · ${porCiento(parte, 0)} de lo vendido esta semana`,
                )}
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-grande bg-fondo @min-[24rem]:aspect-auto @min-[24rem]:min-h-[6rem] @min-[24rem]:flex-1">
                  {p.foto != null ? (
                    <img
                      src={p.foto}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <span
                      className="absolute inset-0 grid place-items-center"
                      style={{
                        background: `color-mix(in srgb, ${elAcentoDelColor(suya?.color ?? null)} 22%, var(--color-superficie))`,
                      }}
                    >
                      <LaBaldosaDeLaSeccion
                        icono={suya?.icono ?? 'utensils-crossed'}
                        color={suya?.color ?? null}
                        lado={40}
                      />
                    </span>
                  )}
                  <span className="absolute left-e2 top-e2 grid size-6 place-items-center rounded-redondo bg-texto/70 text-etiqueta font-bold text-superficie">
                    {i + 1}
                  </span>
                  <span className="absolute bottom-e2 left-e2 rounded-redondo bg-black/45 px-e2 py-[2px] text-etiqueta font-bold text-white">
                    {porCiento(parte, 0)}
                  </span>
                </span>
                <b className="truncate text-secundario font-bold leading-tight">{p.nombre}</b>
                <small className="-mt-[4px] text-etiqueta font-semibold text-texto-tenue">
                  {p.uds} {p.uds === 1 ? 'vendida' : 'vendidas'}
                </small>
              </li>
            );
          })}
        </ol>
      )}
    </Tarjeta>
  );
}

function PorSecciones() {
  const consulta = usarLaSemanaQueSeVende();
  const datos = consulta.data;
  const secciones = (datos?.secciones ?? []).filter((s) => s.ventas > 0);
  const total = secciones.reduce((s, x) => s + x.ventas, 0);
  const max = Math.max(...secciones.map((s) => s.ventas), 1);
  return (
    <Tarjeta
      titulo="Por secciones"
      icono={<IconoCarta />}
      ir="/servicio/jornada/informacion"
      leyendo={consulta}
      derecha="esta semana"
    >
      {datos === undefined ? (
        <Cargando que="las secciones" lineas={4} />
      ) : secciones.length === 0 ? (
        <Silueta icono={<IconoCarta />}>
          Lo que vende cada sección de tu carta. Sale al primer cobro.
        </Silueta>
      ) : (
        <ul className="flex flex-col gap-[9px]">
          {secciones.slice(0, 4).map((s) => {
            const parte = total === 0 ? 0 : (s.ventas / total) * 100;
            return (
              <li
                key={s.nombre}
                className="grid grid-cols-[30px_1fr_auto] items-center gap-e3 rounded-medio outline-none focus-visible:ring-2 focus-visible:ring-naranja"
                tabIndex={0}
                {...conTip(
                  s.nombre,
                  `${euros(s.ventas)} · ${porCiento(parte, 0)} de lo vendido esta semana (sin IVA)`,
                )}
              >
                <LaBaldosaDeLaSeccion
                  icono={s.icono ?? 'utensils-crossed'}
                  color={s.color ?? null}
                  lado={30}
                  suave
                />
                <span className="min-w-0 text-secundario font-semibold">
                  <span className="block truncate">{s.nombre}</span>
                  <span className="mt-[4px] block h-2 overflow-hidden rounded-redondo bg-fondo">
                    <b
                      className="block h-full rounded-redondo"
                      style={{
                        width: `${String((s.ventas / max) * 100)}%`,
                        background: elAcentoDelColor(s.color ?? null),
                      }}
                    />
                  </span>
                </span>
                <em className="text-secundario font-bold not-italic tabular-nums">
                  {porCiento(parte, 0)}
                </em>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

// ── Cómo se cobra y las mesas ───────────────────────────────────────────────────

const COMO_ES_LA_FORMA: Readonly<
  Record<FormaDePago, { readonly nombre: string; readonly color: string }>
> = {
  tarjeta: { nombre: 'Tarjeta', color: 'var(--color-info)' },
  efectivo: { nombre: 'Efectivo', color: 'var(--color-bien)' },
  bizum: { nombre: 'Bizum', color: 'var(--color-naranja)' },
  cheque: { nombre: 'Cheque', color: 'var(--color-texto-suave)' },
};

function ComoSeCobra() {
  const consulta = usarComoVaHoy();
  const cobros = consulta.data?.cobros ?? null;
  const formas =
    cobros === null
      ? []
      : (Object.keys(COMO_ES_LA_FORMA) as FormaDePago[]).filter((f) => cobros[f] > 0);
  const total = cobros === null ? 0 : formas.reduce((s, f) => s + cobros[f], 0);
  const mas = formas.reduce<FormaDePago | null>(
    (mejor, f) => (mejor === null || (cobros?.[f] ?? 0) > (cobros?.[mejor] ?? 0) ? f : mejor),
    null,
  );
  if (consulta.data !== undefined && cobros === null) return null;
  return (
    <Tarjeta
      titulo="Cómo se cobra"
      icono={<IconoDinero />}
      ir="/negocio/ventas/cobros"
      leyendo={consulta}
      derecha="hoy"
    >
      {consulta.data === undefined ? (
        <Cargando que="los cobros" lineas={3} />
      ) : total === 0 || mas === null || cobros === null ? (
        <Silueta icono={<IconoDinero />}>
          Tarjeta, efectivo y Bizum de lo cobrado hoy. Sale al primer cobro.
        </Silueta>
      ) : (
        <div
          className="flex flex-1 flex-col justify-center outline-none"
          tabIndex={0}
          {...conTip(
            'Lo cobrado hoy',
            formas.map((f) => `${COMO_ES_LA_FORMA[f].nombre} ${euros(cobros[f])}`).join(' · '),
          )}
        >
          <MedioAnillo
            etiqueta={`Lo cobrado hoy: ${formas.map((f) => `${COMO_ES_LA_FORMA[f].nombre} ${porCiento((cobros[f] / total) * 100, 0)}`).join(', ')}`}
            partes={formas.map((f) => ({
              valor: cobros[f],
              color: COMO_ES_LA_FORMA[f].color,
              nombre: f,
            }))}
            centro={porCiento((cobros[mas] / total) * 100, 0)}
            debajo={`con ${COMO_ES_LA_FORMA[mas].nombre.toLowerCase()}`}
          />
          <Leyenda
            filas={formas.map((f) => ({
              color: COMO_ES_LA_FORMA[f].color,
              nombre: COMO_ES_LA_FORMA[f].nombre,
              cifra: porCiento((cobros[f] / total) * 100, 0),
            }))}
          />
        </div>
      )}
    </Tarjeta>
  );
}

function MesasAhora() {
  const consulta = usarComoVaHoy();
  const datos = consulta.data;
  const sala = datos?.sala ?? null;
  const cocina = datos?.cocina ?? null;
  return (
    <Tarjeta
      titulo="Mesas ahora"
      icono={<IconoCubiertos />}
      ir="/servicio/jornada/en-marcha"
      leyendo={consulta}
    >
      {datos === undefined ? (
        <Cargando que="las mesas" lineas={3} />
      ) : sala === null ? (
        <Silueta icono={<IconoCubiertos />}>
          Las mesas abiertas, las que esperan la cuenta y la espera media.
        </Silueta>
      ) : (
        <Lista>
          <Fila
            icono={<IconoCubiertos />}
            tono="naranja"
            titulo={`${String(sala.mesas)} ${sala.mesas === 1 ? 'mesa abierta' : 'mesas abiertas'}`}
            detalle={`${String(sala.personas)} comensales`}
          />
          {sala.porCobrar !== null && (
            <Fila
              icono={<IconoCuenta />}
              tono={sala.porCobrar > 0 ? 'atencion' : 'neutro'}
              titulo={`${String(sala.porCobrar)} por cobrar`}
              detalle="Han acabado y esperan la cuenta"
            />
          )}
          {cocina?.media != null && (
            <Fila
              icono={<IconoReloj />}
              tono="info"
              titulo={`${minutos(cocina.media)} de espera media`}
              detalle={`${String(cocina.esperando)} platos en la cocina ahora`}
            />
          )}
        </Lista>
      )}
    </Tarjeta>
  );
}

// ── Objetivos ──────────────────────────────────────────────────────────────────

const COLOR_DEL_SEMAFORO: Readonly<Record<CifraDelSemaforo['semaforo'], string>> = {
  verde: 'var(--color-bien)',
  ambar: 'var(--color-atencion)',
  rojo: 'var(--color-mal)',
  sin_dato: 'var(--color-borde-fuerte)',
};

function Objetivos() {
  const consulta = usarMisObjetivos();
  const cifras = consulta.data?.cifras ?? [];
  const conObjetivo = cifras.filter((c) => c.objetivo !== null);
  const conDato = conObjetivo.filter((c) => c.valor !== null && c.valor !== 0);
  return (
    <Tarjeta
      titulo="Objetivos"
      icono={<IconoEstrella />}
      ir="/ajustes/local#objetivos"
      leyendo={consulta}
      derecha="7 días"
    >
      {consulta.data === undefined ? (
        <Cargando que="tus objetivos" lineas={3} />
      ) : conObjetivo.length === 0 ? (
        <Silueta
          icono={<IconoEstrella />}
          paso={{ texto: 'Poner tus objetivos', ir: '/ajustes/local#objetivos' }}
        >
          Cómo vas frente a lo que te propones: ventas, food cost, personal y merma.
        </Silueta>
      ) : conDato.length === 0 ? (
        <NadaQueVer>
          Tus objetivos están puestos. Las cifras salen al cerrar la caja y con lo sacado del almacén.
        </NadaQueVer>
      ) : (
        <ul className="flex flex-col gap-e3">
          {conDato.slice(0, 4).map((c) => {
            const objetivo =
              c.que === 'ventas_semanales' ? (c.objetivo ?? 0) : (c.objetivo ?? 0) * 100;
            const parte = c.valor === null || objetivo === 0 ? 0 : c.valor / objetivo;
            return (
              <li
                key={c.que}
                className="flex flex-col gap-[5px] rounded-medio outline-none focus-visible:ring-2 focus-visible:ring-naranja"
                tabIndex={0}
                {...conTip(
                  c.nombre,
                  c.porque[0] ?? `${c.valorEnTexto} · ${c.objetivoEnTexto ?? ''}`,
                )}
              >
                <span className="flex items-baseline justify-between gap-e2 text-secundario">
                  <b className="truncate font-semibold">{c.nombre}</b>
                  <small className="shrink-0 text-etiqueta font-semibold tabular-nums text-texto-tenue">
                    {c.valorEnTexto}
                    {c.objetivoEnTexto === null ? '' : ` · ${c.objetivoEnTexto}`}
                  </small>
                </span>
                <BarraDeObjetivo
                  parte={parte}
                  color={COLOR_DEL_SEMAFORO[c.semaforo]}
                  etiqueta={`${c.nombre}: ${c.valorEnTexto}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

// ── El almacén ─────────────────────────────────────────────────────────────────

/** «Mañana», «hoy», «el viernes», «en 5 días». */
function cuandoCaduca(dias: number, fecha: string): string {
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias < 7) {
    const nombre = nombreDelDia(fecha);
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`;
  }
  return `En ${String(dias)} días`;
}

function ElAlmacenPide() {
  const almacen = usarAlmacenHoy();
  const puede = usarPuede();
  const compras = usarLoDelPanel<ComprasDeHoy>(
    'compras_de_hoy',
    {},
    puede.ver('accion.enviar_pedidos'),
  );
  const datos = almacen.data;
  const bajo = datos?.atencion ?? [];
  const caducan = (datos?.caducan ?? []).filter((c) => c.dias <= 2);
  const llega = compras.data?.llegan[0];
  return (
    <Tarjeta
      titulo="El almacén pide"
      icono={<IconoAlmacen />}
      ir="/almacen/resumen"
      leyendo={almacen}
    >
      {datos === undefined ? (
        <Cargando que="el almacén" lineas={4} />
      ) : datos.cuantosProductos === 0 ? (
        <Silueta
          icono={<IconoAlmacen />}
          paso={{ texto: 'Añadir productos', ir: '/almacen/productos/todo?hacer=nuevo' }}
        >
          Lo bajo mínimo, lo que caduca y los pedidos de hoy.
        </Silueta>
      ) : (
        <Lista>
          {bajo.length > 0 && (
            <Fila
              icono={<IconoAtencion />}
              tono="mal"
              titulo={`${String(bajo.length)} bajo mínimo`}
              detalle={bajo
                .slice(0, 3)
                .map((p) => p.nombre)
                .join(', ')}
            />
          )}
          {caducan.length > 0 && (
            <Fila
              icono={<IconoReloj />}
              tono="atencion"
              titulo={`${String(caducan.length)} ${caducan.length === 1 ? 'caduca' : 'caducan'} ${caducan.every((c) => c.dias <= 1) ? 'mañana' : 'pronto'}`}
              detalle={caducan
                .slice(0, 3)
                .map((c) => c.producto)
                .join(', ')}
            />
          )}
          {llega !== undefined && (
            <Fila
              icono={<IconoReparto />}
              tono="info"
              titulo={`Pedido a ${llega.proveedor}`}
              detalle={`Llega ${llega.llegaCuando}`}
            />
          )}
          {datos.puedeVerPrecios && datos.valorTotalCentimos != null && (
            <Fila
              icono={<IconoCongelado />}
              tono="neutro"
              titulo="La cámara vale"
              detalle={`${euros(datos.valorTotalCentimos)} en género`}
            />
          )}
          {bajo.length === 0 && caducan.length === 0 && llega === undefined && (
            <li className="text-secundario text-texto-suave">
              Todo en orden: nada bajo mínimo ni a punto de caducar.
            </li>
          )}
        </Lista>
      )}
    </Tarjeta>
  );
}

function CaducaPronto() {
  const almacen = usarAlmacenHoy();
  const caducan = almacen.data?.caducan ?? [];
  return (
    <Tarjeta
      titulo="Caduca pronto"
      icono={<IconoReloj />}
      ir="/almacen/resumen"
      leyendo={almacen}
      derecha={caducan.length > 3 ? `${String(caducan.length)} lotes` : undefined}
    >
      {almacen.data === undefined ? (
        <Cargando que="las caducidades" lineas={3} />
      ) : almacen.data.cuantosProductos === 0 ? (
        <Silueta icono={<IconoReloj />}>Lo que caduca en los próximos días.</Silueta>
      ) : caducan.length === 0 ? (
        <NadaQueVer>Nada caduca en los próximos siete días.</NadaQueVer>
      ) : (
        <Lista>
          {caducan.slice(0, 4).map((c) => (
            <Fila
              key={c.loteId}
              icono={c.dias <= 1 ? <IconoAtencion /> : <IconoReloj />}
              tono={c.dias <= 1 ? 'mal' : 'atencion'}
              titulo={c.producto}
              detalle={`${cuandoCaduca(c.dias, c.caducaEl)}${c.lote === null ? '' : ` · lote ${c.lote}`}`}
            />
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

function BajoMinimo() {
  const almacen = usarAlmacenHoy();
  const bajo = almacen.data?.atencion ?? [];
  return (
    <Tarjeta
      titulo="Bajo mínimo"
      icono={<IconoAlmacen />}
      ir="/almacen/productos/bajo-minimo"
      leyendo={almacen}
      derecha={bajo.length > 3 ? `${String(bajo.length)} productos` : undefined}
    >
      {almacen.data === undefined ? (
        <Cargando que="el almacén" lineas={3} />
      ) : almacen.data.cuantosProductos === 0 ? (
        <Silueta
          icono={<IconoAlmacen />}
          paso={{ texto: 'Añadir productos', ir: '/almacen/productos/todo?hacer=nuevo' }}
        >
          Lo que hay que pedir, con cuánto queda de su mínimo.
        </Silueta>
      ) : bajo.length === 0 ? (
        <NadaQueVer>Todo por encima de su mínimo.</NadaQueVer>
      ) : (
        <Lista>
          {bajo.slice(0, 4).map((p) => (
            <Fila
              key={p.id}
              icono={<IconoAtencion />}
              tono={p.cantidad <= 0 ? 'mal' : 'atencion'}
              titulo={p.nombre}
              detalle={`Quedan ${conUnidadDeUso(p.cantidad, p.unidadDeUso)}${p.minimo === null ? '' : ` · mínimo ${conUnidadDeUso(p.minimo, p.unidadDeUso)}`}`}
            />
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

function Repartos() {
  const consulta = usarLoDelPanel<ComprasDeHoy>('compras_de_hoy');
  const datos = consulta.data;
  const filas = [
    ...(datos?.llegan ?? []).map((l) => ({
      clave: `l${l.pedidoId}`,
      icono: <IconoReparto />,
      tono: l.atrasado ? ('mal' as const) : ('info' as const),
      titulo: l.proveedor,
      detalle: `${l.atrasado ? 'Atrasado · ' : 'Llega '}${l.llegaCuando} · ${String(l.lineas)} productos`,
    })),
    ...(datos?.tocaPedir ?? [])
      .filter((t) => !t.yaPedido)
      .map((t) => ({
        clave: `p${t.proveedorId}`,
        icono: <IconoAnadir />,
        tono: 'bien' as const,
        titulo: t.proveedor,
        detalle: `Por pedir${t.pedirAntesDe === null ? '' : ` antes de las ${t.pedirAntesDe}`} · llega ${t.llegaCuando}`,
      })),
  ];
  return (
    <Tarjeta
      titulo="Repartos de hoy"
      icono={<IconoReparto />}
      ir="/almacen/compras/pedidos"
      leyendo={consulta}
    >
      {datos === undefined ? (
        <Cargando que="los repartos" lineas={3} />
      ) : filas.length === 0 ? (
        <NadaQueVer>Hoy no llega nada ni toca pedir.</NadaQueVer>
      ) : (
        <Lista>
          {filas.slice(0, 4).map((f) => (
            <Fila
              key={f.clave}
              icono={f.icono}
              tono={f.tono}
              titulo={f.titulo}
              detalle={f.detalle}
            />
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

// ── Lo que se escapa ───────────────────────────────────────────────────────────

function LoQueSeEscapa() {
  const consulta = usarLoDelPanel<QueHaCambiado>('que_ha_cambiado', { dias: '30' });
  const platos = consulta.data?.platos ?? [];
  return (
    <Tarjeta
      titulo="Lo que se escapa"
      icono={<IconoFlechaArriba />}
      ir="/escandallos/resumen"
      leyendo={consulta}
      derecha="en 30 días"
    >
      {consulta.data === undefined ? (
        <Cargando que="lo que se escapa" lineas={4} />
      ) : platos.length === 0 ? (
        <NadaQueVer>Ningún plato ha cambiado de coste en 30 días.</NadaQueVer>
      ) : (
        <Lista>
          {platos.slice(0, 4).map((p) => {
            const sube = p.diferenciaCentimos > 0;
            const cruza = p.cruza[0];
            return (
              <Fila
                key={p.id}
                icono={
                  cruza !== undefined ? (
                    <IconoAtencion />
                  ) : sube ? (
                    <IconoFlechaArriba />
                  ) : (
                    <IconoFlechaAbajo />
                  )
                }
                tono={cruza !== undefined ? 'atencion' : sube ? 'mal' : 'bien'}
                titulo={p.nombre}
                detalle={
                  cruza !== undefined
                    ? cruza.texto
                    : p.porQue !== null
                      ? `Por ${p.porQue.nombre.toLowerCase()}`
                      : p.cambioLaReceta
                        ? 'Cambió su receta'
                        : 'Cambió el precio del género'
                }
                cifra={conSignoEuros(p.diferenciaCentimos)}
                colorDeLaCifra={sube ? 'var(--color-mal)' : 'var(--color-bien)'}
                tip={[
                  p.nombre,
                  `Una ración costaba ${eurosConCentimos(p.antesCentimos)} y ahora ${eurosConCentimos(p.ahoraCentimos)}${
                    p.foodCostAhora === null ? '' : ` (food cost ${porCiento(p.foodCostAhora)})`
                  }.`,
                ]}
              />
            );
          })}
        </Lista>
      )}
    </Tarjeta>
  );
}

// ── La cocina en el servicio ───────────────────────────────────────────────────

function LaCocinaEnElServicio() {
  const consulta = usarComoVaHoy();
  const cocina = consulta.data?.cocina ?? null;
  const datos: { cifra: string; texto: string; tip: readonly [string, string] }[] =
    cocina === null
      ? []
      : [
          {
            cifra: cocina.media === null ? '—' : minutos(cocina.media),
            texto: 'de media por plato',
            tip: ['Tiempo medio', 'Desde que llega la comanda hasta que sale el plato, hoy.'],
          },
          {
            cifra: cocina.masLenta?.nombre ?? '—',
            texto:
              cocina.masLenta === null
                ? 'lo que más tarda'
                : `el que más tarda · ${minutos(cocina.masLenta.media)}`,
            tip: [
              'El que más tarda',
              cocina.masLenta === null
                ? 'Sale con dos raciones o más esta semana.'
                : `${cocina.masLenta.nombre}: ${minutos(cocina.masLenta.media)} de media esta semana.`,
            ],
          },
          {
            cifra: String(cocina.sacados),
            texto: 'platos sacados hoy',
            tip: ['Platos sacados', 'Lo que ha salido de la cocina hoy.'],
          },
          {
            cifra: String(cocina.mesasEsperando),
            texto: cocina.mesasEsperando === 1 ? 'mesa esperando ahora' : 'mesas esperando ahora',
            tip: [
              'Esperando ahora',
              `${String(cocina.esperando)} platos en la cocina, de ${String(cocina.mesasEsperando)} mesas.`,
            ],
          },
        ];
  return (
    <Tarjeta
      titulo="La cocina en el servicio"
      icono={<IconoOlla />}
      ir="/servicio/jornada/informacion"
      leyendo={consulta}
    >
      {consulta.data === undefined ? (
        <Cargando que="la cocina" lineas={2} />
      ) : cocina === null ? (
        <NadaQueVer>
          Sale en el primer servicio con Estook TPV: lo que tarda, lo más lento y lo que espera.
        </NadaQueVer>
      ) : (
        <dl className="grid flex-1 grid-cols-2 gap-e3 @min-[40rem]:grid-cols-4">
          {datos.map((d) => (
            <div
              key={d.texto}
              className="flex min-w-0 flex-col justify-center border-l border-borde pl-e3 outline-none focus-visible:ring-2 focus-visible:ring-naranja"
              tabIndex={0}
              {...conTip(d.tip[0], d.tip[1])}
            >
              <dd className="truncate text-seccion font-extrabold tabular-nums">{d.cifra}</dd>
              <dt className="truncate text-etiqueta font-semibold text-texto-tenue">{d.texto}</dt>
            </div>
          ))}
        </dl>
      )}
    </Tarjeta>
  );
}

// ── Ventas según canal ─────────────────────────────────────────────────────────

const COLOR_DEL_CANAL: Readonly<Record<CanalDeVentaDelPanel, string>> = {
  sala: 'var(--color-naranja)',
  barra: 'var(--color-seccion-amarillo)',
  para_llevar: 'var(--color-info)',
  reparto: 'var(--color-bien)',
};

/**
 * **Ventas según canal** (nunca «Por dónde entra», Richi, 18-nov): lo vendido hoy en sala, en la
 * barra y la venta rápida, para llevar y en reparto. Richi, 21-nov: «nada a lo ancho para decir
 * poco»; así que cada canal lleva su parte, sus euros, sus tickets y su ticket medio, y la barra
 * entera responde, trozo a trozo. **Uber Eats** entra en «Reparto» cuando se conecte (M29).
 */
function VentasSegunCanal() {
  const consulta = usarComoVaHoy();
  const canales = consulta.data?.canales ?? [];
  const total = canales.reduce((s, c) => s + c.ventas, 0);
  return (
    <Tarjeta
      titulo="Ventas según canal"
      icono={<IconoReparto />}
      ir="/negocio/ventas"
      leyendo={consulta}
      derecha="hoy, con IVA"
    >
      {consulta.data === undefined ? (
        <Cargando que="las ventas de cada canal" lineas={2} />
      ) : total === 0 ? (
        <NadaQueVer>
          Lo vendido hoy en sala, en la barra, para llevar y en reparto. Sale al primer cobro con
          Estook TPV.
        </NadaQueVer>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-e3">
          <div
            className="flex h-[14px] gap-[3px] overflow-hidden rounded-redondo"
            role="img"
            aria-label={canales
              .map(
                (c) =>
                  `${NOMBRE_DEL_CANAL_DE_VENTA[c.canal]} ${porCiento((c.ventas / total) * 100, 0)}`,
              )
              .join(', ')}
          >
            {canales.map((c) => (
              <i
                key={c.canal}
                className="block h-full first:rounded-l-redondo last:rounded-r-redondo"
                style={{
                  width: `${String((c.ventas / total) * 100)}%`,
                  background: COLOR_DEL_CANAL[c.canal],
                }}
                {...conTip(
                  NOMBRE_DEL_CANAL_DE_VENTA[c.canal],
                  `${euros(c.ventas)} · ${porCiento((c.ventas / total) * 100, 0)} de hoy · ${String(c.tickets)} ${c.tickets === 1 ? 'ticket' : 'tickets'}`,
                )}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-e3 @min-[40rem]:grid-cols-4">
            {canales.map((c) => (
              <li
                key={c.canal}
                className="min-w-0 border-l-[3px] pl-e3 outline-none focus-visible:ring-2 focus-visible:ring-naranja"
                style={{ borderColor: COLOR_DEL_CANAL[c.canal] }}
                tabIndex={0}
                {...conTip(
                  NOMBRE_DEL_CANAL_DE_VENTA[c.canal],
                  `Ticket medio ${eurosConCentimos(c.tickets === 0 ? 0 : alCentimo(c.ventas / c.tickets))}`,
                )}
              >
                <b className="block text-[calc(22px*var(--escala))] font-extrabold leading-tight tabular-nums">
                  {porCiento((c.ventas / total) * 100, 0)}
                </b>
                <span className="block truncate text-secundario font-semibold">
                  {NOMBRE_DEL_CANAL_DE_VENTA[c.canal]}
                </span>
                <small className="block truncate text-etiqueta font-semibold text-texto-tenue">
                  {euros(c.ventas)} · {c.tickets} {c.tickets === 1 ? 'ticket' : 'tickets'}
                </small>
              </li>
            ))}
          </ul>
          {!canales.some((c) => c.canal === 'reparto') && (
            <p className="text-etiqueta text-texto-tenue">
              Uber Eats entrará aquí, en «Reparto», cuando lo conectes.
            </p>
          )}
        </div>
      )}
    </Tarjeta>
  );
}

// ── El equipo ──────────────────────────────────────────────────────────────────

function ElEquipoAhora({ titulo }: { readonly titulo: string }) {
  const consulta = usarLoDelPanel<FichajesDeHoy>('fichajes_de_hoy');
  const datos = consulta.data;
  const gente = datos?.gente ?? [];
  const enPausa = gente.filter((p) => p.dentro && p.enPausa === true);
  const trabajando = gente.filter((p) => p.dentro && p.enPausa !== true);
  const faltan =
    datos === undefined
      ? []
      : gente.filter(
          (p) =>
            !p.dentro &&
            p.minutosDeHoy === 0 &&
            p.entraHoyALas !== null &&
            minutosHasta(datos.horaDelLocal, p.entraHoyALas) < 0,
        );
  const enElTurno = trabajando.length + enPausa.length + faltan.length;
  const nombres = (lista: readonly { nombre: string }[]) => lista.map((p) => p.nombre).join(', ');
  return (
    <Tarjeta titulo={titulo} icono={<IconoEquipo />} ir="/equipo/fichajes" leyendo={consulta}>
      {datos === undefined ? (
        <Cargando que="el equipo" lineas={3} />
      ) : enElTurno === 0 ? (
        <Silueta
          icono={<IconoEquipo />}
          paso={{ texto: 'Ver el horario', ir: '/calendario/turnos' }}
        >
          Quién está trabajando, en pausa o falta. Sale al fichar y con el horario publicado.
        </Silueta>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <MedioAnillo
            etiqueta={`${String(enElTurno)} en el turno: ${String(trabajando.length)} trabajando, ${String(enPausa.length)} en pausa, ${String(faltan.length)} faltan`}
            partes={[
              { valor: trabajando.length, color: 'var(--color-bien)', nombre: 'trabajando' },
              { valor: enPausa.length, color: 'var(--color-atencion)', nombre: 'pausa' },
              { valor: faltan.length, color: 'var(--color-mal)', nombre: 'falta' },
            ]}
            centro={String(enElTurno)}
            debajo="en el turno"
          />
          <ul className="mt-e2 flex flex-col gap-[6px] text-etiqueta font-semibold">
            {[
              { nombre: 'Trabajando', color: 'var(--color-bien)', lista: trabajando },
              { nombre: 'En pausa', color: 'var(--color-atencion)', lista: enPausa },
              {
                nombre: faltan.length === 1 ? `Falta (${faltan[0]?.nombre ?? ''})` : 'Faltan',
                color: 'var(--color-mal)',
                lista: faltan,
              },
            ]
              .filter((f) => f.lista.length > 0)
              .map((f) => (
                <li
                  key={f.nombre}
                  className="flex items-center gap-e2 rounded-chico outline-none focus-visible:ring-2 focus-visible:ring-naranja"
                  tabIndex={0}
                  {...conTip(f.nombre, nombres(f.lista))}
                >
                  <i
                    aria-hidden
                    className="size-[10px] shrink-0 rounded-redondo"
                    style={{ background: f.color }}
                  />
                  <span className="min-w-0 truncate">{f.nombre}</span>
                  <em className="ml-auto not-italic tabular-nums text-texto-suave">
                    {f.lista.length}
                  </em>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}

/** Los minutos de un tramo «09:00»–«17:30». Si cruza la medianoche, se suma el día. */
function minutosDelTramo(entra: string, sale: string): number {
  const [he, me] = entra.split(':').map(Number);
  const [hs, ms] = sale.split(':').map(Number);
  const a = (he ?? 0) * 60 + (me ?? 0);
  const b = (hs ?? 0) * 60 + (ms ?? 0);
  return b > a ? b - a : b + 24 * 60 - a;
}

const NOMBRE_ISO = [
  '',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

/**
 * **Tu día** (la cocina y la sala): tu turno de hoy, lo trabajado frente a él, la semana, el próximo
 * día que libras, y **fichar desde aquí** (Richi, 21-nov: «Fichar desde "Tu día"»).
 */
function TuDia({ destacado }: { readonly destacado: boolean }) {
  const fichar = usarFichar();
  const { permisos } = usarSesion();
  const mio = fichar.mio;
  if (fichar.cargando || mio === undefined) {
    return (
      <Tarjeta titulo="Tu día" icono={<IconoReloj />} destacado={destacado}>
        <Cargandose que="tu día" />
      </Tarjeta>
    );
  }
  const hoyEn = mio.horario.filter((t) => t.dia === mio.diaDeLaSemana);
  const delTurno = hoyEn.reduce((s, t) => s + minutosDelTramo(t.entra, t.sale), 0);
  const dentro = mio.abierto !== null;
  const enPausa = dentro && mio.enPausaDesde != null;
  const libra = [1, 2, 3, 4, 5, 6, 7]
    .filter((d) => d > mio.diaDeLaSemana)
    .find((d) => mio.horario.length > 0 && !mio.horario.some((t) => t.dia === d));
  const entraHoy = hoyEn[0]?.entra ?? null;
  const faltan = entraHoy === null ? null : minutosHasta(mio.horaDelLocal, entraHoy);
  const tocaFichar =
    !dentro && faltan !== null && faltan <= AVISAR_ANTES_DE_ENTRAR && faltan > -240;
  const puedeFichar = mio.puedoFichar && puedeVer(permisos, 'accion.fichar');

  return (
    <Tarjeta
      titulo={enPausa ? 'En tu pausa' : 'Tu día'}
      icono={<IconoReloj />}
      ir="/mis-fichajes"
      destacado={destacado}
    >
      <Cifra className="!text-[calc(26px*var(--escala))]">
        {mio.horario.length === 0
          ? 'Sin horario'
          : hoyEn.length === 0
            ? 'Hoy libras'
            : hoyEn.map((t) => `${t.entra} – ${t.sale}`).join(' · ')}
      </Cifra>
      <small
        className={clases(
          'text-etiqueta font-semibold',
          destacado ? 'text-sobre-naranja/80' : 'text-texto-tenue',
        )}
      >
        {dentro
          ? `Fichaste a las ${comoSeLeeLaHora(mio.abierto.entroEn)}`
          : tocaFichar
            ? faltan > 0
              ? `Entras en ${String(faltan)} min`
              : `Entrabas a las ${entraHoy ?? ''}`
            : mio.horario.length === 0
              ? 'Tu turno sale al publicar el horario de la semana'
              : 'Todavía no has fichado'}
      </small>
      {delTurno > 0 && (
        <div className="mt-e3">
          <BarraDeObjetivo
            parte={mio.minutosDeHoy / delTurno}
            alto={10}
            etiqueta={`Llevas ${comoSeLeenMinutos(mio.minutosDeHoy)} de ${comoSeLeenMinutos(delTurno)}`}
            color={
              destacado
                ? 'var(--color-sobre-naranja)'
                : enPausa
                  ? 'var(--color-atencion)'
                  : 'var(--color-naranja)'
            }
            fondo={
              destacado
                ? 'color-mix(in srgb, var(--color-sobre-naranja) 16%, transparent)'
                : undefined
            }
          />
        </div>
      )}
      <p
        className={clases(
          'mt-e2 text-etiqueta font-semibold',
          destacado ? 'text-sobre-naranja' : 'text-texto-suave',
        )}
      >
        {comoSeLeenMinutos(mio.minutosDeHoy)} hoy · {comoSeLeenMinutos(mio.minutosDeLaSemana)} esta
        semana
        {libra !== undefined && hoyEn.length > 0 ? ` · el ${NOMBRE_ISO[libra] ?? ''} libras` : ''}
      </p>
      {fichar.error !== null && (
        <p className="mt-e2 text-etiqueta font-semibold text-mal">{fichar.error.quePasa}</p>
      )}
      {puedeFichar && (
        <div className="mt-auto flex flex-wrap gap-e2 pt-e3">
          <BotonDePausa fichar={fichar} corto />
          {/* Sobre el naranja, el botón en oscuro: el naranja sobre naranja no se ve. */}
          <div
            className={clases(
              'flex-1 [&>button]:w-full',
              destacado &&
                '[&>button]:!border-texto [&>button]:!bg-texto [&>button]:!text-superficie',
            )}
          >
            <Boton
              tono={dentro ? 'secundario' : 'principal'}
              icono={dentro ? <IconoSalir size={18} /> : <IconoEntrar size={18} />}
              cargando={fichar.fichando}
              textoCargando={
                fichar.paso === 'buscando_ubicacion' ? 'Buscando dónde estás' : 'Apuntando'
              }
              onClick={dentro ? fichar.salir : fichar.entrar}
              aria-label={dentro ? 'Fichar la salida' : 'Fichar la entrada'}
            >
              {dentro ? 'Salida' : 'Entrada'}
            </Boton>
          </div>
        </div>
      )}
    </Tarjeta>
  );
}

function MisHoras() {
  const fichar = usarFichar();
  const mio = fichar.mio;
  const dias = usarElIndicador('mis-horas', 7);
  const delHorario = (mio?.horario ?? []).reduce((s, t) => s + minutosDelTramo(t.entra, t.sale), 0);
  const serie = dias.datos?.serie ?? [];
  const puntos: PuntoDelPanel[] = serie.map((d, i) => ({
    eje: LETRA[elDia(d.fecha)] ?? '',
    titulo: `${diaConNumero(d.fecha)}${i === serie.length - 1 ? ' (hoy)' : ''}`,
    texto: d.valor === null || d.valor === 0 ? 'Sin fichar' : comoSeLeenMinutos(d.valor),
    barra: d.valor ?? 0,
  }));
  const hoyEn = (mio?.horario ?? []).filter((t) => t.dia === mio?.diaDeLaSemana);
  return (
    <Tarjeta titulo="Mis horas" icono={<IconoReloj />} ir="/mis-fichajes">
      {mio === undefined ? (
        <Cargandose que="tus horas" />
      ) : (
        <>
          <Cifra>{comoSeLeenMinutos(mio.minutosDeLaSemana)}</Cifra>
          <small className="text-etiqueta font-semibold text-texto-tenue">
            esta semana{delHorario > 0 ? `, de ${comoSeLeenMinutos(delHorario)} del horario` : ''}
          </small>
          {delHorario > 0 && (
            <div className="mt-e3">
              <BarraDeObjetivo
                parte={mio.minutosDeLaSemana / delHorario}
                alto={10}
                color="var(--color-naranja)"
                etiqueta={`${comoSeLeenMinutos(mio.minutosDeLaSemana)} de ${comoSeLeenMinutos(delHorario)}`}
              />
            </div>
          )}
          {puntos.some((p) => (p.barra ?? 0) > 0) && (
            <GraficaDelPanel
              titulo="Lo que has trabajado cada día de los últimos siete"
              puntos={puntos}
              resaltar={puntos.length - 1}
              soloBarras
              formato={(n) => `${String(entero(n / 60))} h`}
            />
          )}
          <p className="mt-auto pt-e2 text-etiqueta font-semibold text-texto-suave">
            {hoyEn.length === 0
              ? 'Hoy no tienes turno'
              : `Hoy, ${hoyEn.map((t) => `de ${t.entra} a ${t.sale}`).join(' y ')}`}
          </p>
        </>
      )}
    </Tarjeta>
  );
}

// ── La carta: menú, agotados y recomendados ────────────────────────────────────

function MenuDelDia() {
  const consulta = usarLoDelPanel<ElMenuDeHoy>('el_menu_de_hoy');
  const puede = usarPuede();
  const menu = consulta.data?.menu ?? null;
  // Un plato por sección, como la maqueta (primero, segundo, postre); el resto, en la etiqueta.
  const platos =
    menu === null
      ? []
      : menu.secciones.flatMap((s) => {
          const primero = s.platos.find((p) => !p.agotado) ?? s.platos[0];
          return primero === undefined
            ? []
            : [{ ...primero, seccion: s.nombre, otros: s.platos.filter((p) => p !== primero) }];
        });
  return (
    <Tarjeta
      titulo="Menú del día"
      icono={<IconoCarta />}
      ir={puede.ver('app.carta') ? '/carta/menus' : undefined}
      leyendo={consulta}
      derecha={menu?.precioCentimos == null ? undefined : eurosConCentimos(menu.precioCentimos)}
    >
      {consulta.data === undefined ? (
        <Cargando que="el menú de hoy" lineas={3} />
      ) : menu === null ? (
        <Silueta
          icono={<IconoCarta />}
          paso={
            puede.editar('app.carta') ? { texto: 'Hacer el menú', ir: '/carta/menus' } : undefined
          }
        >
          {consulta.data.sirveMenus
            ? 'El menú de hoy, con la foto de cada plato.'
            : 'Tu local no sirve menús del día.'}
        </Silueta>
      ) : (
        <ol className="grid flex-1 grid-cols-2 gap-e3 @min-[30rem]:grid-cols-3 @min-[46rem]:grid-cols-4">
          {platos.slice(0, 4).map((p) => (
            <li
              key={`${p.seccion}${p.platoId}`}
              className="flex min-w-0 flex-col gap-[6px] rounded-grande outline-none focus-visible:ring-2 focus-visible:ring-naranja"
              tabIndex={0}
              {...conTip(p.seccion, [p.nombre, ...p.otros.map((o) => o.nombre)].join(' · '))}
            >
              <span
                className={clases(
                  'relative block aspect-[4/3] w-full overflow-hidden rounded-grande bg-fondo',
                  p.agotado && 'grayscale',
                )}
              >
                {p.foto !== null ? (
                  <img
                    src={p.foto}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-texto-tenue">
                    <IconoCarta size={26} />
                  </span>
                )}
                {p.agotado && (
                  <span className="absolute bottom-e2 left-e2 rounded-redondo bg-mal px-e2 py-[2px] text-etiqueta font-bold text-white">
                    Agotado
                  </span>
                )}
              </span>
              <b
                className={clases(
                  'truncate text-secundario font-bold leading-tight',
                  p.agotado && 'text-texto-suave line-through',
                )}
              >
                {p.nombre}
              </b>
              <small className="-mt-[4px] truncate text-etiqueta font-semibold text-texto-tenue">
                {p.seccion}
                {p.otros.length > 0 ? ` · y ${String(p.otros.length)} más` : ''}
              </small>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

function Agotados() {
  const consulta = usarLoDelPanel<LosAgotados>('los_agotados');
  const navegar = useNavigate();
  const puede = usarPuede();
  const agotados = (consulta.data?.platos ?? []).filter((p) => p.agotado !== null);
  const puedeMarcar = puede.editar('accion.marcar_agotado');
  return (
    <Tarjeta
      titulo="Agotados"
      icono={<IconoAtencion />}
      ir={puede.ver('app.carta') ? '/carta/carta/agotados' : undefined}
      leyendo={consulta}
    >
      {consulta.data === undefined ? (
        <Cargando que="los agotados" lineas={2} />
      ) : agotados.length === 0 ? (
        <Silueta
          icono={<IconoEstrella />}
          paso={
            puedeMarcar
              ? {
                  texto: 'Marcar agotado',
                  alPulsar: () => {
                    navegar('/?hacer=agotado');
                  },
                }
              : undefined
          }
        >
          Lo que se acaba hoy. Lo marcas y la sala lo ve al momento.
        </Silueta>
      ) : (
        <>
          <Lista>
            {agotados.slice(0, 3).map((p) => (
              <Fila
                key={p.id}
                icono={<IconoAtencion />}
                tono="mal"
                titulo={p.nombre}
                detalle={p.agotado === null ? undefined : comoSigueAgotado(p.agotado)}
              />
            ))}
          </Lista>
          {puedeMarcar && (
            <div className="mt-auto pt-e3">
              <Boton
                tono="secundario"
                icono={<IconoAnadir size={16} />}
                onClick={() => {
                  navegar('/?hacer=agotado');
                }}
              >
                Marcar agotado
              </Boton>
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
}

/** «Para recomendar» (0120): lo que marcan el gerente y los jefes en la Carta, sin lo agotado. */
function ParaRecomendar() {
  const consulta = usarLoDelPanel<LosRecomendados>('los_recomendados');
  const datos = consulta.data;
  return (
    <Tarjeta
      titulo="Para recomendar"
      icono={<IconoEstrella />}
      ir={datos?.puedeElegir === true ? '/carta/carta' : undefined}
      leyendo={consulta}
    >
      {datos === undefined ? (
        <Cargando que="lo recomendado" lineas={3} />
      ) : datos.platos.length === 0 ? (
        <Silueta
          icono={<IconoEstrella />}
          paso={datos.puedeElegir ? { texto: 'Elegir en la Carta', ir: '/carta/carta' } : undefined}
        >
          {datos.agotados > 0
            ? 'Lo recomendado está agotado hoy.'
            : 'Lo que recomienda la casa, para ofrecerlo en la mesa. Lo eligen el gerente y los jefes en la Carta.'}
        </Silueta>
      ) : (
        <ul className="flex flex-col gap-[7px]">
          {datos.platos.slice(0, 4).map((p) => (
            <li
              key={p.id}
              className="flex min-w-0 items-center gap-e3 rounded-medio outline-none focus-visible:ring-2 focus-visible:ring-naranja"
              tabIndex={0}
              {...conTip(
                p.nombre,
                `${p.seccion ?? 'De la carta'}${p.precioCentimos === null ? '' : ` · ${eurosConCentimos(p.precioCentimos)}`}`,
              )}
            >
              {p.foto !== null ? (
                <img
                  src={p.foto}
                  alt=""
                  loading="lazy"
                  className="size-9 shrink-0 rounded-medio object-cover"
                />
              ) : (
                <LaBaldosaDeLaSeccion icono={p.icono} color={p.color} lado={36} suave />
              )}
              <span className="min-w-0 flex-1 text-secundario leading-tight">
                <span className="block truncate font-semibold">{p.nombre}</span>
                <small className="block truncate text-etiqueta text-texto-tenue">
                  {p.seccion ?? 'De la carta'}
                </small>
              </span>
              {p.precioCentimos !== null && (
                <em className="shrink-0 text-secundario font-bold not-italic tabular-nums">
                  {eurosConCentimos(p.precioCentimos)}
                </em>
              )}
            </li>
          ))}
          {datos.platos.length > 4 && (
            <li className="text-etiqueta font-semibold text-texto-tenue">
              y {datos.platos.length - 4} más
            </li>
          )}
        </ul>
      )}
    </Tarjeta>
  );
}

// ── El tablón y los atajos ─────────────────────────────────────────────────────

function ElTablon() {
  const consulta = usarElTablon();
  const navegar = useNavigate();
  const notas = consulta.data?.notas ?? [];
  return (
    <Tarjeta titulo="El tablón" icono={<IconoTablon />} leyendo={consulta}>
      {consulta.data === undefined ? (
        <Cargando que="el tablón" lineas={2} />
      ) : notas.length === 0 ? (
        <Silueta
          icono={<IconoTablon />}
          paso={{
            texto: 'Escribir',
            alPulsar: () => {
              navegar('/?hacer=tablon');
            },
          }}
        >
          Lo que escribe el encargado: avisos del día, visitas, lo que no se puede olvidar.
        </Silueta>
      ) : (
        <>
          <Lista>
            {notas.slice(0, 2).map((n) => (
              <Fila
                key={n.id}
                icono={<IconoChat />}
                tono={n.leida ? 'neutro' : 'naranja'}
                titulo={n.autor}
                detalle={n.texto}
                tip={[`${n.autor} · ${n.cuando}`, n.texto]}
              />
            ))}
          </Lista>
          <div className="mt-auto pt-e3">
            <Boton
              tono="texto"
              icono={<IconoAnadir size={16} />}
              onClick={() => {
                navegar('/?hacer=tablon');
              }}
            >
              Escribir
            </Boton>
          </div>
        </>
      )}
    </Tarjeta>
  );
}

function Atajos() {
  const navegar = useNavigate();
  const puede = usarPuede();
  const botones = [
    puede.editar('accion.registrar_merma') && {
      texto: 'Apuntar merma',
      icono: <IconoAtencion size={18} />,
      ir: '/?hacer=merma',
    },
    puede.ver('app.escandallos') && {
      texto: 'Fichas técnicas',
      icono: <IconoEscandallos size={18} />,
      ir: '/escandallos/fichas',
    },
    puede.ver('app.almacen') && {
      texto: 'Contar',
      icono: <IconoAlmacen size={18} />,
      ir: '/almacen/movimientos/inventario',
    },
  ].filter((b): b is { texto: string; icono: ReactElement; ir: string } => b !== false);
  return (
    <Tarjeta titulo="Atajos" icono={<IconoPrisa />}>
      <div className="flex flex-1 flex-wrap items-center gap-e2">
        {botones.map((b) => (
          <Boton
            key={b.texto}
            tono="secundario"
            icono={b.icono}
            onClick={() => {
              navegar(b.ir);
            }}
          >
            {b.texto}
          </Boton>
        ))}
      </div>
    </Tarjeta>
  );
}

export type { ComoVaHoy };
