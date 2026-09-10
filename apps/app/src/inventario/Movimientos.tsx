import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Campo, Cargando, EstadoVacio, Etiqueta, Tarjeta } from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
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
  const { cliente } = usarSesion();
  const [texto, setTexto] = useState('');

  // La vista es el tipo: `todo` no filtra, y los otros tres van tal cual al
  // servidor, que los valida contra su lista cerrada.
  const tipo = vista === 'todo' || vista === '' ? undefined : vista.replace(/s$/, '');

  const consulta = useQuery({
    queryKey: ['mis_movimientos', tipo ?? ''],
    queryFn: async (): Promise<MisMovimientos> => {
      const respuesta = await cliente.consultar<MisMovimientos>('mis_movimientos', {
        ...(tipo === undefined ? {} : { tipo }),
        limite: '100',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
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

  const datos = consulta.data;

  // El buscador filtra aqui y no en el servidor a proposito: son cien lineas ya
  // traidas, y pedirlas otra vez por cada letra seria un viaje por pulsacion para
  // recortar una lista que ya esta en la mano.
  const buscado = texto.trim().toLowerCase();
  const lineas =
    buscado === ''
      ? datos.movimientos
      : datos.movimientos.filter(
          (m) =>
            m.producto.toLowerCase().includes(buscado) ||
            (m.quien ?? '').toLowerCase().includes(buscado) ||
            (m.motivo ?? '').toLowerCase().includes(buscado),
        );

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
        móvil. Y lo que había debajo, en la tarjeta vacía, ya lo explicaba: «se
        apunta desde la ficha de cada producto».
        Es la clase de párrafo que llena esta aplicación y que hay que ir
        quitando: sobreexplica una decisión buena en el sitio donde estorba.
      */}
      <div className="max-w-[24rem]">
        <Campo
          etiqueta="Buscar en el libro"
          ayuda="Por producto, por quién lo apuntó o por el motivo."
          value={texto}
          delante={<IconoBuscar size={16} />}
          onChange={(e) => {
            setTexto(e.currentTarget.value);
          }}
        />
      </div>

      {porDia.length === 0 ? (
        <Tarjeta titulo="Nada apuntado">
          <EstadoVacio
            compacto
            titulo={buscado === '' ? 'El libro está vacío' : 'Nada con eso'}
            frase={
              buscado === ''
                ? 'En cuanto se apunte lo primero que entre o salga, aparecerá aquí con su fecha y con quién lo apuntó.'
                : 'Prueba con menos letras, o cambia de vista arriba.'
            }
            sinAccionPorque="Se apunta desde la ficha de cada producto, en «Productos»."
          />
        </Tarjeta>
      ) : (
        porDia.map(([dia, delDia]) => (
          <section key={dia} className="flex flex-col gap-e2">
            <h2 className="text-etiqueta uppercase tracking-wide text-texto-suave">
              {comoSeLeeElDia(dia, datos.hoy)}
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

      {datos.hayMas && (
        <p className="text-secundario text-texto-suave">
          Se enseñan los cien últimos. Busca por producto para encontrar los de antes.
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
