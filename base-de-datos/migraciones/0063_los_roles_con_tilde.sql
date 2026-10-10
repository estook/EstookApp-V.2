-- 0063 · Los nombres de los roles, con sus tildes (repaso del 10-oct, decisión 0082)
--
-- Richi, mirando el PDF del horario: «se ve algo raro». Una de las cosas: debajo de su
-- nombre ponía «Direccion o propietario». La 0002 escribió los nombres de los roles
-- sin tildes —como los comentarios de entonces— y son **texto que se lee**: sale en
-- el horario en papel, en Personas y en la ficha de cada uno.
--
-- Solo cambia cómo se llaman. El código de cada rol, que es lo que miran los permisos
-- y las políticas, no se toca.

update estook.rol set nombre = 'Dirección o propietario' where codigo = 'direccion';
update estook.rol set nombre = 'Gestoría' where codigo = 'gestoria';
update estook.rol set nombre = 'Área manager' where codigo = 'area_manager';
