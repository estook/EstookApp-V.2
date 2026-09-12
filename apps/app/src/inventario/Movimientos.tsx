import { useState } from 'react';
import {
  NOMBRE_DEL_TRAMO,
  TRAMOS_QUE_SE_MIRAN,
  desdeCuandoMira,
  type FechaOperativa,
  type TramoQueSeMira,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tarjeta,
} from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarListaLarga } from '../ganchos/usarListaLarga.ts';
import { usarQueEspere } from '../ganchos/usarQueEspere.ts';
import {
  COMO_SE_LLAMA_EL_MOVIMIENTO,
  comoSeLeeElDia,
  conUnidadDeUso,
  type MisMovimientos,
  type MovimientoDelLibro,
} from './contrato.ts';

/**
 * Inventario · Movimientos (M6½).
 *
 * ── Por que esta pantalla no existia, y por que tenia que existir ────────────
 *
 * «El stock es un libro de movimientos, y no hay ninguna tabla con una cantidad
 * editable» (regla 8). Eso es lo que hace que la camara se pueda auditar: el
 * libro solo se anade, nadie tiene concedido el `update`, un disparador lo
 * rechaza y un movimiento equivocado **se enmienda con otro**, con su motivo.
 *
 * Y **el libro no se podia leer**. Sus lineas solo salian dentro de la ficha de
 * un producto, de un producto a la vez. Es decir: el proyecto tenia el registro
 * inmutable montado, probado y protegido, y la pregunta para la que sirve un
 * registro inmutable —«esta manana faltaban cuatro kilos de pulpo, ¿quien apunto
 * que y cuando?»— **no se podia contestar** sin abrir fichas de una en una.
 *
 * Es la misma familia de fallo que este proyecto lleva persiguiendo desde M4, en
 * su version mas cara: algo construido, probado y bien hecho a lo que **ninguna
 * pantalla llegaba**. Aqui no faltaba codigo de servidor: faltaba la pantalla.
 *
 * ── Como se ordena ───────────────────────────────────────────────────────────
 *
 * Por dia y de lo mas nuevo a lo mas viejo, agrupado con el dia por encima. Un
 * libro se lee por dias, no por filas sueltas: «lo de ayer» es una pregunta
 * normal y «las filas 40 a 60» no lo es.
 *
 * Cada linea lleva lo que hace falta para cuadrar y nada mas: que paso, de que
 * producto, cuanto, **cuanto quedo despues** —que es el saldo congelado que
 * guarda cada linea— y quien lo apunto.
 */
export function Movimientos({
  vista,
  alAbrirProducto,
}: {
  readonly vista: string;
  readonly alAbrirProducto: (id: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [tramo, setTramo] = useState<TramoQueSeMira>('trimestre');
  /**
   * Lo que se teclea, esperado un momento antes de preguntar.
   *
   * Ahora la búsqueda va al servidor —que es lo que hace que encuentre lo de hace
   * tres meses y no solo lo que ya estaba en pantalla— y sin esto sería un viaje
   * por cada letra: siete peticiones para escribir «aceite».
   */
  const buscado = usarQueEspere(texto, 300);

  // La vista es el tipo: `todo` no filtra, y los otros van tal cual al servidor,
  // que los valida contra su lista cerrada.
  const tipo = vista === 'todo' || vista === '' ? undefined : vista.replace(/s$/, '');

  // La jornada de hoy la dice el servidor, nunca el navegador (regla 10). El
  // primer viaje la trae, y con ella se calcula desde cuándo se mira.
  const hoy = usarLectura<MisMovimientos>('mis_movimientos', { limite: '1' }).data?.hoy ?? null;

  const consulta = usarListaLarga<MisMovimientos>(
    'mis_movimientos',
    {
      ...(tipo === undefined ? {} : { tipo }),
      ...(buscado.trim() === '' ? {} : { texto: buscado.trim() }),
      ...(hoy === null ? {} : { desde: desdeCuandoMira(tramo, hoy as FechaOperativa) }),
    },
    50,
  );

  if (consulta.isPending || hoy === null) {
    return (
      <div className="py-e6">
        <Cargando que="el libro de movimientos" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer el libro">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const lineas = consulta.data.pages.flatMap((p) => p.movimientos);
  const porDia = agruparPorDia(lineas);

  return (
    <div className="flex flex-col gap-e4">
      {/*
        ── Aquí había un aviso de cuatro líneas, y sobraba ────────────────────
        Decía, cada vez que alguien abría el libro: «Esto no se edita, se enmienda.
        El libro solo se añade: ninguna línea se puede cambiar ni borrar, y eso es
        lo que hace que la cámara se pueda cuadrar…».
        Es verdad, es importante, y **no es información que alguien necesite al
        abrir una lista**. Nadie viene aquí a editar una línea: viene a ver qué
        pasó. Lo que hay que decir se dice en el momento en el que hace falta —al
        intentar corregir algo— y no antes, ocupando la primera pantalla del
        móvil.
      */}
      <div className="flex flex-wrap items-end gap-e3">
        <div className="min-w-[14rem] flex-1 max-w-[24rem]">
          <Campo
            etiqueta="Buscar en el libro"
            ayuda="Por producto, por quién lo apuntó, por el motivo o por el lote."
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>
        <div className="min-w-[12rem]">
          {/*
            ── Y el tramo, que es lo que acota de verdad ────────────────────
            Un libro crece todos los días y no para. Antes esto decía «se enseñan
            los cien últimos» y el buscador filtraba **esas cien**, así que buscar
            algo de hace tres meses contestaba «nada con eso». Ahora se elige
            hasta dónde se mira, se busca en todo ese tramo y «Ver más» trae lo
            siguiente sin volver a empezar.
          */}
          <Selector
            etiqueta="Hasta dónde miro"
            opciones={TRAMOS_QUE_SE_MIRAN.map((t) => ({
              valor: t,
              texto: NOMBRE_DEL_TRAMO[t],
            }))}
            value={tramo}
            onChange={(e) => {
              setTramo(e.currentTarget.value as TramoQueSeMira);
            }}
          />
        </div>
      </div>

      {porDia.length === 0 ? (
        <Tarjeta titulo="Nada apuntado">
          <EstadoVacio
            compacto
            titulo={buscado.trim() === '' ? 'Nada en este tramo' : 'Nada con eso'}
            frase={
              buscado.trim() === ''
                ? `No hay movimientos en ${NOMBRE_DEL_TRAMO[tramo].toLowerCase()}. Prueba a mirar más atrás, o apunta lo primero que entre o salga.`
                : 'Prueba con menos letras, mira más atrás, o cambia de vista arriba.'
            }
            sinAccionPorque="Se apunta desde la ficha de cada producto, en «Productos»."
          />
        </Tarjeta>
      ) : (
        porDia.map(([dia, delDia]) => (
          <section key={dia} className="flex flex-col gap-e2">
            <h2 className="text-etiqueta uppercase tracking-wide text-texto-suave">
              {comoSeLeeElDia(dia, hoy)}
              <span className="ml-e2 normal-case tracking-normal">
                {delDia.length === 1 ? '1 movimiento' : `${delDia.length} movimientos`}
              </span>
            </h2>

            <ul className="flex flex-col gap-e1 rounded-medio border border-borde bg-superficie">
              {delDia.map((m) => (
                <li key={m.id} className="border-b border-borde last:border-b-0">
                  <Linea
                    movimiento={m}
                    alAbrir={() => {
                      alAbrirProducto(m.productoId);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/*
        «Ver más» y, debajo, cuántas se llevan. La cifra importa: sin ella nadie
        sabe si ha visto veinte líneas o quinientas, y «Ver más» deja de decir
        nada.
      */}
      {consulta.hasNextPage && (
        <div className="flex flex-wrap items-center gap-e3">
          <Boton
            tono="secundario"
            cargando={consulta.isFetchingNextPage}
            textoCargando="Trayendo"
            onClick={() => {
              void consulta.fetchNextPage();
            }}
          >
            Ver más
          </Boton>
          <span className="text-secundario text-texto-suave">
            Llevas {lineas.length} de {NOMBRE_DEL_TRAMO[tramo].toLowerCase()}.
          </span>
        </div>
      )}
      {!consulta.hasNextPage && lineas.length > 0 && (
        <p className="text-secundario text-texto-suave">
          Eso es todo {NOMBRE_DEL_TRAMO[tramo].toLowerCase()}: {lineas.length}{' '}
          {lineas.length === 1 ? 'movimiento' : 'movimientos'}. Para ver más atrás, cambia el tramo
          de arriba.
        </p>
      )}
    </div>
  );
}

/**
 * Una linea del libro.
 *
 * El signo va delante de la cantidad y **con su color y su palabra**, nunca solo
 * con el color (B8): «Ha entrado +12 kg» se lee igual en blanco y negro.
 */
function Linea({
  movimiento,
  alAbrir,
}: {
  readonly movimiento: MovimientoDelLibro;
  readonly alAbrir: () => void;
}) {
  const suma = movimiento.cantidad > 0;
  const comoSeLlama = COMO_SE_LLAMA_EL_MOVIMIENTO[movimiento.tipo] ?? movimiento.tipo;

  return (
    <button
      type="button"
      onClick={alAbrir}
      className="flex w-full min-h-toque flex-col gap-e1 px-e3 py-e2 text-left hover:bg-fondo"
    >
      <span className="flex flex-wrap items-baseline gap-e2">
        <span className="text-cuerpo font-medium">{movimiento.producto}</span>
        {movimiento.esEjemplo && <Etiqueta>ejemplo</Etiqueta>}
        <span className="text-secundario text-texto-suave">{comoSeLlama}</span>
      </span>

      <span className="flex flex-wrap items-baseline gap-e3 text-secundario">
        <span className={suma ? 'text-bien' : 'text-mal'}>
          {suma ? '+' : '−'}
          {conUnidadDeUso(Math.abs(movimiento.cantidad), movimiento.unidadDeUso)}
        </span>
        {/* El saldo de despues: el resultado congelado del unico dueno del
            calculo, como el saldo de una libreta. Es lo que hace que el libro
            sirva para cuadrar sin rehacer las cuentas. */}
        <span className="text-texto-suave">
          quedaron {conUnidadDeUso(movimiento.cantidadDespues, movimiento.unidadDeUso)}
        </span>
        {movimiento.quien !== null && <span className="text-texto-suave">{movimiento.quien}</span>}
        {movimiento.lote !== null && (
          <span className="text-texto-suave">lote {movimiento.lote}</span>
        )}
      </span>

      {movimiento.motivo !== null && movimiento.motivo !== '' && (
        <span className="text-secundario text-texto-suave">«{movimiento.motivo}»</span>
      )}
    </button>
  );
}

/** Las lineas por dia, en el orden en el que llegan, que ya es de nuevo a viejo. */
function agruparPorDia(
  lineas: readonly MovimientoDelLibro[],
): readonly (readonly [string, readonly MovimientoDelLibro[]])[] {
  const dias = new Map<string, MovimientoDelLibro[]>();
  for (const linea of lineas) {
    const delDia = dias.get(linea.fechaOperativa);
    if (delDia === undefined) dias.set(linea.fechaOperativa, [linea]);
    else delDia.push(linea);
  }
  return [...dias.entries()];
}
