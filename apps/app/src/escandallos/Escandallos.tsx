import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNIDADES_DE_USO, type UnidadDeUso } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  ErrorEnCristiano,
  Cargando,
  EstadoVacio,
  Etiqueta,
  FotoDeProducto,
  Hoja,
  Lista,
  Mosaico,
  NadaConEso,
  Pieza,
  Proporcion,
  Tarjeta,
  sinAcentos,
  type ElementoDeLista,
} from '@estook/ui';
import { IconoAnadir, IconoAtencion, IconoEscandallos, IconoVincular } from '@estook/iconos';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarLasVistasConAlgo } from '../ganchos/usarLasVistasConAlgo.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { comoDinero } from '../almacen/contrato.ts';
import { LosAlergenos } from './Alergenos.tsx';
import { ElEscandalloDelPlato } from './ElEscandalloDelPlato.tsx';
import { FichaTecnica } from './FichaTecnica.tsx';
import {
  NOMBRE_DE_LA_UNIDAD,
  comoPorcentaje,
  comoSeAbre,
  leerCantidad,
  queFichaEs,
  tonoDelSemaforo,
  type ElaboracionEnLaLista,
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
 *   · **Escandallos**: los que ya están desgranados, con lo que llevan, lo que cuestan y
 *     lo que dejan, y **las elaboraciones** (la salsa, el aceite de albahaca), que se
 *     usan dentro de los platos. Lo nuevo entra por «Añadir» (19-oct).
 *   · **Fichas técnicas**: las que ya están hechas: lo que dice su escandallo (los
 *     gramos, sin euros) y los pasos con su foto. Lo nuevo, por «Crear ficha técnica»;
 *     para hacerla tiene que tener su escandallo: no se escribe dos veces lo que lleva.
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
  /** Lo recién elegido o creado en «Añadir»: se abre con su editor ya abierto. */
  const [recien, setRecien] = useState<string | null>(null);

  usarLasVistasConAlgo(
    datos === undefined
      ? null
      : [
          ...((datos.cifras.bajoObjetivo ?? 0) > 0 ? ['bajo-objetivo'] : []),
          // Los platos de los menús (M10 · 2, 0104): solo si el local tiene alguno.
          ...(datos.platos.some((p) => (p.enMenus?.length ?? 0) > 0) ? ['menus'] : []),
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
  // Lo elegido en «Añadir» o en «Crear ficha técnica»: se cierra la hoja (`hacer`) y se
  // abre su panel con el editor puesto.
  const cerrarLaAbierta = () => {
    setRecien(null);
    abierta.cerrar();
  };
  const empezar = (ficha: QueFicha) => {
    setRecien(comoSeAbre(ficha));
    abierta.abrirSinHacer(comoSeAbre(ficha));
  };
  const laAbierta = queFichaEs(abierta.abierto);
  const enLasFichas = destino === 'fichas';

  return (
    <div className="flex flex-col gap-e4">
      {enLasFichas ? (
        <FichasTecnicas datos={datos} vista={vista} alAbrir={abrir} alEmpezar={empezar} />
      ) : destino === 'escandallos' ? (
        <LosEscandallos datos={datos} vista={vista} alAbrir={abrir} alEmpezar={empezar} />
      ) : (
        <Resumen datos={datos} alAbrir={abrir} />
      )}

      {laAbierta !== null &&
        (enLasFichas ? (
          <FichaTecnica
            key={abierta.abierto}
            ficha={laAbierta}
            alCerrar={cerrarLaAbierta}
            empezarEditando={recien === abierta.abierto}
          />
        ) : (
          <ElEscandalloDelPlato
            key={abierta.abierto}
            ficha={laAbierta}
            alCerrar={cerrarLaAbierta}
            alAbrir={abrir}
            empezarEditando={recien === abierta.abierto}
          />
        ))}
    </div>
  );
}

/** Los que ya tienen escandallo y todavía no su ficha técnica (sin lo que va tal cual). */
function sinFichaTecnica(datos: MisFichas): readonly PlatoEnLaLista[] {
  return datos.platos.filter(
    (p) => p.tieneFicha && p.vinculadoA === null && p.tieneFichaTecnica !== true,
  );
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
                      navegar('/escandallos/escandallos/carta?hacer=anadir-plato');
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

/**
 * **Solo los que ya tienen escandallo, y un «Añadir»** (Richi, 19-oct: «no que salgan
 * todos de golpe, sino un "aún no tienes escandallos", y al crear que te diga si quieres
 * crearlo de la carta o una elaboración tipo salsa»). Antes salían todos los platos de
 * la carta, con o sin escandallo, bebidas incluidas.
 */
function LosEscandallos({
  datos,
  vista,
  alAbrir,
  alEmpezar,
}: {
  readonly datos: MisFichas;
  readonly vista: string;
  readonly alAbrir: (ficha: QueFicha) => void;
  /** Abre uno recién elegido o creado, con su editor ya abierto. */
  readonly alEmpezar: (ficha: QueFicha) => void;
}) {
  const [buscado, setBuscado] = useState('');
  const hacer = usarAbiertoEnLaDireccion('hacer');
  const { casa, buscador, nadaConEso } = elBuscador(buscado, setBuscado);
  // En «Carta», lo de la carta: lo que nació en un menú sale en «Menús» (0104).
  const conEscandallo = datos.platos.filter((p) => p.tieneFicha && p.enLaCarta !== false);
  const elaboraciones = datos.elaboraciones.filter((e) => e.activo);
  const platos = conEscandallo
    .filter(casa)
    .filter((p) =>
      vista === 'bajo-objetivo'
        ? p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar'
        : true,
    );
  const lasElaboraciones = elaboraciones.filter((e) =>
    sinAcentos(e.nombre.toLocaleLowerCase('es')).includes(
      sinAcentos(buscado.trim().toLocaleLowerCase('es')),
    ),
  );
  const anadiendo = hacer.abierto === 'anadir' || hacer.abierto === 'anadir-plato';

  const anadir = datos.puedeEditar ? (
    <Boton
      tono="principal"
      icono={<IconoAnadir size={18} />}
      onClick={() => {
        hacer.abrir('anadir');
      }}
    >
      Añadir
    </Boton>
  ) : null;

  const laHoja = anadiendo && (
    <AnadirEscandallo
      datos={datos}
      empiezaEnLosPlatos={hacer.abierto === 'anadir-plato'}
      alCerrar={hacer.cerrar}
      alEmpezar={alEmpezar}
    />
  );

  if (conEscandallo.length === 0 && elaboraciones.length === 0) {
    return (
      <>
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento={ACENTO}
            titulo="Aún no tienes escandallos"
            frase="Desgrana un plato de tu carta, o crea una elaboración —una salsa, un aceite— con productos del Almacén."
            {...(anadir === null
              ? { sinAccionPorque: 'Los escandallos los hace quien lleva la cocina.' }
              : { accion: anadir })}
          />
        </Tarjeta>
        {laHoja}
      </>
    );
  }

  const arriba = (
    <div className="flex flex-wrap items-end justify-between gap-e3">
      {buscador}
      {anadir}
    </div>
  );

  if (vista === 'menus') {
    return (
      <div className="flex flex-col gap-e4">
        {arriba}
        <LosDeLosMenus datos={datos} casa={casa} alAbrir={alAbrir} nadaConEso={nadaConEso} />
        {laHoja}
      </div>
    );
  }

  if (vista === 'bajo-objetivo') {
    const enOrden = [...platos].sort((a, b) => (b.coste?.foodCost ?? 0) - (a.coste?.foodCost ?? 0));
    return (
      <div className="flex flex-col gap-e4">
        {arriba}
        <Tarjeta titulo="Pasan del objetivo" cuantos={enOrden.length} acento={ACENTO} pegado>
          <Lista
            titulo="Pasan del objetivo"
            elementos={enOrden.map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={nadaConEso}
          />
        </Tarjeta>
        {laHoja}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {arriba}
      {platos.length > 0 && (
        <PorSecciones
          datos={datos}
          platos={platos}
          fila={(p) => filaDePlato(p, alAbrir)}
          nadaConEso={nadaConEso}
        />
      )}
      {lasElaboraciones.length > 0 && (
        <Tarjeta
          titulo="Elaboraciones"
          cuantos={lasElaboraciones.length}
          acento={ACENTO}
          icono={<IconoEscandallos size={18} />}
          pegado
        >
          <Lista
            titulo="Elaboraciones"
            elementos={lasElaboraciones.map((e) =>
              filaDeElaboracion(e, alAbrir, datos.conImportes),
            )}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}
      {platos.length === 0 && lasElaboraciones.length === 0 && <Tarjeta>{nadaConEso}</Tarjeta>}
      {laHoja}
    </div>
  );
}

/**
 * Escandallos › Menús (M10 · 2, 0104; Richi: «añadir otra pestaña que sea menú»): los
 * platos de los menús de estas semanas, **con y sin escandallo**, por menú. El que no lo
 * tiene se desgrana tocándolo: sin él, Carta › Menús no sabe lo que deja.
 */
function LosDeLosMenus({
  datos,
  casa,
  alAbrir,
  nadaConEso,
}: {
  readonly datos: MisFichas;
  readonly casa: (plato: PlatoEnLaLista) => boolean;
  readonly alAbrir: (ficha: QueFicha) => void;
  readonly nadaConEso: React.ReactNode;
}) {
  const menus = [...new Set(datos.platos.flatMap((p) => p.enMenus ?? []))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const grupos = menus
    .map((menu) => ({
      menu,
      platos: datos.platos
        .filter((p) => (p.enMenus ?? []).includes(menu))
        .filter(casa)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }))
    .filter((g) => g.platos.length > 0);
  if (grupos.length === 0) return <Tarjeta>{nadaConEso}</Tarjeta>;
  return (
    <>
      {grupos.map((g) => (
        <Tarjeta key={g.menu} titulo={g.menu} cuantos={g.platos.length} acento={ACENTO} pegado>
          <Lista
            titulo={g.menu}
            elementos={g.platos.map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      ))}
    </>
  );
}

/** Una elaboración: lo que rinde, lo que lleva y, a quien ve costes, lo que cuesta. */
function filaDeElaboracion(
  elaboracion: ElaboracionEnLaLista,
  alAbrir: (ficha: QueFicha) => void,
  conImportes: boolean,
): ElementoDeLista {
  const sinDesgranar = elaboracion.ingredientes === 0;
  return {
    clave: elaboracion.id,
    titulo: elaboracion.nombre,
    detalle: (
      <span className="flex min-w-0 flex-wrap items-center gap-x-e2">
        <span className="shrink-0">sale {elaboracion.rinde}</span>
        {elaboracion.usadaEn > 0 && (
          <span className="shrink-0">
            · en {elaboracion.usadaEn === 1 ? '1 receta' : `${String(elaboracion.usadaEn)} recetas`}
          </span>
        )}
        <LosAlergenos alergenos={elaboracion.alergenos} lado={18} enUnaLinea />
      </span>
    ),
    ...(sinDesgranar
      ? { derecha: <Etiqueta>Sin desgranar</Etiqueta> }
      : conImportes && elaboracion.costeCentimos !== null && elaboracion.costeCentimos !== undefined
        ? {
            derecha: (
              <span className="flex flex-col items-end text-right">
                <span className="text-cuerpo font-semibold tabular-nums">
                  {comoDinero(elaboracion.costeCentimos)}
                </span>
                {elaboracion.costePorUnidad !== null &&
                  elaboracion.costePorUnidad !== undefined && (
                    <span className="text-etiqueta text-texto-suave tabular-nums">
                      {elaboracion.costePorUnidad}
                    </span>
                  )}
              </span>
            ),
          }
        : {}),
    alPulsar: () => {
      alAbrir({ tipo: 'elaboracion', id: elaboracion.id });
    },
  };
}

// ── Añadir un escandallo ─────────────────────────────────────────────────────

/**
 * «Añadir» pregunta lo que se quiere hacer, en dos tarjetas: **el de un plato de la
 * carta** que aún no lo tiene, o **una elaboración desde cero** —una salsa, el aceite de
 * albahaca— con productos del Almacén: dice cuánto sale, y Estook saca lo que cuesta.
 * Se puede poner luego dentro de un plato, y su coste baja a él (Richi, 19-oct).
 */
function AnadirEscandallo({
  datos,
  empiezaEnLosPlatos,
  alCerrar,
  alEmpezar,
}: {
  readonly datos: MisFichas;
  readonly empiezaEnLosPlatos: boolean;
  readonly alCerrar: () => void;
  readonly alEmpezar: (ficha: QueFicha) => void;
}) {
  const navegar = useNavigate();
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const [paso, setPaso] = useState<'elegir' | 'plato' | 'elaboracion'>(
    empiezaEnLosPlatos ? 'plato' : 'elegir',
  );
  const [buscado, setBuscado] = useState('');
  const [nombre, setNombre] = useState('');
  const [rinde, setRinde] = useState('');
  const [unidad, setUnidad] = useState<UnidadDeUso>('l');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // Los de la carta sin escandallo, sin lo que se vende tal cual (va vinculado).
  const sinEscandallo = datos.platos.filter((p) => !p.tieneFicha);
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  const losQueSalen = sinEscandallo.filter((p) =>
    sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(texto),
  );
  const rindeLeido = leerCantidad(rinde);

  async function crearLaElaboracion() {
    if (rindeLeido === null || nombre.trim() === '') return;
    setCreando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ elaboracionId: string }>('crear_elaboracion', {
      nombre: nombre.trim(),
      rinde_cantidad: rindeLeido,
      rinde_unidad: unidad,
    });
    setCreando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alEmpezar({ tipo: 'elaboracion', id: respuesta.datos.elaboracionId });
  }

  const tarjeta = (
    que: 'plato' | 'elaboracion',
    titulo: string,
    frase: string,
    apagada = false,
  ) => (
    <button
      type="button"
      disabled={apagada}
      onClick={() => {
        setPaso(que);
      }}
      className="flex min-h-toque w-full flex-col items-start gap-e1 rounded-grande border border-borde-fuerte bg-superficie p-e4 text-left hover:bg-fondo disabled:opacity-50"
    >
      <span className="text-cuerpo font-semibold">{titulo}</span>
      <span className="text-secundario text-texto-suave">{frase}</span>
    </button>
  );

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={
        paso === 'plato'
          ? 'Elige el plato'
          : paso === 'elaboracion'
            ? 'Una elaboración'
            : 'Añadir un escandallo'
      }
      pie={
        paso === 'elegir' ? undefined : (
          <Botones>
            <Boton
              tono="texto"
              onClick={() => {
                setPaso('elegir');
                setError(null);
              }}
            >
              Atrás
            </Boton>
            {paso === 'elaboracion' && (
              <Boton
                tono="principal"
                disabled={rindeLeido === null || nombre.trim() === ''}
                cargando={creando}
                textoCargando="Creando"
                onClick={() => {
                  void crearLaElaboracion();
                }}
              >
                Crear y desgranar
              </Boton>
            )}
          </Botones>
        )
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}

        {paso === 'elegir' && (
          <>
            {datos.platos.length === 0
              ? tarjeta(
                  'plato',
                  'De un plato de la carta',
                  'Todavía no hay platos en tu carta.',
                  true,
                )
              : tarjeta(
                  'plato',
                  'De un plato de la carta',
                  sinEscandallo.length === 0
                    ? 'Todos tus platos tienen ya su escandallo.'
                    : `Desgrana lo que lleva una ración. ${sinEscandallo.length === 1 ? 'Te falta 1 plato' : `Te faltan ${String(sinEscandallo.length)} platos`}.`,
                  sinEscandallo.length === 0,
                )}
            {tarjeta(
              'elaboracion',
              'Una elaboración desde cero',
              'Una salsa, un aceite, un fondo: con productos del Almacén. Sale lo que cuesta, y se puede poner dentro de tus platos.',
            )}
            {datos.platos.length === 0 && puedeVer(permisos, 'app.carta') && (
              <Boton
                tono="texto"
                onClick={() => {
                  navegar('/carta/carta/por-secciones?hacer=nuevo');
                }}
              >
                Poner platos en la Carta
              </Boton>
            )}
          </>
        )}

        {paso === 'plato' && (
          <>
            <Campo
              etiqueta="Buscar un plato"
              value={buscado}
              onChange={(e) => {
                setBuscado(e.target.value);
              }}
            />
            <Lista
              titulo="Platos sin escandallo"
              elementos={losQueSalen.map((p): ElementoDeLista => ({
                clave: p.id,
                delante: (
                  <FotoDeProducto
                    nombre={p.nombre}
                    categoria={null}
                    enlace={p.miniatura}
                    lado={40}
                  />
                ),
                titulo: p.nombre,
                detalle: datos.secciones.find((s) => s.id === p.seccionId)?.nombre ?? 'Sin sección',
                alPulsar: () => {
                  alEmpezar({ tipo: 'plato', id: p.id });
                },
              }))}
              cuandoNoHay={
                <NadaConEso
                  compacto
                  buscado={buscado}
                  alQuitar={() => {
                    setBuscado('');
                  }}
                />
              }
            />
          </>
        )}

        {paso === 'elaboracion' && (
          <>
            <Campo
              etiqueta="Cómo se llama"
              autoFocus
              value={nombre}
              maxLength={120}
              placeholder="Aceite de albahaca"
              onChange={(e) => {
                setNombre(e.target.value);
              }}
            />
            <Campo
              etiqueta="Cuánto sale"
              ayuda="Lo que sale de una vez, con lo que vas a poner. De ahí sale lo que cuesta cada litro o kilo."
              inputMode="decimal"
              value={rinde}
              placeholder="1"
              onChange={(e) => {
                setRinde(e.target.value);
              }}
              unidad={{
                valor: unidad,
                opciones: UNIDADES_DE_USO.map((u) => ({ valor: u, larga: NOMBRE_DE_LA_UNIDAD[u] })),
                alElegir: (u) => {
                  setUnidad(u as UnidadDeUso);
                },
              }}
              {...(rinde !== '' && rindeLeido === null ? { error: 'Un número, como 1 o 1,5' } : {})}
            />
          </>
        )}
      </div>
    </Hoja>
  );
}

// ── Fichas técnicas ──────────────────────────────────────────────────────────

/** Lo que puede tener ficha técnica: lo que tiene escandallo y no se vende tal cual. */
function puedeTenerFicha(p: PlatoEnLaLista): boolean {
  return p.tieneFicha && p.vinculadoA === null;
}

/**
 * **Solo las que ya tienen ficha, y un «Crear ficha técnica»** (Richi, 19-oct: «salen
 * todos los productos que tienen escandallo, es un lío; quizá no quieren fichas de todo,
 * solo de algunas cosas, como el aceite de albahaca»). Las bebidas que se venden tal cual
 * no salen: no hay nada que enseñar a hacer.
 */
function FichasTecnicas({
  datos,
  vista,
  alAbrir,
  alEmpezar,
}: {
  readonly datos: MisFichas;
  readonly vista: string;
  readonly alAbrir: (ficha: QueFicha) => void;
  readonly alEmpezar: (ficha: QueFicha) => void;
}) {
  const [buscado, setBuscado] = useState('');
  const hacer = usarAbiertoEnLaDireccion('hacer');
  const { casa, buscador, nadaConEso } = elBuscador(buscado, setBuscado);
  const sinFicha = vista === 'sin-ficha';
  const platos = datos.platos
    .filter(puedeTenerFicha)
    .filter(casa)
    .filter((p) => (sinFicha ? p.tieneFichaTecnica !== true : p.tieneFichaTecnica === true));
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  const elaboraciones = datos.elaboraciones
    .filter((e) => e.activo && e.ingredientes > 0)
    .filter((e) => sinAcentos(e.nombre.toLocaleLowerCase('es')).includes(texto))
    .filter((e) => (sinFicha ? (e.pasos ?? 0) === 0 : (e.pasos ?? 0) > 0));
  const hayFichas =
    datos.platos.some((p) => puedeTenerFicha(p) && p.tieneFichaTecnica === true) ||
    datos.elaboraciones.some((e) => e.activo && (e.pasos ?? 0) > 0);

  const crear = datos.puedeEditar ? (
    <Boton
      tono="principal"
      icono={<IconoAnadir size={18} />}
      onClick={() => {
        hacer.abrir('crear-ficha');
      }}
    >
      Crear ficha técnica
    </Boton>
  ) : null;

  const laHoja = hacer.abierto === 'crear-ficha' && (
    <CrearFichaTecnica datos={datos} alCerrar={hacer.cerrar} alEmpezar={alEmpezar} />
  );

  if (!hayFichas && !sinFicha) {
    return (
      <>
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento={ACENTO}
            titulo="Aún no tienes fichas técnicas"
            frase="La ficha enseña a hacer un plato o una salsa, paso a paso y con fotos. Lo que lleva sale de su escandallo."
            {...(crear === null
              ? { sinAccionPorque: 'Las fichas las escribe quien lleva la cocina.' }
              : { accion: crear })}
          />
        </Tarjeta>
        {laHoja}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end justify-between gap-e3">
        {buscador}
        <div className="flex flex-wrap gap-e2">
          {crear}
          {/* Para encuadernarlas: todas en un PDF, por secciones y sin euros (0093). */}
          {hayFichas && (
            <BotonDelDocumento
              consulta={'las_fichas_en_pdf'}
              parametros={{}}
              texto="Descargar todas"
              tono="secundario"
            />
          )}
        </div>
      </div>
      {platos.length > 0 && (
        <PorSecciones
          datos={datos}
          platos={platos}
          fila={(p) => filaDeFicha(p, alAbrir)}
          nadaConEso={nadaConEso}
        />
      )}
      {elaboraciones.length > 0 && (
        <Tarjeta titulo="Elaboraciones" cuantos={elaboraciones.length} acento={ACENTO} pegado>
          <Lista
            titulo="Elaboraciones"
            elementos={elaboraciones.map((e): ElementoDeLista => ({
              clave: e.id,
              titulo: e.nombre,
              detalle: (e.pasos ?? 0) === 1 ? '1 paso' : `${String(e.pasos ?? 0)} pasos`,
              ...((e.pasos ?? 0) > 0 ? {} : { derecha: <Etiqueta>Sin pasos</Etiqueta> }),
              alPulsar: () => {
                alAbrir({ tipo: 'elaboracion', id: e.id });
              },
            }))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}
      {platos.length === 0 && elaboraciones.length === 0 && <Tarjeta>{nadaConEso}</Tarjeta>}
      {laHoja}
    </div>
  );
}

/**
 * «Crear ficha técnica»: primero lo que ya tiene escandallo y aún no su ficha; debajo,
 * en gris, lo que no tiene escandallo, diciendo que hace falta (Richi, 19-oct).
 */
function CrearFichaTecnica({
  datos,
  alCerrar,
  alEmpezar,
}: {
  readonly datos: MisFichas;
  readonly alCerrar: () => void;
  readonly alEmpezar: (ficha: QueFicha) => void;
}) {
  const navegar = useNavigate();
  const [buscado, setBuscado] = useState('');
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  const casa = (nombre: string) => sinAcentos(nombre.toLocaleLowerCase('es')).includes(texto);
  const listos = [
    ...datos.platos
      .filter((p) => puedeTenerFicha(p) && p.tieneFichaTecnica !== true && casa(p.nombre))
      .map((p) => ({ ficha: { tipo: 'plato' as const, id: p.id }, nombre: p.nombre, de: 'Plato' })),
    ...datos.elaboraciones
      .filter((e) => e.activo && e.ingredientes > 0 && (e.pasos ?? 0) === 0 && casa(e.nombre))
      .map((e) => ({
        ficha: { tipo: 'elaboracion' as const, id: e.id },
        nombre: e.nombre,
        de: 'Elaboración',
      })),
  ];
  const sinEscandallo = datos.platos.filter(
    (p) => !p.tieneFicha && p.vinculadoA === null && casa(p.nombre),
  );

  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Crear ficha técnica">
      <div className="flex flex-col gap-e4 pt-e3">
        <Campo
          etiqueta="Buscar"
          value={buscado}
          onChange={(e) => {
            setBuscado(e.target.value);
          }}
        />
        <section aria-label="Con su escandallo" className="flex flex-col gap-e1">
          <h3 className="text-secundario font-semibold text-texto-suave">Con su escandallo</h3>
          {listos.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              {texto === ''
                ? 'Todo lo que tiene escandallo tiene ya su ficha.'
                : 'Nada con ese nombre.'}
            </p>
          ) : (
            <Lista
              titulo="Con su escandallo"
              elementos={listos.map((l): ElementoDeLista => ({
                clave: `${l.ficha.tipo}.${l.ficha.id}`,
                titulo: l.nombre,
                detalle: l.de,
                alPulsar: () => {
                  alEmpezar(l.ficha);
                },
              }))}
              cuandoNoHay={null}
            />
          )}
        </section>
        {sinEscandallo.length > 0 && (
          <section aria-label="Sin escandallo" className="flex flex-col gap-e1">
            <h3 className="text-secundario font-semibold text-texto-suave">Sin escandallo</h3>
            <p className="text-secundario text-texto-suave">
              Para hacer su ficha técnica, primero hay que desgranarlo: la ficha coge de ahí lo que
              lleva.{' '}
              <button
                type="button"
                onClick={() => {
                  navegar('/escandallos/escandallos/carta?hacer=anadir-plato');
                }}
                className="font-semibold text-texto underline decoration-borde-fuerte underline-offset-4"
              >
                Desgranar uno
              </button>
            </p>
            <ul aria-label="Sin escandallo todavía" className="flex flex-col opacity-55">
              {sinEscandallo.map((p) => (
                <li
                  key={p.id}
                  className="flex min-h-toque items-center border-b border-borde px-e2 text-cuerpo text-texto-suave last:border-0"
                >
                  {p.nombre}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Hoja>
  );
}
