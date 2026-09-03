-- Semilla · las categorias de genero de los locales sembrados (M6)
--
-- Se carga la tercera, por orden alfabetico: despues de `cadena.sql` y de
-- `independiente.sql`, que son las que crean los locales, y antes de las demas.
--
-- ── Por que esto hace falta, que es la parte interesante ─────────────────────
--
-- Porque **las semillas crean locales metiendo filas a mano**, no llamando al
-- comando `crear_local`. Y las categorias de un local nacen cuando alguien crea
-- ese local desde la aplicacion: el comando publica `local.creado`, la reaccion
-- de M6 lo escucha y siembra (`servidor/aplicacion/reacciones.ts`).
--
-- Un `insert` directo no publica ningun evento, asi que los siete locales de
-- ejemplo se quedaban sin una sola categoria. Lo encontro la prueba de
-- inventario, y no la migracion: la migracion siembra los locales que ya
-- existian, pero en una base recien levantada **las migraciones corren antes que
-- las semillas**, asi que cuando la 0023 pasa, todavia no hay ningun local.
--
-- Es la misma leccion de E4 con una forma nueva, y por eso queda escrita aqui:
-- **una migracion que arregla lo que ya hay no arregla lo que se cree despues
-- por un camino que no es el de la aplicacion.**
--
-- ── Y por que no se siembran productos de ejemplo ────────────────────────────
--
-- Porque los productos llevan precio y llevan movimientos, y las dos cosas son
-- aritmetica: el coste por unidad de uso y el precio medio ponderado. Eso tiene
-- un unico dueno, que es `packages/dominio/src/inventario.ts`, y se siembra
-- desde el servidor (`sembrarElInventario`). Escribir esas cuentas otra vez en
-- SQL serian dos duenos del mismo calculo (regla 6).

do $$
declare
  el_local uuid;
begin
  for el_local in select id from estook.local where tipo is not null loop
    perform estook.sembrar_categorias(el_local);
  end loop;
end
$$;
