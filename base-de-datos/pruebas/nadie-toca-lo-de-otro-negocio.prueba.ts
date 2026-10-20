import { afterAll, beforeAll, expect, it } from 'vitest';
import { CORTE_POR_DEFECTO, jornadaDe, masDias } from '@estook/dominio';
import { catalogo } from '../../servidor/aplicacion/catalogo.ts';

/** El esquema de entrada de una operación, tal como lo declara el contrato. */
type ZodTypeAny = (typeof catalogo.comandos)[string]['entrada'];
import { montarLaApi, type ApiDePrueba } from './despachador.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * **Nada de un negocio se lee ni se toca desde otro, y cada rol ve sus cifras** (la
 * auditoría del 20-oct, decisión 0101).
 *
 * Las demás pruebas de permisos miran caso a caso lo que se sabe que hay que mirar. Esta
 * mira **todas las operaciones de la API** —las 96 consultas y los 211 comandos de hoy, y
 * las que se añadan mañana sin acordarse de ella— con las entradas que sale de su propio
 * esquema, como haría alguien que prueba a ver qué pasa:
 *
 *   1 · Rosa llena Bar Centro de todo lo que puede (lanzando cada comando).
 *   2 · Elena (dirección de Grupo Costa) y Vera (gerente de Bar Ribera), dentro de sus
 *       locales, lanzan cada consulta y cada comando **con los ids de Bar Centro**. Lo que
 *       contestan no puede llevar ningún id de Bar Centro, y ninguna fila que sea de Bar
 *       Centro puede cambiar ni nacer —tampoco una contraseña, una sesión o un aparato—.
 *   3 · Cada persona de ejemplo lanza cada consulta en su local: la que no ve compras,
 *       ventas o coste de personal no puede recibir ni una cifra de eso.
 *
 * Lo que no detecta: lo que pase con entradas que el generador no sabe formar (fotos de
 * verdad, Fogón encendido); eso lo cubren sus pruebas propias. Lo que llega al registro
 * de lo hecho (`auditoria`, `clave_de_idempotencia`, `bandeja_de_salida`,
 * `llamada_a_fogon`) no se vigila: guarda lo que manda quien ataca, ids ajenos incluidos.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;

const VICTIMA = 'rosa@ejemplo.estook.com';
const ATACANTES = ['elena@ejemplo.estook.com', 'vera@ejemplo.estook.com'];

// Lo que rompe la sesión de quien ataca o su forma de entrar: no aporta nada al barrido.
const NO_SE_LANZA = new Set([
  'salir',
  'cerrar_sesion',
  'cambiar_mi_clave',
  'activar_doble_factor',
  'confirmar_doble_factor',
  'exigir_doble_factor',
  'entrar',
  'entrar_en_admin',
  'entrar_con_google',
  'entrar_en_demostracion',
  'salir_de_la_demostracion',
]);

// Las fechas, de hoy: con una fija, la prueba haría otra cosa cada día que pasa.
const ahora = new Date(Date.now());
const HOY = jornadaDe(ahora, 'Europe/Madrid', CORTE_POR_DEFECTO);
const MANANA = masDias(HOY, 1);
const LUNES = masDias(HOY, -((new Date(`${HOY}T12:00:00Z`).getUTCDay() + 6) % 7));

type Q = (t: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let q: Q;

/** columna X_id -> tabla a la que apunta (por las claves ajenas de la base) */
let aTabla = new Map<string, string>();
/** tabla -> ids de Bar Centro */
let deLaVictima = new Map<string, string[]>();
let todosLosDeLaVictima = new Set<string>();
let orgVictima = '';
let localVictima = '';

async function huellas(): Promise<Map<string, string>> {
  const filas = await q(`select * from pg_temp.pg_temp_huellas()`);
  return new Map(filas.map((f) => [String(f['t']), String(f['h'])]));
}

async function filasDe(tabla: string): Promise<Set<string>> {
  const filas = await q(`select t::text as x from ${tabla} t`);
  return new Set(filas.map((f) => String(f['x'])));
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  q = async (t, p = []) => (await base.bd.query<Record<string, unknown>>(t, p)).rows;
  await base.bd.exec(`
    create or replace function pg_temp.pg_temp_huellas() returns table (t text, h text) language plpgsql as $$
    declare r record; v text;
    begin
      for r in select n.nspname || '.' || c.relname as nombre from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where c.relkind = 'r' and n.nspname in ('estook', 'plataforma')
                  and c.relname not in ('auditoria', 'clave_de_idempotencia', 'llamada_a_fogon', 'bandeja_de_salida')
      loop
        execute format('select md5(coalesce(string_agg(x::text, ''|'' order by x::text), '''')) from %s x', r.nombre) into v;
        t := r.nombre; h := v; return next;
      end loop;
    end $$;
  `);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

function valoresDeHoja(campo: string, s: ZodTypeAny, victima: boolean): unknown[] {
  const def = s._def as Record<string, unknown> & { typeName: string };
  const esId =
    /_id$|_ids$/.test(campo) ||
    [
      'personas',
      'persona',
      'productos',
      'platos',
      'mensajes',
      'miembros',
      'quien',
      'para',
    ].includes(campo);
  const tabla = esId
    ? (aTabla.get(campo) ??
      aTabla.get(campo.replace(/_ids$/, '_id')) ??
      aTabla.get(campo.replace(/s$/, '_id')) ??
      null)
    : null;
  const ids = (tabla ? deLaVictima.get(tabla) : undefined) ?? [];
  switch (def.typeName) {
    case 'ZodString': {
      const cands: unknown[] = [];
      if (victima) {
        cands.push(...ids.slice(0, 2));
        if (/^local/.test(campo) && esId) cands.push(localVictima);
        if (/^organizacion/.test(campo) && esId) cands.push(orgVictima);
      }
      cands.push(
        LUNES,
        HOY,
        MANANA,
        ahora.toISOString(),
        '10:00',
        HOY.slice(0, 7),
        'x@ejemplo.estook.com',
        'Una prueba de la auditoria',
        'abc',
        '123456',
        '1',
        crypto.randomUUID(),
        'https://ejemplo.estook.com/a.png',
        '#E8622C',
        'es',
        '28001',
        'image/jpeg',
        'image/webp',
        'application/pdf',
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      );
      return cands;
    }
    case 'ZodNumber': {
      const cands: unknown[] = [];
      if (victima)
        cands.push(
          ...ids
            .filter((i) => /^\d+$/.test(i))
            .map(Number)
            .slice(0, 2),
        );
      cands.push(1, 7, 30, 0, 5, 100, 1000);
      return cands;
    }
    case 'ZodBoolean':
      return [true, false];
    case 'ZodEnum':
      return [...(def['values'] as unknown[])];
    case 'ZodNativeEnum':
      return Object.values(def['values'] as object);
    case 'ZodLiteral':
      return [def['value']];
    case 'ZodDate':
      return [ahora];
    case 'ZodAny':
    case 'ZodUnknown':
      return [{}];
    default:
      return [];
  }
}

function generar(campo: string, s: ZodTypeAny, victima: boolean, profundidad = 0): unknown {
  const def = s._def as Record<string, unknown> & { typeName: string };
  if (profundidad > 6) return undefined;
  switch (def.typeName) {
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
    case 'ZodCatch':
    case 'ZodReadonly':
      return generar(campo, def['innerType'] as ZodTypeAny, victima, profundidad + 1);
    case 'ZodBranded':
      return generar(campo, def['type'] as ZodTypeAny, victima, profundidad + 1);
    case 'ZodEffects': {
      const dentro = def['schema'] as ZodTypeAny;
      const hoja = valoresDeHoja(campo, dentro, victima);
      for (const c of hoja) if (s.safeParse(c).success) return c;
      return generar(campo, dentro, victima, profundidad + 1);
    }
    case 'ZodPipeline':
      return generar(campo, def['in'] as ZodTypeAny, victima, profundidad + 1);
    case 'ZodLazy':
      return generar(campo, (def['getter'] as () => ZodTypeAny)(), victima, profundidad + 1);
    case 'ZodObject': {
      const forma = (def['shape'] as () => Record<string, ZodTypeAny>)();
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(forma)) {
        const valor = generar(k, v, victima, profundidad + 1);
        if (valor !== undefined) o[k] = valor;
      }
      return o;
    }
    case 'ZodArray': {
      const uno = generar(campo, def['type'] as ZodTypeAny, victima, profundidad + 1);
      const min = (def['minLength'] as { value: number } | null)?.value ?? 1;
      return Array.from({ length: Math.max(1, min) }, () => uno);
    }
    case 'ZodTuple':
      return (def['items'] as ZodTypeAny[]).map((i) => generar(campo, i, victima, profundidad + 1));
    case 'ZodRecord':
      return {};
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      const opciones = def['options'] as ZodTypeAny[] | Map<unknown, ZodTypeAny>;
      const lista = Array.isArray(opciones) ? opciones : [...opciones.values()];
      for (const op of lista) {
        const v = generar(campo, op, victima, profundidad + 1);
        if (op.safeParse(v).success) return v;
      }
      return lista[0] ? generar(campo, lista[0], victima, profundidad + 1) : undefined;
    }
    default: {
      const cands = valoresDeHoja(campo, s, victima);
      for (const c of cands) if (s.safeParse(c).success) return c;
      return cands[0];
    }
  }
}

/** Para las consultas: todo como texto, igual que por la dirección. */
function comoTexto(o: unknown): Record<string, string> {
  const r: Record<string, string> = {};
  if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) r[k] = typeof v === 'string' ? v : JSON.stringify(v);
  return r;
}

async function recogerLoDeLaVictima() {
  const fks = await q(`
    select a.attname as col, cl.relname as tabla, ct.relname as de
      from pg_constraint c
      join pg_class cl on cl.oid = c.confrelid
      join pg_class ct on ct.oid = c.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and n.nspname = 'estook' and array_length(c.conkey, 1) = 1`);
  const cuenta = new Map<string, Map<string, number>>();
  for (const f of fks) {
    const col = String(f['col']);
    const m = cuenta.get(col) ?? new Map<string, number>();
    m.set(String(f['tabla']), (m.get(String(f['tabla'])) ?? 0) + 1);
    cuenta.set(col, m);
  }
  aTabla = new Map(
    [...cuenta].map(([col, m]) => [col, [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '']),
  );
  // Sinónimos que la API usa y la base no.
  for (const [k, v] of [
    ['mensaje_id', 'mensaje'],
    ['canal_id', 'canal'],
    ['movimiento_id', 'movimiento_de_stock'],
    ['linea_id', 'linea_de_pedido'],
    ['semana_id', 'semana_de_horario'],
    ['nota_id', 'nota_del_tablon'],
    ['seccion_id', 'seccion_de_carta'],
    ['ficha_id', 'receta'],
    ['escandallo_id', 'receta'],
    ['elaboracion_id', 'elaboracion'],
    ['revision_id', 'revision_de_fogon'],
    ['importacion_id', 'importacion'],
    ['aviso_id', 'aviso'],
    ['justificacion_id', 'justificacion'],
    ['cierre_id', 'cierre_de_caja'],
    ['precio_id', 'precio_de_producto'],
    ['pactado_id', 'precio_pactado'],
    ['personas', 'persona'],
    ['persona', 'persona'],
    ['invitacion_id', 'invitacion_a_pedido'],
    ['incidencia_id', 'fichaje'],
    ['correccion_id', 'correccion_de_fichaje'],
  ] as const)
    if (!aTabla.has(k)) aTabla.set(k, v);

  const org = await q(
    `select o.id as org, l.id as local from estook.organizacion o join estook.local l on l.organizacion_id = o.id
      join estook.membresia m on m.organizacion_id = o.id join estook.persona p on p.id = m.persona_id
      where p.correo = $1 limit 1`,
    [VICTIMA],
  );
  orgVictima = String(org[0]?.['org']);
  localVictima = String(org[0]?.['local']);

  const tablas = await q(`
    select c.relname as t,
           exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'local_id' and not a.attisdropped) as con_local,
           exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'organizacion_id' and not a.attisdropped) as con_org,
           exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'id' and not a.attisdropped) as con_id
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r' and n.nspname = 'estook'`);
  deLaVictima = new Map();
  const directos = new Set<string>();
  for (const t of tablas) {
    if (!t['con_id']) continue;
    const nombre = String(t['t']);
    let filas: Record<string, unknown>[] = [];
    if (nombre === 'organizacion') filas = [{ id: orgVictima }];
    else if (nombre === 'local')
      filas = await q(`select id::text from estook.local where organizacion_id = $1`, [orgVictima]);
    else if (nombre === 'persona')
      filas = await q(
        `select p.id::text from estook.persona p where exists (select 1 from estook.membresia m where m.persona_id = p.id and m.organizacion_id = $1)
           and not exists (select 1 from estook.membresia m where m.persona_id = p.id and m.organizacion_id <> $1)`,
        [orgVictima],
      );
    else if (t['con_local'])
      filas = await q(
        `select id::text from estook.${nombre} where local_id in (select id from estook.local where organizacion_id = $1)`,
        [orgVictima],
      );
    else if (t['con_org'])
      filas = await q(`select id::text from estook.${nombre} where organizacion_id = $1`, [
        orgVictima,
      ]);
    if (filas.length > 0) {
      deLaVictima.set(
        nombre,
        filas.map((f) => String(f['id'])),
      );
      directos.add(nombre);
    }
  }
  // Un salto: las hijas de lo que ya es de la víctima (líneas, mensajes…).
  for (const f of fks) {
    const hija = String(f['de']);
    const padre = String(f['tabla']);
    if (directos.has(hija) || !deLaVictima.has(padre)) continue;
    const tieneId = tablas.find((t) => t['t'] === hija)?.['con_id'];
    if (!tieneId) continue;
    const ids = deLaVictima.get(padre) ?? [];
    const filas = await q(
      `select id::text from estook.${hija} where ${String(f['col'])}::text = any($1)`,
      [ids],
    );
    if (filas.length > 0)
      deLaVictima.set(hija, [
        ...new Set([...(deLaVictima.get(hija) ?? []), ...filas.map((x) => String(x['id']))]),
      ]);
  }
  todosLosDeLaVictima = new Set(
    [...deLaVictima].flatMap(([, ids]) => ids).filter((i) => /^[0-9a-f-]{36}$/.test(i)),
  );
}

it('desde otra organización, nada de Bar Centro se lee ni se toca', async () => {
  // 1 · Que Bar Centro tenga de todo. Lo principal, a mano y con entradas buenas…
  const rosa = await api.entrar(VICTIMA);
  const marcos = (
    await q(`select id::text from estook.persona where correo = 'marcos@ejemplo.estook.com'`)
  )[0]?.['id'];
  for (const [nombre, entrada] of [
    ['escribir_en_el_tablon', { texto: 'Nota de Bar Centro' }],
    ['crear_canal', { nombre: 'Barra de Bar Centro', personas: [marcos] }],
    [
      'crear_producto',
      {
        nombre: 'Harina de Bar Centro',
        unidad_de_uso: 'kg',
        cantidad_inicial: 5,
        precio_centimos: 90,
      },
    ],
    ['crear_proveedor', { nombre: 'Proveedor de Bar Centro' }],
    [
      'crear_platos',
      { seccion_id: null, platos: [{ nombre: 'Plato de Bar Centro', precio_centimos: 1200 }] },
    ],
    ['cerrar_la_caja', { fecha: HOY, total_centimos: 10_000 }],
  ] as const) {
    const r = await api.ejecutar(rosa, nombre, entrada);
    expect(r.estado, `${nombre}: ${JSON.stringify(r)}`).toBe('ok');
  }
  await recogerLoDeLaVictima();
  const canal = deLaVictima.get('canal')?.[0];
  expect(
    (await api.ejecutar(rosa, 'escribir_en_el_chat', { canal_id: canal, texto: 'Hola' })).estado,
  ).toBe('ok');
  // …y lo demás, lanzando cada comando con sus propios ids.
  for (const vuelta of [1, 2]) {
    for (const [nombre, c] of Object.entries(catalogo.comandos)) {
      if (
        NO_SE_LANZA.has(nombre) ||
        /borrar|quitar|retirar|cancelar|descartar|anular|salir|poner_clave_a|regenerar_pin/.test(
          nombre,
        )
      )
        continue;
      const entrada = generar('', c.entrada, true);
      try {
        await api.ejecutar(rosa, nombre, entrada);
      } catch {
        /* lo que falle aquí no importa: solo se siembra */
      }
    }
    await recogerLoDeLaVictima();
    if (process.env['BARRIDO_DETALLE'])
      console.warn(
        `Vuelta ${String(vuelta)}: ${String(todosLosDeLaVictima.size)} ids de Bar Centro`,
      );
  }
  // Sin víctima con datos, el barrido no probaría nada.
  expect(todosLosDeLaVictima.size).toBeGreaterThan(50);

  const hallazgos: string[] = [];
  const noGenerables: string[] = [];
  const pasaron: string[] = [];
  const codigos: string[] = [];

  for (const correo of ATACANTES) {
    let token = await api.entrar(correo);
    const dentro = async () => {
      const suyos = await api.consultar(token, 'mis_locales', {});
      const lista = suyos.estado === 'ok' ? (suyos.datos as { id: string }[]) : [];
      const uno = lista[0];
      if (uno) await api.ejecutar(token, 'cambiar_de_contexto', { local_id: uno.id });
      const yo = await api.consultar(token, 'quien_soy', {});
      if (process.env['BARRIDO_DETALLE'])
        console.warn(
          `${correo} dentro de ${JSON.stringify((yo as { datos?: { local?: unknown } }).datos?.local ?? null).slice(0, 120)} · ${JSON.stringify(suyos).slice(0, 200)}`,
        );
    };
    await dentro();

    // 2 · Las consultas: lo que contestan no puede llevar nada de Bar Centro.
    for (const [nombre, c] of Object.entries(catalogo.consultas)) {
      const entrada = generar('', c.entrada, true);
      if (!c.entrada.safeParse(comoTexto(entrada)).success) noGenerables.push(`consulta ${nombre}`);
      const r = await api.consultar(token, nombre, comoTexto(entrada));
      codigos.push(
        `${correo.slice(0, 5)} consulta ${nombre}: ${r.estado === 'fallo' ? r.codigo + ' ' + JSON.stringify(r.detalle ?? '').slice(0, 90) : r.estado} · ${JSON.stringify(comoTexto(entrada)).slice(0, 160)}`,
      );
      if (r.estado === 'ok') {
        pasaron.push(`consulta ${nombre}`);
        const texto = JSON.stringify(r.datos);
        const filtrados = [...todosLosDeLaVictima].filter((id) => texto.includes(id));
        if (filtrados.length > 0)
          hallazgos.push(
            `${correo} · consulta ${nombre} devuelve ${String(filtrados.length)} ids de Bar Centro (${filtrados.slice(0, 3).join(', ')}) con ${JSON.stringify(comoTexto(entrada))}`,
          );
      }
    }

    // 3 · Los comandos: ni cambian ni añaden nada que sea de Bar Centro.
    for (const [nombre, c] of Object.entries(catalogo.comandos)) {
      if (NO_SE_LANZA.has(nombre)) continue;
      const entrada = generar('', c.entrada, true);
      if (!c.entrada.safeParse(entrada).success) noGenerables.push(`comando ${nombre}`);
      const antes = await huellas();
      const instantaneas = new Map<string, Set<string>>();
      for (const t of antes.keys()) instantaneas.set(t, await filasDe(t));
      let r;
      try {
        r = await api.ejecutar(token, nombre, entrada);
      } catch (e) {
        r = { estado: 'excepcion', codigo: String(e).slice(0, 120) };
      }
      if (r.estado === 'ok') pasaron.push(`comando ${nombre}`);
      codigos.push(
        `${correo.slice(0, 5)} comando ${nombre}: ${r.estado === 'fallo' || r.estado === 'excepcion' ? r.codigo + ' ' + JSON.stringify((r as { detalle?: unknown }).detalle ?? '').slice(0, 90) : r.estado} · ${JSON.stringify(entrada).slice(0, 160)}`,
      );
      const despues = await huellas();
      for (const [t, h] of despues) {
        if (antes.get(t) === h) continue;
        const ahora = await filasDe(t);
        const previas = instantaneas.get(t) ?? new Set();
        const cambiadas = [...ahora]
          .filter((x) => !previas.has(x))
          .concat([...previas].filter((x) => !ahora.has(x)));
        const tocan = cambiadas.filter(
          (x) =>
            [...todosLosDeLaVictima].some((id) => x.includes(id)) ||
            x.includes(orgVictima) ||
            x.includes(localVictima),
        );
        if (tocan.length > 0)
          hallazgos.push(
            `${correo} · comando ${nombre} (${r.estado}) cambia ${String(tocan.length)} filas de Bar Centro en ${t}: ${tocan[0]?.slice(0, 300) ?? ''} · entrada ${JSON.stringify(entrada).slice(0, 300)}`,
          );
      }
      // ¿Sigue valiendo su sesión? Si no, se vuelve a entrar.
      const yo = await api.consultar(token, 'quien_soy', {});
      if (yo.estado !== 'ok') {
        token = await api.entrar(correo);
        await dentro();
      } else if (((yo.datos as { local?: unknown } | null)?.local ?? null) === null) {
        await dentro();
      }
    }
  }

  console.warn(
    `TABLAS DE LA VICTIMA: ${[...deLaVictima].map(([t, i]) => `${t}=${String(i.length)}`).join(' ')}`,
  );
  console.warn(`CODIGOS:\n${codigos.join('\n')}`);
  console.warn(`PASARON (${String(pasaron.length)}):\n${pasaron.join('\n')}`);
  console.warn(`NO GENERABLES (${String(noGenerables.length)}):\n${noGenerables.join('\n')}`);
  console.warn(`HALLAZGOS (${String(hallazgos.length)}):\n${hallazgos.join('\n')}`);
  expect(hallazgos).toEqual([]);
}, 3_600_000);

/** Las claves con cifras que delatan cada dato, y lo que se deja pasar a propósito. */
const DELATAN: Record<string, RegExp> = {
  // Los porcentajes de los objetivos y las cuentas («sinPrecio: 6») no son importes.
  'dato.precio_de_compra':
    /^(?!sin|cuant)(.*(precio(?!.*venta)|coste|costo|milesimas|valorCentimos|compras|gastado|importe))/i,
  'dato.ventas': /venta|ventas|facturado|total_centimos|ticket/i,
  'dato.coste_de_personal': /salario|sueldo|coste_?de_?personal|costePersonal|retribucion|bruto/i,
};

function cifrasEn(datos: unknown, patron: RegExp, ruta = '', salida: string[] = []): string[] {
  if (Array.isArray(datos))
    datos.forEach((d, i) => cifrasEn(d, patron, `${ruta}[${String(i)}]`, salida));
  else if (datos && typeof datos === 'object')
    for (const [k, v] of Object.entries(datos)) {
      if (typeof v === 'number' && v !== 0 && patron.test(k))
        salida.push(`${ruta}.${k}=${String(v)}`);
      else cifrasEn(v, patron, `${ruta}.${k}`, salida);
    }
  return salida;
}

it('cada rol ve solo las cifras que le tocan', async () => {
  const personas = await q(
    `select p.correo, m.local_id from estook.persona p join estook.membresia m on m.persona_id = p.id where p.es_ejemplo and p.correo like '%@ejemplo.estook.com' and p.correo <> 'plataforma@ejemplo.estook.com'`,
  );
  const vistas: string[] = [];
  const sospechas: string[] = [];
  for (const correo of [...new Set(personas.map((p) => String(p['correo'])))]) {
    let token: string;
    try {
      token = await api.entrar(correo);
    } catch {
      continue;
    }
    const suyos = await api.consultar(token, 'mis_locales', {});
    const lista = suyos.estado === 'ok' ? (suyos.datos as { id: string }[]) : [];
    for (const local of lista.slice(0, 2)) {
      await api.ejecutar(token, 'cambiar_de_contexto', { local_id: local.id });
      const persona = await q(`select id from estook.persona where correo = $1`, [correo]);
      const niveles: Record<string, string | null> = {};
      for (const dato of Object.keys(DELATAN)) {
        const n = await q(`select estook.nivel_de_permiso($1::uuid, $2::uuid, $3)::text as n`, [
          persona[0]?.['id'],
          local.id,
          dato,
        ]);
        niveles[dato] = (n[0]?.['n'] as string | null) ?? null;
      }
      const sinVer = Object.keys(DELATAN).filter(
        (d) => niveles[d] !== 'ver' && niveles[d] !== 'ver_y_editar',
      );
      vistas.push(
        `${correo} en ${local.id.slice(0, 8)}: no ve ${sinVer.join(', ') || 'nada que esconder'}`,
      );
      if (sinVer.length === 0) continue;
      for (const [nombre, c] of Object.entries(catalogo.consultas)) {
        const entrada = comoTexto(generar('', c.entrada, true));
        const r = await api.consultar(token, nombre, entrada);
        if (r.estado !== 'ok') continue;
        for (const dato of sinVer) {
          const pillado = cifrasEn(r.datos, DELATAN[dato] ?? /$^/);
          if (pillado.length > 0)
            sospechas.push(`${correo} (sin ${dato}) · ${nombre}: ${pillado.slice(0, 4).join(' ')}`);
        }
      }
    }
  }
  console.warn(`ROLES:\n${vistas.join('\n')}`);
  console.warn(`CIFRAS QUE NO TOCAN (${String(sospechas.length)}):\n${sospechas.join('\n')}`);
}, 3_600_000);
