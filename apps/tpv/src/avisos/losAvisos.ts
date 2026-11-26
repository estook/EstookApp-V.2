import type { CuentaEnElPlano } from '../datos/tipos.ts';
import type { ComoEstanLasImpresoras } from '../ganchos/usarLaSala.ts';
import { HORAS_PARA_AVISAR, llevaDemasiado } from '../logica/comoVaLaMesa.ts';
import { cuantoLlevan, eurosConSimbolo } from '../logica/texto.ts';
import { minutosHasta, susMesas, type AvisoDeReserva } from '../reservas/logica.ts';

/**
 * **Los avisos del TPV** (el rediseño, entrega 2 · 2, decisión 0148; maqueta aprobada el 18-nov):
 * lo que antes salía en franjas sueltas encima de la sala, junto y con su color, su icono y el botón
 * que lo resuelve. Salen arriba a la derecha, **como mucho tres**, y **se quedan en la campana**
 * hasta que alguien los atiende. Cinco clases, y nada más («un compañero, no un policía»):
 *
 *   · **la cocina llama** (azul, 0116): «Ya voy»
 *   · **efectivo por cobrar** (ámbar, 0145), solo en la caja: «Cobrar», con el PIN de quien cobra
 *   · **la impresora** (rojo, 0119): sin papel, no responde o papeles sin salir; «Ver» en la caja
 *   · **mesa abierta más de 6 horas** (rojo), solo al encargado: «Ver»
 *   · **retirar** (ámbar, E2, 0152), solo en la caja y a quien la lleva: el cajón pasa de la cifra del
 *     local; «Retirar» abre el cajón ya rellenado para la caja fuerte
 *   · **las reservas** (violeta, la Ampliación 5 · 1, 0153): una nueva de la web o de otro aparato,
 *     «llegan en 10 minutos» y «llevan 15 de retraso»; «Ver» abre Reservas
 *
 * Cálculo puro: qué avisos hay ahora y en qué orden. Pintarlos, sonar y vibrar es de `LosAvisos`.
 */
export type ClaseDeAviso =
  'cocina' | 'efectivo' | 'impresora' | 'seis_horas' | 'retirar' | 'reserva';

export type LoQueHace =
  | { readonly tipo: 'ya_voy'; readonly cuentaId: string }
  | { readonly tipo: 'ir'; readonly donde: string };

export interface AvisoDelTpv {
  /** Cambia si el aviso es otro: una llamada nueva a la misma mesa vuelve a salir. */
  readonly id: string;
  readonly clase: ClaseDeAviso;
  readonly titulo: string;
  readonly detalle: string;
  /** El botón que lo resuelve; sin él, el aviso solo se mira (la impresora, fuera de la caja). */
  readonly boton: { readonly texto: string; readonly hace: LoQueHace } | null;
  /** De una mesa de quien está: el móvil vibra. */
  readonly mio: boolean;
}

export function losAvisosDeAhora({
  cuentas,
  impresoras,
  enLaCaja,
  esEncargado,
  retirar,
  reservas = [],
}: {
  readonly cuentas: readonly CuentaEnElPlano[];
  readonly impresoras: ComoEstanLasImpresoras['avisos'];
  readonly enLaCaja: boolean;
  readonly esEncargado: boolean;
  /**
   * El cajón pasa de la cifra (E2, 0152), como lo dice `la_caja`. `vez` cuenta lo ya sacado: si se
   * retira y vuelve a pasar, es otro aviso y vuelve a salir aunque el de antes se quitara de la vista.
   */
  readonly retirar?: {
    readonly turnoId: string;
    readonly desde: number;
    readonly vez: number;
  } | null;
  /** Los de las reservas (0153), ya contados (`losAvisosDeLasReservas`), con la hora de ahora. */
  readonly reservas?: readonly (AvisoDeReserva & { readonly ahora: number })[];
}): readonly AvisoDelTpv[] {
  const cocina = cuentas
    .filter((c) => c.cocinaLlamaEn !== null)
    // Las mías primero: es a mí a quien llaman.
    .sort((a, b) => Number(b.esMia) - Number(a.esMia))
    .map((c): AvisoDelTpv => ({
      id: `cocina:${c.cuentaId}:${c.cocinaLlamaEn ?? ''}`,
      clase: 'cocina',
      titulo: `Cocina llama · ${c.titulo}`,
      detalle: c.esMia ? 'Te llaman a ti' : `Llaman a ${c.camarero ?? 'su camarero'}`,
      boton: { texto: 'Ya voy', hace: { tipo: 'ya_voy', cuentaId: c.cuentaId } },
      mio: c.esMia,
    }));

  const efectivo = enLaCaja
    ? cuentas.flatMap((c) =>
        (c.pendientes ?? []).map((p): AvisoDelTpv => ({
          id: `efectivo:${p.id}`,
          clase: 'efectivo',
          titulo: `Efectivo por cobrar · ${eurosConSimbolo(p.enEfectivo)}`,
          detalle: `${c.titulo} · lo ha dejado ${p.por}`,
          boton: { texto: 'Cobrar', hace: { tipo: 'ir', donde: `cobro/${p.id}` } },
          mio: false,
        })),
      )
    : [];

  const papel = impresoras.map((a): AvisoDelTpv => ({
    id: `impresora:${a.impresora}:${a.que}`,
    clase: 'impresora',
    titulo:
      a.que === 'sin_papel'
        ? `Sin papel · ${a.impresora}`
        : a.que === 'no_responde'
          ? `${a.impresora} no responde`
          : `${a.sinSalir === 1 ? '1 papel' : `${String(a.sinSalir)} papeles`} sin salir · ${a.impresora}`,
    detalle:
      a.que === 'sin_papel'
        ? 'Cambia el rollo: lo que falta sale solo'
        : a.que === 'no_responde'
          ? 'Mira que esté encendida y conectada'
          : 'Saldrán en cuanto responda',
    boton: enLaCaja ? { texto: 'Ver', hace: { tipo: 'ir', donde: 'ajustes/impresoras' } } : null,
    mio: false,
  }));

  const seis = esEncargado
    ? cuentas.filter(llevaDemasiado).map((c): AvisoDelTpv => ({
        id: `seis_horas:${c.cuentaId}`,
        clase: 'seis_horas',
        titulo: `${c.titulo}, abierta hace ${cuantoLlevan(c.minutos)}`,
        detalle: `Más de ${String(HORAS_PARA_AVISAR)} h · ${eurosConSimbolo(c.totalCentimos)} sin cobrar`,
        boton: { texto: 'Ver', hace: { tipo: 'ir', donde: `mesa/${c.cuentaId}` } },
        mio: false,
      }))
    : [];

  const caja = retirar ?? null;
  const fuerte: AvisoDelTpv[] =
    enLaCaja && caja !== null
      ? [
          {
            id: `retirar:${caja.turnoId}:${String(caja.vez)}`,
            clase: 'retirar',
            titulo: `El cajón pasa de ${eurosConSimbolo(caja.desde).replace(',00', '')}`,
            detalle: 'Lleva lo que sobra a la caja fuerte',
            boton: { texto: 'Retirar', hace: { tipo: 'ir', donde: 'caja/retirar' } },
            mio: false,
          },
        ]
      : [];

  const deReservas = reservas.map((a): AvisoDelTpv => {
    const r = a.reserva;
    const quien = `${r.nombre} · ${String(r.comensales)}`;
    const mesas = r.mesas.length === 0 ? 'sin mesa' : `Mesa ${susMesas(r)}`;
    const faltan = minutosHasta(r, a.ahora);
    return {
      id: a.id,
      clase: 'reserva',
      titulo:
        a.que === 'nueva'
          ? `Reserva nueva · ${r.hora} ${quien}`
          : a.que === 'llegan'
            ? `Llegan en ${String(Math.max(faltan, 1))}' · ${quien}`
            : a.que === 'cancelada'
              ? `Cancelada · ${r.hora} ${quien}`
              : `Llevan ${String(-faltan)}' de retraso · ${quien}`,
      detalle:
        a.que === 'retraso'
          ? `${mesas} · si no vienen, libérala`
          : a.que === 'cancelada'
            ? r.canceladaPor === 'sin_confirmar'
              ? 'No confirmó a tiempo · mesa libre'
              : 'La canceló el cliente · mesa libre'
            : `${mesas}${r.origen === 'web' ? ' · web' : ''}`,
      boton: { texto: 'Ver', hace: { tipo: 'ir', donde: 'reservas' } },
      mio: false,
    };
  });

  return [...cocina, ...efectivo, ...fuerte, ...deReservas, ...papel, ...seis];
}

/** Los que salen arriba: como mucho tres, sin los que se han quitado de la vista. */
export function losQueSalen(
  avisos: readonly AvisoDelTpv[],
  quitados: ReadonlySet<string>,
): readonly AvisoDelTpv[] {
  return avisos.filter((a) => !quitados.has(a.id)).slice(0, 3);
}
