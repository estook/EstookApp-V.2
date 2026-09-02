import {
  exigirDobleFactor,
  ponerCorreoDeRecuperacion,
} from './comandos/ajustes-de-organizacion.ts';
import { cambiarDeContexto } from './comandos/cambiar-de-contexto.ts';
import { cambiarMiIdioma } from './comandos/cambiar-mi-idioma.ts';
import { cerrarSesion } from './comandos/cerrar-sesion.ts';
import {
  activarDobleFactor,
  confirmarDobleFactor,
  quitarDobleFactor,
  superarDobleFactor,
} from './comandos/doble-factor.ts';
import { entrar } from './comandos/entrar.ts';
import { invitarPersona } from './comandos/invitar-persona.ts';
import { cambiarMiClave, ponerClaveA, regenerarPin } from './comandos/mi-acceso.ts';
import { reactivarPersona } from './comandos/reactivar-persona.ts';
import { retirarAcceso } from './comandos/retirar-acceso.ts';
import { salir } from './comandos/salir.ts';
import { buscar } from './consultas/buscar.ts';
import { miAcceso } from './consultas/mi-acceso.ts';
import { misLocales } from './consultas/mis-locales.ts';
import { misPermisos } from './consultas/mis-permisos.ts';
import { quienSoy } from './consultas/quien-soy.ts';
import { quienTieneAcceso } from './consultas/quien-tiene-acceso.ts';
import { unLocal } from './consultas/un-local.ts';
import type { Comando, Consulta } from './contrato.ts';

/**
 * Un fichero por comando y por consulta, y este catalogo que los junta.
 *
 * Anadir una operacion es anadir un fichero y una linea aqui. Ni la API ni el
 * despachador cambian nunca.
 *
 * **Y una cosa que si cambia, y hay que mirar cada vez:** las puertas de M4. Una
 * operacion nueva nace exigiendo sesion, segundo factor superado y contrasena
 * propia, porque asi lo hace el despachador si no se le dice lo contrario. Abrir
 * una de esas tres puertas es una decision, se declara en la operacion y se ve
 * aqui al lado de las demas.
 */
export const catalogo = {
  consultas: {
    [misLocales.nombre]: misLocales,
    [unLocal.nombre]: unLocal,
    // M3 · lo que necesitan el esqueleto y el buscador universal.
    [misPermisos.nombre]: misPermisos,
    [buscar.nombre]: buscar,
    // M4 · identidad y acceso.
    [quienSoy.nombre]: quienSoy,
    [miAcceso.nombre]: miAcceso,
    [quienTieneAcceso.nombre]: quienTieneAcceso,
  } as Record<string, Consulta<never, unknown>>,

  comandos: {
    [cambiarMiIdioma.nombre]: cambiarMiIdioma,
    // M4 · la sesion.
    [entrar.nombre]: entrar,
    [salir.nombre]: salir,
    [cambiarDeContexto.nombre]: cambiarDeContexto,
    [cerrarSesion.nombre]: cerrarSesion,
    // M4 · mi acceso.
    [cambiarMiClave.nombre]: cambiarMiClave,
    [regenerarPin.nombre]: regenerarPin,
    [activarDobleFactor.nombre]: activarDobleFactor,
    [confirmarDobleFactor.nombre]: confirmarDobleFactor,
    [superarDobleFactor.nombre]: superarDobleFactor,
    [quitarDobleFactor.nombre]: quitarDobleFactor,
    // M4 · quien entra y quien deja de entrar.
    [invitarPersona.nombre]: invitarPersona,
    [reactivarPersona.nombre]: reactivarPersona,
    [retirarAcceso.nombre]: retirarAcceso,
    [ponerClaveA.nombre]: ponerClaveA,
    // M4 · lo que decide la organizacion.
    [exigirDobleFactor.nombre]: exigirDobleFactor,
    [ponerCorreoDeRecuperacion.nombre]: ponerCorreoDeRecuperacion,
  } as Record<string, Comando<never, unknown>>,
};
