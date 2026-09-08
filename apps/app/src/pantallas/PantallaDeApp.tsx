import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { appsVisibles } from '@estook/permisos';
import {
  MenuLateral,
  Migas,
  Tarjeta,
  TodaviaNo,
  Vistas,
  appPorId,
  clases,
  comoSeLlamaElModulo,
  destinoPorId,
  rutaDe,
  type App,
  type Destino,
  type Vista,
} from '@estook/ui';
import { QuienTieneAcceso } from './QuienTieneAcceso.tsx';
import { Inventario } from '../inventario/Inventario.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La pantalla de una app · Parte B5 del Plan.
 *
 * ── Lo que esta pantalla era, y por que estaba mal ───────────────────────────
 *
 * Era **una sola pantalla para las ocho**: cabecera, migas y una fila de
 * pastillas, y lo unico que cambiaba de una app a otra era el color del icono.
 * El Manifiesto promete lo contrario —«cada app se siente una app, con su icono,
 * su acento, su navegacion, su buscador, su historial y sus pendientes»— y con un
 * unico molde eso no puede pasar: un calendario no es una lista con otro acento.
 *
 * Ahora hay tres cosas que cambian de verdad entre apps:
 *
 *   · **La forma** (`app.forma`), que decide el ancho y la rejilla. Un calendario
 *     va a todo lo ancho porque su rejilla **es** el contenido; una lista va
 *     acotada porque una fila de 1.400 px no se sigue con la vista; un cuaderno
 *     va en una columna estrecha porque se lee y se escribe.
 *   · **Los destinos**, que son sitios que contestan una pregunta, con su menu
 *     lateral propio en escritorio —lo que B5 mandaba desde M3 y no se habia
 *     construido— y la barra de abajo en movil.
 *   · **Las vistas**, que son la misma pantalla mirada de otra forma y van en un
 *     control segmentado arriba.
 *
 * ── Y lo que sigue siendo de verdad aqui ─────────────────────────────────────
 *
 * Que una app que el rol **no tiene** no se abre ni escribiendo su direccion a
 * mano. Esconder el boton no protege nada (principio 7): la comprobacion esta
 * aqui ademas de en la rueda, y las politicas de M1 la respaldan por debajo.
 */
export function PantallaDeApp() {
  const { app: idDeLaApp, destino: idDelDestino, vista: idDeLaVista } = useParams();
  const navegar = useNavigate();
  const { permisos } = usarSesion();

  const app = idDeLaApp === undefined ? undefined : appPorId(idDeLaApp);

  // Ni existe, ni la tiene: la misma respuesta para las dos cosas, igual que
  // hace `un_local` en el servidor. Decir «existe pero no es tuya» seria contar
  // algo que no hace falta contar.
  const laTiene = app !== undefined && appsVisibles(permisos).includes(app.permiso);
  if (!laTiene) return <Navigate to="/" replace />;

  const destino = idDelDestino === undefined ? undefined : destinoPorId(app, idDelDestino);

  /*
    Sin destino en la direccion, o con uno que no existe, se manda a donde entra
    la app: su **primer destino construido**. Antes esto caia en la primera
    pestana del catalogo, que en Inventario era «Hoy» por suerte y en cualquier
    app futura podia ser una pestana vacia.
  */
  if (destino === undefined) return <Navigate to={rutaDe(app)} replace />;

  const vista =
    destino.vistas.length === 0
      ? undefined
      : (destino.vistas.find((v) => v.id === idDeLaVista) ?? destino.vistas[0]);

  // Un destino con vistas siempre tiene una en la direccion: asi el enlace se
  // puede copiar y compartir, y volver atras devuelve a la vista de antes.
  if (vista !== undefined && vista.id !== idDeLaVista) {
    return <Navigate to={rutaDe(app, destino, vista)} replace />;
  }

  return (
    <Dentro
      app={app}
      destino={destino}
      vista={vista}
      alVolver={() => {
        navegar('/');
      }}
      alIrADestino={(otro) => {
        navegar(rutaDe(app, otro));
      }}
      alIrAVista={(id) => {
        navegar(
          rutaDe(
            app,
            destino,
            destino.vistas.find((v) => v.id === id),
          ),
        );
      }}
    />
  );
}

/**
 * El ancho de la pantalla segun la forma de la app.
 *
 * No es decoracion: es lo que hace que la misma aplicacion se sienta ocho.
 * «Nada de scroll infinito» y «la ficha se abre sin tapar la lista» (B5) dependen
 * de que la lista no se coma los 1.400 px de un monitor.
 */
const ANCHO: Readonly<Record<App['forma'], string>> = {
  panel: 'max-w-[76rem]',
  lista: 'max-w-[76rem]',
  // El calendario **no lleva tope**: su rejilla es el contenido, y una semana
  // apretada en 76 rem con siete columnas deja las celdas sin sitio para nada.
  calendario: 'max-w-none',
  // Se lee y se escribe: una columna de medida legible, como cualquier documento.
  cuaderno: 'max-w-[48rem]',
};

function Dentro({
  app,
  destino,
  vista,
  alVolver,
  alIrADestino,
  alIrAVista,
}: {
  readonly app: App;
  readonly destino: Destino;
  readonly vista: Vista | undefined;
  readonly alVolver: () => void;
  readonly alIrADestino: (destino: Destino) => void;
  readonly alIrAVista: (id: string) => void;
}) {
  return (
    <div className={clases('flex w-full flex-col gap-e4', ANCHO[app.forma])}>
      <header className="flex flex-col gap-e2">
        {/*
          Las migas llevan **dos pasos y no tres**: Panel y la app. La vista no
          entra porque no es un sitio, y el destino ya se ve resaltado en el menu
          lateral y en la barra de abajo. Antes ponia «Panel · Inventario ·
          Productos», que dice tres veces donde estas y ninguna vez como salir.
        */}
        <Migas camino={[{ nombre: 'Panel', ir: alVolver }, { nombre: app.nombre }]} />

        <div className="flex items-start gap-e3">
          <span className="mt-[2px] shrink-0" style={{ color: app.acento }}>
            <app.icono size={28} />
          </span>
          <div className="min-w-0">
            {/*
              El titulo es **el destino**, no la app. Es donde estas de verdad, y
              es lo que hace que la pantalla de Movimientos no se llame igual que
              la de Productos. El nombre de la app va encima, pequeno, que es
              donde se lee sin robarle sitio.
            */}
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">{app.nombre}</p>
            <h1 className="text-pantalla font-semibold">{destino.nombre}</h1>
            <p className="text-secundario text-texto-suave">{destino.queContesta}</p>
          </div>
        </div>

        {vista !== undefined && (
          <div className="max-w-full lg:max-w-[36rem]">
            <Vistas
              vistas={destino.vistas}
              activa={vista.id}
              acento={app.acento}
              de={destino.nombre}
              alElegir={alIrAVista}
            />
          </div>
        )}
      </header>

      <div className="flex gap-e5">
        {/* El menu lateral de B5, que solo existe en escritorio: en movil su
            trabajo lo hace la barra de abajo. */}
        <MenuLateral app={app} destinoActivo={destino.id} alIrADestino={alIrADestino} />

        <div className="min-w-0 flex-1">
          <Contenido app={app} destino={destino} vista={vista} />
        </div>
      </div>
    </div>
  );
}

/**
 * Lo que hay dentro de cada destino.
 *
 * Lo que ya funciona de verdad, y de que modulo es cada cosa:
 *
 *   Inventario · Hoy, Productos, Movimientos, Compras     M6
 *   Equipo · Personas                                     M4 · dar acceso y quitarlo
 *
 * El resto lleva su `TodaviaNo` con **el modulo del destino**, que sale del
 * catalogo de navegacion y no de una lista escrita aparte. Antes habia una tabla
 * suelta en este fichero, y en el Panel otra, y las dos con numeros distintos: el
 * Panel decia que Negocio era M17 —que es Cuaderno— y que el TPV era M13 —que es
 * Equipo—. Un dato con dos duenos acaba con dos valores (regla 6).
 */
function Contenido({
  app,
  destino,
  vista,
}: {
  readonly app: App;
  readonly destino: Destino;
  readonly vista: Vista | undefined;
}) {
  if (app.id === 'inventario' && destino.modulo === undefined) {
    return <Inventario destino={destino.id} vista={vista?.id ?? ''} />;
  }

  if (app.id === 'equipo' && destino.id === 'personas') {
    return <QuienTieneAcceso vista={vista?.id ?? ''} />;
  }

  // Una vista que falta dentro de un destino construido: se dice **de esa
  // vista**, no de la app entera. Antes todo lo que faltaba se contaba igual, y
  // «Carta · Análisis: todavía no tengo datos» no distingue entre una app sin
  // construir y una vista suelta que llega después.
  const faltaLaVista = vista !== undefined && vista.modulo !== undefined;
  const nombre = faltaLaVista ? `${destino.nombre} · ${vista.nombre}` : destino.nombre;
  const modulo = (faltaLaVista ? vista.modulo : destino.modulo) ?? '';

  return (
    <Tarjeta acento={app.acento} titulo={nombre}>
      <TodaviaNo
        que={`${app.nombre} · ${nombre}`}
        queHabra={destino.queContesta}
        modulo={modulo === '' ? 'su módulo' : comoSeLlamaElModulo(modulo)}
      />
    </Tarjeta>
  );
}
