import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Aviso,
  Boton,
  Etiqueta,
  Hoja,
  Rejilla,
  acentoDelWidget,
  appDelWidget,
  appPorPermiso,
  elCatalogoParaAnadir,
  usarSinNadaDentro,
  widgetPorId,
} from '@estook/ui';
import { IconoAnadir, IconoRejilla } from '@estook/iconos';
import { puedeVer, type Permiso } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { TarjetasDelPanel } from '../pantallas/TarjetasDelPanel.tsx';
import { CabeceraDelPanel } from './Cabecera.tsx';
import { LoQueFalta } from './LoQueFalta.tsx';
import { LoDeHoy } from './LoDeHoy.tsx';
import { Tablon } from './Tablon.tsx';
import { EscribirEnElTablon } from './EscribirEnElTablon.tsx';
import { Widget } from './widgets.tsx';
import { usarMiPanel } from '../ganchos/usarMiPanel.ts';
import { EstookEnTuMovil } from '../sinConexion/EstookEnTuMovil.tsx';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { ApuntarMerma } from '../almacen/ApuntarMerma.tsx';
import { InvitacionAlRecorrido } from '../recorrido/ElRecorrido.tsx';
import { PuestaEnMarcha } from './PuestaEnMarcha.tsx';

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
  const [apuntandoMerma, setApuntandoMerma] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [zonaDeAtencion, sinNadaQueAtender] = usarSinNadaDentro<HTMLElement>();

  const tienePermiso = (permiso: Permiso) => puedeVer(permisos, permiso);

  // Se llega aquí desde una pantalla que no está entre sus apps (`PantallaDeApp`).
  const donde = useLocation();
  const navegar = useNavigate();
  const vieneSinAcceso =
    (donde.state as { readonly sinAcceso?: boolean } | null)?.sinAcceso === true;

  // «Apuntar una merma», desde las acciones rápidas, el buscador o Fogón. Se abre
  // en el Panel porque el Panel lo tiene todo el mundo, y quien más mermas apunta
  // —el camarero que rompe una copa— no tiene la app de Almacén.
  usarQueHacer('merma', () => {
    setApuntandoMerma(true);
  });

  // Escribir en el Tablón, desde el «+», el buscador o la propia tarjeta (0049).
  usarQueHacer('tablon', () => {
    setEscribiendo(true);
  });

  return (
    <div className="flex flex-col gap-e4">
      <CabeceraDelPanel />

      {vieneSinAcceso && (
        <Aviso
          tono="info"
          titulo="Esa pantalla no está entre tus apps"
          alCerrar={() => {
            navegar('.', { replace: true, state: null });
          }}
        >
          Si la necesitas, pídesela a quien lleva el local.
        </Aviso>
      )}

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
        // `grid-cols-1` y no nada: sin él la columna crece con la línea más larga que
        // no se parte, y «3 productos sin precio» se salía por la derecha (25-sep).
        // Y sin nada dentro no ocupa: cada envoltorio vacío se esconde, y la zona
        // entera también, que si no dejaba sus huecos encima del Panel. La zona la
        // esconde la página y no `:has()`, que en el iPhone no se enteraba de que
        // «Hoy» había llegado (repaso del 25-sep, `usarSinNadaDentro`).
        ref={zonaDeAtencion}
        hidden={sinNadaQueAtender}
        className="grid grid-cols-1 items-start gap-e3 lg:grid-cols-2"
      >
        {/* El recorrido de la primera vez (0084): se ofrece arriba, una vez por cuenta. */}
        <div className="empty:hidden lg:col-span-2">
          <InvitacionAlRecorrido />
        </div>
        {/* Y a su lado, lo que le falta a un local nuevo para arrancar (0085). */}
        <div className="empty:hidden lg:col-span-2">
          <PuestaEnMarcha />
        </div>
        {/* Lo de hoy, ordenado por el servidor (entrega O, mejora 8), de lado a lado. */}
        <div className="empty:hidden lg:col-span-2">
          <LoDeHoy />
        </div>
        {/* El Tablón del local, debajo de «Hoy» y de lado a lado (repaso del 25-sep). */}
        <div className="empty:hidden lg:col-span-2">
          <Tablon
            alEscribir={() => {
              setEscribiendo(true);
            }}
          />
        </div>
        {/* Estook en tu móvil (0070): instalarla y sus avisos, una vez cada cosa. */}
        <div className="empty:hidden lg:col-span-2">
          <EstookEnTuMovil />
        </div>
        <TarjetasDelPanel />
        {/* Lo que falta es una línea, y va de lado a lado. */}
        <div className="empty:hidden lg:col-span-2">
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

      {/*
        Los widgets se pintan **desde el primer momento** (0085), con lo último de este
        aparato, para que pidan lo suyo en la misma petición que todo lo demás. Hasta
        que llega lo guardado, se mira pero no se edita: se movería algo que todavía
        no se sabe dónde está.
      */}
      <Rejilla
        puestos={mio.puestos}
        editando={editando}
        guardando={mio.guardando}
        alEditar={(sigue) => {
          if (mio.cargando) return;
          setEditando(sigue);
          // «Listo» quiere decir guarda: no se deja esperando al reloj de los
          // ochocientos milisegundos.
          if (!sigue) mio.guardarYa();
        }}
        alReordenar={mio.reordenar}
        alSoltar={mio.guardarYa}
        alQuitar={mio.quitar}
        alCambiarTamano={mio.cambiarTamano}
        // Un solo tamaño por widget (0083): no hay nada que elegir al editar.
        tamanosDe={(id) => [widgetPorId(id)?.tamano ?? 'ancho']}
        nombreDe={(id) => widgetPorId(id)?.nombre ?? id}
        alAnadir={() => {
          if (!mio.cargando) setAnadiendo(true);
        }}
        pintar={(puesto) => <Widget id={puesto.id} tamano={puesto.tamano} editando={editando} />}
      />

      {editando && (
        <div className="flex flex-wrap items-center gap-e2">
          <Boton tono="texto" onClick={mio.volverAlDeFabrica}>
            Volver al de mi puesto
          </Boton>
          <p className="text-secundario text-texto-suave">
            Se guarda solo, y vale en todos tus aparatos de este tipo.
          </p>
        </div>
      )}

      {/* Solo abierta: una hoja cerrada dentro de la zona de atención la llenaría. */}
      {escribiendo && (
        <EscribirEnElTablon
          alCerrar={() => {
            setEscribiendo(false);
          }}
        />
      )}
      <ApuntarMerma
        abierta={apuntandoMerma}
        alCerrar={() => {
          setApuntandoMerma(false);
        }}
      />

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
        alQuitar={mio.quitar}
        alVolverAlDeMiPuesto={() => {
          mio.volverAlDeFabrica();
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
 * ── Todos, y los que ya están lo dicen (M7, repaso) ─────────────────────────
 *
 * «Valor de la cámara, acciones rápidas, bajo mínimo, caduca esta semana: salen
 *  de fábrica, pero al dar a añadir no aparecen. ¿Si las borras las pierdes para
 *  siempre?» El catálogo enseñaba **solo lo que no estaba puesto**, así que los
 *  de todos los días no salían nunca y quitar uno parecía perderlo. Ahora salen
 *  todos, por grupos y con el color de su app: los puestos con «En tu panel» y su
 *  «Quitar», y los demás con su «+». Y abajo, recuperar el de siempre.
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
  alQuitar,
  alVolverAlDeMiPuesto,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly puestos: readonly { readonly id: string }[];
  readonly tienePermiso: (permiso: Permiso) => boolean;
  readonly alAnadir: (id: string) => void;
  readonly alQuitar: (id: string) => void;
  readonly alVolverAlDeMiPuesto: () => void;
}) {
  const grupos = elCatalogoParaAnadir(
    puestos.map((p) => ({ id: p.id, tamano: 'ancho' as const })),
    tienePermiso,
  );

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Añadir al panel">
      <div className="flex flex-col gap-e5 pt-e3">
        {grupos.map((grupo) => (
          <section key={grupo.grupo} aria-label={grupo.nombre}>
            <p className="text-etiqueta font-semibold text-texto-tenue">{grupo.nombre}</p>
            <ul className="mt-e2 grid gap-e2 sm:grid-cols-2">
              {grupo.widgets.map(({ widget, puesto }) => {
                const acento = acentoDelWidget(widget.id) ?? 'var(--color-naranja)';
                const deLaApp = appDelWidget(widget.id);
                const Icono = deLaApp === undefined ? undefined : appPorPermiso(deLaApp)?.icono;
                const icono = (
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-medio text-white"
                    style={{
                      background: `linear-gradient(140deg, color-mix(in srgb, ${acento} 92%, white), color-mix(in srgb, ${acento} 70%, black))`,
                    }}
                  >
                    {Icono === undefined ? <IconoRejilla size={16} /> : <Icono size={16} />}
                  </span>
                );
                return (
                  <li key={widget.id}>
                    {puesto ? (
                      <div className="flex min-h-[64px] items-center gap-e3 rounded-grande border border-borde bg-fondo/60 p-e3">
                        {icono}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-e2">
                            <span className="text-cuerpo font-semibold">{widget.nombre}</span>
                            <Etiqueta tono="bien">En tu panel</Etiqueta>
                          </span>
                          <span className="block text-secundario text-texto-suave">
                            {widget.queEnsena}
                          </span>
                        </span>
                        <Boton
                          tono="texto"
                          onClick={() => {
                            alQuitar(widget.id);
                          }}
                        >
                          Quitar
                        </Boton>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          alAnadir(widget.id);
                        }}
                        className="flex h-full min-h-[64px] w-full items-center gap-e3 rounded-grande border border-borde bg-superficie p-e3 text-left transition-[border-color,box-shadow] duration-[--rapido] hover:border-borde-fuerte hover:[box-shadow:var(--sombra-tarjeta)]"
                      >
                        {icono}
                        <span className="min-w-0 flex-1">
                          <span className="block text-cuerpo font-semibold">{widget.nombre}</span>
                          <span className="block text-secundario text-texto-suave">
                            {widget.queEnsena}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-naranja">
                          <IconoAnadir size={18} />
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Nada se pierde: el de fábrica vuelve entero con un toque. */}
        <div className="flex flex-wrap items-center gap-e2 border-t border-borde pt-e3">
          <Boton tono="texto" onClick={alVolverAlDeMiPuesto}>
            Volver al de mi puesto
          </Boton>
          <p className="text-secundario text-texto-suave">Vuelven los que traía de fábrica.</p>
        </div>
      </div>
    </Hoja>
  );
}
