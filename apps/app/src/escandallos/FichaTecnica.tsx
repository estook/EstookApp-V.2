import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso, Boton, Cargando, ErrorEnCristiano, PanelLateral } from '@estook/ui';
import { IconoCamara, IconoEditar, IconoEscandallos, IconoQuitar } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { reducirFoto } from '../almacen/reducirFoto.ts';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { EditorDeLaReceta } from './EditorDeLaReceta.tsx';
import { Cabecera, LoQueLleva } from './ElEscandalloDelPlato.tsx';
import type { UnaFicha } from './contrato.ts';

/** Cuando el teléfono no sabe abrir la foto. */
const NO_SE_HA_PODIDO_LEER: ErrorDeLaApi = {
  codigo: 'faltan_datos',
  quePasa: 'No hemos podido leer esa foto.',
  queSePuedeHacer: 'Prueba a hacerla otra vez, o elige otra.',
  boton: null,
};

/**
 * La ficha técnica de un plato (el repaso del 16-oct, decisión 0090).
 *
 * Richi: «la ficha técnica no es un escandallo: coge un plato de la carta y los datos
 * ya hechos del escandallo, y dice paso a paso, con posibilidad de foto, cómo se hacen
 * las cosas, para que los nuevos aprendan». Así que aquí:
 *
 *   · **Lo que lleva no se escribe**: sale del escandallo, en gramos y sin un euro. Si
 *     hay que cambiarlo, se cambia allí y aquí se ve igual.
 *   · **Los pasos**, en orden, cada uno con su foto si se quiere. La foto se pone en el
 *     paso ya guardado, desde el propio paso: se toca «Foto» y se hace con el móvil.
 *   · El tiempo, las notas de emplatado y **el PDF**, para imprimirla.
 *
 * La lee toda la cocina y la sala; la escribe quien puede editar Escandallos.
 */
export function FichaTecnica({
  platoId,
  alCerrar,
}: {
  readonly platoId: string;
  readonly alCerrar: () => void;
}) {
  const consulta = usarLectura<UnaFicha>('una_ficha', { plato_id: platoId });
  const navegar = useNavigate();
  const [editando, setEditando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Ficha técnica">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir esta ficha técnica">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="la ficha técnica" lineas={5} />
        )}
      </PanelLateral>
    );
  }

  const alEscandallo = () => {
    navegar(`/escandallos/escandallos/todos?ficha=plato.${datos.id}`);
  };
  const sinEscandallo = datos.receta.lineas.length === 0;
  const pasos = datos.receta.pasos;

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={datos.nombre}>
      <div className="flex flex-col gap-e4 pt-e3">
        {hecho !== null && (
          <p aria-live="polite" className="text-secundario font-semibold text-bien">
            {hecho}
          </p>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}

        <Cabecera datos={datos} />

        {sinEscandallo ? (
          <div className="flex flex-col items-start gap-e3 rounded-grande bg-fondo p-e4">
            <p className="text-cuerpo font-semibold">Primero, su escandallo</p>
            <p className="text-secundario text-texto-suave">
              La ficha técnica coge del escandallo lo que lleva el plato. Desgránalo allí y vuelve.
            </p>
            <Boton tono="principal" icono={<IconoEscandallos size={18} />} onClick={alEscandallo}>
              Ir al escandallo
            </Boton>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-e1">
              <LoQueLleva datos={datos} />
              <p className="text-etiqueta text-texto-tenue">
                Sale del escandallo.{' '}
                {datos.puedeEditar && (
                  <button
                    type="button"
                    onClick={alEscandallo}
                    className="font-semibold text-texto-suave underline decoration-borde-fuerte underline-offset-4 hover:text-texto"
                  >
                    Cambiarlo allí
                  </button>
                )}
              </p>
            </div>

            <section aria-label="Cómo se hace" className="flex flex-col gap-e3">
              <h3 className="text-secundario font-semibold text-texto-suave">
                Cómo se hace
                {datos.receta.minutos === null ? '' : ` · ${String(datos.receta.minutos)} min`}
              </h3>
              {pasos.length === 0 ? (
                <div className="flex flex-col items-start gap-e3 rounded-grande bg-fondo p-e4">
                  <p className="text-secundario text-texto-suave">
                    {datos.puedeEditar
                      ? 'Escribe los pasos, uno a uno, como se lo explicarías a alguien nuevo. Después, ponle una foto a cada uno.'
                      : 'Todavía sin pasos. Los escribe quien lleva la cocina.'}
                  </p>
                  {datos.puedeEditar && (
                    <Boton
                      tono="principal"
                      icono={<IconoEditar size={18} />}
                      onClick={() => {
                        setEditando(true);
                      }}
                    >
                      Escribir los pasos
                    </Boton>
                  )}
                </div>
              ) : (
                <ol className="flex flex-col gap-e4">
                  {pasos.map((paso, i) => (
                    <Paso
                      key={`${String(i)}-${paso}`}
                      numero={i + 1}
                      texto={paso}
                      foto={datos.receta.fotosDeLosPasos?.[i] ?? null}
                      platoId={datos.id}
                      puedeTocar={datos.puedeEditar && datos.receta.fotosDeLosPasos !== undefined}
                      alHecho={(frase) => {
                        setError(null);
                        setHecho(frase);
                      }}
                      alFallar={(fallo) => {
                        setHecho(null);
                        setError(fallo);
                      }}
                    />
                  ))}
                </ol>
              )}
            </section>

            {datos.receta.notas !== null && (
              <section aria-label="Notas" className="flex flex-col gap-e1">
                <h3 className="text-secundario font-semibold text-texto-suave">Notas</h3>
                <p className="text-cuerpo whitespace-pre-line">{datos.receta.notas}</p>
              </section>
            )}

            <div className="flex flex-wrap gap-e2">
              {datos.puedeEditar && pasos.length > 0 && (
                <Boton
                  tono="principal"
                  icono={<IconoEditar size={18} />}
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Editar los pasos
                </Boton>
              )}
              <BotonDelDocumento
                consulta={'la_ficha_en_pdf'}
                parametros={{ plato_id: datos.id }}
                texto="PDF"
                tono="secundario"
              />
            </div>
          </>
        )}
      </div>

      {editando && (
        <EditorDeLaReceta
          datos={datos}
          que="pasos"
          alCerrar={() => {
            setEditando(false);
          }}
          alGuardar={(frase) => {
            setEditando(false);
            setHecho(frase);
          }}
        />
      )}
    </PanelLateral>
  );
}

/**
 * Un paso: su número, lo que se hace y su foto. Quien puede editar pone, cambia o
 * quita la foto aquí mismo: en el móvil, «Foto» abre la cámara o la galería.
 */
function Paso({
  numero,
  texto,
  foto,
  platoId,
  puedeTocar,
  alHecho,
  alFallar,
}: {
  readonly numero: number;
  readonly texto: string;
  readonly foto: string | null;
  readonly platoId: string;
  readonly puedeTocar: boolean;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const elFichero = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState<'subiendo' | 'quitando' | null>(null);

  async function subir(fichero: File) {
    setTrabajando('subiendo');
    try {
      const reducida = await reducirFoto(fichero);
      const respuesta = await cliente.ejecutar('poner_foto_del_paso', {
        plato_id: platoId,
        paso: numero - 1,
        tipo: reducida.tipo,
        foto: reducida.foto,
      });
      if (!respuesta.ok) alFallar(respuesta.error);
      else {
        await refrescar();
        alHecho(`Foto puesta en el paso ${String(numero)}`);
      }
    } catch {
      alFallar(NO_SE_HA_PODIDO_LEER);
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar() {
    setTrabajando('quitando');
    const respuesta = await cliente.ejecutar('quitar_foto_del_paso', {
      plato_id: platoId,
      paso: numero - 1,
    });
    setTrabajando(null);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(`Foto quitada del paso ${String(numero)}`);
  }

  return (
    <li className="flex gap-e3">
      <span className="grid size-[28px] shrink-0 place-items-center rounded-redondo bg-texto text-etiqueta font-bold text-superficie">
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-e2 pt-[3px]">
        <p className="text-cuerpo">{texto}</p>
        {foto !== null && (
          <img
            src={foto}
            alt={`Paso ${String(numero)}`}
            className="max-h-[260px] w-full rounded-grande bg-fondo object-cover"
          />
        )}
        {puedeTocar && (
          <div className="-ml-e2 flex flex-wrap gap-e1">
            <input
              ref={elFichero}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const fichero = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (fichero !== undefined) void subir(fichero);
              }}
            />
            <Boton
              tono="texto"
              tamano="s"
              icono={<IconoCamara size={16} />}
              cargando={trabajando === 'subiendo'}
              textoCargando="Subiendo"
              aria-label={`${foto === null ? 'Poner una foto en' : 'Cambiar la foto de'} el paso ${String(numero)}`}
              onClick={() => {
                elFichero.current?.click();
              }}
            >
              {foto === null ? 'Foto' : 'Cambiar foto'}
            </Boton>
            {foto !== null && (
              <Boton
                tono="texto"
                tamano="s"
                icono={<IconoQuitar size={16} />}
                cargando={trabajando === 'quitando'}
                textoCargando="Quitando"
                aria-label={`Quitar la foto del paso ${String(numero)}`}
                onClick={() => {
                  void quitar();
                }}
              >
                Quitar
              </Boton>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
