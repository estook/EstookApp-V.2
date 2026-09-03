import type { ReactNode } from 'react';
import { IconoAtencion, IconoBien, IconoCerrar, IconoInfo, IconoMal } from '@estook/iconos';
import type { ErrorDeEstook } from '@estook/dominio';
import { clases } from '../clases.ts';
import { Boton } from './Boton.tsx';

/**
 * El aviso y el error en cristiano · Parte B4 del Plan.
 *
 * «Los colores de estado **nunca van solos**: siempre con icono o con texto,
 * porque hay gente que no distingue rojo de verde» (B1). Aqui van con los dos:
 * icono y texto. Nunca se puede pintar un aviso solo de color.
 *
 * «Todo error dice **que ha pasado, que se puede hacer y con que boton**» (B4).
 * El catalogo de M2 ya trae las tres cosas escritas, asi que `ErrorEnCristiano`
 * no redacta nada: coge el error del catalogo y lo pinta. Es lo que impide que
 * acaben apareciendo mensajes sueltos escritos con prisa.
 */
export type TonoDeAviso = 'bien' | 'atencion' | 'mal' | 'info';

const TONOS: Record<TonoDeAviso, { fondo: string; texto: string; Icono: typeof IconoInfo }> = {
  bien: { fondo: 'bg-bien-suave border-bien/25', texto: 'text-bien', Icono: IconoBien },
  atencion: {
    fondo: 'bg-atencion-suave border-atencion/25',
    texto: 'text-atencion',
    Icono: IconoAtencion,
  },
  mal: { fondo: 'bg-mal-suave border-mal/25', texto: 'text-mal', Icono: IconoMal },
  info: { fondo: 'bg-info-suave border-info/25', texto: 'text-info', Icono: IconoInfo },
};

export interface AvisoProps {
  readonly tono?: TonoDeAviso;
  readonly titulo: string;
  readonly children?: ReactNode;
  /** El boton que lo resuelve, si lo hay. */
  readonly accion?: ReactNode;
  readonly alCerrar?: () => void;
  /**
   * Marca el aviso como algo que acaba de pasar, para que un lector de pantalla
   * lo lea sin que haya que ir a buscarlo (B8: «aria-live para los avisos»).
   */
  readonly esNoticia?: boolean;
}

export function Aviso({
  tono = 'info',
  titulo,
  children,
  accion,
  alCerrar,
  esNoticia = false,
}: AvisoProps) {
  const { fondo, texto, Icono } = TONOS[tono];

  return (
    <div
      // `alert` interrumpe; `status` espera a que el lector acabe la frase. Lo
      // segundo casi siempre, y por eso es lo que sale por defecto.
      {...(esNoticia ? { role: tono === 'mal' ? 'alert' : 'status', 'aria-live': 'polite' } : {})}
      className={clases(
        'flex items-start gap-e3 rounded-medio border p-e3',
        // Se desliza y colapsa su hueco al cerrarse (B6): el hueco lo quita
        // quien lo deja de pintar; aqui solo entra suave.
        'anima-aparece',
        fondo,
      )}
    >
      <Icono size={20} className={clases('mt-[2px] shrink-0', texto)} />

      <div className="flex min-w-0 flex-1 flex-col gap-e2">
        {/*
          El titulo lleva el color del estado. Puede, porque los cuatro colores
          llegan a 4,5:1 sobre su fondo suave desde que se oscurecieron en M3. Y
          no va solo: delante esta el icono, como manda B1.
        */}
        <p className={clases('text-cuerpo font-semibold', texto)}>{titulo}</p>
        {children !== undefined && <div className="text-secundario text-texto">{children}</div>}
        {accion !== undefined && <div className="flex flex-wrap gap-e2">{accion}</div>}
      </div>

      {alCerrar !== undefined && (
        <button
          type="button"
          onClick={alCerrar}
          aria-label={`Cerrar el aviso: ${titulo}`}
          className="grid size-toque shrink-0 place-items-center -m-e2 rounded-medio text-texto-suave hover:bg-superficie/60"
        >
          <IconoCerrar size={18} />
        </button>
      )}
    </div>
  );
}

/**
 * Un error del catalogo de M2, pintado.
 *
 * No recibe texto: recibe el error. Todo lo que se lee viene del catalogo, que
 * es cerrado. Si un error no esta ahi, no existe, y eso es a proposito.
 */
export interface ErrorEnCristianoProps {
  readonly error: ErrorDeEstook | ErrorDeLaApi;
  /** Que hacer cuando se pulsa el boton que trae el error. */
  readonly alActuar?: (accion: string) => void;
}

/** Lo mismo que devuelve la API. Se escribe aqui para no depender del cliente. */
export interface ErrorDeLaApi {
  readonly codigo: string;
  readonly quePasa: string;
  readonly queSePuedeHacer: string;
  readonly boton: { readonly texto: string; readonly accion: string } | null;
  /**
   * Lo que el servidor anade **sobre este caso concreto**, cuando lo sabe.
   *
   * El catalogo de errores da una frase general por codigo, y esta bien: sirve
   * para los cien sitios donde puede saltar. Pero cuando el servidor sabe algo
   * mas —«necesita al menos diez caracteres»— esa frase concreta viaja en
   * `detalle.porque` y **se estaba tirando a la basura**.
   *
   * El resultado era una pantalla que mentia: una contrasena demasiado corta
   * decia «Falta algo por rellenar. Los campos que faltan estan marcados
   * debajo», sin marcar ninguno, porque no faltaba ninguno. Quien lo leia
   * revisaba los campos llenos una y otra vez.
   */
  readonly detalle?: Record<string, unknown>;
}

/** La frase concreta del servidor, si la trae y es texto. */
function loConcreto(error: ErrorDeEstook | ErrorDeLaApi): string | null {
  const detalle = (error as ErrorDeLaApi).detalle;
  const porque = detalle?.['porque'];
  return typeof porque === 'string' && porque.trim() !== '' ? porque : null;
}

export function ErrorEnCristiano({ error, alActuar }: ErrorEnCristianoProps) {
  return (
    <Aviso
      tono="mal"
      titulo={error.quePasa}
      esNoticia
      accion={
        error.boton !== null && alActuar !== undefined ? (
          <Boton
            tono="secundario"
            onClick={() => {
              alActuar(error.boton?.accion ?? '');
            }}
          >
            {error.boton.texto}
          </Boton>
        ) : undefined
      }
    >
      {/*
        Lo concreto primero, cuando lo hay: «necesita al menos diez caracteres»
        le dice a alguien que hacer; «los campos que faltan estan marcados
        debajo» no, sobre todo cuando no falta ninguno.
      */}
      {loConcreto(error) ?? error.queSePuedeHacer}
    </Aviso>
  );
}
