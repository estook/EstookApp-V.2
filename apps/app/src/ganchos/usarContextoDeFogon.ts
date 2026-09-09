import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appPorId, destinoPorId } from '@estook/ui';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { InventarioHoy } from '../inventario/contrato.ts';

/**
 * El contexto de Fogón: dónde estás, con quién y con qué datos.
 *
 * ── Por qué esto existe antes que Fogón ──────────────────────────────────────
 *
 * «Presente en todas las apps, **trabajando con el contexto de la pantalla**»
 * (Plan, M22). Ese contexto es lo único que hace que preguntarle a Fogón sea
 * distinto de escribirle a un chat cualquiera, y **es la parte que no tiene nada
 * que ver con la inteligencia**: es saber en qué pantalla estás, en qué local, con
 * qué permisos y qué cifras hay delante.
 *
 * Se construye ahora, con Fogón todavía sin voz, por la misma razón por la que la
 * burbuja se construyó en M6 sin que Fogón hablara (decisión 0015): **dónde vive y
 * qué sabe son decisiones de producto**, y dejarlas para M22 obliga a rehacer las
 * pantallas cuando llegue.
 *
 * ── Y por qué es un objeto y no una frase ────────────────────────────────────
 *
 * Porque tiene dos consumidores. Hoy, la ventana de Fogón, que lo enseña para que
 * se vea que sabe dónde estás. Y en M22, el modelo, que recibirá **esto y no la
 * base de datos entera**: un resumen compacto de lo que hay delante.
 *
 * Eso último es lo que hace que Fogón pueda tener un presupuesto: lo caro de un
 * modelo es lo que se le manda, y lo que se le manda de un local con trescientos
 * productos no puede ser los trescientos productos. Es un puñado de cifras ya
 * calculadas —«47 productos, 3 bajo mínimo, se agota el pollo el viernes»— que
 * caben en unas pocas líneas.
 *
 * ── Y esto NO es lo que se le mandará al modelo ──────────────────────────────
 *
 * Ojo aquí, que es lo importante de este fichero. Lo de arriba dice «en M22, el
 * modelo, que recibirá esto». **Ya no.** Este resumen se arma leyendo la caché
 * del navegador, y la caché tuvo un agujero: al cambiar de local no se vaciaba,
 * así que durante un minuto tenía las cifras del local anterior. Con Fogón mudo
 * eso era una pantalla mal pintada; con Fogón hablando habría sido una respuesta
 * segura y con datos de otro sitio, y una frase en prosa no lleva encima de dónde
 * salió el número.
 *
 * El agujero está tapado (la caché se vacía al cambiar de sitio, en
 * `sesion/Sesion.tsx`), pero la conclusión se queda: **el contexto que ve el
 * modelo lo arma el servidor**, en la misma transacción que responde y con las
 * políticas aplicadas
 * ([decisión 0023](../../../../docs/decisiones/0023-fogon-nunca-arma-su-contexto-en-el-navegador.md)).
 *
 * Esto sigue existiendo para lo que se ve en la ventana: cifras que la persona ya
 * tiene delante, en la pantalla de al lado.
 *
 * ── Y no se pide nada hasta que se abre ──────────────────────────────────────
 *
 * `abierta` gobierna la consulta. La burbuja de Fogón está en **todas** las
 * pantallas, así que preguntar las cifras al pintarla sería un viaje al servidor
 * por pantalla para llenar una ventana que casi nunca se abre.
 */
export interface ContextoDeFogon {
  /** Dónde estás, en cristiano: «Inventario · Productos». */
  readonly donde: string;
  /** El identificador de la app, para elegir qué acciones ofrecer. */
  readonly app: string;
  readonly local: string;
  readonly quien: string;
  /**
   * Las cifras que hay delante, ya calculadas por la base de datos.
   *
   * Vacío cuando no hay ninguna que contar, y **eso también es información**: es
   * lo que separa «no lo sé» de «no hay nada».
   */
  readonly cifras: readonly { readonly que: string; readonly cuanto: string }[];
  /** Si se ha podido leer lo del inventario, o si no toca. */
  readonly leyendo: boolean;
}

export function usarContextoDeFogon(abierta: boolean): ContextoDeFogon {
  const { pathname } = useLocation();
  const { cliente, permisos, yo } = usarSesion();

  const [, idDeLaApp = '', idDelDestino = ''] = pathname.split('/');
  const app = appPorId(idDeLaApp);
  const destino = app === undefined ? undefined : destinoPorId(app, idDelDestino);

  const enInventario = idDeLaApp === 'inventario' || idDeLaApp === '';
  const puedeInventario = puedeVer(permisos, 'app.inventario');

  const consulta = useQuery({
    queryKey: ['inventario_hoy'],
    enabled:
      abierta && enInventario && puedeInventario && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<InventarioHoy> => {
      const respuesta = await cliente.consultar<InventarioHoy>('inventario_hoy', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const hoy = consulta.data;
  const cifras: { que: string; cuanto: string }[] = [];

  if (hoy !== undefined) {
    cifras.push({ que: 'Productos de alta', cuanto: `${hoy.cuantosProductos}` });
    if (hoy.atencion.length > 0) {
      cifras.push({ que: 'Bajo mínimo o agotados', cuanto: `${hoy.atencion.length}` });
    }
    if (hoy.caducan.length > 0) {
      cifras.push({ que: 'Caducan esta semana', cuanto: `${hoy.caducan.length}` });
    }
    if (hoy.sinPrecio.length > 0) {
      cifras.push({ que: 'Sin precio', cuanto: `${hoy.sinPrecio.length}` });
    }
  }

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
    cifras,
    leyendo: consulta.isFetching,
  };
}
