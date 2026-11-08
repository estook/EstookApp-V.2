import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Selector, clases } from '@estook/ui';
import { centimos, conSimbolo, planPorCodigo } from '@estook/dominio';
import { usarMiSuscripcion } from '../../ganchos/usarMiSuscripcion.ts';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 3 · «¿Cuántos locales llevas?» (M5).
 *
 * «Con dos o más se crea la organización primero y **se ofrece duplicar el
 *  local**» (Manifiesto 8).
 *
 * ── Responder no crea nada ───────────────────────────────────────────────────
 *
 * Decir «llevo tres» apunta el paso y **ofrece** crear los otros dos. Crear un
 * local es un acto aparte, con su nombre y su «¿lo duplico de este?»: «nada de
 * efectos secundarios ocultos» (Manifiesto 23).
 *
 * ── Y por qué duplicar no es un lujo ─────────────────────────────────────────
 *
 * Porque el segundo local se parece al primero en todo lo que cuesta configurar:
 * el tipo, el régimen fiscal, los objetivos y la hora de cierre. Hacer el alta
 * ocho veces seguidas es lo que hace que una cadena abandone en el tercero.
 *
 * Lo que **no** se duplica está escrito en el comando: el stock, los albaranes,
 * los precios reales, los fichajes y el chat son del local siempre.
 */
export function CuantosLocales({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  // Los que dijo al pagar (0142), si son más de los que tiene: ya están pagados.
  const suya = usarMiSuscripcion(true);
  const pagados = suya.data?.deLaCasa === true ? 0 : (suya.data?.locales ?? 0);
  const [elegidos, setCuantos] = useState<number | null>(null);
  const cuantos = elegidos ?? Math.max(alta.cuantosLocales, pagados, 1);
  const [abierto, setCreando] = useState<boolean | null>(null);
  const creando = abierto ?? cuantos > 1;
  const [bajando, setBajando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [duplicarDe, setDuplicarDe] = useState(alta.localId);
  const [enviando, setEnviando] = useState(false);
  const [recienCreados, setRecienCreados] = useState<string[]>([]);

  const faltan = Math.max(cuantos - alta.cuantosLocales - recienCreados.length, 0);

  // Lo que sumará a la cuota, dicho antes de crear (0048): la cuota es por local, y
  // cambia sola en Stripe al crearlo. Solo si hay algo que cobrar; uno ya pagado, nada (0142).
  const cache = useQueryClient();
  const activos = alta.cuantosLocales + recienCreados.length;
  const sobranPagados = suya.data?.conStripe === true && pagados > activos ? pagados - activos : 0;

  /** «Solo tengo estos»: la cuota baja a los locales que hay (0142). */
  async function soloEstos() {
    setBajando(true);
    const respuesta = await cliente.ejecutar('ajustar_mi_cuota_a_mis_locales', {});
    setBajando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }
    setCuantos(activos);
    setCreando(false);
    await cache.invalidateQueries({ queryKey: ['mi_suscripcion'] });
  }
  const conUnoMas = suya.data?.conStripe === true ? suya.data.conUnLocalMas : null;

  async function crear() {
    if (nombre.trim() === '') return;
    setEnviando(true);

    const respuesta = await cliente.ejecutar<{ localId: string; duplicado: boolean }>(
      'crear_local',
      { nombre: nombre.trim(), duplicar_de: duplicarDe === '' ? null : duplicarDe },
    );

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setEnviando(false);
      return;
    }

    setRecienCreados((antes) => [...antes, nombre.trim()]);
    void cache.invalidateQueries({ queryKey: ['mi_suscripcion'] });
    setNombre('');
    setEnviando(false);
  }

  async function continuar() {
    setEnviando(true);
    const respuesta = await cliente.ejecutar('responder_cuantos_locales', { cuantos });
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setEnviando(false);
      return;
    }
    await alGuardar();
    setEnviando(false);
  }

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap justify-center gap-e2">
        {[1, 2, 3, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setCuantos(n);
              setCreando(n > 1);
            }}
            aria-pressed={cuantos === n}
            className={clases(
              'min-h-toque min-w-[4rem] rounded-medio border px-e4 text-cuerpo font-medium',
              cuantos === n
                ? 'border-naranja bg-naranja-suave'
                : 'border-borde-fuerte bg-superficie hover:bg-fondo',
            )}
          >
            {n === 10 ? 'Más de 5' : n}
          </button>
        ))}
      </div>

      {cuantos === 1 && (
        <p className="text-center text-secundario text-texto-suave">
          Perfecto. Si algún día abres otro, se añade desde Ajustes y se duplica de este.
        </p>
      )}

      {creando && faltan > 0 && (
        <div className="flex flex-col gap-e3 rounded-medio border border-borde bg-superficie p-e4">
          <p className="text-secundario text-texto-suave">
            {sobranPagados > 0
              ? `Has pagado ${String(pagados)} locales. Ponles nombre: ${faltan === 1 ? 'te falta uno' : `te faltan ${String(faltan)}`}.`
              : faltan === 1
                ? 'Te falta uno por dar de alta. Puedes hacerlo ahora o más tarde.'
                : `Te faltan ${faltan} por dar de alta. Puedes hacerlo ahora o más tarde.`}
          </p>

          <Campo
            etiqueta="Nombre del otro local"
            name="nombre-del-local"
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value);
            }}
            ayuda="Como lo llama tu equipo. «Bar Puerto», no «Local 2»."
          />

          {alta.paraDuplicar.length > 0 && (
            <Selector
              etiqueta="Copiar la configuración de"
              value={duplicarDe}
              onChange={(evento) => {
                setDuplicarDe(evento.target.value);
              }}
              opciones={[
                { valor: alta.localId, texto: `${alta.nombre} (este)` },
                ...alta.paraDuplicar.map((l) => ({ valor: l.id, texto: l.nombre })),
              ]}
              sinElegir="Empezar de cero"
              ayuda="Se copian el tipo, los impuestos, los objetivos y la hora de cierre. Nunca el stock ni la gente."
            />
          )}

          {conUnoMas !== null && conUnoMas.cuota !== null && (
            <p className="text-secundario text-texto-suave">
              Con este local, tu cuota pasa a{' '}
              <strong className="text-texto">{conSimbolo(centimos(conUnoMas.cuota))}</strong>
              {suya.data?.intervalo === 'ano' ? ' al año' : ' al mes'}
              {conUnoMas.plan !== suya.data?.plan
                ? ` (plan ${planPorCodigo(conUnoMas.plan)?.nombre ?? conUnoMas.plan}, más barato por local)`
                : ''}
              . Lo de este periodo se ajusta en la siguiente factura.
            </p>
          )}

          <Boton
            tono="secundario"
            cargando={enviando}
            textoCargando="Creando"
            disabled={nombre.trim() === ''}
            onClick={() => {
              void crear();
            }}
          >
            Añadir este local
          </Boton>

          {sobranPagados > 0 && (
            <p className="text-secundario text-texto-suave">
              ¿Al final son menos?{' '}
              <button
                type="button"
                disabled={bajando}
                onClick={() => {
                  void soloEstos();
                }}
                className="min-h-toque font-semibold text-texto underline"
              >
                {bajando
                  ? 'Ajustando la cuota…'
                  : `Solo tengo ${String(activos)}: no me cobres ${sobranPagados === 1 ? 'el otro' : `los otros ${String(sobranPagados)}`}`}
              </button>
              . Lo pagado de más se descuenta de tu siguiente cuota.
            </p>
          )}
        </div>
      )}

      {recienCreados.length > 0 && (
        <Aviso tono="bien" titulo={`${recienCreados.length} local(es) más dados de alta`}>
          {recienCreados.join(', ')}. Cada uno tendrá su propio alta cuando entres en él.
        </Aviso>
      )}

      <Boton
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        onClick={() => {
          void continuar();
        }}
      >
        Continuar
      </Boton>
    </div>
  );
}
