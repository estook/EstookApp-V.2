import { z } from 'zod';
import { ALCANCE_DEL_ROL, ROLES, type Rol } from '@estook/dominio';
import {
  CAMPOS_DEL_EQUIPO,
  huellaDelFichero,
  leerCsv,
  proponerMapeo,
} from '../../dominio/importar.ts';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion, respondido } from '../alta.ts';
import { ponerPinNuevo } from '../pines.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Importar (M5) · el paso 7 del alta, cuando el equipo ya está en un Excel.
 *
 * Son dos comandos, y la separación **es la característica**:
 *
 *   proponer_importacion   lee el fichero, propone el mapeo y **no escribe nada**
 *   confirmar_importacion   lo aplica, una vez que una persona lo ha mirado
 *
 * «Se sube un CSV con columnas raras → se propone el mapeo y se pide confirmar →
 *  pantalla de emparejar columnas con vista previa de 5 filas» (Auditoría,
 *  parte 5). Si fuera un solo comando, la pantalla de repaso no podría existir:
 *  para enseñar lo que va a pasar hay que haberlo calculado sin hacerlo.
 *
 * ── El destino, y por qué hoy solo hay uno ───────────────────────────────────
 *
 * `equipo`. Los albaranes por foto y los productos desde Excel necesitan
 * proveedores y productos, que son M7 y M6: importar a una tabla que no existe
 * no es un importador a medias, es nada. Añadir un destino es añadir un valor al
 * enum de la migración y un caso a `aplicar()`; el lector, el mapeo, la huella y
 * la pantalla de repaso ya están hechos y no se tocan.
 */

// ── Proponer ─────────────────────────────────────────────────────────────────

export const entradaProponer = z
  .object({
    destino: z.literal('equipo'),
    nombre_del_fichero: z.string().trim().min(1).max(200),
    /** El fichero como texto. Un CSV de plantilla no llega a unos pocos KB. */
    contenido: z.string().min(1).max(2_000_000),
  })
  .strict();

export type EntradaProponer = z.infer<typeof entradaProponer>;

export interface SalidaProponer {
  readonly importacionId: string;
  readonly columnas: readonly string[];
  readonly mapeo: readonly {
    readonly campo: string;
    readonly columna: string | null;
    readonly confianza: number;
  }[];
  readonly cuantasFilas: number;
  /** Las cinco primeras, para la vista previa que pide la Auditoría. */
  readonly muestra: readonly (readonly string[])[];
  /** `true` si este mismo fichero ya se importó. No se vuelve a aplicar. */
  readonly yaSeImporto: boolean;
  /**
   * Y **qué pasó aquella vez**, si ya se importó.
   *
   * Cierra el bucle de `importacion.resultado`, que si no sería un dato que se
   * escribe y no lee nadie. Y es lo que convierte «este fichero ya se importó»
   * en algo útil: «ya se importó, y entraron doce; una se quedó fuera porque no
   * tenía correo». Sin esto, quien lo sube por segunda vez no sabe si le faltó
   * alguien la primera.
   *
   * **Sin los PIN**, que no se guardan: se enseñan una vez y ya está.
   */
  readonly loQuePasoAquellaVez: {
    readonly entraron: number;
    readonly yaEstaban: number;
    readonly seSaltaron: number;
  } | null;
}

export const proponerImportacion = comando<EntradaProponer, SalidaProponer>({
  nombre: 'proponer_importacion',
  entrada: entradaProponer,
  // El fichero lleva dentro los datos que se van a escribir, así que se pide el
  // permiso del destino y no uno propio: quien no puede invitar tampoco puede
  // subir la lista del equipo y leerla desde la pantalla de repaso.
  exige: 'accion.invitar_personas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const leido = leerCsv(entrada.contenido);
    if (leido.columnas.length === 0 || leido.filas.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['contenido'],
        porque: 'Ese fichero no tiene ni una fila con datos. ¿Es el que querías subir?',
      });
    }

    const huella = await huellaDelFichero(entrada.contenido);

    // «Importar dos veces el mismo fichero no cambia nada» (Manifiesto 28). Se
    // dice **antes** de proponer, no al confirmar: quien lo sube por segunda vez
    // se entera en el momento, no después de repasar el mapeo entero.
    const yaEstaba = await contexto.sql<
      {
        id: string;
        resultado: { entraron: number; yaEstaban: number; seSaltaron: number } | null;
      }[]
    >`
      select id, resultado from estook.importacion
       where organizacion_id = ${organizacionId} and local_id = ${localId}
         and destino = ${entrada.destino}::estook.destino_de_importacion
         and huella = ${huella} and estado = 'confirmada'
       order by creado_en desc
       limit 1
    `;

    const mapeo = proponerMapeo(leido.columnas);

    const creadas = await contexto.sql<{ id: string }[]>`
      insert into estook.importacion (
        organizacion_id, local_id, destino, nombre_del_fichero, huella,
        columnas, mapeo, filas, creada_por
      )
      values (
        ${organizacionId}, ${localId},
        ${entrada.destino}::estook.destino_de_importacion,
        ${entrada.nombre_del_fichero}, ${huella},
        ${leido.columnas as string[]}::text[],
        ${JSON.stringify(mapeo)}::jsonb,
        ${JSON.stringify(leido.filas)}::jsonb,
        ${contexto.personaId}
      )
      returning id
    `;

    const importacionId = creadas[0]?.id;
    if (importacionId === undefined) throw new FalloDeAplicacion('sin_permiso');

    return {
      importacionId,
      columnas: leido.columnas,
      mapeo,
      cuantasFilas: leido.filas.length,
      muestra: leido.filas.slice(0, 5),
      yaSeImporto: yaEstaba.length > 0,
      loQuePasoAquellaVez: yaEstaba[0]?.resultado
        ? {
            entraron: yaEstaba[0].resultado.entraron,
            yaEstaban: yaEstaba[0].resultado.yaEstaban,
            seSaltaron: yaEstaba[0].resultado.seSaltaron,
          }
        : null,
    };
  },
});

// ── Confirmar ────────────────────────────────────────────────────────────────

export const entradaConfirmar = z
  .object({
    importacion_id: z.string().uuid(),
    /**
     * El mapeo tal y como lo dejó la persona. Puede no ser el propuesto: la
     * propuesta es una propuesta, y corregirla es el motivo de que haya pantalla.
     */
    mapeo: z.array(z.object({ campo: z.string(), columna: z.string().nullable() })).min(1),
    /** El rol de quien no traiga ninguno en su columna. */
    rol_por_defecto: z.enum(ROLES).optional(),
  })
  .strict();

export type EntradaConfirmar = z.infer<typeof entradaConfirmar>;

export interface FilaImportada {
  readonly fila: number;
  readonly correo: string;
  readonly nombre: string;
  readonly estado: 'entra' | 'ya_estaba' | 'se_salta';
  /** Por qué se salta, en cristiano. Nulo si no se salta. */
  readonly porque: string | null;
  /** El PIN, en claro y una sola vez, igual que al invitar a mano. */
  readonly pin: string | null;
}

export interface SalidaConfirmar {
  readonly entraron: number;
  readonly yaEstaban: number;
  readonly seSaltaron: number;
  readonly filas: readonly FilaImportada[];
}

export const confirmarImportacion = comando<EntradaConfirmar, SalidaConfirmar>({
  nombre: 'confirmar_importacion',
  entrada: entradaConfirmar,
  exige: 'accion.invitar_personas',
  // Devuelve los PIN en claro: no se recuerda. Ver `conSecreto` en el contrato.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const importaciones = await contexto.sql<
      {
        id: string;
        destino: string;
        estado: string;
        huella: string;
        columnas: string[];
        filas: string[][];
      }[]
    >`
      select id, destino::text as destino, estado::text as estado, huella, columnas, filas
        from estook.importacion
       where id = ${entrada.importacion_id} and local_id = ${localId}
    `;

    const importacion = importaciones[0];
    if (!importacion) throw new FalloDeAplicacion('no_existe');

    if (importacion.estado !== 'propuesta') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Esa importación ya se resolvió. Sube el fichero otra vez si hace falta.',
      });
    }

    // El índice único de la migración impediría dos confirmaciones del mismo
    // fichero, pero saltaría como un error de base de datos. Aquí se dice bien.
    const repetida = await contexto.sql<{ id: string }[]>`
      select id from estook.importacion
       where organizacion_id = ${organizacionId} and local_id = ${localId}
         and destino = ${importacion.destino}::estook.destino_de_importacion
         and huella = ${importacion.huella} and estado = 'confirmada'
    `;
    if (repetida.length > 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ese mismo fichero ya se importó, así que no se vuelve a aplicar.',
      });
    }

    const resultado = await aplicarAlEquipo(
      contexto,
      organizacionId,
      localId,
      importacion.columnas,
      importacion.filas,
      entrada.mapeo,
      entrada.rol_por_defecto ?? 'camarero',
    );

    // El resultado se guarda **sin los PIN**. Los PIN se devuelven una vez y no
    // se escriben en ningún sitio: es la misma regla que al invitar a mano, y la
    // razón de que este comando esté marcado con `conSecreto`.
    const paraGuardar = resultado.filas.map(({ pin: _pin, ...resto }) => resto);

    await contexto.sql`
      update estook.importacion
         set estado = 'confirmada',
             mapeo = ${JSON.stringify(entrada.mapeo)}::jsonb,
             resultado = ${JSON.stringify({
               entraron: resultado.entraron,
               yaEstaban: resultado.yaEstaban,
               seSaltaron: resultado.seSaltaron,
               filas: paraGuardar,
             })}::jsonb
       where id = ${importacion.id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'importar', 'equipo', ${importacion.id},
        ${localId}::uuid, null,
        ${JSON.stringify({
          entraron: resultado.entraron,
          ya_estaban: resultado.yaEstaban,
          se_saltaron: resultado.seSaltaron,
        })}::jsonb,
        null
      )
    `;

    if (resultado.entraron > 0) await respondido(contexto, localId, 'equipo');

    return resultado;
  },
});

/**
 * Aplica un mapeo confirmado sobre el equipo.
 *
 * Cada fila **se decide sola y no tumba a las demás**: una fila sin correo no
 * puede hacer que las otras treinta no entren. Se cuenta lo que pasó con cada
 * una y se devuelve entero, que es lo que la pantalla enseña después.
 */
async function aplicarAlEquipo(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  columnas: readonly string[],
  filas: readonly (readonly string[])[],
  mapeo: readonly { campo: string; columna: string | null }[],
  rolPorDefecto: Rol,
): Promise<SalidaConfirmar> {
  const donde = (campo: string): number => {
    const columna = mapeo.find((m) => m.campo === campo)?.columna;
    return columna === null || columna === undefined ? -1 : columnas.indexOf(columna);
  };

  const columnaDe = {
    nombre: donde('nombre'),
    apellidos: donde('apellidos'),
    correo: donde('correo'),
    rol: donde('rol'),
  };

  for (const campo of CAMPOS_DEL_EQUIPO) {
    if (campo.obligatorio && columnaDe[campo.campo as 'nombre' | 'correo'] === -1) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: [campo.campo],
        porque: `Hace falta decir qué columna del fichero es «${campo.campo}».`,
      });
    }
  }

  const salida: FilaImportada[] = [];
  const correosVistos = new Set<string>();

  for (const [i, fila] of filas.entries()) {
    const numero = i + 2; // +1 por la cabecera, +1 porque se cuenta desde uno.
    const correo = (fila[columnaDe.correo] ?? '').trim().toLowerCase();
    const nombre = (fila[columnaDe.nombre] ?? '').trim();

    if (correo === '' || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) {
      salida.push({
        fila: numero,
        correo,
        nombre,
        estado: 'se_salta',
        porque: 'No tiene un correo con forma de correo.',
        pin: null,
      });
      continue;
    }

    if (nombre === '') {
      salida.push({
        fila: numero,
        correo,
        nombre,
        estado: 'se_salta',
        porque: 'No tiene nombre.',
        pin: null,
      });
      continue;
    }

    // El mismo correo dos veces en el fichero es un descuido, no dos personas.
    // Entra la primera y la segunda se dice, en vez de darle dos membresías.
    if (correosVistos.has(correo)) {
      salida.push({
        fila: numero,
        correo,
        nombre,
        estado: 'se_salta',
        porque: 'Ese correo ya salía más arriba en el fichero.',
        pin: null,
      });
      continue;
    }
    correosVistos.add(correo);

    const rolEscrito = (fila[columnaDe.rol] ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    const rol: Rol = (ROLES as readonly string[]).includes(rolEscrito)
      ? (rolEscrito as Rol)
      : rolPorDefecto;

    // Un rol que no es de local no se puede conceder desde aquí: importar la
    // plantilla de un bar no puede crear un director de la organización.
    if (ALCANCE_DEL_ROL[rol] !== 'local') {
      salida.push({
        fila: numero,
        correo,
        nombre,
        estado: 'se_salta',
        porque: `«${rol}» no es un puesto de local, así que se da de alta a mano.`,
        pin: null,
      });
      continue;
    }

    const encontrada = await contexto.sql<{ persona_id: string; activa: boolean }[]>`
      select * from estook.persona_por_correo(${correo})
    `;
    const yaExistia = encontrada.length > 0;
    let personaId = encontrada[0]?.persona_id;

    if (personaId === undefined) {
      const creadas = await contexto.sql<{ id: string }[]>`
        select estook.dar_de_alta_persona(
          ${correo}, ${nombre}, ${(fila[columnaDe.apellidos] ?? '').trim() || null}
        ) as id
      `;
      personaId = creadas[0]?.id;
      if (personaId === undefined) {
        salida.push({
          fila: numero,
          correo,
          nombre,
          estado: 'se_salta',
          porque: 'No se ha podido dar de alta. Inténtalo a mano.',
          pin: null,
        });
        continue;
      }
    } else if (encontrada[0]?.activa === false) {
      await contexto.sql`update estook.persona set activa = true where id = ${personaId}`;
    }

    const membresias = await contexto.sql<{ id: string }[]>`
      insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
      values (${personaId}, ${organizacionId}, ${localId}, 'local', ${rol})
      on conflict do nothing
      returning id
    `;

    if (membresias.length === 0) {
      salida.push({
        fila: numero,
        correo,
        nombre,
        estado: 'ya_estaba',
        porque: null,
        pin: null,
      });
      continue;
    }

    const pin = await ponerPinNuevo(contexto.sql, personaId, localId);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'invitar', 'persona', ${personaId},
        ${localId}::uuid, null,
        ${JSON.stringify({ rol, desde: 'importacion', ya_existia: yaExistia })}::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'membresia.creada',
      organizacionId,
      localId,
      datos: { persona_id: personaId, rol },
      correlacionId: contexto.correlacionId,
    });

    salida.push({ fila: numero, correo, nombre, estado: 'entra', porque: null, pin });
  }

  return {
    entraron: salida.filter((f) => f.estado === 'entra').length,
    yaEstaban: salida.filter((f) => f.estado === 'ya_estaba').length,
    seSaltaron: salida.filter((f) => f.estado === 'se_salta').length,
    filas: salida,
  };
}

// ── Descartar ────────────────────────────────────────────────────────────────

export const descartarImportacion = comando<{ importacion_id: string }, { descartada: boolean }>({
  nombre: 'descartar_importacion',
  entrada: z.object({ importacion_id: z.string().uuid() }).strict(),
  exige: 'accion.invitar_personas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);

    await contexto.sql`
      update estook.importacion set estado = 'descartada'
       where id = ${entrada.importacion_id} and local_id = ${localId} and estado = 'propuesta'
    `;

    return { descartada: true };
  },
});
