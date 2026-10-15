import { useState } from 'react';
import { centimos } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Interruptor,
  Tarjeta,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { MiCarta, UnCanal } from './contrato.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';

/**
 * Los canales de venta (M9 · 1, decisión 0086).
 *
 * Richi, el 15-oct: «un apartado para añadir todos los comercios; prográmalo todo,
 * pero pon activo solo Uber Eats». Aquí están todos: **Sala**, que es el de siempre;
 * **Uber Eats**, que se activa con su comisión y su envase; y Glovo, Just Eat y Para
 * llevar, programados y «Próximamente». El precio de cada plato en cada canal se pone
 * **a mano**, en su ficha.
 *
 * Quien no edita la carta ve qué canales hay, sin comisiones.
 */
export function Canales() {
  const consulta = usarLectura<MiCarta>('mi_carta');
  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <div className="py-e6">
        <Cargando que="los canales" forma="lista" lineas={4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta titulo="Por dónde vendes" acento="var(--color-app-carta)">
        <ul className="flex flex-col">
          {datos.canales
            .filter((c) => datos.puedeEditar || c.activo)
            .map((canal) => (
              <li key={canal.canal} className="border-b border-borde px-e3 py-e3 last:border-0">
                {canal.canal === 'sala' ? (
                  <div className="flex min-h-toque items-center gap-e3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-cuerpo font-semibold">Sala</span>
                      <span className="block text-secundario text-texto-suave">
                        El precio de cada plato, el de siempre.
                      </span>
                    </span>
                    <Etiqueta tono="bien">Siempre</Etiqueta>
                  </div>
                ) : (
                  <UnCanalDeVenta canal={canal} puedeEditar={datos.puedeEditar} />
                )}
              </li>
            ))}
        </ul>
      </Tarjeta>
      <p className="px-e1 text-secundario text-texto-suave">
        Activar un canal no conecta sus pedidos: es su lista de precios. El de cada plato se pone en
        su ficha; sin él, vale el de sala.
      </p>
    </div>
  );
}

function UnCanalDeVenta({
  canal,
  puedeEditar,
}: {
  readonly canal: UnCanal;
  readonly puedeEditar: boolean;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [comision, setComision] = useState(
    canal.comisionPorcentaje === null ? '' : String(canal.comisionPorcentaje).replace('.', ','),
  );
  const [envase, setEnvase] = useState<number | null>(canal.envaseCentimos);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState(false);

  const comoNumero = comision.trim() === '' ? null : Number(comision.replace(',', '.'));
  const comisionValida =
    comoNumero === null || (Number.isFinite(comoNumero) && comoNumero >= 0 && comoNumero <= 100);
  const hayCambios = comoNumero !== canal.comisionPorcentaje || envase !== canal.envaseCentimos;

  async function guardar(activo: boolean, conLoEscrito: boolean) {
    setTrabajando(true);
    setError(null);
    setHecho(false);
    const respuesta = await cliente.ejecutar('configurar_canal', {
      canal: canal.canal,
      activo,
      ...(conLoEscrito ? { comision_porcentaje: comoNumero, envase_centimos: envase } : {}),
    });
    setTrabajando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setHecho(conLoEscrito);
    await refrescar();
  }

  return (
    <div className="flex flex-col gap-e3">
      <div className="flex min-h-toque items-center gap-e3">
        <span className="min-w-0 flex-1">
          <span className="block text-cuerpo font-semibold">{canal.nombre}</span>
          <span className="block text-secundario text-texto-suave">
            {!canal.disponible
              ? 'Próximamente'
              : canal.activo
                ? canal.comisionPorcentaje === null
                  ? 'Activo'
                  : `Activo · se lleva el ${String(canal.comisionPorcentaje).replace('.', ',')} %`
                : 'Sin activar'}
          </span>
        </span>
        {!canal.disponible ? (
          <Etiqueta tono="neutro">Próximamente</Etiqueta>
        ) : puedeEditar ? (
          <Interruptor
            etiqueta={`${canal.nombre}, activo`}
            etiquetaOculta
            puesto={canal.activo}
            disabled={trabajando}
            alCambiar={(puesto) => {
              void guardar(puesto, false);
            }}
          />
        ) : (
          <Etiqueta tono="bien">Activo</Etiqueta>
        )}
      </div>

      {error !== null && <ErrorEnCristiano error={error} />}

      {puedeEditar && canal.disponible && canal.activo && (
        <div className="grid gap-e3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Campo
            etiqueta="Comisión"
            inputMode="decimal"
            value={comision}
            detras={<span className="text-texto-suave">%</span>}
            {...(comisionValida ? {} : { error: 'Entre 0 y 100.' })}
            onChange={(evento) => {
              setComision(evento.target.value);
            }}
          />
          <CampoMoneda
            etiqueta="Envase por pedido"
            valor={envase === null ? null : centimos(envase)}
            alCambiar={(valor) => {
              setEnvase(valor === null ? null : Number(valor));
            }}
          />
          <Boton
            tono="secundario"
            disabled={!hayCambios || !comisionValida}
            cargando={trabajando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar(true, true);
            }}
          >
            Guardar
          </Boton>
          {hecho && (
            <p aria-live="polite" className="text-secundario font-semibold text-bien sm:col-span-3">
              Guardado
            </p>
          )}
        </div>
      )}
      {puedeEditar && canal.activo && canal.comisionPorcentaje === null && (
        <Aviso tono="atencion" titulo="Sin comisión">
          Ponla para saber lo que te queda de cada plato en {canal.nombre}.
        </Aviso>
      )}
    </div>
  );
}
