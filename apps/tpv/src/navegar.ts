/**
 * Por dónde se va en la sala: el plano (`#/`) y una mesa (`#/mesa/<id>`). En el `#`,
 * como la app: el botón de atrás del móvil vuelve al plano, y una tablet que se recarga
 * se queda en la mesa.
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
