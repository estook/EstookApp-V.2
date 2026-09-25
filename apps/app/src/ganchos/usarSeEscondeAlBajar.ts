import { useEffect, useState } from 'react';

/**
 * Si un botón flotante se aparta porque se está bajando por la pantalla.
 *
 * Es lo que hacen el botón de redactar de Gmail o el «+» de Google Keep: al bajar
 * leyendo, estorba —en el móvil de Richi tapaba el «Editar» del Panel y la esquina
 * de los widgets—; al subir, que es cuando se busca, vuelve. Arriba del todo está
 * siempre. Lo pidió Richi el 25-sep, **solo en el móvil**: en una pantalla grande
 * el «+» va en su esquina sin tapar nada, y eso lo decide quien pinta (`max-lg:`).
 *
 * Unos píxeles de margen (`UMBRAL`) para que el temblor del dedo al parar no lo
 * haga parpadear, y un fotograma por vuelta: el desplazamiento dispara muchos
 * eventos, y aquí basta con uno por pintura.
 */
const UMBRAL = 8;
const SIEMPRE_ARRIBA = 64;

export function usarSeEscondeAlBajar(): boolean {
  const [escondido, setEscondido] = useState(false);

  useEffect(() => {
    let antes = window.scrollY;
    let pendiente = false;

    const mirar = () => {
      pendiente = false;
      const ahora = window.scrollY;
      if (ahora <= SIEMPRE_ARRIBA) {
        setEscondido(false);
      } else if (ahora - antes > UMBRAL) {
        setEscondido(true);
      } else if (antes - ahora > UMBRAL) {
        setEscondido(false);
      } else {
        return; // Ni sube ni baja lo bastante: se espera a que se mueva más.
      }
      antes = ahora;
    };

    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(mirar);
    };

    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => {
      window.removeEventListener('scroll', alDesplazar);
    };
  }, []);

  return escondido;
}
