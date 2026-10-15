import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNIDADES_DE_USO, type UnidadDeUso } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
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
  ErrorEnCristiano,
  sinAcentos,
  type ElementoDeLista,
} from '@estook/ui';
import { IconoAnadir, IconoAtencion, IconoEscandallos, IconoVincular } from '@estook/iconos';
import { puedeVer } from '@estook/permisos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarLasVistasConAlgo } from '../ganchos/usarLasVistasConAlgo.ts';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { LosAlergenos } from './Alergenos.tsx';
import { FichaTecnica } from './FichaTecnica.tsx';
import {
  comoPorcentaje,
  comoSeAbre,
  leerCantidad,
  queFichaEs,
  tonoDelSemaforo,
  type MisFichas,
  type PlatoEnLaLista,
  type QueFicha,
} from './contrato.ts';

/** El acento de Escandallos. */
const ACENTO = 'var(--color-app-escandallos)';

/** Cuántos «sin ficha» se enseñan en el Resumen antes de «Ver todos». */
const A_LA_VISTA = 6;

/**
 * Escandallos (M9 · 2, decisiones 0086 y 0087).
 *
 *   · **Resumen**: cuántos platos están desgranados, los que faltan («sin ficha»), y a
 *     quien ve costes, los que pasan del objetivo y los que pierden dinero en algún canal.
 *   · **Fichas**: los platos de la carta, por secciones, con sus alérgenos y su food cost.
 *   · **Elaboraciones**: la salsa, el caldo, lo que se prepara antes, con lo que rinde.
 *
 * La ficha de cada uno se abre al lado (`?ficha=plato.<id>`), y el enlace se puede
 * mandar por el chat: «mira cómo se hace la salsa».
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
  const [nueva, setNueva] = useState(false);
  const datos = consulta.data;

  usarLasVistasConAlgo(
    datos === undefined
      ? null
      : [
          ...(datos.cifras.sinFicha > 0 ? ['sin-ficha'] : []),
          ...((datos.cifras.bajoObjetivo ?? 0) > 0 ? ['bajo-objetivo'] : []),
        ],
  );
  usarQueHacer('nueva-elaboracion', () => {
    setNueva(true);
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus fichas" forma="lista-foto" lineas={6} />
      </div>
    );
  }
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus fichas">
        Prueba en un momento.
      </Aviso>
    );
  }

  const abrir = (ficha: QueFicha) => {
    abierta.abrir(comoSeAbre(ficha));
  };
  const laAbierta = queFichaEs(abierta.abierto);

  return (
    <div className="flex flex-col gap-e4">
      {destino === 'elaboraciones' ? (
        <Elaboraciones
          datos={datos}
          alAbrir={abrir}
          alCrear={() => {
            setNueva(true);
          }}
        />
      ) : destino === 'fichas' ? (
        <Fichas datos={datos} vista={vista} alAbrir={abrir} />
      ) : (
        <Resumen datos={datos} alAbrir={abrir} />
      )}

      {laAbierta !== null && (
        <FichaTecnica
          key={abierta.abierto}
          ficha={laAbierta}
          alCerrar={abierta.cerrar}
          alAbrir={abrir}
        />
      )}
      {nueva && datos.puedeEditar && (
        <NuevaElaboracion
          alCerrar={() => {
            setNueva(false);
          }}
          alCrear={(id) => {
            setNueva(false);
            abrir({ tipo: 'elaboracion', id });
          }}
        />
      )}
    </div>
  );
}

// ── Una fila de plato ────────────────────────────────────────────────────────

function filaDePlato(
  plato: PlatoEnLaLista,
  alAbrir: (ficha: QueFicha) => void,
  detalle?: string,
): ElementoDeLista {
  const coste = plato.coste;
  const derecha = !plato.tieneFicha ? (
    <Etiqueta>Sin ficha</Etiqueta>
  ) : coste === undefined ? undefined : coste.costeCentimos === null ? (
    <Etiqueta tono="atencion">Falta precio</Etiqueta>
  ) : coste.foodCost === null ? undefined : (
    <Etiqueta tono={tonoDelSemaforo(coste.semaforo)}>{comoPorcentaje(coste.foodCost)}</Etiqueta>
  );
  const pierde = coste !== undefined && coste.pierdeEn.length > 0;
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
        {detalle !== undefined && <span className="min-w-0 truncate">{detalle}</span>}
        <LosAlergenos alergenos={plato.alergenos} picante={plato.picante} lado={18} enUnaLinea />
      </span>
    ),
    ...(derecha === undefined ? {} : { derecha }),
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

  const sinFicha = datos.platos.filter((p) => !p.tieneFicha);
  const pierden = datos.platos.filter((p) => (p.coste?.pierdeEn.length ?? 0) > 0);
  const pasan = datos.platos
    .filter((p) => p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar')
    .sort((a, b) => (b.coste?.foodCost ?? 0) - (a.coste?.foodCost ?? 0));
  const conFicha = cifras.platos - cifras.sinFicha;

  return (
    <Mosaico>
      <Pieza entera>
        <Tarjeta
          titulo="Cómo van tus fichas"
          acento={ACENTO}
          icono={<IconoEscandallos size={18} />}
        >
          <div className="flex flex-col gap-e4">
            <dl className="grid grid-cols-2 gap-e3 sm:grid-cols-4">
              <Dato nombre="Con ficha" valor={`${String(conFicha)} de ${String(cifras.platos)}`} />
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
                  <Dato nombre="Pasan del objetivo" valor={String(cifras.bajoObjetivo ?? 0)} />
                  <Dato
                    nombre="Pierden en un canal"
                    valor={String(cifras.pierden ?? 0)}
                    {...((cifras.pierden ?? 0) > 0 ? { mal: true } : {})}
                  />
                </>
              )}
            </dl>
            <Proporcion
              titulo="Platos con ficha"
              soloLaBarra
              trozos={[
                { que: 'Con ficha', cuantos: conFicha, tono: 'bien' },
                { que: 'Sin ficha', cuantos: cifras.sinFicha, tono: 'neutro' },
              ]}
            />
          </div>
        </Tarjeta>
      </Pieza>

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

      {sinFicha.length > 0 && (
        <Tarjeta
          titulo="Sin ficha"
          cuantos={sinFicha.length}
          acento={ACENTO}
          pegado
          {...(sinFicha.length > A_LA_VISTA
            ? {
                accion: (
                  <Boton
                    tono="texto"
                    tamano="s"
                    onClick={() => {
                      navegar('/escandallos/fichas/sin-ficha');
                    }}
                  >
                    Ver todos
                  </Boton>
                ),
              }
            : {})}
        >
          <Lista
            titulo="Sin ficha"
            elementos={sinFicha.slice(0, A_LA_VISTA).map((p) => filaDePlato(p, alAbrir))}
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

      {sinFicha.length === 0 && pierden.length === 0 && pasan.length === 0 && (
        <Tarjeta>
          <EstadoVacio
            dibujo="todo-en-orden"
            acento={ACENTO}
            titulo="Todo desgranado"
            frase="Cada plato tiene su ficha. Si sube un ingrediente, aquí lo verás."
          />
        </Tarjeta>
      )}
    </Mosaico>
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

// ── Fichas ───────────────────────────────────────────────────────────────────

function Fichas({
  datos,
  vista,
  alAbrir,
}: {
  readonly datos: MisFichas;
  readonly vista: string;
  readonly alAbrir: (ficha: QueFicha) => void;
}) {
  const [buscado, setBuscado] = useState('');
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  const casa = (p: PlatoEnLaLista) =>
    texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(texto);
  const platos = datos.platos
    .filter(casa)
    .filter((p) =>
      vista === 'sin-ficha'
        ? !p.tieneFicha
        : vista === 'bajo-objetivo'
          ? p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar'
          : true,
    );

  const buscador = (
    <Campo
      etiqueta="Buscar un plato"
      value={buscado}
      onChange={(e) => {
        setBuscado(e.target.value);
      }}
    />
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
      <Tarjeta titulo="Pasan del objetivo" cuantos={enOrden.length} acento={ACENTO}>
        <div className="px-e3 pb-e3">{buscador}</div>
        <Lista
          titulo="Pasan del objetivo"
          elementos={enOrden.map((p) => filaDePlato(p, alAbrir))}
          cuandoNoHay={nadaConEso}
        />
      </Tarjeta>
    );
  }

  const todas: { readonly id: string | null; readonly nombre: string }[] = [
    ...datos.secciones,
    { id: null, nombre: 'Sin sección' },
  ];
  const grupos = todas
    .map((g) => ({ ...g, platos: platos.filter((p) => p.seccionId === g.id) }))
    .filter((g) => g.platos.length > 0);

  return (
    <div className="flex flex-col gap-e4">
      <div className="max-w-[28rem]">{buscador}</div>
      {grupos.length === 0 && <Tarjeta>{nadaConEso}</Tarjeta>}
      {grupos.map((g) => (
        <Tarjeta
          key={g.id ?? 'sin'}
          titulo={g.nombre}
          cuantos={g.platos.length}
          acento={ACENTO}
          pegado
        >
          <Lista
            titulo={g.nombre}
            elementos={g.platos.map((p) => filaDePlato(p, alAbrir))}
            cuandoNoHay={null}
          />
        </Tarjeta>
      ))}
    </div>
  );
}

// ── Elaboraciones ────────────────────────────────────────────────────────────

function Elaboraciones({
  datos,
  alAbrir,
  alCrear,
}: {
  readonly datos: MisFichas;
  readonly alAbrir: (ficha: QueFicha) => void;
  readonly alCrear: () => void;
}) {
  const activas = datos.elaboraciones.filter((e) => e.activo);
  const archivadas = datos.elaboraciones.filter((e) => !e.activo);
  const fila = (e: (typeof activas)[number]): ElementoDeLista => ({
    clave: e.id,
    titulo: e.nombre,
    detalle: (
      <span className="flex min-w-0 items-center gap-e2">
        <span className="truncate">
          Rinde {e.rinde}
          {e.ingredientes === 0 ? ' · sin ficha' : ''}
          {e.usadaEn > 0
            ? ` · en ${String(e.usadaEn)} ${e.usadaEn === 1 ? 'receta' : 'recetas'}`
            : ''}
        </span>
        <LosAlergenos alergenos={e.alergenos} lado={18} enUnaLinea />
      </span>
    ),
    ...(e.costePorUnidad === undefined || e.costePorUnidad === null
      ? {}
      : {
          derecha: (
            <span className="shrink-0 text-secundario font-semibold tabular-nums">
              {e.costePorUnidad}
            </span>
          ),
        }),
    alPulsar: () => {
      alAbrir({ tipo: 'elaboracion', id: e.id });
    },
  });

  return (
    <div className="flex flex-col gap-e4">
      {datos.puedeEditar && activas.length > 0 && (
        <div>
          <Boton tono="principal" icono={<IconoAnadir size={18} />} onClick={alCrear}>
            Nueva elaboración
          </Boton>
        </div>
      )}
      {activas.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento={ACENTO}
            titulo="Lo que preparas antes"
            frase="La salsa de la casa, el caldo, la masa: con lo que rinde, cuesta lo justo dentro de cada plato."
            {...(datos.puedeEditar
              ? {
                  accion: (
                    <Boton tono="principal" icono={<IconoAnadir size={18} />} onClick={alCrear}>
                      Nueva elaboración
                    </Boton>
                  ),
                }
              : { sinAccionPorque: 'Las escribe quien lleva la cocina.' })}
          />
        </Tarjeta>
      ) : (
        <Tarjeta titulo="Elaboraciones" cuantos={activas.length} acento={ACENTO} pegado>
          <Lista titulo="Elaboraciones" elementos={activas.map(fila)} cuandoNoHay={null} />
        </Tarjeta>
      )}
      {archivadas.length > 0 && (
        <details className="rounded-grande border border-borde bg-superficie">
          <summary className="flex min-h-toque cursor-pointer items-center px-e4 text-secundario font-semibold text-texto-suave">
            Archivadas ({archivadas.length})
          </summary>
          <Lista titulo="Archivadas" elementos={archivadas.map(fila)} cuandoNoHay={null} />
        </details>
      )}
    </div>
  );
}

const NOMBRE_DE_LA_UNIDAD: Readonly<Record<UnidadDeUso, string>> = {
  g: 'gramos',
  kg: 'kilos',
  ml: 'mililitros',
  l: 'litros',
  ud: 'unidades',
};

function NuevaElaboracion({
  alCerrar,
  alCrear,
}: {
  readonly alCerrar: () => void;
  readonly alCrear: (id: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const [nombre, setNombre] = useState('');
  const [rinde, setRinde] = useState('');
  const [unidad, setUnidad] = useState<UnidadDeUso>('l');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const cantidad = leerCantidad(rinde);

  async function crear() {
    setCreando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ elaboracionId: string }>('crear_elaboracion', {
      nombre: nombre.trim(),
      rinde_cantidad: cantidad,
      rinde_unidad: unidad,
    });
    setCreando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCrear(respuesta.datos.elaboracionId);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Nueva elaboración"
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tono="principal"
            disabled={nombre.trim() === '' || cantidad === null}
            cargando={creando}
            textoCargando="Creando"
            onClick={() => {
              void crear();
            }}
          >
            Crear
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={120}
          placeholder="Salsa de la casa"
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
        <Campo
          etiqueta="Lo que sale de hacerla una vez"
          inputMode="decimal"
          value={rinde}
          placeholder="2"
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
          ayuda="Con esto, Estook sabe lo que cuesta cada litro o cada kilo."
        />
      </div>
    </Hoja>
  );
}
