-- Deshace la 0130: las vacaciones vuelven a no guardar con qué días libres se contaron.

alter table estook.solicitud_de_vacaciones
  drop constraint solicitud_de_vacaciones_libra_de,
  drop constraint solicitud_de_vacaciones_libra,
  drop column libra_de,
  drop column libra;
