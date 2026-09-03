import { useState } from 'react';
import { NOMBRE_DEL_TIPO, TIPOS_DE_LOCAL, type TipoDeLocal } from '@estook/dominio';
import { clases } from '@estook/ui';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 2 · «¿Qué tipo de local tienes?» (M5).
 *
 * «Bar de tapas · Restaurante de carta · Cafetería · Obrador · Food truck ·
 *  Otro. **Determina la plantilla de APPCC, las categorías de producto, los
 *  objetivos de margen y qué apps vienen encendidas**» (Manifiesto 8).
 *
 * De esas cuatro, hoy se aplica una: **los objetivos**. Las categorías nacen con
 * M6, el APPCC con M16 y las apps activables con M25. El dato se guarda ahora
 * para las cuatro, y cada módulo lo lee cuando llegue; el evento
 * `local.ficha_cambiada` está publicándose desde ya por eso mismo.
 *
 * ── Por qué son botones grandes y no un desplegable ──────────────────────────
 *
 * «Botones grandes» (Manifiesto 8), y son seis opciones: un desplegable con seis
 * cosas obliga a dos toques y a leer una lista que se tapa sola. Con seis
 * tarjetas se ve todo de golpe y se responde en dos segundos, que es lo que el
 * criterio de cuatro minutos necesita.
 */

/** Qué es cada uno, para quien duda entre dos. */
const COMO_ES: Readonly<Record<TipoDeLocal, string>> = {
  bar_de_tapas: 'Barra, raciones y mucho volumen de tickets pequeños',
  restaurante_de_carta: 'Mesas, carta y ticket medio alto',
  cafeteria: 'Desayunos, meriendas y cafés',
  obrador: 'Se produce para vender fuera o para otros locales',
  food_truck: 'Sobre ruedas, carta corta y sin almacén',
  otro: 'Ninguno de los anteriores encaja',
};

export function QueTipoDeLocal({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const [guardando, setGuardando] = useState<TipoDeLocal | null>(null);

  async function elegir(tipo: TipoDeLocal) {
    setGuardando(tipo);

    const respuesta = await cliente.ejecutar('guardar_tipo_de_local', { tipo });
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setGuardando(null);
      return;
    }

    // Elegir **es** responder: no hay botón de continuar. Un toque menos por
    // ocho pasos son ocho toques, y el alta entera son cuatro minutos.
    await alGuardar();
    setGuardando(null);
  }

  return (
    <div className="flex flex-col gap-e2">
      {TIPOS_DE_LOCAL.map((tipo) => {
        const elegido = alta.ficha.tipo === tipo;

        return (
          <button
            key={tipo}
            type="button"
            disabled={guardando !== null}
            onClick={() => {
              void elegir(tipo);
            }}
            aria-pressed={elegido}
            className={clases(
              'flex min-h-toque-cocina flex-col justify-center rounded-medio border px-e4 py-e3 text-left',
              'disabled:opacity-60',
              elegido
                ? 'border-naranja bg-naranja-suave'
                : 'border-borde-fuerte bg-superficie hover:bg-fondo',
            )}
          >
            <span className="text-cuerpo font-medium text-texto">{NOMBRE_DEL_TIPO[tipo]}</span>
            <span className="text-secundario text-texto-suave">{COMO_ES[tipo]}</span>
          </button>
        );
      })}
    </div>
  );
}
