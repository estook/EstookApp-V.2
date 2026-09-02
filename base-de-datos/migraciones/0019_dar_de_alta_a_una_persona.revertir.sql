-- Reversion de 0019 · Dar de alta a una persona
--
-- Deja `estook.persona` como estaba: con lectura y con «cada uno cambia lo suyo»,
-- y sin forma de dar de alta a nadie. Es decir, con invitar roto otra vez.

drop policy if exists persona_la_edita_quien_da_acceso on estook.persona;
drop function if exists estook.dar_de_alta_persona(text, text, text);
