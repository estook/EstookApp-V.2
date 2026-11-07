import { useState } from 'react';
import { ErrorEnCristiano, type ErrorDeLaApi } from '../Aviso.tsx';
import { Etiqueta } from '../Tarjeta.tsx';
import { Interruptor } from '../Selector.tsx';
import { Tarjeta } from '../Tarjeta.tsx';
import { clases } from '../../clases.ts';
import { usarLectura, type ClienteDeFacturas } from '../../ganchos/usarLectura.ts';

/**
 * **Quién hace qué** (T6 · 2 · 2 · 1, decisión 0137; Richi, 6-nov). Acción por acción: **hacer
 * facturas no da acceso a la empresa ni a las series**. De fábrica, por su puesto; cada línea se
 * abre y la dirección cambia a una persona con un interruptor. Queda en la auditoría.
 *
 * **Solo la dirección**: a quien no lo es no le sale nada. Las devoluciones, las correcciones y
 * anular entran aquí en cuanto existan (T6 · 2 · 2 · 2): lo que todavía no existe no se enseña.
 */

interface Persona {
  readonly personaId: string;
  readonly nombre: string;
  readonly rol: string;
  readonly siempre: boolean;
  readonly deUnTicket: boolean;
  readonly aMano: boolean;
  readonly consultar: boolean;
  readonly cambiados: readonly string[];
}

type Permiso = 'accion.factura_de_un_ticket' | 'accion.factura_a_mano' | 'accion.ver_documentos';

const LAS_ACCIONES: readonly {
  readonly permiso: Permiso;
  readonly nombre: string;
  readonly explica: string;
  readonly lee: (p: Persona) => boolean;
}[] = [
  {
    permiso: 'accion.factura_de_un_ticket',
    nombre: 'Factura de un ticket y copias',
    explica: 'Con el importe del ticket. Sin esto, ve lo que le deje «Consultar».',
    lee: (p) => p.deUnTicket,
  },
  {
    permiso: 'accion.factura_a_mano',
    nombre: 'Factura a mano',
    explica: 'Con conceptos libres, y marcar lo cobrado.',
    lee: (p) => p.aMano,
  },
  {
    permiso: 'accion.ver_documentos',
    nombre: 'Consultar todo',
    explica: 'Cualquier fecha. Sin esto, hoy y ayer, y lo demás por su número.',
    lee: (p) => p.consultar,
  },
];

const PUESTOS: Readonly<Record<string, string>> = {
  direccion: 'Dirección',
  administrador_de_cuenta: 'Administrador de cuenta',
  area_manager: 'Area manager',
  gerente: 'Gerente',
  jefe_de_sala: 'Jefe de sala',
  camarero: 'Camarero',
  jefe_de_cocina: 'Jefe de cocina',
  cocinero: 'Cocinero',
  gestoria: 'Gestoría',
};

export function QuienHaceQue({ cliente }: { readonly cliente: ClienteDeFacturas }) {
  const personas = usarLectura<readonly Persona[]>(
    () => cliente.consultar('quien_hace_que'),
    'quien_hace_que',
  );
  const [abierta, setAbierta] = useState<Permiso | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // A quien no es la dirección, la API le dice que no: no se enseña nada.
  if (personas.datos === undefined) return null;
  const todas = personas.datos;

  async function cambiar(persona: string, permiso: Permiso, tiene: boolean) {
    setCambiando(`${persona}|${permiso}`);
    setError(null);
    const r = await cliente.ejecutar('dar_un_permiso', { persona_id: persona, permiso, tiene });
    setCambiando(null);
    if (!r.ok) setError(r.error);
    await personas.otraVez();
  }

  return (
    <Tarjeta titulo="Quién hace qué">
      <div className="flex flex-col gap-e2">
        <p className="text-secundario text-texto-suave">
          Hacer facturas no da acceso a la empresa ni a las series.
        </p>
        <ul className="flex flex-col">
          {LAS_ACCIONES.map((a) => {
            const conEllo = todas.filter((p) => a.lee(p));
            const cambiadas = todas.filter((p) => p.cambiados.includes(a.permiso)).length;
            const estaAbierta = abierta === a.permiso;
            return (
              <li key={a.permiso} className="border-b border-borde last:border-b-0">
                <button
                  type="button"
                  aria-expanded={estaAbierta}
                  onClick={() => {
                    setAbierta(estaAbierta ? null : a.permiso);
                  }}
                  className="flex min-h-toque w-full items-center gap-e3 py-e2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo font-medium">{a.nombre}</span>
                    <span className="block text-secundario text-texto-suave">
                      {conEllo.length === 1 ? '1 persona' : `${String(conEllo.length)} personas`}
                      {cambiadas > 0
                        ? ` · ${String(cambiadas)} ${cambiadas === 1 ? 'cambiada' : 'cambiadas'} a mano`
                        : ''}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={clases(
                      'text-texto-suave transition-transform',
                      estaAbierta && 'rotate-90',
                    )}
                  >
                    ›
                  </span>
                </button>
                {estaAbierta && (
                  <div className="flex flex-col pb-e3">
                    <p className="pb-e2 text-etiqueta text-texto-suave">{a.explica}</p>
                    <ul className="flex flex-col">
                      {todas.map((p) => (
                        <li
                          key={p.personaId}
                          className="flex min-h-toque items-center gap-e3 py-e1"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-secundario font-medium">
                              {p.nombre}
                            </span>
                            <span className="block truncate text-etiqueta text-texto-suave">
                              {PUESTOS[p.rol] ?? p.rol}
                              {p.cambiados.includes(a.permiso) ? ' · cambiado a mano' : ''}
                            </span>
                          </span>
                          {p.siempre ? (
                            <Etiqueta tono="neutro">Siempre</Etiqueta>
                          ) : p.rol === 'gestoria' && a.permiso !== 'accion.ver_documentos' ? (
                            <Etiqueta tono="neutro">Solo mira</Etiqueta>
                          ) : (
                            <Interruptor
                              etiqueta={`${a.nombre}: ${p.nombre}`}
                              etiquetaOculta
                              puesto={a.lee(p)}
                              disabled={cambiando !== null}
                              alCambiar={(tiene) => {
                                void cambiar(p.personaId, a.permiso, tiene);
                              }}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-etiqueta text-texto-suave">
          La empresa, las series y Verifacti, en «Quién la lleva».
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
      </div>
    </Tarjeta>
  );
}
