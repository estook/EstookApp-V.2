/**
 * El ✦ de las apps: la estrella de cuatro puntas del Plan (B5).
 *
 * Es **la marca de «todas las apps»**, y desde las bases firmes (0084) sale en los
 * dos sitios que abren la rueda: en el centro de la barra del Panel y en «Apps» de la
 * barra de cada app. Hasta el 14-oct, «Apps» llevaba el icono de la propia app (la
 * caja de Almacén, las personas de Equipo) y «Resumen», el del Panel: parecían
 * cambiados, y lo eran. Un mismo dibujo para lo mismo, en todas partes.
 *
 * No es un icono de Lucide: no hay ninguno que sea esto.
 */
export function EstrellaDeLasApps({ size = 22 }: { readonly size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2c.5 4.6 5.4 9.5 10 10-4.6.5-9.5 5.4-10 10-.5-4.6-5.4-9.5-10-10 4.6-.5 9.5-5.4 10-10Z" />
    </svg>
  );
}
