import { z } from 'zod';
import { huellaDeToken, tokenNuevo } from '../../dominio/secretos.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * El modo demostración (M5).
 *
 * «**Modo demostración aparte**, con un restaurante ficticio entero. Se entra y
 *  se sale sin dejar rastro» (Manifiesto 8).
 *
 * ── Qué es exactamente, y qué no ─────────────────────────────────────────────
 *
 * Es una visita de **solo lectura** al restaurante de ejemplo, con su equipo, sus
 * locales y su Panel. Se entra sin cuenta y sin dar un correo, que es el punto:
 * la web pública ofrece «pruébalo» y la prueba tiene que empezar en el mismo
 * clic, no en un formulario.
 *
 * **No es la prueba de catorce días.** Esa es una cuenta de verdad con datos
 * propios, y la monta M26. Esto es un escaparate.
 *
 * ── Las tres cosas que lo hacen seguro ───────────────────────────────────────
 *
 * 1. **Solo abre un restaurante de ejemplo.** `estook.abrir_demostracion` exige
 *    que la organización, el local y la persona sean `es_ejemplo`, las tres. Si
 *    alguna vez alguien marcara mal una organización de verdad, seguirían
 *    haciendo falta las otras dos.
 * 2. **No puede escribir.** Lo para el despachador, en el mismo sitio que las
 *    tres puertas de M4. No hay comando que se le escape, ni operación nueva que
 *    nazca abierta por descuido.
 * 3. **Dura dos horas y se borra al salir.** No se cierra: se borra. Una sesión
 *    cerrada sería un rastro, y lo prometido es que no queda ninguno.
 *
 * ── Y por qué no hay que limpiar nada después ────────────────────────────────
 *
 * Porque no escribe. La otra forma de hacerlo —dejar escribir en una copia y
 * borrarla luego— necesitaría un proceso de fondo que todavía no existe, y un
 * fallo a mitad dejaría datos de mentira dentro del restaurante de ejemplo que
 * se encontraría la siguiente visita. Las visitas caducadas se barren al abrir
 * la siguiente, que es cuando hay alguien esperando de todas formas.
 */

/** Lo que dura una visita. Suficiente para verlo todo, corto para no acumular. */
const HORAS_DE_VISITA = 2;

export interface SalidaDemostracion {
  readonly token: string;
  readonly localId: string;
  readonly organizacionId: string;
}

export const entrarEnDemostracion = comando<Record<string, never>, SalidaDemostracion>({
  nombre: 'entrar_en_demostracion',
  entrada: z.object({}).strict(),
  // Como `entrar`: es, literalmente, la definición de entrar sin haber entrado.
  sinSesion: true,
  // Devuelve un token, así que no se recuerda. Ver `conSecreto` en el contrato.
  conSecreto: true,

  async ejecutar(contexto) {
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    const filas = await contexto.sql<
      { sesion_id: string; organizacion_id: string; local_id: string }[]
    >`
      select sesion_id, organizacion_id, local_id
        from estook.abrir_demostracion(${huella}, ${HORAS_DE_VISITA})
    `;

    const abierta = filas[0];

    // Sin restaurante de ejemplo no hay demostración. Pasa en una base de datos
    // donde no se hayan sembrado, y se dice en vez de dejar una pantalla en
    // blanco preguntándose qué ha hecho mal.
    if (!abierta) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ahora mismo no hay ninguna demostración montada.',
      });
    }

    return {
      token,
      localId: abierta.local_id,
      organizacionId: abierta.organizacion_id,
    };
  },
});

/**
 * Salir de la demostración.
 *
 * Se declara `enDemostracion` porque es el único comando que una visita puede
 * ejecutar: si no pudiera, no habría forma de irse sin esperar dos horas.
 */
export const salirDeLaDemostracion = comando<Record<string, never>, { salido: boolean }>({
  nombre: 'salir_de_la_demostracion',
  entrada: z.object({}).strict(),
  enDemostracion: true,
  // No hace falta segundo factor ni contraseña propia: no hay cuenta detrás.
  aunSinDobleFactor: true,
  aunConClavePorCambiar: true,

  async ejecutar(contexto) {
    if (contexto.sesion === null) throw new FalloDeAplicacion('sin_sesion');

    await contexto.sql`select estook.cerrar_demostracion(${contexto.sesion.id}::uuid)`;

    return { salido: true };
  },
});
