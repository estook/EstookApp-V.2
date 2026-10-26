/**
 * Por dónde se va en Estook TPV: la sala (`#/`), que es la entrada; una mesa (`#/mesa/<id>`),
 * fichar, los agotados y los Ajustes del TPV (`#/ajustes/...`). En el `#`,
 * como la app: el botón de atrás del móvil vuelve atrás, y una tablet que se recarga se
 * queda donde estaba (bloqueada, con su PIN delante).
 */

export function escucharLaDireccion(avisar: () => void): () => void {
  window.addEventListener('hashchange', avisar);
  return () => {
    window.removeEventListener('hashchange', avisar);
  };
}

export function laDireccion(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export function irA(direccion: string): void {
  window.location.hash = `/${direccion}`;
}

export function irALaMesa(cuentaId: string): void {
  irA(`mesa/${cuentaId}`);
}

export function irAlPlano(): void {
  irA('');
}
