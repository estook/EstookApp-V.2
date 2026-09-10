import { useLocation } from 'react-router-dom';
import { appPorId, destinoPorId } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El contexto de Fogón en la ventana: dónde estás, y con quién.
 *
 * ── Lo que había, y por qué se ha quitado la mitad ──────────────────────────
 *
 * Este gancho pedía además `inventario_hoy` al abrir la ventana y pintaba sus
 * cifras debajo —«PRODUCTOS DE ALTA · 2»—, **en todas las pantallas**, también en
 * Ajustes o en Equipo, donde no pintaban nada. Era una consulta por apertura para
 * enseñar un número que nadie había pedido. Se va entero.
 *
 * Lo que queda es lo que la ventana sí necesita para decir una frase: dónde estás.
 *
 * ── Y lo que verá el modelo cuando hable ────────────────────────────────────
 *
 * **No sale de aquí.** El contexto que recibirá Fogón lo arma el servidor, en la
 * misma transacción que responde y con las políticas aplicadas (decisión 0023):
 * armarlo en el navegador fue lo que un día le habría dado cifras de otro local.
 */
export interface ContextoDeFogon {
  /** Dónde estás, en cristiano: «Inventario · Productos». */
  readonly donde: string;
  /** El identificador de la app, para elegir qué acciones ofrecer. */
  readonly app: string;
  readonly local: string;
  readonly quien: string;
}

export function usarContextoDeFogon(): ContextoDeFogon {
  const { pathname } = useLocation();
  const { yo } = usarSesion();

  const [, idDeLaApp = '', idDelDestino = ''] = pathname.split('/');
  const app = appPorId(idDeLaApp);
  const destino = app === undefined ? undefined : destinoPorId(app, idDelDestino);

  const donde =
    app === undefined
      ? idDeLaApp === 'ajustes'
        ? 'Ajustes'
        : idDeLaApp === 'cadena'
          ? 'la vista de la cadena'
          : 'el Panel'
      : destino === undefined
        ? app.nombre
        : `${app.nombre} · ${destino.nombre}`;

  return {
    donde,
    app: idDeLaApp,
    local: yo?.local?.nombre ?? yo?.organizacion?.nombre ?? '',
    quien: yo?.nombre ?? '',
  };
}
