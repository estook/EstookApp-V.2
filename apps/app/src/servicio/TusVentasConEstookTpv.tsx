import { IconoAbrirFuera, IconoDescargar } from '@estook/iconos';
import { DONDE_SE_DESCARGA_LA_CAJA } from '@estook/dominio';
import { DIRECCION_DE_ESTOOK_TPV } from '../pantallas/direccionDeEstookTpv.ts';
import { VincularUnAparato } from './VincularUnAparato.tsx';

/**
 * «Tus ventas entran solas con Estook TPV» (la pausa del 8-nov, 0142).
 *
 * Con Pro, «¿cómo entran tus ventas?» no tiene sentido: Pro es Estook TPV (0120), y conectar
 * otro TPV o subir su fichero es de Esencial. Así que al acabar el alta y en Ajustes ›
 * Conexiones sale esto: dónde se instala y cómo se vincula la primera caja.
 *
 * **El cierre a mano con Pro sigue hasta el cobro (T7)**: hoy Estook TPV todavía no cobra, y
 * quitarlo dejaría al local sin forma de apuntar sus ventas. Ese día, se quita (0142, sección 3).
 */
export function TusVentasConEstookTpv({ modo }: { readonly modo: 'alta' | 'ajustes' }) {
  return (
    <section
      aria-labelledby="tus-ventas-con-estook-tpv"
      className="flex flex-col gap-e4 rounded-mayor border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
    >
      <div>
        <h2 id="tus-ventas-con-estook-tpv" className="text-seccion font-semibold">
          Tus ventas entran solas con Estook TPV
        </h2>
        <p className="text-secundario text-texto-suave">
          {modo === 'alta'
            ? 'Viene con tu plan. Instálalo en la caja y vincúlala con tu correo o con Google: cinco minutos.'
            : 'Viene con tu plan: lo que se vende en la sala entra solo en Estook, sin subir nada.'}
        </p>
      </div>

      <div className="grid gap-e3 sm:grid-cols-3">
        <a
          href={DONDE_SE_DESCARGA_LA_CAJA}
          className="flex min-h-toque flex-col gap-e1 rounded-grande border-2 border-naranja bg-superficie p-e3"
        >
          <span className="text-cuerpo font-semibold">Ordenador con Windows</span>
          <span className="text-secundario text-texto-suave">
            Imprime, abre el cajón y sigue sin internet
          </span>
          <span className="mt-auto flex items-center gap-e2 pt-e2 font-semibold">
            <IconoDescargar size={16} /> Descargar para Windows
          </span>
        </a>
        <a
          href={DIRECCION_DE_ESTOOK_TPV}
          className="flex min-h-toque flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3 hover:bg-fondo"
        >
          <span className="text-cuerpo font-semibold">Tablet o móvil</span>
          <span className="text-secundario text-texto-suave">
            Ábrelo en estook.com/tpv y toca «Instalar»
          </span>
          <span className="mt-auto flex items-center gap-e2 pt-e2 font-semibold">
            <IconoAbrirFuera size={16} /> Abrir Estook TPV
          </span>
        </a>
        <div className="flex flex-col gap-e1 rounded-grande border border-dashed border-borde p-e3 text-texto-suave">
          <span className="text-cuerpo font-semibold">TPV Android con impresora</span>
          <span className="text-secundario">Sunmi y parecidos, cobrando con tarjeta</span>
          <span className="mt-auto pt-e2 text-secundario font-semibold">Pronto</span>
        </div>
      </div>

      {modo === 'ajustes' && <VincularUnAparato />}

      <details className="text-secundario">
        <summary className="min-h-toque cursor-pointer py-e1 font-semibold">
          Cómo se vincula, en tres pasos
        </summary>
        <ol className="mt-e1 flex list-decimal flex-col gap-e1 pl-e4 text-texto-suave">
          <li>
            Abre Estook TPV en la caja y toca «Es el primero: entro con mi correo» (o con Google).
            En la caja para Windows, con Google, saca aquí el código con «Vincular un aparato».
          </li>
          <li>Elige «Caja» y ponle nombre: «Caja 1».</li>
          <li>Cada persona entra con su PIN, el mismo con el que ficha.</li>
        </ol>
      </details>
    </section>
  );
}
