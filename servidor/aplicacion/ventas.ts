import {
  diaDeLaSemana,
  elCorreoDeLaSemana,
  elLunes,
  elTableroDeVentas,
  esDeLosQuePagan,
  masDias,
  type ApunteDeDinero,
  type ComoEstaLaCuenta,
  type FechaOperativa,
  type FotoDeVentas,
  type PeriodoDeVentas,
  type TableroDeVentas,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { losClientes } from './consultas/clientes.ts';
import { correoDeVentasParaMandar } from './correos.ts';
import { apuntarElCobro, conStripe, elCatalogo, enNombreDelSistema, hoyEnMadrid } from './pago.ts';

/**
 * Las ventas de Estook (A4 · decisión 0077): lo que la API junta para el tablero, lo
 * cobrado de antes de A4, que se trae una vez, y el correo del lunes.
 *
 * **La cuenta la hace el dominio** (`elTableroDeVentas`); aquí solo se lee lo que
 * hay: los clientes como están hoy —con la misma lista que Clientes—, la foto de cada
 * noche, lo cobrado y lo devuelto, y las visitas de los enlaces. **Nada de dentro de
 * ningún restaurante.**
 */

/** El modo de Stripe que está puesto. Sin Stripe, el de prueba: no hay real sin clave. */
function elModo(contexto: Contexto): 'prueba' | 'real' {
  return contexto.pagos?.modo ?? 'prueba';
}

/** El tablero de un periodo, hasta `hoy`. Lo lee un admin, o el reloj para el correo. */
export async function lasVentas(
  contexto: Contexto,
  periodo: PeriodoDeVentas,
  hoy: FechaOperativa = hoyEnMadrid(contexto.ahora),
): Promise<TableroDeVentas> {
  const { clientes } = await losClientes(contexto);

  const fotos = await contexto.sql<
    {
      organizacion_id: string;
      dia: string;
      como: string;
      en_pausa: boolean | null;
      cuota_al_mes: number | null;
      de_la_casa: boolean | null;
      modo: string | null;
    }[]
  >`
    select organizacion_id, dia::text as dia, como, en_pausa, cuota_al_mes, de_la_casa, modo
      from plataforma.uso_diario
     where como is not null and dia <= ${hoy}::date
  `;

  const dinero = await contexto.sql<
    { organizacion_id: string; dia: string; importe: number; sin_iva: number; modo: string }[]
  >`
    select organizacion_id, to_char(cobrado_en at time zone 'Europe/Madrid', 'YYYY-MM-DD') as dia,
           importe, sin_iva, modo
      from plataforma.cobro
    union all
    select organizacion_id, to_char(devuelto_en at time zone 'Europe/Madrid', 'YYYY-MM-DD') as dia,
           -importe, -sin_iva, modo
      from plataforma.devolucion
  `;

  const visitas = await contexto.sql<
    { vendedor_id: string; vendedor: string; dia: string; visitas: number }[]
  >`
    select v.id as vendedor_id, v.nombre as vendedor, d.dia::text as dia, sum(d.visitas)::integer as visitas
      from plataforma.visita_del_codigo d
      join plataforma.codigo_de_vendedor c on c.id = d.codigo_id
      join plataforma.vendedor v on v.id = c.vendedor_id
     group by v.id, v.nombre, d.dia
  `;

  const modo = (valor: string | null) => (valor === 'real' || valor === 'prueba' ? valor : null);

  return elTableroDeVentas({
    periodo,
    hoy,
    modo: elModo(contexto),
    clientes: clientes.map((c) => ({
      id: c.organizacionId,
      nombre: c.nombre,
      alta: c.alta as FechaOperativa,
      como: c.como,
      enPausa: c.enPausa,
      actividad: c.actividad,
      cancelaAlAcabar: c.cancelaAlAcabar,
      diasSinEntrar: c.diasSinEntrar,
      esEjemplo: c.esEjemplo,
      deLaCasa: c.deLaCasa,
      modo: c.modo,
      cuotaAlMes: c.cuotaAlMes,
      origen: c.origen,
      vendedor: c.vendedor === null ? null : { id: c.vendedor.id, nombre: c.vendedor.nombre },
      // Ha elegido plan quien ha pasado por la página de pago de Stripe.
      eligioPlan: c.conStripe || esDeLosQuePagan(c),
    })),
    fotos: fotos.map((f): FotoDeVentas => ({
      organizacionId: f.organizacion_id,
      dia: f.dia as FechaOperativa,
      como: f.como as ComoEstaLaCuenta,
      enPausa: f.en_pausa === true,
      cuotaAlMes: f.cuota_al_mes,
      deLaCasa: f.de_la_casa === true,
      modo: modo(f.modo),
    })),
    dinero: dinero.map((d): ApunteDeDinero => ({
      organizacionId: d.organizacion_id,
      dia: d.dia as FechaOperativa,
      importe: d.importe,
      sinIva: d.sin_iva,
      modo: modo(d.modo) ?? 'prueba',
    })),
    visitas: visitas.map((v) => ({
      vendedorId: v.vendedor_id,
      vendedor: v.vendedor,
      dia: v.dia as FechaOperativa,
      visitas: v.visitas,
    })),
  });
}

// ── Lo cobrado de antes de A4, una vez (2A) ──────────────────────────────────

/**
 * **Una vez por modo de Stripe**, lo que A4 no pudo oír: los cobros de antes, y lo
 * que cobra cada suscripción que ya existía (el precio con el que se apuntó). Antes,
 * se prepara el catálogo, que le pide a Stripe el aviso nuevo de las devoluciones.
 * Lo hace el reloj; repetirlo no apunta nada dos veces.
 */
export async function traerLoCobradoDeAntes(contexto: Contexto): Promise<number> {
  const pagos = contexto.pagos;
  if (pagos === null) return 0;
  return enNombreDelSistema(contexto, async () => {
    const [stripe] = await contexto.sql<{ traidos: boolean }[]>`
      select cobros_traidos_en is not null as traidos from plataforma.stripe where modo = ${pagos.modo}
    `;
    if (stripe?.traidos === true) return 0;

    await elCatalogo(contexto);
    let apuntados = 0;
    for (const cobro of await conStripe(contexto, () => pagos.losCobros())) {
      if (await apuntarElCobro(contexto, cobro, pagos.modo)) apuntados += 1;
    }

    const sinCuota = await contexto.sql<{ organizacion_id: string; stripe_suscripcion: string }[]>`
      select c.organizacion_id, c.stripe_suscripcion
        from estook.los_clientes() c
       where c.stripe_suscripcion is not null and c.stripe_modo = ${pagos.modo}
         and not exists (select 1 from plataforma.cuota_de_stripe q where q.organizacion_id = c.organizacion_id)
    `;
    for (const s of sinCuota) {
      const suscripcion = await conStripe(contexto, () =>
        pagos.leerSuscripcion(s.stripe_suscripcion),
      );
      if (suscripcion.importe !== null) {
        await contexto.sql`
          select plataforma.apuntar_la_cuota_de_stripe(
            ${s.organizacion_id}::uuid, ${suscripcion.importe}::integer, ${pagos.modo}
          )
        `;
      }
    }

    await contexto.sql`update plataforma.stripe set cobros_traidos_en = now() where modo = ${pagos.modo}`;
    return apuntados;
  });
}

// ── El correo del lunes (4A) ─────────────────────────────────────────────────

/**
 * El correo de la semana, **una vez por semana**, a cada admin vivo: el lunes (o el
 * martes, si el lunes el reloj no pudo). La semana es la de lunes a domingo. Si no
 * sale, se deja sin apuntar para que lo intente el latido siguiente. Ya dentro del
 * sistema. Devuelve a cuántos ha ido.
 */
export async function mandarElCorreoDelLunes(
  contexto: Contexto,
  hoy: FechaOperativa,
): Promise<number> {
  const correo = contexto.correo;
  if (correo === null || diaDeLaSemana(hoy) > 2) return 0;
  const lunes = elLunes(hoy);

  const admins = await contexto.sql<{ correo: string; nombre: string }[]>`
    select correo, nombre from plataforma.los_correos_de_los_admins()
  `;
  if (admins.length === 0) return 0;

  const nuevo = await contexto.sql<{ lunes: string }[]>`
    insert into plataforma.correo_de_ventas (lunes, a_cuantos)
    values (${lunes}::date, ${admins.length})
    on conflict (lunes) do nothing
    returning lunes::text
  `;
  if (nuevo.length === 0) return 0;

  try {
    // La semana que acaba de terminar: de lunes a domingo.
    const tablero = await lasVentas(contexto, '7', masDias(lunes, -1));
    const semana = elCorreoDeLaSemana(tablero);
    for (const admin of admins) {
      await correo.mandar(correoDeVentasParaMandar(admin.correo, admin.nombre, semana));
    }
    return admins.length;
  } catch (fallo) {
    await contexto.sql`delete from plataforma.correo_de_ventas where lunes = ${lunes}::date`;
    throw fallo;
  }
}
