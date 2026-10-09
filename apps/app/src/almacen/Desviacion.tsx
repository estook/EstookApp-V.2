import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMO_ES_LA_CAUSA, comoPorcentaje, comoSeDiceElTipo, cuadra } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarEmparejar } from '../ganchos/usarEmparejar.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero, conUnidadDeUso } from './contrato.ts';
import {
  DONDE_SE_MIRA,
  diaCorto,
  type ElFoodCostReal,
  type LaDesviacion,
  type LineaPorEmparejar,
  type ProductoGastado,
} from './contratoDeLaDesviacion.ts';

/**
 * Almacén · Movimientos · Desviación (M8 · decisión 0079, la segunda entrega).
 *
 * Tres respuestas, de arriba abajo, y lo esencial a la vista:
 *
 *   · **El food cost real**: de cada 100 € que se venden sin IVA, cuántos se van en
 *     género. Entre los dos últimos inventarios o en un mes, frente a tu objetivo.
 *   · **Lo que se vende tal cual**: lo que sale de la cámara frente a lo que dice la
 *     caja, en unidades y en euros, con su causa más probable y dónde comprobarla.
 *     Y las líneas de la caja por emparejar: se dice una vez qué producto es cada una.
 *   · **Lo gastado de verdad**, de cada producto contado dos veces.
 *
 * Lo que se cocina **no tiene desviación hasta M9**: sin su ficha no se sabe cuánto
 * debía gastarse. De eso se ve lo gastado de verdad, que ya vale.
 */
export function Desviacion() {
  const { permisos } = usarSesion();
  const cierra = puedeEditar(permisos, 'accion.cerrar_recuento');
  const conDinero =
    puedeVer(permisos, 'dato.ventas') && puedeVer(permisos, 'dato.precio_de_compra');
  const lectura = usarLectura<LaDesviacion>('la_desviacion', {}, cierra);

  if (!cierra) {
    return (
      <Tarjeta titulo="Desviación">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="La desviación la ve quien cierra los inventarios."
          sinAccionPorque="Tu acceso no incluye cerrar inventarios."
        />
      </Tarjeta>
    );
  }

  if (lectura.isPending) return <Cargando que="lo gastado de verdad" />;
  const datos = lectura.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido calcularlo">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }

  const talCual = datos.productos.filter((p) => p.talCual !== null);

  return (
    <div className="flex flex-col gap-e4">
      {conDinero && <FoodCostReal />}

      {datos.puedeVerVentas && (
        <LoQueSeVendeTalCual productos={talCual} porEmparejar={datos.porEmparejar} datos={datos} />
      )}

      <LoGastado datos={datos} />
    </div>
  );
}

// ── El food cost real ───────────────────────────────────────────────────────

const NOMBRE_DEL_SEMAFORO: Readonly<Record<ElFoodCostReal['semaforo'], string>> = {
  verde: 'En objetivo',
  ambar: 'Algo por encima',
  rojo: 'Por encima',
  sin_dato: 'Sin objetivo',
};

const TONO_DEL_SEMAFORO = {
  verde: 'bien',
  ambar: 'atencion',
  rojo: 'mal',
  sin_dato: 'neutro',
} as const;

function FoodCostReal() {
  const [periodo, setPeriodo] = useState<'' | 'inventarios' | 'mes'>('');
  const [mes, setMes] = useState('');
  const lectura = usarLectura<ElFoodCostReal>('el_food_cost_real', {
    ...(periodo === '' ? {} : { periodo }),
    ...(periodo === 'mes' && mes !== '' ? { mes } : {}),
  });

  const f = lectura.data;
  const elegido = periodo === '' ? (f?.periodo ?? 'mes') : periodo;

  return (
    <Tarjeta
      titulo="Food cost real"
      origen="(lo que había + lo comprado − lo que queda) ÷ lo vendido sin IVA"
    >
      <div className="flex flex-col gap-e3">
        <div className="flex flex-wrap items-end gap-e3">
          <div className="min-w-[13rem]">
            <Selector
              etiqueta="Periodo"
              opciones={[
                ...(f?.inventarios === null || f === undefined
                  ? []
                  : [{ valor: 'inventarios', texto: 'Entre los dos últimos inventarios' }]),
                { valor: 'mes', texto: 'Un mes' },
              ]}
              value={elegido}
              onChange={(e) => {
                setPeriodo(e.currentTarget.value as 'inventarios' | 'mes');
              }}
            />
          </div>
          {elegido === 'mes' && f !== undefined && (
            <div className="min-w-[11rem]">
              <Selector
                etiqueta="El mes"
                opciones={losUltimosMeses(f.hoy)}
                value={mes === '' ? f.desde.slice(0, 7) : mes}
                onChange={(e) => {
                  setMes(e.currentTarget.value);
                }}
              />
            </div>
          )}
        </div>

        {lectura.isPending ? (
          <p className="text-secundario text-texto-suave">Calculando…</p>
        ) : f === undefined ? (
          <Aviso tono="mal" titulo="No he podido calcularlo">
            Elige otro mes, o vuelve a intentarlo.
          </Aviso>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-e3">
              {f.real !== null && (
                <p className="text-titulo font-semibold tabular-nums">
                  {`${f.real.toFixed(1).replace('.', ',')} %`}
                </p>
              )}
              {f.real !== null && (
                <Etiqueta tono={TONO_DEL_SEMAFORO[f.semaforo]}>
                  {NOMBRE_DEL_SEMAFORO[f.semaforo]}
                  {f.objetivo === null ? '' : ` · objetivo ${comoSeDiceElTipo(f.objetivo)}`}
                </Etiqueta>
              )}
              <span className="text-secundario text-texto-suave">
                Del {diaCorto(f.desde)} al {diaCorto(f.hasta)}
              </span>
            </div>
            <p className="text-secundario">
              {f.ventasSinImpuestoCentimos === null
                ? `${comoDinero(f.consumoRealCentimos)} en género. Sin ventas en la caja, todavía no hay porcentaje.`
                : `${comoDinero(f.consumoRealCentimos)} en género, de ${comoDinero(f.ventasSinImpuestoCentimos)} vendidos sin IVA.`}
            </p>
            {f.faltanDiasDeCaja > 0 && (
              <Aviso tono="atencion" titulo={`Faltan ${diasEnLetra(f.faltanDiasDeCaja)} de caja`}>
                No es exacto: lo vendido esos días no está. Ciérralos en Servicio y sale entero.
              </Aviso>
            )}
            {f.tipoDeImpuesto === null && (
              <Aviso tono="atencion" titulo="No sé qué impuesto quitarle a tus ventas">
                Mira el régimen fiscal del local en Ajustes.
              </Aviso>
            )}
            <details className="text-secundario text-texto-suave">
              <summary className="cursor-pointer">Cómo sale</summary>
              <ul className="mt-e2 flex flex-col gap-e1 tabular-nums">
                <li>Había {comoDinero(f.habiaCentimos)}</li>
                <li>+ Compraste {comoDinero(f.comprasCentimos)}</li>
                <li>− Queda {comoDinero(f.quedaCentimos)}</li>
                {f.aparteCentimos !== 0 && (
                  <li>− Comida del personal e invitaciones {comoDinero(f.aparteCentimos)}</li>
                )}
                {f.traspasosCentimos !== 0 && (
                  <li>− A otro local {comoDinero(f.traspasosCentimos)}</li>
                )}
                <li>
                  = <strong>{comoDinero(f.consumoRealCentimos)}</strong> gastados
                </li>
                <li>
                  Vendido: {comoDinero(f.ventasConImpuestoCentimos)} con IVA
                  {f.tipoDeImpuesto === null || f.ventasSinImpuestoCentimos === null
                    ? ''
                    : `, ${comoDinero(f.ventasSinImpuestoCentimos)} sin el ${comoSeDiceElTipo(f.tipoDeImpuesto)}`}
                  . {f.diasDelPeriodo - f.faltanDiasDeCaja} de {f.diasDelPeriodo} días con la caja
                  cerrada.
                </li>
                <li>
                  {f.contados === 0
                    ? 'Nada contado en el periodo: lo que queda sale del libro. Con un inventario, sale de verdad.'
                    : `Contados en el periodo: ${String(f.contados)} de ${String(f.productos)} productos${f.parteContada === null ? '' : `, el ${comoPorcentaje(f.parteContada)} del valor`}. Lo demás, según el libro.`}
                </li>
                {f.soloSusZonas && <li>Solo lo de tus zonas.</li>}
                <li>
                  El food cost teórico, y la brecha entre los dos, llegan con las fichas de los
                  platos.
                </li>
              </ul>
            </details>
          </>
        )}
      </div>
    </Tarjeta>
  );
}

/** Este mes y los once de antes: «octubre de 2026». */
function losUltimosMeses(hoy: string): { valor: string; texto: string }[] {
  const [anio, mes] = hoy.split('-').map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - i, 15));
    return {
      valor: fecha.toISOString().slice(0, 7),
      texto: fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

function diasEnLetra(cuantos: number): string {
  return cuantos === 1 ? '1 día' : `${String(cuantos)} días`;
}

// ── Lo que se vende tal cual ────────────────────────────────────────────────

function LoQueSeVendeTalCual({
  productos,
  porEmparejar,
  datos,
}: {
  readonly productos: readonly ProductoGastado[];
  readonly porEmparejar: readonly LineaPorEmparejar[];
  readonly datos: LaDesviacion;
}) {
  const navegar = useNavigate();
  const [emparejando, setEmparejando] = useState<LineaPorEmparejar | null>(null);

  return (
    <Tarjeta titulo="Lo que se vende tal cual" origen="Lo que sale de la cámara frente a la caja">
      <div className="flex flex-col gap-e3">
        {productos.length === 0 ? (
          <p className="text-secundario text-texto-suave">
            {datos.emparejados.some((e) => e.productoId !== null)
              ? 'Lo emparejado aún no se ha contado dos veces: con el segundo inventario, sale aquí.'
              : 'Empareja abajo lo que vende tu caja tal cual —una Coca-Cola, una botella— y aquí sale lo que falta.'}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {productos.map((p) => {
              const t = p.talCual;
              if (t === null) return null;
              const bien = cuadra(t.desviacion, p.gastado);
              return (
                <li key={p.id} className="flex flex-col gap-e2 py-e3">
                  <div className="flex flex-wrap items-baseline justify-between gap-e2">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="tabular-nums">
                      {bien ? (
                        <Etiqueta tono="bien">Cuadra</Etiqueta>
                      ) : (
                        <strong>
                          {t.desviacion > 0 ? 'Faltan ' : 'Sobran '}
                          {conUnidadDeUso(Math.abs(t.desviacion), p.unidadDeUso)}
                          {t.desviacionCentimos === undefined || t.desviacionCentimos === null
                            ? ''
                            : ` · ${comoDinero(Math.abs(t.desviacionCentimos))}`}
                        </strong>
                      )}
                    </span>
                  </div>
                  <p className="text-secundario text-texto-suave">
                    {t.ventasDesde > t.ventasHasta
                      ? `Salieron ${conUnidadDeUso(p.gastado, p.unidadDeUso)}, y entre los dos conteos no cae ningún día de caja.`
                      : `Salieron ${conUnidadDeUso(p.gastado, p.unidadDeUso)}; la caja vendió ${conUnidadDeUso(t.vendido, p.unidadDeUso)} del ${diaCorto(t.ventasDesde)} al ${diaCorto(t.ventasHasta)}.`}
                  </p>
                  {t.causa !== null && (
                    <details className="text-secundario">
                      <summary className="cursor-pointer">
                        <Etiqueta tono={t.desviacion > 0 ? 'atencion' : 'info'}>
                          {COMO_ES_LA_CAUSA[t.causa.causa].nombre}
                        </Etiqueta>
                      </summary>
                      <p className="mt-e2 text-texto-suave">{t.causa.porque}</p>
                      <Boton
                        tono="texto"
                        onClick={() => {
                          const donde = DONDE_SE_MIRA[t.causa?.causa ?? 'sin_apuntar'];
                          if (donde.startsWith('#')) {
                            document.querySelector(donde)?.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            navegar(donde);
                          }
                        }}
                      >
                        Mirar {COMO_ES_LA_CAUSA[t.causa.causa].seMira}
                      </Boton>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div id="por-emparejar" className="flex flex-col gap-e2">
          {porEmparejar.length > 0 && (
            <>
              <p className="font-medium">En la caja, sin decir qué es</p>
              <ul className="flex flex-col divide-y divide-borde">
                {porEmparejar.slice(0, 12).map((l) => (
                  <li
                    key={l.concepto}
                    className="flex flex-wrap items-center justify-between gap-e2 py-e2"
                  >
                    <span>
                      {l.concepto}{' '}
                      <span className="text-etiqueta text-texto-tenue">
                        · {conUnidadDeUso(l.unidades, 'ud')} en {diasEnLetra(l.dias)}
                      </span>
                    </span>
                    <Boton
                      tono="secundario"
                      onClick={() => {
                        setEmparejando(l);
                      }}
                    >
                      {l.propuesto === null ? 'Emparejar' : `¿Es ${l.propuesto.nombre}?`}
                    </Boton>
                  </li>
                ))}
              </ul>
            </>
          )}
          {datos.emparejados.length > 0 && <LosEmparejados datos={datos} />}
        </div>
      </div>

      <Emparejar
        porDecir={emparejando}
        alCerrar={() => {
          setEmparejando(null);
        }}
      />
    </Tarjeta>
  );
}

function Emparejar({
  porDecir,
  alCerrar,
}: {
  readonly porDecir: LineaPorEmparejar | null;
  readonly alCerrar: () => void;
}) {
  const productos = usarLectura<{
    productos: readonly { id: string; nombre: string; unidadDeUso: string }[];
  }>('mis_productos', {}, porDecir !== null);
  const [elegido, setElegido] = useState('');
  const [porVenta, setPorVenta] = useState('1');
  const { hacer, error, haciendo } = usarEmparejar();

  const productoId = elegido === '' ? (porDecir?.propuesto?.id ?? '') : elegido;
  const unidad = productos.data?.productos.find((p) => p.id === productoId)?.unidadDeUso ?? 'ud';
  const cuanto = Number(porVenta.replace(',', '.'));

  return (
    <Hoja
      abierta={porDecir !== null}
      alCerrar={() => {
        setElegido('');
        setPorVenta('1');
        alCerrar();
      }}
      titulo={porDecir === null ? 'Emparejar' : `«${porDecir.concepto}» de la caja`}
      pie={
        <Botones>
          <Boton
            tono="principal"
            disabled={productoId === '' || !(cuanto > 0) || haciendo !== null}
            cargando={haciendo === 'emparejar'}
            textoCargando="Emparejando"
            onClick={() => {
              if (porDecir === null) return;
              void hacer('emparejar', {
                concepto: porDecir.concepto,
                producto_id: productoId,
                por_venta: cuanto,
              }).then((hecho) => {
                if (hecho) alCerrar();
              });
            }}
          >
            Es este producto
          </Boton>
          <Boton
            tono="texto"
            disabled={haciendo !== null}
            cargando={haciendo === 'ignorar'}
            textoCargando="Apartando"
            onClick={() => {
              if (porDecir === null) return;
              void hacer('ignorar', { concepto: porDecir.concepto, ignorar: true }).then(
                (hecho) => {
                  if (hecho) alCerrar();
                },
              );
            }}
          >
            No es de almacén
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Se dice una vez: desde ahora, lo que venda la caja con este nombre cuenta como gastado de
          ese producto.
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
        <Selector
          etiqueta="Qué producto es"
          sinElegir="Elige uno"
          opciones={(productos.data?.productos ?? []).map((p) => ({
            valor: p.id,
            texto: p.nombre,
          }))}
          value={productoId}
          onChange={(e) => {
            setElegido(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta={`Cuánto gasta cada venta, en ${unidad}`}
          inputMode="decimal"
          value={porVenta}
          onChange={(e) => {
            setPorVenta(e.currentTarget.value);
          }}
          ayuda="Una botella es 1. Una caña de un barril en litros, 0,2."
        />
      </div>
    </Hoja>
  );
}

function LosEmparejados({ datos }: { readonly datos: LaDesviacion }) {
  const { hacer, error, haciendo } = usarEmparejar();
  return (
    <details className="text-secundario">
      <summary className="cursor-pointer text-texto-suave">
        Ya dicho ({datos.emparejados.length})
      </summary>
      {error !== null && <ErrorEnCristiano error={error} />}
      <ul className="mt-e2 flex flex-col divide-y divide-borde">
        {datos.emparejados.map((e) => (
          <li key={e.concepto} className="flex flex-wrap items-center justify-between gap-e2 py-e2">
            <span>
              {e.concepto} →{' '}
              {e.producto === null
                ? 'no es de almacén'
                : `${e.producto}${e.porVenta === 1 ? '' : ` (${conUnidadDeUso(e.porVenta, e.unidadDeUso ?? 'ud')} cada una)`}`}
            </span>
            <Boton
              tono="texto"
              cargando={haciendo === e.concepto}
              textoCargando="Quitando"
              disabled={haciendo !== null}
              onClick={() => {
                void hacer(e.concepto, { concepto: e.concepto, quitar: true });
              }}
            >
              Quitar
            </Boton>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ── Lo gastado de verdad ────────────────────────────────────────────────────

function LoGastado({ datos }: { readonly datos: LaDesviacion }) {
  const columnas: Columna<ProductoGastado>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      principal: true,
      celda: (p) => (
        <span className="flex flex-col">
          <span>{p.nombre}</span>
          <span className="text-etiqueta text-texto-tenue">
            Del {diaCorto(p.desde)} al {diaCorto(p.hasta)}
          </span>
        </span>
      ),
    },
    {
      clave: 'habia',
      titulo: 'Había',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.habia, p.unidadDeUso),
    },
    {
      clave: 'entro',
      titulo: 'Entró',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.entro, p.unidadDeUso),
    },
    {
      clave: 'queda',
      titulo: 'Queda',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.queda, p.unidadDeUso),
    },
    {
      clave: 'gastado',
      titulo: 'Gastado',
      numerica: true,
      celda: (p) => <strong>{conUnidadDeUso(p.gastado, p.unidadDeUso)}</strong>,
    },
    ...(datos.puedeVerPrecios
      ? [
          {
            clave: 'euros',
            titulo: 'En euros',
            numerica: true,
            celda: (p: ProductoGastado) => comoDinero(p.gastadoCentimos),
          },
        ]
      : []),
  ];

  return (
    <Tarjeta titulo="Lo gastado de verdad" pegado>
      <Tabla
        titulo="Lo gastado de verdad, producto a producto"
        columnas={columnas}
        filas={datos.productos}
        claveDe={(p) => p.id}
        cuandoNoHay={
          <EstadoVacio
            compacto
            dibujo="libro"
            titulo="Hace falta contar dos veces"
            frase={
              datos.contadosUnaVez > 0
                ? `${datos.contadosUnaVez === 1 ? '1 producto se ha contado' : `${String(datos.contadosUnaVez)} productos se han contado`} una vez: con el segundo inventario sale lo que se gastó de verdad.`
                : 'Lo que había al contar + lo que entra − lo que hay al volver a contar. Empieza por un inventario.'
            }
          />
        }
      />
    </Tarjeta>
  );
}
