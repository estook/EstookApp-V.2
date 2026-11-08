import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LETRAS_PARA_BUSCAR } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Campo, clases } from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarQueEspere } from '../ganchos/usarQueEspere.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * «Busca tu local» (la pausa del 8-nov, 0142): se escribe el nombre, se toca el tuyo y se
 * rellenan las casillas de debajo con lo de Google.
 *
 * Richi: «mejor que te diga qué local es directamente en el onboarding y se conecta con Google
 * y pilla su horario: para algo tenemos la API integrada». Es el mismo buscador de Ajustes ›
 * Tu local en Google (0040), con sus mismos topes; elegir **enlaza el local con su ficha**
 * (la nota y las reseñas, desde el primer día) y le pone su ubicación para fichar.
 *
 * **No guarda las casillas**: las rellena, y se guardan con el botón del formulario, como
 * siempre. Sin la clave de Google en el servidor, no sale: se escribe a mano como antes.
 */
export interface CasillasDeGoogle {
  readonly nombre: string | null;
  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provincia: string | null;
  readonly telefono: string | null;
  readonly horario: readonly string[] | null;
  readonly horaDeCorte: string;
}

interface Sugerencia {
  readonly id: string;
  readonly nombre: string;
  readonly direccion: string;
}

/** Una sesión de búsqueda: agrupa las letras con la ficha elegida, y Google la cobra una vez. */
function sesionNueva(): string {
  return crypto.randomUUID();
}

export function BuscarTuLocal({
  deEntrada,
  alEncontrar,
}: {
  /** Lo que se escribe al abrirlo: el nombre que ya tiene el local. */
  readonly deEntrada: string;
  readonly alEncontrar: (casillas: CasillasDeGoogle) => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const conectado = usarLectura<{ conectado: boolean }>('mi_local_en_google').data?.conectado;
  const [texto, setTexto] = useState(deEntrada);
  const esperado = usarQueEspere(texto.trim(), 450);
  const [sugerencias, setSugerencias] = useState<readonly Sugerencia[]>([]);
  const [pidiendo, setPidiendo] = useState(false);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const sesion = useRef(sesionNueva());

  // Buscar cuando se deja de escribir y con lo mínimo escrito; una respuesta vieja se tira.
  useEffect(() => {
    if (conectado !== true || esperado.length < LETRAS_PARA_BUSCAR) {
      setSugerencias([]);
      return;
    }
    let sigueValiendo = true;
    setPidiendo(true);
    void cliente
      .ejecutar<{ sugerencias: readonly Sugerencia[] }>('buscar_mi_local_en_google', {
        texto: esperado,
        sesion: sesion.current,
      })
      .then((respuesta) => {
        if (!sigueValiendo) return;
        setPidiendo(false);
        if (!respuesta.ok) {
          setError(respuesta.error);
          return;
        }
        setError(null);
        setSugerencias(respuesta.datos.sugerencias);
      });
    return () => {
      sigueValiendo = false;
    };
  }, [conectado, esperado, cliente]);

  async function elegir(sugerencia: Sugerencia) {
    setEligiendo(sugerencia.id);
    setError(null);
    const respuesta = await cliente.ejecutar<{ casillas: CasillasDeGoogle }>(
      'elegir_mi_local_de_google',
      { id: sugerencia.id, sesion: sesion.current, usar_su_posicion: true },
    );
    setEligiendo(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    // La sesión se cobra al pedir la ficha: la siguiente búsqueda es otra.
    sesion.current = sesionNueva();
    setSugerencias([]);
    await cache.invalidateQueries({ queryKey: ['mi_local_en_google'] });
    alEncontrar(respuesta.datos.casillas);
  }

  if (conectado !== true) return null;

  return (
    <div className="flex flex-col gap-e2">
      <Campo
        etiqueta="Busca tu local en Google"
        placeholder="Nombre del local y ciudad"
        value={texto}
        delante={<IconoBuscar size={16} />}
        {...(pidiendo ? { ayuda: 'Buscando en Google…' } : {})}
        onChange={(e) => {
          setTexto(e.currentTarget.value);
        }}
      />
      {error !== null && (
        <Aviso tono="mal" titulo={error.quePasa}>
          {error.queSePuedeHacer}
        </Aviso>
      )}
      {sugerencias.length > 0 && (
        <ul aria-label="Lo que ha encontrado Google" className="flex flex-col gap-e1">
          {sugerencias.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={eligiendo !== null}
                onClick={() => {
                  void elegir(s);
                }}
                className={clases(
                  'flex w-full min-h-toque items-center justify-between gap-e2 rounded-medio border px-e3 py-e2 text-left',
                  eligiendo === s.id
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde-fuerte bg-superficie hover:bg-fondo',
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-cuerpo font-medium">{s.nombre}</span>
                  <span className="text-etiqueta text-texto-suave">{s.direccion}</span>
                </span>
                <span className="shrink-0 text-secundario font-semibold text-texto">
                  {eligiendo === s.id ? 'Trayéndolo…' : 'Es este'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Para el alta y Ajustes: un botón que abre el buscador, si Google está conectado. */
export function BotonDeBuscarEnGoogle({ alPulsar }: { readonly alPulsar: () => void }) {
  const conectado = usarLectura<{ conectado: boolean }>('mi_local_en_google').data?.conectado;
  if (conectado !== true) return null;
  return (
    <Boton tono="secundario" icono={<IconoBuscar size={16} />} onClick={alPulsar}>
      Rellenar desde Google
    </Boton>
  );
}
