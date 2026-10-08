import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loContadoEnUnidades } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Tarjeta,
  clases,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { comoDinero, conUnidadDeUso } from './contrato.ts';
import { Recuento } from './Recuento.tsx';
import {
  nombreDeZona,
  nombreDelEnvase,
  numeroEscrito,
  seCuentaEnCajas,
  type Cerrado,
  type ElInventario,
  type InventarioEnLista,
  type LineaDelInventario,
  type LoEscrito,
  type LoQueHayQueRecontar,
  type UnInventario,
} from './contratoDelInventario.ts';

/**
 * Almacén · Movimientos · Inventario (M8 · decisión 0078).
 *
 * La entrada al inventario, en lo que se mira primero:
 *
 *   · **Te piden que vuelvas a contar**, si te lo piden a ti.
 *   · **Por cerrar**: lo que han mandado los que cuentan. Quien cierra lo abre, lo
 *     mira —lo que más baila, primero— y lo cierra, o pide que se recuente.
 *   · **Toca contar**: cada semana lo que más vale, el resto una vez al mes.
 *   · **Contar**, una zona, cuando se quiera.
 *   · Y los últimos cerrados.
 *
 * Un inventario abierto vive en la dirección (`?inventario=…`): el aviso de la campana
 * lleva a él, y el botón de atrás lo cierra.
 */
export function Inventario() {
  const datos = usarLectura<ElInventario>('el_inventario');
  const abierto = usarAbiertoEnLaDireccion('inventario');
  const [contando, setContando] = useState<{ readonly soloEstos: readonly string[] | null } | null>(
    null,
  );
  const [recontando, setRecontando] = useState(false);

  if (datos.isPending) return <Cargando que="el inventario" />;
  const lo = datos.data;
  if (lo === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer el inventario">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  if (abierto.abierto !== null) {
    const suyo = lo.paraRecontar.filter((l) => l.inventarioId === abierto.abierto);
    return lo.puedeCerrar ? (
      <RevisarInventario inventarioId={abierto.abierto} alVolver={abierto.cerrar} />
    ) : (
      <Recontar lineas={suyo} alVolver={abierto.cerrar} />
    );
  }

  if (contando !== null) {
    return (
      <Recuento
        soloEstos={contando.soloEstos}
        alVolver={() => {
          setContando(null);
        }}
      />
    );
  }

  if (recontando) {
    return (
      <Recontar
        lineas={lo.paraRecontar}
        alVolver={() => {
          setRecontando(false);
        }}
      />
    );
  }

  const caros = lo.tocaContar.productos.filter((p) => p.porque === 'lo_caro');

  return (
    <div className="flex flex-col gap-e4">
      <Botones>
        <Boton
          tono="principal"
          onClick={() => {
            setContando({ soloEstos: null });
          }}
        >
          Contar una zona
        </Boton>
      </Botones>

      {lo.paraRecontar.length > 0 && (
        <Aviso
          tono="atencion"
          titulo={`Te piden que vuelvas a contar ${lo.paraRecontar.length === 1 ? '1 producto' : `${String(lo.paraRecontar.length)} productos`}`}
          accion={
            <Boton
              tono="secundario"
              onClick={() => {
                setRecontando(true);
              }}
            >
              Contarlos
            </Boton>
          }
        >
          {lo.paraRecontar
            .slice(0, 5)
            .map((l) => l.nombre)
            .join(', ')}
          {lo.paraRecontar.length > 5 ? '…' : '.'}
        </Aviso>
      )}

      {lo.porCerrar.length > 0 && (
        <Tarjeta
          titulo="Por cerrar"
          cuantos={lo.porCerrar.length}
          origen={
            lo.puedeCerrar
              ? 'Lo que han contado y espera a que lo mires'
              : 'Lo mandado, esperando a quien cierra el inventario'
          }
        >
          <ul className="flex flex-col divide-y divide-borde">
            {lo.porCerrar.map((i) => (
              <FilaDeInventario
                key={i.id}
                inventario={i}
                hoy={lo.hoy}
                {...(lo.puedeCerrar
                  ? {
                      alAbrir: () => {
                        abierto.abrir(i.id);
                      },
                    }
                  : {})}
              />
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Toca contar"
        {...(lo.tocaContar.productos.length > 0 ? { cuantos: lo.tocaContar.productos.length } : {})}
        origen="Cada semana lo que más vale; lo demás, una vez al mes"
      >
        {lo.tocaContar.productos.length === 0 ? (
          <p className="text-secundario text-texto-suave">{lo.tocaContar.frase}</p>
        ) : (
          <div className="flex flex-col gap-e3">
            <p className="text-secundario">{lo.tocaContar.frase}</p>
            <ul className="flex flex-wrap gap-e2" aria-label="Lo que toca contar">
              {lo.tocaContar.productos.slice(0, 12).map((p) => (
                <li key={p.id}>
                  <Etiqueta tono={p.porque === 'lo_caro' ? 'atencion' : 'neutro'}>
                    {p.nombre}
                  </Etiqueta>
                </li>
              ))}
              {lo.tocaContar.productos.length > 12 && (
                <li className="text-secundario text-texto-suave">
                  y {String(lo.tocaContar.productos.length - 12)} más
                </li>
              )}
            </ul>
            <Botones>
              <Boton
                tono="secundario"
                onClick={() => {
                  setContando({ soloEstos: lo.tocaContar.productos.map((p) => p.id) });
                }}
              >
                Contar estos
              </Boton>
              {caros.length > 0 && caros.length < lo.tocaContar.productos.length && (
                <Boton
                  tono="texto"
                  onClick={() => {
                    setContando({ soloEstos: caros.map((p) => p.id) });
                  }}
                >
                  Solo los que más valen ({caros.length})
                </Boton>
              )}
            </Botones>
          </div>
        )}
      </Tarjeta>

      {lo.cerrados.length > 0 && (
        <Tarjeta titulo="Los últimos">
          <ul className="flex flex-col divide-y divide-borde">
            {lo.cerrados.map((i) => (
              <FilaDeInventario key={i.id} inventario={i} hoy={lo.hoy} />
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

/** «Hoy, 07:05», «lun 6, 07:05»: el día y la hora en que se contó. */
function cuandoFue(iso: string, hoy: string): string {
  const cuando = new Date(iso);
  const hora = cuando.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dia = cuando.toLocaleDateString('en-CA');
  if (dia === hoy) return `hoy, ${hora}`;
  return `${cuando.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}, ${hora}`;
}

function FilaDeInventario({
  inventario: i,
  hoy,
  alAbrir,
}: {
  readonly inventario: InventarioEnLista;
  readonly hoy: string;
  readonly alAbrir?: () => void;
}) {
  const contenido = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">
          {nombreDeZona(i.zona)} · {i.contados} {i.contados === 1 ? 'producto' : 'productos'}
        </span>
        <span className="text-etiqueta text-texto-tenue">
          {i.estado === 'contado'
            ? `Contado por ${i.esMio ? 'ti' : (i.contadoPor ?? 'alguien')}, ${cuandoFue(i.contadoEn, hoy)}`
            : i.estado === 'cerrado'
              ? `Cerrado por ${i.cerradoPor ?? 'alguien'}, ${cuandoFue(i.cerradoEn ?? i.contadoEn, hoy)}`
              : `Descartado: ${i.motivoDeDescarte ?? ''}`}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-e2">
        {i.aRecontar > 0 && <Etiqueta tono="atencion">{i.aRecontar} a recontar</Etiqueta>}
        {i.estado === 'contado' && i.noCuadran !== undefined && (
          <Etiqueta tono={i.noCuadran === 0 ? 'bien' : 'atencion'}>
            {i.noCuadran === 0 ? 'Cuadra todo' : `${String(i.noCuadran)} no cuadran`}
          </Etiqueta>
        )}
        {i.estado === 'contado' && i.noCuadran === undefined && <Etiqueta>Esperando</Etiqueta>}
        {i.estado === 'descartado' && <Etiqueta>Descartado</Etiqueta>}
      </span>
    </>
  );
  return (
    <li>
      {alAbrir === undefined ? (
        <div className="flex flex-wrap items-center gap-e3 py-e2">{contenido}</div>
      ) : (
        <button
          type="button"
          onClick={alAbrir}
          className="flex min-h-toque w-full flex-wrap items-center gap-e3 py-e2 text-left hover:bg-fondo"
        >
          {contenido}
        </button>
      )}
    </li>
  );
}

// ── Revisar y cerrar lo mandado ─────────────────────────────────────────────

/**
 * Lo que mira quien cierra: **lo que más baila, primero**, con lo que decía el libro al
 * contarlo, la diferencia y —con precios— lo que vale. Puede corregir una cifra que ha
 * ido a mirar, pedir que se recuenten unas líneas, cerrarlo o descartarlo.
 */
function RevisarInventario({
  inventarioId,
  alVolver,
}: {
  readonly inventarioId: string;
  readonly alVolver: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const datos = usarLectura<UnInventario>('un_inventario', { inventario_id: inventarioId });
  const [corregido, setCorregido] = useState<Record<string, LoEscrito>>({});
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set());
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<Cerrado | null>(null);
  const [pedidos, setPedidos] = useState<number | null>(null);

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['el_inventario'] });
    await cache.invalidateQueries({ queryKey: ['un_inventario'] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['almacen_hoy'] });
  }

  if (datos.isPending) return <Cargando que="lo contado" />;
  const lo = datos.data;
  if (lo === undefined) {
    return (
      <Aviso
        tono="mal"
        titulo="No he podido leer ese inventario"
        accion={
          <Boton tono="secundario" onClick={alVolver}>
            Volver
          </Boton>
        }
      >
        Puede que ya no exista, o que sea de otro local.
      </Aviso>
    );
  }

  const correcciones = lo.lineas.flatMap((l) => {
    const hay = cuantoHayEn(l, corregido[l.productoId]);
    return hay === null || hay === l.hay
      ? []
      : [
          {
            producto_id: l.productoId,
            hay,
            ...(seCuentaEnCajas(l)
              ? {
                  formatos: numeroEscrito(corregido[l.productoId]?.formatos) ?? 0,
                  sueltas: numeroEscrito(corregido[l.productoId]?.sueltas) ?? 0,
                }
              : {}),
          },
        ];
  });

  async function hacer(que: string, ejecutar: () => Promise<boolean>) {
    setHaciendo(que);
    setError(null);
    const bien = await ejecutar();
    setHaciendo(null);
    if (bien) await refrescar();
  }

  if (lo.inventario.estado !== 'contado' || hecho !== null) {
    return (
      <div className="flex flex-col gap-e4">
        <Aviso
          tono="bien"
          titulo={hecho === null ? 'Este inventario ya no está por cerrar' : 'Inventario cerrado'}
          esNoticia
        >
          {hecho === null
            ? lo.inventario.estado === 'cerrado'
              ? `Lo cerró ${lo.inventario.cerradoPor ?? 'alguien'}.`
              : `Se descartó: ${lo.inventario.motivoDeDescarte ?? ''}`
            : `${hecho.corregidos === 0 ? 'Cuadraba todo' : `${String(hecho.corregidos)} corregidos`}, ${String(hecho.yaCuadraban)} que ya cuadraban${hecho.fuera !== undefined && hecho.fuera > 0 ? `, y ${String(hecho.fuera)} fuera, esperando a que se recuenten` : ''}.`}
        </Aviso>
        <Botones>
          <Boton tono="secundario" onClick={alVolver}>
            Volver al inventario
          </Boton>
        </Botones>
      </div>
    );
  }

  const conDinero = lo.puedeVerPrecios;
  const valorQueFalta = conDinero
    ? lo.lineas.reduce(
        (suma, l) => suma + (l.recontar ? 0 : (l.valorDeLaDiferenciaCentimos ?? 0)),
        0,
      )
    : null;
  const noCuadran = lo.lineas.filter((l) => (l.diferencia ?? 0) !== 0).length;
  const aRecontar = lo.lineas.filter((l) => l.recontar).length;

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      {pedidos !== null && (
        <Aviso tono="bien" titulo={`Pedido que se recuenten ${String(pedidos)}`} esNoticia>
          A quien los contó le ha llegado el aviso. Mientras tanto, si cierras, se quedan fuera.
        </Aviso>
      )}

      <Tarjeta
        titulo={`${nombreDeZona(lo.inventario.zona)} · ${lo.inventario.contadoPor ?? 'alguien'}`}
        origen={`${String(lo.lineas.length)} contados · ${String(noCuadran)} no cuadran${aRecontar > 0 ? ` · ${String(aRecontar)} a recontar` : ''}${valorQueFalta !== null && valorQueFalta !== 0 ? ` · ${valorQueFalta < 0 ? 'faltan' : 'sobran'} ${comoDinero(Math.abs(valorQueFalta))}` : ''}`}
        accion={
          <Boton tono="texto" onClick={alVolver}>
            Volver
          </Boton>
        }
      >
        <ul className="flex flex-col divide-y divide-borde">
          {lo.lineas.map((l) => (
            <LineaParaCerrar
              key={l.productoId}
              linea={l}
              conDinero={conDinero}
              elegida={elegidos.has(l.productoId)}
              alElegir={() => {
                setElegidos((antes) => {
                  const nuevos = new Set(antes);
                  if (nuevos.has(l.productoId)) nuevos.delete(l.productoId);
                  else nuevos.add(l.productoId);
                  return nuevos;
                });
              }}
              corrigiendo={corrigiendo === l.productoId}
              alCorregir={() => {
                setCorrigiendo(corrigiendo === l.productoId ? null : l.productoId);
              }}
              escrito={corregido[l.productoId] ?? {}}
              alEscribir={(campo, valor) => {
                setCorregido((antes) => ({
                  ...antes,
                  [l.productoId]: { ...antes[l.productoId], [campo]: valor },
                }));
              }}
            />
          ))}
        </ul>
      </Tarjeta>

      {descartando && (
        <Tarjeta titulo="Descartar lo contado">
          <div className="flex flex-col gap-e3">
            <Campo
              etiqueta="Por qué"
              ayuda="No toca el libro: queda descartado, con tu nombre y esto."
              value={motivo}
              onChange={(e) => {
                setMotivo(e.currentTarget.value);
              }}
            />
            <Botones>
              <Boton
                tono="peligro"
                disabled={motivo.trim() === '' || haciendo !== null}
                cargando={haciendo === 'descartar'}
                textoCargando="Descartando"
                onClick={() => {
                  void hacer('descartar', async () => {
                    const r = await cliente.ejecutar('descartar_inventario', {
                      inventario_id: inventarioId,
                      motivo: motivo.trim(),
                    });
                    if (!r.ok) setError(r.error);
                    else alVolver();
                    return r.ok;
                  });
                }}
              >
                Descartarlo
              </Boton>
              <Boton
                tono="texto"
                onClick={() => {
                  setDescartando(false);
                }}
              >
                Dejarlo
              </Boton>
            </Botones>
          </div>
        </Tarjeta>
      )}

      <Botones>
        <Boton
          tono="principal"
          disabled={haciendo !== null}
          cargando={haciendo === 'cerrar'}
          textoCargando="Cerrando"
          onClick={() => {
            void hacer('cerrar', async () => {
              const r = await cliente.ejecutar<Cerrado>('cerrar_inventario', {
                inventario_id: inventarioId,
                ...(correcciones.length > 0 ? { correcciones } : {}),
              });
              if (!r.ok) setError(r.error);
              else setHecho(r.datos);
              return r.ok;
            });
          }}
        >
          {aRecontar > 0
            ? `Cerrar sin los ${String(aRecontar)} a recontar`
            : 'Cerrar el inventario'}
        </Boton>
        {elegidos.size > 0 && (
          <Boton
            tono="secundario"
            disabled={haciendo !== null}
            cargando={haciendo === 'recontar'}
            textoCargando="Pidiendo"
            onClick={() => {
              void hacer('recontar', async () => {
                const r = await cliente.ejecutar<{ pedidos: number }>('pedir_que_lo_recuenten', {
                  inventario_id: inventarioId,
                  producto_ids: [...elegidos],
                });
                if (!r.ok) setError(r.error);
                else {
                  setPedidos(r.datos.pedidos);
                  setElegidos(new Set());
                }
                return r.ok;
              });
            }}
          >
            Que vuelvan a contar {elegidos.size === 1 ? 'este' : `estos ${String(elegidos.size)}`}
          </Boton>
        )}
        {!descartando && (
          <Boton
            tono="texto"
            onClick={() => {
              setDescartando(true);
            }}
          >
            Descartar
          </Boton>
        )}
      </Botones>
    </div>
  );
}

function cuantoHayEn(
  p: { readonly formato: string | null; readonly factor: number; readonly pesoVariable: boolean },
  escrito: LoEscrito | undefined,
): number | null {
  if (escrito === undefined) return null;
  if (seCuentaEnCajas(p)) {
    return loContadoEnUnidades(
      numeroEscrito(escrito.formatos),
      numeroEscrito(escrito.sueltas),
      p.factor,
    );
  }
  return numeroEscrito(escrito.hay);
}

function LineaParaCerrar({
  linea: l,
  conDinero,
  elegida,
  alElegir,
  corrigiendo,
  alCorregir,
  escrito,
  alEscribir,
}: {
  readonly linea: LineaDelInventario;
  readonly conDinero: boolean;
  readonly elegida: boolean;
  readonly alElegir: () => void;
  readonly corrigiendo: boolean;
  readonly alCorregir: () => void;
  readonly escrito: LoEscrito;
  readonly alEscribir: (campo: keyof LoEscrito, valor: string) => void;
}) {
  const diferencia = l.diferencia ?? 0;
  const corregidoA = cuantoHayEn(l, escrito);
  return (
    <li className={clases('flex flex-col gap-e2 py-e2', l.recontar && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-e3">
        <span className="flex min-w-[10rem] flex-1 flex-col">
          <span className="font-medium">{l.producto}</span>
          <span className="text-etiqueta text-texto-tenue">
            decía {conUnidadDeUso(l.decia ?? 0, l.unidadDeUso)} · contado{' '}
            {conUnidadDeUso(l.hay, l.unidadDeUso)}
            {l.formatos !== null && l.formatos > 0
              ? ` (${String(l.formatos)} ${nombreDelEnvase(l.formato).toLowerCase()} y ${String(l.sueltas ?? 0)} sueltas)`
              : ''}
            {corregidoA !== null && corregidoA !== l.hay
              ? ` · lo pones en ${conUnidadDeUso(corregidoA, l.unidadDeUso)}`
              : ''}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-e2">
          {l.recontar ? (
            <Etiqueta tono="atencion">A recontar</Etiqueta>
          ) : diferencia === 0 ? (
            <Etiqueta tono="bien">Cuadra</Etiqueta>
          ) : (
            <Etiqueta tono={diferencia < 0 ? 'mal' : 'bien'}>
              {diferencia > 0 ? '+' : '−'}
              {conUnidadDeUso(Math.abs(diferencia), l.unidadDeUso)}
              {conDinero &&
              l.valorDeLaDiferenciaCentimos !== null &&
              l.valorDeLaDiferenciaCentimos !== undefined
                ? ` · ${comoDinero(Math.abs(l.valorDeLaDiferenciaCentimos))}`
                : ''}
            </Etiqueta>
          )}
        </span>
      </div>
      {/* Lo que cuadra no pide nada: solo lo que baila se recuenta o se corrige. */}
      {!l.recontar && diferencia !== 0 && (
        <div className="flex flex-wrap items-center gap-x-e4 gap-y-e1 text-secundario">
          <label className="inline-flex min-h-toque cursor-pointer items-center gap-e2">
            <input type="checkbox" checked={elegida} onChange={alElegir} className="size-5" />
            Que lo vuelvan a contar
          </label>
          <button
            type="button"
            onClick={alCorregir}
            className="min-h-toque font-medium text-naranja underline-offset-2 hover:underline"
          >
            {corrigiendo ? 'Hecho' : 'Lo he mirado yo'}
          </button>
        </div>
      )}
      {corrigiendo && <CasillasDeContar producto={l} escrito={escrito} alEscribir={alEscribir} />}
    </li>
  );
}

/** Lo contado de un producto: en una casilla, o en cajas y sueltas. */
function CasillasDeContar({
  producto,
  escrito,
  alEscribir,
}: {
  readonly producto: {
    readonly productoId: string;
    readonly formato: string | null;
    readonly factor: number;
    readonly pesoVariable: boolean;
    readonly unidadDeUso: string;
  };
  readonly escrito: LoEscrito;
  readonly alEscribir: (campo: keyof LoEscrito, valor: string) => void;
}) {
  return seCuentaEnCajas(producto) ? (
    <span className="flex gap-e2">
      <span className="w-[6.5rem]">
        <Campo
          id={`recontado-${producto.productoId}-formatos`}
          etiqueta={nombreDelEnvase(producto.formato)}
          tipo="numero"
          value={escrito.formatos ?? ''}
          onChange={(e) => {
            alEscribir('formatos', e.currentTarget.value);
          }}
        />
      </span>
      <span className="w-[6.5rem]">
        <Campo
          id={`recontado-${producto.productoId}-sueltas`}
          etiqueta="Sueltas"
          tipo="numero"
          detras={producto.unidadDeUso}
          value={escrito.sueltas ?? ''}
          onChange={(e) => {
            alEscribir('sueltas', e.currentTarget.value);
          }}
        />
      </span>
    </span>
  ) : (
    <span className="w-[9rem]">
      <Campo
        id={`recontado-${producto.productoId}-hay`}
        etiqueta="Hay"
        tipo="numero"
        detras={producto.unidadDeUso}
        value={escrito.hay ?? ''}
        onChange={(e) => {
          alEscribir('hay', e.currentTarget.value);
        }}
      />
    </span>
  );
}

// ── Volver a contar lo que piden ────────────────────────────────────────────

/** Lo que te piden que vuelvas a contar, a ciegas como la primera vez. */
function Recontar({
  lineas,
  alVolver,
}: {
  readonly lineas: readonly LoQueHayQueRecontar[];
  readonly alVolver: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [escrito, setEscrito] = useState<Record<string, LoEscrito>>({});
  const [mandando, setMandando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState(false);

  if (hecho || lineas.length === 0) {
    return (
      <div className="flex flex-col gap-e4">
        {hecho ? (
          <Aviso tono="bien" titulo="Recontado" esNoticia>
            Ya lo puede cerrar quien lleva el inventario: le ha llegado el aviso.
          </Aviso>
        ) : (
          <EstadoVacio
            compacto
            dibujo="buscar"
            titulo="No te piden nada"
            frase="No tienes nada pendiente de volver a contar."
          />
        )}
        <Botones>
          <Boton tono="secundario" onClick={alVolver}>
            Volver al inventario
          </Boton>
        </Botones>
      </div>
    );
  }

  const listas = lineas.flatMap((l) => {
    const hay = cuantoHayEn(l, escrito[l.productoId]);
    return hay === null ? [] : [{ linea: l, hay }];
  });

  async function mandar() {
    setMandando(true);
    setError(null);
    // Uno por inventario: cada línea es de lo que contó cada vez.
    const porInventario = new Map<string, typeof listas>();
    for (const l of listas) {
      porInventario.set(l.linea.inventarioId, [
        ...(porInventario.get(l.linea.inventarioId) ?? []),
        l,
      ]);
    }
    for (const [inventarioId, deEste] of porInventario) {
      const r = await cliente.ejecutar('recontar', {
        inventario_id: inventarioId,
        lineas: deEste.map((l) => ({
          producto_id: l.linea.productoId,
          hay: l.hay,
          ...(seCuentaEnCajas(l.linea)
            ? {
                formatos: numeroEscrito(escrito[l.linea.productoId]?.formatos) ?? 0,
                sueltas: numeroEscrito(escrito[l.linea.productoId]?.sueltas) ?? 0,
              }
            : {}),
        })),
      });
      if (!r.ok) {
        setError(r.error);
        setMandando(false);
        return;
      }
    }
    setMandando(false);
    setHecho(true);
    await cache.invalidateQueries({ queryKey: ['el_inventario'] });
  }

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      <Tarjeta
        titulo="Vuelve a contar"
        cuantos={lineas.length}
        origen="Lo que hay de verdad, otra vez"
        accion={
          <Boton tono="texto" onClick={alVolver}>
            Volver
          </Boton>
        }
      >
        <ul className="flex flex-col divide-y divide-borde">
          {lineas.map((l) => (
            <li
              key={`${l.inventarioId}-${l.productoId}`}
              className="flex flex-wrap items-center gap-e3 py-e2"
            >
              <span className="flex min-w-[9rem] flex-1 flex-col">
                <span className="font-medium">{l.nombre}</span>
                <span className="text-etiqueta text-texto-tenue">{l.formato ?? l.unidadDeUso}</span>
              </span>
              <CasillasDeContar
                producto={l}
                escrito={escrito[l.productoId] ?? {}}
                alEscribir={(campo, valor) => {
                  setEscrito((antes) => ({
                    ...antes,
                    [l.productoId]: { ...antes[l.productoId], [campo]: valor },
                  }));
                }}
              />
            </li>
          ))}
        </ul>
      </Tarjeta>
      <Botones>
        <Boton
          tono="principal"
          disabled={listas.length === 0 || mandando}
          cargando={mandando}
          textoCargando="Mandando"
          onClick={() => {
            void mandar();
          }}
        >
          Mandar lo recontado
        </Boton>
      </Botones>
    </div>
  );
}
