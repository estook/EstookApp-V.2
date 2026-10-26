-- Deshace la 0092: se van la alergia de la mesa y lo que lleva cada plato, congelado al pedir.

drop trigger linea_de_cuenta_alergenos_conocidos on estook.linea_de_cuenta;

alter table estook.linea_de_cuenta drop column alergenos;

drop table estook.alergeno_de_la_cuenta;
