-- Deshace la 0055: sin la vista de lo que cuenta y sin el índice de las anulaciones.
--
-- **Lo que se pierde:** nada del libro. Las líneas que anulan se quedan, con su
-- referencia; lo que deja de pasar es que lo anulado salga de las cuentas: volvería a
-- contar como vendido o gastado.

drop view if exists estook.movimiento_que_cuenta;
drop index if exists estook.movimiento_se_anula_una_vez;
