import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Cargando,
  ErrorEnCristiano,
  Interruptor,
  Tarjeta,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoSeLeeLaFecha, type MisProductos } from './contrato.ts';

/**
 * Tus precios de compra · con IVA o sin él (M7, repaso; decisión 0033).
 *
 * «Actualmente cuento con los precios con IVA, pero estaría genial una opción
 *  para elegir si el IVA está incluido o excluido. Bien puesto, no a lo loco:
 *  mira cómo lo gestionan las mejores y copia su estructura.»
 *
 * Es la estructura de las aplicaciones de compras y de contabilidad: **el precio
 * se guarda sin IVA** —el IVA de compra se recupera, así que lo que cuesta de
 * verdad al negocio es sin él— y se **escribe** como venga el papel. Aquí se
 * elige cómo se escribe por defecto; cada campo de precio deja cambiarlo en el
 * momento, con su tipo al lado.
 *
 * Y lo que ya había, que se escribió con IVA, se arregla **una vez**: a cada
 * precio vivo se le quita el IVA de su producto, y el de antes queda en su
 * histórico con quién lo hizo.
 */
export function TusPreciosDeCompra() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = usarLectura<MisProductos>('mis_productos', { limite: '1' });
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);

  if (consulta.isError) return null;
  const datos = consulta.data;

  async function refrescar() {
    await Promise.all(
      ['mis_productos', 'un_producto', 'inventario_hoy'].map((clave) =>
        cache.invalidateQueries({ queryKey: [clave] }),
      ),
    );
  }

  async function guardar(conIva: boolean) {
    setError(null);
    const respuesta = await cliente.ejecutar('guardar_precios_con_iva', { con_iva: conIva });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  async function quitarElIva() {
    setQuitando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{
      cambiados: number;
      /** Los nombres de los productos sin tipo de IVA, que se quedan como estaban. */
      sinTipo: readonly string[];
    }>('quitar_iva_a_los_precios', { confirmado: true });
    setQuitando(false);
    setConfirmando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    const { cambiados } = respuesta.datos;
    const sinTipo = respuesta.datos.sinTipo.length;
    setHecho(
      (cambiados === 0
        ? 'No había precios que cambiar.'
        : `Hecho: ${cambiados} ${cambiados === 1 ? 'precio queda' : 'precios quedan'} sin IVA.`) +
        (sinTipo > 0
          ? ` ${sinTipo} ${sinTipo === 1 ? 'no tiene' : 'no tienen'} tipo de IVA y se quedan igual.`
          : ''),
    );
    await refrescar();
  }

  return (
    <Tarjeta titulo="Tus precios de compra">
      {/* El ancla del buscador: «IVA de los precios» lleva aquí. */}
      <span id="precios-con-iva" />
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {hecho !== null && (
          <Aviso
            tono="bien"
            titulo={hecho}
            esNoticia
            alCerrar={() => {
              setHecho(null);
            }}
          >
            El precio de antes queda en el histórico de cada producto.
          </Aviso>
        )}

        {datos === undefined ? (
          <Cargando que="cómo apuntas los precios" lineas={2} />
        ) : (
          <>
            <Interruptor
              etiqueta="Escribo los precios con IVA"
              ayuda="Como vienen en el ticket. Se guardan sin él, que es lo que te cuestan: el IVA de compra se recupera."
              puesto={datos.preciosConIva}
              alCambiar={(puesto) => {
                void guardar(puesto);
              }}
            />

            {datos.ivaQuitadoEn !== null ? (
              <p className="text-secundario text-texto-suave">
                A los precios de antes se les quitó el IVA el {comoSeLeeLaFecha(datos.ivaQuitadoEn)}
                .
              </p>
            ) : !confirmando ? (
              <div className="flex flex-col gap-e2">
                <p className="text-secundario text-texto-suave">
                  ¿Los precios que ya tienes llevan IVA? Se les quita de una vez, a cada uno el
                  suyo.
                </p>
                <div>
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      setConfirmando(true);
                    }}
                  >
                    Quitar el IVA a los que ya tengo
                  </Boton>
                </div>
              </div>
            ) : (
              <Aviso
                tono="atencion"
                titulo="Se hace una vez, y a todos"
                accion={
                  <Botones>
                    <Boton
                      tono="texto"
                      onClick={() => {
                        setConfirmando(false);
                      }}
                    >
                      Mejor no
                    </Boton>
                    <Boton
                      tono="principal"
                      cargando={quitando}
                      textoCargando="Quitando el IVA"
                      onClick={() => {
                        void quitarElIva();
                      }}
                    >
                      Sí, quitárselo
                    </Boton>
                  </Botones>
                }
              >
                Cada precio se divide entre 1,10 o 1,21 según el IVA de su producto: 11,00 € pasa a
                10,00 €. El de antes queda en su histórico, con tu nombre. Lo que no lleva IVA, como
                en Canarias, se queda igual.
              </Aviso>
            )}
          </>
        )}
      </div>
    </Tarjeta>
  );
}
