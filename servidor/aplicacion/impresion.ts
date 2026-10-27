import {
  esAlergeno,
  fechaEnElLocal,
  horaEnElLocal,
  laComandaEnPapel,
  laCuentaEnPapel,
  type Alergeno,
  type LineaDeLaComanda,
  type PapelCompuesto,
  type PaseDeLaComanda,
  type QueSaleEnLaComanda,
} from '@estook/dominio';
import { tocarLaCaja } from './al-segundo.ts';
import type { Contexto } from './contrato.ts';
import { enNombreDelSistema } from './pago.ts';
import { enUnPuntoDeGuardado } from './punto-de-guardado.ts';
import { elTituloDeLaCuenta, lasCuentas, losPases, losPlatos, type FilaDeLinea } from './sala.ts';

/**
 * **Lo que la sala deja en la cola de impresión** (T5 · 1, decisión 0119; Anexo 6.5).
 *
 * Al mandar, marchar, quitar algo ya mandado, devolver un plato o anular la mesa, el comando de
 * la sala llama aquí. Si la cocina (o la barra) trabaja en papel, se compone su papel —una vez,
 * en el formato intermedio— y se deja para la impresora que lo imprime; la caja lo recoge al
 * oír el toque. **La impresión nunca para el servicio** (Anexo 6.7, regla 4): si no hay
 * impresora, no se deja nada y la sala sigue igual.
 */

export type DondeSale = 'pantalla' | 'papel' | 'las_dos';
export type Sitio = 'cocina' | 'barra';

export interface LoDelLocalParaImprimir {
  readonly nombre: string;
  readonly zonaHoraria: string;
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
}

export async function loDelLocalParaImprimir(
  contexto: Contexto,
  localId: string,
): Promise<LoDelLocalParaImprimir | null> {
  const filas = await contexto.sql<
    { nombre: string; zona_horaria: string; cocina_sale_en: DondeSale; barra_sale_en: DondeSale }[]
  >`
    select nombre, zona_horaria, cocina_sale_en, barra_sale_en
      from estook.local where id = ${localId}::uuid
  `;
  const local = filas[0];
  if (local === undefined) return null;
  return {
    nombre: local.nombre,
    zonaHoraria: local.zona_horaria,
    cocinaSaleEn: local.cocina_sale_en,
    barraSaleEn: local.barra_sale_en,
  };
}

/** Si lo de ese sitio sale en papel. */
export function saleEnPapel(local: LoDelLocalParaImprimir, sitio: Sitio): boolean {
  const donde = sitio === 'cocina' ? local.cocinaSaleEn : local.barraSaleEn;
  return donde !== 'pantalla';
}

/** La impresora que imprime eso en el local: la primera que se dio de alta. */
export async function laImpresoraDe(
  contexto: Contexto,
  localId: string,
  imprime: Sitio | 'caja',
): Promise<string | null> {
  const filas = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.impresora
     where local_id = ${localId}::uuid and retirada_en is null
       and ${imprime} = any (imprime)
     order by creada_en
     limit 1
  `;
  return filas[0]?.id ?? null;
}

/** El nombre del aparato desde el que se pide, para el pie («Comandero · Móvil de Lucía»). */
async function elNombreDelAparato(contexto: Contexto): Promise<string> {
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (terminalId === null) return 'Estook';
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ nombre: string }[]>`
      select nombre from estook.terminal where id = ${terminalId}::uuid
    `,
  );
  return filas[0]?.nombre ?? 'Estook TPV';
}

/** Deja un papel en la cola. Devuelve su id. */
export async function dejarEnLaCola(
  contexto: Contexto,
  localId: string,
  impresoraId: string,
  tipo: 'comanda' | 'precuenta' | 'prueba' | 'cajon',
  papel: PapelCompuesto,
  cuentaId: string | null,
): Promise<string> {
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.trabajo_de_impresion
      (local_id, impresora_id, tipo, papel, cuenta_id, pedido_por, desde_terminal, creado_en)
    values (${localId}::uuid, ${impresoraId}::uuid, ${tipo}, ${JSON.stringify(papel)}::text::jsonb,
            ${cuentaId}::uuid, ${contexto.personaId}::uuid,
            ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
            ${contexto.ahora.toISOString()}::timestamptz)
    returning id::text as id
  `;
  await tocarLaCaja(contexto, localId);
  const id = filas[0]?.id;
  if (id === undefined) throw new Error('El trabajo de impresión no se guardó.');
  return id;
}

function comoLineaDelPapel(l: FilaDeLinea): LineaDeLaComanda {
  return {
    cantidad: l.cantidad,
    nombre: l.nombre,
    opciones: l.opciones.map((o) => o.nombre),
    nota: l.nota,
    pesoGramos: l.peso_gramos,
    alergenos: l.alergenos,
  };
}

export interface LoQueSaleEnLaComanda {
  readonly que: QueSaleEnLaComanda;
  /** Los platos que lleva este papel (lo nuevo, lo del pase que se marcha, lo anulado). */
  readonly lineaIds: readonly string[];
  readonly motivo?: string | null;
  readonly quien?: string | null;
  readonly copia?: boolean;
}

/**
 * **La comanda en papel** de una mesa, para cada sitio que trabaja en papel y tiene su
 * impresora: un trabajo por sitio (Anexo 6.5, «Varias impresoras»). Devuelve cuántos dejó.
 */
export async function laComandaALaCola(
  contexto: Contexto,
  localId: string,
  cuentaId: string,
  lo: LoQueSaleEnLaComanda,
): Promise<number> {
  if (lo.lineaIds.length === 0) return 0;
  const local = await loDelLocalParaImprimir(contexto, localId);
  if (local === null) return 0;
  const sitios = (['cocina', 'barra'] as const).filter((s) => saleEnPapel(local, s));
  if (sitios.length === 0) return 0;

  const [cuenta] = await lasCuentas(contexto, localId, [cuentaId]);
  if (cuenta === undefined) return 0;
  const [platos, pases] = await Promise.all([
    losPlatos(contexto, [cuentaId]),
    losPases(contexto, [cuentaId]),
  ]);
  const cuales = new Set(lo.lineaIds);
  const marchado = new Map(pases.map((p) => [p.numero, p.marchado_en !== null]));
  const aparato = await elNombreDelAparato(contexto);
  const alergias = cuenta.alergias.filter((a): a is Alergeno => esAlergeno(a));

  let dejados = 0;
  for (const sitio of sitios) {
    const lineas = platos.filter((l) => cuales.has(l.id) && l.destino === sitio);
    if (lineas.length === 0) continue;
    const impresoraId = await laImpresoraDe(contexto, localId, sitio);
    if (impresoraId === null) continue;

    // La cocina, por pases y en su orden; la barra, todo junto.
    const porPase = new Map<number | null, FilaDeLinea[]>();
    for (const l of lineas) {
      const pase = sitio === 'cocina' ? l.pase : null;
      porPase.set(pase, [...(porPase.get(pase) ?? []), l]);
    }
    const pasesDelPapel: PaseDeLaComanda[] = [...porPase.entries()]
      .sort(([a], [b]) => (a ?? 0) - (b ?? 0))
      .map(([numero, ls]) => ({
        numero,
        espera: numero !== null && marchado.get(numero) !== true,
        lineas: ls.map(comoLineaDelPapel),
      }));

    const papel = laComandaEnPapel({
      sitio,
      que: lo.que,
      copia: lo.copia === true,
      mesa: elTituloDeLaCuenta(cuenta),
      personas: cuenta.personas,
      camarero: cuenta.camarero,
      hora: horaEnElLocal(contexto.ahora, local.zonaHoraria),
      alergiasDeLaMesa: alergias,
      notaDeLaMesa: lo.que === 'nueva' ? cuenta.nota_para_cocina : null,
      pases: pasesDelPapel,
      motivo: lo.motivo ?? null,
      quien: lo.quien ?? null,
      aparato,
    });
    await dejarEnLaCola(contexto, localId, impresoraId, 'comanda', papel, cuentaId);
    dejados += 1;
  }
  return dejados;
}

/**
 * **Lo que manda la sala, al papel, sin parar el servicio** (Anexo 6.7, regla 4): en su propio
 * punto de guardado, para que si algo falla al dejar el papel —una impresora quitada a la vez,
 * por ejemplo— el pedido, la marcha o lo anulado se guarden igual. Lo usan los comandos de la
 * sala; lo que pide imprimir alguien a propósito (la cuenta, la prueba) sí dice si falla.
 */
export async function alPapelSinPararElServicio(
  contexto: Contexto,
  localId: string,
  cuentaId: string,
  lo: LoQueSaleEnLaComanda,
): Promise<void> {
  if (lo.lineaIds.length === 0) return;
  try {
    await enUnPuntoDeGuardado(contexto, (aparte) =>
      laComandaALaCola(aparte, localId, cuentaId, lo),
    );
  } catch {
    // La sala sigue: la franja de «no sale» lo dirá si la impresora no recibe nada.
  }
}

/** El nombre de pila de quien hace algo, para «Lo quita Lucía». */
export async function elNombreDeQuien(contexto: Contexto): Promise<string | null> {
  if (contexto.personaId === null) return null;
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${contexto.personaId}::uuid
  `;
  const nombre = filas[0]?.nombre ?? null;
  return nombre === null ? null : (nombre.trim().split(/\s+/)[0] ?? nombre);
}

/** «27/10/2026 15:10», en la hora del local. */
export function cuandoEnElLocal(instante: Date, zonaHoraria: string): string {
  const [anio = '', mes = '', dia = ''] = fechaEnElLocal(instante, zonaHoraria).split('-');
  return `${dia}/${mes}/${anio} ${horaEnElLocal(instante, zonaHoraria)}`;
}

/**
 * **La cuenta en papel** (la precuenta, Anexo 3.5): lo pedido que no se ha quitado, cada
 * línea con su importe. Las de un menú van con su menú: sus platos no cobran aparte, salvo
 * su suplemento.
 */
export async function laCuentaALaCola(
  contexto: Contexto,
  localId: string,
  cuentaId: string,
  copia: boolean,
): Promise<string | null> {
  const local = await loDelLocalParaImprimir(contexto, localId);
  if (local === null) return null;
  const impresoraId = await laImpresoraDe(contexto, localId, 'caja');
  if (impresoraId === null) return null;
  const [cuenta] = await lasCuentas(contexto, localId, [cuentaId]);
  if (cuenta === undefined) return null;
  const platos = (await losPlatos(contexto, [cuentaId])).filter((l) => l.quitada_en === null);

  const lineas = platos
    .filter((l) => l.precio_centimos !== 0 || l.parte_de === null)
    .map((l) => ({
      cantidad: l.cantidad,
      nombre: l.parte_de === null ? l.nombre : `  ${l.nombre}`,
      importeCentimos: l.precio_centimos * l.cantidad,
    }));
  const total = lineas.reduce((suma, l) => suma + l.importeCentimos, 0);
  const papel = laCuentaEnPapel({
    local: local.nombre,
    mesa: elTituloDeLaCuenta(cuenta),
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    cuando: cuandoEnElLocal(contexto.ahora, local.zonaHoraria),
    lineas,
    totalCentimos: total,
    copia,
  });
  return dejarEnLaCola(contexto, localId, impresoraId, 'precuenta', papel, cuentaId);
}
