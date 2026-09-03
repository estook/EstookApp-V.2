import { useState } from 'react';
import {
  ACTIVIDADES,
  CLAVES_DE_OBJETIVO,
  NOMBRE_DEL_OBJETIVO,
  QUE_ES_EL_OBJETIVO,
  REGIMEN_DEL_TERRITORIO,
  TERRITORIOS,
  type ClaveDeObjetivo,
  type Territorio,
} from '@estook/dominio';
import { Aviso, Boton, Campo, Selector } from '@estook/ui';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 6 · impuestos y objetivos (M5).
 *
 * ── El régimen no se elige: lo decide dónde estás ────────────────────────────
 *
 * «Península y Baleares con IVA, Canarias con IGIC, Ceuta y Melilla con IPSI»
 * (Manifiesto 9). No es una preferencia, lo dice la ley, así que la pregunta es
 * **dónde está el local** y el impuesto sale solo. La base de datos lo comprueba
 * otra vez con una restricción, para que no pueda quedar un local canario con
 * IVA por un descuido.
 *
 * ── Los objetivos son el dato más influyente del sistema ─────────────────────
 *
 * «Son los que ponen en verde o en rojo los semáforos de toda la aplicación»
 * (Manifiesto 9), y la Auditoría lo remata: «**este es el dato más silencioso y
 * más influyente del sistema. Un objetivo mal puesto tiñe de rojo o de verde una
 * aplicación entera**» (1.2).
 *
 * Por eso cada uno viene con su frase explicando qué es. Quien no entiende qué
 * está poniendo, lo pone mal, y no se entera hasta que media aplicación está en
 * rojo sin motivo.
 */

const NOMBRE_DEL_TERRITORIO: Readonly<Record<Territorio, string>> = {
  peninsula_y_baleares: 'Península o Baleares',
  canarias: 'Canarias',
  ceuta: 'Ceuta',
  melilla: 'Melilla',
};

const NOMBRE_DEL_REGIMEN: Readonly<Record<string, string>> = {
  iva: 'IVA',
  igic: 'IGIC',
  ipsi: 'IPSI',
};

const NOMBRE_DE_LA_ACTIVIDAD: Readonly<Record<string, string>> = {
  restaurante_un_tenedor: 'Restaurante de un tenedor',
  restaurante_dos_o_mas_tenedores: 'Restaurante de dos tenedores o más',
  cafe_o_bar_categoria_especial: 'Café o bar de categoría especial',
  demas_cafes_y_bares: 'Los demás cafés y bares',
  demas_hosteleria: 'Otra hostelería',
};

export function FiscalYObjetivos({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const [territorio, setTerritorio] = useState<Territorio>(alta.ficha.territorio as Territorio);
  const [actividad, setActividad] = useState(alta.ficha.actividad ?? '');
  const [enviando, setEnviando] = useState(false);

  // Los que ya tiene, y si no, los que le tocan por su tipo de local. Se enseñan
  // en porcentaje aunque por dentro sean fracción: nadie piensa en 0,28.
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicio: Record<string, string> = {};
    for (const clave of CLAVES_DE_OBJETIVO) {
      const suyo = alta.objetivos.find((o) => o.clave === clave);
      const propuesto = alta.dePartida.find((o) => o.clave === clave);
      const valor = suyo?.valor ?? propuesto?.valor ?? 0.3;
      // De fraccion a porcentaje para ensenarlo: 0,28 da «28». Con `toFixed` y
      // no con `Math.round`, para no rozar la regla 9 en una pantalla.
      inicio[clave] = String(Number((valor * 100).toFixed(2)));
    }
    return inicio;
  });

  const regimen = REGIMEN_DEL_TERRITORIO[territorio];
  const hacenFaltaTenedores = territorio === 'ceuta' || territorio === 'melilla';
  const sonDePartida = alta.objetivos.length === 0 || alta.objetivos.every((o) => o.dePartida);

  const alguienMal = CLAVES_DE_OBJETIVO.some((clave) => {
    const numero = Number((valores[clave] ?? '').replace(',', '.'));
    return !Number.isFinite(numero) || numero < 0 || numero > 100;
  });

  async function continuar() {
    if (alguienMal) return;
    if (hacenFaltaTenedores && actividad === '') return;

    setEnviando(true);

    const fiscal = await cliente.ejecutar('guardar_regimen_fiscal', {
      territorio,
      actividad: actividad === '' ? null : actividad,
    });
    if (!fiscal.ok) {
      alFallar(fiscal.error);
      setEnviando(false);
      return;
    }

    const objetivos = await cliente.ejecutar('poner_objetivos', {
      objetivos: CLAVES_DE_OBJETIVO.map((clave) => ({
        clave,
        // De porcentaje a fracción, **en un solo sitio**: si esto se hiciera en
        // dos, un día alguien guardaría 28 en vez de 0,28 y toda la aplicación
        // se pondría en rojo.
        valor: Number((valores[clave] ?? '0').replace(',', '.')) / 100,
      })),
    });
    if (!objetivos.ok) {
      alFallar(objetivos.error);
      setEnviando(false);
      return;
    }

    await alGuardar();
    setEnviando(false);
  }

  return (
    <div className="flex flex-col gap-e5">
      <div className="flex flex-col gap-e3">
        <Selector
          etiqueta="¿Dónde está el local?"
          value={territorio}
          onChange={(evento) => {
            setTerritorio(evento.target.value as Territorio);
          }}
          opciones={TERRITORIOS.map((t) => ({ valor: t, texto: NOMBRE_DEL_TERRITORIO[t] }))}
          ayuda={`Con esto se aplica ${NOMBRE_DEL_REGIMEN[regimen] ?? regimen}. No se elige: lo dice la ley.`}
          obligatorio
        />

        {hacenFaltaTenedores && (
          <Selector
            etiqueta="Categoría del establecimiento"
            value={actividad}
            onChange={(evento) => {
              setActividad(evento.target.value);
            }}
            opciones={ACTIVIDADES.map((a) => ({
              valor: a,
              texto: NOMBRE_DE_LA_ACTIVIDAD[a] ?? a,
            }))}
            sinElegir="Elige una"
            ayuda="En Ceuta y en Melilla el tipo depende de la categoría, así que hace falta."
            obligatorio
          />
        )}
      </div>

      <div className="flex flex-col gap-e3">
        <div>
          <h2 className="text-cuerpo font-semibold">Tus objetivos</h2>
          <p className="text-secundario text-texto-suave">
            {sonDePartida
              ? 'Estos te los proponemos por tu tipo de local. Cámbialos si sabes los tuyos.'
              : 'Los que tienes puestos. Cambiarlos no repinta los informes de antes.'}
          </p>
        </div>

        {CLAVES_DE_OBJETIVO.map((clave: ClaveDeObjetivo) => (
          <Campo
            key={clave}
            etiqueta={NOMBRE_DEL_OBJETIVO[clave]}
            name={`objetivo-${clave}`}
            inputMode="decimal"
            detras="%"
            value={valores[clave] ?? ''}
            onChange={(evento) => {
              setValores((antes) => ({ ...antes, [clave]: evento.target.value }));
            }}
            ayuda={QUE_ES_EL_OBJETIVO[clave]}
          />
        ))}
      </div>

      {alguienMal && (
        <Aviso tono="atencion" titulo="Algún objetivo se sale">
          Son porcentajes: van de 0 a 100.
        </Aviso>
      )}

      <Boton
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        disabled={alguienMal || (hacenFaltaTenedores && actividad === '')}
        onClick={() => {
          void continuar();
        }}
      >
        Continuar
      </Boton>
    </div>
  );
}
