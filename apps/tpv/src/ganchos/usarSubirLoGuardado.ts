import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ClienteApi } from '@estook/cliente-api';
import { tokenDelAparato } from '@estook/dominio';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { DentroDelTpv } from '../datos/tipos.ts';
import {
  apuntarElFallo,
  escucharLaCola,
  laCola,
  loQueEspera,
  loQueFaltaPasar,
  pasarAlTurno,
  quitarDeLaCola,
  seEnsena,
} from '../sinInternet/laCola.ts';
import {
  avisarDeLaVuelta,
  escucharLaConexion,
  estamosSinInternet,
} from '../sinInternet/laConexion.ts';
import { subirLaCola, type Mandar } from '../sinInternet/subir.ts';
import { escucharLaCaja, hayCaja, pasarLoQueFalta } from '../sinInternet/laCaja.ts';

/**
 * **Subir lo guardado** (T5 · 2 · 1): en cuanto Estook contesta otra vez, y cada quince segundos
 * mientras quede algo, por si el aviso no llega. **Una subida a la vez**: si ya hay una, se
 * espera a esa.
 *
 * También antes de que entre alguien con su PIN: entrar echa a quien estaba, y lo suyo
 * guardado tiene que subir antes, con su turno.
 */

let enMarcha: Promise<void> | null = null;

export function subirLoGuardado(
  llave: string,
  alEntrar: (entradaId: string, dentro: DentroDelTpv) => void,
): Promise<void> {
  if (enMarcha !== null) return enMarcha;
  if (loQueEspera(laCola()).length === 0) return Promise.resolve();
  const clientes = new Map<string | null, ClienteApi>();
  const mandar: Mandar = (turno, nombre, entrada, clave, haceMs, porLaCaja) => {
    let cliente = clientes.get(turno);
    if (cliente === undefined) {
      cliente = crearClienteDelTpv({
        token: () => (turno === null ? null : tokenDelAparato(turno, llave)),
      });
      clientes.set(turno, cliente);
    }
    return cliente.ejecutar(nombre, entrada, {
      claveDeIdempotencia: clave,
      hechoHaceMs: haceMs,
      ...(porLaCaja ? { porLaCaja: true } : {}),
    });
  };
  enMarcha = (async () => {
    try {
      const antes = laCola();
      // Se cuenta lo que se enseña: entrar y bloquear también suben, pero no son del servicio.
      const seCuenta = new Set(antes.filter(seEnsena).map((c) => c.id));
      let subidas = 0;
      let fallidas = 0;
      await subirLaCola(antes, mandar, () => Date.now(), {
        subida: (id) => {
          if (seCuenta.has(id)) subidas += 1;
          quitarDeLaCola(id);
        },
        fallo: (id, porque) => {
          fallidas += 1;
          apuntarElFallo(id, porque);
        },
        entro: (entradaId, dentro) => {
          pasarAlTurno(entradaId, dentro.turno);
          alEntrar(entradaId, dentro);
        },
      });
      if (subidas + fallidas > 0) avisarDeLaVuelta({ subidas, fallidas });
    } finally {
      enMarcha = null;
    }
  })();
  return enMarcha;
}

const CADA = 15_000;
const CADA_A_LA_CAJA = 5_000;

export function usarSubirLoGuardado(
  llave: string,
  alEntrar: (entradaId: string, dentro: DentroDelTpv) => void,
): () => Promise<void> {
  const cache = useQueryClient();
  const cola = useSyncExternalStore(escucharLaCola, laCola);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  const entrar = useRef(alEntrar);
  entrar.current = alEntrar;
  const esperan = loQueEspera(cola).length;

  const subir = useCallback(async () => {
    await subirLoGuardado(llave, (entradaId, dentro) => {
      entrar.current(entradaId, dentro);
    });
    // Lo que se ve es lo que dice Estook: con lo subido, se vuelve a leer la sala.
    await cache.invalidateQueries({ queryKey: ['sala'] });
  }, [llave, cache]);

  useEffect(() => {
    if (!sinInternet && esperan > 0) void subir();
  }, [sinInternet, esperan, subir]);

  // **Lo que aún no tiene la caja de centro** (0123): se le vuelve a pasar cada poco, sin
  // internet, para que la cocina lo reciba en cuanto se llegue a ella.
  const conCaja = useSyncExternalStore(escucharLaCaja, hayCaja);
  const faltanEnLaCaja = loQueFaltaPasar(cola).length;
  useEffect(() => {
    if (!conCaja || faltanEnLaCaja === 0) return undefined;
    void pasarLoQueFalta();
    const reloj = window.setInterval(() => {
      void pasarLoQueFalta();
    }, CADA_A_LA_CAJA);
    return () => {
      window.clearInterval(reloj);
    };
  }, [conCaja, faltanEnLaCaja]);

  useEffect(() => {
    if (esperan === 0) return undefined;
    const reloj = window.setInterval(() => {
      void subir();
    }, CADA);
    return () => {
      window.clearInterval(reloj);
    };
  }, [esperan, subir]);

  return subir;
}
