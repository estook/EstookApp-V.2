import { useRef, useState, type ReactNode } from 'react';
import {
  Aviso,
  Boton,
  Botones,
  ErrorEnCristiano,
  Hoja,
  Plegable,
  Tarjeta,
  clases,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { sinAcentos, type PlatoLeido } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { comoDinero } from '../almacen/contrato.ts';
import type { LaCartaLeida, MiCarta } from './contrato.ts';
import {
  NoSeHaPodidoLeer,
  PAGINAS_PARA_FOGON,
  esPdf,
  lineasDelPdf,
  paginasParaFogon,
} from './paginasDeLaCarta.ts';

/**
 * Leer tu carta (M10 · 1, decisión 0102; Plan, M10, y 0049).
 *
 * Eliges el PDF de tu carta o le haces fotos, y Estook te dice **qué cambiaría**: «4
 * platos nuevos · 2 precios distintos · 1 que ya no está». Cada cosa con su casilla; los
 * nuevos y los precios, marcados; lo que ya no está, sin marcar (puede no haberlo leído
 * bien, y quitar un plato lo decides tú). **Nada cambia hasta «Actualizar tu carta»**, y
 * se hace con los comandos de siempre, que lo dejan en el historial de cada plato.
 *
 * Un PDF con texto se lee aquí, sin IA y gratis. Una foto o un PDF escaneado los lee
 * Fogón, página a página (3 créditos cada una).
 */

type Paso =
  | { readonly como: 'elegir' }
  | { readonly como: 'leyendo'; readonly que: string }
  | { readonly como: 'propuesta'; readonly leida: LaCartaLeida; readonly conFogon: boolean }
  | { readonly como: 'hecho'; readonly frase: string };

/** Lo que se marca de la propuesta, por su clave. */
type Marcados = Readonly<Record<string, boolean>>;

const claveNuevo = (p: PlatoLeido) => `nuevo:${p.nombre}`;
const claveDePrecio = (id: string) => `precio:${id}`;
const claveDeQuitar = (id: string) => `quitar:${id}`;

export function LeerTuCarta({
  carta,
  alCerrar,
}: {
  readonly carta: MiCarta;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const elegir = useRef<HTMLInputElement>(null);
  const [paso, setPaso] = useState<Paso>({ como: 'elegir' });
  const [ficheros, setFicheros] = useState<readonly File[]>([]);
  const [marcados, setMarcados] = useState<Marcados>({});
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [problema, setProblema] = useState<string | null>(null);

  function marcarDeFabrica(leida: LaCartaLeida) {
    const inicial: Record<string, boolean> = {};
    for (const p of leida.cambia.nuevos) inicial[claveNuevo(p)] = true;
    for (const p of leida.cambia.precios) inicial[claveDePrecio(p.platoId)] = true;
    for (const p of leida.cambia.yaNoEstan) inicial[claveDeQuitar(p.platoId)] = false;
    setMarcados(inicial);
  }

  async function compararLasLineas(lineas: readonly string[], conFogon: boolean) {
    const respuesta = await cliente.ejecutar<LaCartaLeida>('leer_la_carta', {
      lineas: lineas.slice(0, 1500).map((l) => l.slice(0, 400)),
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      setPaso({ como: 'elegir' });
      return;
    }
    marcarDeFabrica(respuesta.datos);
    setPaso({ como: 'propuesta', leida: respuesta.datos, conFogon });
  }

  async function conFogon(elegidos: readonly File[]) {
    setPaso({ como: 'leyendo', que: 'Preparando las páginas' });
    const paginas = await paginasParaFogon(elegidos);
    const lineas: string[] = [];
    for (const [i, pagina] of paginas.entries()) {
      setPaso({
        como: 'leyendo',
        que: `Fogón lee la página ${String(i + 1)} de ${String(paginas.length)}`,
      });
      const respuesta = await cliente.ejecutar<{ lineas: string[] }>('leer_pagina_con_fogon', {
        foto: pagina,
        pagina: i + 1,
      });
      if (!respuesta.ok) {
        setError(respuesta.error);
        setPaso({ como: 'elegir' });
        return;
      }
      lineas.push(...respuesta.datos.lineas);
    }
    await compararLasLineas(lineas, true);
  }

  async function leer(elegidos: readonly File[]) {
    setError(null);
    setProblema(null);
    setFicheros(elegidos);
    try {
      const pdf = elegidos.length === 1 && elegidos[0] !== undefined && esPdf(elegidos[0]);
      if (pdf && elegidos[0] !== undefined) {
        setPaso({ como: 'leyendo', que: 'Leyendo el PDF' });
        const lineas = await lineasDelPdf(elegidos[0]);
        if (lineas !== null) {
          await compararLasLineas(lineas, false);
          return;
        }
      }
      // Fotos, o un PDF escaneado: Fogón.
      await conFogon(elegidos);
    } catch (fallo) {
      setProblema(
        fallo instanceof NoSeHaPodidoLeer ? fallo.message : 'No he podido leer ese fichero.',
      );
      setPaso({ como: 'elegir' });
    }
  }

  async function actualizar(leida: LaCartaLeida) {
    setError(null);
    setPaso({ como: 'leyendo', que: 'Actualizando tu carta' });
    let anadidos = 0;
    let cambiados = 0;
    let quitados = 0;

    // Los nuevos, por su sección: la que ya hay con ese nombre, o una nueva.
    const nuevos = leida.cambia.nuevos.filter((p) => marcados[claveNuevo(p)] === true);
    const porSeccion = new Map<string, PlatoLeido[]>();
    for (const p of nuevos) {
      const clave = p.seccion ?? '';
      porSeccion.set(clave, [...(porSeccion.get(clave) ?? []), p]);
    }
    for (const [nombre, suyos] of porSeccion) {
      let seccionId: string | null = null;
      if (nombre !== '') {
        const ya = carta.secciones.find((s) => sinAcentos(s.nombre) === sinAcentos(nombre));
        if (ya !== undefined) {
          seccionId = ya.id;
        } else {
          const creada = await cliente.ejecutar<{ seccionId: string }>('crear_seccion', {
            nombre: nombre.slice(0, 80),
          });
          if (!creada.ok) {
            setError(creada.error);
            break;
          }
          seccionId = creada.datos.seccionId;
        }
      }
      for (let desde = 0; desde < suyos.length; desde += 60) {
        const tanda = suyos.slice(desde, desde + 60);
        const hecho = await cliente.ejecutar<{ creados: unknown[]; recuperados: unknown[] }>(
          'crear_platos',
          {
            seccion_id: seccionId,
            platos: tanda.map((p) => ({
              nombre: p.nombre,
              precio_centimos: p.precioCentimos,
              descripcion: p.descripcion,
            })),
          },
        );
        if (!hecho.ok) {
          setError(hecho.error);
          break;
        }
        anadidos += hecho.datos.creados.length + hecho.datos.recuperados.length;
      }
    }

    for (const p of leida.cambia.precios) {
      if (marcados[claveDePrecio(p.platoId)] !== true) continue;
      const suyo = carta.platos.find((x) => x.id === p.platoId);
      if (suyo === undefined) continue;
      const hecho = await cliente.ejecutar('cambiar_plato', {
        plato_id: p.platoId,
        version: suyo.version,
        precio_centimos: p.ahora,
      });
      if (!hecho.ok) {
        setError(hecho.error);
        continue;
      }
      cambiados += 1;
    }

    for (const p of leida.cambia.yaNoEstan) {
      if (marcados[claveDeQuitar(p.platoId)] !== true) continue;
      const hecho = await cliente.ejecutar('archivar_plato', { plato_id: p.platoId });
      if (!hecho.ok) {
        setError(hecho.error);
        continue;
      }
      quitados += 1;
    }

    await refrescar();
    const partes = [
      anadidos > 0 ? `${String(anadidos)} añadidos` : null,
      cambiados > 0 ? `${String(cambiados)} precios cambiados` : null,
      quitados > 0 ? `${String(quitados)} archivados` : null,
    ].filter((p): p is string => p !== null);
    setPaso({
      como: 'hecho',
      frase: partes.length === 0 ? 'No había nada marcado.' : `Hecho: ${partes.join(', ')}.`,
    });
  }

  const cuantosMarcados = Object.values(marcados).filter(Boolean).length;
  const pie =
    paso.como === 'propuesta' ? (
      <Botones>
        <Boton tono="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton
          tono="principal"
          disabled={cuantosMarcados === 0}
          onClick={() => {
            void actualizar(paso.leida);
          }}
        >
          {cuantosMarcados === 0
            ? 'Nada marcado'
            : `Actualizar tu carta (${String(cuantosMarcados)})`}
        </Boton>
      </Botones>
    ) : paso.como === 'hecho' ? (
      <Botones>
        <Boton tono="principal" onClick={alCerrar}>
          Listo
        </Boton>
      </Botones>
    ) : null;

  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Leer tu carta" {...(pie === null ? {} : { pie })}>
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {problema !== null && (
          <Aviso tono="mal" titulo="No he podido leerla">
            {problema}
          </Aviso>
        )}

        <input
          ref={elegir}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          aria-label="El PDF o las fotos de tu carta"
          onChange={(evento) => {
            const elegidos = [...(evento.target.files ?? [])];
            evento.target.value = '';
            if (elegidos.length > 0) void leer(elegidos);
          }}
        />

        {paso.como === 'elegir' && (
          <>
            <p className="text-cuerpo">
              Elige el PDF de tu carta o hazle fotos: te digo qué platos y precios cambian, y tú
              decides.
            </p>
            <Boton
              tono="principal"
              onClick={() => {
                elegir.current?.click();
              }}
            >
              Elegir el PDF o las fotos
            </Boton>
            <p className="text-secundario text-texto-suave">
              Un PDF con texto se lee gratis. Una foto o un PDF escaneado los lee Fogón: 3 créditos
              por página, hasta {String(PAGINAS_PARA_FOGON)}.
            </p>
          </>
        )}

        {paso.como === 'leyendo' && (
          <p className="text-cuerpo text-texto-suave" role="status">
            {paso.que}…
          </p>
        )}

        {paso.como === 'hecho' && (
          <Aviso tono="bien" titulo={paso.frase}>
            Cada cambio queda en el historial del plato.
          </Aviso>
        )}

        {paso.como === 'propuesta' && (
          <Propuesta
            leida={paso.leida}
            marcados={marcados}
            alMarcar={(clave, puesto) => {
              setMarcados((antes) => ({ ...antes, [clave]: puesto }));
            }}
            {...(!paso.conFogon && ficheros.length > 0
              ? {
                  alLeerConFogon: () => {
                    void conFogon(ficheros).catch(() => {
                      setProblema('No he podido preparar las páginas para Fogón.');
                      setPaso({ como: 'elegir' });
                    });
                  },
                }
              : {})}
          />
        )}
      </div>
    </Hoja>
  );
}

function Casilla({
  clave,
  marcados,
  alMarcar,
  children,
}: {
  readonly clave: string;
  readonly marcados: Marcados;
  readonly alMarcar: (clave: string, puesto: boolean) => void;
  readonly children: ReactNode;
}) {
  const puesto = marcados[clave] === true;
  return (
    <label
      className={clases(
        'flex min-h-toque cursor-pointer items-center gap-e3 border-b border-borde px-e3 py-e2 last:border-0',
        !puesto && 'text-texto-suave',
      )}
    >
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-[var(--color-app-carta)]"
        checked={puesto}
        onChange={(evento) => {
          alMarcar(clave, evento.target.checked);
        }}
      />
      <span className="flex min-w-0 flex-1 items-center justify-between gap-e2">{children}</span>
    </label>
  );
}

function Propuesta({
  leida,
  marcados,
  alMarcar,
  alLeerConFogon,
}: {
  readonly leida: LaCartaLeida;
  readonly marcados: Marcados;
  readonly alMarcar: (clave: string, puesto: boolean) => void;
  readonly alLeerConFogon?: () => void;
}) {
  const { nuevos, precios, yaNoEstan } = leida.cambia;
  const nada = nuevos.length + precios.length + yaNoEstan.length === 0;
  return (
    <div className="flex flex-col gap-e3">
      <h3 className="text-titulo font-semibold">{leida.resumen}</h3>
      {nada && (
        <p className="text-secundario text-texto-suave">
          He leído {String(leida.leidos.length)} platos y están como en tu carta.
        </p>
      )}

      {nuevos.length > 0 && (
        <Tarjeta titulo="Nuevos" cuantos={nuevos.length} pegado>
          {nuevos.map((p) => (
            <Casilla
              key={claveNuevo(p)}
              clave={claveNuevo(p)}
              marcados={marcados}
              alMarcar={alMarcar}
            >
              <span className="min-w-0">
                <span className="block truncate text-cuerpo">{p.nombre}</span>
                {p.seccion !== null && (
                  <span className="block truncate text-etiqueta text-texto-suave">{p.seccion}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {p.precioCentimos === null ? 'Sin precio' : comoDinero(p.precioCentimos)}
              </span>
            </Casilla>
          ))}
        </Tarjeta>
      )}

      {precios.length > 0 && (
        <Tarjeta titulo="Precio distinto" cuantos={precios.length} pegado>
          {precios.map((p) => (
            <Casilla
              key={p.platoId}
              clave={claveDePrecio(p.platoId)}
              marcados={marcados}
              alMarcar={alMarcar}
            >
              <span className="min-w-0 truncate text-cuerpo">{p.nombre}</span>
              <span className="shrink-0 tabular-nums">
                {p.antes === null ? 'Sin precio' : comoDinero(p.antes)} → {comoDinero(p.ahora)}
              </span>
            </Casilla>
          ))}
        </Tarjeta>
      )}

      {yaNoEstan.length > 0 && (
        <Tarjeta titulo="No salen en la carta leída" cuantos={yaNoEstan.length} pegado>
          <p className="px-e3 pt-e2 text-secundario text-texto-suave">
            Márcalos para archivarlos: dejan de salir y se recuperan desde su ficha.
          </p>
          {yaNoEstan.map((p) => (
            <Casilla
              key={p.platoId}
              clave={claveDeQuitar(p.platoId)}
              marcados={marcados}
              alMarcar={alMarcar}
            >
              <span className="min-w-0 truncate text-cuerpo">{p.nombre}</span>
              <span className="shrink-0 text-secundario">Archivar</span>
            </Casilla>
          ))}
        </Tarjeta>
      )}

      {leida.sinEntender.length > 0 && (
        <Plegable titulo={`No he entendido ${String(leida.sinEntender.length)} líneas`}>
          <ul className="flex flex-col gap-e1 text-secundario text-texto-suave">
            {leida.sinEntender.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        </Plegable>
      )}

      {alLeerConFogon !== undefined && (
        <Boton tono="texto" onClick={alLeerConFogon}>
          ¿No se ha leído bien? Que la lea Fogón
        </Boton>
      )}
    </div>
  );
}
