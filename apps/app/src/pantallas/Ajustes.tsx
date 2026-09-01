import { IconoAccesibilidad, IconoPersona, IconoTamanoDeLetra } from '@estook/iconos';
import {
  Boton,
  COMO_SE_LLAMA,
  CUANTO_MULTIPLICA,
  Selector,
  TAMANOS,
  Tarjeta,
  clases,
  usarDeshacer,
  usarTamanoDeLetra,
  type TamanoDeLetra,
} from '@estook/ui';
import { PERFILES_DE_MUESTRA } from '../sesion/perfiles.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes (M3).
 *
 * Aqui viven las dos cosas de M3 que se ajustan de verdad, y las dos se pueden
 * deshacer: son dos de los tres flujos que pide el criterio de terminado.
 *
 *   · **El tamano de letra** (B2). Cambia la pantalla entera al momento.
 *   · **El perfil de muestra**, que es andamio hasta M4, y con el cambia la
 *     rueda: es la forma de ver hoy que un camarero tiene cuatro sectores y un
 *     gerente ocho.
 *
 * El tercero esta en el Panel.
 */
export function Ajustes() {
  const { tamano, poner } = usarTamanoDeLetra();
  const { perfil, cambiarDePerfil, deDonde } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();

  const cambiarTamano = (nuevo: TamanoDeLetra) => {
    const antes = tamano;
    poner(nuevo);
    if (antes === nuevo) return;

    sePuedeDeshacer({
      que: `Letra ${COMO_SE_LLAMA[nuevo].toLowerCase()}`,
      deshacer: () => {
        poner(antes);
      },
    });
  };

  return (
    <div className="flex max-w-[44rem] flex-col gap-e4">
      <h1 className="text-pantalla font-semibold">Ajustes</h1>

      <Tarjeta titulo="Tamano de letra">
        {/* El ancla del buscador: «cambiar el tamano de letra» lleva aqui. */}
        <span id="tamano-de-letra" />
        <p className="text-secundario text-texto-suave">
          El pase de cocina se lee de lejos. Esto crece toda la aplicacion a la vez, no solo esta
          pantalla, y se queda guardado en este aparato.
        </p>

        <div role="radiogroup" aria-label="Tamano de letra" className="mt-e3 flex flex-wrap gap-e2">
          {TAMANOS.map((cual) => (
            <button
              key={cual}
              type="button"
              role="radio"
              aria-checked={cual === tamano}
              onClick={() => {
                cambiarTamano(cual);
              }}
              className={clases(
                'inline-flex min-h-toque items-center gap-e2 rounded-medio border px-e4',
                cual === tamano
                  ? 'border-naranja bg-naranja-suave text-texto'
                  : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
              )}
            >
              <IconoTamanoDeLetra size={18} />
              <span style={{ fontSize: `${15 * CUANTO_MULTIPLICA[cual]}px` }}>
                {COMO_SE_LLAMA[cual]}
              </span>
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Accesibilidad">
        <ul className="flex flex-col gap-e2 text-secundario text-texto-suave">
          <li className="flex items-start gap-e2">
            <IconoAccesibilidad size={18} className="mt-[2px] shrink-0" />
            <span>
              Estook respeta «reducir movimiento» del sistema: con esa opcion puesta, nada se
              desplaza y <strong>la rueda de apps se convierte en una rejilla</strong> con la misma
              informacion. No hay que activar nada aqui.
            </span>
          </li>
          <li className="flex items-start gap-e2">
            <IconoAccesibilidad size={18} className="mt-[2px] shrink-0" />
            <span>
              Toda la aplicacion se maneja con teclado, y el foco se ve siempre con un anillo
              naranja.
            </span>
          </li>
        </ul>
      </Tarjeta>

      {deDonde === 'muestra' && (
        <Tarjeta titulo="Perfil de muestra" origen="Andamio de M3 · lo sustituye el login de M4">
          <p className="text-secundario text-texto-suave">
            Todavia no hay forma de entrar, asi que los permisos salen de estos seis perfiles,
            copiados de las semillas de verdad. Cambia de perfil y mira la rueda: las apps que el
            rol no tiene <strong>no aparecen</strong>, y los sectores se reparten entre las que
            quedan.
          </p>

          <div className="mt-e3 flex flex-col gap-e3">
            <Selector
              etiqueta="Quien mira"
              value={perfil.id}
              opciones={PERFILES_DE_MUESTRA.map((p) => ({
                valor: p.id,
                texto: `${p.nombre} · ${p.rol} · ${p.donde}`,
              }))}
              onChange={(evento) => {
                const antes = perfil.id;
                cambiarDePerfil(evento.target.value);
                sePuedeDeshacer({
                  que: `Ahora miras como ${
                    PERFILES_DE_MUESTRA.find((p) => p.id === evento.target.value)?.nombre ?? ''
                  }`,
                  deshacer: () => {
                    cambiarDePerfil(antes);
                  },
                });
              }}
            />

            <p className="flex items-center gap-e2 text-secundario text-texto-suave">
              <IconoPersona size={18} />
              Ahora mismo: {perfil.nombre}, {perfil.rol.toLowerCase()} en {perfil.donde}.
            </p>
          </div>
        </Tarjeta>
      )}

      <Tarjeta titulo="Idioma" origen="Se conecta con M4">
        <p className="text-secundario text-texto-suave">
          El idioma se elige <strong>por persona, no por local</strong>: en la misma cocina puede
          haber quien lo quiera en castellano y quien lo quiera en ingles. El comando ya existe
          desde M2; para cambiarlo hace falta haber entrado, y eso llega con M4.
        </p>
        <div className="mt-e3">
          <Boton disabled>Cambiar mi idioma</Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
