import {
  COMO_ES_EL_INDICADOR,
  comoCambia,
  nombreDelIndicador,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import { clases } from '../clases.ts';
import { Cargando } from '../componentes/Cargando.tsx';
import { comoDeGrande } from '../componentes/comoDeGrande.ts';
import { Tarjeta } from '../componentes/Tarjeta.tsx';
import { Tendencia } from '../componentes/Tendencia.tsx';
import { Tira } from '../componentes/Tira.tsx';
import { Variacion } from '../componentes/Variacion.tsx';
import type { TamanoDeWidget } from './catalogo.ts';
import { comoSeEscribe } from './comoSeEscribe.ts';

/**
 * Un indicador: la cifra, su flecha y su línea (M7, 0039; en `@estook/ui` desde V).
 *
 * «Me gustaría algo más moderno, con gráficas y flechas de subida y bajada.» Es la
 * tarjeta de resumen que tienen Square, Shopify o Stripe, con las reglas de aquí:
 *
 *   · **La cifra de verdad, grande**, con de dónde sale debajo (E1).
 *   · **La flecha compara con el periodo anterior del mismo largo**, y su color
 *     dice si es buena noticia, que lo decide el dominio: que la merma baje es
 *     verde.
 *   · **La línea de los días**, en discontinuo donde no hay dato. Un lunes cerrado no
 *     vendió cero.
 *
 * ── Por qué vive aquí y no en la aplicación ─────────────────────────────────
 *
 * Porque desde la mejora 2 la usan el Panel **y las tres apps** —Almacén,
 * Servicio y Equipo— con sus cifras. «No se copia la tarjeta: se usa la misma.»
 * Esta pieza solo pinta: los datos llegan hechos de `un_indicador` y quien la usa
 * se los pasa, así que el food cost del Panel es el mismo que el de Servicio.
 */

/** Lo que devuelve `un_indicador`, tal cual. */
export interface DatosDelIndicador {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly jornada: string;
  readonly serie: readonly { readonly fecha: string; readonly valor: number | null }[];
  readonly total: number | null;
  readonly anterior: number | null;
  readonly diasConDato: number;
}

export interface TarjetaDeIndicadorProps {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  /** Sin definir mientras llegan. */
  readonly datos: DatosDelIndicador | undefined;
  /** Si no se han podido leer. */
  readonly fallo?: boolean;
  readonly tamano: TamanoDeWidget;
  readonly acento: string;
  /**
   * El título sin el periodo, para cuando ya se dice arriba: en la fila de cifras
   * de una app el «7 días» está en el selector, y repetirlo en cada tarjeta es ruido.
   */
  readonly sinPeriodoEnElTitulo?: boolean;
  /** Lo que abre su detalle. */
  readonly alVer?: () => void;
  /**
   * Si **toda la tarjeta** lleva al detalle, en vez de un botón «Ver». Es lo que
   * pide una fila de cifras: una tarjeta pequeña con un botón dentro es un blanco
   * de pocos milímetros, y en el Panel no, porque ahí mantener pulsado es editar.
   */
  readonly enlazada?: boolean;
}

/** Qué se dice cuando el periodo no tiene ni un dato. */
function sinDatos(indicador: Indicador, dias: PeriodoDelIndicador): string {
  switch (indicador) {
    case 'ventas':
    case 'ticket-medio':
    case 'food-cost':
      return `Sin cajas cerradas en estos ${dias} días.`;
    case 'retrasos':
      // No es «ningún retraso»: es que no había hora de entrada con la que comparar.
      return 'Nadie tenía hora de entrada: pon el horario de siempre en la ficha de cada uno.';
    default:
      return 'Todavía no hay datos en este periodo.';
  }
}

/** «12 sep», para el pie de la línea. La fecha llega hecha del servidor (regla 10). */
function comoSeLeeElDia(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function TarjetaDeIndicador({
  indicador,
  dias,
  datos,
  fallo = false,
  tamano,
  acento,
  sinPeriodoEnElTitulo = false,
  alVer,
  enlazada = false,
}: TarjetaDeIndicadorProps) {
  const como = COMO_ES_EL_INDICADOR[indicador];
  const cambio = datos === undefined ? null : comoCambia(indicador, datos.total, datos.anterior);
  const frenteA = `frente a los ${dias} días anteriores`;
  const titulo =
    tamano === 'chico' || sinPeriodoEnElTitulo ? como.nombre : nombreDelIndicador(indicador, dias);
  const conBotonVer = alVer !== undefined && !enlazada && tamano !== 'chico';

  const tarjeta = (
    <Tarjeta
      titulo={titulo}
      acento={acento}
      {...(conBotonVer
        ? {
            accion: (
              <button
                type="button"
                onClick={alVer}
                className="min-h-toque rounded-medio px-e2 text-secundario font-medium text-texto-suave hover:text-texto"
              >
                Ver
              </button>
            ),
          }
        : {})}
      {...(datos === undefined || tamano === 'chico'
        ? {}
        : {
            origen:
              !como.sinDatoEsCero && datos.diasConDato < dias
                ? `${como.deDonde} · ${datos.diasConDato} de ${dias} días con dato`
                : como.deDonde,
          })}
    >
      {fallo ? (
        <p className="text-secundario text-texto-suave">
          No he podido leerlo. Prueba dentro de un momento.
        </p>
      ) : datos === undefined ? (
        <Cargando que={como.nombre.toLowerCase()} lineas={2} />
      ) : datos.total === null ? (
        <p className="text-secundario text-texto-suave">{sinDatos(indicador, dias)}</p>
      ) : (
        <div className="flex h-full min-h-0 flex-col justify-between gap-e2">
          <div className="flex flex-wrap items-center gap-x-e2 gap-y-e1">
            {/* La cifra elige su tamaño por lo que ocupa, como `Cifra` (regla 59). */}
            <p
              className={clases(
                comoDeGrande(comoSeEscribe(indicador, datos.total, dias)),
                'font-bold leading-tight tabular-nums',
              )}
            >
              {comoSeEscribe(indicador, datos.total, dias)}
            </p>
            {cambio !== null && (
              <Variacion
                sube={cambio.sube}
                cuanto={cambio.cuanto}
                en={cambio.en}
                bueno={cambio.bueno}
                frenteA={frenteA}
              />
            )}
          </div>

          {tamano === 'chico' && cambio === null && datos.anterior === null && (
            <p className="text-etiqueta text-texto-suave">Sin periodo anterior</p>
          )}

          {como.grafica === 'barras' ? (
            <Tira
              titulo={nombreDelIndicador(indicador, dias)}
              puntos={datos.serie.map((dia) => ({
                valor: dia.valor ?? 0,
                cuando: comoSeLeeElDia(dia.fecha),
              }))}
              formato={(v) => comoSeEscribe(indicador, v)}
              color={acento}
              alto={tamano === 'grande' ? 120 : tamano === 'ancho' ? 52 : 32}
            />
          ) : (
            <Tendencia
              valores={datos.serie.map((d) => d.valor)}
              titulo={nombreDelIndicador(indicador, dias)}
              color={acento}
              alto={tamano === 'grande' ? 120 : tamano === 'ancho' ? 52 : 32}
              formato={(v) => comoSeEscribe(indicador, v)}
            />
          )}

          {tamano === 'grande' && (
            <p className="flex justify-between text-etiqueta text-texto-suave">
              <span>{comoSeLeeElDia(datos.serie[0]?.fecha ?? datos.jornada)}</span>
              <span>Hoy</span>
            </p>
          )}
        </div>
      )}
    </Tarjeta>
  );

  if (!enlazada || alVer === undefined) {
    return (
      <div className="h-full [&>section]:flex [&>section]:h-full [&>section]:flex-col">
        {tarjeta}
      </div>
    );
  }

  // ── Toda la tarjeta lleva al detalle ────────────────────────────────────
  //
  // Un botón que la cubre entera, **encima y no alrededor**: una sección con su
  // título no puede ir dentro de un botón, y un lector de pantalla leería el
  // botón como «Ver valor de la cámara» sin tener que recorrer la tarjeta.
  return (
    <div className="relative h-full [&>section]:flex [&>section]:h-full [&>section]:flex-col">
      {tarjeta}
      <button
        type="button"
        onClick={alVer}
        aria-label={`Ver ${como.nombre.toLowerCase()} a detalle`}
        // Sin fondo: iría encima de la cifra y la taparía. Al pasar por encima se
        // marca el borde, y el anillo del foco lo pone `base.css` para todos.
        className="absolute inset-0 rounded-grande border border-transparent hover:border-borde-fuerte"
      />
    </div>
  );
}
