import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Selector,
  Tarjeta,
} from '@estook/ui';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { fechaYHora } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **La facturación, en el admin** (T6 · 1, decisión 0126; Anexo, capítulo 9; 0125).
 *
 * Lo que es de Estook y no de un restaurante: **probar la conexión con Verifacti**, las **once
 * condiciones** sin las que nada pasa a real (cada una con dónde está su prueba), **quién produce
 * Estook** para su declaración responsable (sus datos no van en el código, que es público), la
 * **empresa de pruebas** en una cuenta de la casa y **las empresas** de todos, con «Pasar a real»
 * cerrado mientras falte una condición.
 */

interface LaFacturacionEnElAdmin {
  readonly conectada: boolean;
  readonly condiciones: readonly {
    readonly numero: number;
    readonly texto: string;
    readonly cumplidaEn: string | null;
    readonly nota: string | null;
  }[];
  readonly productor: {
    readonly nombre: string | null;
    readonly nif: string | null;
    readonly direccion: string | null;
    readonly lugar: string | null;
    readonly firmadaEl: string | null;
    readonly textoDelAsesor: string | null;
  };
  readonly empresas: readonly {
    readonly id: string;
    readonly organizacion: string;
    readonly nombre: string;
    readonly nif: string;
    readonly dePruebas: boolean;
    readonly entorno: string;
    readonly enVerifacti: boolean;
    readonly autorizacion: string;
    readonly locales: number;
  }[];
  readonly localesDeLaCasa: readonly {
    readonly localId: string;
    readonly local: string;
    readonly organizacion: string;
    readonly empresa: string | null;
    readonly dePruebas: boolean;
  }[];
}

type LaPrueba =
  | {
      readonly funciona: true;
      readonly nifs: number;
      readonly version: string | null;
      readonly milisegundos: number;
    }
  | { readonly funciona: false; readonly porque: string; readonly estado: number | null };

const AUTORIZACION: Readonly<Record<string, string>> = {
  sin_empezar: 'Sin autorizar',
  pendiente: 'Esperando la firma',
  correcta: 'Autorizada',
  rechazada: 'Rechazada',
  caducada: 'Caducada',
  cancelada: 'Cancelada',
};

function ProbarVerifacti({ puede }: { readonly puede: boolean }) {
  const { cliente } = usarSesion();
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<LaPrueba | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  return (
    <Tarjeta titulo="La conexión con Verifacti">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Comprueba la clave de la cuenta (la de la API de NIF) y lee la versión de Verifacti. No
          cuesta nada.
        </p>
        <div>
          <Boton
            tono="secundario"
            disabled={!puede}
            cargando={probando}
            textoCargando="Probando"
            onClick={() => {
              setProbando(true);
              setPrueba(null);
              setError(null);
              void cliente.ejecutar<LaPrueba>('admin_probar_verifacti', {}).then((r) => {
                setProbando(false);
                if (r.ok) setPrueba(r.datos);
                else setError(r.error);
              });
            }}
          >
            Probar la conexión
          </Boton>
        </div>
        {error !== null && <ErrorEnCristiano error={error} />}
        {prueba !== null &&
          (prueba.funciona ? (
            <Aviso tono="bien" titulo="Funciona">
              {`La cuenta tiene ${String(prueba.nifs)} NIF dados de alta. Verifacti va por la versión ${prueba.version ?? 'que no se ha podido leer'}. Ha tardado ${(prueba.milisegundos / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s.`}
            </Aviso>
          ) : (
            <Aviso tono="mal" titulo="No funciona">
              <span className="block">{prueba.porque}</span>
              {prueba.estado !== null && (
                <span className="mt-e2 block text-etiqueta text-texto-suave">
                  Verifacti contestó {String(prueba.estado)}
                </span>
              )}
            </Aviso>
          ))}
      </div>
    </Tarjeta>
  );
}

function LasOnce({
  datos,
  puede,
  alCambiar,
}: {
  readonly datos: LaFacturacionEnElAdmin;
  readonly puede: boolean;
  readonly alCambiar: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const cumplidas = datos.condiciones.filter((c) => c.cumplidaEn !== null).length;

  async function marcar(numero: number, cumplida: boolean) {
    setCambiando(numero);
    setError(null);
    const nota = notas[numero] ?? datos.condiciones.find((c) => c.numero === numero)?.nota ?? '';
    const r = await cliente.ejecutar('admin_marcar_condicion', {
      numero,
      cumplida,
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
    });
    setCambiando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await alCambiar();
  }

  return (
    <Tarjeta
      titulo="Las once condiciones (Anexo, capítulo 9)"
      accion={
        <Etiqueta
          tono={cumplidas === 11 ? 'bien' : 'atencion'}
        >{`${String(cumplidas)} de 11`}</Etiqueta>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Sin las once, ninguna empresa pasa a real. Marcar una pide escribir dónde está su prueba.
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
        <ol className="flex flex-col divide-y divide-borde">
          {datos.condiciones.map((c) => (
            <li key={c.numero} className="flex flex-col gap-e2 py-e3">
              <p className="text-cuerpo">
                <span className="font-semibold">{c.numero}.</span> {c.texto}
              </p>
              {c.cumplidaEn === null ? (
                <div className="flex flex-wrap items-end gap-e2">
                  <div className="min-w-[14rem] flex-1">
                    <Campo
                      etiqueta="Dónde está la prueba"
                      value={notas[c.numero] ?? ''}
                      disabled={!puede}
                      onChange={(ev) => {
                        const v = ev.currentTarget.value;
                        setNotas((n) => ({ ...n, [c.numero]: v }));
                      }}
                    />
                  </div>
                  <Boton
                    tono="secundario"
                    disabled={!puede || (notas[c.numero] ?? '').trim() === ''}
                    cargando={cambiando === c.numero}
                    onClick={() => {
                      void marcar(c.numero, true);
                    }}
                  >
                    Cumplida
                  </Boton>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-e2">
                  <p className="text-secundario text-texto-suave">
                    ✓ {fechaYHora(c.cumplidaEn)} · {c.nota ?? ''}
                  </p>
                  <Boton
                    tono="texto"
                    disabled={!puede}
                    cargando={cambiando === c.numero}
                    onClick={() => {
                      void marcar(c.numero, false);
                    }}
                  >
                    Quitarla
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Tarjeta>
  );
}

function ElProductor({
  datos,
  puede,
  alCambiar,
}: {
  readonly datos: LaFacturacionEnElAdmin;
  readonly puede: boolean;
  readonly alCambiar: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const p = datos.productor;
  const [nombre, setNombre] = useState(p.nombre ?? '');
  const [nif, setNif] = useState(p.nif ?? '');
  const [direccion, setDireccion] = useState(p.direccion ?? '');
  const [lugar, setLugar] = useState(p.lugar ?? '');
  const [firmadaEl, setFirmadaEl] = useState(p.firmadaEl ?? '');
  const [texto, setTexto] = useState(p.textoDelAsesor ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  return (
    <Tarjeta titulo="Quién produce Estook (la declaración responsable)">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Salen en la declaración de Estook. Mientras falten el texto del asesor, la fecha o el
          lugar, es un borrador y lo dice.
        </p>
        <Campo
          etiqueta="Nombre o razón social"
          value={nombre}
          disabled={!puede}
          onChange={(ev) => {
            setNombre(ev.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="NIF"
          value={nif}
          disabled={!puede}
          onChange={(ev) => {
            setNif(ev.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Dirección de contacto"
          value={direccion}
          disabled={!puede}
          onChange={(ev) => {
            setDireccion(ev.currentTarget.value);
          }}
        />
        <label className="flex flex-col gap-e1">
          <span className="text-secundario font-medium text-texto-suave">El texto del asesor</span>
          <textarea
            value={texto}
            disabled={!puede}
            rows={5}
            onChange={(ev) => {
              setTexto(ev.currentTarget.value);
            }}
            className="w-full rounded-medio border border-borde-fuerte bg-superficie p-e3 text-cuerpo"
          />
        </label>
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="Firmada el"
            tipo="fecha"
            value={firmadaEl}
            disabled={!puede}
            onChange={(ev) => {
              setFirmadaEl(ev.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Lugar"
            value={lugar}
            disabled={!puede}
            onChange={(ev) => {
              setLugar(ev.currentTarget.value);
            }}
          />
        </div>
        {error !== null && <ErrorEnCristiano error={error} />}
        {guardado && (
          <p role="status" className="text-secundario text-bien">
            Guardado.
          </p>
        )}
        <div>
          <Boton
            disabled={!puede}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              setGuardando(true);
              setError(null);
              setGuardado(false);
              const oNulo = (t: string) => (t.trim() === '' ? null : t.trim());
              void cliente
                .ejecutar('admin_guardar_el_productor', {
                  nombre: oNulo(nombre),
                  nif: oNulo(nif),
                  direccion: oNulo(direccion),
                  lugar: oNulo(lugar),
                  firmada_el: oNulo(firmadaEl),
                  texto_del_asesor: oNulo(texto),
                })
                .then(async (r) => {
                  setGuardando(false);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setGuardado(true);
                  await alCambiar();
                });
            }}
          >
            Guardar
          </Boton>
        </div>
      </div>
    </Tarjeta>
  );
}

export function FacturacionEnElAdmin() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const puede = yo?.nivel === 'total';
  const [local, setLocal] = useState('');
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const consulta = useQuery({
    queryKey: ['admin_facturacion'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaFacturacionEnElAdmin>('admin_facturacion');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  const releer = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_facturacion'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  };

  async function hacer(que: string, nombre: string, entrada: Record<string, unknown>) {
    setHaciendo(que);
    setError(null);
    const r = await cliente.ejecutar(nombre, entrada);
    setHaciendo(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await releer();
  }

  const datos = consulta.data;
  const todas = datos?.condiciones.every((c) => c.cumplidaEn !== null) ?? false;

  return (
    <div className="flex flex-col gap-e5">
      <div>
        <h1 className="text-pantalla font-semibold">Facturación</h1>
        <p className="text-secundario text-texto-suave">
          Todo en pruebas hasta las once condiciones. Lo que se emite en pruebas nunca llega a
          Hacienda de verdad.
        </p>
      </div>

      {error !== null && <ErrorEnCristiano error={error} />}

      {consulta.isLoading ? (
        <Cargando que="la facturación" lineas={4} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : (
        datos !== undefined && (
          <>
            {!datos.conectada && (
              <Aviso tono="atencion" titulo="Sin conectar">
                Falta VERIFACTI_CLAVE_DE_CUENTA en los secretos de Supabase, o la API no se ha
                desplegado desde que se puso.
              </Aviso>
            )}
            <ProbarVerifacti puede={puede} />

            <Tarjeta titulo="La empresa de pruebas de Verifacti">
              <div className="flex flex-col gap-e3">
                <p className="text-secundario text-texto-suave">
                  Para probar en una cuenta de la casa: el alta de ese local se salta el alta del
                  NIF y la firma, que ya vienen hechas.
                </p>
                <Selector
                  etiqueta="En qué local"
                  value={local}
                  disabled={!puede}
                  onChange={(ev) => {
                    setLocal(ev.currentTarget.value);
                  }}
                  sinElegir="Elige un local de la casa"
                  cuandoNoHay="No hay cuentas de la casa"
                  opciones={datos.localesDeLaCasa.map((l) => ({
                    valor: l.localId,
                    texto: `${l.organizacion} · ${l.local}${l.empresa === null ? '' : l.dePruebas ? ' (ya la tiene)' : ` (con ${l.empresa})`}`,
                  }))}
                />
                <div>
                  <Boton
                    tono="secundario"
                    disabled={!puede || local === ''}
                    cargando={haciendo === 'pruebas'}
                    onClick={() => {
                      void hacer('pruebas', 'admin_poner_la_empresa_de_pruebas', {
                        local_id: local,
                      });
                    }}
                  >
                    Ponerla en ese local
                  </Boton>
                  {datos.localesDeLaCasa.some((l) => l.localId === local && l.dePruebas) && (
                    // Por si se puso donde no era (0129): el local vuelve a quedarse sin empresa.
                    <Boton
                      tono="texto"
                      disabled={!puede}
                      cargando={haciendo === 'quitar'}
                      onClick={() => {
                        void hacer('quitar', 'admin_quitar_la_empresa_de_pruebas', {
                          local_id: local,
                        });
                      }}
                    >
                      Quitarla de ese local
                    </Boton>
                  )}
                </div>
              </div>
            </Tarjeta>

            <LasOnce datos={datos} puede={puede} alCambiar={releer} />
            <ElProductor datos={datos} puede={puede} alCambiar={releer} />

            <section aria-label="Las empresas" className="flex flex-col gap-e2">
              <h2 className="text-cuerpo font-semibold">Las empresas</h2>
              {datos.empresas.length === 0 ? (
                <p className="text-secundario text-texto-suave">Todavía ninguna.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-borde rounded-grande border border-borde bg-superficie">
                  {datos.empresas.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-e3 px-e4 py-e3"
                    >
                      <div className="min-w-0">
                        <p className="text-cuerpo font-medium">
                          {e.nombre}
                          {e.dePruebas ? ' · de pruebas' : ''}
                        </p>
                        <p className="text-secundario text-texto-suave">
                          {e.organizacion} · {e.nif} · {String(e.locales)}{' '}
                          {e.locales === 1 ? 'local' : 'locales'} ·{' '}
                          {e.enVerifacti ? 'en Verifacti' : 'sin alta en Verifacti'} ·{' '}
                          {AUTORIZACION[e.autorizacion] ?? e.autorizacion}
                        </p>
                      </div>
                      {e.entorno === 'real' ? (
                        <Etiqueta tono="bien">En real</Etiqueta>
                      ) : (
                        <Boton
                          tono="secundario"
                          disabled={!puede || !todas || e.dePruebas}
                          cargando={haciendo === e.id}
                          onClick={() => {
                            void hacer(e.id, 'admin_pasar_a_real', { empresa_id: e.id });
                          }}
                        >
                          Pasar a real
                        </Boton>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!todas && (
                <p className="text-secundario text-texto-suave">
                  «Pasar a real» se abre cuando estén las once.
                </p>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
