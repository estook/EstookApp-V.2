import { z } from 'zod';
import {
  elPaseHaSalido,
  horaDeCorte,
  jornadaDe,
  fechaOperativa,
  laJornadaEntera,
  laMesaEnCocina,
  loSiguienteDeLaMesa,
  losPasesDelMenu,
  LAS_PAGINAS_DE_SIEMPRE,
  LO_MAS_PEDIDO,
  laPaginaDeSiempre,
  loQueProponeElNombre,
  loQueValeEnElBoton,
  type ColorDeLaBotonera,
  type LaMesaEnCocina,
  type LoSiguiente,
  type PaseDeLaBotonera,
  type QuienLoPrepara,
} from '@estook/dominio';
import { laBotoneraGuardada, loMasPedido } from '../botonera.ts';
import { losGruposDeLosPlatos } from '../opciones.ts';
import { lasSalasDibujadas, type MesaDibujada, type SalaDibujada } from './plano.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { lasSeccionesDeLosMenus, losMenusDelLocal, losPlatosDelDia } from '../menus.ts';
import { losPlatos as losPlatosDeLaCarta } from './mi-carta.ts';
import {
  comoPaseDeLaMesa,
  comoPlatoDeLaMesa,
  elLocalDelServicio,
  elTituloDeLaCuenta,
  laJornadaDeHoy,
  lasCuentas,
  losPases,
  losPlatos,
  type FilaDeCuenta,
  type FilaDeLinea,
  type FilaDePase,
} from '../sala.ts';

/**
 * Lo que se lee de la sala y la cocina (M20A · 1, decisión 0106).
 *
 *   el_plano    las zonas y sus mesas, cada una con cómo va
 *   la_mesa     una cuenta con sus platos, sus pases y lo siguiente que toca
 *   la_cocina   las mesas en marcha, esperando o fuera, **sin un solo importe**
 *   la_carta_de_la_sala  lo que se pide: la carta por secciones y los menús de hoy
 *
 * Lo de cada mesa sale del dominio (`sala.ts`): la sala y la cocina no pueden decir
 * cosas distintas porque las calcula la misma función.
 */

const MINUTO = 60_000;

function minutosDesde(contexto: Contexto, desde: string | null): number | null {
  if (desde === null) return null;
  return Math.max(0, Math.floor((contexto.ahora.getTime() - new Date(desde).getTime()) / MINUTO));
}

/** Las cuentas abiertas del local: las que tienen la mesa ocupada. */
async function lasAbiertas(contexto: Contexto, localId: string): Promise<string[]> {
  const filas = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.cuenta
     where local_id = ${localId}::uuid and liberada_en is null and anulada_en is null
     order by abierta_en
  `;
  return filas.map((f) => f.id);
}

function porCuenta<T extends { cuenta_id: string }>(filas: readonly T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const fila of filas) mapa.set(fila.cuenta_id, [...(mapa.get(fila.cuenta_id) ?? []), fila]);
  return mapa;
}

/** Lo que vale la cuenta: lo pedido y no quitado, con IVA, como en la carta. */
function elTotal(platos: readonly FilaDeLinea[]): number {
  return platos
    .filter((l) => l.quitada_en === null)
    .reduce((total, l) => total + l.precio_centimos * l.cantidad, 0);
}

function lasIniciales(nombre: string | null): string | null {
  if (nombre === null) return null;
  const partes = nombre.trim().split(/\s+/);
  // «Sara» es «SA», como «Ana» es «AN»: una sola letra no se distingue en el plano.
  if (partes.length === 1) return (partes[0] ?? '').slice(0, 2).toUpperCase();
  return partes
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

// ═══ El plano ═════════════════════════════════════════════════════════════════

/** Libre; sentados y sin pedir; comiendo; ha salido el pase y toca marchar; con algo sin mandar. */
export type EstadoDeLaMesa = 'libre' | 'sin_pedir' | 'comiendo' | 'toca_marchar' | 'por_mandar';

export interface CuentaEnElPlano {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly camareroId: string | null;
  readonly iniciales: string | null;
  readonly esMia: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  /** Para las opciones de la mesa desde el plano, sin tener que abrirla. */
  readonly porPases: boolean;
  readonly notaParaCocina: string | null;
  readonly loSiguiente: LoSiguiente;
  /** Su camarero ha fichado la salida: «Ana ha fichado la salida» (Anexo 11.8). */
  readonly suCamareroSeHaIdo: boolean;
}

export interface SalidaElPlano {
  /**
   * Las salas como se dibujaron en el TPV (T2, `lasSalasDibujadas`): cada mesa con su
   * forma, su tamaño y su giro, y lo que hay en la sala y no se abre.
   */
  readonly zonas: readonly (Omit<SalaDibujada, 'mesas'> & {
    readonly mesas: readonly (MesaDibujada & {
      readonly estado: EstadoDeLaMesa;
      readonly cuenta: CuentaEnElPlano | null;
    })[];
  })[];
  /** Si quien está en este aparato puede dibujar la sala: el lápiz de arriba (Anexo 11.9). */
  readonly puedeDibujar: boolean;
  /** La barra y lo de llevar: abierto y sin mesa. */
  readonly sinMesa: readonly CuentaEnElPlano[];
  /** «Mesa 6 · ha salido todo el 1.º»: lo que toca marchar ahora. */
  readonly tocaMarchar: readonly {
    readonly cuentaId: string;
    readonly titulo: string;
    readonly pase: number;
    /** El pase que ha salido entero: «ha salido todo el 1.º». */
    readonly salioEl: number;
  }[];
  /** Quién toma nota en el local: a quién se le pueden pasar las mesas. */
  readonly camareros: readonly { readonly id: string; readonly nombre: string }[];
}

function enElPlano(
  contexto: Contexto,
  cuenta: FilaDeCuenta,
  platos: readonly FilaDeLinea[],
  pases: readonly FilaDePase[],
  seHanIdo: ReadonlySet<string> = new Set(),
): CuentaEnElPlano {
  return {
    cuentaId: cuenta.id,
    titulo: elTituloDeLaCuenta(cuenta),
    tipo: cuenta.tipo,
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    camareroId: cuenta.camarero_id,
    iniciales: lasIniciales(cuenta.camarero),
    esMia: cuenta.camarero_id !== null && cuenta.camarero_id === contexto.personaId,
    minutos: minutosDesde(contexto, cuenta.abierta_en) ?? 0,
    totalCentimos: elTotal(platos),
    porPases: cuenta.por_pases,
    notaParaCocina: cuenta.nota_para_cocina,
    loSiguiente: loSiguienteDeLaMesa(platos.map(comoPlatoDeLaMesa), pases.map(comoPaseDeLaMesa)),
    suCamareroSeHaIdo: cuenta.camarero_id !== null && seHanIdo.has(cuenta.camarero_id),
  };
}

/** El pase de cocina más alto antes de este, que es el que acaba de salir. */
function elDeAntes(platos: readonly FilaDeLinea[], pase: number): number {
  const antes = platos
    .filter(
      (l) => l.destino === 'cocina' && l.pase !== null && l.pase < pase && l.quitada_en === null,
    )
    .map((l) => l.pase as number);
  return antes.length === 0 ? pase - 1 : Math.max(...antes);
}

function elEstado(cuenta: CuentaEnElPlano | null): EstadoDeLaMesa {
  if (cuenta === null) return 'libre';
  if (cuenta.loSiguiente.que === 'pedir') return 'sin_pedir';
  if (cuenta.loSiguiente.que === 'marchar') return 'toca_marchar';
  if (cuenta.loSiguiente.que === 'mandar') return 'por_mandar';
  return 'comiendo';
}

export const elPlano = consulta<Record<string, never>, SalidaElPlano>({
  nombre: 'el_plano',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const salas = await lasSalasDibujadas(contexto, localId);
    const dibuja = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('accion.ajustes_del_tpv', ${localId}::uuid) as puede
    `;
    const ids = await lasAbiertas(contexto, localId);
    const cuentas = await lasCuentas(contexto, localId, ids);
    const camareros = await contexto.sql<{ id: string; nombre: string }[]>`
      select p.id::text as id, p.nombre
        from estook.persona p
       where p.id in (select estook.quien_lleva_el_servicio(${localId}::uuid))
         and estook.nivel_de_permiso(p.id, ${localId}::uuid, 'accion.tomar_nota')::text = 'ver_y_editar'
       order by p.nombre
    `;
    const platos = porCuenta(await losPlatos(contexto, ids));
    const pases = porCuenta(await losPases(contexto, ids));
    const idos = await contexto.sql<{ persona_id: string }[]>`
      select estook.han_fichado_la_salida(${localId}::uuid)::text as persona_id
    `;
    const seHanIdo = new Set(idos.map((f) => f.persona_id));
    const enPlano = cuentas.map((c) => ({
      fila: c,
      cuenta: enElPlano(contexto, c, platos.get(c.id) ?? [], pases.get(c.id) ?? [], seHanIdo),
    }));
    const porMesa = new Map(
      enPlano.filter((c) => c.fila.mesa_id !== null).map((c) => [c.fila.mesa_id, c.cuenta]),
    );

    return {
      zonas: salas.map((sala) => ({
        ...sala,
        mesas: sala.mesas.map((m) => {
          const cuenta = porMesa.get(m.id) ?? null;
          return { ...m, estado: elEstado(cuenta), cuenta };
        }),
      })),
      // En la caja o en la tablet de todos, con el permiso; en el móvil de nadie.
      puedeDibujar: dibuja[0]?.puede === true && contexto.sesion?.aparato?.esPersonal !== true,
      sinMesa: enPlano.filter((c) => c.fila.mesa_id === null).map((c) => c.cuenta),
      tocaMarchar: enPlano.flatMap((c) =>
        c.cuenta.loSiguiente.que === 'marchar'
          ? [
              {
                cuentaId: c.cuenta.cuentaId,
                titulo: c.cuenta.titulo,
                pase: c.cuenta.loSiguiente.pase,
                salioEl: elDeAntes(platos.get(c.fila.id) ?? [], c.cuenta.loSiguiente.pase),
              },
            ]
          : [],
      ),
      camareros,
    };
  },
});

// ═══ Una mesa ═════════════════════════════════════════════════════════════════

export type EstadoDelPlato =
  'sin_mandar' | 'en_espera' | 'en_marcha' | 'salio' | 'en_la_barra' | 'quitado';

export interface PlatoDeLaCuenta {
  readonly id: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  readonly parteDe: string | null;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioCentimos: number;
  readonly destino: string;
  readonly pase: number | null;
  readonly nota: string | null;
  readonly estado: EstadoDelPlato;
  readonly salioEn: string | null;
  readonly motivoDeQuitar: string | null;
  readonly vuelve: string | null;
  /** Lo elegido (T3 · 2): «Patatas», «Doble de queso». */
  readonly opciones: readonly string[];
  /** Lo que pesó, si se vende a peso. */
  readonly pesoGramos: number | null;
}

export interface SalidaLaMesa {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly mesaId: string | null;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly porPases: boolean;
  readonly notaParaCocina: string | null;
  readonly abierta: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly platos: readonly PlatoDeLaCuenta[];
  readonly pases: readonly {
    readonly numero: number;
    readonly marchadoEn: string | null;
    readonly haSalido: boolean;
  }[];
  readonly loSiguiente: LoSiguiente;
}

function elEstadoDelPlato(linea: FilaDeLinea, pases: readonly FilaDePase[]): EstadoDelPlato {
  if (linea.quitada_en !== null) return 'quitado';
  if (linea.mandada_en === null) return 'sin_mandar';
  if (linea.destino !== 'cocina') return 'en_la_barra';
  if (linea.salio_en !== null) return 'salio';
  const pase = pases.find((p) => p.numero === linea.pase);
  return pase?.marchado_en === null || pase === undefined ? 'en_espera' : 'en_marcha';
}

export const laMesa = consulta<{ cuenta_id: string }, SalidaLaMesa>({
  nombre: 'la_mesa',
  entrada: z.object({ cuenta_id: z.string().uuid() }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const [cuenta] = await lasCuentas(contexto, localId, [entrada.cuenta_id]);
    if (cuenta === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa mesa no está en este local.' });
    }
    const platos = await losPlatos(contexto, [cuenta.id]);
    const pases = await losPases(contexto, [cuenta.id]);
    const enElDominio = platos.map(comoPlatoDeLaMesa);
    return {
      cuentaId: cuenta.id,
      titulo: elTituloDeLaCuenta(cuenta),
      tipo: cuenta.tipo,
      mesaId: cuenta.mesa_id,
      personas: cuenta.personas,
      camarero: cuenta.camarero,
      porPases: cuenta.por_pases,
      notaParaCocina: cuenta.nota_para_cocina,
      abierta: cuenta.liberada_en === null && cuenta.anulada_en === null,
      minutos: minutosDesde(contexto, cuenta.abierta_en) ?? 0,
      totalCentimos: elTotal(platos),
      platos: platos.map((l) => ({
        id: l.id,
        platoId: l.plato_id,
        menuId: l.menu_id,
        parteDe: l.parte_de,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioCentimos: l.precio_centimos,
        destino: l.destino,
        pase: l.pase,
        nota: l.nota,
        estado: elEstadoDelPlato(l, pases),
        salioEn: l.salio_en,
        motivoDeQuitar: l.motivo_de_quitar,
        vuelve: l.motivo_de_vuelve,
        opciones: l.opciones.map((o) => o.nombre),
        pesoGramos: l.peso_gramos,
      })),
      pases: pases.map((p) => ({
        numero: p.numero,
        marchadoEn: p.marchado_en,
        haSalido: elPaseHaSalido(enElDominio, p.numero),
      })),
      loSiguiente: loSiguienteDeLaMesa(enElDominio, pases.map(comoPaseDeLaMesa)),
    };
  },
});

// ═══ La cocina ════════════════════════════════════════════════════════════════

export interface PlatoEnCocina {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly nota: string | null;
  readonly delMenu: boolean;
  readonly salioEn: string | null;
  /** Pedido después de mandar la mesa: «NUEVO». */
  readonly nuevo: boolean;
  /** Su nota cambió después de mandarlo: «CAMBIO». */
  readonly cambio: boolean;
  /** Se quitó ya en cocina: «ANULADO». */
  readonly anulado: boolean;
  /** Se devolvió y se rehace: «VUELVE», con su motivo. */
  readonly vuelve: string | null;
  /** Lo elegido (T3 · 2): la guarnición, los extras. */
  readonly opciones: readonly string[];
  readonly pesoGramos: number | null;
}

export interface TarjetaDeCocina {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly notaParaCocina: string | null;
  readonly porPases: boolean;
  readonly estado: LaMesaEnCocina;
  /** La anuló un jefe: la cocina deja de hacerla. Va a «Fuera» con su motivo. */
  readonly anulada: string | null;
  readonly llegoEn: string;
  /** Desde la llegada, o desde la última marcha si la hubo. */
  readonly minutos: number;
  readonly ultimaMarcha: string | null;
  readonly fueraEn: string | null;
  readonly pases: readonly {
    readonly numero: number;
    readonly marchadoEn: string | null;
    readonly fueraEn: string | null;
    readonly platos: readonly PlatoEnCocina[];
  }[];
}

export interface SalidaLaCocina {
  readonly enMarcha: readonly TarjetaDeCocina[];
  readonly esperando: readonly TarjetaDeCocina[];
  readonly fuera: readonly TarjetaDeCocina[];
}

/** El principio de la jornada de hoy, con la hora de corte del local (M16a). */
async function elPrincipioDeHoy(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}::uuid
  `;
  const local = filas[0];
  if (local === undefined) throw new FalloDeAplicacion('local_ajeno');
  const corte = horaDeCorte(local.hora_de_corte);
  const hoy = jornadaDe(contexto.ahora, local.zona_horaria, corte);
  return laJornadaEntera(hoy, local.zona_horaria, corte).empieza.toISOString();
}

function laTarjeta(
  contexto: Contexto,
  cuenta: FilaDeCuenta,
  platos: readonly FilaDeLinea[],
  pases: readonly FilaDePase[],
): TarjetaDeCocina | null {
  const deCocina = platos.filter((l) => l.destino === 'cocina' && l.mandada_en !== null);
  if (deCocina.length === 0) return null;
  const anulada = cuenta.anulada_en === null ? null : (cuenta.motivo_de_anular ?? '');
  const estado =
    anulada === null
      ? laMesaEnCocina(platos.map(comoPlatoDeLaMesa), pases.map(comoPaseDeLaMesa))
      : 'fuera';
  const llegoEn = deCocina.map((l) => l.mandada_en as string).sort()[0] as string;
  const marchas = pases.flatMap((p) => (p.marchado_en === null ? [] : [p.marchado_en])).sort();
  const ultimaMarcha = marchas.length > 1 ? (marchas[marchas.length - 1] ?? null) : null;
  const fueras = pases.flatMap((p) => (p.fuera_en === null ? [] : [p.fuera_en])).sort();
  const numeros = [...new Set(deCocina.map((l) => l.pase as number))].sort((a, b) => a - b);
  return {
    cuentaId: cuenta.id,
    titulo: elTituloDeLaCuenta(cuenta),
    tipo: cuenta.tipo,
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    notaParaCocina: cuenta.nota_para_cocina,
    porPases: cuenta.por_pases,
    estado,
    anulada,
    llegoEn,
    minutos: minutosDesde(contexto, ultimaMarcha ?? llegoEn) ?? 0,
    ultimaMarcha,
    fueraEn:
      anulada !== null
        ? cuenta.anulada_en
        : estado === 'fuera'
          ? (fueras[fueras.length - 1] ?? null)
          : null,
    pases: numeros.map((numero) => {
      const pase = pases.find((p) => p.numero === numero);
      return {
        numero,
        marchadoEn: pase?.marchado_en ?? null,
        fueraEn: pase?.fuera_en ?? null,
        // Sin precio: la cocina no recibe un importe, tampoco en la respuesta (Anexo 3.2).
        platos: deCocina
          .filter((l) => l.pase === numero)
          .map((l) => ({
            id: l.id,
            nombre: l.nombre,
            cantidad: l.cantidad,
            nota: l.nota,
            delMenu: l.parte_de !== null,
            salioEn: l.salio_en,
            nuevo: l.mandada_en !== null && l.mandada_en > llegoEn,
            cambio: l.nota_cambiada_en !== null,
            anulado: l.quitada_en !== null,
            vuelve: l.motivo_de_vuelve,
            opciones: l.opciones.map((o) => o.nombre),
            pesoGramos: l.peso_gramos,
          })),
      };
    }),
  };
}

export const laCocina = consulta<Record<string, never>, SalidaLaCocina>({
  nombre: 'la_cocina',
  entrada: z.object({}).strict(),
  exige: 'accion.cocinar',
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const desde = await elPrincipioDeHoy(contexto, localId);
    // Las abiertas, y las de hoy ya liberadas o anuladas, para «Fuera»: una mesa anulada
    // no desaparece sin más, la cocina la ve anulada y sabe que deja de hacerla.
    const filas = await contexto.sql<{ id: string }[]>`
      select c.id::text as id
        from estook.cuenta c
       where c.local_id = ${localId}::uuid
         and ((c.liberada_en is null and c.anulada_en is null) or c.abierta_en >= ${desde}::timestamptz)
         and c.unida_a is null
         and exists (
           select 1 from estook.linea_de_cuenta l
            where l.cuenta_id = c.id and l.destino = 'cocina' and l.mandada_en is not null
         )
       order by c.abierta_en
    `;
    const ids = filas.map((f) => f.id);
    const cuentas = await lasCuentas(contexto, localId, ids);
    const platos = porCuenta(await losPlatos(contexto, ids));
    const pases = porCuenta(await losPases(contexto, ids));
    const tarjetas = cuentas.flatMap((c) => {
      const t = laTarjeta(contexto, c, platos.get(c.id) ?? [], pases.get(c.id) ?? []);
      return t === null ? [] : [t];
    });
    // Lo que va tarde, arriba: el que más lleva esperando primero.
    const enMarcha = tarjetas
      .filter((t) => t.estado === 'en_marcha')
      .sort((a, b) => b.minutos - a.minutos);
    return {
      enMarcha,
      esperando: tarjetas.filter((t) => t.estado === 'esperando'),
      fuera: tarjetas
        .filter((t) => t.estado === 'fuera')
        .sort((a, b) => (b.fueraEn ?? '').localeCompare(a.fueraEn ?? '')),
    };
  },
});

// ═══ La carta de la sala ══════════════════════════════════════════════════════

export interface PlatoDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly miniatura: string | null;
  readonly agotado: boolean;
  /** Los puestos a mano y los que trae su receta, juntos: la sala no distingue. */
  readonly alergenos: readonly string[];
  /** Lo que vale en su botón: lo suyo, o lo de su página (T3, Anexo 11.11). */
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly color: ColorDeLaBotonera | null;
  /** Lo que se pregunta al pedirlo (T3 · 2): la guarnición, los extras, el «¿Con qué?». */
  readonly grupos: readonly GrupoParaPedir[];
  /** Se vende a peso: su precio es el del kilo, y al pedirlo se dice cuánto pesa. */
  readonly aPeso: boolean;
}

export interface GrupoParaPedir {
  readonly id: string;
  readonly nombre: string;
  readonly minimo: number;
  readonly maximo: number;
  readonly opciones: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly precioCentimos: number;
  }[];
}

/** Una página de la botonera; sin montar, una sección de la carta (T3). */
export interface PaginaDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  /** Qué pestaña se marca sola al abrirla (Anexo 11.10). */
  readonly pase: PaseDeLaBotonera;
  /** «Pan y agua» o «Cafés» (0112): no es la que se abre sola al sentarse. */
  readonly deSiempre: 'pan' | 'cafes' | null;
  readonly platos: readonly PlatoDeLaSala[];
}

export interface MenuDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly entraPan: boolean;
  readonly entraCafe: boolean;
  readonly secciones: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly esPostre: boolean;
    readonly esBebida: boolean;
    /** En qué pase sale lo de esta sección; nulo, a la barra (`losPasesDelMenu`). */
    readonly pase: number | null;
    readonly platos: readonly {
      readonly platoId: string;
      readonly nombre: string;
      readonly suplementoCentimos: number;
      readonly agotado: boolean;
    }[];
  }[];
}

export interface SalidaLaCartaDeLaSala {
  readonly hoy: string;
  /** Si la botonera está montada; sin montar, una página por sección de la carta. */
  readonly montada: boolean;
  /** Las páginas de la botonera, en su orden; sin platos, no salen. */
  readonly paginas: readonly PaginaDeLaSala[];
  /** Lo fijado y lo más vendido a esta hora en cuatro semanas (Anexo 11.10). */
  readonly loMasPedido: readonly PlatoDeLaSala[];
  /** Los menús que se sirven hoy, con precio y lo que vale hoy (M10 · 2). */
  readonly menus: readonly MenuDeLaSala[];
}

/** Del 1 (lunes) al 7 (domingo), como `menu.dias`. */
function elDiaDeLaSemana(fecha: string): number {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export const laCartaDeLaSala = consulta<Record<string, never>, SalidaLaCartaDeLaSala>({
  nombre: 'la_carta_de_la_sala',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    // La jornada, no el calendario: la cena que acaba a la una es del menú del día de antes.
    const hoy = fechaOperativa(await laJornadaDeHoy(contexto, localId));
    const [secciones, platos, sirve, menus, botonera, masPedido, grupos, aPeso] = await Promise.all(
      [
        contexto.sql<{ id: string; nombre: string }[]>`
        select id::text as id, nombre from estook.seccion_de_carta
         where local_id = ${localId}::uuid
         order by orden, nombre
      `,
        losPlatosDeLaCarta(contexto, localId),
        contexto.sql<{ sirve: boolean | null }[]>`
        select sirve_menus as sirve from estook.local where id = ${localId}::uuid
      `,
        losMenusDelLocal(contexto, localId),
        laBotoneraGuardada(contexto, localId),
        loMasPedido(contexto, localId),
        losGruposDeLosPlatos(contexto, localId),
        contexto.sql<{ id: string }[]>`
        select id::text as id from estook.plato where local_id = ${localId}::uuid and a_peso
      `,
      ],
    );
    const aPesoIds = new Set(aPeso.map((f) => f.id));

    // Lo que se pide de la carta: activo, en la carta y con precio. Lo agotado sale
    // apagado, para que el camarero lo vea y no lo ofrezca (M10 · 1).
    const deLaCarta = platos.filter((p) => p.activo && p.enLaCarta && p.precioCentimos !== null);
    const agotados = new Set(platos.filter((p) => p.agotado !== null).map((p) => p.id));
    const comoDeLaSala = (
      p: (typeof platos)[number],
      vale: {
        readonly quienLoPrepara: QuienLoPrepara;
        readonly pase: PaseDeLaBotonera;
        readonly color: ColorDeLaBotonera | null;
      },
    ): PlatoDeLaSala => ({
      id: p.id,
      nombre: p.nombre,
      precioCentimos: p.precioCentimos ?? 0,
      miniatura: p.miniatura,
      agotado: p.agotado !== null,
      alergenos: [...new Set([...p.alergenos, ...p.alergenosDeLaReceta])],
      ...vale,
      // Lo que gasta cada opción no sale de aquí: la sala solo ve su nombre y su precio.
      grupos: (grupos.get(p.id) ?? []).map((g) => ({
        id: g.id,
        nombre: g.nombre,
        minimo: g.minimo,
        maximo: g.maximo,
        opciones: g.opciones.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          precioCentimos: o.precioCentimos,
        })),
      })),
      aPeso: aPesoIds.has(p.id),
    });

    const montada = botonera.camino !== null;
    let paginas: PaginaDeLaSala[];
    if (montada) {
      // **La botonera manda**: sus páginas, en su orden, y en cada una sus botones, que
      // apuntan a su plato de la carta (precio, foto y agotado son los de la carta).
      const porId = new Map(deLaCarta.map((p) => [p.id, p]));
      paginas = botonera.paginas
        .map((g) => ({
          id: g.id,
          nombre: g.nombre,
          color: g.color,
          pase: g.pase,
          deSiempre: g.deSiempre,
          platos: botonera.botones
            .filter((b) => b.paginaId === g.id)
            .flatMap((b) => {
              const plato = porId.get(b.platoId);
              if (plato === undefined) return [];
              return [
                comoDeLaSala(plato, {
                  ...loQueValeEnElBoton(g, b),
                  color: b.color ?? g.color,
                }),
              ];
            }),
        }))
        .filter((g) => g.platos.length > 0);
    } else {
      // Sin montar, la carta como hasta T3: una página por sección, con lo que propone su
      // nombre; el pan y el agua, en «Pan y agua», y los cafés, en «Cafés», como en
      // cualquier TPV (0112); lo que no tiene sección, en «Sin sección».
      const deLaSeccion = (nombre: string) => ({ ...loQueProponeElNombre(nombre), color: null });
      const nombreDeLaSeccion = new Map(secciones.map((x) => [x.id, x.nombre]));
      const deSiempre = (p: (typeof deLaCarta)[number]) =>
        laPaginaDeSiempre(
          p.nombre,
          p.seccionId === null ? null : (nombreDeLaSeccion.get(p.seccionId) ?? null),
        );
      const lasDeSiempre = (tipo: 'pan' | 'cafes'): PaginaDeLaSala => {
        const g = LAS_PAGINAS_DE_SIEMPRE[tipo];
        const vale = { quienLoPrepara: g.quienLoPrepara, pase: g.pase, color: null };
        return {
          id: `de-siempre-${tipo}`,
          nombre: g.nombre,
          color: null,
          pase: g.pase,
          deSiempre: tipo,
          platos: deLaCarta.filter((p) => deSiempre(p) === tipo).map((p) => comoDeLaSala(p, vale)),
        };
      };
      const queda = deLaCarta.filter((p) => deSiempre(p) === null);
      paginas = [
        lasDeSiempre('pan'),
        ...secciones.map((s) => {
          const vale = deLaSeccion(s.nombre);
          return {
            id: s.id,
            nombre: s.nombre,
            color: null,
            pase: vale.pase,
            deSiempre: null,
            platos: queda.filter((p) => p.seccionId === s.id).map((p) => comoDeLaSala(p, vale)),
          };
        }),
      ];
      const vale = deLaSeccion('');
      const sueltos = queda.filter((p) => p.seccionId === null).map((p) => comoDeLaSala(p, vale));
      if (sueltos.length > 0) {
        paginas.push({
          id: 'sin-seccion',
          nombre: 'Sin sección',
          color: null,
          pase: '1',
          deSiempre: null,
          platos: sueltos,
        });
      }
      paginas.push(lasDeSiempre('cafes'));
      paginas = paginas.filter((g) => g.platos.length > 0);
    }

    // «Lo más pedido»: lo fijado primero, y después lo más vendido a esta hora; solo lo que
    // está en la botonera (o en la carta, sin montar).
    const enPaginas = new Map(paginas.flatMap((g) => g.platos.map((p) => [p.id, p] as const)));
    const fijados = botonera.botones.filter((b) => b.fijado).map((b) => b.platoId);
    const loMasPedidoAhora = [...new Set([...fijados, ...masPedido])]
      .flatMap((id) => {
        const plato = enPaginas.get(id);
        return plato === undefined ? [] : [plato];
      })
      .slice(0, Math.max(LO_MAS_PEDIDO.cuantos, fijados.length));

    // Los menús de hoy: el del día si hoy se sirve, y los otros siempre; con precio.
    const hoyEs = elDiaDeLaSemana(hoy);
    const queSeSirven =
      sirve[0]?.sirve === true
        ? menus.filter(
            (m) =>
              m.precioCentimos !== null &&
              (m.clase !== 'del_dia' || m.diasQueSeSirve.includes(hoyEs)),
          )
        : [];
    const seccionesDeLosMenus = await lasSeccionesDeLosMenus(
      contexto,
      queSeSirven.map((m) => m.id),
    );
    const delMenu: MenuDeLaSala[] = [];
    for (const menu of queSeSirven) {
      const susSecciones = seccionesDeLosMenus.filter((s) => s.menuId === menu.id && s.incluida);
      const pases = losPasesDelMenu(susSecciones);
      const losDeHoy = await losPlatosDelDia(contexto, menu.id, hoy);
      if (losDeHoy.length === 0) continue;
      delMenu.push({
        id: menu.id,
        nombre: menu.nombre,
        precioCentimos: menu.precioCentimos ?? 0,
        entraPan: menu.entraPan,
        entraCafe: menu.entraCafe,
        secciones: susSecciones.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          esPostre: s.esPostre,
          esBebida: s.esBebida,
          pase: pases.get(s.id) ?? null,
          platos: losDeHoy
            .filter((p) => p.seccionId === s.id)
            .map((p) => ({
              platoId: p.platoId,
              nombre: p.nombre,
              suplementoCentimos: p.suplementoCentimos,
              agotado: agotados.has(p.platoId),
            })),
        })),
      });
    }
    return { hoy, montada, paginas, loMasPedido: loMasPedidoAhora, menus: delMenu };
  },
});
