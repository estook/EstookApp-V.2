import { useState } from 'react';
import { NOMBRE_DE_LA_ZONA, ZONAS, type Zona } from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { IconoDescargar, IconoDocumento } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero, conUnidadDeUso } from './contrato.ts';
import {
  descargarElValor,
  type ProductoValorado,
  type ValorDelAlmacen as Valor,
} from './contratoDelInventario.ts';

/**
 * Almacén · Productos · Valor (M8 · decisión 0078).
 *
 * **Cuánto dinero hay en cámara, hoy o el día que se elija**, a precio medio ponderado:
 * lo que de verdad costó llenarla. Sale del libro, que guarda cómo quedó la cámara tras
 * cada movimiento, así que el 30 de septiembre dice lo que había el 30 de septiembre,
 * aunque hoy haya otra cosa.
 *
 * Arriba la cifra; debajo, por zona y por categoría; y el detalle, producto a producto,
 * lo que más vale arriba. Con «Imprimir» y el fichero para la gestoría. Solo con
 * precios de compra: sin ellos no viaja ni un euro.
 */
export function ValorDelAlmacen({
  alAbrirProducto,
}: {
  readonly alAbrirProducto: (id: string) => void;
}) {
  const { permisos } = usarSesion();
  const [fecha, setFecha] = useState('');
  const [zona, setZona] = useState<Zona | ''>('');
  const conPrecios = puedeVer(permisos, 'dato.precio_de_compra');
  const lectura = usarLectura<Valor>(
    'valor_del_almacen',
    { ...(fecha === '' ? {} : { fecha }), ...(zona === '' ? {} : { zona }) },
    conPrecios,
  );

  if (!conPrecios) {
    return (
      <Tarjeta titulo="Valor del almacén">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="Lo que vale el almacén lo ve quien ve los precios de compra."
          sinAccionPorque="Tu acceso no incluye los precios de compra."
        />
      </Tarjeta>
    );
  }

  if (lectura.isPending) return <Cargando que="lo que vale tu almacén" />;
  const datos = lectura.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido calcular el valor">
        Mira que la fecha no sea de mañana, y vuelve a intentarlo.
      </Aviso>
    );
  }

  const columnas: Columna<ProductoValorado>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      principal: true,
      celda: (p) => (
        <span className="flex flex-col">
          <span>{p.nombre}</span>
          <span className="text-etiqueta text-texto-tenue">{p.categoria ?? 'Sin categoría'}</span>
        </span>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Había',
      numerica: true,
      celda: (p) => conUnidadDeUso(p.cantidad, p.unidadDeUso),
    },
    {
      clave: 'valor',
      titulo: 'Vale',
      numerica: true,
      celda: (p) => (
        <span className="flex items-center justify-end gap-e2">
          {p.valorEsEstimado && <Etiqueta>al precio de hoy</Etiqueta>}
          {comoDinero(p.valorCentimos)}
        </span>
      ),
    },
  ];

  const esHoy = datos.fecha === datos.hoy;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end gap-e3">
        <div className="w-[11rem]">
          <Campo
            etiqueta="El día"
            tipo="fecha"
            max={datos.hoy}
            value={fecha === '' ? datos.hoy : fecha}
            onChange={(e) => {
              setFecha(e.currentTarget.value === datos.hoy ? '' : e.currentTarget.value);
            }}
          />
        </div>
        <div className="min-w-[10rem]">
          <Selector
            etiqueta="Zona"
            opciones={ZONAS.map((z) => ({ valor: z, texto: NOMBRE_DE_LA_ZONA[z] }))}
            sinElegir="Todas"
            value={zona}
            onChange={(e) => {
              setZona(e.currentTarget.value as Zona | '');
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-e2">
          <Boton
            tono="secundario"
            icono={<IconoDescargar size={18} />}
            onClick={() => {
              descargarElValor(datos);
            }}
          >
            Exportar
          </Boton>
          <Boton
            tono="texto"
            icono={<IconoDocumento size={18} />}
            onClick={() => {
              window.print();
            }}
          >
            Imprimir
          </Boton>
        </div>
      </div>

      <Tarjeta
        titulo={esHoy ? 'Lo que vale hoy tu almacén' : `Lo que valía el ${fechaCorta(datos.fecha)}`}
        origen="A precio medio ponderado: lo que costó de verdad. Sin IVA"
      >
        <p className="text-titulo font-semibold tabular-nums">{comoDinero(datos.totalCentimos)}</p>
        {datos.porZona.length > 1 && (
          <ul className="mt-e2 flex flex-wrap gap-e2">
            {datos.porZona.map((z) => (
              <li key={z.zona}>
                <Etiqueta>
                  {(ZONAS as readonly string[]).includes(z.zona)
                    ? NOMBRE_DE_LA_ZONA[z.zona as Zona]
                    : z.zona}{' '}
                  · {comoDinero(z.valorCentimos)}
                </Etiqueta>
              </li>
            ))}
          </ul>
        )}
        {datos.sinCoste > 0 && (
          <p className="mt-e2 text-secundario text-texto-suave">
            {datos.sinCoste === 1
              ? '1 producto no tiene ni coste ni precio: cuenta cero.'
              : `${String(datos.sinCoste)} productos no tienen ni coste ni precio: cuentan cero.`}
          </p>
        )}
      </Tarjeta>

      {datos.porCategoria.length > 1 && (
        <Tarjeta titulo="Por categoría">
          <ul className="flex flex-col divide-y divide-borde">
            {datos.porCategoria.map((c) => (
              <li
                key={c.categoria ?? 'sin'}
                className="flex items-baseline justify-between gap-e3 py-e2"
              >
                <span>
                  {c.categoria ?? 'Sin categoría'}{' '}
                  <span className="text-etiqueta text-texto-tenue">· {c.cuantos}</span>
                </span>
                <span className="tabular-nums">{comoDinero(c.valorCentimos)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tabla
        titulo="Producto a producto"
        columnas={columnas}
        filas={datos.productos}
        claveDe={(p) => p.id}
        alPulsar={(p) => {
          alAbrirProducto(p.id);
        }}
        cuandoNoHay={
          <EstadoVacio
            compacto
            dibujo="camara"
            titulo={esHoy ? 'No hay nada en cámara' : 'Ese día no había nada'}
            frase={esHoy ? 'Lo que se dé de alta con lo que hay sumará aquí.' : 'Prueba otro día.'}
          />
        }
      />
    </div>
  );
}

/** «30 de septiembre», de una fecha operativa. */
function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });
}
