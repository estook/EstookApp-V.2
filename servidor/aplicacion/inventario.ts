import {
  VENTANA_DE_CONSUMO,
  ajusteHasta,
  cantidad,
  diferenciaDeLoContado,
  horaDeCorte,
  jornadaDe,
  queTocaContar,
  type FechaOperativa,
  type PorQueTocaContar,
} from '@estook/dominio';
import { publicar } from '../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from './alta.ts';
import { apuntar, elProductoBloqueado, loQueHay } from './almacen.ts';
import { productosActivos } from './consultas/almacen.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';

/**
 * Contar el almacén en dos pasos (M8 · decisión 0078).
 *
 * Lo comparten los comandos de inventario y el cierre de un paso de siempre
 * (`cerrar_recuento`): **guardar lo contado con la foto del libro de ese momento**, y
 * **cerrarlo** apuntando la diferencia. Si cada comando lo hiciera a su manera, el
 * cierre de un paso y el de dos darían diferencias distintas para lo mismo contado.
 *
 * ── Lo que hace que cerrar tarde no se coma nada ─────────────────────────────
 *
 * Cada línea guarda lo que decía el libro **al contarla** (`decia`) y hasta qué línea
 * del libro (`hasta_movimiento`). Al cerrar se apunta `hay − decia` encima de lo que
 * haya entonces: si entre medias entró un albarán, sigue sumando. Es lo que hacen
 * los programas de inventario serios, y era lo que faltaba para contar a las 7 y
 * cerrar a las 11 (2A).
 */

export interface LineaContada {
  readonly productoId: string;
  /** En la unidad de uso del producto. Cero vale. */
  readonly hay: number;
  /** Si se contó en cajas y sueltas, cómo: solo para leerlo después. */
  readonly formatos?: number | null;
  readonly sueltas?: number | null;
}

export interface LoQueBaila {
  readonly productoId: string;
  readonly producto: string;
  readonly decia: number;
  readonly hay: number;
  readonly unidadDeUso: string;
}

export interface Cerrado {
  readonly fechaOperativa: string;
  readonly corregidos: number;
  readonly yaCuadraban: number;
  readonly vaciados: number;
  /** Las líneas que se quedaron fuera porque se pidió volver a contarlas. */
  readonly fuera: number;
  readonly loQueMasBaila: readonly LoQueBaila[];
}

/** Lo que dice el libro ahora de cada producto, y hasta qué línea. */
async function laFotoDelLibro(
  contexto: Contexto,
  productoIds: readonly string[],
): Promise<ReadonlyMap<string, { decia: number; hasta: string }>> {
  if (productoIds.length === 0) return new Map();
  const filas = await contexto.sql<{ producto_id: string; cantidad: string; id: string }[]>`
    select distinct on (m.producto_id)
           m.producto_id::text as producto_id, m.cantidad_despues::text as cantidad,
           m.id::text as id
      from estook.movimiento_de_stock m
     where m.producto_id = any (${comoLista(productoIds)}::text::uuid[])
     order by m.producto_id, m.id desc
  `;
  return new Map(filas.map((f) => [f.producto_id, { decia: Number(f.cantidad), hasta: f.id }]));
}

/**
 * Comprueba que los productos son de este local, están activos y se ven desde aquí:
 * un cocinero no cuenta lo de la barra (0038). Devuelve sus nombres.
 */
async function losProductosContados(
  contexto: Contexto,
  localId: string,
  productoIds: readonly string[],
): Promise<ReadonlyMap<string, { nombre: string; unidadDeUso: string }>> {
  const filas = await contexto.sql<{ id: string; nombre: string; unidad_de_uso: string }[]>`
    select p.id::text as id, p.nombre, p.unidad_de_uso::text as unidad_de_uso
      from estook.producto p
     where p.id = any (${comoLista(productoIds)}::text::uuid[])
       and p.local_id = ${localId}
       and p.activo
       and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
  `;
  const vistos = new Map(
    filas.map((f) => [f.id, { nombre: f.nombre, unidadDeUso: f.unidad_de_uso }]),
  );
  const ajeno = productoIds.find((id) => !vistos.has(id));
  if (ajeno !== undefined) {
    throw new FalloDeAplicacion('local_ajeno', {
      porque: 'Hay un producto en lo contado que no es de este local, o no es de tu zona.',
    });
  }
  return vistos;
}

/** Si hay productos repetidos en lo contado, se dice: no se adivina cuál vale. */
function sinRepetidos(lineas: readonly LineaContada[]): void {
  const vistos = new Set<string>();
  for (const linea of lineas) {
    if (vistos.has(linea.productoId)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['lineas'],
        porque: 'Un producto sale dos veces en lo contado. Déjalo una vez, con lo que hay.',
      });
    }
    vistos.add(linea.productoId);
  }
}

/**
 * Guarda lo contado, con la foto del libro de este momento. Devuelve el inventario
 * y cuántos no cuadran con lo que decía el libro, para el aviso a quien cierra.
 */
export async function guardarLoContado(
  contexto: Contexto,
  datos: {
    readonly zona: string | null;
    readonly lineas: readonly LineaContada[];
    readonly notas: string | null;
  },
): Promise<{ inventarioId: string; contados: number; noCuadran: number }> {
  const localId = elLocalDeLaSesion(contexto);
  sinRepetidos(datos.lineas);
  const ids = datos.lineas.map((l) => l.productoId);
  await losProductosContados(contexto, localId, ids);
  const foto = await laFotoDelLibro(contexto, ids);

  const inventarios = await contexto.sql<{ id: string }[]>`
    insert into estook.inventario (local_id, zona, contado_por, contado_en, notas)
    values (
      ${localId}, ${datos.zona}::estook.zona_del_producto, ${contexto.personaId},
      ${contexto.ahora.toISOString()}::timestamptz, ${datos.notas}
    )
    returning id::text as id
  `;
  const inventarioId = inventarios[0]?.id;
  if (inventarioId === undefined) throw new FalloDeAplicacion('sin_permiso');

  let noCuadran = 0;
  for (const linea of datos.lineas) {
    const delLibro = foto.get(linea.productoId);
    const decia = delLibro?.decia ?? 0;
    if (diferenciaDeLoContado(linea.hay, decia) !== null) noCuadran += 1;
    await contexto.sql`
      insert into estook.linea_de_inventario (
        inventario_id, local_id, producto_id, hay, formatos, sueltas, decia,
        hasta_movimiento, contado_por, contado_en
      )
      values (
        ${inventarioId}, ${localId}, ${linea.productoId}, ${linea.hay},
        ${linea.formatos ?? null}, ${linea.sueltas ?? null}, ${decia},
        ${delLibro?.hasta ?? '0'}::bigint, ${contexto.personaId},
        ${contexto.ahora.toISOString()}::timestamptz
      )
    `;
  }

  return { inventarioId, contados: datos.lineas.length, noCuadran };
}

/**
 * Vuelve a poner lo contado de unas líneas, con la foto del libro de ahora: lo hace
 * quien recuenta lo que le pidieron, y quien cierra cuando corrige una cifra.
 */
export async function ponerLoContadoOtraVez(
  contexto: Contexto,
  inventarioId: string,
  lineas: readonly LineaContada[],
  soloLasQueHayQueRecontar: boolean,
): Promise<number> {
  sinRepetidos(lineas);
  const foto = await laFotoDelLibro(
    contexto,
    lineas.map((l) => l.productoId),
  );
  let puestas = 0;
  for (const linea of lineas) {
    const delLibro = foto.get(linea.productoId);
    const cambiadas = await contexto.sql<{ id: string }[]>`
      update estook.linea_de_inventario
         set hay = ${linea.hay},
             formatos = ${linea.formatos ?? null},
             sueltas = ${linea.sueltas ?? null},
             decia = ${delLibro?.decia ?? 0},
             hasta_movimiento = ${delLibro?.hasta ?? '0'}::bigint,
             contado_por = ${contexto.personaId},
             contado_en = ${contexto.ahora.toISOString()}::timestamptz,
             recontar = false,
             recontar_pedido_por = null
       where inventario_id = ${inventarioId}
         and producto_id = ${linea.productoId}
         and (not ${soloLasQueHayQueRecontar} or recontar)
      returning id::text as id
    `;
    puestas += cambiadas.length;
  }
  return puestas;
}

/** El inventario, bloqueado para cerrarlo, y comprobado que se puede. */
export async function elInventarioPorCerrar(
  contexto: Contexto,
  inventarioId: string,
): Promise<{ readonly zona: string | null; readonly contadoPor: string | null }> {
  const filas = await contexto.sql<
    { estado: string; zona: string | null; contado_por: string | null; local_id: string }[]
  >`
    select estado, zona::text as zona, contado_por::text as contado_por, local_id::text as local_id
      from estook.inventario
     where id = ${inventarioId}
     for update
  `;
  const fila = filas[0];
  if (fila === undefined || fila.local_id !== elLocalDeLaSesion(contexto)) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese inventario no está, o no es de este local.',
    });
  }
  if (fila.estado !== 'contado') {
    throw new FalloDeAplicacion('ya_hecho', {
      porque:
        fila.estado === 'cerrado'
          ? 'Ese inventario ya está cerrado.'
          : 'Ese inventario se descartó: no se puede cerrar.',
    });
  }
  return { zona: fila.zona, contadoPor: fila.contado_por };
}

/**
 * Cierra un inventario: apunta en el libro la diferencia de cada línea —lo que hay
 * menos lo que decía el libro al contarla—, encima de lo que haya ahora. Las líneas
 * que esperan a que se vuelvan a contar se quedan fuera, y se dice cuántas.
 *
 * Con `a_cero`, lo que no se ha contado de esa zona pasa a cero, con lo que hay ahora.
 */
export async function cerrarElInventario(
  contexto: Contexto,
  inventarioId: string,
  datos: { readonly loQueFalta: 'dejarlo' | 'a_cero'; readonly notas: string | null },
): Promise<Cerrado> {
  const localId = elLocalDeLaSesion(contexto);
  const organizacionId = laOrganizacionDeLaSesion(contexto);
  const inventario = await elInventarioPorCerrar(contexto, inventarioId);

  const lineas = await contexto.sql<
    { producto_id: string; hay: string; decia: string; recontar: boolean }[]
  >`
    select producto_id::text as producto_id, hay::text as hay, decia::text as decia, recontar
      from estook.linea_de_inventario
     where inventario_id = ${inventarioId}
     order by id
  `;

  const baila: LoQueBaila[] = [];
  let corregidos = 0;
  let yaCuadraban = 0;
  let fuera = 0;
  const motivo = datos.notas ?? 'Inventario';

  // De una en una y en orden, como se apunta en un libro. El candado de `apuntar` es
  // por producto: dos personas cerrando a la vez no se pisan.
  for (const linea of lineas) {
    if (linea.recontar) {
      fuera += 1;
      continue;
    }
    const hay = Number(linea.hay);
    const decia = Number(linea.decia);
    const diferencia = diferenciaDeLoContado(hay, decia);
    if (diferencia === null) {
      yaCuadraban += 1;
      continue;
    }
    const producto = await elProductoBloqueado(contexto, linea.producto_id);
    await apuntar(contexto, producto, {
      tipo: 'recuento',
      cantidad: diferencia,
      motivo,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
      referencia: { inventario: inventarioId, hay, decia },
    });
    corregidos += 1;
    baila.push({
      productoId: producto.id,
      producto: producto.nombre,
      decia,
      hay,
      unidadDeUso: producto.unidadDeUso,
    });
  }

  // ── Lo que no se ha contado, si se ha pedido vaciarlo ──────────────────────
  let vaciados = 0;
  if (datos.loQueFalta === 'a_cero') {
    const contados = lineas.map((l) => l.producto_id);
    const sobrantes = await contexto.sql<{ id: string }[]>`
      select p.id::text as id
        from estook.producto p
        join estook.existencias e on e.producto_id = p.id
       where p.local_id = ${localId}
         and p.activo
         and not p.es_ejemplo
         and e.cantidad <> 0
         and (${inventario.zona}::text is null or p.zona::text = ${inventario.zona}::text)
         and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
         and not (p.id = any (${comoLista(contados)}::text::uuid[]))
       limit 500
    `;
    for (const fila of sobrantes) {
      const producto = await elProductoBloqueado(contexto, fila.id);
      const hayAhora = await loQueHay(contexto, producto.id);
      const diferencia = ajusteHasta(cantidad(hayAhora.cantidad), cantidad(0));
      if (diferencia === null) continue;
      await apuntar(contexto, producto, {
        tipo: 'recuento',
        cantidad: diferencia,
        motivo: 'Inventario · no estaba en lo contado',
        origen: 'a_mano',
        esEjemplo: producto.esEjemplo,
        referencia: { inventario: inventarioId, hay: 0, decia: hayAhora.cantidad },
      });
      vaciados += 1;
    }
  }

  // La jornada la dice el motor de tiempo, con la zona y la hora de corte del local
  // (regla 10), no `current_date`.
  const relojes = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const reloj = relojes[0];
  const fechaOperativa =
    reloj === undefined
      ? ''
      : jornadaDe(contexto.ahora, reloj.zona_horaria, horaDeCorte(reloj.hora_de_corte));

  await contexto.sql`
    update estook.inventario
       set estado = 'cerrado',
           cerrado_por = ${contexto.personaId},
           cerrado_en = ${contexto.ahora.toISOString()}::timestamptz,
           correlacion_id = ${contexto.correlacionId}::uuid,
           notas = coalesce(${datos.notas}, notas)
     where id = ${inventarioId}
  `;

  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, 'crear', 'recuento', ${inventarioId},
      ${localId}::uuid, null,
      ${JSON.stringify({ contados: lineas.length - fuera, corregidos, vaciados, fuera, zona: inventario.zona })}::text::jsonb,
      ${datos.notas}
    )
  `;

  // Lo escucha la previsión de cada producto corregido y, con la segunda entrega, lo
  // gastado de verdad entre dos inventarios.
  await publicar(contexto.sql, {
    tipo: 'inventario.recontado',
    organizacionId,
    localId,
    datos: {
      fechaOperativa,
      contados: lineas.length - fuera,
      corregidos,
      vaciados,
      zona: inventario.zona,
    },
    correlacionId: contexto.correlacionId,
  });

  return {
    fechaOperativa,
    corregidos,
    yaCuadraban,
    vaciados,
    fuera,
    // Los diez que más bailan, de mayor a menor: lo que se mira después de contar.
    loQueMasBaila: baila
      .slice()
      .sort((a, b) => Math.abs(b.hay - b.decia) - Math.abs(a.hay - a.decia))
      .slice(0, 10),
  };
}

// ── Lo que toca contar ───────────────────────────────────────────────────────

export interface ProductoQueToca {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly unidadDeUso: string;
  readonly porque: PorQueTocaContar;
  readonly contadoEl: FechaOperativa | null;
}

/**
 * Lo que toca contar en el local, **tal como lo ve quien pregunta** (sus zonas): lo
 * caro que lleva una semana y lo demás que lleva un mes (`queTocaContar`).
 *
 * El peso de cada producto es lo que se ha gastado de él en las cuatro semanas,
 * valorado a su coste; sin nada gastado, lo que vale lo que hay. Se calcula aquí con
 * los precios aunque quien pregunte no los vea: **solo sale el orden y los nombres**,
 * ni un euro.
 */
export async function loQueTocaContar(
  contexto: Contexto,
  localId: string,
): Promise<{ readonly hoy: FechaOperativa; readonly productos: readonly ProductoQueToca[] }> {
  const productos = await productosActivos(contexto, localId);
  const relojes = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const reloj = relojes[0] ?? { zona_horaria: 'Europe/Madrid', hora_de_corte: '05:00' };
  const hoy = jornadaDe(contexto.ahora, reloj.zona_horaria, horaDeCorte(reloj.hora_de_corte));

  // La última vez que se contó cada uno: por un inventario cerrado (aunque cuadrara,
  // que no deja línea en el libro) o por una línea de recuento de antes de M8.
  const contados = await contexto.sql<
    { producto_id: string; del_libro: string | null; cerrado_en: string | null }[]
  >`
    select p.id::text as producto_id,
           (select to_char(max(m.fecha_operativa), 'YYYY-MM-DD')
              from estook.movimiento_de_stock m
             where m.producto_id = p.id and m.tipo = 'recuento') as del_libro,
           (select to_char(max(i.cerrado_en) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              from estook.linea_de_inventario li
              join estook.inventario i on i.id = li.inventario_id
             where li.producto_id = p.id and i.estado = 'cerrado' and not li.recontar) as cerrado_en
      from estook.producto p
     where p.local_id = ${localId} and p.activo and not p.es_ejemplo
  `;
  const contadoEl = new Map<string, FechaOperativa | null>();
  for (const fila of contados) {
    const porCierre =
      fila.cerrado_en === null
        ? null
        : jornadaDe(
            new Date(fila.cerrado_en),
            reloj.zona_horaria,
            horaDeCorte(reloj.hora_de_corte),
          );
    const delLibro = fila.del_libro as FechaOperativa | null;
    contadoEl.set(
      fila.producto_id,
      porCierre === null
        ? delLibro
        : delLibro === null || porCierre > delLibro
          ? porCierre
          : delLibro,
    );
  }

  const tocan = queTocaContar(
    productos.map((p) => {
      const gastado =
        p.consumo.porDia !== null && p.costeMilesimas !== null && p.costeMilesimas !== undefined
          ? p.consumo.porDia * VENTANA_DE_CONSUMO * p.costeMilesimas
          : 0;
      const enCamara = (p.valorCentimos ?? 0) * 1000;
      return {
        id: p.id,
        peso: gastado > 0 ? gastado : enCamara,
        contadoEl: contadoEl.get(p.id) ?? null,
      };
    }),
    hoy,
  );

  const porId = new Map(productos.map((p) => [p.id, p]));
  return {
    hoy,
    productos: tocan.flatMap((t) => {
      const p = porId.get(t.id);
      return p === undefined
        ? []
        : [
            {
              id: p.id,
              nombre: p.nombre,
              zona: p.zona,
              unidadDeUso: p.unidadDeUso,
              porque: t.porque,
              contadoEl: t.contadoEl,
            },
          ];
    }),
  };
}

/** Si quien pregunta puede cerrar inventarios en este local. */
export async function puedeCerrar(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('accion.cerrar_recuento', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}
