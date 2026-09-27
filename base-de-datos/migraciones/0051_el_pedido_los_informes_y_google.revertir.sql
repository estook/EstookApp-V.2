-- Deshace la 0051: sin los seis avisos de R2, sin las cifras de los informes y sin
-- la evolución de la nota en Google.
--
-- **Lo que se pierde:** los avisos de esos seis tipos y lo que cada uno eligió de
-- ellos, las cifras guardadas en los avisos y la nota de cada día. La ficha de
-- Google del local se queda como estaba: guarda la última nota.

drop policy if exists uso_de_google_del_reloj on estook.uso_de_google;
drop policy if exists local_su_ficha_de_google on estook.local;
drop policy if exists local_lo_mira_el_reloj on estook.local;

drop table if exists estook.nota_en_google;

-- La función del disparador vuelve a ser la de la 0050, entera.
create or replace function estook.aviso_solo_se_lee()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if estook.es_el_sistema() then
    return new;
  end if;
  if (new.id, new.organizacion_id, new.local_id, new.persona_id, new.tipo, new.clave,
      new.titulo, new.detalle, new.ir, new.quienes, new.creado_en, new.actualizado_en,
      new.correo, new.correo_intentos, new.correo_para)
     is distinct from
     (old.id, old.organizacion_id, old.local_id, old.persona_id, old.tipo, old.clave,
      old.titulo, old.detalle, old.ir, old.quienes, old.creado_en, old.actualizado_en,
      old.correo, old.correo_intentos, old.correo_para) then
    raise exception 'De un aviso solo se marca si está leído'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke all on function estook.aviso_solo_se_lee() from public;

alter table estook.aviso
  drop constraint if exists aviso_cifras_son_una_lista,
  drop column if exists cifras;

delete from estook.aviso
 where tipo in ('pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana',
                'informe.mes', 'google.nota');
delete from estook.preferencia_de_aviso
 where tipo in ('pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana',
                'informe.mes', 'google.nota');

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota'
));
