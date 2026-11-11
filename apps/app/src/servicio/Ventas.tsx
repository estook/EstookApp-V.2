import { useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ORIGEN_DEL_CIERRE, ticketMedio } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  Cifra,
  EstadoVacio,
  Grafica,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAccion } from '../ganchos/usarAccion.ts';
import { BotonDeAccion } from '../acciones/BotonDeAccion.tsx';
import type { MisCierres, UnCierre } from './contrato.ts';
import { comoDinero, comoSeLeeLaFecha } from '../almacen/contrato.ts';

/**
 * Negocio · Ventas (M6½).
 *
 * «Si le das a "ver" en el cuadrado del Panel, te lleva a la app donde se explica
 * más a fondo las ganancias, que es Negocio.» Esto es esa pantalla, con lo único
 * que se puede decir de verdad hoy: **lo que ha entrado, y cuánto de eso se ha
 * ido en género**.
 *
 * ── El food cost, que es la cifra que no existía ────────────────────────────
 *
 * Con los cierres de caja y el libro de movimientos, Estook puede decir qué
 * porcentaje de lo que se factura se va en comida. Se calcula con **lo que se
 * gasta** —salidas y mermas, a coste medio— y no con lo que se compra: un día que
 * llega un pedido grande no tiene un food cost del 300 %, tiene el de siempre y
 * una compra.
 *
 * Y lo que **no** es: el margen entero, Pulse y la comparativa con el año pasado,
 * que son M21. Por eso este destino se llama «Ventas» y no «Resumen»: dice
 * exactamente lo que trae.
 */
export function Ventas() {
  const { cliente, yo } = usarSesion();
  // Con Estook TPV, el día lo cierra la caja (0144): aquí no se ofrece cerrarlo. Lo que cerró la
  // caja abre su día en «Cierres de caja»; lo que se cerró a mano antes de tenerla, como siempre.
  const conEstookTpv = yo?.cuenta?.conEstookTpv === true;
  const navegar = useNavigate();
  const cerrarCaja = usarAccion('cerrar-caja');
  const [dias, setDias] = useState('30');

  // **Cómo se cobró** (0145; Richi, 11-nov): con Estook TPV, de cada cobro, también lo de hoy sin
  // cerrar; sin él, de los cierres, con lo que se apuntó de efectivo y tarjeta.
  const cobros = useQuery({
    queryKey: ['los_cobros', 'resumen', dias],
    enabled: conEstookTpv,
    queryFn: async () => {
      const r = await cliente.consultar<{
        totales: {
          total: number;
          efectivo: number;
          tarjeta: number;
          bizum: number;
          cheque: number;
          cobros: number;
        };
      }>('los_cobros', { dias });
      if (!r.ok) throw new Error(r.error.codigo);
      return r.datos.totales;
    },
  });

  const consulta = useQuery({
    queryKey: ['mis_cierres', 'ventas', dias],
    queryFn: async (): Promise<MisCierres> => {
      // Los días y no la fecha: la fecha la pone el servidor (regla 10).
      const respuesta = await cliente.consultar<MisCierres>('mis_cierres', {
        dias,
        limite: '400',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus ventas" forma="cifra" alto />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus ventas">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const tickets = datos.cierres.reduce((suma, c) => suma + (c.tickets ?? 0), 0);
  const conTickets = datos.cierres
    .filter((c) => c.tickets !== null)
    .reduce((suma, c) => suma + c.totalCentimos, 0);
  const medio = ticketMedio(conTickets, tickets === 0 ? null : tickets);

  const columnas: Columna<UnCierre>[] = [
    {
      clave: 'fecha',
      titulo: 'Día',
      principal: true,
      celda: (c) => comoSeLeeLaFecha(c.fecha),
    },
    {
      clave: 'total',
      titulo: 'Facturado',
      numerica: true,
      celda: (c) => <span className="tabular-nums">{comoDinero(c.totalCentimos)}</span>,
    },
    {
      clave: 'tickets',
      titulo: 'Tickets',
      numerica: true,
      celda: (c) => (c.tickets === null ? '—' : String(c.tickets)),
    },
    ...(datos.puedeVerCostes
      ? [
          {
            clave: 'genero',
            titulo: 'Género gastado',
            numerica: true,
            celda: (c: UnCierre) => (
              <span className="tabular-nums">
                {comoDinero(c.consumoCentimos)}
                {(c.consumoCentimos ?? 0) > 0 && c.foodCost !== null && c.foodCost !== undefined
                  ? ` · ${c.foodCost.toLocaleString('es-ES')} %`
                  : ''}
              </span>
            ),
          } satisfies Columna<UnCierre>,
        ]
      : []),
    {
      clave: 'origen',
      titulo: 'Cómo entró',
      celda: (c) => nombreEn(NOMBRE_DEL_ORIGEN_DEL_CIERRE, c.origen, c.origen),
    },
  ];

  return (
    <div className="flex flex-col gap-e4">
      {/* «¿Cómo entran tus ventas?» ya no se pregunta aquí (26-sep): salía en cuatro
          sitios. Queda en el Panel, en Ajustes y al cerrar la caja. */}

      <div className="flex flex-wrap items-end justify-between gap-e3">
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Periodo"
            opciones={[
              { valor: '1', texto: 'Hoy' },
              { valor: '7', texto: 'Última semana' },
              { valor: '30', texto: 'Último mes' },
              { valor: '90', texto: 'Últimos tres meses' },
              { valor: '365', texto: 'Último año' },
            ]}
            value={dias}
            onChange={(e) => {
              setDias(e.currentTarget.value);
            }}
          />
        </div>
        {datos.puedeCerrar && !datos.hoyEstaCerrado && !conEstookTpv && (
          <Boton
            tono="principal"
            onClick={() => {
              navegar('/servicio/jornada/cierre');
            }}
          >
            Cerrar la caja de hoy
          </Boton>
        )}
      </div>

      <div className="grid gap-e3 sm:grid-cols-3">
        <Tarjeta titulo="Facturado" acento="var(--color-app-negocio)">
          <Cifra
            etiqueta="En el periodo"
            valor={datos.totalDelPeriodoCentimos}
            formato={(v) => comoDinero(v)}
            origen={`${datos.diasConVentas} ${datos.diasConVentas === 1 ? 'día cerrado' : 'días cerrados'}`}
          />
        </Tarjeta>
        <Tarjeta titulo="Ticket medio">
          <Cifra
            etiqueta="Por ticket"
            valor={medio ?? 0}
            formato={(v) => (medio === null ? '—' : comoDinero(v))}
            origen={medio === null ? 'Apunta los tickets al cerrar' : `Sobre ${tickets} tickets`}
          />
        </Tarjeta>
        {datos.puedeVerCostes && (
          <Tarjeta titulo="Food cost">
            <Cifra
              etiqueta="Lo que se va en género"
              valor={datos.foodCost ?? 0}
              formato={(v) =>
                datos.foodCost === null || datos.foodCost === undefined
                  ? '—'
                  : `${v.toLocaleString('es-ES')} %`
              }
              origen="Salidas y mermas a coste medio, sobre lo facturado"
            />
          </Tarjeta>
        )}
      </div>

      <ComoSeCobro
        {...(conEstookTpv
          ? cobros.data === undefined
            ? { cargando: true }
            : {
                total: cobros.data.total,
                tarjeta: cobros.data.tarjeta,
                efectivo: cobros.data.efectivo,
                otros: cobros.data.bizum + cobros.data.cheque,
                origen: `${String(cobros.data.cobros)} ${cobros.data.cobros === 1 ? 'cobro' : 'cobros'} de Estook TPV`,
              }
          : {
              total: datos.cierres.reduce((suma, c) => suma + c.totalCentimos, 0),
              tarjeta: datos.cierres.reduce((suma, c) => suma + (c.tarjetaCentimos ?? 0), 0),
              efectivo: datos.cierres.reduce((suma, c) => suma + (c.efectivoCentimos ?? 0), 0),
              otros: datos.cierres.reduce((suma, c) => suma + (c.otrosCentimos ?? 0), 0),
              origen: 'De lo apuntado al cerrar cada día',
            })}
      />

      <Tarjeta titulo="Día a día">
        <Grafica
          titulo="Lo facturado cada día del periodo"
          forma="barras"
          alto={220}
          eje="dia"
          datos={[...datos.cierres].reverse().map((c) => ({
            dia: comoSeLeeLaFecha(c.fecha),
            facturado: c.totalCentimos,
            ...(datos.puedeVerCostes ? { genero: c.consumoCentimos ?? 0 } : {}),
          }))}
          series={[
            { clave: 'facturado', nombre: 'Facturado', color: 'var(--color-app-negocio)' },
            ...(datos.puedeVerCostes
              ? [
                  {
                    clave: 'genero',
                    nombre: 'Género gastado',
                    color: 'var(--color-app-almacen)',
                  },
                ]
              : []),
          ]}
          formato={(v) => comoDinero(v)}
          cuandoNoHay={
            <EstadoVacio
              compacto
              dibujo="caja"
              acento="var(--color-app-negocio)"
              titulo="Todavía no hay cajas cerradas"
              frase={
                conEstookTpv
                  ? 'En cuanto se cierre la primera en Estook TPV, aquí verás lo que entra cada día.'
                  : 'En cuanto cierres la primera, aquí verás lo que entra cada día.'
              }
              {...(cerrarCaja === null
                ? {
                    sinAccionPorque: conEstookTpv
                      ? 'La caja se cierra en Estook TPV.'
                      : 'La caja la cierra quien lleva el local o la sala.',
                  }
                : { accion: <BotonDeAccion accion={cerrarCaja} texto="Cerrar la caja de hoy" /> })}
            />
          }
        />
      </Tarjeta>

      {datos.cierres.length > 0 && (
        <Tarjeta titulo="Cada cierre" pegado>
          <Tabla
            titulo="Los cierres del periodo"
            columnas={columnas}
            filas={datos.cierres}
            claveDe={(c) => c.cierreId}
            alPulsar={(c) => {
              navegar(
                `/servicio/jornada/cierre?${conEstookTpv && c.origen === 'tpv' ? 'dia' : 'fecha'}=${c.fecha}`,
              );
            }}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}
    </div>
  );
}

/**
 * **Cómo se cobró** (0145; Richi, 11-nov): lo cobrado en el periodo, y de eso cuánto con tarjeta y
 * cuánto en efectivo (y Bizum y cheques, si los hay). Con Estook TPV sale de cada cobro, también lo
 * de hoy sin cerrar; sin él, de lo que se apuntó al cerrar.
 */
function ComoSeCobro(
  props:
    | { readonly cargando: true }
    | {
        readonly total: number;
        readonly tarjeta: number;
        readonly efectivo: number;
        readonly otros: number;
        readonly origen: string;
      },
) {
  if ('cargando' in props) {
    return (
      <Tarjeta titulo="Cómo se cobró">
        <Cargando que="los cobros" forma="cifra" />
      </Tarjeta>
    );
  }
  const filas = [
    { que: 'Tarjeta', cuanto: props.tarjeta },
    { que: 'Efectivo', cuanto: props.efectivo },
    ...(props.otros > 0 ? [{ que: 'Bizum y cheques', cuanto: props.otros }] : []),
  ];
  return (
    <Tarjeta titulo="Cómo se cobró" acento="var(--color-app-negocio)">
      <div className="flex flex-col gap-e2" role="group" aria-label="Cómo se cobró">
        <div className="flex items-baseline justify-between gap-e3">
          <span className="text-texto-suave">Cobrado</span>
          <b className="text-cifra-media tabular-nums">{comoDinero(props.total)}</b>
        </div>
        {filas.map((f) => (
          <div
            key={f.que}
            className="flex items-baseline justify-between gap-e3 border-t border-borde pt-e2"
          >
            <span className="text-texto-suave">{f.que}</span>
            <b className="tabular-nums">{comoDinero(f.cuanto)}</b>
          </div>
        ))}
        <span className="text-etiqueta text-texto-tenue">{props.origen}</span>
      </div>
    </Tarjeta>
  );
}
