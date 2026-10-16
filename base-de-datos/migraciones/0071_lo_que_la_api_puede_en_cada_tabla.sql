-- 0071 · Lo que la API puede hacer en cada tabla, y ni un permiso más (decisión 0089)
--
-- La 0006 dejó puesto que toda tabla nueva de `estook` naciera con leer, añadir, cambiar
-- y borrar para `estook_api` (`alter default privileges`). Un `grant` más corto en la
-- migración de cada tabla **no quita** nada: suma (lección 189). La 0070 lo arregló para
-- las fichas; aquí se arregla para todas las demás. No se toca ni una fila.
--
-- La seguridad por filas sigue siendo la primera barrera. Esto es la segunda: aunque una
-- política se escriba mal, la API no puede borrar un fichaje ni cambiar una reacción.
--
-- ── 1 · El defecto: lo que no se escribe, no se da ────────────────────────────
--
-- Toda tabla que se cree desde hoy nace sin nada para la API, como ya pasaba en
-- `plataforma`. Su migración dice lo que puede hacer, y la prueba de los permisos
-- (los-permisos-de-la-api) se pone en rojo si no lo dice o si tiene otra cosa.
-- Las secuencias siguen como estaban: usarlas no cambia datos de nadie.

alter default privileges in schema estook
  revoke select, insert, update, delete on tables from estook_api;

-- ── 2 · Las que escribieron un `grant` corto, y tenían los cuatro ─────────────
--
-- Se quita todo y se da justo lo que escribió su migración. Antes se miró el servidor:
-- nadie cambia ni borra en ellas, ni con `on conflict do update` ni con `for update`
-- (que piden el permiso de cambiar).

revoke all on
  estook.albaran, estook.alergeno, estook.canal, estook.canal_de_venta_del_local,
  estook.cifrado_usado, estook.clave_del_terminal, estook.confirmacion_del_mensaje,
  estook.correccion_de_fichaje, estook.cuando_suena, estook.existencias,
  estook.factura_de_compra, estook.fichaje, estook.identidad_externa,
  estook.invitacion_a_pedido, estook.justificacion, estook.lectura_del_canal,
  estook.linea_de_albaran, estook.linea_de_receta_de_referencia, estook.mensaje,
  estook.miembro_del_canal, estook.movimiento_que_cuenta, estook.nota_del_tablon,
  estook.nota_en_google, estook.nota_leida, estook.objetivo_de_partida, estook.pausa,
  estook.pedido_de_compra, estook.plato, estook.precio_pactado, estook.preferencia_de_aviso,
  estook.preferencias_de_persona, estook.producto_de_referencia, estook.reaccion_al_mensaje,
  estook.receta_de_referencia, estook.regla_fiscal, estook.semana_de_horario,
  estook.tema_al_segundo, estook.terminal, estook.turno_publicado, estook.uso_de_google
from estook_api;

-- Solo se leen: el catálogo de serie, las vistas y lo que escribe una función con
-- privilegio (la identidad de Google).
grant select on
  estook.alergeno, estook.existencias, estook.identidad_externa,
  estook.linea_de_receta_de_referencia, estook.movimiento_que_cuenta,
  estook.objetivo_de_partida, estook.producto_de_referencia, estook.receta_de_referencia
to estook_api;

-- Se leen y se añaden, y no se cambian: es lo que pasó.
grant select, insert on
  estook.clave_del_terminal, estook.correccion_de_fichaje, estook.nota_leida,
  estook.tema_al_segundo
to estook_api;

-- Se leen, se añaden y se quitan, pero no se cambian: estar o no estar.
grant select, insert, delete on
  estook.cifrado_usado, estook.justificacion, estook.miembro_del_canal,
  estook.reaccion_al_mensaje, estook.turno_publicado
to estook_api;

-- Se leen, se añaden y se cambian, pero no se borran: se archivan, se anulan o se cierran.
grant select, insert, update on
  estook.albaran, estook.canal, estook.canal_de_venta_del_local,
  estook.confirmacion_del_mensaje, estook.cuando_suena, estook.factura_de_compra,
  estook.fichaje, estook.invitacion_a_pedido, estook.lectura_del_canal,
  estook.linea_de_albaran, estook.mensaje, estook.nota_del_tablon, estook.nota_en_google,
  estook.pausa, estook.pedido_de_compra, estook.plato, estook.precio_pactado,
  estook.preferencia_de_aviso, estook.preferencias_de_persona, estook.regla_fiscal,
  estook.semana_de_horario, estook.terminal, estook.uso_de_google
to estook_api;

-- ── 3 · Las que no escribieron nada, y vivían del defecto ─────────────────────
--
-- Catorce tablas de la 0007 a la 0061 nunca dijeron lo que la API podía hacer. Se les
-- da lo que el servidor hace con ellas, que se miró una a una, y nada más.

revoke all on
  estook.categoria_de_partida, estook.categoria_de_producto, estook.concepto_de_caja,
  estook.dispositivo, estook.foto_de_merma, estook.inventario, estook.linea_de_inventario,
  estook.lote, estook.politica_de_catalogo, estook.precio_de_producto, estook.producto,
  estook.proveedor, estook.salida_de_lote, estook.traduccion
from estook_api;

-- Las categorías de serie, las traducciones y la política del catálogo no las escribe
-- la API; los dispositivos, solo `reconocer_dispositivo`, que va con privilegio.
grant select on
  estook.categoria_de_partida, estook.dispositivo, estook.politica_de_catalogo,
  estook.traduccion
to estook_api;

-- La foto de una merma y la salida de un lote se apuntan y ya no se tocan.
grant select, insert on estook.foto_de_merma, estook.salida_de_lote to estook_api;

-- Los precios, los lotes y el recuento: se cambian, nunca se borran.
grant select, insert, update on
  estook.categoria_de_producto, estook.inventario, estook.linea_de_inventario,
  estook.lote, estook.precio_de_producto, estook.proveedor
to estook_api;

-- El producto se borra en un solo caso: «Quitar los ejemplos» (0020) se lleva el de
-- mentira, y sus precios, lotes y movimientos se van con él por su clave ajena. Los
-- conceptos de caja se guardan con `on conflict do update` y se pueden quitar.
grant select, insert, update, delete on estook.producto, estook.concepto_de_caja to estook_api;

-- ── 4 · Lo que se apunta como ejemplo, la API tiene que poder borrarlo ────────
--
-- `quitar_ejemplos` borra con los permisos de quien pulsa el botón (sin privilegio, a
-- propósito). Si un módulo apuntara un ejemplo en una tabla que la API no puede
-- borrar, el botón fallaría entero el día que alguien lo pulse. Se comprueba al
-- apuntar, como ya se comprobaba que la tabla existe: es la función de la 0020 entera,
-- con una pregunta más.

create or replace function estook.tabla_de_ejemplo_existe()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'estook'
       and table_name = new.tabla
       and column_name = 'id'
  ) then
    raise exception 'estook.% no existe o no tiene columna id, asi que no se podria borrar', new.tabla
      using errcode = '23514';
  end if;
  if not has_table_privilege('estook_api', format('estook.%I', new.tabla), 'DELETE') then
    raise exception 'la API no puede borrar en estook.%, asi que Quitar los ejemplos fallaria', new.tabla
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Y los que ya estaban apuntados, igual: si alguno quedara en una tabla sin borrar,
-- la migración se para aquí y no se cambia nada.
do $$
declare
  sin_borrar text;
begin
  select string_agg(distinct d.tabla, ', ') into sin_borrar
    from estook.dato_de_ejemplo d
   where not has_table_privilege('estook_api', format('estook.%I', d.tabla), 'DELETE');
  if sin_borrar is not null then
    raise exception 'Hay ejemplos apuntados en tablas que la API no podra borrar: %', sin_borrar;
  end if;
end;
$$;
