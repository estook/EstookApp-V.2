/**
 * **El logo de arranque, mientras se comprueba tu sesión** (18-oct).
 *
 * La página ya enseña el logo mientras llega el código (`index.html`). Después, hasta
 * que el servidor dice quién eres, aquí salían unas líneas grises sobre el fondo:
 * en el iPhone de Richi se veía el logo, una pantalla casi vacía y luego el Panel, y
 * parecía que la app parpadeaba. Ahora es **el mismo logo, en el mismo sitio y en el
 * tema del aparato**: usa las clases de `index.html`, que siguen en la página, así
 * que el paso de una a otra no se nota.
 */
export function ElArranque({ que }: { readonly que: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <main aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando {que}</span>
      <div className="arrancando" aria-hidden="true">
        <img className="en-claro" src={`${base}marca/estook-logo.png`} alt="" />
        <img className="en-oscuro" src={`${base}marca/estook-logo-oscuro.png`} alt="" />
      </div>
    </main>
  );
}
