import { useState } from 'react';
import {
  Aviso,
  Boton,
  Cargando,
  Hoja,
  Rejilla,
  clases,
  cuandoLlega,
  loQueSePuedeAnadir,
  losQueLlegan,
  widgetPorId,
} from '@estook/ui';
import { puedeVer, type PermisoDeApp } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { TarjetasDelPanel } from '../pantallas/TarjetasDelPanel.tsx';
import { CabeceraDelPanel } from './Cabecera.tsx';
import { LoQueFalta } from './LoQueFalta.tsx';
import { Widget } from './widgets.tsx';
import { usarMiPanel } from '../ganchos/usarMiPanel.ts';

/**
 * El Panel · el centro de control (Manifiesto 6, Evolución 1.0 capítulo 5).
 *
 * «No "¿cómo va todo?", sino **"¿qué necesita mi atención ahora?"**».
 *
 * ── Lo que había, y por qué se ha rehecho ────────────────────────────────────
 *
 * Seis tarjetas fijas escritas a mano, en **una columna en el móvil**, iguales para
 * las doce clases de rol y sin poder quitar ni añadir ninguna. Y de las seis:
 *
 *   · Una pintaba **«Facturado · 0,00 €»** en la tipografía más grande de la
 *     pantalla, con el TPV sin conectar. Es exactamente lo que este proyecto tenía
 *     escrito que no se hace —«poner un cero en gris sería inventarse una cifra»—,
 *     y lo tenía escrito **dos tarjetas más abajo, en el mismo fichero**.
 *   · Dos decían mal en qué módulo llega lo suyo: que el TPV era «M13», que es
 *     Equipo, y que Negocio era «M17», que es Cuaderno.
 *   · Y una era un **andamio de pruebas de M3** —«apuntar una nota de prueba»—
 *     publicado en el Panel de un negocio de verdad.
 *
 * Ahora es lo que el Manifiesto describe: una **zona de atención fija arriba** que
 * no se puede quitar, y debajo la rejilla de cada uno, con sus widgets, sus tamaños
 * y su orden, guardada en el servidor por persona y por aparato (migración 0025).
 *
 * ── Y «salud de los datos» ya no ocupa una tarjeta ───────────────────────────
 *
 * Ocupaba un widget entero para decir una cosa: cuántos productos tienen precio.
 * Ahora es **una línea** en la zona de atención, que dice qué falta y lleva ahí; y
 * quien la quiera con su cifra tiene el widget «Productos sin precio», que puede
 * poner o no poner. Un indicador que no se puede quitar y que casi siempre está en
 * verde es sitio gastado en la pantalla que más se mira.
 */
export function Panel() {
  const { permisos } = usarSesion();
  const mio = usarMiPanel();
  const [editando, setEditando] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);

  const tienePermiso = (permiso: PermisoDeApp) => puedeVer(permisos, permiso);

  return (
    <div className="flex flex-col gap-e4">
      <CabeceraDelPanel />

      {/*
        La zona de atención, arriba y sin poder quitarse.

        «Por encima de los widgets hay una zona fija de atención, que no se puede
        quitar y que se ordena sola por prioridad» (Evolución 1.0, capítulo 5).
        Aquí viven las tarjetas de M5 —terminar de configurar, conectar el TPV,
        quitar los ejemplos— y la línea de lo que le falta a Estook para funcionar
        bien, que antes era un widget entero.
      */}
      {/*
        En dos columnas desde 1024 px de ancho, que es el TPV de una cocina.

        En una sola columna, la zona de atención —conectar el TPV, el equipo,
        quitar los ejemplos— se comía **la pantalla entera** de un TPV de 768 px
        de alto, y el Panel, que es lo que se viene a mirar, empezaba por debajo
        del pliegue. Con dos columnas cabe todo y sobra sitio para dos filas de
        widgets.

        `items-start` para que una tarjeta corta no se estire hasta el alto de la
        de al lado: son avisos sueltos, no una tabla.
      */}
      <section
        aria-label="Lo que necesita tu atención"
        className="grid items-start gap-e3 lg:grid-cols-2"
      >
        <TarjetasDelPanel />
        {/* Lo que falta es una línea, y va de lado a lado. */}
        <div className="lg:col-span-2">
          <LoQueFalta />
        </div>
      </section>

      {/*
        Que un guardado que falla se vea, que es lo que no pasaba.

        La rejilla pinta el cambio al momento, así que un no del servidor se veía
        igual que un sí hasta que alguien recargaba y se encontraba el Panel de
        antes. Aquí sale la frase del servidor, con su botón, en la misma pantalla
        y en el mismo momento.
      */}
      {mio.noSeHaGuardado !== null && (
        <Aviso
          tono="mal"
          titulo={mio.noSeHaGuardado.quePasa}
          accion={
            <Boton tono="secundario" onClick={mio.reintentar}>
              Reintentar
            </Boton>
          }
        >
          {mio.noSeHaGuardado.queSePuedeHacer} Lo que has colocado se ve, pero{' '}
          <strong>todavía no está guardado</strong>: si recargas ahora, vuelve el de antes.
        </Aviso>
      )}

      {mio.loCambioOtroAparato && (
        <Aviso
          tono="atencion"
          titulo="Lo cambiaste en otro aparato"
          accion={
            <Boton tono="secundario" onClick={mio.recargar}>
              Traer el de allí
            </Boton>
          }
        >
          Este panel se ha movido desde otro sitio mientras lo tenías abierto aquí. Lo de ahora no
          se ha guardado, para no llevarse por delante lo otro.
        </Aviso>
      )}

      {mio.cargando ? (
        <div className="py-e6">
          <Cargando que="tu panel" />
        </div>
      ) : (
        <Rejilla
          puestos={mio.puestos}
          editando={editando}
          guardando={mio.guardando}
          alEditar={(sigue) => {
            setEditando(sigue);
            // «Listo» quiere decir guarda: no se deja esperando al reloj de los
            // ochocientos milisegundos.
            if (!sigue) mio.guardarYa();
          }}
          alReordenar={mio.reordenar}
          alSoltar={mio.guardarYa}
          alQuitar={mio.quitar}
          alCambiarTamano={mio.cambiarTamano}
          tamanosDe={(id) => widgetPorId(id)?.tamanos ?? ['ancho']}
          nombreDe={(id) => widgetPorId(id)?.nombre ?? id}
          alAnadir={() => {
            setAnadiendo(true);
          }}
          pintar={(puesto) => <Widget id={puesto.id} tamano={puesto.tamano} editando={editando} />}
        />
      )}

      {editando && (
        <div className="flex flex-wrap items-center gap-e2">
          <Boton tono="texto" onClick={mio.volverAlDeFabrica}>
            Volver al panel de siempre
          </Boton>
          <p className="text-secundario text-texto-suave">
            Se guarda solo, y vale en todos tus aparatos de este tipo.
          </p>
        </div>
      )}

      <AnadirWidget
        abierta={anadiendo}
        alCerrar={() => {
          setAnadiendo(false);
        }}
        puestos={mio.puestos}
        tienePermiso={tienePermiso}
        alAnadir={(id) => {
          mio.anadir(id);
          setAnadiendo(false);
          setEditando(true);
        }}
      />
    </div>
  );
}

/**
 * El catálogo de widgets, para añadir.
 *
 * ── Y lo que llega, al final y sin poder pulsarse ────────────────────────────
 *
 * Los widgets que todavía no existen salen aquí abajo, en gris y con su módulo. Es
 * información útil —saber que va a haber un widget de Pulse cambia cómo te montas
 * el Panel hoy— y no es un botón mudo, porque no se puede pulsar.
 */
function AnadirWidget({
  abierta,
  alCerrar,
  puestos,
  tienePermiso,
  alAnadir,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly puestos: readonly { readonly id: string }[];
  readonly tienePermiso: (permiso: PermisoDeApp) => boolean;
  readonly alAnadir: (id: string) => void;
}) {
  const sePuede = loQueSePuedeAnadir(
    puestos.map((p) => ({ id: p.id, tamano: 'ancho' as const })),
    tienePermiso,
  );
  const llegan = losQueLlegan(tienePermiso);

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Añadir al panel">
      <div className="flex flex-col gap-e4">
        {sePuede.length === 0 ? (
          <p className="text-cuerpo">
            Ya tienes puestos todos los que hay hoy. Los que faltan están abajo, con el módulo en el
            que llegan.
          </p>
        ) : (
          <ul className="flex flex-col gap-e1">
            {sePuede.map((widget) => (
              <li key={widget.id}>
                <button
                  type="button"
                  onClick={() => {
                    alAnadir(widget.id);
                  }}
                  className="flex w-full min-h-toque flex-col gap-e1 rounded-medio border border-borde p-e3 text-left hover:bg-fondo"
                >
                  <span className="text-cuerpo font-medium">{widget.nombre}</span>
                  <span className="text-secundario text-texto-suave">{widget.queEnsena}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {llegan.length > 0 && (
          <section>
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">Llegan después</p>
            <ul className="mt-e2 flex flex-col gap-e2">
              {llegan.map((widget) => (
                <li key={widget.id} className={clases('rounded-medio bg-fondo p-e3')}>
                  <p className="flex flex-wrap items-center gap-e2">
                    <span className="text-cuerpo text-texto-suave">{widget.nombre}</span>
                    <span className="text-etiqueta uppercase tracking-wide text-texto-tenue">
                      {cuandoLlega(widget) ?? ''}
                    </span>
                  </p>
                  <p className="text-secundario text-texto-tenue">{widget.queEnsena}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Hoja>
  );
}
