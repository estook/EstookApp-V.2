-- ═══════════════════════════════════════════════════════════════════════════
-- 0033 · Lo que vio Richi después de M7
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Módulo M7 (repaso). Tres cosas de la base, cada una con su razón:
--
--   1. **Un lote se quita y se congela.** «Si hay un producto caducado, poder
--      quitarlo; si no, se queda siempre y no tiene sentido.» Y «indicar en el
--      producto que está congelado, cuándo se congeló».
--   2. **El producto sabe qué IVA se paga al comprarlo**, y lo que trae cada
--      unidad cuando se compra en paquetes, latas o botellas.
--   3. **Cada local dice si apunta los precios de compra con IVA.**
--
-- Ninguna toca el libro de movimientos: quitar un lote que se ha tirado apunta
-- una merma por `apuntar`, como cualquier otra.

-- ── 1 · Los lotes ───────────────────────────────────────────────────────────
--
-- **Un lote no se borra**, igual que no se borraba en la 0023: se marca que se
-- ha quitado, cuándo, quién y cómo. Así «¿qué pasó con la burrata que caducaba
-- el martes?» tiene respuesta, y la caducidad deja de salir en «Hoy» y en el
-- Calendario.
--
--   gastado   se ha usado entero: no mueve nada, porque lo que salió ya salió
--   tirado    se ha tirado: apunta una merma de lo que se tira, con su motivo

alter table estook.lote
  add column congelado_el   date,
  add column retirado_en    timestamptz,
  add column retirado_por   uuid references estook.persona (id) on delete set null,
  add column como_se_retiro text,
  add constraint lote_como_se_retiro_conocido check (
    como_se_retiro is null or como_se_retiro in ('gastado', 'tirado')
  ),
  add constraint lote_retirado_coherente check ((retirado_en is null) = (como_se_retiro is null));

comment on column estook.lote.congelado_el is
  'Cuando se congelo. Nulo: no esta congelado. Un lote congelado sale como tal en la lista y en el Calendario.';
comment on column estook.lote.retirado_en is
  'Cuando se quito porque se gasto o se tiro. Un lote quitado no avisa de su caducidad.';
comment on column estook.lote.como_se_retiro is
  'gastado (no mueve nada) o tirado (apunto una merma por caducado).';

-- Lo que caduca y sigue vivo, que es lo que se consulta cada mañana.
create index lote_vivo_que_caduca on estook.lote (local_id, caduca_el)
  where caduca_el is not null and retirado_en is null;

-- Lo que hay en el congelador, para la vista «Congelados».
create index lote_congelado_vivo on estook.lote (producto_id)
  where congelado_el is not null and retirado_en is null;

-- ── 2 · El producto ─────────────────────────────────────────────────────────
--
-- `iva_de_compra` es **el tipo que se paga al comprarlo**, que no es el de lo
-- que se vende: la leche se compra al 4 % y el café con leche se vende al 10 %.
-- Nulo quiere decir «el de su categoría», que decide el dominio; se guarda solo
-- cuando alguien lo elige.
--
-- `contenido_por_unidad` es lo que trae cada unidad cuando el producto se cuenta
-- por unidades: un paquete de queso azul de 250 g. Sirve para decir a cuánto
-- sale el kilo, y para que M9 sepa cuántos gramos lleva un paquete.

alter table estook.producto
  add column iva_de_compra        numeric(5, 4),
  add column contenido_por_unidad numeric(12, 4),
  add column unidad_del_contenido estook.unidad_de_uso,
  add constraint producto_iva_de_compra_razonable check (
    iva_de_compra is null or (iva_de_compra >= 0 and iva_de_compra <= 0.30)
  ),
  add constraint producto_contenido_positivo check (
    contenido_por_unidad is null or contenido_por_unidad > 0
  ),
  add constraint producto_contenido_con_su_unidad check (
    (contenido_por_unidad is null) = (unidad_del_contenido is null)
  );

comment on column estook.producto.iva_de_compra is
  'El IVA que se paga al comprarlo (0,10 es un 10 %). Nulo: el de su categoria. Los precios se guardan siempre sin IVA.';
comment on column estook.producto.contenido_por_unidad is
  'Lo que trae cada unidad cuando se cuenta por unidades: 250 (g) en un paquete de queso.';

-- ── 3 · El local ────────────────────────────────────────────────────────────
--
-- **Los precios de compra se guardan siempre sin IVA**: es con lo que se
-- comparan proveedores, se concilian facturas y se calcula el coste de un plato.
-- Lo que decide esto es **cómo se escriben**: quien copia del ticket del
-- mayorista los apunta con IVA, y Estook se lo quita al guardar.
--
-- Y la fecha en que se le quitó el IVA a los precios que ya había, para no
-- quitárselo dos veces.

alter table estook.local
  add column precios_de_compra_con_iva     boolean not null default false,
  add column iva_quitado_de_los_precios_en timestamptz;

comment on column estook.local.precios_de_compra_con_iva is
  'Si en este local los precios de compra se escriben con IVA. Se guardan igual, sin el.';
comment on column estook.local.iva_quitado_de_los_precios_en is
  'Cuando se paso de con IVA a sin IVA lo que ya estaba apuntado. Una vez, no dos.';
