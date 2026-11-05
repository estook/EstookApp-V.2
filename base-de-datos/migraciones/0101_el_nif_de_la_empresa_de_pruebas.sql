-- 0101 · T6 · 1 · El NIF de la empresa de pruebas es siempre la empresa de pruebas (0128, 5-nov)
--
-- **El agujero.** La empresa de pruebas de Verifacti (BILBABIT SL, NIF B75777847) la pone el
-- admin (0099, `poner_la_empresa_de_pruebas`), y con ella no se pregunta dónde tributa ni se firma
-- nada (0100). Pero el paso 1 dejaba escribir su NIF como si fuera la empresa del cliente, y así
-- nacía una empresa «normal» con el NIF de otra sociedad: se preguntaba dónde tributa y **se pedía
-- firmar su autorización**, en nombre de una empresa que no es nuestra. Es lo que le pasó a Richi
-- en IKATZ el 5-nov.
--
--   1. La que ya exista así **pasa a ser la empresa de pruebas** de su organización: sin firma,
--      con su autorización y su error borrados (siguen en la auditoría). Si esa organización ya
--      tenía la de pruebas, sus locales pasan a ella.
--   2. **Desde ahora la base no deja guardar ese NIF** en una empresa que no sea la de pruebas, lo
--      intente quien lo intente. El servidor ya lo dice antes, en el paso 1.

-- ═══ 1 · La que ya existe, a la de pruebas ═════════════════════════════════════

-- Los locales de una organización que ya tenía la de pruebas, a ella.
update estook.local l
   set empresa_id = pruebas.id
  from estook.empresa mal, estook.empresa pruebas
 where l.empresa_id = mal.id
   and mal.nif = 'B75777847' and not mal.de_pruebas
   and pruebas.organizacion_id = mal.organizacion_id and pruebas.de_pruebas;

-- Las demás, convertidas. Como la pone el admin: VERI*FACTU, ni SII ni foral, y sin firma.
update estook.empresa e
   set de_pruebas = true,
       en_sii = false,
       foral = 'no',
       modalidad = 'verifactu',
       en_verifacti_en = coalesce(e.en_verifacti_en, now()),
       autorizacion = 'sin_empezar',
       autorizacion_forma = null,
       autorizacion_firmante = null,
       autorizacion_por = null,
       autorizacion_empezada_en = null,
       autorizacion_caduca_en = null,
       autorizacion_correcta_en = null,
       autorizacion_error = null,
       cambiada_en = now()
 where e.nif = 'B75777847'
   and not e.de_pruebas
   and e.entorno = 'pruebas'
   and not exists (
     select 1 from estook.empresa o where o.organizacion_id = e.organizacion_id and o.de_pruebas
   );

-- Y queda en la auditoría de cada local que la usa, solo de la convertida ahora (en una migración,
-- `now()` es la misma hora para todo): sin persona, que lo hizo la migración.
select estook.apuntar_lo_del_alta(l.id, 'pasar_a_de_pruebas', 'empresa', e.id, null)
  from estook.local l join estook.empresa e on e.id = l.empresa_id
 where e.nif = 'B75777847' and e.de_pruebas and e.cambiada_en = now();

-- ═══ 2 · Desde ahora, ese NIF solo en la de pruebas ════════════════════════════

create function estook.el_nif_de_pruebas_solo_en_la_de_pruebas()
returns trigger
language plpgsql
as $$
begin
  if new.nif = 'B75777847' and not new.de_pruebas then
    raise exception 'empresa_de_pruebas' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function estook.el_nif_de_pruebas_solo_en_la_de_pruebas() is
  'B75777847 es la empresa de pruebas de Verifacti (BILBABIT SL): solo la pone el admin, y no se firma (0128).';

create trigger empresa_el_nif_de_pruebas
  before insert or update of nif, de_pruebas on estook.empresa
  for each row execute function estook.el_nif_de_pruebas_solo_en_la_de_pruebas();
