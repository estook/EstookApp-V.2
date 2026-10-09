import { useSearchParams } from 'react-router-dom';
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import {
  COMO_ES_EL_INDICADOR,
  comoCambia,
  esTipoDeInforme,
  hayDatos,
  type TipoDeInforme,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Mosaico,
  Pieza,
  Tarjeta,
  Tendencia,
  Tira,
  Variacion,
  clases,
  comoSeEscribe,
} from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { ListaDelSemaforo } from '../objetivos/Semaforo.tsx';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import type { CifraDelInforme, ElInforme } from './contrato.ts';

/**
 * Negocio → Informes · Tu día, Tu semana y Tu mes (entrega R2, mejora 16 · 0053).
 *
 * «Por correo al gerente: ventas, food cost, merma y horas.» Esta es la pantalla, y
 * el correo es su resumen con un enlace aquí. Lo esencial arriba —el periodo y las
 * tres frases— y debajo las cifras con su flecha, cada una contada como su tarjeta.
 * En la semana, además, los objetivos.
 *
 * El periodo va en la dirección (`?del=2026-09-21`) y no «cuántos atrás»: el
 * enlace del correo del lunes, abierto el jueves, sigue enseñando esa semana.
 */
const ACENTO = 'var(--color-app-negocio)';

/** «12 sep», para cada barra. La fecha llega hecha del servidor (regla 10). */
function comoSeLeeElDia(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

/** «Del 21 al 27 de septiembre», con mayúscula al empezar. */
function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function Informes({ vista }: { readonly vista: string }) {
  const tipo: TipoDeInforme = esTipoDeInforme(vista) ? vista : 'dia';
  const [parametros, ponerParametros] = useSearchParams();
  const del = parametros.get('del');
  const consulta = usarLectura<ElInforme>('mi_informe', {
    tipo,
    ...(del === null ? {} : { del }),
  });

  function irA(fecha: string | null) {
    const nuevos = new URLSearchParams(parametros);
    if (fecha === null) nuevos.delete('del');
    else nuevos.set('del', fecha);
    ponerParametros(nuevos);
  }

  if (consulta.isPending) return <Cargando que="tu informe" lineas={4} />;
  if (consulta.isError) {
    return (
      <Aviso
        tono="mal"
        titulo="No he podido leer tu informe"
        accion={
          <Boton
            tono="secundario"
            onClick={() => {
              void consulta.refetch();
            }}
          >
            Reintentar
          </Boton>
        }
      >
        Mira la conexión y vuelve a probar.
      </Aviso>
    );
  }

  const informe = consulta.data;
  const { periodo, frases } = informe;
  const conDatos = hayDatos(informe.cifras);

  return (
    <div className="flex flex-col gap-e4">
      {/* El periodo, con sus flechas para ir hacia atrás y volver. */}
      <div className="flex items-center justify-between gap-e3">
        <Boton
          tono="texto"
          icono={<IconoFlechaIzquierda size={18} />}
          disabled={informe.anteriorDel === null}
          aria-label="El periodo anterior"
          onClick={() => {
            irA(informe.anteriorDel);
          }}
        >
          <span className="hidden sm:inline">Anterior</span>
        </Boton>
        <div className="min-w-0 text-center">
          <h2 className="text-titulo font-semibold">{informe.titulo}</h2>
          <p className="text-secundario text-texto-suave" data-periodo={periodo.desde}>
            {conMayuscula(periodo.nombre)}
          </p>
        </div>
        <Boton
          tono="texto"
          icono={<IconoFlechaDerecha size={18} />}
          disabled={informe.siguienteDel === null}
          aria-label="El periodo siguiente"
          onClick={() => {
            irA(informe.siguienteDel);
          }}
        >
          <span className="hidden sm:inline">Siguiente</span>
        </Boton>
      </div>

      {/*
        El mismo informe, en PDF con tu logo (0068): lo hace el servidor. Sin datos no
        se ofrece: un PDF vacío no le sirve a nadie (auditoría del 9-oct).
      */}
      {conDatos && (
        <div className="flex justify-center">
          <BotonDelDocumento
            consulta={'mi_informe_en_pdf'}
            parametros={{ tipo, ...(del === null ? {} : { del }) }}
            texto="Descargar en PDF"
            tono="texto"
          />
        </div>
      )}

      {!conDatos ? (
        <Tarjeta acento={ACENTO}>
          <EstadoVacio
            compacto
            dibujo="caja"
            acento={ACENTO}
            titulo="Todavía no hay datos de este periodo"
            frase="Con la caja cerrada y el género apuntado, aquí verás cómo fue, frente al periodo anterior."
            sinAccionPorque="Los informes salen solos de lo que se apunta cada día."
          />
        </Tarjeta>
      ) : (
        // Dos por fila también en el móvil, como las cifras de cada app: una tarjeta
        // pequeña por fila convierte siete cifras en una escalera.
        <Mosaico columnas="grid-cols-2 xl:grid-cols-4">
          <Pieza entera>
            <Tarjeta titulo="En tres frases" acento={ACENTO}>
              <ul className="flex flex-col gap-e2" aria-label="Lo mejor, lo peor y lo que mirar">
                {frases.mejor !== null && <Frase tono="bien" texto={frases.mejor} />}
                {frases.peor !== null && <Frase tono="mal" texto={frases.peor} />}
                <Frase tono="mirar" texto={frases.mirar} />
              </ul>
            </Tarjeta>
          </Pieza>

          {informe.cifras.map((cifra) => (
            <UnaCifra
              key={cifra.indicador}
              cifra={cifra}
              dias={periodo.dias}
              comparado={periodo.comparado}
              conLinea={tipo !== 'dia'}
            />
          ))}

          {informe.semaforo !== null && (
            <Pieza entera>
              <Tarjeta titulo="Tus objetivos esa semana" acento={ACENTO}>
                <ListaDelSemaforo cifras={informe.semaforo} />
              </Tarjeta>
            </Pieza>
          )}
        </Mosaico>
      )}
    </div>
  );
}

function Frase({
  tono,
  texto,
}: {
  readonly tono: 'bien' | 'mal' | 'mirar';
  readonly texto: string;
}) {
  return (
    <li className="flex items-start gap-e2">
      <span
        aria-hidden
        className={clases(
          'mt-[7px] size-[10px] shrink-0 rounded-redondo',
          tono === 'bien' ? 'bg-bien' : tono === 'mal' ? 'bg-mal' : 'bg-naranja',
        )}
      />
      <span className="text-cuerpo">{texto}</span>
    </li>
  );
}

function UnaCifra({
  cifra,
  dias,
  comparado,
  conLinea,
}: {
  readonly cifra: CifraDelInforme;
  readonly dias: number;
  readonly comparado: string;
  readonly conLinea: boolean;
}) {
  const como = COMO_ES_EL_INDICADOR[cifra.indicador];
  const cambio =
    cifra.total === null ? null : comoCambia(cifra.indicador, cifra.total, cifra.anterior);
  const origen =
    !como.sinDatoEsCero && cifra.diasConDato < dias
      ? `${String(cifra.diasConDato)} de ${String(dias)} ${dias === 1 ? 'día' : 'días'} con dato`
      : undefined;

  return (
    <Tarjeta titulo={como.nombre} {...(origen === undefined ? {} : { origen })}>
      {cifra.total === null ? (
        <p className="text-secundario text-texto-suave">Sin dato en este periodo.</p>
      ) : (
        <div className="flex flex-col gap-e2">
          <div className="flex flex-wrap items-center gap-x-e2 gap-y-e1">
            <p className="text-titulo font-bold leading-tight tabular-nums">
              {comoSeEscribe(cifra.indicador, cifra.total, dias)}
            </p>
            {cambio !== null && (
              <Variacion
                sube={cambio.sube}
                cuanto={cambio.cuanto}
                en={cambio.en}
                bueno={cambio.bueno}
                frenteA={comparado}
              />
            )}
          </div>
          {conLinea &&
            (como.grafica === 'barras' ? (
              <Tira
                titulo={como.nombre}
                puntos={cifra.serie.map((dia) => ({
                  valor: dia.valor ?? 0,
                  cuando: comoSeLeeElDia(dia.fecha),
                }))}
                formato={(v) => comoSeEscribe(cifra.indicador, v)}
                color={ACENTO}
                alto={32}
              />
            ) : (
              <Tendencia
                valores={cifra.serie.map((d) => d.valor)}
                titulo={como.nombre}
                color={ACENTO}
                alto={32}
                formato={(v) => comoSeEscribe(cifra.indicador, v)}
              />
            ))}
        </div>
      )}
    </Tarjeta>
  );
}
