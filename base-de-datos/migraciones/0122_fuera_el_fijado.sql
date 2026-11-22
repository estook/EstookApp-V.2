-- 0122 · Fuera el «fijado» del botón del TPV (lección 276; decisión 0148, entrega 3).
--
-- La 0120 pasó lo «fijado en Lo más pedido» de cada botón a lo recomendado de cada plato
-- (`plato.recomendado`) y dejó la columna sin usar: entre migrar y desplegar, la API de antes todavía
-- la leía al montar la carta de la sala.
--
-- Se borra porque: la API desplegada desde la #195 (21-nov, 137 consultas y 371 comandos, comprobado
-- el 22-nov con `bd:comprobar-api`) ya no la lee, ni el servidor, ni Estook TPV, ni ninguna función de
-- la base. Lo que había en ella ya está en `plato.recomendado` desde la 0120.

alter table estook.boton_del_tpv drop column fijado;
