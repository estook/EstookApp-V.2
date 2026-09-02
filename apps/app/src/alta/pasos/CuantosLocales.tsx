import { useState } from 'react';
import { Aviso, Boton, Campo, Selector, clases } from '@estook/ui';
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
  const [cuantos, setCuantos] = useState(Math.max(alta.cuantosLocales, 1));
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [duplicarDe, setDuplicarDe] = useState(alta.localId);
  const [enviando, setEnviando] = useState(false);
  const [recienCreados, setRecienCreados] = useState<string[]>([]);

  const faltan = Math.max(cuantos - alta.cuantosLocales - recienCreados.length, 0);

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
            {faltan === 1
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
