import { useState } from 'react';
import { Boton, Hoja } from '@estook/ui';
import type { ComoEstaElCentro } from '@estook/impresion';
import type { UnAparato } from '../datos/tipos.ts';
import { laCajaParaWindows } from '../datos/laCajaParaWindows.ts';

/**
 * **Ajustes del TPV › Aparatos dice quién llega a la caja** (T5 · 2 · 2 · 2, decisión 0124;
 * maquetas de T5 · 2, sección 3, y de la caja de centro, secciones 1 a 4): aparato a aparato, si
 * sigue sin internet —llega a la caja, o guarda lo suyo—, para saberlo antes de que falte y no
 * en mitad del servicio. Y en la propia caja, **lo que dice Windows**: si no la deja escuchar en
 * la red del local, o tiene esa red como pública, con los pasos para arreglarlo.
 *
 * Solo sale si el local tiene una caja de centro: sin ella, cada aparato guarda lo suyo y no hay
 * nada que mirar.
 */

/** Lo que se dice debajo de la lista: el iPhone y la caja por wifi. */
export function LoQueConvieneSaber({
  aparatos,
  este,
}: {
  readonly aparatos: readonly UnAparato[];
  readonly este: string;
}) {
  const conIphone = aparatos.some((a) => a.camino === 'guarda_lo_suyo');
  const centro = aparatos.find((a) => a.esElCentro === true);
  const porWifi = centro?.centroPor === 'wifi';
  if (!conIphone && !porWifi) return null;
  return (
    <div className="flex flex-col gap-e2 text-secundario text-texto-suave">
      {conIphone && <p>El iPhone no deja que una web hable con la caja: sube lo suyo al volver.</p>}
      {porWifi && (
        <p>
          {centro.id === este ? 'Esta caja' : 'La caja'} va por wifi. Si el wifi falla, se queda
          sola: mejor un cable al router.
        </p>
      )}
    </div>
  );
}

/** «Cómo darlo»: el permiso de Chrome, en ese aparato. */
export function ComoDarlo({
  aparato,
  alCerrar,
}: {
  readonly aparato: UnAparato;
  readonly alCerrar: () => void;
}) {
  return (
    <Hoja abierta titulo={`Dale el permiso de red local a «${aparato.nombre}»`} alCerrar={alCerrar}>
      {aparato.camino === 'sin_permiso' ? (
        <ol className="flex list-decimal flex-col gap-e2 pl-e5">
          <li>
            En <b>{aparato.nombre}</b>, abre Estook TPV.
          </li>
          <li>
            En el plano sale arriba «deja que Estook TPV hable con la caja»: toca <b>Seguir</b>.
          </li>
          <li>
            Chrome pregunta si puede buscar en tu red local: toca <b>Permitir</b>.
          </li>
        </ol>
      ) : (
        <ol className="flex list-decimal flex-col gap-e2 pl-e5">
          <li>
            En <b>{aparato.nombre}</b>, en Chrome, toca <b>⋮</b> › <b>Configuración</b> ›{' '}
            <b>Configuración de sitios</b>.
          </li>
          <li>
            Toca <b>Red local</b> y luego <b>estook.com</b>.
          </li>
          <li>
            Elige <b>Permitir</b> y vuelve a Estook TPV.
          </li>
        </ol>
      )}
      <p className="mt-e4 text-secundario text-texto-suave">
        Al rato, Aparatos dice «Llega a la caja».
      </p>
    </Hoja>
  );
}

function abrirEnWindows(que: 'red' | 'cortafuegos'): void {
  void laCajaParaWindows()?.abrirEnWindows?.(que);
}

function AbrirEnWindows({ que }: { readonly que: 'red' | 'cortafuegos' }) {
  return (
    <div className="mt-e4 flex flex-wrap items-center gap-e3">
      <Boton
        tono="principal"
        onClick={() => {
          abrirEnWindows(que);
        }}
      >
        Abrir en Windows
      </Boton>
      <span className="text-secundario text-texto-suave">
        Al volver aquí, Aparatos se actualiza solo.
      </span>
    </div>
  );
}

/**
 * **El wifi como «red pública»** (maqueta de la caja de centro, sección 3): Windows no deja
 * llegar a nadie aunque se contestara bien su pregunta. Arriba de la lista, con los pasos.
 */
export function LaRedPublica({ caja }: { readonly caja: ComoEstaElCentro | null }) {
  const [viendo, setViendo] = useState(false);
  const red = caja?.windows?.red;
  if (red === undefined || red === null || !red.publica) return null;
  return (
    <>
      <div
        role="status"
        className="flex flex-wrap items-center gap-e3 rounded-grande bg-atencion-suave py-e2 pl-e4 pr-e2 font-bold text-atencion"
      >
        <span className="flex-1">
          Windows tiene «{red.nombre}» como red pública: los móviles y la cocina no llegan a la caja
        </span>
        <Boton
          tono="secundario"
          onClick={() => {
            setViendo(true);
          }}
        >
          Cómo cambiarlo
        </Boton>
      </div>
      {viendo && (
        <Hoja
          abierta
          titulo="Ponlo como red privada (un minuto)"
          alCerrar={() => {
            setViendo(false);
          }}
        >
          {red.por === 'cable' ? (
            <ol className="flex list-decimal flex-col gap-e2 pl-e5">
              <li>
                Toca <b>Abrir en Windows</b> (o Configuración › <b>Red e Internet</b> ›{' '}
                <b>Ethernet</b>).
              </li>
              <li>
                En <b>Tipo de perfil de red</b>, elige <b>Red privada</b>.
              </li>
            </ol>
          ) : (
            <ol className="flex list-decimal flex-col gap-e2 pl-e5">
              <li>
                Abajo a la derecha, toca el icono del wifi y luego <b>›</b> junto a «{red.nombre}».
              </li>
              <li>
                Toca <b>Propiedades</b>.
              </li>
              <li>
                En <b>Tipo de perfil de red</b>, elige <b>Red privada</b>.
              </li>
            </ol>
          )}
          <AbrirEnWindows que="red" />
        </Hoja>
      )}
    </>
  );
}

/**
 * **Se tocó «Cancelar»** (maqueta de la caja de centro, sección 2): dónde se cambia en Windows,
 * en tres pasos. Solo redes privadas.
 */
export function ElCortafuegos({ alCerrar }: { readonly alCerrar: () => void }) {
  return (
    <Hoja abierta titulo="Deja que la caja escuche en la red del local" alCerrar={alCerrar}>
      <ol className="flex list-decimal flex-col gap-e2 pl-e5">
        <li>
          Toca <b>Abrir en Windows</b> (o en Inicio escribe «firewall» y abre{' '}
          <b>Permitir una aplicación a través de Firewall de Windows</b>).
        </li>
        <li>
          Toca <b>Cambiar la configuración</b> y busca <b>Estook TPV</b> en la lista.
        </li>
        <li>
          Marca la casilla <b>Privada</b> y toca <b>Aceptar</b>.
        </li>
      </ol>
      <p className="mt-e3 text-secundario text-texto-suave">
        Solo redes privadas: si este PC se lleva a una cafetería, ahí no escucha a nadie.
      </p>
      <AbrirEnWindows que="cortafuegos" />
    </Hoja>
  );
}
