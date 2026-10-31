import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { LoQueSePasaPorLaCaja } from '@estook/dominio';
import { escucharAlSegundo, haySegundo } from '@estook/cliente-api/al-segundo';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { ElPlano, LaCartaDeLaSala, LaMesa } from '../datos/tipos.ts';
import {
  guardarLaCopia,
  guardarLaMesa,
  leerLaCopia,
  leerLaMesa,
  type LoQueSeGuarda,
} from '../sinInternet/laCopia.ts';
import {
  anadirALaCola,
  escucharLaCola,
  laCola,
  loQueEspera,
  type LineaGuardada,
} from '../sinInternet/laCola.ts';
import { estamosSinInternet } from '../sinInternet/laConexion.ts';
import { hayCaja, pasarLoQueFalta } from '../sinInternet/laCaja.ts';
import { elPlanoConLoGuardado, laMesaGuardada } from '../sinInternet/loGuardado.ts';

/**
 * Lo que la sala lee de la API y cómo se mantiene al día (0106).
 *
 * **Al segundo**: lo que cambia una mesa (la cocina tacha el último del 1.º, otro
 * camarero pide) llega como un toque por Supabase Realtime, y la pantalla vuelve a
 * preguntar. Sin el toque —sin red buena, sin Supabase en esta construcción— pregunta
 * cada pocos segundos. Con él, una vez por minuto por si acaso: una tablet preguntando
 * cada cinco segundos todo el servicio gastaría medio plan de Supabase al mes.
 */

/** Dónde está Supabase, para oír el toque; también lo usa la caja para Windows (0119). */
export const DONDE = {
  direccion: (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '',
  clavePublica: (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '',
};

const CADA_POCO = 8_000;
const POR_SI_ACASO = 60_000;

/** Lo que manda el servidor en el toque de la sala: `servicio:<local>`. */
function esDelServicio(canal: string): boolean {
  return canal.startsWith('servicio:');
}

/**
 * Escucha los toques de la sala mientras Estook TPV está abierto. Dice si llegan. Se
 * llama **una vez**, arriba (`ConElSegundo`): cada pantalla lo lee con `usarAlSegundo`,
 * y entrar y salir de una mesa no vuelve a conectar.
 */
export function usarEscucharAlSegundo(): boolean {
  const { aparato } = usarSesion();
  const cache = useQueryClient();
  const [conectado, setConectado] = useState(false);
  // El tema es **del aparato** (0107): cambiar de camarero no vuelve a conectar.
  const tema = aparato.temaAlSegundo;

  useEffect(() => {
    if (!haySegundo(DONDE) || tema === null) return undefined;
    const escucha = escucharAlSegundo(
      DONDE,
      tema,
      (canal) => {
        if (!esDelServicio(canal)) return;
        void cache.invalidateQueries({ queryKey: ['sala'] });
      },
      setConectado,
    );
    return () => {
      escucha.parar();
    };
  }, [tema, cache]);

  return conectado;
}

export const ContextoAlSegundo = createContext(false);

/** Si los toques llegan, para preguntar menos (`cadaCuanto`). */
export function usarAlSegundo(): boolean {
  return useContext(ContextoAlSegundo);
}

function cadaCuanto(conectado: boolean): number {
  return conectado ? POR_SI_ACASO : CADA_POCO;
}

async function leer<T>(
  cliente: ReturnType<typeof usarSesion>['cliente'],
  nombre: string,
  parametros: Record<string, string> = {},
  sinInternet?: { readonly guardar: (datos: T) => void; readonly loGuardado: () => T | undefined },
): Promise<T> {
  const respuesta = await cliente.consultar<T>(nombre, parametros);
  if (respuesta.ok) {
    sinInternet?.guardar(respuesta.datos);
    return respuesta.datos;
  }
  // **Sin internet, lo último que leyó el aparato** (T5 · 2 · 1): abre igual.
  if (respuesta.error.codigo === 'sin_conexion') {
    const guardado = sinInternet?.loGuardado();
    if (guardado !== undefined) return guardado;
  }
  throw new FalloDeLaSala(respuesta.error);
}

/** Lo de leer con su copia en el aparato (`laCopia.ts`). */
function conCopia<T>(que: LoQueSeGuarda) {
  return {
    guardar: (datos: T) => {
      guardarLaCopia(que, datos);
    },
    loGuardado: () => leerLaCopia<T>(que),
  };
}

/** Lo que espera a subir, al momento: la sala lo enseña aunque Estook aún no lo sepa. */
export function usarLaCola() {
  return useSyncExternalStore(escucharLaCola, laCola);
}

/** El fallo de la API, con lo que hay que decirle a la persona. */
export class FalloDeLaSala extends Error {
  constructor(readonly error: ErrorDeLaApi) {
    super(error.codigo);
  }
}

/** El plano, **con las mesas abiertas sin internet** (T5 · 2 · 1). */
export function usarElPlano(conectado: boolean) {
  const { cliente } = usarSesion();
  const cola = usarLaCola();
  const leido = useQuery({
    queryKey: ['sala', 'el_plano'],
    queryFn: () => leer<ElPlano>(cliente, 'el_plano', {}, conCopia<ElPlano>('el_plano')),
    refetchInterval: cadaCuanto(conectado),
  });
  const data = useMemo(
    () =>
      leido.data === undefined ? undefined : elPlanoConLoGuardado(leido.data, cola, Date.now()),
    [leido.data, cola],
  );
  return { ...leido, data };
}

/**
 * Una mesa. Sin internet, la que guardó el aparato al abrirla; y **la que se abrió sin
 * internet**, como la ve quien la abrió, hasta que Estook la conozca.
 */
export function usarLaMesa(cuentaId: string, conectado: boolean) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'la_mesa', cuentaId],
    queryFn: async () => {
      try {
        return await leer<LaMesa>(
          cliente,
          'la_mesa',
          { cuenta_id: cuentaId },
          {
            guardar: (datos) => {
              guardarLaMesa(cuentaId, datos);
            },
            loGuardado: () => leerLaMesa<LaMesa>(cuentaId),
          },
        );
      } catch (fallo) {
        const guardada = laMesaGuardada(
          cuentaId,
          laCola(),
          leerLaCopia<ElPlano>('el_plano'),
          Date.now(),
        );
        if (guardada !== undefined) return guardada;
        throw fallo;
      }
    },
    refetchInterval: cadaCuanto(conectado),
  });
}

export type DondeSale = 'pantalla' | 'papel' | 'las_dos';

/** **Cómo están las impresoras** (T5 · 1, 0119): para la franja de la sala y lo que se ofrece. */
export interface ComoEstanLasImpresoras {
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
  readonly hayParaLaCuenta: boolean;
  readonly hayParaLaComanda: boolean;
  readonly avisos: readonly {
    readonly impresora: string;
    readonly que: 'sin_papel' | 'no_responde' | 'no_sale';
    readonly sinSalir: number;
  }[];
}

/**
 * Se lee con la sala (su clave empieza por «sala»): el toque que avisa de un papel que no sale
 * la vuelve a leer, como a todo lo de la sala. Quien no toma nota no la necesita.
 */
export function usarLasImpresoras(conectado: boolean, tomaNota = true) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'como_estan_las_impresoras'],
    queryFn: () =>
      leer<ComoEstanLasImpresoras>(
        cliente,
        'como_estan_las_impresoras',
        {},
        conCopia<ComoEstanLasImpresoras>('impresoras'),
      ),
    refetchInterval: cadaCuanto(conectado),
    enabled: tomaNota,
  });
}

/** La carta cambia poco: cada dos minutos, para que un agotado se apague solo. */
export function usarLaCarta() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['carta_de_la_sala'],
    queryFn: () =>
      leer<LaCartaDeLaSala>(
        cliente,
        'la_carta_de_la_sala',
        {},
        conCopia<LaCartaDeLaSala>('la_carta'),
      ),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export type Resultado<T> =
  | { readonly ok: true; readonly datos: T }
  | {
      readonly ok: false;
      readonly error: ErrorDeLaApi;
    };

/**
 * **Lo que se puede hacer sin internet** (T5 · 2 · 1), y cómo se enseña mientras espera: lo
 * que se dice en «Por subir», la mesa, lo pedido, y lo que contesta en vez de Estook (lo que
 * esperaría quien lo pide). Lo que no lo trae, sin internet, dice que no hay conexión.
 */
export interface ComoSeGuarda<T> {
  readonly que: string;
  readonly cuentaId?: string;
  readonly lineas?: readonly LineaGuardada[];
  readonly respuesta: T;
  /**
   * **Lo que la cocina tiene que ver** (T5 · 2 · 2, 0123), armado con la clave de lo hecho: se
   * le pasa a la caja de centro, que lo imprime y se lo da a la pantalla de cocina.
   */
  readonly paraLaCaja?: (clave: string) => LoQueSePasaPorLaCaja | null;
}

/** Lo que contesta un comando guardado sin internet, para que la pantalla lo diga. */
export interface Guardado {
  readonly guardado: true;
  /** La caja de centro ya lo tiene: la cocina lo ha recibido (0123). */
  readonly porLaCaja?: true;
}

/**
 * Los comandos de la sala. Cada uno, al acabar bien, vuelve a leer la sala: lo que se
 * ve después es lo que dice la API, no lo que la pantalla supone.
 *
 * **Sin internet** (T5 · 2 · 1), lo que se puede hacer se guarda en el aparato con su clave y
 * sube al volver. **Mientras quede algo por subir, lo nuevo va detrás**: mandar una mesa que
 * Estook aún no sabe que se abrió no puede adelantarse a abrirla.
 */
export function usarAcciones() {
  const { cliente, yo, seSubeCon } = usarSesion();
  const cache = useQueryClient();
  return useCallback(
    async <T>(
      nombre: string,
      entrada: unknown,
      clave?: string,
      sinInternet?: ComoSeGuarda<T>,
    ): Promise<Resultado<T>> => {
      const laClave = clave ?? crypto.randomUUID();
      const guardar = async (): Promise<Resultado<T> | null> => {
        if (sinInternet === undefined) return null;
        const paraLaCaja = sinInternet.paraLaCaja?.(laClave) ?? null;
        anadirALaCola({
          id: laClave,
          nombre,
          entrada,
          hechoEn: Date.now(),
          quien: { id: yo.personaId, nombre: yo.nombre },
          con: seSubeCon,
          que: sinInternet.que,
          ...(sinInternet.cuentaId === undefined ? {} : { cuentaId: sinInternet.cuentaId }),
          ...(sinInternet.lineas === undefined ? {} : { lineas: sinInternet.lineas }),
          ...(paraLaCaja === null ? {} : { paraLaCaja }),
        });
        // Con la caja de centro, la cocina lo recibe ya: se espera a saberlo para decirlo.
        if (paraLaCaja !== null && hayCaja()) await pasarLoQueFalta();
        const enLaCaja = laCola().some((c) => c.id === laClave && c.enLaCaja === true);
        return {
          ok: true,
          datos: (enLaCaja
            ? { ...(sinInternet.respuesta as object), porLaCaja: true }
            : sinInternet.respuesta) as T,
        };
      };
      if (estamosSinInternet() || loQueEspera(laCola()).length > 0) {
        const guardado = await guardar();
        if (guardado !== null) return guardado;
      }
      const respuesta = await cliente.ejecutar<T>(nombre, entrada, {
        claveDeIdempotencia: laClave,
      });
      if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') {
        const guardado = await guardar();
        if (guardado !== null) return guardado;
      }
      if (respuesta.ok) await cache.invalidateQueries({ queryKey: ['sala'] });
      return respuesta.ok
        ? { ok: true, datos: respuesta.datos }
        : { ok: false, error: respuesta.error };
    },
    [cliente, cache, yo, seSubeCon],
  );
}
