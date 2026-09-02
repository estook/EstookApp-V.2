import { IconoRejilla, IconoSalir, IconoTamanoDeLetra, IconoTeclado } from '@estook/iconos';
import {
  Boton,
  COMO_SE_LLAMA,
  CUANTO_MULTIPLICA,
  TAMANOS,
  Tarjeta,
  clases,
  usarDeshacer,
  usarTamanoDeLetra,
  type TamanoDeLetra,
} from '@estook/ui';
import { AjustesDeOrganizacion } from './AjustesDeOrganizacion.tsx';
import { MiAcceso } from './MiAcceso.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes (M3, con «Mi acceso» de M4).
 *
 * Aqui viven las cosas que se ajustan de verdad hoy:
 *
 *   · **El tamano de letra** (B2). Cambia la pantalla entera al momento, y se
 *     puede deshacer: es uno de los tres flujos del criterio de M3.
 *   · **Mi acceso** (M4): contrasena, PIN, doble factor y mis dispositivos.
 *   · **El acceso del negocio** (M4), a quien pueda tocarlo: exigir el segundo
 *     factor y el correo de recuperacion.
 *
 * Lo que ha desaparecido: el bloque «Perfil de muestra». Era el andamio de M3
 * para poder comprobar la rueda sin login, y M4 lo tira entero porque ya hay
 * login. No queda ni el fichero.
 */
export function Ajustes() {
  const { tamano, poner } = usarTamanoDeLetra();
  const { yo, salir } = usarSesion();
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

      <Tarjeta titulo="Tamaño de letra">
        {/* El ancla del buscador: «cambiar el tamano de letra» lleva aqui. */}
        <span id="tamano-de-letra" />
        <p className="text-secundario text-texto-suave">
          El pase de cocina se lee de lejos. Esto crece toda la aplicación a la vez, no solo esta
          pantalla, y se queda guardado en este aparato.
        </p>

        <div role="radiogroup" aria-label="Tamaño de letra" className="mt-e3 flex flex-wrap gap-e2">
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

      {/* ── M4 · Mi acceso, y lo que decide la organizacion ─────────────────── */}
      <MiAcceso />
      <AjustesDeOrganizacion />

      {/*
        Cada linea lleva el icono de lo que cuenta, y **ninguna lleva el simbolo
        de accesibilidad**. Antes lo llevaban las dos, y decia lo que no es: ese
        simbolo significa «esto es para personas con discapacidad», y esto no lo
        es. Reducir el movimiento lo agradece quien se marea, quien tiene
        migrana y quien simplemente lo prefiere; el teclado lo usa cualquiera que
        trabaje rapido. Y ademas no son opciones que se activen aqui: es como
        esta hecha la aplicacion.
      */}
      <Tarjeta titulo="Accesibilidad">
        <ul className="flex flex-col gap-e2 text-secundario text-texto-suave">
          <li className="flex items-start gap-e2">
            <IconoRejilla size={18} className="mt-[2px] shrink-0" aria-hidden />
            <span>
              Estook respeta «reducir movimiento» del sistema: con esa opción puesta, nada se
              desplaza y <strong>la rueda de apps se convierte en una rejilla</strong> con la misma
              información. No hay que activar nada aquí.
            </span>
          </li>
          <li className="flex items-start gap-e2">
            <IconoTeclado size={18} className="mt-[2px] shrink-0" aria-hidden />
            <span>
              Toda la aplicación se maneja con teclado, y el foco se ve siempre con un anillo
              naranja.
            </span>
          </li>
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Salir">
        <p className="text-secundario text-texto-suave">
          Cierra la sesión en <strong>este aparato</strong>. Las que tengas abiertas en otros sitios
          siguen como están; para cerrarlas, están arriba, en «Mi acceso».
        </p>
        <div className="mt-e3">
          <Boton
            icono={<IconoSalir size={18} />}
            onClick={() => {
              void salir();
            }}
          >
            Salir{yo ? `, ${yo.nombre}` : ''}
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
