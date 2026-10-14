import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COMO_ES_EL_INDICADOR,
  comoCambia,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import {
  Boton,
  Cargando,
  ElegirPeriodo,
  GraficaViva,
  Hoja,
  Variacion,
  acentoDelWidget,
  clases,
  comoDeGrande,
  comoSeEscribe,
  usarQueEstaVacio,
  type DatosDelIndicador,
  type FormaDeLaGraficaViva,
} from '@estook/ui';
import { DONDE_SE_MIRA, usarElIndicador } from '../ganchos/usarElIndicador.ts';
import { elDiaCorto, usarElPeriodoDelWidget } from '../ganchos/usarElPeriodoDelWidget.ts';
import { Marco } from './Marco.tsx';

/**
 * Un widget de cifra (la experiencia, 0083): la merma, las ventas, el valor de la
 * cámara, lo comprado, tus horas.
 *
 * Arriba, su nombre y **su periodo, dentro** («7 d · 30 d»). En medio, la cifra en
 * grande con cómo va frente al periodo anterior. Abajo, **su gráfica, que se toca**:
 * al pasar el dedo dice cada día. Y al tocarla, o con «ampliar», **se abre su
 * detalle**: la gráfica grande con sus ejes, la media, de dónde sale y lo que se
 * quiera poner al lado (en Ventas, el ticket medio y las cajas cerradas).
 *
 * El número es el de `un_indicador`, el mismo que en la fila de cifras de cada app.
 */
export interface CifraDelWidgetProps {
  readonly id: string;
  readonly titulo: string;
  readonly indicador: Indicador;
  /** Si no, la que diga el indicador: línea o barras. */
  readonly forma?: FormaDeLaGraficaViva;
  /** Lo de debajo de la gráfica: el botón de apuntar la merma. */
  readonly abajo?: ReactNode;
  /** Si ocupa dos columnas: su gráfica, más alta. */
  readonly ancho?: boolean;
  /** Lo que se dice sin un solo dato, si no vale lo de siempre. */
  readonly sinDatos?: ReactNode;
  /** Lo de más que va en el detalle. */
  readonly enElDetalle?: (dias: PeriodoDelIndicador) => ReactNode;
}

export function CifraDelWidget({
  id,
  titulo,
  indicador,
  forma,
  abajo,
  ancho = false,
  sinDatos,
  enElDetalle,
}: CifraDelWidgetProps) {
  const [dias, setDias] = usarElPeriodoDelWidget(id);
  const [abierto, setAbierto] = useState(false);
  // El día que señala el dedo o el ratón en la gráfica (0084): el número grande pasa a
  // ser el de ese día, en su sitio. Antes salía un bocadillo que se salía de la tarjeta.
  const [senalado, setSenalado] = useState<number | null>(null);
  const { datos, fallo } = usarElIndicador(indicador, dias);
  const acento = acentoDelWidget(id) ?? 'var(--color-naranja)';
  const como = COMO_ES_EL_INDICADOR[indicador];
  const dibujo: FormaDeLaGraficaViva = forma ?? (como.grafica === 'barras' ? 'barras' : 'area');

  // Vacío es «ni un dato en el periodo»: sin cierres no hay ventas que enseñar. Una
  // merma de cero euros **no** es vacío, es una buena semana.
  usarQueEstaVacio(datos === undefined ? undefined : datos.total === null);

  return (
    <Marco
      titulo={titulo}
      derecha={
        <ElegirPeriodo
          corto
          periodo={dias}
          alElegir={setDias}
          etiqueta={`${titulo}, de cuántos días`}
        />
      }
      alAmpliar={() => {
        setAbierto(true);
      }}
    >
      {fallo ? (
        <p className="text-secundario text-texto-suave">
          No he podido leerlo. Prueba en un momento.
        </p>
      ) : datos === undefined ? (
        <Cargando que={titulo.toLowerCase()} lineas={2} />
      ) : datos.total === null ? (
        <div className="flex h-full flex-col justify-between gap-e3">
          {sinDatos ?? (
            <p className="text-secundario text-texto-suave">Sin datos en estos {dias} días.</p>
          )}
          {abajo}
        </div>
      ) : (
        <div className="flex h-full flex-col gap-e2">
          {/* Toda la cifra abre el detalle; el teclado lo tiene en «ampliar». */}
          <div
            className="-mx-e2 cursor-pointer rounded-grande px-e2 transition-colors duration-[--rapido] hover:bg-fondo/50"
            onClick={() => {
              setAbierto(true);
            }}
          >
            <LaCifra indicador={indicador} datos={datos} dias={dias} senalado={senalado} />
            {/*
              Todo a cero no se dibuja: una raya en el suelo no dice nada, y una
              semana sin merma se cuenta mejor con palabras.
            */}
            {datos.serie.every((d) => (d.valor ?? 0) === 0) ? (
              <p className="mt-e1 text-secundario text-texto-suave">Nada en estos {dias} días.</p>
            ) : (
              <div className="-mx-e1 mt-e2">
                <GraficaViva
                  titulo={`${titulo}, día a día`}
                  puntos={puntosDe(datos)}
                  anteriores={datos.serieAnterior}
                  forma={dibujo}
                  color={acento}
                  formato={(v) => comoSeEscribe(indicador, v)}
                  alto={ancho ? 96 : 58}
                  resaltarElUltimo
                  alSenalar={setSenalado}
                />
              </div>
            )}
          </div>
          {abajo}
        </div>
      )}

      <DetalleDeLaCifra
        abierto={abierto}
        alCerrar={() => {
          setAbierto(false);
        }}
        titulo={titulo}
        indicador={indicador}
        dias={dias}
        alCambiarDias={setDias}
        acento={acento}
        forma={dibujo}
        {...(enElDetalle === undefined ? {} : { enElDetalle })}
      />
    </Marco>
  );
}

function puntosDe(datos: DatosDelIndicador) {
  return datos.serie.map((dia) => ({
    etiqueta: elDiaCorto(dia.fecha),
    valor: dia.valor,
  }));
}

/**
 * La cifra en grande y cómo va frente al periodo de antes. Con un día señalado en la
 * gráfica, la de ese día y su fecha (0084): el número está siempre en el mismo sitio.
 */
function LaCifra({
  indicador,
  datos,
  dias,
  grande = false,
  senalado = null,
}: {
  readonly indicador: Indicador;
  readonly datos: DatosDelIndicador;
  readonly dias: PeriodoDelIndicador;
  readonly grande?: boolean;
  readonly senalado?: number | null;
}) {
  if (datos.total === null) return null;
  const elDia = senalado === null ? undefined : datos.serie[senalado];
  if (elDia !== undefined) {
    const deAntes = datos.serieAnterior?.[senalado ?? -1] ?? null;
    const escritaDelDia = elDia.valor === null ? 'Sin dato' : comoSeEscribe(indicador, elDia.valor);
    return (
      <div className="flex flex-wrap items-baseline gap-x-e2 gap-y-e1" aria-live="polite">
        <p
          className={clases(
            comoDeGrande(escritaDelDia),
            'font-bold tracking-[-0.02em] tabular-nums',
          )}
        >
          {escritaDelDia}
        </p>
        <span className="rounded-redondo bg-fondo px-e2 py-[1px] text-etiqueta font-semibold text-texto-suave">
          {elDiaCorto(elDia.fecha)}
          {deAntes === null ? '' : ` · antes ${comoSeEscribe(indicador, deAntes)}`}
        </span>
      </div>
    );
  }
  const escrita = comoSeEscribe(indicador, datos.total, dias);
  const cambio = comoCambia(indicador, datos.total, datos.anterior);
  return (
    <div className="flex flex-wrap items-baseline gap-x-e2 gap-y-e1">
      <p
        className={clases(
          grande ? 'text-[calc(40px*var(--escala))] leading-none' : comoDeGrande(escrita),
          'font-bold tracking-[-0.02em]',
        )}
      >
        {escrita}
      </p>
      {cambio !== null && (
        <Variacion
          sube={cambio.sube}
          cuanto={cambio.cuanto}
          en={cambio.en}
          bueno={cambio.bueno}
          frenteA={`frente a los ${dias} días anteriores`}
        />
      )}
    </div>
  );
}

/** El detalle de una cifra: grande, con ejes, la media y de dónde sale. */
export function DetalleDeLaCifra({
  abierto,
  alCerrar,
  titulo,
  indicador,
  dias,
  alCambiarDias,
  acento,
  forma,
  enElDetalle,
}: {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  readonly titulo: string;
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly alCambiarDias: (dias: PeriodoDelIndicador) => void;
  readonly acento: string;
  readonly forma: FormaDeLaGraficaViva;
  readonly enElDetalle?: (dias: PeriodoDelIndicador) => ReactNode;
}) {
  const navegar = useNavigate();
  const como = COMO_ES_EL_INDICADOR[indicador];
  // Solo se lee abierto: cerrado, el widget ya tiene la suya en la caché.
  const { datos } = usarElIndicador(indicador, dias);
  const destino = DONDE_SE_MIRA[indicador];
  const conDato = (datos?.serie ?? []).filter((d) => d.valor !== null);
  const media =
    conDato.length === 0 || como.periodo === 'foto'
      ? null
      : conDato.reduce((suma, d) => suma + (d.valor ?? 0), 0) / conDato.length;

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={titulo} amplia>
      {abierto && (
        <div className="flex flex-col gap-e5 pt-e4">
          <div className="flex flex-wrap items-end justify-between gap-e3">
            <div className="flex flex-col gap-e1">
              <p className="text-secundario text-texto-suave">{como.queEnsena}</p>
              {datos === undefined ? (
                <Cargando que={titulo.toLowerCase()} lineas={1} />
              ) : datos.total === null ? (
                <p className="text-cuerpo text-texto-suave">Sin datos en estos {dias} días.</p>
              ) : (
                <LaCifra indicador={indicador} datos={datos} dias={dias} grande />
              )}
            </div>
            <ElegirPeriodo
              periodo={dias}
              alElegir={alCambiarDias}
              etiqueta={`${titulo}, de cuántos días`}
            />
          </div>

          {datos !== undefined && datos.total !== null && (
            <div className="rounded-grande border border-borde bg-fondo/40 p-e3 pt-e4">
              <GraficaViva
                titulo={`${titulo}, día a día, ${dias} días`}
                puntos={puntosDe(datos)}
                anteriores={datos.serieAnterior}
                forma={forma}
                color={acento}
                formato={(v) => comoSeEscribe(indicador, v)}
                alto={260}
                conEjes
                resaltarElUltimo
                referencia={
                  media === null
                    ? null
                    : { valor: media, nombre: `Media ${comoSeEscribe(indicador, media)}` }
                }
              />
              {datos.serieAnterior?.some((v) => v !== null) === true && (
                <p className="mt-e2 flex flex-wrap items-center gap-x-e4 gap-y-e1 px-e1 text-etiqueta text-texto-suave">
                  <span className="inline-flex items-center gap-e1">
                    <span
                      aria-hidden
                      className="h-[2px] w-4 rounded-redondo"
                      style={{ background: acento }}
                    />
                    Estos {dias} días
                  </span>
                  <span className="inline-flex items-center gap-e1">
                    <span aria-hidden className="w-4 border-t-2 border-dashed border-texto-tenue" />
                    Los {dias} anteriores
                  </span>
                </p>
              )}
            </div>
          )}

          {enElDetalle?.(dias)}

          <div className="flex flex-wrap items-center justify-between gap-e3 border-t border-borde pt-e3">
            <p className="text-etiqueta text-texto-tenue">
              {como.deDonde}
              {datos !== undefined && !como.sinDatoEsCero && datos.diasConDato < dias
                ? ` · ${datos.diasConDato} de ${dias} días con dato`
                : ''}
            </p>
            {destino !== null && (
              <Boton
                tono="secundario"
                onClick={() => {
                  alCerrar();
                  navegar(destino);
                }}
              >
                Ir a {titulo.toLowerCase()}
              </Boton>
            )}
          </div>
        </div>
      )}
    </Hoja>
  );
}

/**
 * Una cifra pequeña al lado de otra, para el detalle (el ticket medio y las cajas
 * cerradas, junto a las ventas). Lee su propio indicador con el mismo periodo.
 */
export function CifraPequena({
  indicador,
  dias,
}: {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
}) {
  const { datos, puede } = usarElIndicador(indicador, dias);
  if (!puede) return null;
  const como = COMO_ES_EL_INDICADOR[indicador];
  const cambio =
    datos === undefined || datos.total === null
      ? null
      : comoCambia(indicador, datos.total, datos.anterior);
  return (
    <div className="flex flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3">
      <p className="text-secundario text-texto-suave">{como.nombre}</p>
      <p className="text-seccion font-bold">
        {datos === undefined
          ? '…'
          : datos.total === null
            ? '—'
            : comoSeEscribe(indicador, datos.total, dias)}
      </p>
      {cambio !== null && (
        <div>
          <Variacion
            sube={cambio.sube}
            cuanto={cambio.cuanto}
            en={cambio.en}
            bueno={cambio.bueno}
            frenteA={`frente a los ${dias} días anteriores`}
          />
        </div>
      )}
    </div>
  );
}
