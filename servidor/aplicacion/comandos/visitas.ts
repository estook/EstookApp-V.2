import { z } from 'zod';
import { comoCodigoDeVendedor } from '@estook/dominio';
import { comando } from '../contrato.ts';
import { hoyEnMadrid } from '../pago.ts';

/**
 * Contar una visita del enlace de un vendedor (A4 · decisión 0077, 3B).
 *
 * «¿Cuánta gente abre el enlace de cada vendedor, aunque no se registre?» La portada
 * lo dice cuando alguien llega con `?ref=`, **sin sesión** —quien llega no es nadie—,
 * y la base suma uno a ese código ese día. **Solo un número**: ni quién, ni su
 * dirección, ni nada en su navegador, así que no hace falta aviso de cookies. Un
 * código que no vale no cuenta, y no se dice: la portada no espera a esto.
 *
 * **No se puede recordar**: la idempotencia se guarda por organización, y quien llega
 * no tiene ninguna. Así que un reintento de la red cuenta dos veces, igual que una
 * recarga de la página (está dicho en la 0077): es un recuento para saber si un enlace
 * funciona, no dinero. Tampoco se declara `sinRecordar`, que es para lo que da igual.
 */
export const contarLaVisita = comando<{ codigo: string }, { contada: boolean }>({
  nombre: 'contar_la_visita',
  entrada: z.object({ codigo: z.string().trim().min(1).max(40) }).strict(),
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    const codigo = comoCodigoDeVendedor(entrada.codigo);
    if (codigo === null) return { contada: false };
    const [fila] = await contexto.sql<{ contada: boolean }[]>`
      select plataforma.contar_la_visita(${codigo}, ${hoyEnMadrid(contexto.ahora)}::date) as contada
    `;
    return { contada: fila?.contada === true };
  },
});
