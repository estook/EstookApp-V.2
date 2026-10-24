-- Deshace la 0084: sin los enlaces por correo. Los que se mandaron dejan de valer; las
-- contraseñas y los PIN que se pusieron con ellos se quedan como están.

drop table estook.enlace_por_correo;
