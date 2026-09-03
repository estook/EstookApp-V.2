import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { appsVisibles } from '@estook/permisos';
import { Migas, Tarjeta, TodaviaNo, appPorId, type App } from '@estook/ui';
import { QuienTieneAcceso } from './QuienTieneAcceso.tsx';
import { Inventario } from '../inventario/Inventario.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La pantalla de una app · Parte B5 del Plan.
 *
 * Una sola pantalla para las ocho, y no ocho carpetas vacias: en M3 lo que hay
 * que demostrar es que **se navega por las ocho sin un salto raro**, con su
 * barra propia, su acento y sus migas. El contenido de cada una llega con su
 * modulo, de M6 en adelante.
 *
 * Cada pestana lleva su estado «todavia no tengo datos» diciendo que ira ahi y
 * en que modulo se construye. Es lo honesto y ademas lo util: quien la abre sabe
 * que no esta rota.
 *
 * ── Lo que si es de verdad aqui ──────────────────────────────────────────────
 *
 * Que una app que el rol **no tiene** no se abre ni escribiendo su direccion a
 * mano. Esconder el boton no protege nada (principio 7): la comprobacion esta
 * aqui ademas de en la rueda, y las politicas de M1 la respaldan por debajo.
 */
/**
 * En qué módulo se construye cada una.
 *
 * Los números salen de la parte D del Plan de desarrollo y **no de la memoria**:
 * estaban mal en cinco de las ocho —Escandallos ponía M8 y es M9, Negocio ponía
 * M17 y es M21— y eso es exactamente lo que Richi encontró mirando la aplicación
 * en su móvil en M5: «un texto que no encajaba con el aparato que tenías
 * delante». Hay una prueba al lado que los cuadra con el Plan.
 */
const EN_QUE_MODULO: Readonly<Record<string, string>> = {
  inventario: 'M6 · Inventario',
  escandallos: 'M9 · Escandallos',
  carta: 'M10 · Carta, menús y análisis',
  calendario: 'M14 · Calendario',
  equipo: 'M13 · Equipo',
  servicio: 'M16 · Servicio, APPCC y trazabilidad',
  negocio: 'M21 · Negocio, analítica y Estook Pulse',
  cuaderno: 'M17 · Cuaderno',
};

export function PantallaDeApp() {
  const { app: idDeLaApp, pestana } = useParams();
  const navegar = useNavigate();
  const { permisos } = usarSesion();

  const app = idDeLaApp === undefined ? undefined : appPorId(idDeLaApp);

  // Ni existe, ni la tiene: la misma respuesta para las dos cosas, igual que
  // hace `un_local` en el servidor. Decir «existe pero no es tuya» seria contar
  // algo que no hace falta contar.
  const laTiene = app !== undefined && appsVisibles(permisos).includes(app.permiso);
  if (!laTiene) return <Navigate to="/" replace />;

  const laPestana = app.pestanas.find((p) => p.id === pestana) ??
    app.pestanas[0] ?? { id: '', nombre: app.nombre };

  return (
    <Dentro
      app={app}
      pestana={laPestana}
      alVolver={() => {
        navegar('/');
      }}
    />
  );
}

function Dentro({
  app,
  pestana,
  alVolver,
}: {
  readonly app: App;
  readonly pestana: { readonly id: string; readonly nombre: string };
  readonly alVolver: () => void;
}) {
  return (
    <div className="flex flex-col gap-e4">
      <header className="flex flex-col gap-e2">
        <Migas
          camino={[
            { nombre: 'Panel', ir: alVolver },
            { nombre: app.nombre },
            { nombre: pestana.nombre },
          ]}
        />

        <div className="flex items-center gap-e3">
          <span style={{ color: app.acento }}>
            <app.icono size={28} />
          </span>
          <div>
            <h1 className="text-pantalla font-semibold">{app.nombre}</h1>
            <p className="text-secundario text-texto-suave">{app.queHace}</p>
          </div>
        </div>

        {/* En escritorio no hay barra abajo, asi que las pestanas van aqui. */}
        <nav aria-label={`Vistas de ${app.nombre}`} className="hidden gap-e1 lg:flex">
          {app.pestanas.map((otra) => (
            <Link
              key={otra.id}
              to={`/${app.id}/${otra.id}`}
              aria-current={otra.id === pestana.id ? 'page' : undefined}
              className={[
                'inline-flex min-h-toque items-center rounded-medio px-e3 text-cuerpo',
                otra.id === pestana.id
                  ? 'bg-superficie text-texto shadow-s1'
                  : 'text-texto-suave hover:bg-superficie',
              ].join(' ')}
            >
              {otra.nombre}
            </Link>
          ))}
        </nav>
      </header>

      {/*
        Lo que ya funciona de verdad, y de qué módulo es cada cosa:

          Inventario entera        M6 · el género, sus precios y su libro
          Equipo → Personas        M4 · dar acceso, quitarlo y devolverlo

        El resto de Equipo —contratos, horas, ausencias y documentos— llega en
        M13, y esta pantalla se queda donde está.
      */}
      {app.id === 'inventario' ? (
        <Inventario pestana={pestana.id} />
      ) : app.id === 'equipo' && pestana.id === 'personas' ? (
        <QuienTieneAcceso />
      ) : (
        <Tarjeta acento={app.acento} titulo={pestana.nombre}>
          <TodaviaNo
            que={`${app.nombre} · ${pestana.nombre}`}
            queHabra={app.queHace}
            modulo={EN_QUE_MODULO[app.id] ?? 'su modulo'}
          />
        </Tarjeta>
      )}
    </div>
  );
}
