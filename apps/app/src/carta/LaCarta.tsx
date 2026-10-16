import { useMemo, useState } from 'react';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  FotoDeProducto,
  Hoja,
  Lista,
  NadaConEso,
  Selector,
  Tarjeta,
  type ElementoDeLista,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoBorrar,
  IconoEditar,
  IconoFlechaAbajo,
  IconoFlechaArriba,
  IconoVincular,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { centimos } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { comoDinero } from '../almacen/contrato.ts';
import {
  canalesConPrecio,
  losAlergenosDe,
  type MiCarta,
  type UnCanal,
  type UnPlato,
} from './contrato.ts';
import { FichaDelPlato } from './FichaDelPlato.tsx';
import { DesdeElAlmacen } from './DesdeElAlmacen.tsx';
import { LosAlergenos } from '../escandallos/Alergenos.tsx';

/**
 * Tu carta (M9 · 1, decisión 0086).
 *
 * «Primero la carta» (Richi, 15-oct): lo que se vende, **por secciones y a cuánto**.
 * El plato es uno solo y nace aquí; en Escandallos se desgranará.
 *
 *   · **Por secciones**, en su orden, y «Sin sección» al final si hay alguno.
 *   · **Todos los platos**, de la A a la Z, con su buscador; y los archivados, aparte.
 *   · **Añadir platos de golpe**: nombre y precio, fila a fila, que es como se pasa
 *     una carta de papel.
 *
 * Cada fila dice su precio de sala y, si en un canal activo tiene otro, ese también
 * («Uber Eats 12,50 €»). Igual que sala no se repite: sería ruido.
 */

export function LaCarta({ vista }: { readonly vista: string }) {
  const consulta = usarLectura<MiCarta>('mi_carta');
  const plato = usarAbiertoEnLaDireccion('plato');
  const [anadiendo, setAnadiendo] = useState<string | null | undefined>(undefined);
  const [seccionEnHoja, setSeccionEnHoja] = useState<{ id: string | null; nombre: string } | null>(
    null,
  );

  const datos = consulta.data;
  // Con los permisos de la sesión, que están desde el principio: con los de la carta,
  // el «Añadir platos» del «+» se perdía si llegaba antes que ella (repaso, 15-oct).
  const { permisos } = usarSesion();
  usarQueHacer('nuevo', () => {
    if (puedeEditar(permisos, 'app.carta')) setAnadiendo(null);
  });
  // Vincular es escribir la ficha: hace falta Escandallos para editar, y ver el Almacén.
  const puedeVincular =
    puedeEditar(permisos, 'app.escandallos') && puedeVer(permisos, 'app.almacen');
  const [desdeElAlmacen, setDesdeElAlmacen] = useState(false);

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tu carta" forma="lista-foto" lineas={6} />
      </div>
    );
  }
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu carta">
        Prueba en un momento.
      </Aviso>
    );
  }

  const activos = datos.platos.filter((p) => p.activo);
  const conPrecio = canalesConPrecio(datos.canales);

  return (
    <div className="flex flex-col gap-e4">
      {datos.puedeEditar && activos.length > 0 && (
        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setAnadiendo(null);
            }}
          >
            Añadir platos
          </Boton>
          {puedeVincular && (
            <Boton
              tono="secundario"
              icono={<IconoVincular size={18} />}
              onClick={() => {
                setDesdeElAlmacen(true);
              }}
            >
              Desde el almacén
            </Boton>
          )}
          <Boton
            tono="secundario"
            onClick={() => {
              setSeccionEnHoja({ id: null, nombre: '' });
            }}
          >
            Nueva sección
          </Boton>
        </div>
      )}

      {activos.length === 0 && datos.platos.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento="var(--color-app-carta)"
            titulo="Tu carta, aquí"
            frase="Añade tus platos por secciones, con su precio. Se pasan de golpe, fila a fila."
            {...(datos.puedeEditar
              ? {
                  accion: (
                    <div className="flex flex-wrap justify-center gap-e2">
                      <Boton
                        tono="principal"
                        icono={<IconoAnadir size={18} />}
                        onClick={() => {
                          setAnadiendo(null);
                        }}
                      >
                        Añadir platos
                      </Boton>
                      {puedeVincular && (
                        <Boton
                          tono="secundario"
                          icono={<IconoVincular size={18} />}
                          onClick={() => {
                            setDesdeElAlmacen(true);
                          }}
                        >
                          Desde el almacén
                        </Boton>
                      )}
                    </div>
                  ),
                }
              : { sinAccionPorque: 'La carta la monta quien lleva el local.' })}
          />
        </Tarjeta>
      ) : vista === 'todos-los-platos' ? (
        <TodosLosPlatos datos={datos} conPrecio={conPrecio} alAbrir={plato.abrir} />
      ) : (
        <PorSecciones
          datos={datos}
          conPrecio={conPrecio}
          alAbrir={plato.abrir}
          alAnadir={setAnadiendo}
          alEditarSeccion={setSeccionEnHoja}
        />
      )}

      {anadiendo !== undefined && (
        <AnadirPlatos
          secciones={datos.secciones}
          seccionInicial={anadiendo}
          alCerrar={() => {
            setAnadiendo(undefined);
          }}
        />
      )}
      {desdeElAlmacen && (
        <DesdeElAlmacen
          carta={datos}
          seccionInicial={null}
          alCerrar={() => {
            setDesdeElAlmacen(false);
          }}
        />
      )}
      {seccionEnHoja !== null && (
        <HojaDeSeccion
          seccion={seccionEnHoja}
          secciones={datos.secciones}
          platos={activos.filter((p) => p.seccionId === seccionEnHoja.id).length}
          alCerrar={() => {
            setSeccionEnHoja(null);
          }}
        />
      )}
      {plato.abierto !== null && (
        <FichaDelPlato
          key={plato.abierto}
          platoId={plato.abierto}
          carta={datos}
          alCerrar={plato.cerrar}
        />
      )}
    </div>
  );
}

// ── Una fila de plato ────────────────────────────────────────────────────────

function fila(
  plato: UnPlato,
  conPrecio: readonly UnCanal[],
  alAbrir: (id: string) => void,
  detalle: string | null,
): ElementoDeLista {
  const otros = conPrecio.flatMap((canal) => {
    const suyo = plato.precios[canal.canal];
    return suyo === undefined ? [] : [`${canal.nombre} ${comoDinero(suyo)}`];
  });
  // El de otro canal va delante del detalle y no a la derecha: a la derecha, en el
  // móvil, le quitaba sitio al nombre («Croquetas de j…», 15-oct).
  const texto = [
    ...(plato.unidadesPorRacion === null ? [] : [`${String(plato.unidadesPorRacion)} ud`]),
    ...otros,
    ...(detalle === null ? [] : [detalle]),
  ].join(' · ');
  const alergenos = losAlergenosDe(plato);
  const conIconos =
    alergenos.length > 0 ||
    plato.picante > 0 ||
    plato.distintivos.length > 0 ||
    plato.vinculadoA !== null;
  // Los alérgenos y el picante, con su dibujo (0087): se ven antes de leer.
  const debajo = conIconos ? (
    <span className="flex min-w-0 items-center gap-e2">
      {plato.vinculadoA !== null && (
        <IconoVincular
          size={14}
          className="shrink-0"
          titulo={`Vinculado a ${plato.vinculadoA.nombre}${plato.vinculadoA.racion === null ? '' : ` · ${plato.vinculadoA.racion}`}`}
        />
      )}
      <LosAlergenos
        alergenos={alergenos}
        picante={plato.picante}
        distintivos={plato.distintivos}
        lado={18}
        enUnaLinea
      />
      {texto !== '' && <span className="min-w-0 truncate">{texto}</span>}
    </span>
  ) : (
    texto
  );
  return {
    clave: plato.id,
    delante: (
      <FotoDeProducto nombre={plato.nombre} categoria={null} enlace={plato.miniatura} lado={40} />
    ),
    titulo: plato.nombre,
    ...(debajo === '' ? {} : { detalle: debajo }),
    derecha: (
      <span className="shrink-0 text-cuerpo font-semibold tabular-nums">
        {plato.precioCentimos === null ? 'Sin precio' : comoDinero(plato.precioCentimos)}
      </span>
    ),
    alPulsar: () => {
      alAbrir(plato.id);
    },
  };
}

// ── Por secciones ────────────────────────────────────────────────────────────

function PorSecciones({
  datos,
  conPrecio,
  alAbrir,
  alAnadir,
  alEditarSeccion,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
  readonly alAnadir: (seccionId: string | null) => void;
  readonly alEditarSeccion: (seccion: { id: string | null; nombre: string }) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [ordenando, setOrdenando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const activos = datos.platos.filter((p) => p.activo);
  const sinSeccion = activos.filter((p) => p.seccionId === null);

  async function moverPlato(
    seccionId: string | null,
    lista: readonly UnPlato[],
    indice: number,
    salto: -1 | 1,
  ) {
    const ids = lista.map((p) => p.id);
    const otro = indice + salto;
    if (otro < 0 || otro >= ids.length) return;
    [ids[indice], ids[otro]] = [ids[otro] as string, ids[indice] as string];
    const respuesta = await cliente.ejecutar('ordenar_platos', {
      seccion_id: seccionId,
      platos: ids,
    });
    if (!respuesta.ok) setError(respuesta.error);
    await refrescar();
  }

  const grupos = [
    ...datos.secciones.map((s) => ({ id: s.id, nombre: s.nombre })),
    ...(sinSeccion.length > 0 ? [{ id: null, nombre: 'Sin sección' }] : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      {grupos.map((grupo) => {
        const suyos = activos
          .filter((p) => p.seccionId === grupo.id)
          .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
        const clave = grupo.id ?? 'sin';
        const enOrden = ordenando === clave;
        return (
          <Tarjeta
            key={clave}
            titulo={grupo.nombre}
            cuantos={suyos.length}
            acento="var(--color-app-carta)"
            {...(datos.puedeEditar
              ? {
                  accion: (
                    <div className="flex items-center gap-e1">
                      {grupo.id !== null && (
                        <Boton
                          tono="texto"
                          tamano="s"
                          aria-label={`Cambiar la sección ${grupo.nombre}`}
                          onClick={() => {
                            alEditarSeccion({ id: grupo.id, nombre: grupo.nombre });
                          }}
                        >
                          <IconoEditar size={16} />
                        </Boton>
                      )}
                      {suyos.length > 1 && (
                        <Boton
                          tono="texto"
                          tamano="s"
                          onClick={() => {
                            setOrdenando(enOrden ? null : clave);
                          }}
                        >
                          {enOrden ? 'Listo' : 'Ordenar'}
                        </Boton>
                      )}
                    </div>
                  ),
                }
              : {})}
          >
            {enOrden ? (
              <ol aria-label={`Orden de ${grupo.nombre}`} className="flex flex-col">
                {suyos.map((plato, i) => (
                  <li
                    key={plato.id}
                    className="flex min-h-toque items-center gap-e2 border-b border-borde px-e3 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-cuerpo">{plato.nombre}</span>
                    <Boton
                      tono="texto"
                      tamano="s"
                      aria-label={`Subir ${plato.nombre}`}
                      disabled={i === 0}
                      onClick={() => {
                        void moverPlato(grupo.id, suyos, i, -1);
                      }}
                    >
                      <IconoFlechaArriba size={16} />
                    </Boton>
                    <Boton
                      tono="texto"
                      tamano="s"
                      aria-label={`Bajar ${plato.nombre}`}
                      disabled={i === suyos.length - 1}
                      onClick={() => {
                        void moverPlato(grupo.id, suyos, i, 1);
                      }}
                    >
                      <IconoFlechaAbajo size={16} />
                    </Boton>
                  </li>
                ))}
              </ol>
            ) : (
              <Lista
                titulo={grupo.nombre}
                elementos={suyos.map((p) => fila(p, conPrecio, alAbrir, p.descripcion))}
                cuandoNoHay={
                  <p className="px-e3 py-e2 text-secundario text-texto-suave">
                    Sin platos todavía.
                  </p>
                }
              />
            )}
            {datos.puedeEditar && !enOrden && (
              <div className="px-e3 pt-e2">
                <Boton
                  tono="texto"
                  icono={<IconoAnadir size={16} />}
                  onClick={() => {
                    alAnadir(grupo.id);
                  }}
                >
                  Añadir aquí
                </Boton>
              </div>
            )}
          </Tarjeta>
        );
      })}
      <Archivados datos={datos} conPrecio={conPrecio} alAbrir={alAbrir} />
    </div>
  );
}

// ── Todos los platos ─────────────────────────────────────────────────────────

function TodosLosPlatos({
  datos,
  conPrecio,
  alAbrir,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
}) {
  const [buscado, setBuscado] = useState('');
  const nombreDeLaSeccion = useMemo(
    () => new Map(datos.secciones.map((s) => [s.id, s.nombre])),
    [datos.secciones],
  );
  const texto = buscado.trim().toLocaleLowerCase('es');
  const sinAcentos = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '');
  const activos = datos.platos
    .filter((p) => p.activo)
    .filter(
      (p) =>
        texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(sinAcentos(texto)),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta titulo="Todos los platos" cuantos={datos.platos.filter((p) => p.activo).length}>
        <div className="px-e3 pb-e3">
          <Campo
            etiqueta="Buscar un plato"
            value={buscado}
            onChange={(evento) => {
              setBuscado(evento.target.value);
            }}
          />
        </div>
        <Lista
          titulo="Todos los platos"
          elementos={activos.map((p) =>
            fila(
              p,
              conPrecio,
              alAbrir,
              p.seccionId === null ? 'Sin sección' : (nombreDeLaSeccion.get(p.seccionId) ?? null),
            ),
          )}
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
      </Tarjeta>
      <Archivados datos={datos} conPrecio={conPrecio} alAbrir={alAbrir} />
    </div>
  );
}

/** Lo archivado, plegado al final: no sale en la carta y se recupera desde su ficha. */
function Archivados({
  datos,
  conPrecio,
  alAbrir,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
}) {
  const archivados = datos.platos.filter((p) => !p.activo);
  if (archivados.length === 0) return null;
  return (
    <details className="rounded-grande border border-borde bg-superficie">
      <summary className="flex min-h-toque cursor-pointer items-center px-e4 text-secundario font-semibold text-texto-suave">
        Archivados ({archivados.length})
      </summary>
      <Lista
        titulo="Archivados"
        elementos={archivados.map((p) => fila(p, conPrecio, alAbrir, 'No sale en la carta'))}
        cuandoNoHay={null}
      />
    </details>
  );
}

// ── Añadir platos de golpe ───────────────────────────────────────────────────

interface FilaNueva {
  readonly nombre: string;
  readonly precio: number | null;
}

const VACIA: FilaNueva = { nombre: '', precio: null };

function AnadirPlatos({
  secciones,
  seccionInicial,
  alCerrar,
}: {
  readonly secciones: MiCarta['secciones'];
  readonly seccionInicial: string | null;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [seccion, setSeccion] = useState<string>(seccionInicial ?? '');
  const [filas, setFilas] = useState<readonly FilaNueva[]>([VACIA, VACIA, VACIA]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [yaEstaban, setYaEstaban] = useState<readonly string[]>([]);

  const llenas = filas.filter((f) => f.nombre.trim() !== '');

  function cambiar(indice: number, nueva: FilaNueva) {
    setFilas((antes) => {
      const despues = antes.map((f, i) => (i === indice ? nueva : f));
      // Siempre queda una fila libre al final: se sigue escribiendo sin buscar botones.
      const ultima = despues[despues.length - 1];
      return ultima !== undefined && ultima.nombre.trim() !== '' && despues.length < 60
        ? [...despues, VACIA]
        : despues;
    });
  }

  async function anadir() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ yaEstaban: string[] }>('crear_platos', {
      seccion_id: seccion === '' ? null : seccion,
      platos: llenas.map((f) => ({ nombre: f.nombre.trim(), precio_centimos: f.precio })),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    if (respuesta.datos.yaEstaban.length > 0) {
      setYaEstaban(respuesta.datos.yaEstaban);
      setFilas([VACIA, VACIA, VACIA]);
      return;
    }
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Añadir platos"
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            {yaEstaban.length > 0 ? 'Cerrar' : 'Cancelar'}
          </Boton>
          <Boton
            tono="principal"
            disabled={llenas.length === 0}
            cargando={guardando}
            textoCargando="Añadiendo"
            onClick={() => {
              void anadir();
            }}
          >
            {llenas.length <= 1 ? 'Añadir el plato' : `Añadir ${llenas.length} platos`}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {yaEstaban.length > 0 && (
          <Aviso tono="info" titulo="Lo demás ya está en tu carta">
            {yaEstaban.join(', ')}: ya {yaEstaban.length === 1 ? 'estaba' : 'estaban'}, y no se
            {yaEstaban.length === 1 ? ' ha repetido' : ' han repetido'}.
          </Aviso>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Selector
          etiqueta="Sección"
          opciones={[
            { valor: '', texto: 'Sin sección' },
            ...secciones.map((s) => ({ valor: s.id, texto: s.nombre })),
          ]}
          value={seccion}
          onChange={(evento) => {
            setSeccion(evento.target.value);
          }}
        />
        <ol className="flex flex-col gap-e2" aria-label="Los platos que se añaden">
          {filas.map((f, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-e2">
              <Campo
                etiqueta={`Plato ${String(i + 1)}`}
                value={f.nombre}
                maxLength={120}
                onChange={(evento) => {
                  cambiar(i, { ...f, nombre: evento.target.value });
                }}
              />
              <CampoMoneda
                etiqueta="Precio"
                valor={f.precio === null ? null : centimos(f.precio)}
                alCambiar={(valor) => {
                  cambiar(i, { ...f, precio: valor === null ? null : Number(valor) });
                }}
              />
            </li>
          ))}
        </ol>
        <p className="text-secundario text-texto-suave">
          El precio, con IVA, como en tu carta de papel. Lo demás, en la ficha de cada plato.
        </p>
      </div>
    </Hoja>
  );
}

// ── Crear, cambiar o quitar una sección ──────────────────────────────────────

function HojaDeSeccion({
  seccion,
  secciones,
  platos,
  alCerrar,
}: {
  readonly seccion: { readonly id: string | null; readonly nombre: string };
  readonly secciones: MiCarta['secciones'];
  readonly platos: number;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [nombre, setNombre] = useState(seccion.nombre);
  const [trabajando, setTrabajando] = useState<'guardando' | 'quitando' | null>(null);
  const [quitar, setQuitar] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const nueva = seccion.id === null;
  const donde = secciones.findIndex((s) => s.id === seccion.id);

  async function mover(salto: -1 | 1) {
    const ids = secciones.map((s) => s.id);
    const otra = donde + salto;
    if (donde < 0 || otra < 0 || otra >= ids.length) return;
    [ids[donde], ids[otra]] = [ids[otra] as string, ids[donde] as string];
    const respuesta = await cliente.ejecutar('ordenar_secciones', { secciones: ids });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  async function guardar() {
    setTrabajando('guardando');
    const respuesta = nueva
      ? await cliente.ejecutar('crear_seccion', { nombre: nombre.trim() })
      : await cliente.ejecutar('cambiar_seccion', {
          seccion_id: seccion.id,
          nombre: nombre.trim(),
        });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  async function quitarla() {
    setTrabajando('quitando');
    const respuesta = await cliente.ejecutar('quitar_seccion', { seccion_id: seccion.id });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={nueva ? 'Nueva sección' : seccion.nombre}
      pie={
        quitar ? (
          <Botones>
            <Boton
              tono="secundario"
              onClick={() => {
                setQuitar(false);
              }}
            >
              No, dejarla
            </Boton>
            <Boton
              tono="peligro"
              cargando={trabajando === 'quitando'}
              textoCargando="Quitando"
              onClick={() => {
                void quitarla();
              }}
            >
              Quitar la sección
            </Boton>
          </Botones>
        ) : (
          <Botones>
            {!nueva && (
              <Boton
                tono="texto"
                icono={<IconoBorrar size={16} />}
                onClick={() => {
                  setQuitar(true);
                }}
              >
                Quitar
              </Boton>
            )}
            <Boton
              tono="principal"
              disabled={nombre.trim() === ''}
              cargando={trabajando === 'guardando'}
              textoCargando="Guardando"
              onClick={() => {
                void guardar();
              }}
            >
              {nueva ? 'Crear la sección' : 'Guardar'}
            </Boton>
          </Botones>
        )
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {quitar ? (
          <p className="text-cuerpo">
            {platos === 0
              ? 'No tiene platos: se quita y ya está.'
              : platos === 1
                ? 'Su plato pasa a «Sin sección». No se borra.'
                : `Sus ${String(platos)} platos pasan a «Sin sección». No se borra ninguno.`}
          </p>
        ) : (
          <>
            <Campo
              etiqueta="Nombre de la sección"
              value={nombre}
              maxLength={80}
              onChange={(evento) => {
                setNombre(evento.target.value);
              }}
            />
            {!nueva && secciones.length > 1 && (
              <div className="flex flex-wrap items-center gap-e2">
                <span className="text-secundario text-texto-suave">
                  En la carta va la {String(donde + 1)}.ª de {String(secciones.length)}
                </span>
                <Boton
                  tono="secundario"
                  tamano="s"
                  icono={<IconoFlechaArriba size={16} />}
                  disabled={donde <= 0}
                  onClick={() => {
                    void mover(-1);
                  }}
                >
                  Subir
                </Boton>
                <Boton
                  tono="secundario"
                  tamano="s"
                  icono={<IconoFlechaAbajo size={16} />}
                  disabled={donde >= secciones.length - 1}
                  onClick={() => {
                    void mover(1);
                  }}
                >
                  Bajar
                </Boton>
              </div>
            )}
          </>
        )}
      </div>
    </Hoja>
  );
}
