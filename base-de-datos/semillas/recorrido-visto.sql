-- Semilla · las personas de ejemplo ya han visto el recorrido (0084)
--
-- Se carga después de `personas.sql` (por orden alfabético), que es la que las crea.
--
-- El recorrido de la primera vez se ofrece con una tarjeta arriba del Panel hasta que
-- se ve o se salta (`preferencias_de_persona`, migración 0066). Las personas de
-- ejemplo son las de las pruebas y las de mirar la app en local: con la tarjeta
-- puesta, cada captura del Panel y cada prueba que mira «lo que necesita tu
-- atención» cambiaría por algo que no prueba. Quien entra con **una cuenta nueva**
-- sí la ve, y es lo que prueba `el-recorrido.spec.ts`.

insert into estook.preferencias_de_persona (persona_id, recorrido_visto_en)
select p.id, now()
  from estook.persona p
 where p.correo like '%@ejemplo.estook.com'
on conflict (persona_id) do update
  set recorrido_visto_en = coalesce(
    estook.preferencias_de_persona.recorrido_visto_en,
    excluded.recorrido_visto_en
  );
