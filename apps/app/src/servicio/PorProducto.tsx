import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enDinero } from '@estook/dominio';
import { Aviso, Cargando, EstadoVacio, Selector, Tabla, Tarjeta, type Columna } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Negocio › Ventas › Por producto** (M20 · 1, decisión 0149): lo cobrado en Estook TPV, plato a plato,
 * con lo que costó **el día que se vendió** (el coste se congela al restar del almacén). Arriba, lo
 * vendido sin IVA, el género que salió y el food cost de lo que tiene escandallo.
 *
 * Cada fila es un plato; un menú es una fila con lo que costaron los platos que se eligieron dentro.
 * Lo que no tiene escandallo cuenta en dinero y no lleva coste: no se inventa ninguno.
 */
interface ProductoVendido {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly uds: number;
  readonly ventas: number;
  readonly coste: number | null;
  readonly foodCost: number | null;
  readonly sinEscandallo: boolean;
}

interface LoVendidoPorProducto {
  readonly desde: string;
  readonly hasta: string;
  readonly conCoste: boolean;
  readonly productos: readonly ProductoVendido[];
  readonly ventas: number;
  readonly coste: number | null;
  readonly ventasConCoste: number | null;
  readonly foodCost: number | null;
  readonly sinEscandallo: number;
}

/** «29,0 %»: con coma y siempre un decimal, como en Escandallos. */
function enPorciento(puntos: number): string {
  return `${puntos.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function PorProducto() {
  const { cliente } = usarSesion();
  const [dias, setDias] = useState<'1' | '7' | '30'>('7');

  const lectura = useQuery({
    queryKey: ['lo_vendido_por_producto', dias],
    queryFn: async () => {
      const r = await cliente.consultar<LoVendidoPorProducto>('lo_vendido_por_producto', { dias });
      if (!r.ok) throw new Error(r.error.codigo);
      return r.datos;
    },
    refetchInterval: 60_000,
  });

  const periodo = (
    <div className="min-w-[12rem]">
      <Selector
        etiqueta="Periodo"
        opciones={[
          { valor: '1', texto: 'Hoy' },
          { valor: '7', texto: 'Última semana' },
          { valor: '30', texto: 'Último mes' },
        ]}
        value={dias}
        onChange={(e) => {
          setDias(e.currentTarget.value as '1' | '7' | '30');
        }}
      />
    </div>
  );

  if (lectura.isPending) return <Cargando que="lo vendido" forma="lista" lineas={6} />;
  if (lectura.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer lo vendido">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const datos = lectura.data;
  const todoConCoste = datos.conCoste && datos.ventasConCoste === datos.ventas;

  const columnas: Columna<ProductoVendido>[] = [
    {
      clave: 'nombre',
      titulo: 'Plato',
      principal: true,
      celda: (p) => (
        <span className="flex flex-col">
          <span className="font-medium">{p.nombre}</span>
          <span className="text-etiqueta text-texto-tenue">
            {p.sinEscandallo ? 'Sin escandallo' : (p.seccion ?? 'Sin sección')}
          </span>
        </span>
      ),
    },
    {
      clave: 'uds',
      titulo: 'Uds.',
      numerica: true,
      celda: (p) => <span className="tabular-nums">{p.uds.toLocaleString('es-ES')}</span>,
    },
    {
      clave: 'ventas',
      titulo: 'Vendido sin IVA',
      numerica: true,
      celda: (p) => <span className="tabular-nums">{enDinero(p.ventas)}</span>,
    },
    ...(datos.conCoste
      ? [
          {
            clave: 'coste',
            titulo: 'Coste',
            numerica: true,
            celda: (p: ProductoVendido) =>
              p.coste === null ? (
                <span className="text-texto-tenue">—</span>
              ) : (
                <span className="tabular-nums">{enDinero(p.coste)}</span>
              ),
          },
          {
            clave: 'food-cost',
            titulo: 'Food cost',
            numerica: true,
            celda: (p: ProductoVendido) =>
              p.foodCost === null ? (
                <span className="text-texto-tenue">—</span>
              ) : (
                <span className="tabular-nums">{enPorciento(p.foodCost)}</span>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end justify-between gap-e3">{periodo}</div>

      {datos.productos.length === 0 ? (
        <EstadoVacio
          compacto
          dibujo="caja"
          titulo={
            dias === '1' ? 'Hoy no se ha cobrado nada todavía' : 'Nada cobrado en este periodo'
          }
          frase="Cada plato cobrado en Estook TPV llega aquí solo, con lo que costó ese día."
          sinAccionPorque="Se cobra en la caja o en el comandero."
        />
      ) : (
        <>
          <Tarjeta titulo="Lo vendido">
            <dl className="grid grid-cols-2 gap-e4 sm:grid-cols-3">
              <div className="flex flex-col gap-e1">
                <dt className="text-secundario text-texto-suave">Vendido sin IVA</dt>
                <dd className="text-cifra-media font-bold tabular-nums">
                  {enDinero(datos.ventas)}
                </dd>
              </div>
              {datos.conCoste && datos.coste !== null && (
                <div className="flex flex-col gap-e1">
                  <dt className="text-secundario text-texto-suave">Género que salió</dt>
                  <dd className="text-cifra-media font-bold tabular-nums">
                    {enDinero(datos.coste)}
                  </dd>
                </div>
              )}
              {datos.conCoste && datos.foodCost !== null && (
                <div className="flex flex-col gap-e1">
                  <dt className="text-secundario text-texto-suave">
                    {todoConCoste ? 'Food cost' : 'Food cost con escandallo'}
                  </dt>
                  <dd className="text-cifra-media font-bold tabular-nums">
                    {enPorciento(datos.foodCost)}
                  </dd>
                </div>
              )}
            </dl>
            {datos.sinEscandallo > 0 && (
              <p className="mt-e3 text-secundario text-texto-suave">
                {datos.sinEscandallo === 1
                  ? '1 plato vendido sin escandallo: cuenta en lo vendido y no resta género.'
                  : `${String(datos.sinEscandallo)} platos vendidos sin escandallo: cuentan en lo vendido y no restan género.`}
              </p>
            )}
          </Tarjeta>

          <Tarjeta>
            <Tabla
              titulo="Lo vendido, plato a plato"
              columnas={columnas}
              filas={datos.productos}
              claveDe={(p) => p.id}
              cuandoNoHay={null}
            />
          </Tarjeta>
        </>
      )}
    </div>
  );
}
