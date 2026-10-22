import { useState } from 'react';
import {
  NOMBRE_DEL_MOTIVO_DE_MERMA,
  loQueNoCuadra,
  ticketMedio,
  type Centimos,
} from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { Aviso, Boton, Cargando, Cifra, clases } from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { nombreEn } from '../datos/nombreEn.ts';
import { ApuntarMerma } from '../almacen/ApuntarMerma.tsx';
import { comoDinero, conUnidadDeUso, type MisMermas } from '../almacen/contrato.ts';

/**
 * Los pasos del cierre del día (M16a, decisión 0105).
 *
 * «Cierre en cuatro pasos y sesenta segundos» (Manifiesto): de dónde salen las ventas,
 * las mermas, el APPCC que falte y el repaso. **Son tres mientras no exista el APPCC**
 * (M16b): un paso sin nada que hacer no se enseña, y llegará con su módulo.
 */
export const LOS_PASOS = ['Las ventas', 'Las mermas', 'El repaso'] as const;
export type Paso = 0 | 1 | 2;

export function LosPasos({ paso }: { readonly paso: Paso }) {
  return (
    <ol aria-label={`Paso ${paso + 1} de ${LOS_PASOS.length}`} className="flex gap-e2">
      {LOS_PASOS.map((nombre, indice) => (
        <li
          key={nombre}
          aria-current={indice === paso ? 'step' : undefined}
          className={clases(
            'flex min-w-0 flex-1 flex-col gap-e1 text-etiqueta',
            indice === paso ? 'font-semibold text-texto' : 'text-texto-suave',
          )}
        >
          <span
            aria-hidden
            className={clases(
              'h-1 rounded-completo',
              indice <= paso ? 'bg-[var(--color-app-servicio)]' : 'bg-borde',
            )}
          />
          <span className="truncate">{nombre}</span>
        </li>
      ))}
    </ol>
  );
}

/** Las mermas de un día: la misma lectura en el paso 2 y en el repaso, un solo viaje. */
function usarLasMermasDe(fecha: string) {
  const { permisos } = usarSesion();
  const veAlmacen = puedeVer(permisos, 'app.almacen');
  return {
    veAlmacen,
    mermas: usarLectura<MisMermas>(
      'mis_mermas',
      { desde: fecha, hasta: fecha, limite: '100' },
      veAlmacen,
    ),
  };
}

/**
 * El paso de las mermas: lo que se ha tirado ese día, y apuntar lo que falte.
 *
 * «Mermas, por voz, por botones o ninguna» (Manifiesto). La hoja de apuntar es la del
 * Panel y Almacén, con la voz y la foto de Fogón si está encendido: aquí no se inventa
 * otra. Solo se apunta en el día de hoy, porque una merma lleva la hora en que se tiró.
 */
export function LasMermasDelDia({
  fecha,
  esHoy,
}: {
  readonly fecha: string;
  readonly esHoy: boolean;
}) {
  const { permisos } = usarSesion();
  const [apuntando, setApuntando] = useState(false);
  const { veAlmacen, mermas } = usarLasMermasDe(fecha);
  const apunta = esHoy && puedeEditar(permisos, 'accion.registrar_merma');

  return (
    <section className="flex flex-col gap-e3">
      <h3 className="text-seccion font-semibold">Lo que se ha tirado</h3>
      {!veAlmacen ? (
        <p className="text-secundario text-texto-suave">
          Las mermas se miran en Almacén, y no está en tu acceso.
        </p>
      ) : mermas.isPending ? (
        <Cargando que="las mermas" />
      ) : mermas.isError ? (
        <Aviso tono="mal" titulo="No he podido leer las mermas">
          Puedes seguir y cerrar igual.
        </Aviso>
      ) : mermas.data.mermas.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          {esHoy ? 'Hoy no se ha apuntado ninguna merma.' : 'Ese día no se apuntó ninguna merma.'}
        </p>
      ) : (
        <ul className="flex flex-col">
          {mermas.data.mermas.map((m) => (
            <li
              key={m.id}
              className="flex items-baseline justify-between gap-e2 border-b border-borde py-e1 last:border-0"
            >
              <span className="min-w-0 truncate">{m.producto}</span>
              <span className="shrink-0 text-secundario text-texto-suave">
                {conUnidadDeUso(m.cuanto, m.unidadDeUso)} ·{' '}
                {nombreEn(NOMBRE_DEL_MOTIVO_DE_MERMA, m.motivo, m.motivo)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {apunta && (
        <div>
          <Boton
            tono="secundario"
            icono={<IconoAnadir size={16} />}
            onClick={() => {
              setApuntando(true);
            }}
          >
            Apuntar una merma
          </Boton>
          <ApuntarMerma
            abierta={apuntando}
            alCerrar={() => {
              setApuntando(false);
            }}
          />
        </div>
      )}
    </section>
  );
}

/**
 * El repaso: lo que se va a guardar y lo que conviene mirar antes, sin bloquear nada.
 *
 * «Un compañero, no un policía»: que el desglose no cuadre o que alguien siga fichado se
 * dice, y se cierra igual. Queda a nombre de quien cierra por su sesión: sin PIN en tu
 * móvil (Richi, 22-oct).
 */
export function ElRepaso({
  total,
  efectivo,
  tarjeta,
  otros,
  tickets,
  platos,
  fecha,
  siguenDentro,
}: {
  readonly total: Centimos | null;
  readonly efectivo: Centimos | null;
  readonly tarjeta: Centimos | null;
  readonly otros: Centimos | null;
  readonly tickets: string;
  readonly platos: number;
  readonly fecha: string;
  readonly siguenDentro: number | null;
}) {
  const { yo } = usarSesion();
  const { mermas } = usarLasMermasDe(fecha);
  const cuantosTickets = tickets.trim() === '' ? null : Math.trunc(Number(tickets));
  const medio = total === null ? null : ticketMedio(total, cuantosTickets);
  const diferencia =
    total === null
      ? null
      : loQueNoCuadra(total, {
          efectivoCentimos: efectivo,
          tarjetaCentimos: tarjeta,
          otrosCentimos: otros,
        });
  const cuantasMermas = mermas.data?.cuantasEnTotal ?? null;

  return (
    <section className="flex flex-col gap-e3">
      {/* Lo facturado, grande; lo demás, en una línea: en el móvil, tres cifras grandes
          una debajo de otra ocupaban la pantalla entera. */}
      <Cifra
        etiqueta="Facturado"
        valor={total ?? 0}
        formato={(v) => comoDinero(v)}
        origen="Con IVA, tal cual la caja"
      />
      <p className="text-secundario text-texto-suave">
        {cuantosTickets === null
          ? 'Sin tickets contados'
          : `${String(cuantosTickets)} ${cuantosTickets === 1 ? 'ticket' : 'tickets'}`}
        {medio === null ? '' : ` · ticket medio ${comoDinero(medio)}`}
        {' · '}
        {platos === 0
          ? 'sin platos apuntados'
          : `${String(platos)} ${platos === 1 ? 'plato apuntado' : 'platos apuntados'}`}
      </p>
      <ul className="flex flex-col gap-e1 text-secundario">
        {diferencia !== null && diferencia !== 0 && (
          <li className="text-atencion">
            El desglose {diferencia > 0 ? 'se pasa' : 'se queda corto'} en{' '}
            {comoDinero(Math.abs(diferencia))}. Se puede cerrar igual.
          </li>
        )}
        {cuantasMermas !== null && (
          <li className="text-texto-suave">
            {cuantasMermas === 0
              ? 'Sin mermas apuntadas.'
              : `${String(cuantasMermas)} ${cuantasMermas === 1 ? 'merma apuntada' : 'mermas apuntadas'}.`}
          </li>
        )}
        {siguenDentro !== null && siguenDentro > 0 && (
          <li className="text-atencion">
            {siguenDentro === 1
              ? 'Una persona sigue fichada: que fiche la salida al irse.'
              : `${String(siguenDentro)} personas siguen fichadas: que fichen la salida al irse.`}
          </li>
        )}
        <li className="text-texto-suave">
          Queda a tu nombre{yo === null ? '' : `, ${yo.nombre}`}.
        </li>
      </ul>
    </section>
  );
}
