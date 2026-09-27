import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { IconoEquipo, IconoHecho } from '@estook/iconos';
import { Aviso, Boton, ErrorEnCristiano, Etiqueta, Hoja, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';

/**
 * Pedir ayuda con un pedido (entrega 2 de M7 · decisión 0052).
 *
 * «Que se pueda invitar en casos urgentes a un cocinero y que éste pueda verlo en
 * ese momento para hacer la compra» (Richi, 27-sep). Dos caras:
 *
 *   · **Quien lo manda** pide ayuda a alguien del almacén: le llega al momento a la
 *     campana y, de fábrica, al correo. Aquí ve a quién se lo ha pedido y quién ha
 *     terminado.
 *   · **Quien ayuda** ve arriba del pedido quién se lo ha pedido, lo rellena y pulsa
 *     «Listo»: a quien se lo pidió le llega que ya lo puede mandar.
 *
 * Pedir ayuda no da permisos a nadie: solo se ofrece a quien ya lleva el almacén.
 */
interface PersonaDelEquipo {
  readonly personaId: string;
  readonly nombre: string;
}

interface Ayuda {
  readonly puedePedirAyuda: boolean;
  readonly aQuien: readonly PersonaDelEquipo[];
  readonly invitados: readonly (PersonaDelEquipo & { readonly terminada: boolean })[];
  readonly aMi: { readonly quien: string; readonly terminada: boolean } | null;
}

export function AyudaConElPedido({
  pedidoId,
  hayCambiosSinGuardar,
}: {
  readonly pedidoId: string;
  /** Con cambios sin guardar no se avisa de «Listo»: se avisaría de lo de antes. */
  readonly hayCambiosSinGuardar: boolean;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const consulta = usarLectura<Ayuda>('ayuda_con_el_pedido', { pedido_id: pedidoId });
  const [eligiendo, setEligiendo] = useState(false);
  const [avisando, setAvisando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const ayuda = consulta.data;
  if (ayuda === undefined) return null;

  async function heTerminado() {
    setAvisando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('he_terminado_el_pedido', { pedido_id: pedidoId });
    setAvisando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  const conAlgo = ayuda.aMi !== null || ayuda.puedePedirAyuda || ayuda.invitados.length > 0;
  if (!conAlgo) return null;

  return (
    <section aria-label="Ayuda con el pedido" className="flex flex-col gap-e2">
      {error !== null && <ErrorEnCristiano error={error} />}

      {ayuda.aMi !== null &&
        (ayuda.aMi.terminada ? (
          <p className="flex items-center gap-e2 text-secundario text-texto-suave">
            <IconoHecho size={16} />
            Ya avisaste a {ayuda.aMi.quien}: lo manda cuando lo revise.
          </p>
        ) : (
          <Aviso
            tono="atencion"
            titulo={`${ayuda.aMi.quien} te ha pedido que lo rellenes`}
            accion={
              <Boton
                tono="principal"
                cargando={avisando}
                disabled={hayCambiosSinGuardar}
                onClick={() => {
                  void heTerminado();
                }}
              >
                Listo, avisar a {ayuda.aMi.quien}
              </Boton>
            }
          >
            {hayCambiosSinGuardar
              ? 'Guarda lo que has cambiado y avisa.'
              : 'Añade lo que falta, guarda y avisa.'}
          </Aviso>
        ))}

      {/* A quién se le pidió lo ve quien lo pidió; quien ayuda ya sabe que es él. */}
      {ayuda.aMi === null && (ayuda.puedePedirAyuda || ayuda.invitados.length > 0) && (
        <div className="flex flex-wrap items-center gap-e2">
          {ayuda.invitados.map((i) => (
            <Etiqueta key={i.personaId} tono={i.terminada ? 'bien' : 'neutro'}>
              {i.nombre} · {i.terminada ? 'listo' : 'rellenando'}
            </Etiqueta>
          ))}
          {ayuda.puedePedirAyuda && ayuda.aQuien.length > 0 && (
            <Boton
              tono="secundario"
              icono={<IconoEquipo size={18} />}
              onClick={() => {
                setEligiendo(true);
              }}
            >
              Pedir ayuda
            </Boton>
          )}
        </div>
      )}

      {eligiendo && (
        <ElegirQuienAyuda
          pedidoId={pedidoId}
          aQuien={ayuda.aQuien}
          yaInvitados={new Set(ayuda.invitados.filter((i) => !i.terminada).map((i) => i.personaId))}
          alCerrar={() => {
            setEligiendo(false);
          }}
          alPedir={async () => {
            setEligiendo(false);
            await refrescar();
          }}
        />
      )}
    </section>
  );
}

function ElegirQuienAyuda({
  pedidoId,
  aQuien,
  yaInvitados,
  alCerrar,
  alPedir,
}: {
  readonly pedidoId: string;
  readonly aQuien: readonly PersonaDelEquipo[];
  readonly yaInvitados: ReadonlySet<string>;
  readonly alCerrar: () => void;
  readonly alPedir: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set());
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function pedir() {
    setPidiendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar('pedir_ayuda_con_el_pedido', {
      pedido_id: pedidoId,
      personas: [...elegidos],
    });
    setPidiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await alPedir();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Pedir ayuda con el pedido"
      pie={
        <Boton
          tono="principal"
          ancho
          cargando={pidiendo}
          disabled={elegidos.size === 0}
          onClick={() => {
            void pedir();
          }}
        >
          {elegidos.size <= 1 ? 'Pedírselo' : `Pedírselo a ${String(elegidos.size)}`}
        </Boton>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Le llega al momento, también por correo. Lo rellena y te avisa; lo mandas tú.
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
        <ul className="flex flex-col gap-e2">
          {aQuien.map((persona) => {
            const elegido = elegidos.has(persona.personaId);
            const yaEsta = yaInvitados.has(persona.personaId);
            return (
              <li key={persona.personaId}>
                <label
                  className={clases(
                    'flex min-h-toque cursor-pointer items-center gap-e3 rounded-grande border px-e3',
                    elegido ? 'border-naranja bg-naranja-suave' : 'border-borde hover:bg-fondo',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={elegido}
                    onChange={(evento) => {
                      const siguiente = new Set(elegidos);
                      if (evento.target.checked) siguiente.add(persona.personaId);
                      else siguiente.delete(persona.personaId);
                      setElegidos(siguiente);
                    }}
                    className="size-[20px] accent-naranja"
                  />
                  <span className="flex-1 text-cuerpo">{persona.nombre}</span>
                  {yaEsta && <Etiqueta tono="neutro">ya se lo pediste</Etiqueta>}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Hoja>
  );
}
