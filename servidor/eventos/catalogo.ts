/**
 * Catalogo de eventos (M2).
 *
 * Cerrado, igual que el de permisos y el de errores. Un evento que no este aqui
 * no existe, y asi no acaban apareciendo cadenas sueltas por el codigo.
 *
 * Los eventos se escriben en la **misma transaccion** que el cambio que los
 * provoca (bandeja de salida) y se publican despues. Si la transaccion se cae,
 * el evento se cae con ella: nunca hay un evento de algo que no paso, ni un
 * cambio sin su evento.
 */
export const EVENTOS = [
  'persona.idioma_cambiado',
  'membresia.creada',
  'membresia.revocada',
  'regla_fiscal.creada',
  'regla_fiscal.desactivada',
  'recalculo.pedido',
  // ── M5 · el alta de un local ─────────────────────────────────────────────
  //
  // Los cuatro salen de responder la regla 14: **quien tiene que enterarse
  // cuando esto cambie**. Se publican ya, aunque hoy no los lea nadie, porque un
  // evento que se añade despues no trae el pasado consigo.
  //
  //   local.creado          M6 le siembra sus categorias, M25 sus apps
  //   local.alta_terminado  el Panel deja de enseñar el alta y empieza a medir
  //   objetivo.cambiado     **todos** los semaforos de la aplicacion y Fogon
  //   local.ficha_cambiada  el motor fiscal, la fecha operativa y los documentos
  'local.creado',
  'local.alta_terminado',
  'objetivo.cambiado',
  'local.ficha_cambiada',
  'ejemplos.quitados',
  // ── M6 · el genero ───────────────────────────────────────────────────────
  //
  // Los cinco salen de la misma pregunta de la regla 14, y el de en medio es el
  // que mas cuelga de el:
  //
  //   producto.creado       M9 lo puede meter en una ficha, el buscador lo indexa
  //   producto.cambiado     si cambia el factor o el rendimiento, **multiplica**:
  //                         el coste de todos los platos que lo llevan se mueve
  //   producto.desactivado  las fichas que lo llevan quedan marcadas (M9)
  //   precio.cambiado       la cascada entera de la Auditoria 2.1: elaboraciones,
  //                         platos, margen, food cost, alerta y Pulse
  //   stock.ajustado        la desviacion del periodo (M8), con su causa
  //
  // **Apuntar una entrada o una salida NO publica evento**, y es a proposito: en
  // un servicio normal son decenas al dia y nadie los escucha. Lo que dispara
  // cascadas es el precio, no el movimiento (Auditoria 2.1). Cuando M8 necesite
  // los movimientos, los lee del libro, que es donde estan enteros.
  'producto.creado',
  'producto.cambiado',
  'producto.desactivado',
  'precio.cambiado',
  'stock.ajustado',
  // ── M6½ · la merma, los fichajes y el cierre de caja ─────────────────────
  //
  // Otra vez la regla 14, y otra vez con la misma disciplina: **solo se publica
  // lo que le importa a alguien más**.
  //
  //   merma.apuntada       sube el food cost del periodo (M8, M21) y, si es de
  //                        un producto caro y se repite, es un aviso de Fogón
  //   fichaje.abierto      quién está dentro ahora mismo: el Panel y el cierre
  //   fichaje.cerrado      las horas del periodo, y el coste de personal
  //   fichaje.corregido    **este sí es delicado**: alguien ha tocado el
  //                        registro horario de otra persona, y eso tiene que
  //                        quedar dicho fuera de la propia tabla
  //   caja.cerrada         la cascada de verdad: ventas del día, ticket medio,
  //                        food cost sobre ventas, Pulse y el consumo de M20
  //   local.como_cierra    el Panel deja de pedir que se elija, y M20 sabe si
  //                        tiene que ir a buscar nada al TPV
  'merma.apuntada',
  'fichaje.abierto',
  'fichaje.cerrado',
  'fichaje.corregido',
  'caja.cerrada',
  'local.como_cierra',
  // ── M7 · proveedores, compras y el Calendario ───────────────────────────
  //
  // La regla 14 otra vez, y con la misma disciplina: solo lo que le importa a
  // alguien más.
  //
  //   proveedor.creado     el Calendario pone sus días de reparto
  //   proveedor.cambiado   y los cambia, o los quita si se desactiva
  //   pedido.enviado       la entrega sale en el Calendario y en «Lo que viene»
  //   pedido.cambiado      la entrega se mueve si cambia el día
  //   pedido.recibido      la entrega se tacha; M21 mide la puntualidad
  //   pedido.cancelado     la entrega se va
  //   albaran.apuntado     **las compras**: M8 las necesita para el food cost
  //                        real, «(inicial + compras − final) ÷ ventas»
  //   factura.conciliada   el gasto por proveedor, la gestoría y, si hay
  //                        diferencia, un aviso a quien tiene que reclamarla
  //   precio.pactado       M24 compara lo pactado entre locales
  //   lote.creado          la caducidad sale en el Calendario. Es de M6, y hasta
  //                        hoy no la escuchaba nadie, así que no se publicaba
  'proveedor.creado',
  'proveedor.cambiado',
  'pedido.enviado',
  'pedido.cambiado',
  'pedido.recibido',
  'pedido.cancelado',
  'albaran.apuntado',
  'factura.conciliada',
  'precio.pactado',
  'lote.creado',
] as const;

export type TipoDeEvento = (typeof EVENTOS)[number];

export function esEvento(valor: unknown): valor is TipoDeEvento {
  return typeof valor === 'string' && (EVENTOS as readonly string[]).includes(valor);
}
