import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { comoPorcentaje, comoSeDiceElTipo } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero, conUnidadDeUso } from './contrato.ts';
import {
  diaCorto,
  type ElFoodCostReal,
  type LaDesviacion,
  type ProductoGastado,
} from './contratoDeLaDesviacion.ts';

/**
 * Almacén · Movimientos · Consumo (M8 · 0079; desde el 9-oct, 0080).
 *
 * Dos respuestas, de arriba abajo:
 *
 *   · **El food cost real**: de cada 100 € que se venden sin IVA, cuántos se van en
 *     género. Entre los dos últimos inventarios o en un mes, frente a tu objetivo.
 *   · **Lo gastado de verdad**, de cada producto contado dos veces.
 *
 * ── Por qué ya no hay «Lo que se vende tal cual» (Richi eligió la A, 9-oct) ──────
 *
 * Esto se llamaba «Desviación» y comparaba lo que salía de la cámara con lo que
 * vendía la caja, emparejando a mano cada línea de la caja con su producto. Richi:
 * «es ambiguo y liante para los hosteleros». Tenía razón por tres lados: pedía
 * emparejar también el chuletón y el atún, que van en varios platos; solo sirve si
 * la caja dice qué se vendió línea a línea, y hoy eso es teclearlo al cerrar; y
 * suma trabajo a quien no lo va a hacer.
 *
 * Así que aquí queda **lo que sale sin trabajo de más**: es la cuenta del consumo
 * que hace cualquier gestoría (existencias iniciales + compras − existencias
 * finales). El servidor sigue sabiendo emparejar (`emparejar_concepto`, la tabla
 * `concepto_de_caja`): vuelve a la pantalla cuando la caja traiga las ventas sola,
 * con Estook TPV. Y la desviación de los platos, con sus fichas (M9).
 */
export function Consumo() {
  const { permisos } = usarSesion();
  const cierra = puedeEditar(permisos, 'accion.cerrar_recuento');
  const conDinero =
    puedeVer(permisos, 'dato.ventas') && puedeVer(permisos, 'dato.precio_de_compra');
  const lectura = usarLectura<LaDesviacion>('la_desviacion', {}, cierra);

  if (!cierra) {
    return (
      <Tarjeta titulo="Consumo">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="El consumo lo ve quien cierra los inventarios."
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

  return (
    <div className="flex flex-col gap-e4">
      {conDinero && <FoodCostReal />}
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
  const navegar = useNavigate();
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
            {/*
              ── Un gasto en negativo no es un gasto (9-oct) ─────────────────────
              En IKATZ salía «−27,96 € en género»: queda más de lo que había y entró. No
              es que se gastara menos que nada: es que algo entró sin apuntarse, o que
              se corrigió este mes un error del anterior (unas ventas de septiembre
              anuladas en octubre). Se dice eso, y no se da un porcentaje que no existe.
            */}
            {f.consumoRealCentimos < 0 && (
              <Aviso
                tono="atencion"
                titulo="No cuadra: queda más de lo que había y entró"
                accion={
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      navegar('/almacen/movimientos/historial');
                    }}
                  >
                    Ver el historial
                  </Boton>
                }
              >
                Suele ser una entrada sin apuntar, o un error de otro mes corregido en este.
              </Aviso>
            )}
            <div className="flex flex-wrap items-baseline gap-e3">
              {f.real !== null && f.consumoRealCentimos >= 0 && (
                <p className="text-titulo font-semibold tabular-nums">
                  {`${f.real.toFixed(1).replace('.', ',')} %`}
                </p>
              )}
              {f.real !== null && f.consumoRealCentimos >= 0 && (
                <Etiqueta tono={TONO_DEL_SEMAFORO[f.semaforo]}>
                  {NOMBRE_DEL_SEMAFORO[f.semaforo]}
                  {f.objetivo === null ? '' : ` · objetivo ${comoSeDiceElTipo(f.objetivo)}`}
                </Etiqueta>
              )}
              <span className="text-secundario text-texto-suave">
                Del {diaCorto(f.desde)} al {diaCorto(f.hasta)}
              </span>
            </div>
            <p className={f.consumoRealCentimos < 0 ? 'hidden' : 'text-secundario'}>
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
