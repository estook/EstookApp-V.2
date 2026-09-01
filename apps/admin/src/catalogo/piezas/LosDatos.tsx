import { useState } from 'react';
import { centimos, conSimbolo } from '@estook/dominio';
import { IconoAtencion, IconoBien } from '@estook/iconos';
import {
  Avatar,
  Boton,
  Cifra,
  EstadoVacio,
  Etiqueta,
  Grafica,
  Lista,
  Paginador,
  Tabla,
  Tarjeta,
} from '@estook/ui';
import { Fila, Pieza } from '../Pieza.tsx';

/**
 * Lo que enseña datos: la cifra, la tabla, la lista, la gráfica y el paginador.
 *
 * La tabla es la que hay que mirar **estrechando la ventana**: por debajo de
 * 768 px cada fila se convierte en una tarjeta, que es lo que pide B4. Y no es
 * un adorno: una tabla con desplazamiento lateral en un móvil es una tabla que
 * nadie lee entera.
 */
interface Plato {
  readonly id: string;
  readonly nombre: string;
  readonly coste: number;
  readonly pvp: number;
  readonly estado: 'bien' | 'atencion';
}

const PLATOS: Plato[] = [
  { id: '1', nombre: 'Ensaladilla de la casa', coste: 187, pvp: 890, estado: 'bien' },
  { id: '2', nombre: 'Croquetas de jamón (6)', coste: 412, pvp: 1050, estado: 'bien' },
  { id: '3', nombre: 'Chuletón de vaca vieja', coste: 2140, pvp: 3200, estado: 'atencion' },
];

export function LosDatos() {
  const [pagina, setPagina] = useState(1);
  const [ventas, setVentas] = useState(12_845_000);

  return (
    <>
      <Pieza
        nombre="Cifra"
        cuando="Nunca sola: con su comparación, su objetivo y su origen. «12.400 €» no se puede juzgar; con el resto, sí. Al cambiar, cuenta desde el valor anterior."
      >
        <div className="grid gap-e5 sm:grid-cols-3">
          <Cifra
            etiqueta="Facturado este mes"
            valor={ventas}
            antes={11_930_000}
            sentido="sube_es_bueno"
            formato={(v) => conSimbolo(centimos(Math.trunc(v)))}
            objetivo="130.000,00 €"
            origen="TPV · hasta ayer"
          />
          <Cifra
            etiqueta="Coste de género"
            valor={4_120_000}
            antes={4_480_000}
            sentido="baja_es_bueno"
            formato={(v) => conSimbolo(centimos(Math.trunc(v)))}
            origen="Albaranes · este mes"
            icono={<IconoBien size={14} />}
          />
          <Cifra
            etiqueta="Mermas"
            valor={310_000}
            antes={310_000}
            formato={(v) => conSimbolo(centimos(Math.trunc(v)))}
            origen="Registro de mermas"
          />
        </div>

        <div className="mt-e4">
          <Boton
            onClick={() => {
              setVentas((v) => (v === 12_845_000 ? 14_190_000 : 12_845_000));
            }}
          >
            Cambiar la cifra, para ver cómo cuenta
          </Boton>
        </div>
      </Pieza>

      <Pieza
        nombre="Tabla"
        cuando="Por debajo de 768 px cada fila se convierte en una tarjeta. Estrecha la ventana y míralo."
      >
        <Tabla
          titulo="Platos de la carta"
          filas={PLATOS}
          claveDe={(p) => p.id}
          alPulsar={() => undefined}
          columnas={[
            { clave: 'nombre', titulo: 'Plato', principal: true, celda: (p) => p.nombre },
            {
              clave: 'coste',
              titulo: 'Coste',
              numerica: true,
              celda: (p) => conSimbolo(centimos(p.coste)),
            },
            {
              clave: 'pvp',
              titulo: 'PVP',
              numerica: true,
              celda: (p) => conSimbolo(centimos(p.pvp)),
            },
            {
              clave: 'estado',
              titulo: 'Margen',
              celda: (p) =>
                p.estado === 'bien' ? (
                  <Etiqueta tono="bien" icono={<IconoBien size={12} />}>
                    Correcto
                  </Etiqueta>
                ) : (
                  <Etiqueta tono="atencion" icono={<IconoAtencion size={12} />}>
                    Justo
                  </Etiqueta>
                ),
            },
          ]}
          cuandoNoHay={
            <EstadoVacio
              compacto
              titulo="Todavía no hay platos"
              frase="Cuando la carta tenga platos con su ficha, aquí sale lo que cuesta cada uno."
              accion={<Boton tono="principal">Crear el primero</Boton>}
            />
          }
        />
      </Pieza>

      <Pieza
        nombre="Lista"
        cuando="Cuando cada fila es una cosa con su nombre y su estado, no una fila de datos. Toque de 44 px, o 52 si se marca de cocina."
      >
        <Lista
          titulo="Personas del turno"
          deCocina
          elementos={[
            {
              clave: 'rosa',
              titulo: 'Rosa Iglesias',
              detalle: 'Gerente · desde las 08:00',
              delante: <Avatar nombre="Rosa Iglesias" tamano={32} />,
              derecha: <Etiqueta tono="bien">Fichada</Etiqueta>,
              alPulsar: () => undefined,
            },
            {
              clave: 'marcos',
              titulo: 'Marcos Vega',
              detalle: 'Cocinero · entra a las 12:00',
              delante: <Avatar nombre="Marcos Vega" tamano={32} />,
              derecha: <Etiqueta>Pendiente</Etiqueta>,
              alPulsar: () => undefined,
            },
          ]}
          cuandoNoHay={
            <EstadoVacio
              compacto
              titulo="Nadie en el turno"
              frase="Cuando alguien fiche, sale aquí."
            />
          }
        />
      </Pieza>

      <Pieza
        nombre="Grafica"
        cuando="Se carga aparte: Recharts pesa más de 100 KB y el presupuesto entero son 250. Mientras baja se ve un esqueleto."
      >
        <Tarjeta titulo="Margen por semana" origen="Ejemplo · no son datos de nadie">
          <Grafica
            titulo="Margen por semana"
            eje="semana"
            forma="barras"
            alto={200}
            formato={(v) => `${v} %`}
            series={[{ clave: 'margen', nombre: 'Margen', color: 'var(--color-app-negocio)' }]}
            datos={[
              { semana: 'S1', margen: 61 },
              { semana: 'S2', margen: 64 },
              { semana: 'S3', margen: 58 },
              { semana: 'S4', margen: 66 },
            ]}
            cuandoNoHay={
              <EstadoVacio compacto titulo="Sin datos" frase="No hay nada que dibujar." />
            }
          />
        </Tarjeta>
      </Pieza>

      <Pieza
        nombre="Paginador"
        cuando="Páginas numeradas, nunca desplazamiento infinito: con el infinito no se sabe cuánto queda ni se puede volver al mismo sitio."
      >
        <Fila>
          <div className="w-full max-w-[26rem]">
            <Paginador pagina={pagina} deCuantas={8} alIr={setPagina} que="productos" />
          </div>
        </Fila>
      </Pieza>
    </>
  );
}
