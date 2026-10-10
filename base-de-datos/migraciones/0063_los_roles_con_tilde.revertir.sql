-- Deshace la 0063: los tres nombres vuelven a como los dejó la 0002, sin tilde.
--
-- **Lo que se pierde:** nada más que las tildes.

update estook.rol set nombre = 'Direccion o propietario' where codigo = 'direccion';
update estook.rol set nombre = 'Gestoria' where codigo = 'gestoria';
update estook.rol set nombre = 'Area manager' where codigo = 'area_manager';
