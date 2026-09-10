import { useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ORIGEN_DEL_CIERRE, porcentajeDe, ticketMedio } from '@estook/dominio';
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
import { ComoEntranTusVentas } from './ComoEntranTusVentas.tsx';
import type { MisCierres, UnCierre } from './contrato.ts';
import { comoDinero, comoSeLeeLaFecha } from '../inventario/contrato.ts';

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
  const { cliente } = usarSesion();
  const navegar = useNavigate();
  const [dias, setDias] = useState('30');

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
        <Cargando que="tus ventas" />
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
                {(c.consumoCentimos ?? 0) > 0
                  ? ` · ${(porcentajeDe(c.consumoCentimos ?? 0, c.totalCentimos) ?? 0).toLocaleString('es-ES')} %`
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
      {datos.comoSeCierra === 'sin_decidir' && <ComoEntranTusVentas modo="ajustes" />}

      <div className="flex flex-wrap items-end justify-between gap-e3">
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Periodo"
            opciones={[
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
        {datos.puedeCerrar && !datos.hoyEstaCerrado && (
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
                    color: 'var(--color-app-inventario)',
                  },
                ]
              : []),
          ]}
          formato={(v) => comoDinero(v)}
          cuandoNoHay={
            <EstadoVacio
              compacto
              titulo="Todavía no hay cajas cerradas"
              frase="En cuanto cierres la primera, aquí verás lo que entra cada día."
              sinAccionPorque="Se cierra en Servicio · Jornada · Cierre."
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
              navegar(`/servicio/jornada/cierre?fecha=${c.fecha}`);
            }}
            cuandoNoHay={null}
          />
        </Tarjeta>
      )}
    </div>
  );
}
