import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Boton, Botones, Campo, ErrorEnCristiano, Hoja, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { guardarLaLlave, leerLaLlave, RUTA_DEL_APARATO } from '../aparato/llaveDelAparato.ts';

/**
 * El aparato del local para fichar, en Ajustes → Tu local (H1 · decisión 0068).
 *
 * Una tablet o el ordenador del local que se queda en la pantalla de fichar. Cada
 * uno teclea **su PIN** y ficha: es lo que deja fichar a quien no tiene correo, que
 * no puede entrar desde un móvil suyo (0057).
 *
 * **Se pone desde el propio aparato**: la llave se queda guardada en él. Y al abrir
 * la pantalla de fichar **se cierra la sesión de quien lo puso**, porque la tablet
 * se queda en el local y la toca todo el mundo: con tu sesión dentro, cualquiera
 * abriría la app con tus permisos.
 */

interface Aparato {
  readonly terminalId: string;
  readonly nombre: string;
  readonly puestoEn: string;
  readonly puestoPor: string | null;
  readonly ultimoUsoEn: string | null;
}

export function ElAparatoParaFichar() {
  const { cliente, salir } = usarSesion();
  const cache = useQueryClient();
  const [poniendo, setPoniendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [esteEs, setEsteEs] = useState(() => leerLaLlave());

  const lista = useQuery({
    queryKey: ['aparatos_para_fichar'],
    queryFn: async (): Promise<readonly Aparato[]> => {
      const respuesta = await cliente.consultar<readonly Aparato[]>('aparatos_para_fichar');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function quitar(aparato: Aparato) {
    setError(null);
    const respuesta = await cliente.ejecutar('quitar_aparato_para_fichar', {
      terminal_id: aparato.terminalId,
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['aparatos_para_fichar'] });
  }

  async function abrirLaPantalla() {
    // Primero se cierra la sesión de quien lo ha puesto, después se va a fichar.
    await salir();
    window.location.hash = RUTA_DEL_APARATO;
    window.location.reload();
  }

  return (
    <Tarjeta titulo="El aparato para fichar">
      <div className="flex flex-col gap-e3">
        <p className="text-cuerpo">
          Una tablet o el ordenador del local, en una pantalla con un teclado: cada uno teclea su
          PIN y ficha la entrada, la pausa y la salida. Así fichan también quienes no tienen correo.
        </p>

        {error !== null && <ErrorEnCristiano error={error} />}

        {esteEs !== null && (
          <Aviso
            tono="bien"
            titulo={`Este aparato es «${esteEs.nombre}»`}
            accion={
              <Boton
                tono="principal"
                onClick={() => {
                  void abrirLaPantalla();
                }}
              >
                Abrir la pantalla de fichar
              </Boton>
            }
          >
            Al abrirla se cierra tu sesión en este aparato, para que nadie entre con la tuya.
          </Aviso>
        )}

        {lista.data !== undefined && lista.data.length > 0 && (
          <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde">
            {lista.data.map((aparato) => (
              <li
                key={aparato.terminalId}
                className="flex flex-wrap items-center justify-between gap-e2 px-e3 py-e2"
              >
                <span className="min-w-0">
                  <span className="block text-cuerpo font-medium">{aparato.nombre}</span>
                  <span className="block text-secundario text-texto-suave">
                    {aparato.ultimoUsoEn === null
                      ? 'Todavía no ha fichado nadie en él'
                      : `Último fichaje: ${new Date(aparato.ultimoUsoEn).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                  </span>
                </span>
                <Boton
                  tono="texto"
                  onClick={() => {
                    void quitar(aparato);
                  }}
                >
                  Quitarlo
                </Boton>
              </li>
            ))}
          </ul>
        )}

        {esteEs === null && (
          <div>
            <Boton
              tono="secundario"
              onClick={() => {
                setPoniendo(true);
              }}
            >
              Usar este aparato para fichar
            </Boton>
          </div>
        )}

        <p className="text-secundario text-texto-suave">
          Quitar uno lo deja sin valer al momento, esté donde esté. En el aparato del local no se
          pide la ubicación: está en el local.
        </p>
      </div>

      {poniendo && (
        <PonerEsteAparato
          alCerrar={() => {
            setPoniendo(false);
          }}
          alHecho={(puesto) => {
            guardarLaLlave(puesto);
            setEsteEs(puesto);
            setPoniendo(false);
            void cache.invalidateQueries({ queryKey: ['aparatos_para_fichar'] });
          }}
          alFallar={(fallo) => {
            setError(fallo);
            setPoniendo(false);
          }}
        />
      )}
    </Tarjeta>
  );
}

function PonerEsteAparato({
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly alCerrar: () => void;
  readonly alHecho: (puesto: { llave: string; nombre: string }) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [nombre, setNombre] = useState('Tablet de la entrada');
  const [guardando, setGuardando] = useState(false);

  async function poner() {
    setGuardando(true);
    const respuesta = await cliente.ejecutar<{ llave: string; nombre: string }>(
      'poner_aparato_para_fichar',
      { nombre: nombre.trim() },
    );
    setGuardando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }
    alHecho({ llave: respuesta.datos.llave, nombre: respuesta.datos.nombre });
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Usar este aparato para fichar"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={nombre.trim() === '' || guardando}
            cargando={guardando}
            textoCargando="Poniéndolo"
            onClick={() => {
              void poner();
            }}
          >
            Ponerlo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <Campo
          etiqueta="Cómo se llama"
          ayuda="Para reconocerlo en la lista y en los fichajes: «Tablet de la entrada», «Ordenador de la barra»."
          value={nombre}
          onChange={(e) => {
            setNombre(e.currentTarget.value);
          }}
        />
        <p className="text-secundario text-texto-suave">
          Se queda guardado en este aparato. Hazlo desde la tablet o el ordenador que se va a quedar
          en el local.
        </p>
      </div>
    </Hoja>
  );
}
