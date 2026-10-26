-- Deshace la 0091: el reloj deja de saber qué locales ya tienen su revisión de noche.

drop function estook.locales_revisados_de_noche(date);
