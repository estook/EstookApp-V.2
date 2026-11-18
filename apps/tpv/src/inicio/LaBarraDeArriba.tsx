import { useSyncExternalStore, type ReactNode } from 'react';
import { inicialesDe } from '@estook/dominio';
import {
  IconoCandado,
  IconoCuenta,
  IconoParaLlevar,
  IconoPrisa,
  IconoRejilla,
  type Icono as IconoDeLucide,
} from '@estook/iconos';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { escucharLaDireccion, irA, irAlPlano, laDireccion } from '../navegar.ts';
import { ElSimbolo, Icono } from '../iconos.tsx';
import { BotonDeLaCaja } from '../caja/BotonDeLaCaja.tsx';
import { BotonDeLaCampana } from '../avisos/LosAvisos.tsx';

/**
 * **Arriba, siempre** (la entrada nueva, maqueta 1; rehecha en el rediseño, 0148, con la maqueta
 * aprobada el 18-nov): todo Estook TPV se maneja desde aquí.
 *
 *   · a la izquierda, **el símbolo de Estook** (Richi: «en vez de la E, el logo de la marca, tiene
 *     más sentido») y el local, que **devuelven a la sala desde cualquier sitio**
 *   · en medio, **los iconos de cada sitio**: la sala, para llevar y los tickets, con su nombre
 *     debajo. La venta rápida, el reparto y las reservas entran aquí el día que existan
 *   · a la derecha, lo de todos los días: **la caja** (0144) y **Fichar en naranja** (0115), solo
 *     en la caja; **la campana** de los avisos (0148); **el engranaje**, en todos (0143); y quién
 *     está, que **bloquea** de un toque. En el móvil de la sala, lo suyo va en la barra de abajo
 *
 * En el móvil, los iconos solos, sin el nombre: la barra cabe en una fila.
 */
export function LaBarraDeArriba({
  titulo,
  conBarraDeAbajo = false,
  children,
}: {
  readonly titulo?: string;
  /**
   * En la sala, el móvil lleva **la barra de abajo** (0148): Sala, Fichar, el engranaje y Bloquear
   * pasan allí («Sala» y «Tú»), y arriba queda lo demás.
   */
  readonly conBarraDeAbajo?: boolean;
  readonly children?: ReactNode;
}) {
  const abajo = conBarraDeAbajo ? 'max-md:hidden' : '';
  const { yo, aparato, bloquear } = usarSesion();
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const enLaCaja = aparato.funcion === 'caja';
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  // Hacer una factura, en cualquier aparato de sala (0137).
  const factura =
    puedeEditar(yo.permisos, 'accion.factura_de_un_ticket') ||
    puedeEditar(yo.permisos, 'accion.factura_a_mano');
  const enLaSala = titulo === undefined && direccion !== 'llevar' && direccion !== 'rapida';
  return (
    <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e2 md:flex-nowrap md:px-e5">
      <button
        type="button"
        aria-label="La sala"
        onClick={irAlPlano}
        className="flex min-w-0 shrink-0 items-center gap-e3 rounded-grande text-left md:w-[13rem]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-grande bg-texto text-fondo">
          <ElSimbolo lado={30} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-seccion font-bold leading-tight">
            {titulo ?? aparato.local.nombre}
          </span>
          <span className="truncate text-secundario text-texto-tenue">
            {titulo === undefined ? aparato.nombre : `${aparato.local.nombre} · ${aparato.nombre}`}
          </span>
        </span>
      </button>

      <nav
        aria-label="Estook TPV"
        className="order-last flex w-full justify-center gap-e1 md:order-none md:w-auto md:flex-1"
      >
        {tomaNota && (
          <DondeIr
            icono={IconoRejilla}
            texto="Sala"
            puesto={enLaSala}
            onClick={irAlPlano}
            oculto={abajo}
          />
        )}
        {/* **La venta rápida** (0148): en la caja, con su rayo en amarillo. */}
        {tomaNota && enLaCaja && (
          <DondeIr
            icono={IconoPrisa}
            texto="Rápida"
            etiqueta="Venta rápida"
            colorDelIcono="text-mesa-te-toca"
            puesto={direccion === 'rapida'}
            onClick={() => {
              irA('rapida');
            }}
          />
        )}
        {tomaNota && (
          <DondeIr
            icono={IconoParaLlevar}
            texto="Para llevar"
            puesto={titulo === undefined && direccion === 'llevar'}
            onClick={() => {
              irA('llevar');
            }}
          />
        )}
        {factura && (
          <DondeIr
            icono={IconoCuenta}
            texto="Tickets"
            etiqueta="Tickets y facturas"
            puesto={direccion === 'facturas'}
            onClick={() => {
              irA('facturas');
            }}
          />
        )}
      </nav>

      {children}

      <div className="ml-auto flex shrink-0 items-center gap-e2 md:ml-0">
        {/* La caja (0144): verde con la caja abierta, y dentro lo demás. Solo en la caja. */}
        {enLaCaja && <BotonDeLaCaja />}
        {enLaCaja && (
          <button
            type="button"
            aria-label="Fichar"
            onClick={() => {
              irA('fichar');
            }}
            className={`flex min-h-toque min-w-toque items-center justify-center gap-e2 rounded-grande bg-naranja px-e3 font-bold text-sobre-naranja sm:px-e4 ${abajo}`}
          >
            <Icono dibujo="reloj" lado={18} />
            {/* En el móvil, solo el reloj: la barra cabe en una fila. */}
            <span className="max-sm:hidden">Fichar</span>
          </button>
        )}
        {/* **La campana** (0148): los avisos, hasta que alguien los atiende. En el móvil de la
            sala, abajo. */}
        {tomaNota && (
          <span className={abajo}>
            <BotonDeLaCampana />
          </span>
        )}
        {/* El engranaje, en todos los aparatos (0143): dentro está «Tu sesión», con el tema; lo
            demás, solo en la caja y a quien puede tocarlo. */}
        <button
          type="button"
          aria-label="Ajustes"
          title="Ajustes"
          onClick={() => {
            irA('ajustes');
          }}
          className={[
            'flex size-11 shrink-0 items-center justify-center rounded-grande border border-borde',
            direccion.startsWith('ajustes') ? 'bg-texto text-superficie' : 'bg-charcoal',
            abajo,
          ].join(' ')}
        >
          <Icono dibujo="ajustes" lado={22} />
        </button>
        <button
          type="button"
          onClick={bloquear}
          aria-label={`${yo.nombre}: bloquear`}
          title="Bloquear"
          className={`flex min-h-toque items-center gap-e2 rounded-grande border border-borde bg-charcoal py-e1 pl-e1 pr-e3 font-bold ${abajo}`}
        >
          <span className="flex size-8 items-center justify-center rounded-medio bg-app-servicio text-etiqueta text-fondo">
            {inicialesDe(yo.nombre)}
          </span>
          <span className="max-lg:hidden">{yo.nombre}</span>
          <IconoCandado size={18} aria-hidden className="text-texto-suave" />
        </button>
      </div>
    </header>
  );
}

/** Un sitio de la barra: su icono grande y su nombre debajo; en el móvil, el icono solo. */
function DondeIr({
  icono: Dibujo,
  texto,
  etiqueta = texto,
  colorDelIcono,
  puesto,
  oculto = '',
  onClick,
}: {
  readonly icono: IconoDeLucide;
  /** Las clases que lo esconden donde está en otro sitio: «Sala», abajo en el móvil. */
  readonly oculto?: string;
  readonly texto: string;
  /** El color propio del icono: el rayo de la venta rápida, siempre amarillo. */
  readonly colorDelIcono?: string;
  /** Lo que oye quien no ve, si dice más: «Tickets y facturas». */
  readonly etiqueta?: string;
  readonly puesto: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={puesto ? 'page' : undefined}
      aria-label={etiqueta}
      onClick={onClick}
      className={[
        'flex min-h-toque min-w-[4.5rem] flex-col items-center justify-center gap-[2px] rounded-grande px-e3 py-e1 text-etiqueta font-semibold max-md:flex-1',
        puesto ? 'bg-naranja-suave text-texto' : 'text-texto-suave hover:bg-fondo',
        oculto,
      ].join(' ')}
    >
      <Dibujo
        size={22}
        aria-hidden
        className={colorDelIcono ?? (puesto ? 'text-naranja' : undefined)}
      />
      <span>{texto}</span>
    </button>
  );
}
