/*
 * El tema del aparato, en el <html> antes de pintar nada (18-oct).
 *
 * El tema se guarda en el aparato (`estook.tema`, `usarTema`) y React lo pone al
 * arrancar; pero hasta entonces la página salía siempre clara. En un iPhone con el
 * oscuro se veía el logo sobre claro, un salto a oscuro y una franja clara abajo, en
 * la zona de la barra de inicio. Va aparte, y no dentro de la página, porque la
 * política de seguridad no deja ejecutar scripts escritos en ella (`script-src
 * 'self'`). Sin almacenamiento (navegación privada) se queda el claro, como siempre.
 */
try {
  var tema = window.localStorage.getItem('estook.tema');
  if (tema === 'claro' || tema === 'oscuro' || tema === 'sistema') {
    document.documentElement.setAttribute('data-tema', tema);
  }
} catch (e) {
  /* el claro de siempre */
}
