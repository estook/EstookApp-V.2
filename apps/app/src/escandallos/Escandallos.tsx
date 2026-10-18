import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Etiqueta,
  FotoDeProducto,
  Lista,
  Mosaico,
  NadaConEso,
  Pieza,
  Proporcion,
  Tarjeta,
  sinAcentos,
  type ElementoDeLista,
} from '@estook/ui';
import { IconoAtencion, IconoDocumento, IconoEscandallos, IconoVincular } from '@estook/iconos';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarLasVistasConAlgo } from '../ganchos/usarLasVistasConAlgo.ts';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { comoDinero } from '../almacen/contrato.ts';
import { LosAlergenos } from './Alergenos.tsx';
import { ElEscandalloDelPlato } from './ElEscandalloDelPlato.tsx';
import { FichaTecnica } from './FichaTecnica.tsx';
import {
  comoPorcentaje,
  comoSeAbre,
  queFichaEs,
  tonoDelSemaforo,
  type MisFichas,
  type PlatoEnLaLista,
  type QueFicha,
  type QueHaCambiado,
} from './contrato.ts';

/** El acento de Escandallos. */
const ACENTO = 'var(--color-app-escandallos)';

/** Cuántos «sin escandallo» se enseñan en el Resumen antes de «Ver todos». */
const A_LA_VISTA = 6;

/**
 * Escandallos (M9 · 2, decisiones 0086 y 0087; ordenado en el repaso del 16-oct, 0090).
 *
 * Richi, el 16-oct: «una cosa son las fichas técnicas, para enseñar a los nuevos a
 * hacer los platos con fotos y pasos, y otra los escandallos, donde se desgranan los
 * platos». Estaban mezcladas —la pestaña se llamaba «Fichas», el escandallo tenía los
 * pasos dentro y había una pestaña de elaboraciones—, y se repetía el trabajo. Ahora:
 *
 *   · **Resumen**: cuántos platos están desgranados, los que faltan, y a quien ve costes,
 *     los que pasan del objetivo, los que pierden dinero en algún canal y **qué ha
 *     cambiado** en su coste (M9 · 3, 0092), ordenado por euros.
 *   · **Escandallos**: los platos de la carta, cada uno con lo que lleva, lo que cuesta
 *     y lo que deja. **Solo eso**.
 *   · **Fichas técnicas**: el plato de la carta **más** lo que ya dice su escandallo
 *     (los gramos, sin euros), y los pasos para hacerlo, cada uno con su foto. Para
 *     hacerla, el plato tiene que estar en la Carta y tener su escandallo: no se
 *     escribe dos veces lo que lleva.
 *
 * El panel de cada uno se abre al lado (`?ficha=plato.<id>`), y el enlace se puede
 * mandar por el chat.
 */
export function Escandallos({
  destino,
  vista,
}: {
  readonly destino: string;
  readonly vista: string;
}) {
  const consulta = usarLectura<MisFichas>('mis_fichas');
  const abierta = usarAbiertoEnLaDireccion('ficha');
  const datos = consulta.data;

  usarLasVistasConAlgo(
    datos === undefined
      ? null
      : [
          ...(datos.cifras.sinFicha > 0 ? ['sin-escandallo'] : []),
          ...((datos.cifras.bajoObjetivo ?? 0) > 0 ? ['bajo-objetivo'] : []),
          ...(sinFichaTecnica(datos).length > 0 ? ['sin-ficha'] : []),
        ],
  );

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus escandallos" forma="lista-foto" lineas={6} />
      </div>
    );
  }
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus escandallos">
        Prueba en un momento.
      </Aviso>
    );
  }

  const abrir = (ficha: QueFicha) => {
    abierta.abrir(comoSeAbre(ficha));
  };
  const laAbierta = queFichaEs(abierta.abierto);
  const enLasFichas = destino === 'fichas';

  return (
    <div className="flex flex-col gap-e4">
      {enLasFichas ? (
        <FichasTecnicas datos={datos} vista={vista} alAbrir={abrir} />
      ) : destino === 'escandallos' ? (
        <LosEscandallos datos={datos} vista={vista} alAbrir={abrir} />
      ) : (
        <Resumen datos={datos} alAbrir={abrir} />
      )}

      {laAbierta !== null &&
        (enLasFichas && laAbierta.tipo === 'plato' ? (
          <FichaTecnica key={abierta.abierto} platoId={laAbierta.id} alCerrar={abierta.cerrar} />
        ) : (
          <ElEscandalloDelPlato
            key={abierta.abierto}
            ficha={laAbierta}
            alCerrar={abierta.cerrar}
            alAbrir={abrir}
          />
        ))}
    </div>
  );
}

/** Los que ya tienen escandallo y todavía no su ficha técnica. */
function sinFichaTecnica(datos: MisFichas): readonly PlatoEnLaLista[] {
  return datos.platos.filter((p) => p.tieneFicha && p.tieneFichaTecnica !== true);
}

// ── Una fila de plato ────────────────────────────────────────────────────────

function filaDePlato(plato: PlatoEnLaLista, alAbrir: (ficha: QueFicha) => void): ElementoDeLista {
  const coste = plato.coste;
  const derecha = !plato.tieneFicha ? (
    <Etiqueta>Sin escandallo</Etiqueta>
  ) : coste === undefined ? undefined : coste.costeCentimos === null ? (
    <Etiqueta tono="atencion">Falta precio</Etiqueta>
  ) : coste.foodCost === null ? undefined : (
    <Etiqueta tono={tonoDelSemaforo(coste.semaforo)}>{comoPorcentaje(coste.foodCost)}</Etiqueta>
  );
  const pierde = coste !== undefined && coste.pierdeEn.length > 0;
  // Sin escandallo, lo que costaría a tu objetivo, marcado «aprox.» (0095): no es un coste.
  const aprox = plato.tieneFicha ? null : (coste?.costeAproxCentimos ?? null);
  return {
    clave: plato.id,
    delante: (
      <FotoDeProducto nombre={plato.nombre} categoria={null} enlace={plato.miniatura} lado={40} />
    ),
    titulo: plato.nombre,
    detalle: (
      <span className="flex min-w-0 items-center gap-e2">
        {plato.vinculadoA !== null && (
          <IconoVincular
            size={14}
            className="shrink-0"
            titulo={`Vinculado a ${plato.vinculadoA}`}
          />
        )}
        {pierde && (
          <span className="shrink-0 font-semibold text-mal">
            Pierde en {coste.pierdeEn.join(', ')}
          </span>
        )}
        {aprox !== null && (
          <span className="shrink-0 tabular-nums" title="Precio sin IVA por tu objetivo de coste">
            ~{comoDinero(aprox)} aprox.
          </span>
        )}
        <LosAlergenos alergenos={plato.alergenos} picante={plato.picante} lado={18} enUnaLinea />
      </span>
    ),
    ...(derecha === undefined ? {} : { derecha }),
    alPulsar: () => {
      alAbrir({ tipo: 'plato', id: plato.id });
    },
  };
}

/** La fila de la ficha técnica: el plato, y si ya tiene sus pasos. */
function filaDeFicha(plato: PlatoEnLaLista, alAbrir: (ficha: QueFicha) => void): ElementoDeLista {
  const pasos = plato.pasos ?? 0;
  return {
    clave: plato.id,
    delante: (
      <FotoDeProducto nombre={plato.nombre} categoria={null} enlace={plato.miniatura} lado={40} />
    ),
    titulo: plato.nombre,
    detalle: (
      <span className="flex min-w-0 items-center gap-e2">
        {pasos > 0 && (
          <span className="shrink-0">{pasos === 1 ? '1 paso' : `${String(pasos)} pasos`}</span>
        )}
        <LosAlergenos alergenos={plato.alergenos} picante={plato.picante} lado={18} enUnaLinea />
      </span>
    ),
    ...(plato.tieneFichaTecnica === true ? {} : { derecha: <Etiqueta>Sin pasos</Etiqueta> }),
    alPulsar: () => {
      alAbrir({ tipo: 'plato', id: plato.id });
    },
  };
}

// ── Resumen ──────────────────────────────────────────────────────────────────

function Resumen({
  datos,
  alAbrir,
}: {
  readonly datos: MisFichas;
  readonly alAbrir: (ficha: QueFicha) => void;
}) {
  const navegar = useNavigate();
  const { permisos } = usarSesion();
  const { cifras } = datos;

  if (cifras.platos === 0) {
    return (
      <Tarjeta>
        <EstadoVacio
          dibujo="platos"
          acento={ACENTO}
          titulo="Primero, tu carta"
          frase="Pon tus platos en la Carta y aquí los desgranas: qué llevan, cuánto cuestan y cuánto te dejan."
          {...(puedeVer(permisos, 'app.carta')
            ? {
                accion: (
                  <Boton
                    tono="principal"
                    onClick={() => {
                      navegar('/carta/carta/por-secciones?hacer=nuevo');
                    }}
                  >
                    Ir a la Carta
                  </Boton>
                ),
              }
            : { sinAccionPorque: 'La carta la monta quien lleva el local.' })}
        />
      </Tarjeta>
    );
  }

  const sinEscandallo = datos.platos.filter((p) => !p.tieneFicha);
  const pierden = datos.platos.filter((p) => (p.coste?.pierdeEn.length ?? 0) > 0);
  const pasan = datos.platos
    .filter((p) => p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar')
    .sort((a, b) => (b.coste?.foodCost ?? 0) - (a.coste?.foodCost ?? 0));
  const conEscandallo = cifras.platos - cifras.sinFicha;

  return (
    <Mosaico>
      <Pieza entera>
        <Tarjeta
          titulo="Cómo van tus escandallos"
          acento={ACENTO}
          icono={<IconoEscandallos size={18} />}
        >
          <div className="flex flex-col gap-e4">
            <dl className="grid grid-cols-2 gap-e3 sm:grid-cols-4">
              <Dato
                nombre="Con escandallo"
                valor={`${String(conEscandallo)} de ${String(cifras.platos)}`}
              />
              {cifras.conFichaTecnica !== undefined && (
                <Dato nombre="Con ficha técnica" valor={String(cifras.conFichaTecnica)} />
              )}
              {datos.conImportes && (
                <>
                  <Dato
                    nombre="Food cost de la carta"
                    valor={
                      cifras.foodCostMedio === null || cifras.foodCostMedio === undefined
                        ? '—'
                        : comoPorcentaje(cifras.foodCostMedio)
                    }
                    {...(datos.objetivo === null || datos.objetivo === undefined
                      ? {}
                      : { debajo: `objetivo ${comoPorcentaje(datos.objetivo * 100)}` })}
                  />
                  <Dato
                    nombre="Pierden en un canal"
                    valor={String(cifras.pierden ?? 0)}
                    {...((cifras.pierden ?? 0) > 0 ? { mal: true } : {})}
                  />
                </>
              )}
            </dl>
            <Proporcion
              titulo="Platos con escandallo"
              soloLaBarra
              trozos={[
                { que: 'Con escandallo', cuantos: conEscandallo, tono: 'bien' },
                { que: 'Sin escandallo', cuantos: cifras.sinFicha, tono: 'neutro' },
              ]}
            />
          </div>
        </Tarjeta>
      </Pieza>

      {datos.conImportes && <LoQueHaCambiado alAbrir={alAbrir} />}

      {pierden.length > 0 && (
        <Tarjeta
          titulo="Pierden dinero"
          cuantos={pierden.length}
          acento={ACENTO}
          icono={<IconoAtencion size={18} />}
          pegado
        >
          <Lista
            titulo="Pierden dinero"
            elementos={pierden.map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}

      {sinEscandallo.length > 0 && (
        <Tarjeta
          titulo="Sin escandallo"
          cuantos={sinEscandallo.length}
          acento={ACENTO}
          pegado
          {...(sinEscandallo.length > A_LA_VISTA
            ? {
                accion: (
                  <Boton
                    tono="texto"
                    tamano="s"
                    onClick={() => {
                      navegar('/escandallos/escandallos/sin-escandallo');
                    }}
                  >
                    Ver todos
                  </Boton>
                ),
              }
            : {})}
        >
          <Lista
            titulo="Sin escandallo"
            elementos={sinEscandallo.slice(0, A_LA_VISTA).map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}

      {pasan.length > 0 && (
        <Tarjeta titulo="Pasan del objetivo" cuantos={pasan.length} acento={ACENTO} pegado>
          <Lista
            titulo="Pasan del objetivo"
            elementos={pasan.slice(0, A_LA_VISTA).map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}

      {sinEscandallo.length === 0 && pierden.length === 0 && pasan.length === 0 && (
        <Tarjeta>
          <EstadoVacio
            dibujo="todo-en-orden"
            acento={ACENTO}
            titulo="Todo desgranado"
            frase="Cada plato tiene su escandallo. Si sube un ingrediente, aquí lo verás."
          />
        </Tarjeta>
      )}
    </Mosaico>
  );
}

// ── Qué ha cambiado (M9 · 3, 0092 · 1B) ──────────────────────────────────────

const DIAS = [7, 30, 90] as const;

/**
 * Los platos cuyo coste se ha movido frente a hace 7, 30 o 90 días, **ordenados por lo
 * que cuesta en euros**, con el ingrediente que lo ha movido. Solo a quien ve costes.
 * Si nada se ha movido, no sale: una tarjeta que dice «nada» cada día es ruido.
 */
function LoQueHaCambiado({ alAbrir }: { readonly alAbrir: (ficha: QueFicha) => void }) {
  const [dias, setDias] = useState<(typeof DIAS)[number]>(30);
  const [todos, setTodos] = useState(false);
  const consulta = usarLectura<QueHaCambiado>('que_ha_cambiado', { dias: String(dias) });
  const platos = consulta.data?.platos ?? [];
  if (consulta.data === undefined || (platos.length === 0 && dias === 30)) return null;
  const aLaVista = todos ? platos : platos.slice(0, A_LA_VISTA);

  return (
    <Tarjeta titulo="Qué ha cambiado" cuantos={platos.length} acento={ACENTO} pegado>
      {/* Debajo del título, y no a su lado: en la tarjeta estrecha partía el título en dos. */}
      <div
        role="group"
        aria-label="Desde cuándo"
        className="flex items-center gap-e1 px-e4 pb-e2 text-secundario text-texto-suave"
      >
        <span className="mr-e1">Frente a hace</span>
        {DIAS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={dias === d}
            onClick={() => {
              setDias(d);
              setTodos(false);
            }}
            className={`min-h-[32px] rounded-redondo px-e2 text-etiqueta font-semibold tabular-nums ${
              dias === d ? 'bg-texto text-superficie' : 'text-texto-suave hover:bg-fondo'
            }`}
          >
            {d}
          </button>
        ))}
        <span className="ml-e1">días</span>
      </div>
      <Lista
        titulo="Qué ha cambiado"
        elementos={aLaVista.map((p): ElementoDeLista => ({
          clave: p.id,
          titulo: p.nombre,
          detalle: (
            <span className="flex min-w-0 flex-wrap items-center gap-x-e2">
              {p.cruza.map((r) => (
                <span key={r.texto} className="shrink-0 font-semibold text-mal">
                  {r.texto}
                </span>
              ))}
              {/* Primero lo que más importa, el food cost; si no cabe, se corta el porqué. */}
              <span className="truncate">
                {[
                  p.foodCostAntes !== null && p.foodCostAhora !== null
                    ? `${comoPorcentaje(p.foodCostAntes)} → ${comoPorcentaje(p.foodCostAhora)}`
                    : null,
                  p.porQue !== null
                    ? `por ${p.porQue.nombre.toLocaleLowerCase('es')}`
                    : p.cambioLaReceta
                      ? 'cambió la receta'
                      : null,
                ]
                  .filter((t) => t !== null)
                  .join(' · ')}
              </span>
            </span>
          ),
          derecha: (
            <Etiqueta tono={p.diferenciaCentimos > 0 ? 'mal' : 'bien'}>
              {p.diferenciaCentimos > 0 ? '+' : '−'}
              {comoDinero(Math.abs(p.diferenciaCentimos))}
            </Etiqueta>
          ),
          alPulsar: () => {
            alAbrir({ tipo: 'plato', id: p.id });
          },
        }))}
        cuandoNoHay={
          <p className="px-e4 py-e3 text-secundario text-texto-suave">
            En {dias} días no se ha movido el coste de ningún plato.
          </p>
        }
      />
      {platos.length > A_LA_VISTA && !todos && (
        <div className="px-e4 pb-e3">
          <Boton
            tono="texto"
            tamano="s"
            onClick={() => {
              setTodos(true);
            }}
          >
            Ver los {platos.length}
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}

function Dato({
  nombre,
  valor,
  debajo,
  mal = false,
}: {
  readonly nombre: string;
  readonly valor: string;
  readonly debajo?: string;
  readonly mal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-e1">
      <dt className="text-secundario text-texto-suave">{nombre}</dt>
      <dd
        className={`text-[1.75rem] font-semibold leading-none tabular-nums ${mal ? 'text-mal' : ''}`}
      >
        {valor}
      </dd>
      {debajo !== undefined && <dd className="text-etiqueta text-texto-suave">{debajo}</dd>}
    </div>
  );
}

// ── El buscador de las dos listas ────────────────────────────────────────────

function elBuscador(buscado: string, setBuscado: (texto: string) => void) {
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  const casa = (p: PlatoEnLaLista) =>
    texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(texto);
  const buscador = (
    <div className="max-w-[28rem]">
      <Campo
        etiqueta="Buscar un plato"
        value={buscado}
        onChange={(e) => {
          setBuscado(e.target.value);
        }}
      />
    </div>
  );
  const nadaConEso = (
    <NadaConEso
      compacto
      buscado={buscado}
      alQuitar={() => {
        setBuscado('');
      }}
    />
  );
  return { casa, buscador, nadaConEso };
}

/** Los platos de una lista, en tarjetas por sección de la carta. */
function PorSecciones({
  datos,
  platos,
  fila,
  nadaConEso,
}: {
  readonly datos: MisFichas;
  readonly platos: readonly PlatoEnLaLista[];
  readonly fila: (plato: PlatoEnLaLista) => ElementoDeLista;
  readonly nadaConEso: React.ReactNode;
}) {
  const todas: { readonly id: string | null; readonly nombre: string }[] = [
    ...datos.secciones,
    { id: null, nombre: 'Sin sección' },
  ];
  const grupos = todas
    .map((g) => ({ ...g, platos: platos.filter((p) => p.seccionId === g.id) }))
    .filter((g) => g.platos.length > 0);
  return (
    <>
      {grupos.length === 0 && <Tarjeta>{nadaConEso}</Tarjeta>}
      {grupos.map((g) => (
        <Tarjeta
          key={g.id ?? 'sin'}
          titulo={g.nombre}
          cuantos={g.platos.length}
          acento={ACENTO}
          pegado
        >
          <Lista titulo={g.nombre} elementos={g.platos.map(fila)} cuandoNoHay={null} />
        </Tarjeta>
      ))}
    </>
  );
}

// ── Escandallos ──────────────────────────────────────────────────────────────

function LosEscandallos({
  datos,
  vista,
  alAbrir,
}: {
  readonly datos: MisFichas;
  readonly vista: string;
  readonly alAbrir: (ficha: QueFicha) => void;
}) {
  const [buscado, setBuscado] = useState('');
  const { casa, buscador, nadaConEso } = elBuscador(buscado, setBuscado);
  const platos = datos.platos
    .filter(casa)
    .filter((p) =>
      vista === 'sin-escandallo'
        ? !p.tieneFicha
        : vista === 'bajo-objetivo'
          ? p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar'
          : true,
    );

  if (datos.platos.length === 0) {
    return (
      <Tarjeta>
        <EstadoVacio
          dibujo="platos"
          acento={ACENTO}
          titulo="Primero, tu carta"
          frase="Los platos nacen en la Carta. Aquí se desgranan."
        />
      </Tarjeta>
    );
  }

  if (vista === 'bajo-objetivo') {
    const enOrden = [...platos].sort((a, b) => (b.coste?.foodCost ?? 0) - (a.coste?.foodCost ?? 0));
    return (
      <div className="flex flex-col gap-e4">
        {buscador}
        <Tarjeta titulo="Pasan del objetivo" cuantos={enOrden.length} acento={ACENTO} pegado>
          <Lista
            titulo="Pasan del objetivo"
            elementos={enOrden.map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={nadaConEso}
          />
        </Tarjeta>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {buscador}
      <PorSecciones
        datos={datos}
        platos={platos}
        fila={(p) => filaDePlato(p, alAbrir)}
        nadaConEso={nadaConEso}
      />
    </div>
  );
}

// ── Fichas técnicas ──────────────────────────────────────────────────────────

function FichasTecnicas({
  datos,
  vista,
  alAbrir,
}: {
  readonly datos: MisFichas;
  readonly vista: string;
  readonly alAbrir: (ficha: QueFicha) => void;
}) {
  const navegar = useNavigate();
  const [buscado, setBuscado] = useState('');
  const { casa, buscador, nadaConEso } = elBuscador(buscado, setBuscado);
  // Solo lo que ya tiene escandallo: la ficha técnica coge de ahí lo que lleva, y no
  // se escribe dos veces (Richi, 16-oct).
  const conEscandallo = datos.platos.filter((p) => p.tieneFicha);
  const sinEscandallo = datos.cifras.sinFicha;
  const platos = conEscandallo
    .filter(casa)
    .filter((p) => (vista === 'sin-ficha' ? p.tieneFichaTecnica !== true : true));

  return (
    <div className="flex flex-col gap-e4">
      {/* Lo que hace falta para que un plato salga aquí, dicho una vez y corto. */}
      <div className="flex items-start gap-e3 rounded-grande bg-superficie px-e4 py-e3 [box-shadow:var(--sombra-tarjeta)]">
        <span aria-hidden className="mt-[2px] shrink-0 text-texto-suave">
          <IconoDocumento size={18} />
        </span>
        <p className="min-w-0 flex-1 text-secundario text-texto-suave">
          La ficha técnica enseña a hacer el plato: lo que lleva sale de su escandallo, y tú pones
          los pasos y sus fotos. Para que un plato salga aquí, tiene que estar en la Carta y tener
          su escandallo.
        </p>
      </div>

      {conEscandallo.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento={ACENTO}
            titulo="Primero, el escandallo"
            frase="Desgrana un plato en Escandallos y aquí escribes cómo se hace."
            accion={
              <Boton
                tono="principal"
                onClick={() => {
                  navegar('/escandallos/escandallos');
                }}
              >
                Ir a Escandallos
              </Boton>
            }
          />
        </Tarjeta>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-e3">
            {buscador}
            {/* Para encuadernarlas: todas en un PDF, por secciones y sin euros (0093). */}
            <BotonDelDocumento
              consulta={'las_fichas_en_pdf'}
              parametros={{}}
              texto="Descargar todas"
              tono="secundario"
            />
          </div>
          <PorSecciones
            datos={datos}
            platos={platos}
            fila={(p) => filaDeFicha(p, alAbrir)}
            nadaConEso={nadaConEso}
          />
          {sinEscandallo > 0 && (
            <button
              type="button"
              onClick={() => {
                navegar('/escandallos/escandallos/sin-escandallo');
              }}
              className="self-start text-secundario font-medium text-texto-suave underline decoration-borde-fuerte underline-offset-4 hover:text-texto"
            >
              {sinEscandallo === 1
                ? '1 plato de la carta sin escandallo todavía'
                : `${String(sinEscandallo)} platos de la carta sin escandallo todavía`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
