import type { ReactNode } from 'react';
import { IconoVacio } from '@estook/iconos';
import { clases } from '../clases.ts';

/**
 * El estado vacio · Parte B4 del Plan.
 *
 * «`EstadoVacio` (**siempre con accion**)» · «Todo estado vacio lleva una frase
 * y un boton. **Nunca una pantalla en blanco**» · «Todos los widgets tienen su
 * version "todavia no tengo datos"» (criterio de terminado de M3).
 *
 * Por eso `frase` y `children` **no son opcionales en los tipos**: un estado
 * vacio sin frase no compila, y uno sin accion tampoco, salvo que se diga a
 * proposito con `sinAccionPorque`. Es la unica forma de que la regla se cumpla
 * dentro de un ano y de veinte pantallas.
 *
 * Y la frase no es «No hay datos». Dice **por que** no hay nada y **que pasaria**
 * si lo hubiera, que es lo unico que ayuda a quien acaba de entrar.
 */
export interface EstadoVacioProps {
  /** Que no hay, en una frase. Sin punto final si es un titulo corto. */
  readonly titulo: string;
  /** Por que no hay nada, y que se veria aqui cuando lo haya. */
  readonly frase: string;
  /** El boton. Uno, el que resuelve. */
  readonly accion?: ReactNode;
  /**
   * Cuando de verdad no hay ninguna accion posible desde aqui, se dice por que.
   * Obliga a pensarlo en vez de dejarlo en blanco por pereza.
   */
  readonly sinAccionPorque?: string;
  readonly icono?: ReactNode;
  /** Dentro de un widget pequeno, sin tanto aire. */
  readonly compacto?: boolean;
}

export function EstadoVacio({
  titulo,
  frase,
  accion,
  sinAccionPorque,
  icono,
  compacto = false,
}: EstadoVacioProps) {
  return (
    <div
      className={clases(
        'flex flex-col items-center justify-center gap-e2 text-center',
        compacto ? 'py-e5 px-e3' : 'py-e7 px-e4',
      )}
    >
      <span aria-hidden className="text-texto-tenue">
        {icono ?? <IconoVacio size={compacto ? 24 : 32} />}
      </span>

      <p className={clases('font-semibold', compacto ? 'text-cuerpo' : 'text-seccion')}>{titulo}</p>

      <p className="max-w-[38ch] text-secundario text-texto-suave">{frase}</p>

      {accion !== undefined && <div className="mt-e2">{accion}</div>}

      {accion === undefined && sinAccionPorque !== undefined && (
        <p className="mt-e1 max-w-[38ch] text-etiqueta text-texto-suave">{sinAccionPorque}</p>
      )}
    </div>
  );
}

/**
 * El estado vacio de una app que todavia no tiene su modulo.
 *
 * M3 monta el esqueleto de las ocho apps, y ninguna tiene datos: sus modulos
 * llegan de M6 en adelante. En vez de dejar ocho pantallas en blanco (que es
 * justo lo que M3 prohibe), cada una dice que va a haber ahi y en que modulo se
 * construye. Es honesto y es util: quien lo abre sabe que no esta roto.
 */
export interface TodaviaNoProps {
  readonly que: string;
  readonly queHabra: string;
  readonly modulo: string;
}

export function TodaviaNo({ que, queHabra, modulo }: TodaviaNoProps) {
  return (
    <EstadoVacio
      titulo={`${que}: todavia no tengo datos`}
      frase={queHabra}
      sinAccionPorque={`Esta pantalla se construye en ${modulo}. El esqueleto, la navegacion y los permisos ya funcionan.`}
    />
  );
}
