import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ALERGENOS,
  NOMBRE_CORTO_DEL_ALERGENO,
  laAlergiaEnLetra,
  lasEtiquetasDelCliente,
  type TonoDeEtiqueta,
} from '@estook/dominio';
import { Aviso, Boton, ErrorEnCristiano, Hoja, clases, fondoDegradado } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Servicio › Reservas › Clientes** (la Ampliación 5 · 3, decisión 0153, sección 21; maqueta, pestaña 5,
 * «Los clientes, y los que no vienen»). Cada reserva crea o encuentra al cliente por su teléfono; aquí se ven
 * todos los de **este local** (otro local no los ve nunca), los de la última visita primero, con buscador.
 *
 * Al tocar uno, su ficha: visitas, gasto medio por persona (quien ve las ventas), lo que suele pedir, las
 * veces que no vino; y lo poco que se apunta a mano (VIP, sus alergias con su sí y una nota). **Borrar sus
 * datos**, si lo pide (RGPD, art. 17), lo hace quien lleva los Ajustes del TPV.
 */

export interface MarcasDelCliente {
  readonly id: string;
  readonly vip: boolean;
  readonly habitual: boolean;
  readonly alergenos: readonly string[];
  readonly vecesSinVenir: number;
  readonly visitas: number;
  readonly nota: string | null;
}

interface UnCliente extends MarcasDelCliente {
  readonly nombre: string;
  readonly telefono: string;
  readonly ultimaVisita: string | null;
}

interface LosClientesDelLocal {
  readonly clientes: readonly UnCliente[];
  readonly hayMas: boolean;
  readonly puedeBorrar: boolean;
  readonly veElGasto: boolean;
}

interface LaFicha extends UnCliente {
  readonly loQueSuelePedir: readonly string[];
  readonly gastoMedioPorPersona: number | null;
  readonly veElGasto: boolean;
  readonly reservasQueVienen: number;
}

const ESTILO_DE: Readonly<Record<TonoDeEtiqueta, string>> = {
  alergia: 'bg-mal-suave text-mal',
  sin_venir: 'bg-atencion-suave text-atencion',
  vip: 'text-white',
  habitual: 'bg-bien-suave text-bien',
};

export function LasEtiquetasDelCliente({
  cliente,
}: {
  readonly cliente: MarcasDelCliente | null | undefined;
}) {
  if (cliente === null || cliente === undefined) return null;
  const etiquetas = lasEtiquetasDelCliente(cliente);
  if (etiquetas.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-e1">
      {etiquetas.map((e) => (
        <span
          key={`${e.tono}-${e.texto}`}
          className={clases(
            'rounded-redondo px-e2 py-[2px] text-etiqueta font-bold',
            ESTILO_DE[e.tono],
          )}
          style={e.tono === 'vip' ? fondoDegradado('fechas') : undefined}
        >
          {e.texto}
        </span>
      ))}
    </span>
  );
}

function euros(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function elDiaCorto(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function LosClientes() {
  const [buscar, setBuscar] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const texto = buscar.trim();
  const lectura = usarLectura<LosClientesDelLocal>(
    'los_clientes_del_local',
    texto.length >= 2 ? { buscar: texto } : {},
    true,
    true,
  );
  const d = lectura.data;

  return (
    <section className="flex flex-col gap-e3" aria-label="Clientes">
      <div className="flex flex-wrap items-center justify-between gap-e3">
        <h2 className="text-seccion font-bold">Clientes</h2>
        <input
          type="search"
          value={buscar}
          placeholder="Nombre o teléfono"
          aria-label="Buscar un cliente"
          onChange={(e) => {
            setBuscar(e.currentTarget.value);
          }}
          className="min-h-toque w-full max-w-[18rem] rounded-grande border border-borde bg-superficie px-e3"
        />
      </div>
      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        />
      )}
      {d === undefined ? (
        <p className="text-secundario text-texto-suave">Mirando los clientes…</p>
      ) : d.clientes.length === 0 ? (
        <p className="rounded-grande bg-fondo p-e4 text-secundario text-texto-suave">
          {texto === ''
            ? 'Aún no hay clientes: cada reserva crea el suyo, por su teléfono.'
            : 'Nadie con ese nombre o teléfono.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-e2">
          {d.clientes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setAbierto(c.id);
                }}
                className="flex w-full items-center gap-e3 rounded-grande border border-borde bg-superficie p-e3 text-left hover:border-texto-tenue"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full text-cuerpo font-bold text-white"
                  style={fondoDegradado(c.vip ? 'fechas' : 'vacaciones')}
                  aria-hidden
                >
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-e1">
                  <span className="truncate font-bold">{c.nombre}</span>
                  <LasEtiquetasDelCliente cliente={c} />
                </span>
                <span className="flex shrink-0 flex-col items-end text-secundario">
                  <strong className="tabular-nums">
                    {c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'}
                  </strong>
                  {c.ultimaVisita !== null && (
                    <span className="text-etiqueta text-texto-suave">
                      {elDiaCorto(c.ultimaVisita)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {d?.hayMas === true && (
        <p className="text-etiqueta text-texto-tenue">
          Salen los cien de la última visita. Para otro, búscalo.
        </p>
      )}

      {abierto !== null && (
        <LaFichaEnEstook
          clienteId={abierto}
          puedeBorrar={d?.puedeBorrar === true}
          alCerrar={() => {
            setAbierto(null);
          }}
          alAcabar={(frase) => {
            setAbierto(null);
            setNoticia(frase);
          }}
        />
      )}
    </section>
  );
}

function LaFichaEnEstook({
  clienteId,
  puedeBorrar,
  alCerrar,
  alAcabar,
}: {
  readonly clienteId: string;
  readonly puedeBorrar: boolean;
  readonly alCerrar: () => void;
  readonly alAcabar: (frase: string) => void;
}) {
  const lectura = usarLectura<LaFicha>('la_ficha_del_cliente', { cliente_id: clienteId });
  const f = lectura.data;
  return (
    <Hoja abierta enMedio alCerrar={alCerrar} titulo={f?.nombre ?? 'Cliente'}>
      {f === undefined ? (
        <p className="text-secundario text-texto-suave">Mirando su ficha…</p>
      ) : (
        <ElFormulario f={f} puedeBorrar={puedeBorrar} alAcabar={alAcabar} />
      )}
    </Hoja>
  );
}

function ElFormulario({
  f,
  puedeBorrar,
  alAcabar,
}: {
  readonly f: LaFicha;
  readonly puedeBorrar: boolean;
  readonly alAcabar: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [vip, setVip] = useState(f.vip);
  const [alergenos, setAlergenos] = useState<readonly string[]>(f.alergenos);
  const [nota, setNota] = useState(f.nota ?? '');
  const [haciendo, setHaciendo] = useState<'guardar' | 'borrar' | null>(null);
  const [seguro, setSeguro] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const cambiado =
    vip !== f.vip || alergenos.join() !== f.alergenos.join() || nota.trim() !== (f.nota ?? '');

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['los_clientes_del_local'] });
    await cache.invalidateQueries({ queryKey: ['la_ficha_del_cliente'] });
    await cache.invalidateQueries({ queryKey: ['las_reservas'] });
  }

  async function guardar() {
    setHaciendo('guardar');
    setFallo(null);
    const respuesta = await cliente.ejecutar('guardar_al_cliente', {
      cliente_id: f.id,
      vip,
      alergenos: ALERGENOS.filter((a) => alergenos.includes(a)),
      nota: nota.trim() === '' ? null : nota.trim(),
    });
    setHaciendo(null);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    await refrescar();
    alAcabar(`Ficha de ${f.nombre}, guardada`);
  }

  async function borrar() {
    setHaciendo('borrar');
    setFallo(null);
    const respuesta = await cliente.ejecutar('borrar_al_cliente', { cliente_id: f.id });
    setHaciendo(null);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    await refrescar();
    alAcabar(`Los datos de ${f.nombre}, borrados`);
  }

  const cifras = [
    { valor: String(f.visitas), texto: f.visitas === 1 ? 'visita' : 'visitas' },
    ...(f.veElGasto
      ? [
          {
            valor: f.gastoMedioPorPersona === null ? '—' : euros(f.gastoMedioPorPersona),
            texto: 'gasto por persona',
          },
        ]
      : []),
    { valor: String(f.vecesSinVenir), texto: 'sin venir' },
  ];

  return (
    <div className="flex flex-col gap-e4">
      <p className="flex flex-wrap items-center gap-e2 text-secundario text-texto-suave">
        {f.telefono}
        <LasEtiquetasDelCliente cliente={f} />
      </p>
      <div
        className="grid gap-e2"
        style={{
          gridTemplateColumns: `repeat(${String(Math.max(cifras.length, 2))}, minmax(0, 1fr))`,
        }}
      >
        {cifras.map((c) => (
          <div key={c.texto} className="rounded-grande bg-fondo p-e3">
            <strong className="block text-seccion tabular-nums">{c.valor}</strong>
            <span className="text-etiqueta text-texto-suave">{c.texto}</span>
          </div>
        ))}
      </div>
      {(f.ultimaVisita !== null || f.loQueSuelePedir.length > 0) && (
        <dl className="flex flex-col gap-e1 text-secundario">
          {f.ultimaVisita !== null && (
            <div className="flex gap-e2">
              <dt className="text-texto-suave">Última vez</dt>
              <dd className="font-semibold">{elDiaCorto(f.ultimaVisita)}</dd>
            </div>
          )}
          {f.loQueSuelePedir.length > 0 && (
            <div className="flex gap-e2">
              <dt className="shrink-0 text-texto-suave">Suele pedir</dt>
              <dd className="font-semibold">{f.loQueSuelePedir.join(', ')}</dd>
            </div>
          )}
        </dl>
      )}

      <label className="flex cursor-pointer items-center justify-between gap-e3 rounded-grande border border-borde p-e3">
        <span className="font-bold">VIP</span>
        <input
          type="checkbox"
          checked={vip}
          onChange={(e) => {
            setVip(e.target.checked);
          }}
          className="size-6 accent-[var(--color-app-servicio)]"
        />
      </label>
      <div className="flex flex-col gap-e2">
        <span className="font-bold">Sus alergias</span>
        <span className="text-secundario text-texto-suave">
          Solo con su sí: son datos de salud. Al sentarle, la mesa saldrá con ellas.
        </span>
        <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
          {ALERGENOS.map((a) => {
            const puesta = alergenos.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={puesta}
                onClick={() => {
                  setAlergenos(puesta ? alergenos.filter((x) => x !== a) : [...alergenos, a]);
                }}
                className={clases(
                  'min-h-toque rounded-grande border-2 px-e3 text-left text-secundario font-bold',
                  puesta ? 'border-mal bg-mal-suave text-mal' : 'border-borde bg-superficie',
                )}
              >
                {a === 'gluten' ? laAlergiaEnLetra(a) : NOMBRE_CORTO_DEL_ALERGENO[a]}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex flex-col gap-e1">
        <span className="font-bold">Nota</span>
        <input
          value={nota}
          maxLength={80}
          placeholder="«Trona», «mesa tranquila»…"
          onChange={(e) => {
            setNota(e.currentTarget.value);
          }}
          className="min-h-toque rounded-grande border border-borde bg-superficie px-e3"
        />
      </label>

      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      <Boton
        tono="principal"
        ancho
        disabled={!cambiado || haciendo !== null}
        cargando={haciendo === 'guardar'}
        onClick={() => {
          void guardar();
        }}
      >
        Guardar
      </Boton>

      {puedeBorrar && (
        <details className="rounded-grande bg-fondo p-e3">
          <summary className="cursor-pointer text-secundario font-semibold text-texto-suave">
            Si te pide borrar sus datos
          </summary>
          <div className="mt-e3 flex flex-col gap-e3">
            <p className="text-secundario">
              Se borra su ficha, y en sus reservas pasadas dejan de salir su nombre y su teléfono.
              No se puede deshacer.
              {f.reservasQueVienen > 0
                ? ' Tiene una reserva por llegar: cancélala antes en Estook TPV › Reservas.'
                : ''}
            </p>
            <label className="flex items-center gap-e2 text-secundario">
              <input
                type="checkbox"
                checked={seguro}
                onChange={(e) => {
                  setSeguro(e.target.checked);
                }}
                className="size-5"
              />
              Lo ha pedido el cliente
            </label>
            <Boton
              tono="peligro"
              disabled={!seguro || f.reservasQueVienen > 0 || haciendo !== null}
              cargando={haciendo === 'borrar'}
              onClick={() => {
                void borrar();
              }}
            >
              Borrar sus datos
            </Boton>
          </div>
        </details>
      )}
    </div>
  );
}
