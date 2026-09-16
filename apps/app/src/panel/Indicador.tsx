import { useNavigate } from 'react-router-dom';
import {
  COMO_ES_EL_INDICADOR,
  comoCambia,
  comoSeLeenLasHoras,
  leerIdDelIndicador,
  nombreDelIndicador,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import { puedeTenerElIndicador, puedeVer } from '@estook/permisos';
import {
  Cargando,
  Tarjeta,
  Tendencia,
  Variacion,
  acentoDelWidget,
  clases,
  comoDeGrande,
  usarQueEstaVacio,
  type TamanoDeWidget,
} from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero, comoSeLeeLaFecha } from '../inventario/contrato.ts';

/**
 * Un indicador en el Panel: la cifra, su flecha y su línea (M7, decisión 0039).
 *
 * «Me gustaría algo más moderno, con gráficas y flechas de subida y bajada.» Es la
 * tarjeta de resumen que tienen Square, Shopify o Stripe, con las reglas de aquí:
 *
 *   · **La cifra de verdad, grande**, con de dónde sale debajo (E1).
 *   · **La flecha compara con el periodo anterior del mismo largo**, y su color
 *     dice si es buena noticia, que lo decide el dominio: que la merma baje es
 *     verde.
 *   · **La línea de los días**, cortada donde no hay dato. Un lunes cerrado no
 *     vendió cero.
 *
 * Lo que no hace: sumar. Todo llega hecho de `un_indicador`, y así el food cost del
 * Panel es el mismo que el de Servicio (lo comprueba `el-panel-vivo.prueba.ts`).
 */
interface SalidaUnIndicador {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly jornada: string;
  readonly serie: readonly { readonly fecha: string; readonly valor: number | null }[];
  readonly total: number | null;
  readonly anterior: number | null;
  readonly diasConDato: number;
}

/** Cómo se escribe una cifra de cada unidad. */
export function comoSeEscribe(indicador: Indicador, valor: number): string {
  switch (COMO_ES_EL_INDICADOR[indicador].unidad) {
    case 'dinero':
      return comoDinero(valor);
    case 'porcentaje':
      return `${valor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
    case 'minutos':
      return comoSeLeenLasHoras(valor);
  }
}

/** Dónde se mira el detalle de cada uno, si quien lo tiene puede entrar. */
const DONDE_SE_MIRA: Readonly<Record<Indicador, string | null>> = {
  ventas: '/servicio/jornada/cierre',
  'ticket-medio': '/servicio/jornada/cierre',
  'food-cost': '/servicio/jornada/cierre',
  merma: '/inventario/movimientos/mermas',
  compras: '/inventario/compras/albaranes',
  // Las horas propias no tienen pantalla aparte todavía: el cuadrante es M14.
  'mis-horas': null,
};

export function IndicadorWidget({
  id,
  tamano,
}: {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}) {
  const leido = leerIdDelIndicador(id);
  if (leido === null) return null;
  return <LaTarjeta indicador={leido.indicador} dias={leido.dias} id={id} tamano={tamano} />;
}

function LaTarjeta({
  indicador,
  dias,
  id,
  tamano,
}: {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}) {
  const { permisos, yo } = usarSesion();
  const navegar = useNavigate();
  const como = COMO_ES_EL_INDICADOR[indicador];
  const puede =
    yo?.local !== null &&
    yo?.local !== undefined &&
    puedeTenerElIndicador((permiso) => puedeVer(permisos, permiso), indicador);

  const consulta = usarLectura<SalidaUnIndicador>(
    'un_indicador',
    { indicador, dias: String(dias) },
    puede,
  );
  const datos = consulta.data;

  // Vacío es «no hay ni un dato en el periodo»: sin cierres, no hay ventas que
  // enseñar. Una merma de cero euros **no** es vacío, es una buena semana.
  usarQueEstaVacio(datos === undefined ? undefined : datos.total === null);

  const cambio = datos === undefined ? null : comoCambia(indicador, datos.total, datos.anterior);
  const acento = acentoDelWidget(id) ?? 'var(--color-naranja)';
  const frenteA = `frente a los ${dias} días anteriores`;
  const destino = DONDE_SE_MIRA[indicador];

  return (
    <div className="h-full [&>section]:flex [&>section]:h-full [&>section]:flex-col">
      <Tarjeta
        titulo={tamano === 'chico' ? como.nombre : nombreDelIndicador(indicador, dias)}
        acento={acento}
        {...(destino === null || tamano === 'chico'
          ? {}
          : {
              accion: (
                <button
                  type="button"
                  onClick={() => {
                    navegar(destino);
                  }}
                  className="min-h-toque rounded-medio px-e2 text-secundario font-medium text-texto-suave hover:text-texto"
                >
                  Ver
                </button>
              ),
            })}
        {...(datos === undefined || tamano === 'chico'
          ? {}
          : {
              origen:
                !como.sinDatoEsCero && datos.diasConDato < dias
                  ? `${como.deDonde} · ${datos.diasConDato} de ${dias} días con dato`
                  : como.deDonde,
            })}
      >
        {datos === undefined ? (
          <Cargando que={como.nombre.toLowerCase()} lineas={2} />
        ) : datos.total === null ? (
          <p className="text-secundario text-texto-suave">
            {indicador === 'ventas' || indicador === 'ticket-medio' || indicador === 'food-cost'
              ? `Sin cajas cerradas en estos ${dias} días.`
              : 'Todavía no hay datos en este periodo.'}
          </p>
        ) : (
          <div className="flex h-full min-h-0 flex-col justify-between gap-e2">
            <div className="flex flex-wrap items-center gap-x-e2 gap-y-e1">
              {/* La cifra elige su tamaño por lo que ocupa, como `Cifra` (regla 59). */}
              <p
                className={clases(
                  comoDeGrande(comoSeEscribe(indicador, datos.total)),
                  'font-bold leading-tight tabular-nums',
                )}
              >
                {comoSeEscribe(indicador, datos.total)}
              </p>
              {cambio !== null && (
                <Variacion
                  sube={cambio.sube}
                  cuanto={cambio.cuanto}
                  enPuntos={cambio.enPuntos}
                  bueno={cambio.bueno}
                  frenteA={frenteA}
                />
              )}
            </div>

            {tamano === 'chico' && cambio === null && datos.anterior === null && (
              <p className="text-etiqueta text-texto-suave">Sin periodo anterior</p>
            )}

            <Tendencia
              valores={datos.serie.map((d) => d.valor)}
              titulo={nombreDelIndicador(indicador, dias)}
              color={acento}
              alto={tamano === 'grande' ? 120 : tamano === 'ancho' ? 52 : 32}
              formato={(v) => comoSeEscribe(indicador, v)}
            />

            {tamano === 'grande' && (
              <p className="flex justify-between text-etiqueta text-texto-suave">
                <span>{comoSeLeeLaFecha(datos.serie[0]?.fecha ?? datos.jornada)}</span>
                <span>Hoy</span>
              </p>
            )}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
