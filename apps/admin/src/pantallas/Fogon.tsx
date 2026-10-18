import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Interruptor, Tarjeta } from '@estook/ui';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { centimos, enEuros } from '@estook/dominio';
import { fechaYHora } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Fogón en el admin (Fogón 1 · 1, decisión 0097).
 *
 * «A, y además así controlamos si apagamos o encendemos a todos por si hay que
 *  cambiar cosas… pon el botón, ya no hace falta medir lo que cuesta, eso lo
 *  miraremos nosotros con el piloto» (Richi, 18-oct).
 *
 * Dos interruptores, **que surten efecto al momento**: el general (apagado, Fogón no
 * habla con nadie: para un cambio de IA o un mantenimiento) y el de cada cliente. Y
 * debajo, lo gastado este mes por cliente: preguntas, créditos y **lo que de verdad ha
 * costado**, en euros, con lo apuntado de cada llamada.
 */

interface FogonEnElAdmin {
  readonly encendido: boolean;
  readonly cambiadoEn: string;
  readonly cambiadoPor: string | null;
  readonly mes: { readonly llamadas: number; readonly creditos: number; readonly centimos: number };
  readonly clientes: readonly {
    readonly organizacionId: string;
    readonly nombre: string;
    readonly encendido: boolean;
    readonly llamadas: number;
    readonly creditos: number;
    readonly centimos: number;
  }[];
}

type LaPrueba =
  | { readonly funciona: true; readonly modelo: string; readonly milisegundos: number }
  | {
      readonly funciona: false;
      readonly porque: string;
      readonly estado: number | null;
      readonly detalle: string;
    };

/**
 * «Probar la conexión» (19-oct): una pregunta de una palabra a Anthropic, que dice si
 * la clave, el saldo y el modelo están bien y, si no, **qué falla**, en castellano y con
 * la frase de Anthropic debajo para pasársela a la IA.
 */
function ProbarLaConexion({ puede }: { readonly puede: boolean }) {
  const { cliente } = usarSesion();
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<LaPrueba | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function probar() {
    setProbando(true);
    setPrueba(null);
    setError(null);
    const respuesta = await cliente.ejecutar<LaPrueba>('admin_probar_fogon', {});
    setProbando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setPrueba(respuesta.datos);
  }

  return (
    <Tarjeta titulo="La conexión con Anthropic">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Comprueba la clave, el saldo y el modelo con una pregunta de una palabra. Cuesta menos de
          una milésima de céntimo.
        </p>
        <div>
          <Boton
            tono="secundario"
            disabled={!puede}
            cargando={probando}
            textoCargando="Probando"
            onClick={() => {
              void probar();
            }}
          >
            Probar la conexión
          </Boton>
        </div>
        {error && <ErrorEnCristiano error={error} />}
        {prueba !== null &&
          (prueba.funciona ? (
            <Aviso tono="bien" titulo="Funciona">
              {`Ha contestado ${prueba.modelo} en ${(prueba.milisegundos / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s.`}
            </Aviso>
          ) : (
            <Aviso tono="mal" titulo="No funciona">
              <span className="block">{prueba.porque}</span>
              {prueba.detalle !== '' && (
                <span className="mt-e2 block break-words text-etiqueta text-texto-suave">
                  {prueba.estado === null ? '' : `${String(prueba.estado)} · `}
                  {prueba.detalle}
                </span>
              )}
            </Aviso>
          ))}
      </div>
    </Tarjeta>
  );
}

export function FogonEnElAdmin() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const puedeCambiar = yo?.nivel === 'total';

  const consulta = useQuery({
    queryKey: ['admin_fogon'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<FogonEnElAdmin>('admin_fogon');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  async function cambiar(que: string, nombre: string, entrada: Record<string, unknown>) {
    setCambiando(que);
    setError(null);
    const respuesta = await cliente.ejecutar(nombre, entrada);
    setCambiando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_fogon'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  }

  const datos = consulta.data;

  return (
    <div className="flex flex-col gap-e5">
      <div>
        <h1 className="text-pantalla font-semibold">Fogón</h1>
        <p className="text-secundario text-texto-suave">
          Quién tiene la IA encendida y lo que ha costado este mes. Apagado, todo lo demás de la app
          sigue igual.
        </p>
      </div>

      {error && <ErrorEnCristiano error={error} />}

      {consulta.isLoading ? (
        <Cargando que="Fogón" lineas={3} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : (
        datos !== undefined && (
          <>
            <Tarjeta
              titulo={datos.encendido ? 'Encendido' : 'Apagado para todos'}
              origen={
                datos.cambiadoPor === null
                  ? 'Sin cambiar desde que existe'
                  : `Lo cambió ${datos.cambiadoPor} el ${fechaYHora(datos.cambiadoEn)}`
              }
            >
              <div className="flex flex-col gap-e4">
                <Interruptor
                  etiqueta="Fogón encendido"
                  puesto={datos.encendido}
                  disabled={!puedeCambiar || cambiando !== null}
                  alCambiar={(puesto) => {
                    void cambiar('general', 'admin_encender_fogon', { encendido: puesto });
                  }}
                  ayuda="El general. Apagado, Fogón no habla con nadie aunque el cliente lo tenga encendido: para un cambio de IA o un mantenimiento."
                />
                <p className="text-secundario">
                  Este mes: <strong>{datos.mes.llamadas}</strong> llamadas ·{' '}
                  <strong>{datos.mes.creditos}</strong> créditos ·{' '}
                  <strong>{enEuros(centimos(datos.mes.centimos))}</strong>
                </p>
              </div>
            </Tarjeta>

            <ProbarLaConexion puede={puedeCambiar} />

            {!datos.encendido && (
              <Aviso tono="info" titulo="Con el general apagado, ningún cliente lo tiene">
                Puedes ir encendiendo los clientes; empezarán a tenerlo cuando lo enciendas arriba.
              </Aviso>
            )}

            <section aria-label="Cada cliente" className="flex flex-col gap-e2">
              <h2 className="text-cuerpo font-semibold">Cada cliente</h2>
              {datos.clientes.length === 0 ? (
                <p className="text-secundario text-texto-suave">Todavía no hay clientes.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-borde rounded-grande border border-borde bg-superficie">
                  {datos.clientes.map((c) => (
                    <li
                      key={c.organizacionId}
                      className="flex flex-wrap items-center justify-between gap-e3 px-e4 py-e3"
                    >
                      <div className="min-w-0">
                        <p className="text-cuerpo font-medium">{c.nombre}</p>
                        <p className="text-secundario text-texto-suave">
                          {c.llamadas === 0
                            ? 'Nada este mes'
                            : `${String(c.llamadas)} llamadas · ${String(c.creditos)} créditos · ${enEuros(centimos(c.centimos))}`}
                        </p>
                      </div>
                      <Interruptor
                        etiqueta={`Fogón para ${c.nombre}`}
                        etiquetaOculta
                        puesto={c.encendido}
                        disabled={!puedeCambiar || cambiando !== null}
                        alCambiar={(puesto) => {
                          void cambiar(c.organizacionId, 'admin_encender_fogon_del_cliente', {
                            organizacion_id: c.organizacionId,
                            encendido: puesto,
                          });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
