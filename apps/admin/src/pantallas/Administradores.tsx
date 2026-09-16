import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Tabla,
  Tarjeta,
} from '@estook/ui';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { fechaYHora } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Quién tiene acceso al admin, y quién lo tuvo (0041, entrega A1).
 *
 * «Ese ya dentro podrá añadir a admin a otros.» Dar y quitar el acceso piden el
 * código del segundo factor **otra vez**: la sesión dura ocho horas, y un portátil
 * abierto no puede bastar para dar las llaves de Estook a nadie.
 */

interface AccesoAlAdmin {
  readonly personaId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly nivel: 'total' | 'comercial' | 'soporte' | 'vendedor';
  readonly dadoEn: string;
  readonly dadoPor: string | null;
  readonly quitadoEn: string | null;
  readonly quitadoPor: string | null;
  readonly motivoDeQuitar: string | null;
  readonly soyYo: boolean;
}

const NOMBRE_DEL_NIVEL: Readonly<Record<AccesoAlAdmin['nivel'], string>> = {
  total: 'Total',
  comercial: 'Comercial',
  soporte: 'Soporte',
  vendedor: 'Vendedor',
};

export function Administradores() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [dando, setDando] = useState(false);
  const [quitando, setQuitando] = useState<AccesoAlAdmin | null>(null);

  const consulta = useQuery({
    queryKey: ['admin_administradores'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<readonly AccesoAlAdmin[]>('admin_administradores');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  async function alCambiar() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_administradores'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  }

  const puedeDar = yo?.nivel === 'total';
  const lista = consulta.data ?? [];
  const vivos = lista.filter((a) => a.quitadoEn === null);
  const quitados = lista.filter((a) => a.quitadoEn !== null);

  return (
    <div className="flex flex-col gap-e5">
      <div className="flex flex-wrap items-end justify-between gap-e3">
        <div className="min-w-0">
          <h1 className="text-pantalla font-semibold">Administradores</h1>
          <p className="text-secundario text-texto-suave">
            Quién puede entrar en el admin de Estook, desde cuándo y quién se lo dio.
          </p>
        </div>
        {puedeDar && (
          <Boton
            tono="principal"
            onClick={() => {
              setDando(true);
            }}
          >
            Dar acceso
          </Boton>
        )}
      </div>

      {consulta.isLoading ? (
        <Cargando que="Quién tiene acceso" lineas={3} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : (
        <>
          <Tarjeta titulo="Con acceso" origen={`${vivos.length} ahora mismo`}>
            <Tabla
              titulo="Con acceso al admin"
              filas={vivos}
              claveDe={(a) => a.personaId}
              nombreDeLaFila={(a) => a.nombre}
              cuandoNoHay={<p className="text-texto-suave">Nadie tiene acceso.</p>}
              columnas={[
                {
                  clave: 'persona',
                  titulo: 'Persona',
                  principal: true,
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {a.nombre}
                        {a.soyYo ? ' (tú)' : ''}
                      </span>
                      <span className="text-secundario text-texto-suave">{a.correo}</span>
                    </span>
                  ),
                },
                {
                  clave: 'nivel',
                  titulo: 'Nivel',
                  celda: (a) => <Etiqueta tono="marca">{NOMBRE_DEL_NIVEL[a.nivel]}</Etiqueta>,
                },
                {
                  clave: 'desde',
                  titulo: 'Desde',
                  celda: (a) => (
                    <span className="flex flex-col">
                      <span>{fechaYHora(a.dadoEn)}</span>
                      <span className="text-secundario text-texto-suave">
                        {a.dadoPor === null ? 'Desde la consola' : `Se lo dio ${a.dadoPor}`}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'quitar',
                  titulo: 'Acceso',
                  // Siempre dice algo: en el móvil la etiqueta «Acceso» se quedaba
                  // sola, sin nada al lado, en la fila de quien mira.
                  celda: (a) =>
                    a.soyYo ? (
                      <span className="text-secundario text-texto-suave">
                        El tuyo: te lo quita otro admin
                      </span>
                    ) : puedeDar ? (
                      <Boton
                        tono="texto"
                        onClick={() => {
                          setQuitando(a);
                        }}
                      >
                        Quitar el acceso
                      </Boton>
                    ) : (
                      <span className="text-secundario text-texto-suave">Solo un admin total</span>
                    ),
                },
              ]}
            />
          </Tarjeta>

          {quitados.length > 0 && (
            <Tarjeta titulo="Lo tuvieron" origen="Nada se borra: se queda como historia">
              <Tabla
                titulo="Accesos quitados"
                filas={quitados}
                claveDe={(a) => `${a.personaId}-${a.dadoEn}`}
                nombreDeLaFila={(a) => a.nombre}
                cuandoNoHay={null}
                columnas={[
                  {
                    clave: 'persona',
                    titulo: 'Persona',
                    principal: true,
                    celda: (a) => (
                      <span className="flex flex-col">
                        <span className="font-medium">{a.nombre}</span>
                        <span className="text-secundario text-texto-suave">{a.correo}</span>
                      </span>
                    ),
                  },
                  {
                    clave: 'cuando',
                    titulo: 'Tuvo acceso',
                    celda: (a) =>
                      `${fechaYHora(a.dadoEn)} → ${a.quitadoEn === null ? '' : fechaYHora(a.quitadoEn)}`,
                  },
                  {
                    clave: 'porque',
                    titulo: 'Se lo quitó',
                    celda: (a) => (
                      <span className="flex flex-col">
                        <span>{a.quitadoPor ?? '—'}</span>
                        <span className="text-secundario text-texto-suave">
                          {a.motivoDeQuitar ?? ''}
                        </span>
                      </span>
                    ),
                  },
                ]}
              />
            </Tarjeta>
          )}
        </>
      )}

      {dando && (
        <DarAcceso
          alCerrar={() => {
            setDando(false);
          }}
          alHecho={alCambiar}
        />
      )}
      {quitando !== null && (
        <QuitarAcceso
          acceso={quitando}
          alCerrar={() => {
            setQuitando(null);
          }}
          alHecho={alCambiar}
        />
      )}
    </div>
  );
}

// ── Dar acceso ───────────────────────────────────────────────────────────────

function DarAcceso({
  alCerrar,
  alHecho,
}: {
  readonly alCerrar: () => void;
  readonly alHecho: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState<{ correo: string; clave: string | null } | null>(null);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar<{ clave: string | null }>('admin_dar_acceso', {
      correo,
      nombre,
      nivel: 'total',
      codigo,
    });
    setEnviando(false);
    setCodigo('');

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    setHecho({ correo, clave: respuesta.datos.clave });
    await alHecho();
  }

  if (hecho) {
    return (
      <Hoja abierta titulo="Acceso dado" alCerrar={alCerrar}>
        <div className="flex flex-col gap-e4">
          {hecho.clave === null ? (
            <Aviso tono="bien" titulo={`${hecho.correo} ya puede entrar`}>
              Ya tenía cuenta en Estook, así que entra con su contraseña de siempre. La primera vez
              tendrá que montar el segundo factor si no lo tiene.
            </Aviso>
          ) : (
            <>
              <Aviso tono="atencion" titulo="Esta contraseña se enseña una sola vez">
                Dásela en mano o por un canal seguro, nunca por un chat. Al entrar tendrá que
                ponerse una suya y montar el segundo factor.
              </Aviso>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-e4 gap-y-e2">
                <dt className="text-texto-suave">Correo</dt>
                <dd className="break-all">{hecho.correo}</dd>
                <dt className="text-texto-suave">Contraseña</dt>
                <dd className="select-all font-mono">{hecho.clave}</dd>
              </dl>
            </>
          )}
          <Boton tono="principal" ancho onClick={alCerrar}>
            Hecho
          </Boton>
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja abierta titulo="Dar acceso al admin" alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <p className="text-secundario text-texto-suave">
          Con acceso total: puede verlo todo y dar o quitar el acceso a otros. Los demás niveles
          llegan con las entregas que les dan algo que hacer.
        </p>
        <Campo
          etiqueta="Su correo"
          tipo="correo"
          name="correo"
          value={correo}
          onChange={(evento) => {
            setCorreo(evento.target.value);
          }}
          ayuda="Si ya tiene cuenta en Estook, entra con la suya. Si no, se le crea con una contraseña de un solo uso."
          obligatorio
        />
        <Campo
          etiqueta="Su nombre"
          name="nombre"
          value={nombre}
          onChange={(evento) => {
            setNombre(evento.target.value);
          }}
          obligatorio
        />
        <Campo
          etiqueta="Tu código, otra vez"
          tipo="pin"
          name="codigo"
          value={codigo}
          onChange={(evento) => {
            setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          ayuda="El de tu aplicación de autenticación. Se pide para dar o quitar un acceso."
          obligatorio
        />

        {error && <ErrorEnCristiano error={error} />}

        <Botones>
          <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Dando acceso">
            Dar acceso total
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}

// ── Quitar el acceso ─────────────────────────────────────────────────────────

function QuitarAcceso({
  acceso,
  alCerrar,
  alHecho,
}: {
  readonly acceso: AccesoAlAdmin;
  readonly alCerrar: () => void;
  readonly alHecho: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [motivo, setMotivo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar('admin_quitar_acceso', {
      personaId: acceso.personaId,
      motivo,
      codigo,
    });
    setEnviando(false);
    setCodigo('');

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    await alHecho();
    alCerrar();
  }

  return (
    <Hoja abierta titulo={`Quitar el acceso a ${acceso.nombre}`} alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <p className="text-secundario text-texto-suave">
          Deja de poder entrar en el admin en su siguiente paso, aunque lo tenga abierto. Su cuenta
          de Estook y sus restaurantes no se tocan.
        </p>
        <Campo
          etiqueta="Por qué"
          name="motivo"
          value={motivo}
          onChange={(evento) => {
            setMotivo(evento.target.value);
          }}
          ayuda="Se queda escrito en la auditoría."
          obligatorio
        />
        <Campo
          etiqueta="Tu código, otra vez"
          tipo="pin"
          name="codigo"
          value={codigo}
          onChange={(evento) => {
            setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          obligatorio
        />

        {error && <ErrorEnCristiano error={error} />}

        <Botones>
          <Boton type="submit" tono="peligro" cargando={enviando} textoCargando="Quitando">
            Quitar el acceso
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}
