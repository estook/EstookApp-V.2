/**
 * Los avisos que se pueden aplazar, y hasta cuándo.
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * La tarjeta «Conecta tus ventas» llevaba un «Recuérdamelo» que guardaba una
 * fecha siete días en el futuro. Sobre el papel volvía sola; en la práctica,
 * quien lo pulsaba **no volvía a verla nunca**, porque una semana después ya no
 * se acuerda de que existía, y porque «vuelve el jueves que viene» no es lo que
 * uno entiende al pulsar «recuérdamelo».
 *
 * Ahora el aplazamiento dura **lo que dura la sesión**: se olvida en cuanto
 * alguien vuelve a entrar con su contraseña, que es el momento en el que uno se
 * sienta a hacer cosas de configuración. Y como esto no es un dato del negocio
 * —es «ahora no me apetece»— se guarda en este navegador y no en el servidor.
 *
 * Sigue habiendo un tope de siete días por si alguien deja la sesión abierta un
 * mes: el aviso vuelve igual.
 */
const PREFIJO = 'estook.aplazado.';

/** Los avisos que se pueden aplazar. Uno por clave, para no pisarse. */
export type Aviso = 'tpv';

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export function estaAplazado(aviso: Aviso): boolean {
  try {
    const hasta = window.localStorage.getItem(PREFIJO + aviso);
    return hasta !== null && Number(hasta) > Date.now();
  } catch {
    // En navegación privada no se puede leer. Mejor enseñar el aviso que
    // esconderlo: lo peor que pasa es que salga una vez de más.
    return false;
  }
}

export function aplazar(aviso: Aviso): void {
  try {
    window.localStorage.setItem(PREFIJO + aviso, String(Date.now() + SIETE_DIAS));
  } catch {
    // Si no se puede guardar, se esconde solo hasta recargar. Mejor eso que no
    // poder quitarlo de la pantalla.
  }
}

/**
 * Se llama al entrar con contraseña o con PIN.
 *
 * Es lo que hace que «recuérdamelo» signifique «en este rato no», y no «nunca
 * más». Va aquí y no en la pantalla de entrar para que la lista de claves tenga
 * un solo dueño: el día que haya un segundo aviso aplazable, se olvida solo.
 */
export function olvidarLosAplazamientos(): void {
  try {
    const claves: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const clave = window.localStorage.key(i);
      if (clave !== null && clave.startsWith(PREFIJO)) claves.push(clave);
    }
    for (const clave of claves) window.localStorage.removeItem(clave);
  } catch {
    // Igual que arriba: si no se puede, el aviso sale, que es el lado seguro.
  }
}
