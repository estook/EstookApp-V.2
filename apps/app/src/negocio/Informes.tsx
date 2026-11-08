import { useSearchParams } from 'react-router-dom';
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import {
  COMO_ES_EL_INDICADOR,
  comoCambia,
  esTipoDeInforme,
  hayDatos,
  type TipoDeInforme,
} from '@estook/dominio';
import { Aviso, Boton, Cargando, Tarjeta, Variacion, comoSeEscribe } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { ListaDelSemaforo } from '../objetivos/Semaforo.tsx';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { ElServicioPorDentro } from './ElServicioPorDentro.tsx';
import type { CifraDelInforme, ElInforme } from './contrato.ts';

/**
 * Negocio → Informes · Tu día, Tu semana y Tu mes (entrega R2, mejora 16 · 0053).
 *
 * «Por correo al gerente: ventas, food cost, merma y horas.» Esta es la pantalla, y
 * el correo es su resumen con un enlace aquí.
 *
 * **Rehecha en la pausa del 8-nov (0142)**: Richi, «la info que damos es muy redundante, mejor
 * poner ahí datos del negocio importantes». Arriba quedan **cuatro cifras** con su flecha, sin sus
 * líneas (ya están en el Panel); los objetivos de la semana, plegados; y debajo, **cuándo se
 * vende, la cocina, lo que se tuerce y las semanas** (`ElServicioPorDentro`). Las tres frases
 * siguen en el correo de los lunes, que es donde se leen.
 *
 * El periodo va en la dirección (`?del=2026-09-21`) y no «cuántos atrás»: el
 * enlace del correo del lunes, abierto el jueves, sigue enseñando esa semana.
 */
/** Las cuatro de arriba, en este orden: lo demás ya está en el Panel. */
const LAS_DE_ARRIBA = ['ventas', 'ticket-medio', 'food-cost', 'coste-personal'] as const;

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

  if (consulta.isPending) return <Cargando que="tu informe" forma="cifra" alto lineas={4} />;
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
  const { periodo } = informe;
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

      {conDatos && (
        <div className="grid grid-cols-2 gap-e3 xl:grid-cols-4">
          {LAS_DE_ARRIBA.flatMap((indicador) => {
            const cifra = informe.cifras.find((c) => c.indicador === indicador);
            return cifra === undefined
              ? []
              : [
                  <UnaCifra
                    key={indicador}
                    cifra={cifra}
                    dias={periodo.dias}
                    comparado={periodo.comparado}
                  />,
                ];
          })}
        </div>
      )}

      {informe.semaforo !== null && (
        <details className="rounded-mayor border border-borde bg-superficie px-e4 [box-shadow:var(--sombra-tarjeta)]">
          <summary className="min-h-toque cursor-pointer py-e3 text-cuerpo font-semibold">
            Tus objetivos esa semana
          </summary>
          <div className="pb-e4">
            <ListaDelSemaforo cifras={informe.semaforo} />
          </div>
        </details>
      )}

      <ElServicioPorDentro tipo={tipo} del={periodo.desde} />
    </div>
  );
}

function UnaCifra({
  cifra,
  dias,
  comparado,
}: {
  readonly cifra: CifraDelInforme;
  readonly dias: number;
  readonly comparado: string;
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
        </div>
      )}
    </Tarjeta>
  );
}
