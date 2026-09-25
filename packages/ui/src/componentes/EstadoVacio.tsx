import type { ReactNode } from 'react';
import type { NombreDelDibujo } from '../dibujos/catalogo.ts';
import { clases } from '../clases.ts';
import { Boton } from './Boton.tsx';
import { Dibujo } from './Dibujo.tsx';

/**
 * El estado vacio · Parte B4 del Plan.
 *
 * «`EstadoVacio` (**siempre con accion**)» · «Todo estado vacio lleva una frase
 * y un boton. **Nunca una pantalla en blanco**» · «Todos los widgets tienen su
 * version "todavía no tengo datos"» (criterio de terminado de M3).
 *
 * Por eso `frase` y `children` **no son opcionales en los tipos**: un estado
 * vacio sin frase no compila, y uno sin accion tampoco, salvo que se diga a
 * proposito con `sinAccionPorque`. Es la unica forma de que la regla se cumpla
 * dentro de un ano y de veinte pantallas.
 *
 * Y la frase no es «No hay datos». Dice **por que** no hay nada y **que pasaria**
 * si lo hubiera, que es lo unico que ayuda a quien acaba de entrar.
 *
 * ── El dibujo y el botón (entrega V, punto 4) ────────────────────────────────
 *
 * «Ilustración y un botón para dar el primer paso.» Desde la entrega V el dibujo
 * **es obligatorio**, por lo mismo que la frase: si fuera opcional, dentro de un
 * año habría vacíos con dibujo y vacíos con el icono de antes, y la aplicación
 * volvería a parecer de dos épocas. Los dibujos son una familia (`dibujos/`), se
 * cargan aparte y se pintan con las fichas, así que salen bien en los dos temas.
 *
 * Y **un botón, no tres**, que haga lo que dice: «Añade tu primer producto», no
 * «Empezar». Si hay otra salida razonable —«ponme unos ejemplos»— va como
 * `alternativa`, en texto y debajo, nunca como un segundo botón del mismo peso.
 */
export interface EstadoVacioProps {
  /** Que no hay, en una frase. Sin punto final si es un titulo corto. */
  readonly titulo: string;
  /** Por que no hay nada, y que se veria aqui cuando lo haya. */
  readonly frase: string;
  /** El dibujo de la familia que le toca. Obligatorio desde la entrega V. */
  readonly dibujo: NombreDelDibujo;
  /** El color del acento del dibujo, normalmente el de la app. Si no, el naranja. */
  readonly acento?: string;
  /** El boton. Uno, el que resuelve. */
  readonly accion?: ReactNode;
  /** Otra salida, discreta y debajo del botón: un enlace de texto, nunca otro botón. */
  readonly alternativa?: ReactNode;
  /**
   * Cuando de verdad no hay ninguna accion posible desde aqui, se dice por que.
   * Obliga a pensarlo en vez de dejarlo en blanco por pereza.
   */
  readonly sinAccionPorque?: string;
  /** Dentro de un widget pequeno, sin tanto aire. */
  readonly compacto?: boolean;
  /**
   * El título es el de la página entera (`<h1>`), no el de un trozo. Para las
   * páginas que son solo un vacío —la carta que no existe, «no llego al servidor»—:
   * toda página tiene su título principal, y así lo encuentra un lector de pantalla.
   */
  readonly esLaPagina?: boolean;
}

export function EstadoVacio({
  titulo,
  frase,
  dibujo,
  acento,
  accion,
  alternativa,
  sinAccionPorque,
  compacto = false,
  esLaPagina = false,
}: EstadoVacioProps) {
  const Titulo = esLaPagina ? 'h1' : 'p';
  return (
    <div
      className={clases(
        'flex flex-col items-center justify-center gap-e2 text-center',
        compacto ? 'py-e4 px-e3' : 'py-e6 px-e4',
      )}
    >
      <Dibujo nombre={dibujo} compacto={compacto} {...(acento === undefined ? {} : { acento })} />

      <Titulo className={clases('font-semibold', compacto ? 'text-cuerpo' : 'text-seccion')}>
        {titulo}
      </Titulo>

      <p className="max-w-[38ch] text-secundario text-texto-suave">{frase}</p>

      {accion !== undefined && (
        <div className="mt-e2 flex flex-col items-center gap-e1">
          {accion}
          {alternativa}
        </div>
      )}

      {accion === undefined && sinAccionPorque !== undefined && (
        <p className="mt-e1 max-w-[38ch] text-etiqueta text-texto-suave">{sinAccionPorque}</p>
      )}
    </div>
  );
}

/**
 * «Nada con eso» · el vacío de un filtro (entrega V, punto 4).
 *
 * **No es el vacío de verdad**, y no puede decir lo mismo: una lista vacía porque
 * no hay género y una lista vacía porque lo buscado no está son noticias distintas.
 * La primera invita a crear algo; esta **ofrece quitar el filtro**, que es lo único
 * que resuelve. Ofrecer «Añadir producto» aquí llevaría a dar de alta por segunda
 * vez algo que ya existe y no se ha sabido buscar.
 */
export interface NadaConEsoProps {
  /** Lo que se ha escrito, si se ha escrito algo: sale en el título. */
  readonly buscado?: string;
  /** Qué más se puede probar, en una frase. */
  readonly frase?: string;
  /** Quita lo que se ha escrito y lo que se ha elegido, y vuelve a la lista entera. */
  readonly alQuitar: () => void;
  /** Lo que dice el botón. «Quitar el filtro», si no se dice otra cosa. */
  readonly quitar?: string;
  readonly compacto?: boolean;
}

export function NadaConEso({
  buscado,
  frase,
  alQuitar,
  quitar = 'Quitar el filtro',
  compacto = true,
}: NadaConEsoProps) {
  const escrito = buscado?.trim() ?? '';
  return (
    <EstadoVacio
      compacto={compacto}
      dibujo="buscar"
      titulo={escrito === '' ? 'Nada con ese filtro' : `Nada con «${escrito}»`}
      frase={frase ?? 'Prueba con menos letras, o mira en todo.'}
      accion={
        <Boton tono="secundario" onClick={alQuitar}>
          {quitar}
        </Boton>
      }
    />
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
      dibujo="grafica"
      titulo={`${que}: todavía no tengo datos`}
      frase={queHabra}
      sinAccionPorque={`Esta pantalla se construye en ${modulo}. El esqueleto, la navegación y los permisos ya funcionan.`}
    />
  );
}
