import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Las pantallas de cada app, **aparte del paquete inicial** (las bases firmes, 0084).
 *
 * «He notado la carga de la app al abrirla más lenta» (Richi, 14-oct). Al abrir Estook
 * se descargaba el código de **todas** las pantallas —Productos, el horario, el
 * cierre de caja, la ficha de cada persona, Ajustes…— para pintar el Panel, que no
 * usa ninguna. Con la experiencia (0083) el paquete inicial llegó a 364 KB
 * comprimidos.
 *
 * Ahora al abrir se baja el esqueleto y el Panel, y **cada app se trae al entrar en
 * ella**. Para que entrar no espere:
 *
 *   · en cuanto el Panel está pintado y el navegador no tiene nada que hacer, **se
 *     precargan todas** en segundo plano (`precargarLasPantallas`). Quien abre la app
 *     y a los dos segundos toca Almacén, ya lo tiene;
 *   · y el trabajador de servicio las guarda al instalar (son trozos pequeños), así
 *     que **sin señal siguen abriendo**, como antes.
 *
 * Una pantalla se añade aquí con su `import()` y su nombre; nada más la importa de
 * golpe, o volvería al paquete inicial sin avisar.
 *
 * **Lo que se abre sin señal no va aquí**: «Mis fichajes» sigue en el paquete inicial,
 * como el aparato de fichar. Partida, al abrirla sin cobertura con la API lenta se
 * quedaba sin pintar (lo cazó la prueba de la app instalable en GitHub, 14-oct).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lo que pide `lazy`
type Pantalla = ComponentType<any>;

/** Cómo se trae cada una, para precargarlas todas juntas. */
const TRAER: (() => Promise<unknown>)[] = [];

function perezosa<C extends Pantalla>(traer: () => Promise<C>): LazyExoticComponent<C> {
  TRAER.push(traer);
  return lazy(async () => ({ default: await traer() }));
}

export const Almacen = perezosa(async () => (await import('../almacen/Almacen.tsx')).Almacen);
export const Carta = perezosa(async () => (await import('../carta/Carta.tsx')).Carta);
export const Escandallos = perezosa(
  async () => (await import('../escandallos/Escandallos.tsx')).Escandallos,
);
export const QuienTieneAcceso = perezosa(
  async () => (await import('./QuienTieneAcceso.tsx')).QuienTieneAcceso,
);
export const EquipoHoy = perezosa(async () => (await import('../equipo/EquipoHoy.tsx')).EquipoHoy);
export const ResumenDelEquipo = perezosa(
  async () => (await import('../equipo/ResumenDelEquipo.tsx')).ResumenDelEquipo,
);
export const Incidencias = perezosa(
  async () => (await import('../equipo/Incidencias.tsx')).Incidencias,
);
export const ElHorario = perezosa(async () => (await import('../horario/ElHorario.tsx')).ElHorario);
export const CierreDeCaja = perezosa(
  async () => (await import('../servicio/CierreDeCaja.tsx')).CierreDeCaja,
);
export const Ventas = perezosa(async () => (await import('../servicio/Ventas.tsx')).Ventas);
export const Delivery = perezosa(async () => (await import('../servicio/Delivery.tsx')).Delivery);
export const Informes = perezosa(async () => (await import('../negocio/Informes.tsx')).Informes);
export const Resenas = perezosa(async () => (await import('../negocio/Resenas.tsx')).Resenas);
export const Ajustes = perezosa(async () => (await import('./Ajustes.tsx')).Ajustes);
export const VistaDeCadena = perezosa(
  async () => (await import('./VistaDeCadena.tsx')).VistaDeCadena,
);

let precargadas = false;

/** Lo que se espera sin `requestIdleCallback` (Safari): el Panel ya pintado y con datos. */
const SIN_AVISO_DE_LIBRE_MS = 4000;

/**
 * Trae el código de todas las pantallas sin pintar ninguna, cuando el navegador está
 * libre. Una vez por visita; si algún trozo no llega (sin señal), no pasa nada: se
 * vuelve a pedir al entrar en esa pantalla.
 *
 * **De una en una, y en el iPhone más tarde** (18-oct). Safari no tiene
 * `requestIdleCallback`, y a los 1,5 s se pedían los treinta trozos de golpe, justo
 * cuando llegaban los datos del Panel: el móvil se ponía a leer código mientras pintaba
 * lo que Richi estaba esperando. Ahora espera a que el Panel esté pintado y trae cada
 * trozo cuando el anterior ha llegado.
 */
export function precargarLasPantallas(): void {
  if (precargadas) return;
  precargadas = true;
  const cuandoPueda =
    'requestIdleCallback' in window
      ? (hacer: () => void) => window.requestIdleCallback(hacer, { timeout: 4000 })
      : (hacer: () => void) => window.setTimeout(hacer, SIN_AVISO_DE_LIBRE_MS);
  cuandoPueda(() => {
    void (async () => {
      for (const traer of TRAER) {
        try {
          await traer();
        } catch {
          /* se volverá a pedir al abrir la pantalla */
        }
      }
    })();
  });
}
