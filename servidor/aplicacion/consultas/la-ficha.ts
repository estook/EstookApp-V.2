import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Abrir un documento de la ficha del trabajador (la Ampliación 3, 0153): el contrato.
 *
 * Devuelve **un enlace que caduca a los cinco minutos**, y solo si la base deja leer la
 * fila: la persona, y quien lleva los datos del equipo (las políticas de la 0127). A
 * cualquier otro, como si no existiera. El enlace no se guarda en ningún sitio: se pide
 * cada vez que alguien toca «Abrir».
 */

const LO_QUE_DURA_EL_ENLACE = 5 * 60;

export interface UnDocumentoAbierto {
  readonly enlace: string;
  readonly nombre: string;
  readonly mime: string;
}

export const abrirUnDocumentoDePersona = consulta<{ documento_id: string }, UnDocumentoAbierto>({
  nombre: 'abrir_un_documento_de_persona',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const filas = await contexto.sql<{ clave: string; nombre: string; mime: string }[]>`
      select clave, nombre, mime from estook.documento_de_persona where id = ${entrada.documento_id}
    `;
    const documento = filas[0];
    if (documento === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese documento no está, o no es de alguien cuyos documentos puedas ver.',
      });
    }
    const enlace =
      contexto.almacen === null
        ? null
        : await contexto.almacen.enlace(documento.clave, LO_QUE_DURA_EL_ENLACE);
    if (enlace === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Ahora mismo no se puede abrir. Prueba otra vez en un rato.',
      });
    }
    return { enlace, nombre: documento.nombre, mime: documento.mime };
  },
});
