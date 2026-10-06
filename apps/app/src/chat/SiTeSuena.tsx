import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { estaEnSilencio } from '@estook/dominio';
import { IconoSilenciado } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DE_MI_MOVIL, usarMiMovil } from '../ganchos/usarMiMovil.ts';
import {
  comoEstaEsteMovil,
  recibirEnEsteMovil,
  type ComoEstaElMovil,
} from '../sinConexion/avisosAlMovil.ts';
import { esUnMovil } from '../sinConexion/instalar.ts';

/**
 * Si el móvil te avisa del chat, y si ahora no, por qué (repaso de C1, 6-oct).
 *
 * «Avisar en el móvil si te llegan mensajes; por ahora no me avisa, creo.» Sí avisaba:
 * a Richi le pillaron sus horas de silencio (de 23:00 a 08:00) y a Santiago, fuera de
 * su turno. Es lo que eligió cada uno en Ajustes → Avisos (0070), y fuera del turno no
 * puede sonar si no se quiere, que es la ley de la desconexión (0066). Pero desde el
 * chat no se veía. Ahora, una línea arriba de la lista, solo cuando hace falta:
 *
 *   · **Este móvil no te avisa** → «Avisarme», o «Cómo» si hay que hacerlo en Ajustes.
 *   · **Solo te suena en tu turno**, o **hasta las 08:00 no te suena** → «Cambiar».
 *   · Si suena ya, nada: lo normal no se anuncia.
 */
export function SiTeSuena() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const miMovil = usarMiMovil();
  const [como, setComo] = useState<ComoEstaElMovil | null>(null);
  const [preguntando, setPreguntando] = useState(false);
  const datos = miMovil.data;

  useEffect(() => {
    if (datos === undefined) return;
    let vale = true;
    void comoEstaEsteMovil(datos.encendido).then((c) => {
      if (vale) setComo(c);
    });
    return () => {
      vale = false;
    };
  }, [datos]);

  if (!esUnMovil() || datos === undefined || como === null) return null;
  if (como === 'no_se_puede' || como === 'apagado_en_estook') return null;

  const fila = 'flex items-center gap-e2 border-b border-borde px-e3 py-e2 text-secundario';
  const enlace = 'shrink-0 font-medium text-naranja underline-offset-2 hover:underline';

  if (como !== 'activo') {
    return (
      <p className={fila}>
        <span className="shrink-0 text-texto-tenue">
          <IconoSilenciado size={16} />
        </span>
        <span className="min-w-0 flex-1 text-texto-suave">Este móvil no te avisa del chat.</span>
        {como === 'sin_activar' && datos.clavePublica !== null ? (
          <button
            type="button"
            disabled={preguntando}
            className={enlace}
            onClick={() => {
              const clave = datos.clavePublica;
              if (clave === null) return;
              setPreguntando(true);
              void recibirEnEsteMovil(cliente, clave).finally(() => {
                setPreguntando(false);
                void cache.invalidateQueries({ queryKey: CLAVE_DE_MI_MOVIL });
              });
            }}
          >
            Avisarme
          </button>
        ) : (
          <Link to="/ajustes/avisos" className={enlace}>
            Cómo
          </Link>
        )}
      </p>
    );
  }

  const { modo, desde, hasta } = datos.cuandoSuena;
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const frase =
    modo === 'en_mi_turno'
      ? 'Solo te suena en tu turno.'
      : estaEnSilencio(new Date(Date.now()), desde, hasta, zona)
        ? `Hasta las ${hasta} no te suena: son tus horas de silencio.`
        : null;
  if (frase === null) return null;

  return (
    <p className={fila}>
      <span className="shrink-0 text-texto-tenue">
        <IconoSilenciado size={16} />
      </span>
      <span className="min-w-0 flex-1 text-texto-suave">{frase}</span>
      <Link to="/ajustes/avisos" className={enlace}>
        Cambiar
      </Link>
    </p>
  );
}
