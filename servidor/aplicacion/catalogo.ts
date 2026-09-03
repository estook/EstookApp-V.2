import {
  exigirDobleFactor,
  ponerCorreoDeRecuperacion,
} from './comandos/ajustes-de-organizacion.ts';
import { cambiarDeContexto } from './comandos/cambiar-de-contexto.ts';
import { cambiarMiIdioma } from './comandos/cambiar-mi-idioma.ts';
import { cerrarSesion } from './comandos/cerrar-sesion.ts';
import { entrarEnDemostracion, salirDeLaDemostracion } from './comandos/demostracion.ts';
import { quitarLosEjemplos } from './comandos/ejemplos.ts';
import { retomarElAlta, saltarPaso, terminarElAlta } from './comandos/el-alta.ts';
import {
  guardarDondeEsta,
  guardarRegimenFiscal,
  guardarTipoDeLocal,
} from './comandos/ficha-del-local.ts';
import {
  confirmarImportacion,
  descartarImportacion,
  proponerImportacion,
} from './comandos/importar.ts';
import { crearLocal, responderCuantosLocales } from './comandos/locales.ts';
import { guardarColorDeMarca, ponerLogo, quitarLogo } from './comandos/marca.ts';
import { ponerObjetivos } from './comandos/objetivos.ts';
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
import { crearCategoria, ponerLosEjemplos } from './comandos/categorias.ts';
import { apuntarEntrada, apuntarSalida, ajustarStock } from './comandos/movimientos.ts';
import { ponerPrecio } from './comandos/precios.ts';
import {
  cambiarProducto,
  crearProducto,
  desactivarProducto,
  reactivarProducto,
} from './comandos/productos.ts';
import { cambiarProveedor, crearProveedor } from './comandos/proveedores.ts';
import { buscar } from './consultas/buscar.ts';
import { inventarioHoy, misProductos, misProveedores, unProducto } from './consultas/inventario.ts';
import { catalogoDeReferencia, recetasDeReferencia } from './consultas/catalogo-de-referencia.ts';
import { elAlta } from './consultas/el-alta.ts';
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
    // M5 · el alta y el catalogo de referencia.
    [elAlta.nombre]: elAlta,
    [catalogoDeReferencia.nombre]: catalogoDeReferencia,
    [recetasDeReferencia.nombre]: recetasDeReferencia,
    // M6 · el genero.
    [inventarioHoy.nombre]: inventarioHoy,
    [misProductos.nombre]: misProductos,
    [unProducto.nombre]: unProducto,
    [misProveedores.nombre]: misProveedores,
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

    // ── M5 · el alta de un local ───────────────────────────────────────────
    //
    // Los ocho pasos no son ocho comandos: son los comandos que ya existirian de
    // todas formas en Ajustes, llamados en orden. Cambiar la direccion del local
    // es lo mismo el primer dia que el ano que viene, y tener dos formas de
    // hacerlo seria tener dos duenos del mismo dato.
    [guardarTipoDeLocal.nombre]: guardarTipoDeLocal,
    [responderCuantosLocales.nombre]: responderCuantosLocales,
    [guardarDondeEsta.nombre]: guardarDondeEsta,
    [guardarColorDeMarca.nombre]: guardarColorDeMarca,
    [ponerLogo.nombre]: ponerLogo,
    [quitarLogo.nombre]: quitarLogo,
    [guardarRegimenFiscal.nombre]: guardarRegimenFiscal,
    [ponerObjetivos.nombre]: ponerObjetivos,
    [crearLocal.nombre]: crearLocal,
    // Moverse por el alta: saltar, terminar y volver a abrirla desde el Panel.
    [saltarPaso.nombre]: saltarPaso,
    [terminarElAlta.nombre]: terminarElAlta,
    [retomarElAlta.nombre]: retomarElAlta,
    // M5 · importar el equipo desde un fichero.
    [proponerImportacion.nombre]: proponerImportacion,
    [confirmarImportacion.nombre]: confirmarImportacion,
    [descartarImportacion.nombre]: descartarImportacion,
    // M5 · los datos de ejemplo y la demostracion.
    [quitarLosEjemplos.nombre]: quitarLosEjemplos,
    [entrarEnDemostracion.nombre]: entrarEnDemostracion,
    [salirDeLaDemostracion.nombre]: salirDeLaDemostracion,

    // ── M6 · inventario ───────────────────────────────────────────────────
    //
    // Ninguno se llama «crear movimiento» ni «editar existencias»: «la
    // aplicacion no pregunta *que tabla quieres modificar*, pregunta *que
    // quieres hacer*» (Evolucion 1.0, capitulo 14). Y ninguno escribe stock
    // directo: los tres de abajo apuntan en el libro (regla 8).
    [crearProducto.nombre]: crearProducto,
    [cambiarProducto.nombre]: cambiarProducto,
    [desactivarProducto.nombre]: desactivarProducto,
    [reactivarProducto.nombre]: reactivarProducto,
    // El precio exige `dato.precio_de_compra`, no `app.inventario`: un cocinero
    // lleva Inventario entera y no ve lo que cuesta el genero.
    [ponerPrecio.nombre]: ponerPrecio,
    [apuntarEntrada.nombre]: apuntarEntrada,
    [apuntarSalida.nombre]: apuntarSalida,
    [ajustarStock.nombre]: ajustarStock,
    [crearProveedor.nombre]: crearProveedor,
    [cambiarProveedor.nombre]: cambiarProveedor,
    [crearCategoria.nombre]: crearCategoria,
    [ponerLosEjemplos.nombre]: ponerLosEjemplos,
  } as Record<string, Comando<never, unknown>>,
};
