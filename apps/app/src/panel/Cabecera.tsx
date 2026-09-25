import { useState } from 'react';
import { comoSeLeenLasHoras } from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import { Logo, clases } from '@estook/ui';
import { IconoFlechaAbajo } from '@estook/iconos';
import { usarFichar } from '../ganchos/usarFichar.ts';
import { usarInventarioHoy } from '../ganchos/usarInventarioHoy.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La cabecera del Panel · quién eres y dónde estás, con la cara del local.
 *
 * ── El fallo que arregla, que se ve en una foto y no en una prueba ───────────
 *
 * Lo que había eran dos líneas de texto suelto —«BAR CENTRO» en gris pequeño y
 * «Hola, Rosa» debajo— encima de una pantalla blanca. Mirado en el TPV de una
 * cocina, la aplicación entera parecía **una hoja de papel con texto flotando**:
 * sin bloques, sin color y sin nada que dijera de quién es esto.
 *
 * Y la marca del local ya existía desde M5 —su logo y su color, subidos en el
 * alta— y no se veía en ninguna parte salvo en una esquina de la barra de móvil.
 * Se había pedido el logo a la gente y luego no se enseñaba.
 *
 * ── Por qué el color va aquí aunque el interruptor esté apagado ──────────────
 *
 * Porque son dos cosas distintas. «Usar mi color en toda la aplicación» decide si
 * los **botones y los controles** dejan de ser naranjas; esto es la cabecera del
 * local, que es donde el color de un local se pone en cualquier aplicación del
 * mundo, y para eso se pidió en el alta: «se aplican a la app y a todos los
 * documentos» (Manifiesto 8).
 *
 * ── Y por qué el nombre no va sobre el color ─────────────────────────────────
 *
 * Porque un color de marca puede ser cualquiera, y escribir encima de cualquiera
 * es como se acaba con texto que no se lee. El color va en una **banda** y en el
 * cuadro del logo; el texto va sobre la superficie de siempre, con el contraste
 * de siempre. Es la misma idea que `color.ts`: se pinta con el color, no se
 * escribe sobre él.
 */
export function CabeceraDelPanel() {
  const { yo } = usarSesion();
  const [abierta, setAbierta] = useState(false);

  const local = yo?.local ?? null;
  const donde = local?.nombre ?? yo?.organizacion?.nombre ?? '';
  const color = local?.colorDeMarca ?? null;

  return (
    <header
      className="overflow-hidden rounded-mayor border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]"
      /*
        El color del local, como un velo que entra por la esquina (entrega V,
        0045). Hasta aquí era una banda de seis píxeles arriba: se veía, pero era
        la línea de color de una web de 2005. El velo dice lo mismo —esta es tu
        casa— y deja el texto sobre la superficie de siempre: a la izquierda, donde
        va el nombre, apenas tiñe, así que el contraste no cambia.
      */
      style={{
        backgroundImage: `linear-gradient(120deg, color-mix(in srgb, ${color ?? 'var(--color-naranja)'} 16%, transparent) 0%, transparent 45%)`,
      }}
    >
      {/*
        ── Y se abre ────────────────────────────────────────────────────────

        «Usar el "hola usuario" de arriba para hacer un desplegable con cosas:
        avisos leves, avisos graves, horas trabajadas.» La cabecera ocupaba una
        franja entera para decir dos cosas que ya se sabían —cómo te llamas y
        dónde estás—; ahora eso es la portada de lo que sí se viene a mirar.

        Se pide **al abrirla**, no al pintar el Panel: son dos consultas más, y el
        Panel tiene un segundo entero para pintarse con un año de datos (B7). Si
        ya están en la caché porque hay un widget que las usa, no se pide nada.
      */}
      {/*
        El `h1` **envuelve al botón**, y no al revés.

        Un `<button>` solo admite contenido de frase, así que un `<h1>` dentro es
        HTML inválido; y quitar el `h1` dejaba al Panel —la primera pantalla de la
        aplicación— **sin encabezado de nivel 1**, que es por donde entra quien
        navega con un lector de pantalla. Lo cazaron trece pruebas de acceso a la
        vez, y con razón.

        Envolviéndolo se cumplen las dos cosas: sigue siendo el encabezado de la
        pantalla y es el patrón de siempre para algo que se abre y se cierra.
      */}
      <h1>
        <button
          type="button"
          aria-expanded={abierta}
          onClick={() => {
            setAbierta((antes) => !antes);
          }}
          className="flex w-full flex-wrap items-center gap-e3 px-e4 py-e3 text-left hover:bg-fondo"
        >
          <span
            aria-hidden
            className="grid size-[44px] shrink-0 place-items-center overflow-hidden rounded-medio border border-borde bg-fondo"
          >
            {local?.logo == null ? (
              <Logo alto={16} />
            ) : (
              <img src={local.logo} alt="" className="max-h-[34px] max-w-[34px] object-contain" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-secundario font-medium text-texto-suave">
              {donde}
            </span>
            <span className="block truncate text-pantalla font-semibold">
              Hola, {yo?.nombre.split(' ')[0] ?? ''}
            </span>
          </span>

          <span
            aria-hidden
            className={clases(
              'shrink-0 text-texto-suave transition-transform duration-rapido',
              abierta && 'rotate-180',
            )}
          >
            <IconoFlechaAbajo size={20} />
          </span>
          <span className="sr-only">{abierta ? 'Cerrar el resumen' : 'Ver tu resumen'}</span>
        </button>
      </h1>

      {abierta && <TuResumen />}
    </header>
  );
}

/**
 * Lo tuyo de hoy, en cuatro cifras.
 *
 * ── Qué entra aquí, y qué no ────────────────────────────────────────────────
 *
 * Entra **lo que es de esta persona y de hoy**: lo que lleva fichado, lo que hay
 * que atender, lo que caduca esta semana. No entra ni una cifra de dinero, y no
 * es una omisión: esto se abre en la primera pantalla del día, delante de quien
 * pase por al lado, y lo que vale la cámara ya tiene su widget para quien lo
 * pueda ver.
 *
 * Y lo que no se puede contestar **no se pinta con un cero**: sin la app de
 * Inventario en el acceso, esas dos cifras no están. Un cero significa «no hay
 * nada que atender», que es lo contrario de «no lo puedes ver».
 */
function TuResumen() {
  const { permisos } = usarSesion();
  const fichaje = usarFichar();
  const hoy = usarInventarioHoy();
  const veInventario = puedeVer(permisos, 'app.inventario');

  const atencion = hoy.data?.atencion.length ?? 0;
  const caducan = hoy.data?.caducan.length ?? 0;
  const minutos = fichaje.mio?.minutosDeHoy ?? 0;
  const deLaSemana = fichaje.mio?.minutosDeLaSemana ?? 0;

  return (
    <div className="anima-desplegar border-t border-borde px-e4 py-e3">
      <dl className="grid gap-e3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          que="Llevas hoy"
          valor={comoSeLeenLasHoras(minutos)}
          detalle={
            fichaje.mio?.abierto == null
              ? 'Sin fichar ahora mismo'
              : `Dentro desde las ${fichaje.mio.abierto.entroEn.slice(11, 16)}`
          }
        />
        <Dato que="Esta semana" valor={comoSeLeenLasHoras(deLaSemana)} detalle="De lunes a hoy" />

        {veInventario && (
          <>
            <Dato
              que="Hay que atender"
              valor={String(atencion)}
              tono={atencion > 0 ? 'atencion' : 'bien'}
              detalle={atencion === 0 ? 'Nada bajo mínimo' : 'Bajo mínimo o agotado'}
            />
            <Dato
              que="Caduca esta semana"
              valor={String(caducan)}
              tono={caducan > 0 ? 'atencion' : 'bien'}
              detalle={caducan === 0 ? 'Nada con fecha cerca' : 'Lotes con fecha'}
            />
          </>
        )}
      </dl>
    </div>
  );
}

function Dato({
  que,
  valor,
  detalle,
  tono = 'neutro',
}: {
  readonly que: string;
  readonly valor: string;
  readonly detalle: string;
  readonly tono?: 'neutro' | 'bien' | 'atencion';
}) {
  return (
    <div className="rounded-medio border border-borde bg-fondo px-e3 py-e2">
      <dt className="text-secundario font-medium text-texto-suave">{que}</dt>
      <dd
        className={clases(
          'text-seccion font-semibold tabular-nums',
          tono === 'atencion' && 'text-atencion',
          tono === 'bien' && 'text-bien',
        )}
      >
        {valor}
      </dd>
      <dd className="text-etiqueta text-texto-tenue">{detalle}</dd>
    </div>
  );
}
