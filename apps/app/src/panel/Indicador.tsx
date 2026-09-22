import { useNavigate } from 'react-router-dom';
import { leerIdDelIndicador, type Indicador, type PeriodoDelIndicador } from '@estook/dominio';
import {
  TarjetaDeIndicador,
  acentoDelWidget,
  usarQueEstaVacio,
  type TamanoDeWidget,
} from '@estook/ui';
import { DONDE_SE_MIRA, usarElIndicador } from '../ganchos/usarElIndicador.ts';

/**
 * Un indicador en el Panel (M7, decisión 0039).
 *
 * La tarjeta es de `@estook/ui` desde V: la comparten el Panel y las cifras de
 * Inventario, Servicio y Equipo (mejora 2). Aquí queda lo que es de la aplicación:
 * **leerla**, con el permiso de quien pregunta, y **adónde lleva** cada una.
 *
 * Lo que no hace: sumar. Todo llega hecho de `un_indicador`, y así el food cost del
 * Panel es el mismo que el de Servicio (lo comprueba `el-panel-vivo.prueba.ts`).
 */

export function IndicadorWidget({
  id,
  tamano,
}: {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}) {
  const leido = leerIdDelIndicador(id);
  if (leido === null) return null;
  return <EnElPanel indicador={leido.indicador} dias={leido.dias} id={id} tamano={tamano} />;
}

function EnElPanel({
  indicador,
  dias,
  id,
  tamano,
}: {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}) {
  const navegar = useNavigate();
  const { datos, fallo } = usarElIndicador(indicador, dias);

  // Vacío es «no hay ni un dato en el periodo»: sin cierres, no hay ventas que
  // enseñar. Una merma de cero euros **no** es vacío, es una buena semana.
  usarQueEstaVacio(datos === undefined ? undefined : datos.total === null);

  const destino = DONDE_SE_MIRA[indicador];
  return (
    <TarjetaDeIndicador
      indicador={indicador}
      dias={dias}
      datos={datos}
      fallo={fallo}
      tamano={tamano}
      acento={acentoDelWidget(id) ?? 'var(--color-naranja)'}
      {...(destino === null
        ? {}
        : {
            alVer: () => {
              navegar(destino);
            },
          })}
    />
  );
}
