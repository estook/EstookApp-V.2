import type { CuentaEnElPlano } from '../datos/tipos.ts';
import type { ComoEstanLasImpresoras } from '../ganchos/usarLaSala.ts';
import { HORAS_PARA_AVISAR, llevaDemasiado } from '../logica/comoVaLaMesa.ts';
import { cuantoLlevan, eurosConSimbolo } from '../logica/texto.ts';

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
 *
 * Cálculo puro: qué avisos hay ahora y en qué orden. Pintarlos, sonar y vibrar es de `LosAvisos`.
 */
export type ClaseDeAviso = 'cocina' | 'efectivo' | 'impresora' | 'seis_horas' | 'retirar';

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

  return [...cocina, ...efectivo, ...fuerte, ...papel, ...seis];
}

/** Los que salen arriba: como mucho tres, sin los que se han quitado de la vista. */
export function losQueSalen(
  avisos: readonly AvisoDelTpv[],
  quitados: ReadonlySet<string>,
): readonly AvisoDelTpv[] {
  return avisos.filter((a) => !quitados.has(a.id)).slice(0, 3);
}
