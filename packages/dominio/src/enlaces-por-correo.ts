/**
 * Los enlaces que se mandan por correo para recuperar el acceso (0109).
 *
 * Desde la 0109, **la contraseña es para Estook y el PIN es para los aparatos del
 * local** (Richi, 24-oct, la A). Y lo que se olvida se recupera sin esperar a nadie:
 *
 *   · **«He olvidado mi contraseña»** (o ponerse la primera), en la puerta de Estook:
 *     llega un enlace que deja poner una nueva.
 *   · **«He olvidado mi PIN»**, en el aparato del local: llega un enlace que da un PIN
 *     nuevo para ese local, y el de antes deja de valer.
 *
 * Como Lightspeed o Toast con su web: el código corto no se manda nunca por correo
 * a ciegas, y el enlace es de un solo uso. Quien no tiene correo, se lo pide a quien
 * lleva el local, que le da uno nuevo en Equipo.
 */
export const ENLACE_POR_CORREO = {
  /** Lo que vale el de la contraseña: da tiempo a abrir el correo y escribirla. */
  minutosDeLaContrasena: 60,
  /** Lo que vale el del PIN: se pide en el local, con el aparato delante. */
  minutosDelPin: 30,
  /** Peticiones desde una dirección en una hora, se mande algo o no. */
  porHoraDesdeUnaDireccion: 10,
  /** Enlaces que le llegan a una persona en una hora: más, no se manda ninguno. */
  porHoraAUnaPersona: 3,
} as const;

export type ParaQueEsElEnlace = 'contrasena' | 'pin';
