import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boton,
  Botones,
  CAJA,
  Campo,
  Cargando,
  Envoltorio,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  PanelLateral,
  Selector,
  clases,
} from '@estook/ui';
import {
  MARGEN,
  bajar,
  elCaminoDelQr,
  elPngDelQr,
  elSvgDelQr,
  laMatriz,
  type MatrizDelQr,
} from '@estook/ui/qr';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import {
  centimos,
  comoCodigoDeVendedor,
  conSimbolo,
  elDescuentoEnPalabras,
  type CifrasDeUnVendedor,
} from '@estook/dominio';
import { elContrato, fechaCorta, laActividad } from '../datos/clientes.ts';
import {
  clientes,
  cuantoTiempo,
  type CodigoDeUnVendedor,
  type FichaDeVendedor,
  type LosVendedores,
  type VendedorEnLista,
} from '../datos/vendedores.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Los vendedores (A3 · decisión 0076).
 *
 * «El vendedor no se ocupa de nada, solo trae el cliente; nosotros vemos con qué
 * vendedor ha venido» (Richi). Así que esto es **nuestro**: una ficha por vendedor,
 * sus códigos con su enlace y su QR, y **sus cifras**, que salen de la misma lista
 * que Clientes. Las comisiones se pactan fuera.
 */

/** Los descuentos que se ofrecen al hacer un código: los redondos. */
const DESCUENTOS = [
  { valor: '0', texto: 'Sin descuento' },
  { valor: '10', texto: '10 % el primer mes' },
  { valor: '20', texto: '20 % el primer mes' },
  { valor: '25', texto: '25 % el primer mes' },
  { valor: '30', texto: '30 % el primer mes' },
  { valor: '50', texto: '50 % el primer mes' },
  { valor: '100', texto: 'El primer mes, gratis' },
] as const;

export function Vendedores() {
  const { cliente } = usarSesion();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);

  const consulta = useQuery({
    queryKey: ['admin_los_vendedores'],
    // Se vuelve a leer al entrar: un cliente que se registra con un código no avisa
    // aquí, y unas cifras de hace un rato dirían que no ha traído a nadie.
    staleTime: 0,
    queryFn: async () => {
      const respuesta = await cliente.consultar<LosVendedores>('admin_los_vendedores');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  const datos = consulta.data;
  const traidos = datos?.vendedores.reduce((suma, v) => suma + v.cifras.traidos, 0) ?? 0;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex items-start justify-between gap-e3">
        <div className="min-w-0">
          <h1 className="text-pantalla font-semibold">Vendedores</h1>
          {datos !== undefined && datos.vendedores.length > 0 && (
            <p className="text-secundario text-texto-suave">
              {clientes(traidos)} con vendedor · {String(datos.sinVendedor)} sin él
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Boton
            tono="principal"
            onClick={() => {
              setNuevo(true);
            }}
          >
            Nuevo vendedor
          </Boton>
        </div>
      </div>

      {consulta.isPending ? (
        <Cargando que="los vendedores" lineas={4} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : datos === undefined || datos.vendedores.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay vendedores"
          frase="Cada vendedor tiene sus códigos, con su enlace y su QR. Quien se registra con uno queda apuntado como suyo."
          dibujo="equipo"
          accion={
            <Boton
              tono="principal"
              onClick={() => {
                setNuevo(true);
              }}
            >
              Nuevo vendedor
            </Boton>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-e3 sm:grid-cols-2">
          {datos.vendedores.map((v) => (
            <li key={v.id}>
              <TarjetaDeVendedor
                vendedor={v}
                alAbrir={() => {
                  setAbierto(v.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {abierto !== null && (
        <FichaDelVendedor
          vendedorId={abierto}
          alCerrar={() => {
            setAbierto(null);
          }}
        />
      )}
      {nuevo && (
        <HojaDelVendedor
          alCerrar={() => {
            setNuevo(false);
          }}
          alCrear={(id) => {
            setNuevo(false);
            setAbierto(id);
          }}
        />
      )}
    </div>
  );
}

// ── La tarjeta de cada vendedor ─────────────────────────────────────────────

function TarjetaDeVendedor({
  vendedor,
  alAbrir,
}: {
  readonly vendedor: VendedorEnLista;
  readonly alAbrir: () => void;
}) {
  const c = vendedor.cifras;
  const vivos = vendedor.codigos.filter((x) => x.cerradoEn === null);
  return (
    <button
      type="button"
      onClick={alAbrir}
      aria-label={`Abrir ${vendedor.nombre}`}
      className="flex w-full flex-col gap-e3 rounded-mayor border border-borde bg-superficie p-e4 text-left [box-shadow:var(--sombra-tarjeta)] hover:border-borde-fuerte"
    >
      <span className="flex items-center justify-between gap-e2">
        <span className="truncate text-seccion font-semibold">{vendedor.nombre}</span>
        {vendedor.bajaEn !== null && <Etiqueta tono="neutro">De baja</Etiqueta>}
      </span>
      <span className="grid grid-cols-3 gap-e2">
        <Numero que="Traídos" valor={String(c.traidos)} />
        <Numero que="Pagan" valor={String(c.pagando)} />
        <Numero que="Al mes" valor={conSimbolo(centimos(c.alMes))} />
      </span>
      <span className="text-secundario text-texto-suave">
        {vivos.length === 0 ? 'Sin códigos abiertos' : vivos.map((x) => x.codigo).join(' · ')}
        {c.esteMes > 0 ? ` · ${String(c.esteMes)} este mes` : ''}
      </span>
    </button>
  );
}

function Numero({ que, valor }: { readonly que: string; readonly valor: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-seccion font-semibold tabular-nums">{valor}</span>
      <span className="text-etiqueta text-texto-suave">{que}</span>
    </span>
  );
}

// ── La ficha ─────────────────────────────────────────────────────────────────

type Gesto =
  | { readonly que: 'editar' }
  | { readonly que: 'baja' }
  | { readonly que: 'codigo' }
  | { readonly que: 'cerrar'; readonly codigo: CodigoDeUnVendedor }
  | { readonly que: 'qr'; readonly codigo: CodigoDeUnVendedor };

function FichaDelVendedor({
  vendedorId,
  alCerrar,
}: {
  readonly vendedorId: string;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [gesto, setGesto] = useState<Gesto | null>(null);

  const consulta = useQuery({
    queryKey: ['admin_un_vendedor', vendedorId],
    staleTime: 0,
    queryFn: async () => {
      const respuesta = await cliente.consultar<FichaDeVendedor>('admin_un_vendedor', {
        vendedor_id: vendedorId,
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  async function alCambiar() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_un_vendedor', vendedorId] }),
      cache.invalidateQueries({ queryKey: ['admin_los_vendedores'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  }

  const ficha = consulta.data;
  const v = ficha?.vendedor;
  const deBaja = v?.bajaEn != null;

  return (
    <PanelLateral abierta titulo={v?.nombre ?? 'Vendedor'} alCerrar={alCerrar}>
      {consulta.isPending ? (
        <div className="pt-e4">
          <Cargando que="la ficha" lineas={5} />
        </div>
      ) : consulta.error instanceof FalloDeLaApi ? (
        <div className="pt-e4">
          <ErrorEnCristiano error={consulta.error.error} />
        </div>
      ) : ficha === undefined || v === undefined ? null : (
        <div className="flex flex-col gap-e4 pt-e4">
          <div className="flex flex-col gap-e2">
            <p className="text-secundario text-texto-suave">
              {[v.telefono, v.correo].filter((x) => x !== null).join(' · ') || 'Sin contacto'}
              {' · '}
              {v.bajaEn !== null
                ? `de baja desde el ${fechaCorta(v.bajaEn)}`
                : `desde el ${fechaCorta(v.altaEn)}`}
            </p>
            {v.notas !== null && v.notas !== '' && (
              <p className="whitespace-pre-line text-secundario">{v.notas}</p>
            )}
            {!deBaja && (
              <div className="flex flex-wrap gap-e2">
                <Boton
                  tono="secundario"
                  onClick={() => {
                    setGesto({ que: 'editar' });
                  }}
                >
                  Editar
                </Boton>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setGesto({ que: 'baja' });
                  }}
                >
                  Dar de baja
                </Boton>
              </div>
            )}
          </div>

          <LasCifras cifras={v.cifras} />

          <Bloque
            titulo="Códigos"
            accion={
              deBaja ? undefined : (
                <Boton
                  tono="texto"
                  onClick={() => {
                    setGesto({ que: 'codigo' });
                  }}
                >
                  Nuevo código
                </Boton>
              )
            }
          >
            {v.codigos.length === 0 ? (
              <p className="py-e2 text-secundario text-texto-suave">
                Todavía ninguno. Con un código, su enlace y su QR, quien se registra queda como
                suyo.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-borde">
                {v.codigos.map((c) => (
                  <FilaDeCodigo key={c.id} codigo={c} alGesto={setGesto} />
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque
            titulo={
              ficha.clientes.length === 0
                ? 'Sus clientes'
                : `Sus clientes · ${String(ficha.clientes.length)}`
            }
          >
            {ficha.clientes.length === 0 ? (
              <p className="py-e2 text-secundario text-texto-suave">
                Todavía no ha traído a nadie.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-borde">
                {ficha.clientes.map((c) => {
                  const contrato = elContrato(c);
                  const actividad = laActividad(c.actividad);
                  return (
                    <li key={c.organizacionId} className="flex flex-col gap-e1 py-e2">
                      <span className="flex items-center justify-between gap-e2">
                        <span className="truncate font-medium">{c.nombre}</span>
                        <span className="shrink-0 text-secundario tabular-nums">
                          {c.cuotaAlMes === null ? '' : conSimbolo(centimos(c.cuotaAlMes))}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-e2">
                        <Etiqueta tono={contrato.tono}>{contrato.texto}</Etiqueta>
                        <Etiqueta tono={actividad.tono}>{actividad.texto}</Etiqueta>
                        <span className="text-secundario text-texto-suave">
                          {c.vendedor?.codigo ?? ''} · desde el {fechaCorta(c.alta)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloque>
        </div>
      )}

      {v !== undefined && gesto !== null && (
        <HojaDelGesto
          gesto={gesto}
          vendedor={v}
          alCerrar={() => {
            setGesto(null);
          }}
          alHecho={alCambiar}
        />
      )}
    </PanelLateral>
  );
}

function LasCifras({ cifras: c }: { readonly cifras: CifrasDeUnVendedor }) {
  const piezas: readonly { que: string; valor: string; tono: 'bien' | 'atencion' | null }[] = [
    {
      que: c.esteMes > 0 ? `Traídos · ${String(c.esteMes)} este mes` : 'Traídos',
      valor: String(c.traidos),
      tono: null,
    },
    { que: 'Pagan', valor: String(c.pagando), tono: 'bien' },
    { que: 'En prueba', valor: String(c.enPrueba), tono: null },
    { que: 'Se están yendo', valor: String(c.seVan), tono: c.seVan > 0 ? 'atencion' : null },
    { que: 'Sin pagar', valor: String(c.sinPagar), tono: null },
    { que: 'Lo usan', valor: String(c.loUsan), tono: null },
    { que: 'Dormidos', valor: String(c.dormidos), tono: c.dormidos > 0 ? 'atencion' : null },
    { que: 'Dejan al mes', valor: conSimbolo(centimos(c.alMes)), tono: null },
    { que: 'Llevan, de media', valor: cuantoTiempo(c.diasDeMedia), tono: null },
  ];
  return (
    <dl className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
      {piezas.map((p) => (
        <div key={p.que} className="flex flex-col rounded-grande bg-fondo px-e3 py-e2">
          <dd
            className={clases(
              'text-seccion font-semibold tabular-nums',
              p.tono === 'bien' && p.valor !== '0' && 'text-bien',
              p.tono === 'atencion' && 'text-atencion',
            )}
          >
            {p.valor}
          </dd>
          <dt className="text-etiqueta text-texto-suave">{p.que}</dt>
        </div>
      ))}
    </dl>
  );
}

function FilaDeCodigo({
  codigo: c,
  alGesto,
}: {
  readonly codigo: CodigoDeUnVendedor;
  readonly alGesto: (gesto: Gesto) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const descuento = elDescuentoEnPalabras(c.descuento);
  const cerrado = c.cerradoEn !== null;

  useEffect(() => {
    if (!copiado) return;
    const reloj = setTimeout(() => {
      setCopiado(false);
    }, 2_000);
    return () => {
      clearTimeout(reloj);
    };
  }, [copiado]);

  return (
    <li className="flex flex-col gap-e1 py-e2">
      <span className="flex items-center justify-between gap-e2">
        <span
          className={clases('font-mono font-semibold', cerrado && 'text-texto-suave line-through')}
        >
          {c.codigo}
        </span>
        <span className="text-secundario text-texto-suave">{clientes(c.traidos)}</span>
      </span>
      <span className="text-secundario text-texto-suave">
        {[
          c.campana,
          descuento ?? 'Sin descuento',
          c.cerradoEn !== null ? `cerrado el ${fechaCorta(c.cerradoEn)}` : null,
        ]
          .filter((x) => x !== null && x !== '')
          .join(' · ')}
      </span>
      {!cerrado && (
        <span className="flex flex-wrap gap-x-e3">
          <Boton
            tono="texto"
            onClick={() => {
              void navigator.clipboard.writeText(c.enlace).then(() => {
                setCopiado(true);
              });
            }}
          >
            {copiado ? 'Copiado' : 'Copiar el enlace'}
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              alGesto({ que: 'qr', codigo: c });
            }}
          >
            El QR
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              alGesto({ que: 'cerrar', codigo: c });
            }}
          >
            Cerrar el código
          </Boton>
        </span>
      )}
    </li>
  );
}

function Bloque({
  titulo,
  accion,
  children,
}: {
  readonly titulo: string;
  readonly accion?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e1 rounded-grande bg-fondo px-e4 py-e3">
      <div className="flex items-center justify-between gap-e2">
        <h3 className="font-semibold">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

// ── Crear y editar un vendedor ──────────────────────────────────────────────

function HojaDelVendedor({
  vendedor,
  alCerrar,
  alCrear,
  alHecho,
}: {
  readonly vendedor?: VendedorEnLista;
  readonly alCerrar: () => void;
  readonly alCrear?: (id: string) => void;
  readonly alHecho?: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const id = useId();
  const [datos, setDatos] = useState({
    nombre: vendedor?.nombre ?? '',
    telefono: vendedor?.telefono ?? '',
    correo: vendedor?.correo ?? '',
    notas: vendedor?.notas ?? '',
  });
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const sinVacio = (valor: string) => (valor.trim() === '' ? null : valor.trim());

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const cuerpo = {
      nombre: datos.nombre,
      telefono: sinVacio(datos.telefono),
      correo: sinVacio(datos.correo),
      notas: sinVacio(datos.notas),
    };
    const respuesta =
      vendedor === undefined
        ? await cliente.ejecutar<{ vendedorId: string }>('admin_crear_vendedor', cuerpo)
        : await cliente.ejecutar('admin_cambiar_el_vendedor', {
            vendedor_id: vendedor.id,
            ...cuerpo,
          });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['admin_los_vendedores'] });
    if (vendedor === undefined) {
      alCrear?.((respuesta.datos as { vendedorId: string }).vendedorId);
    } else {
      void alHecho?.();
      alCerrar();
    }
  }

  return (
    <Hoja
      abierta
      titulo={vendedor === undefined ? 'Nuevo vendedor' : 'Editar el vendedor'}
      alCerrar={alCerrar}
    >
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="Nombre"
          name="nombre"
          value={datos.nombre}
          autoFocus
          onChange={(evento) => {
            setDatos({ ...datos, nombre: evento.target.value });
          }}
          obligatorio
        />
        <Campo
          etiqueta="Teléfono"
          tipo="telefono"
          name="telefono"
          value={datos.telefono}
          onChange={(evento) => {
            setDatos({ ...datos, telefono: evento.target.value });
          }}
        />
        <Campo
          etiqueta="Correo"
          tipo="correo"
          name="correo"
          value={datos.correo}
          ayuda="Para hablar con él. No entra en Estook."
          onChange={(evento) => {
            setDatos({ ...datos, correo: evento.target.value });
          }}
        />
        <Envoltorio
          id={id}
          etiqueta="Notas"
          ayuda="Lo que habéis pactado, de dónde viene… Solo lo ve Estook."
        >
          <textarea
            id={id}
            rows={3}
            maxLength={2000}
            value={datos.notas}
            onChange={(evento) => {
              setDatos({ ...datos, notas: evento.currentTarget.value });
            }}
            className={clases(CAJA, 'py-e2')}
          />
        </Envoltorio>
        {error !== null && <ErrorEnCristiano error={error} />}
        <Botones>
          <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Guardando">
            {vendedor === undefined ? 'Crear el vendedor' : 'Guardar'}
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}

// ── Lo demás: dar de baja, un código, cerrarlo y su QR ──────────────────────

function HojaDelGesto({
  gesto,
  vendedor,
  alCerrar,
  alHecho,
}: {
  readonly gesto: Gesto;
  readonly vendedor: VendedorEnLista;
  readonly alCerrar: () => void;
  readonly alHecho: () => Promise<void>;
}) {
  if (gesto.que === 'editar') {
    return <HojaDelVendedor vendedor={vendedor} alCerrar={alCerrar} alHecho={alHecho} />;
  }
  if (gesto.que === 'qr') return <HojaDelQr codigo={gesto.codigo} alCerrar={alCerrar} />;
  return <HojaConMotivo gesto={gesto} vendedor={vendedor} alCerrar={alCerrar} alHecho={alHecho} />;
}

function HojaConMotivo({
  gesto,
  vendedor,
  alCerrar,
  alHecho,
}: {
  readonly gesto: Exclude<Gesto, { que: 'editar' } | { que: 'qr' }>;
  readonly vendedor: VendedorEnLista;
  readonly alCerrar: () => void;
  readonly alHecho: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [motivo, setMotivo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [campana, setCampana] = useState('');
  const [descuento, setDescuento] = useState('0');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const comoQueda = comoCodigoDeVendedor(codigo);
  const malEscrito = gesto.que === 'codigo' && codigo.trim() !== '' && comoQueda === null;

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta =
      gesto.que === 'baja'
        ? await cliente.ejecutar('admin_dar_de_baja_al_vendedor', {
            vendedor_id: vendedor.id,
            motivo,
          })
        : gesto.que === 'cerrar'
          ? await cliente.ejecutar('admin_cerrar_un_codigo', {
              codigo_id: gesto.codigo.id,
              motivo,
            })
          : await cliente.ejecutar('admin_crear_un_codigo', {
              vendedor_id: vendedor.id,
              codigo,
              campana: campana.trim() === '' ? null : campana.trim(),
              descuento: Number(descuento),
            });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    void alHecho();
    alCerrar();
  }

  const titulo =
    gesto.que === 'baja'
      ? `Dar de baja a ${vendedor.nombre}`
      : gesto.que === 'cerrar'
        ? `Cerrar ${gesto.codigo.codigo}`
        : 'Nuevo código';

  return (
    <Hoja abierta titulo={titulo} alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        {gesto.que === 'codigo' ? (
          <>
            <Campo
              etiqueta="El código"
              name="codigo"
              value={codigo}
              autoFocus
              placeholder="JUAN26"
              ayuda={
                comoQueda === null
                  ? 'De 3 a 20 letras, números o guiones. No se repite nunca.'
                  : `Su enlace: estook.com/?ref=${comoQueda}`
              }
              {...(malEscrito
                ? { error: 'Solo letras sin tilde, números y guiones, de 3 a 20.' }
                : {})}
              onChange={(evento) => {
                setCodigo(evento.target.value);
              }}
              obligatorio
            />
            <Campo
              etiqueta="Campaña"
              name="campana"
              value={campana}
              placeholder="Feria de hostelería"
              onChange={(evento) => {
                setCampana(evento.target.value);
              }}
            />
            <Selector
              etiqueta="Descuento para el cliente"
              opciones={DESCUENTOS}
              value={descuento}
              ayuda="Solo en el pago mensual. No se cambia después: para otro, otro código."
              onChange={(evento) => {
                setDescuento(evento.target.value);
              }}
            />
          </>
        ) : (
          <>
            <p className="text-secundario text-texto-suave">
              {gesto.que === 'baja'
                ? 'Se cierran todos sus códigos. Sus clientes siguen apuntados como suyos.'
                : 'Ya no vale para nadie nuevo. Quien se registró con él conserva su descuento.'}
            </p>
            <Campo
              etiqueta="Por qué"
              name="motivo"
              value={motivo}
              autoFocus
              ayuda="Se queda escrito en la auditoría."
              onChange={(evento) => {
                setMotivo(evento.target.value);
              }}
              obligatorio
            />
          </>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Botones>
          <Boton
            type="submit"
            tono={gesto.que === 'codigo' ? 'principal' : 'peligro'}
            cargando={enviando}
            disabled={malEscrito}
            textoCargando="Un momento"
          >
            {gesto.que === 'codigo'
              ? 'Crear el código'
              : gesto.que === 'baja'
                ? 'Dar de baja'
                : 'Cerrar el código'}
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}

/** El QR del enlace de un código, para un folleto: en pantalla, en PNG y en SVG. */
function HojaDelQr({
  codigo,
  alCerrar,
}: {
  readonly codigo: CodigoDeUnVendedor;
  readonly alCerrar: () => void;
}) {
  const [matriz, setMatriz] = useState<MatrizDelQr | null>(null);

  // El codificador (`uqr`) se carga solo al abrir el QR: `laMatriz` lo trae aparte.
  useEffect(() => {
    let vivo = true;
    void laMatriz(codigo.enlace).then((hecha) => {
      if (vivo) setMatriz(hecha);
    });
    return () => {
      vivo = false;
    };
  }, [codigo.enlace]);

  const nombre = `estook-${codigo.codigo.toLowerCase()}`;
  const lado = matriz === null ? 0 : matriz.length + MARGEN * 2;

  return (
    <Hoja abierta titulo={`El QR de ${codigo.codigo}`} alCerrar={alCerrar}>
      <div className="flex flex-col items-center gap-e4">
        {matriz === null ? (
          <Cargando que="el QR" lineas={3} />
        ) : (
          <svg
            role="img"
            aria-label={`QR de ${codigo.codigo}`}
            viewBox={`0 0 ${String(lado)} ${String(lado)}`}
            shapeRendering="crispEdges"
            className="h-56 w-56 rounded-grande"
          >
            <rect width="100%" height="100%" fill="#fff" />
            <path fill="#000" d={elCaminoDelQr(matriz, MARGEN)} />
          </svg>
        )}
        <p className="break-all text-center text-secundario text-texto-suave">{codigo.enlace}</p>
        <Botones>
          <Boton
            tono="principal"
            disabled={matriz === null}
            onClick={() => {
              if (matriz === null) return;
              void elPngDelQr(matriz).then((png) => {
                bajar(png, `${nombre}.png`);
              });
            }}
          >
            Bajar en PNG
          </Boton>
          <Boton
            tono="secundario"
            disabled={matriz === null}
            onClick={() => {
              if (matriz === null) return;
              bajar(new Blob([elSvgDelQr(matriz)], { type: 'image/svg+xml' }), `${nombre}.svg`);
            }}
          >
            Para la imprenta (SVG)
          </Boton>
        </Botones>
      </div>
    </Hoja>
  );
}
