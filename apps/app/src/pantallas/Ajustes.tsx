import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconoLuna,
  IconoSalir,
  IconoSol,
  IconoTamanoDeLetra,
  IconoUbicacion,
} from '@estook/iconos';
import { IDIOMAS, NOMBRE_DEL_IDIOMA } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  COMO_SE_LLAMA,
  COMO_SE_LLAMA_EL_TEMA,
  CUANTO_MULTIPLICA,
  Selector,
  TAMANOS,
  TEMAS,
  Tarjeta,
  clases,
  usarDeshacer,
  usarTamanoDeLetra,
  usarTema,
  type TamanoDeLetra,
  type Tema,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { TuMarca } from '../marca/TuMarca.tsx';
import { AjustesDeOrganizacion } from './AjustesDeOrganizacion.tsx';
import { MiAcceso } from './MiAcceso.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ComoEntranTusVentas } from '../servicio/ComoEntranTusVentas.tsx';
import { preguntarDondeEstoy } from '../ganchos/usarFichar.ts';
import type { MiFichaje } from '../equipo/contrato.ts';

/**
 * Ajustes.
 *
 * ── Menos texto, y es a propósito ───────────────────────────────────────────
 *
 * «En Ajustes pones: "Cómo se ve. Se queda guardado en este aparato, igual que el
 * tamaño de letra. En una cocina el claro se lee mejor de lejos; el oscuro es para
 * la oficina de noche." Solo pon "Elige tu tema" y las opciones.»
 *
 * Tenía razón, y no solo ahí: cada tarjeta de esta pantalla llevaba un párrafo que
 * explicaba por qué existía. Eso es para el código, no para quien lo usa. Ahora
 * cada tarjeta dice qué es y enseña las opciones, y la tarjeta de «Accesibilidad»
 * —que no tenía ni un control, solo explicaba cómo está hecha la aplicación— se ha
 * ido entera.
 *
 * ── Y dos tarjetas nuevas ───────────────────────────────────────────────────
 *
 *   · **Tus ventas**: a mano o con el TPV. Se elige en el Panel y se cambia aquí.
 *   · **Dónde está el local**: para que cada fichaje diga si se hizo en el local.
 */
export function Ajustes() {
  const { tamano, poner } = usarTamanoDeLetra();
  const { tema, poner: ponerTema } = usarTema();
  const { yo, salir, cliente, refrescar, permisos } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const [cambiandoIdioma, setCambiandoIdioma] = useState(false);

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

  const llevaElLocal = puedeEditar(permisos, 'app.ajustes') && yo?.local !== null;

  return (
    <div className="flex max-w-[44rem] flex-col gap-e4">
      <h1 className="text-pantalla font-semibold">Ajustes</h1>

      <Tarjeta titulo="Tamaño de letra">
        {/* El ancla del buscador: «cambiar el tamano de letra» lleva aqui. */}
        <span id="tamano-de-letra" />
        <div role="radiogroup" aria-label="Tamaño de letra" className="flex flex-wrap gap-e2">
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

      <Tarjeta titulo="Elige tu tema">
        {/* El ancla del buscador: «modo oscuro» lleva aquí. */}
        <span id="tema" />
        <div role="radiogroup" aria-label="Elige tu tema" className="flex flex-wrap gap-e2">
          {TEMAS.map((cual: Tema) => (
            <button
              key={cual}
              type="button"
              role="radio"
              aria-checked={cual === tema}
              onClick={() => {
                ponerTema(cual);
              }}
              className={clases(
                'inline-flex min-h-toque items-center gap-e2 rounded-medio border px-e4',
                cual === tema
                  ? 'border-naranja bg-naranja-suave text-texto'
                  : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
              )}
            >
              {cual === 'oscuro' ? <IconoLuna size={18} /> : <IconoSol size={18} />}
              {COMO_SE_LLAMA_EL_TEMA[cual]}
            </button>
          ))}
        </div>
      </Tarjeta>

      <TuMarca />

      {llevaElLocal && <ComoEntranTusVentas modo="ajustes" />}
      {llevaElLocal && <DondeEstaElLocal />}

      {/* El ancla de «tu cuenta»: «Mi acceso» de la hoja del avatar lleva aqui. */}
      <span id="mi-acceso" />
      <MiAcceso />
      <AjustesDeOrganizacion />

      <Tarjeta titulo="Idioma">
        <Selector
          etiqueta="Idioma"
          opciones={IDIOMAS.map((idioma) => ({
            valor: idioma,
            texto: NOMBRE_DEL_IDIOMA[idioma],
          }))}
          value={yo?.idioma ?? 'es'}
          disabled={cambiandoIdioma}
          onChange={(e) => {
            const nuevo = e.currentTarget.value;
            setCambiandoIdioma(true);
            void cliente.ejecutar('cambiar_mi_idioma', { idioma: nuevo }).then(async () => {
              setCambiandoIdioma(false);
              await refrescar();
            });
          }}
        />
      </Tarjeta>

      <div>
        <Boton
          icono={<IconoSalir size={18} />}
          onClick={() => {
            void salir();
          }}
        >
          Salir de este aparato{yo ? `, ${yo.nombre}` : ''}
        </Boton>
      </div>
    </div>
  );
}

/**
 * Dónde está el local · para que un fichaje diga si se hizo en el local.
 *
 * ── Por qué con un botón y no con la dirección ──────────────────────────────
 *
 * Porque pasar una dirección escrita a coordenadas es un servicio de fuera que hoy
 * no está contratado (Google Places se aplazó a M23, decisión 0013). Y porque sale
 * mejor: quien lo pone está **en el local**, y el móvil sabe dónde está con más
 * precisión que cualquier dirección.
 *
 * Sin esto, los fichajes guardan su posición igual y no se comparan con nada. Se
 * puede poner cualquier día sin perder lo de antes.
 */
function DondeEstaElLocal() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noLaDio, setNoLaDio] = useState(false);
  /** Con cuánta precisión se marcó la última vez, en metros. Solo en esta visita. */
  const [precision, setPrecision] = useState<number | null>(null);

  const consulta = useQuery({
    queryKey: ['mi_fichaje'],
    retry: 1,
    queryFn: async (): Promise<MiFichaje> => {
      const respuesta = await cliente.consultar<MiFichaje>('mi_fichaje');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const puesto = consulta.data?.elLocalSabeDondeEsta === true;
  const radio = consulta.data?.radioMetros ?? 100;

  async function guardar(cuerpo: Record<string, unknown>) {
    setError(null);
    const respuesta = await cliente.ejecutar('poner_donde_esta_el_local', cuerpo);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['mi_fichaje'] });
    await cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] });
  }

  async function aqui() {
    setNoLaDio(false);
    setPrecision(null);
    setBuscando(true);
    const donde = await preguntarDondeEstoy();
    setBuscando(false);
    if (!('donde' in donde)) {
      setNoLaDio(true);
      return;
    }
    setPrecision(donde.donde.precision ?? null);
    await guardar({
      latitud: donde.donde.latitud,
      longitud: donde.donde.longitud,
      radio_metros: radio,
    });
  }

  /**
   * Más de cien metros de error es marcar la manzana, no el local. Pasa en un
   * ordenador o un TPV, que no tienen GPS y se sitúan por la wifi o por la
   * conexión: se marca igual —algo es mejor que nada— y se dice cómo mejorarlo.
   */
  const pocoPreciso = precision !== null && precision > 100;

  if (consulta.isError) return null;

  return (
    <Tarjeta titulo="Dónde está el local">
      {/* El ancla del aviso de Equipo · Hoy: «marca dónde está el local». */}
      <span id="donde-esta-el-local" />
      <div className="flex flex-col gap-e3">
        {error !== null && (
          <Aviso tono="mal" titulo={error.quePasa}>
            {error.queSePuedeHacer}
          </Aviso>
        )}
        {noLaDio && (
          <Aviso tono="atencion" titulo="El móvil no ha dado la ubicación">
            Activa la ubicación y dale permiso a Estook, y vuelve a probar.
          </Aviso>
        )}

        {pocoPreciso && (
          <Aviso tono="atencion" titulo={`Marcado, pero con ±${precision} m de error`}>
            Este aparato se sitúa por la conexión, no por GPS. Márcalo desde un móvil, dentro del
            local y con la ubicación exacta activada.
          </Aviso>
        )}

        <p className="text-cuerpo">
          {puesto
            ? precision !== null && !pocoPreciso
              ? `Puesto, con ±${precision} m de error. Cada fichaje dice a cuántos metros del local se hizo.`
              : 'Puesto. Cada fichaje dice a cuántos metros del local se hizo.'
            : 'Sin poner. Hazlo desde el propio local.'}
        </p>

        <div className="flex flex-wrap items-end gap-e3">
          <Boton
            tono={puesto ? 'secundario' : 'principal'}
            icono={<IconoUbicacion size={18} />}
            cargando={buscando}
            textoCargando="Buscando dónde estás"
            onClick={() => {
              void aqui();
            }}
          >
            {puesto ? 'Volver a marcarlo desde aquí' : 'Estoy en el local: márcalo'}
          </Boton>

          {puesto && (
            <div className="min-w-[10rem]">
              <Selector
                etiqueta="Cuenta como en el local hasta"
                opciones={[
                  { valor: '50', texto: '50 m' },
                  { valor: '100', texto: '100 m' },
                  { valor: '200', texto: '200 m' },
                  { valor: '500', texto: '500 m' },
                ]}
                value={String(radio)}
                onChange={(e) => {
                  // Solo el radio: sin coordenadas en el cuerpo, el comando deja
                  // las que hay. Mandarlas a nulo las borraría.
                  void guardar({ radio_metros: Number(e.currentTarget.value) });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}
