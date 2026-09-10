import { useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery } from '@tanstack/react-query';
import {
  MOTIVOS_DE_MERMA,
  NOMBRE_DEL_MOTIVO_DE_MERMA,
  NOMBRE_DE_LA_PARTIDA,
  PARTIDAS_DE_MERMA,
  QUE_ES_CADA_PARTIDA,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  Cifra,
  EstadoVacio,
  Etiqueta,
  Proporcion,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoBuscar,
  IconoCamara,
  IconoDescargar,
  IconoDocumento,
} from '@estook/iconos';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ApuntarMerma } from './ApuntarMerma.tsx';
import {
  comoDinero,
  comoSeLeeElDia,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  type LineaDeMerma,
  type MisMermas,
} from './contrato.ts';

/**
 * Inventario · Mermas (M6½).
 *
 * ── Las tres preguntas, en este orden ───────────────────────────────────────
 *
 *   1. **¿Cuánto se me va?** El total del periodo, partido en las tres partidas.
 *   2. **¿En qué?** Por motivo y por producto, ordenado por lo que cuesta.
 *   3. **¿Quién y cuándo?** La lista, por días.
 *
 * Y en ese orden porque es el orden en el que se usa: nadie abre esta pantalla
 * para leer líneas, la abre porque el food cost no le sale y quiere saber por
 * dónde se va. Las líneas son la letra pequeña.
 *
 * ── La barra de las tres partidas, que es lo que arregla esta pantalla ──────
 *
 * «La comida del personal **no es merma**, ni las invitaciones: van con motivo
 * propio y **como partida aparte**, o el food cost miente» (Manifiesto 28).
 *
 * Un total de merma en un número solo mezcla tres cosas que hay que decidir por
 * separado: lo que se pierde —que hay que reducir—, lo que come el equipo —que es
 * un coste de personal y está bien que exista— y las invitaciones, que son gasto
 * comercial. La barra las separa sin leer.
 *
 * ── Y por qué se exporta a CSV y no a PDF ──────────────────────────────────
 *
 * Porque la regla 7 dice que **un PDF no se genera en el cliente**: lo compone un
 * Chromium sin interfaz en el servidor, con la plantilla y la marca del local, y
 * eso es M11. Hacerlo aquí a mano sería un PDF sin marca, sin cabecera y sin pie
 * fiscal: un documento a medias con pinta de documento.
 *
 * Lo que sí se puede hacer hoy y es lo que hace falta: **el CSV**, que es lo que
 * pide una gestoría y lo que se abre en una hoja de cálculo; y **la impresión**,
 * que el navegador guarda como PDF si alguien lo necesita. El informe con la marca
 * llega con los documentos.
 */
export function Mermas({ alAbrirProducto }: { readonly alAbrirProducto: (id: string) => void }) {
  const { cliente } = usarSesion();

  const [texto, setTexto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [partida, setPartida] = useState('');
  const [dias, setDias] = useState('30');
  const [apuntando, setApuntando] = useState(false);

  // «Apuntar una merma» es una acción del catálogo: se puede pulsar desde el
  // Panel, desde el buscador y desde Fogón, y llega como `?hacer=merma`.
  usarQueHacer('merma', () => {
    setApuntando(true);
  });

  const consulta = useQuery({
    queryKey: ['mis_mermas', dias, motivo, partida, texto],
    queryFn: async (): Promise<MisMermas> => {
      const respuesta = await cliente.consultar<MisMermas>('mis_mermas', {
        ...(motivo === '' ? {} : { motivo }),
        ...(partida === '' ? {} : { partida }),
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
        // Los días y no la fecha: la fecha la pone el servidor con el reloj del
        // local (regla 10), y aquí solo se dice cuánto hacia atrás.
        ...(dias === '' ? {} : { dias }),
        limite: '200',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus mermas" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus mermas">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const conPrecios = datos.puedeVerPrecios;
  const porDia = agruparPorDia(datos.mermas);

  const columnas: Columna<LineaDeMerma>[] = [
    {
      clave: 'producto',
      titulo: 'Producto',
      principal: true,
      celda: (m) => (
        <span className="flex min-w-0 flex-col">
          <span>{m.producto}</span>
          {m.detalle !== null && m.detalle.trim() !== '' && (
            <span className="text-secundario text-texto-tenue">«{m.detalle.trim()}»</span>
          )}
        </span>
      ),
    },
    {
      clave: 'cuanto',
      titulo: 'Cuánto',
      numerica: true,
      celda: (m) => <span>{conUnidadDeUso(m.cuanto, m.unidadDeUso)}</span>,
    },
    {
      clave: 'motivo',
      titulo: 'Por qué',
      celda: (m) => (
        <span className="flex flex-wrap items-center gap-e2">
          <span>{nombreEn(NOMBRE_DEL_MOTIVO_DE_MERMA, m.motivo, m.motivo)}</span>
          <Etiqueta tono={m.partida === 'perdida' ? 'mal' : 'neutro'}>
            {nombreEn(NOMBRE_DE_LA_PARTIDA, m.partida, m.partida)}
          </Etiqueta>
        </span>
      ),
    },
    { clave: 'quien', titulo: 'Quién', celda: (m) => m.quien ?? '—' },
    // La columna de dinero **solo existe si el servidor ha enviado dinero**. No
    // se esconde: no está.
    ...(conPrecios
      ? [
          {
            clave: 'valor',
            titulo: 'Cuánto vale',
            numerica: true,
            celda: (m: LineaDeMerma) => <span>{comoDinero(m.valorCentimos)}</span>,
          } satisfies Columna<LineaDeMerma>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      {/* ── 1 · Cuánto, partido en las tres partidas ─────────────────────── */}
      <div className="grid gap-e3 lg:grid-cols-2">
        <Tarjeta
          titulo="Lo que se ha ido"
          origen={`Del ${comoSeLeeLaFecha(datos.desde)} al ${comoSeLeeLaFecha(datos.hasta)} · sin contar los ejemplos`}
          acento="var(--color-app-inventario)"
        >
          {conPrecios ? (
            <Cifra
              etiqueta="En total"
              valor={datos.valorTotalCentimos ?? 0}
              formato={(v) => comoDinero(v)}
              origen={`${datos.cuantasEnTotal} ${datos.cuantasEnTotal === 1 ? 'apunte' : 'apuntes'} · a precio medio ponderado`}
            />
          ) : (
            <Cifra
              etiqueta="Apuntes"
              valor={datos.cuantasEnTotal}
              formato={(v) => String(v)}
              origen="Lo que vale cada uno no está en tu acceso"
            />
          )}

          {/*
            Las tres partidas, en una barra. Es la mitad de esta pantalla: un
            total de merma en un número solo mezcla lo que se pierde con lo que se
            come el equipo, y son dos decisiones distintas.
          */}
          {datos.porPartida.length > 0 && (
            <div className="mt-e3">
              <Proporcion
                titulo="En qué partida cae la merma de este periodo"
                trozos={PARTIDAS_DE_MERMA.flatMap((cual) => {
                  const suya = datos.porPartida.find((p) => p.partida === cual);
                  if (suya === undefined) return [];
                  const cuantos = conPrecios ? (suya.valorCentimos ?? 0) : suya.cuantas;
                  return [
                    {
                      que: NOMBRE_DE_LA_PARTIDA[cual],
                      cuantos,
                      // El rojo solo para lo que de verdad es una pérdida. La comida
                      // del personal en rojo diría que está mal que el equipo coma.
                      tono:
                        cual === 'perdida'
                          ? ('mal' as const)
                          : cual === 'personal'
                            ? ('info' as const)
                            : ('neutro' as const),
                      ...(conPrecios ? { comoSeLee: comoDinero(cuantos) } : {}),
                    },
                  ];
                })}
              />
              <ul className="mt-e2 flex flex-col gap-e1 text-secundario text-texto-suave">
                {datos.porPartida.map((p) => (
                  <li key={p.partida}>
                    <strong className="text-texto">
                      {nombreEn(NOMBRE_DE_LA_PARTIDA, p.partida, p.partida)}
                    </strong>{' '}
                    · {nombreEn(QUE_ES_CADA_PARTIDA, p.partida, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Tarjeta>

        {/* ── 2 · En qué ──────────────────────────────────────────────────── */}
        <Tarjeta titulo="En qué se va" origen="Ordenado por lo que cuesta">
          {datos.porProducto.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              No hay nada apuntado en este periodo.
            </p>
          ) : (
            <ul className="flex flex-col gap-e1">
              {datos.porProducto.slice(0, 8).map((producto) => (
                <li key={producto.productoId}>
                  <button
                    type="button"
                    onClick={() => {
                      alAbrirProducto(producto.productoId);
                    }}
                    className="flex w-full min-h-toque items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo"
                  >
                    <span className="min-w-0 flex-1 truncate text-cuerpo">{producto.producto}</span>
                    <span className="shrink-0 text-secundario text-texto-suave">
                      {producto.cuantas} {producto.cuantas === 1 ? 'vez' : 'veces'}
                    </span>
                    {conPrecios && (
                      <span className="shrink-0 text-cuerpo font-medium tabular-nums">
                        {comoDinero(producto.valorCentimos)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {datos.porMotivo.length > 0 && (
            <>
              <p className="mt-e3 text-etiqueta uppercase tracking-wide text-texto-suave">
                Por qué
              </p>
              <ul className="mt-e1 flex flex-wrap gap-e2">
                {datos.porMotivo.map((m) => (
                  <li
                    key={m.motivo}
                    className="rounded-redondo border border-borde bg-fondo px-e3 py-e1 text-secundario"
                  >
                    {nombreEn(NOMBRE_DEL_MOTIVO_DE_MERMA, m.motivo, m.motivo)} ·{' '}
                    <strong>{conPrecios ? comoDinero(m.valorCentimos) : m.cuantas}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tarjeta>
      </div>

      {/* ── Los filtros, en una fila ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-e3 no-imprimir">
        <div className="min-w-[12rem] flex-1">
          <Campo
            etiqueta="Buscar"
            ayuda="Por producto, por quién lo apuntó o por lo que se escribió."
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>
        <div className="min-w-[10rem]">
          <Selector
            etiqueta="Cuándo"
            opciones={[
              { valor: '7', texto: 'Última semana' },
              { valor: '30', texto: 'Último mes' },
              { valor: '90', texto: 'Últimos tres meses' },
              { valor: '365', texto: 'Último año' },
            ]}
            value={dias}
            onChange={(e) => {
              setDias(e.currentTarget.value);
            }}
          />
        </div>
        <div className="min-w-[10rem]">
          <Selector
            etiqueta="Partida"
            opciones={PARTIDAS_DE_MERMA.map((cual) => ({
              valor: cual,
              texto: NOMBRE_DE_LA_PARTIDA[cual],
            }))}
            sinElegir="Todas"
            value={partida}
            onChange={(e) => {
              setPartida(e.currentTarget.value);
            }}
          />
        </div>
        <div className="min-w-[11rem]">
          <Selector
            etiqueta="Por qué"
            opciones={MOTIVOS_DE_MERMA.map((cual) => ({
              valor: cual,
              texto: NOMBRE_DEL_MOTIVO_DE_MERMA[cual],
            }))}
            sinElegir="Todos"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.currentTarget.value);
            }}
          />
        </div>

        <Botones>
          {datos.puedeApuntar && (
            <Boton
              tono="principal"
              icono={<IconoAnadir size={18} />}
              onClick={() => {
                setApuntando(true);
              }}
            >
              Apuntar
            </Boton>
          )}
          <Boton
            tono="secundario"
            icono={<IconoDescargar size={18} />}
            onClick={() => {
              descargarCsv(datos, conPrecios);
            }}
          >
            Exportar
          </Boton>
          {/*
            «Imprimir» saca **esta pantalla** en papel, o en PDF desde el diálogo del
            navegador, sin las barras ni estos botones (`no-imprimir`). El parte con
            el logotipo del local lo compone el servidor en M11.
          */}
          <Boton
            tono="secundario"
            icono={<IconoDocumento size={18} />}
            onClick={() => {
              window.print();
            }}
          >
            Imprimir o PDF
          </Boton>
        </Botones>
      </div>

      {/*
        Y la cámara, apagada con su motivo. Está aquí y en la hoja de apuntar
        porque es donde alguien la buscaría, y **no se puede pulsar**.
      */}
      {datos.puedeApuntar && (
        <p className="flex items-start gap-e2 text-secundario text-texto-tenue no-imprimir">
          <span aria-hidden className="mt-[2px] shrink-0">
            <IconoCamara size={16} />
          </span>
          <span>
            Apuntar una merma con una foto —que Estook lea el producto y el peso— lo hace Fogón, y
            llega con el módulo 22. El parte con tu logotipo llega con los documentos, en el 11.
          </span>
        </p>
      )}

      {/* ── 3 · Quién y cuándo ──────────────────────────────────────────── */}
      {porDia.length === 0 ? (
        <Tarjeta titulo="Nada apuntado">
          <EstadoVacio
            compacto
            titulo={texto.trim() === '' ? 'Sin mermas en este periodo' : 'Nada con eso'}
            frase={
              texto.trim() === ''
                ? 'Es una buena noticia, o es que no se está apuntando. Las dos cosas conviene saberlas.'
                : 'Prueba con menos letras, o cambia el periodo.'
            }
            sinAccionPorque="Se apunta con el botón de arriba, o desde el widget del Panel."
          />
        </Tarjeta>
      ) : (
        porDia.map(([dia, delDia]) => (
          <section key={dia} className="flex flex-col gap-e2">
            <h2 className="text-etiqueta uppercase tracking-wide text-texto-suave">
              {comoSeLeeElDia(dia, datos.jornada)}
              <span className="ml-e2 normal-case tracking-normal">
                {conPrecios
                  ? comoDinero(delDia.reduce((suma, m) => suma + (m.valorCentimos ?? 0), 0))
                  : `${delDia.length} ${delDia.length === 1 ? 'apunte' : 'apuntes'}`}
              </span>
            </h2>
            <Tarjeta pegado>
              <Tabla
                titulo={`Mermas del ${dia}`}
                columnas={columnas}
                filas={delDia}
                claveDe={(m) => m.id}
                alPulsar={(m) => {
                  alAbrirProducto(m.productoId);
                }}
                cuandoNoHay={null}
              />
            </Tarjeta>
          </section>
        ))
      )}

      {datos.hayMas && (
        <p className="text-secundario text-texto-suave">
          Se enseñan los doscientos últimos. Acorta el periodo o busca por producto.
        </p>
      )}

      <ApuntarMerma
        abierta={apuntando}
        alCerrar={() => {
          setApuntando(false);
        }}
      />
    </div>
  );
}

/** Las líneas por día, en el orden en el que llegan, que ya es de nuevo a viejo. */
function agruparPorDia(
  lineas: readonly LineaDeMerma[],
): readonly (readonly [string, readonly LineaDeMerma[]])[] {
  const dias = new Map<string, LineaDeMerma[]>();
  for (const linea of lineas) {
    const delDia = dias.get(linea.fechaOperativa);
    if (delDia === undefined) dias.set(linea.fechaOperativa, [linea]);
    else delDia.push(linea);
  }
  return [...dias.entries()];
}

/**
 * Bajarse las mermas del periodo en un fichero.
 *
 * ── Por qué CSV y con punto y coma ──────────────────────────────────────────
 *
 * Porque lo abre Excel de un doble clic, y en España Excel espera `;` como
 * separador —la coma es el decimal—. Con coma, todo el fichero cae en una columna,
 * y quien lo recibe piensa que la exportación está rota.
 *
 * Y con el BOM delante, que parece un detalle y no lo es: sin él, Excel abre el
 * fichero en la codificación del sistema y «Aceite de girasol» sale «Aceite de
 * girasol» con los acentos partidos.
 */
function descargarCsv(datos: MisMermas, conPrecios: boolean) {
  const cabecera = [
    'Fecha',
    'Hora',
    'Producto',
    'Categoria',
    'Cuanto',
    'Unidad',
    'Motivo',
    'Partida',
    'Detalle',
    'Quien',
    ...(conPrecios ? ['Valor en euros'] : []),
  ];

  const celda = (valor: string | number | null) => {
    const texto = valor === null ? '' : String(valor);
    // Las comillas se doblan y el campo se entrecomilla si lleva separador,
    // comillas o un salto de línea. Es todo lo que un CSV necesita.
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const filas = datos.mermas.map((m) => [
    m.fechaOperativa,
    new Date(m.ocurrioEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    m.producto,
    m.categoria ?? '',
    // Con coma decimal, que es lo que espera una hoja de cálculo española.
    String(m.cuanto).replace('.', ','),
    m.unidadDeUso,
    nombreEn(NOMBRE_DEL_MOTIVO_DE_MERMA, m.motivo, m.motivo),
    nombreEn(NOMBRE_DE_LA_PARTIDA, m.partida, m.partida),
    m.detalle ?? '',
    m.quien ?? '',
    ...(conPrecios ? [((m.valorCentimos ?? 0) / 100).toFixed(2).replace('.', ',')] : []),
  ]);

  const csv = [cabecera, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n');
  const fichero = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });

  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(fichero);
  enlace.download = `mermas-${datos.desde}-a-${datos.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
