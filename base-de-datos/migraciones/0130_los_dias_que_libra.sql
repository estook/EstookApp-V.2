-- 0130 · La Ampliación 4 · 2 · Los laborables, con los días que libra cada uno (0153, sección 17)
--
-- En la 0129 las vacaciones en «días laborables» contaban todos los días menos el domingo, y estaba
-- mal: cada restaurante abre y descansa distinto. Richi, el 26-nov: en **naturales** cuenta todo,
-- también el día libre que cae dentro; en **laborables**, si hay horario publicado, Estook saca de
-- ahí **qué días suele librar** y lo dice («según tu horario, libras lunes y martes»); si no, se
-- deja escribir.
--
-- Cada petición guarda **con qué días libres se contó**: un horario nuevo no cambia lo que ya se
-- pidió o se aprobó, y quien aprueba ve de dónde salen los días.
--
--   libra      los días que libra, del 1 (lunes) al 7 (domingo). Nulo en naturales.
--   libra_de   de dónde salen: 'horario' (lo sacó Estook de sus semanas publicadas), 'escrito' (lo
--              dijo la persona, o quien se las puso) o 'antes' (pedidas antes de la 0130, con el
--              domingo, como se contaron entonces).

alter table estook.solicitud_de_vacaciones
  add column libra    smallint[],
  add column libra_de text;

comment on column estook.solicitud_de_vacaciones.libra is
  'En laborables, los días que libra (1 = lunes … 7 = domingo) con los que se contaron estas vacaciones. Nulo en naturales (0130).';
comment on column estook.solicitud_de_vacaciones.libra_de is
  'De dónde salen los días que libra: horario (sus semanas publicadas), escrito (lo dijo alguien) o antes (de antes de la 0130).';

-- Las ya pedidas en laborables se contaron sin el domingo: se quedan como se contaron.
update estook.solicitud_de_vacaciones s
   set libra = array[7]::smallint[], libra_de = 'antes'
  from estook.ficha_laboral f
 where f.persona_id = s.persona_id
   and f.organizacion_id = s.organizacion_id
   and f.vacaciones_en = 'laborables';

alter table estook.solicitud_de_vacaciones
  add constraint solicitud_de_vacaciones_libra check (
    libra is null
    or (cardinality(libra) between 1 and 6 and libra <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
  ),
  add constraint solicitud_de_vacaciones_libra_de check (
    (libra is null) = (libra_de is null)
    and (libra_de is null or libra_de in ('horario', 'escrito', 'antes'))
  );
