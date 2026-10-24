/**
 * Lo tecleado también entra por el teclado del ordenador (la caja de toda la vida): las
 * cifras, y `'borrar'` para la tecla de borrar. Se engancha mientras la pantalla está puesta.
 */
export function cifraDeLaTecla(evento: KeyboardEvent): string | null {
  if (/^[0-9]$/.test(evento.key)) return evento.key;
  if (evento.key === 'Backspace') return 'borrar';
  return null;
}
