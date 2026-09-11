import {
  exigirDobleFactor,
  ponerCorreoDeRecuperacion,
} from './comandos/ajustes-de-organizacion.ts';
import { cambiarDeContexto } from './comandos/cambiar-de-contexto.ts';
import { cambiarMiIdioma } from './comandos/cambiar-mi-idioma.ts';
import { guardarMiPanel } from './comandos/guardar-mi-panel.ts';
import { cerrarSesion } from './comandos/cerrar-sesion.ts';
import { entrarEnDemostracion, salirDeLaDemostracion } from './comandos/demostracion.ts';
import { quitarLosEjemplos } from './comandos/ejemplos.ts';
import {
  ocultarElRecordatorio,
  retomarElAlta,
  saltarPaso,
  terminarElAlta,
} from './comandos/el-alta.ts';
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
import { apuntarMerma } from './comandos/merma.ts';
import { corregirFichaje, ficharEntrada, ficharSalida } from './comandos/fichar.ts';
import {
  ponerDondeEstaElLocal,
  ponerHorarioHabitual,
  ponerRetribucion,
} from './comandos/equipo.ts';
import { cerrarLaCaja, elegirComoSeCierra } from './comandos/cierre.ts';
import { ponerPrecio } from './comandos/precios.ts';
import {
  cambiarProducto,
  crearProducto,
  desactivarProducto,
  reactivarProducto,
} from './comandos/productos.ts';
import { cambiarProveedor, crearProveedor } from './comandos/proveedores.ts';
import { cambiarPedido, cancelarPedido, crearPedido, enviarPedido } from './comandos/pedidos.ts';
import { devolverAlProveedor, recibirAlbaran } from './comandos/recibir.ts';
import { conciliarFactura, registrarFactura } from './comandos/facturas.ts';
import { dejarDePactar, pactarPrecio } from './comandos/pactado.ts';
import { congelar, quitarLote } from './comandos/lotes.ts';
import { guardarPreciosConIva, quitarIvaALosPrecios } from './comandos/precios-con-iva.ts';
import { comprasDeHoy, misPedidos, sugerenciaDePedido, unPedido } from './consultas/pedidos.ts';
import {
  misAlbaranes,
  misFacturas,
  paraConciliar,
  unAlbaran,
  unaFactura,
} from './consultas/albaranes.ts';
import { compararPrecios, unProveedor } from './consultas/proveedores.ts';
import { loQueViene } from './consultas/calendario.ts';
import { buscar } from './consultas/buscar.ts';
import {
  inventarioHoy,
  misMovimientos,
  misProductos,
  misProveedores,
  unProducto,
} from './consultas/inventario.ts';
import { catalogoDeReferencia, recetasDeReferencia } from './consultas/catalogo-de-referencia.ts';
import { elAlta } from './consultas/el-alta.ts';
import { miAcceso } from './consultas/mi-acceso.ts';
import { miPanel } from './consultas/mi-panel.ts';
import { mermaDeHoy, misMermas, productosParaMerma } from './consultas/merma.ts';
import { fichajesDeHoy, miFichaje, resumenDelEquipo, unaPersona } from './consultas/equipo.ts';
import { misCierres, unCierre } from './consultas/cierre.ts';
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
    // M6½ · el libro de movimientos, que se guardaba y no se podia leer entero,
    //        y el Panel que cada uno se monta.
    [misMovimientos.nombre]: misMovimientos,
    [miPanel.nombre]: miPanel,
    // M6½ · la merma, que el libro sabia guardar y no habia forma de apuntar.
    [mermaDeHoy.nombre]: mermaDeHoy,
    [misMermas.nombre]: misMermas,
    [productosParaMerma.nombre]: productosParaMerma,
    // M6½ · los fichajes y la ficha de cada persona. El permiso `accion.fichar`
    //        existia desde M1 y no habia donde fichar.
    [miFichaje.nombre]: miFichaje,
    [fichajesDeHoy.nombre]: fichajesDeHoy,
    [resumenDelEquipo.nombre]: resumenDelEquipo,
    [unaPersona.nombre]: unaPersona,
    // M6½ · lo que entra. Sin esto Estook sabia lo que cuesta el genero y no
    //        lo que se factura, que es la mitad del negocio.
    [misCierres.nombre]: misCierres,
    [unCierre.nombre]: unCierre,
    // M7 · compras: lo que se pide, lo que llega, lo que se cobra y a quién.
    [misPedidos.nombre]: misPedidos,
    [unPedido.nombre]: unPedido,
    [sugerenciaDePedido.nombre]: sugerenciaDePedido,
    [comprasDeHoy.nombre]: comprasDeHoy,
    [misAlbaranes.nombre]: misAlbaranes,
    [unAlbaran.nombre]: unAlbaran,
    [misFacturas.nombre]: misFacturas,
    [unaFactura.nombre]: unaFactura,
    [paraConciliar.nombre]: paraConciliar,
    [unProveedor.nombre]: unProveedor,
    [compararPrecios.nombre]: compararPrecios,
    // M7 · el Calendario de todos: hoy y mañana en el Panel; M14 pinta el resto.
    [loQueViene.nombre]: loQueViene,
  } as Record<string, Consulta<never, unknown>>,

  comandos: {
    [cambiarMiIdioma.nombre]: cambiarMiIdioma,
    // M6½ · como tiene cada uno montado su Panel, por aparato.
    [guardarMiPanel.nombre]: guardarMiPanel,
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
    [ocultarElRecordatorio.nombre]: ocultarElRecordatorio,
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

    // ── M6½ · la merma, los fichajes y el cierre de caja ─────────────────
    //
    // Los tres tapan el mismo tipo de agujero: un permiso que existia desde M1
    // —`accion.registrar_merma`, `accion.fichar`, `accion.conectar_tpv`— sin
    // ninguna pantalla ni ningun comando detras.
    [apuntarMerma.nombre]: apuntarMerma,
    [ficharEntrada.nombre]: ficharEntrada,
    [ficharSalida.nombre]: ficharSalida,
    [corregirFichaje.nombre]: corregirFichaje,
    // La retribucion exige `dato.coste_de_personal`, no `app.equipo`: un jefe de
    // cocina lleva a su equipo y no ve lo que cobra.
    [ponerRetribucion.nombre]: ponerRetribucion,
    [ponerHorarioHabitual.nombre]: ponerHorarioHabitual,
    [ponerDondeEstaElLocal.nombre]: ponerDondeEstaElLocal,
    [elegirComoSeCierra.nombre]: elegirComoSeCierra,
    [cerrarLaCaja.nombre]: cerrarLaCaja,

    // ── M7 · proveedores y compras ────────────────────────────────────────
    //
    // Pedir no mueve nada; **recibir es lo único que mueve género**, y lo mueve
    // por `apuntar`, como todo lo demás. La factura no mueve género: confirma el
    // precio y se concilia. Mandar un pedido pide su propio permiso,
    // `accion.enviar_pedidos`, porque compromete dinero del local.
    [crearPedido.nombre]: crearPedido,
    [cambiarPedido.nombre]: cambiarPedido,
    [enviarPedido.nombre]: enviarPedido,
    [cancelarPedido.nombre]: cancelarPedido,
    [recibirAlbaran.nombre]: recibirAlbaran,
    [devolverAlProveedor.nombre]: devolverAlProveedor,
    [registrarFactura.nombre]: registrarFactura,
    [conciliarFactura.nombre]: conciliarFactura,
    [pactarPrecio.nombre]: pactarPrecio,
    [dejarDePactar.nombre]: dejarDePactar,

    // ── M7 · lo que vio Richi ──────────────────────────────────────────────
    //
    // Quitar un lote que se gastó o se tiró —el segundo, una merma por
    // `apuntar`—, congelar, y cómo escribe cada local sus precios de compra.
    [quitarLote.nombre]: quitarLote,
    [congelar.nombre]: congelar,
    [guardarPreciosConIva.nombre]: guardarPreciosConIva,
    [quitarIvaALosPrecios.nombre]: quitarIvaALosPrecios,
  } as Record<string, Comando<never, unknown>>,
};
