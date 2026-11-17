-- 0118 · Fuera el Cuaderno
--
-- La reorganización del 11-nov-2026 (decisión 0146, 1.4). Richi: «Cuaderno no vale para nada
-- actualmente; fuera esa app completamente: con Calendario y Tablón lo cubrimos». Estook pasa de
-- ocho apps a siete.
--
-- La app no tuvo nunca nada construido: solo su permiso, que traían puesto el camarero, el
-- cocinero, los dos jefes y, por la regla de «todo», el gerente, el area manager y la dirección.
-- Se borra del catálogo cerrado de permisos, y con él (en cascada) lo que traía cada rol. Los
-- recortes por local se borran antes, porque esa tabla no deja borrar un permiso que se use.
--
-- Lo que iba a tener queda en otro sitio: lo del turno siguiente, en el Tablón; las notas
-- personales, en el Calendario (M14); el mantenimiento de las máquinas, en el APPCC (M16b).

delete from estook.recorte_de_permiso where permiso = 'app.cuaderno';

delete from estook.permiso where codigo = 'app.cuaderno';
