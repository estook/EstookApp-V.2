import { useState } from 'react';
import { Boton, Campo, ErrorEnCristiano, Hoja, fondoDegradado } from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import { irALaMesa } from '../navegar.ts';
import type { MesaDelPlano, UnaReserva, UnoEnEspera } from '../datos/tipos.ts';
import { abrirlaPisaLaReserva, laReservaDeLaMesa } from './logica.ts';

/**
 * **«En espera»** (la Ampliación 5 · 3, 0153; maqueta, «En espera: 1 (Ander · 2)»): quien llega sin reservar
 * y espera mesa. Se apunta con su nombre y cuántos son (el teléfono, si se va a dar una vuelta); **«Sentar»**
 * abre una mesa libre con los que son y lo quita de la lista; **«Se ha ido»**, lo quita. Al segundo en todos
 * los aparatos, como la sala. Sin internet no se apunta (la lista vive en el servidor).
 */

function minutosDesde(instante: string, ahora: number): number {
  return Math.max(0, Math.floor((ahora - Date.parse(instante)) / 60_000));
}

export function EnEspera({
  espera,
  mesas,
  reservas,
  liberarTras,
  alHacer,
}: {
  readonly espera: readonly UnoEnEspera[];
  /** Las mesas del plano, para elegir una libre al sentar. */
  readonly mesas: readonly MesaDelPlano[];
  /** Las reservas de hoy: una mesa que se reserva en menos de dos horas se avisa, y va al final. */
  readonly reservas: readonly UnaReserva[];
  readonly liberarTras: number;
  readonly alHacer: (frase: string) => void;
}) {
  const ejecutar = usarAcciones();
  const [apuntando, setApuntando] = useState(false);
  const [sentando, setSentando] = useState<UnoEnEspera | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const ahora = Date.now();

  async function seHaIdo(e: UnoEnEspera) {
    setHaciendo(e.id);
    setFallo(null);
    const hecho = await ejecutar('quitar_de_espera', { id: e.id });
    setHaciendo(null);
    if (!hecho.ok) {
      setFallo(hecho.error);
      return;
    }
    alHacer(`${e.nombre}, fuera de la lista de espera`);
  }

  async function sentar(e: UnoEnEspera, mesa: MesaDelPlano) {
    setHaciendo(e.id);
    setFallo(null);
    const cuentaId = crypto.randomUUID();
    const hecho = await ejecutar<{ cuentaId: string }>(
      'abrir_mesa',
      { cuenta_id: cuentaId, mesa_id: mesa.id, espera_id: e.id },
      cuentaId,
      { que: `Mesa ${mesa.nombre} · ${e.nombre}`, cuentaId, respuesta: { cuentaId } },
    );
    setHaciendo(null);
    setSentando(null);
    if (hecho.ok) {
      irALaMesa(hecho.datos.cuentaId);
      return;
    }
    setFallo(hecho.error);
  }

  // La reserva que pisaría sentar ahora en esa mesa (la de dentro de menos de dos horas), o nula.
  const suReserva = (m: MesaDelPlano) => {
    const r = laReservaDeLaMesa(reservas, m.id, ahora, liberarTras);
    return abrirlaPisaLaReserva(r, ahora) ? r : null;
  };
  // Las libres: primero las que caben con menos sillas vacías; las que se reservan pronto, al final.
  const libres = (comensales: number) =>
    mesas
      .filter((m) => m.cuenta === null)
      .slice()
      .sort((a, b) => {
        const pronto = (m: MesaDelPlano) => (suReserva(m) === null ? 0 : 1);
        const caben = (m: MesaDelPlano) => (m.plazas >= comensales ? 0 : 1);
        return (
          pronto(a) - pronto(b) ||
          caben(a) - caben(b) ||
          a.plazas - b.plazas ||
          a.nombre.localeCompare(b.nombre, 'es')
        );
      });

  return (
    <section className="flex flex-col gap-e2" aria-label="En espera">
      <div className="flex items-center justify-between gap-e2">
        <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
          En espera{espera.length > 0 ? ` · ${String(espera.length)}` : ''}
        </h3>
        <Boton
          tono="secundario"
          tamano="s"
          icono={<IconoAnadir size={16} />}
          onClick={() => {
            setApuntando(true);
          }}
        >
          En espera
        </Boton>
      </div>
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {espera.length > 0 && (
        <ul className="flex flex-col gap-e2">
          {espera.map((e) => {
            const minutos = minutosDesde(e.llegoEn, ahora);
            return (
              <li
                key={e.id}
                className="flex items-center gap-e3 rounded-mayor border border-borde bg-fondo p-e3"
              >
                <span
                  className="grid min-w-[3.4rem] place-items-center rounded-grande px-e2 py-e1 text-secundario font-bold tabular-nums text-white"
                  style={fondoDegradado(minutos >= 20 ? 'incidencias' : 'fechas')}
                  title="Lo que lleva esperando"
                >
                  {minutos}′
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {e.nombre} · {e.comensales}
                  </strong>
                  {(e.telefono !== null || e.nota !== null) && (
                    <span className="block truncate text-secundario text-texto-suave">
                      {[e.telefono, e.nota].filter((x) => x !== null).join(' · ')}
                    </span>
                  )}
                </span>
                <Boton
                  tono="texto"
                  tamano="s"
                  disabled={haciendo !== null}
                  cargando={haciendo === e.id && sentando === null}
                  onClick={() => {
                    void seHaIdo(e);
                  }}
                >
                  Se ha ido
                </Boton>
                <Boton
                  tono="principal"
                  tamano="s"
                  disabled={haciendo !== null}
                  onClick={() => {
                    setSentando(e);
                  }}
                >
                  Sentar
                </Boton>
              </li>
            );
          })}
        </ul>
      )}

      {apuntando && (
        <ApuntarEnEspera
          alCerrar={() => {
            setApuntando(false);
          }}
          alAcabar={(frase) => {
            setApuntando(false);
            alHacer(frase);
          }}
        />
      )}

      {sentando !== null && (
        <Hoja
          abierta
          enMedio
          alCerrar={() => {
            setSentando(null);
          }}
          titulo={`Sentar a ${sentando.nombre} · ${String(sentando.comensales)}`}
        >
          {libres(sentando.comensales).length === 0 ? (
            <p className="text-texto-suave">No queda ninguna mesa libre ahora mismo.</p>
          ) : (
            <div className="grid grid-cols-3 gap-e2 sm:grid-cols-4">
              {libres(sentando.comensales).map((m) => {
                const cabe = m.plazas >= sentando.comensales;
                const reservada = suReserva(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={haciendo !== null}
                    onClick={() => {
                      void sentar(sentando, m);
                    }}
                    className={[
                      'flex min-h-[4.4rem] flex-col items-start justify-between rounded-mayor border p-e3 text-left',
                      reservada !== null
                        ? 'border-atencion bg-atencion-suave'
                        : cabe
                          ? 'border-borde bg-superficie'
                          : 'border-dashed border-borde bg-fondo text-texto-suave',
                    ].join(' ')}
                  >
                    <strong className="text-seccion">{m.nombre}</strong>
                    <span className="text-etiqueta">
                      {reservada !== null
                        ? `Reservada a las ${reservada.hora}`
                        : `${String(m.plazas)} ${m.plazas === 1 ? 'plaza' : 'plazas'}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Hoja>
      )}
    </section>
  );
}

function ApuntarEnEspera({
  alCerrar,
  alAcabar,
}: {
  readonly alCerrar: () => void;
  readonly alAcabar: (frase: string) => void;
}) {
  const ejecutar = usarAcciones();
  const [id] = useState(() => crypto.randomUUID());
  const [nombre, setNombre] = useState('');
  const [comensales, setComensales] = useState(2);
  const [telefono, setTelefono] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  async function apuntar() {
    setGuardando(true);
    setFallo(null);
    const hecho = await ejecutar('poner_en_espera', {
      id,
      nombre: nombre.trim(),
      comensales,
      ...(telefono.trim() === '' ? {} : { telefono: telefono.trim() }),
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
    });
    setGuardando(false);
    if (!hecho.ok) {
      setFallo(hecho.error);
      return;
    }
    alAcabar(`${nombre.trim()}, ${String(comensales)}: en espera`);
  }

  return (
    <Hoja
      abierta
      enMedio
      alCerrar={alCerrar}
      titulo="En espera"
      pie={
        <Boton
          tono="principal"
          ancho
          disabled={nombre.trim() === '' || guardando}
          cargando={guardando}
          onClick={() => {
            void apuntar();
          }}
        >
          Apuntar
        </Boton>
      }
    >
      <div className="flex flex-col gap-e4">
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
        <div className="grid grid-cols-6 gap-e2" role="group" aria-label="Cuántos son">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={comensales === n}
              onClick={() => {
                setComensales(n);
              }}
              className={[
                'min-h-toque rounded-grande border text-cuerpo font-bold tabular-nums',
                comensales === n
                  ? 'border-transparent bg-texto text-superficie'
                  : 'border-borde bg-fondo',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-e2 text-secundario text-texto-suave">
          Más:
          <input
            inputMode="numeric"
            aria-label="Más de seis"
            value={comensales > 6 ? String(comensales) : ''}
            placeholder="7, 10…"
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, '').slice(0, 2));
              if (n > 0) setComensales(n);
            }}
            className="w-20 rounded-medio border border-borde bg-fondo px-e2 py-e1 text-cuerpo tabular-nums"
          />
        </label>
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={40}
          onChange={(e) => {
            setNombre(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Teléfono (opcional)"
          tipo="telefono"
          ayuda="Por si se van a dar una vuelta y hay que llamarles."
          value={telefono}
          onChange={(e) => {
            setTelefono(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Una nota (opcional)"
          value={nota}
          maxLength={120}
          onChange={(e) => {
            setNota(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
