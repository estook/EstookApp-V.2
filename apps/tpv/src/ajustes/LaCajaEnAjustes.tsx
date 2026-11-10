import { useState, type ReactNode } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLaCaja, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';
import { deEurosACentimos, enLaCasilla } from '../caja/dinero.ts';
import type { AjustesDeLaCaja } from '../caja/tipos.ts';
import { eurosConSimbolo } from '../logica/texto.ts';

/**
 * **Ajustes del TPV › La caja** (R3 · 1, decisión 0144; maqueta del 9-nov, tramo 6): por apartados,
 * no todo junto (Richi, 9-nov). Quién abre y cierra (encargados, o también camareros), el recuento
 * obligatorio al abrir, contar a ciegas, el fondo de siempre, y las formas de pago que se encienden:
 * Bizum y el cheque restaurante. Lo de la segunda entrega (descuentos, propinas, avisos) llega con
 * ella: no se enseña hasta que funcione.
 */
export function LaCajaEnAjustes() {
  const caja = usarLaCaja();
  if (caja.isLoading || caja.data === undefined) return <Cargando que="la caja" />;
  return <ElFormulario inicial={caja.data.ajustes} cajon={caja.data.cajon?.nombre ?? null} />;
}

function ElFormulario({
  inicial,
  cajon,
}: {
  readonly inicial: AjustesDeLaCaja;
  readonly cajon: string | null;
}) {
  const { cliente } = usarSesion();
  const recargar = usarRecargarLaCaja();
  const [ajustes, setAjustes] = useState(inicial);
  const [fondo, setFondo] = useState(
    inicial.fondoDeSiempre === null ? '' : enLaCasilla(inicial.fondoDeSiempre),
  );
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar(nuevos: AjustesDeLaCaja) {
    setAjustes(nuevos);
    setFallo(null);
    setGuardado(false);
    const r = await cliente.ejecutar('guardar_ajustes_de_la_caja', {
      caja_la_abren: nuevos.cajaLaAbren,
      recuento_al_abrir: nuevos.recuentoAlAbrir,
      contar_a_ciegas: nuevos.contarACiegas,
      fondo_de_siempre: nuevos.fondoDeSiempre,
      con_bizum: nuevos.conBizum,
      con_cheque: nuevos.conCheque,
    });
    if (r.ok) {
      setGuardado(true);
      await recargar();
    } else setFallo(r.error);
  }

  const cambiar = (que: Partial<AjustesDeLaCaja>) => void guardar({ ...ajustes, ...que });

  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">La caja</h2>
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {guardado && <p className="font-bold text-bien">Guardado.</p>}
      <div className="gap-e4 lg:columns-2">
        <Apartado titulo="Abrir y cerrar">
          <div className="flex flex-col gap-e2">
            <span>Quién puede abrir y cerrar la caja</span>
            <div
              className="inline-flex w-fit rounded-redondo border border-borde bg-fondo p-e1"
              role="group"
            >
              {(
                [
                  ['encargados', 'Encargados'],
                  ['todos', 'También camareros'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={ajustes.cajaLaAbren === valor}
                  onClick={() => {
                    cambiar({ cajaLaAbren: valor });
                  }}
                  className={`min-h-toque rounded-redondo px-e4 font-bold ${
                    ajustes.cajaLaAbren === valor
                      ? 'bg-naranja text-sobre-naranja'
                      : 'text-texto-suave'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            <span className="text-secundario text-texto-tenue">
              {ajustes.cajaLaAbren === 'todos'
                ? 'Cualquiera del equipo, con su PIN. Lo contado queda a su nombre.'
                : 'Gerente y jefe de sala, con su PIN. Si abre otro, lo aprueba uno de ellos.'}
            </span>
          </div>
          <Interruptor
            nombre="Recuento obligatorio al abrir"
            detalle={
              ajustes.recuentoAlAbrir
                ? 'Encendido: al abrir, siempre se cuenta'
                : 'Apagado: «Contar» o «Está correcto»'
            }
            encendido={ajustes.recuentoAlAbrir}
            alCambiar={(v) => {
              cambiar({ recuentoAlAbrir: v });
            }}
          />
          <label className="flex items-center justify-between gap-e3">
            <span className="flex flex-col">
              <span>El fondo de siempre</span>
              <span className="text-secundario text-texto-tenue">
                Lo que se propone dejar para mañana. Vacío: lo de la última vez.
              </span>
            </span>
            <input
              inputMode="decimal"
              value={fondo}
              placeholder="0,00"
              onChange={(e) => {
                setFondo(e.currentTarget.value);
              }}
              onBlur={() => {
                const c = fondo.trim() === '' ? null : deEurosACentimos(fondo);
                if (c !== ajustes.fondoDeSiempre && (c !== null || fondo.trim() === '')) {
                  cambiar({ fondoDeSiempre: c });
                }
              }}
              className="w-[8ch] rounded-chico border border-borde bg-fondo px-e2 py-e1 text-right font-bold tabular-nums"
            />
          </label>
        </Apartado>

        <Apartado titulo="Al contar el cierre">
          <Interruptor
            nombre="Contar a ciegas"
            detalle="No se ve lo que debería haber hasta acabar"
            encendido={ajustes.contarACiegas}
            alCambiar={(v) => {
              cambiar({ contarACiegas: v });
            }}
          />
        </Apartado>

        <Apartado titulo="Formas de pago">
          <div className="flex items-center justify-between">
            <span>Efectivo y tarjeta</span>
            <span className="text-secundario font-bold text-texto-tenue">Siempre</span>
          </div>
          <Interruptor
            nombre="Bizum"
            detalle="Al móvil del local. Estook solo lo apunta"
            encendido={ajustes.conBizum}
            alCambiar={(v) => {
              cambiar({ conBizum: v });
            }}
          />
          <Interruptor
            nombre="Cheque restaurante"
            detalle="Pluxee, Edenred, Up… Al cerrar se cuentan aparte"
            encendido={ajustes.conCheque}
            alCambiar={(v) => {
              cambiar({ conCheque: v });
            }}
          />
        </Apartado>

        <Apartado titulo="Cajón">
          <div className="flex items-center justify-between gap-e3">
            <span>{cajon ?? 'Este aparato no tiene cajón'}</span>
            <span className="text-secundario text-texto-tenue">Se cambia en Aparatos</span>
          </div>
          {ajustes.fondoDeSiempre !== null && (
            <span className="text-secundario text-texto-tenue">
              Fondo de siempre: {eurosConSimbolo(ajustes.fondoDeSiempre)}
            </span>
          )}
        </Apartado>
      </div>
      <p className="text-secundario text-texto-tenue">
        Lo ve quien lleva los Ajustes del TPV (gerente, area manager y dirección).
      </p>
    </div>
  );
}

function Apartado({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <section
      aria-label={titulo}
      className="mb-e4 flex break-inside-avoid flex-col gap-e3 rounded-mayor bg-superficie p-e4"
    >
      <h3 className="text-etiqueta font-bold uppercase tracking-wider text-texto-tenue">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Interruptor({
  nombre,
  detalle,
  encendido,
  alCambiar,
}: {
  readonly nombre: string;
  readonly detalle: string;
  readonly encendido: boolean;
  readonly alCambiar: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-e3">
      <span className="flex min-w-0 flex-col">
        <span>{nombre}</span>
        <span className="text-secundario text-texto-tenue">{detalle}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={encendido}
        aria-label={nombre}
        onClick={() => {
          alCambiar(!encendido);
        }}
        className={`relative h-8 w-14 shrink-0 rounded-redondo transition-colors ${encendido ? 'bg-bien' : 'bg-borde'}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-redondo bg-fondo transition-[left] ${encendido ? 'left-7' : 'left-1'}`}
        />
      </button>
    </div>
  );
}
