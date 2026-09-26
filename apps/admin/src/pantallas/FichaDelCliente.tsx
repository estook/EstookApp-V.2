import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CAJA,
  Cargando,
  Envoltorio,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  PanelLateral,
  Selector,
  Vistas,
  clases,
} from '@estook/ui';
import { IconoAbrirFuera, IconoAtencion } from '@estook/iconos';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { centimos, conSimbolo, planPorCodigo } from '@estook/dominio';
import { fechaYHora } from '../datos/cliente.ts';
import {
  cuandoEntro,
  elContrato,
  enStripe,
  fechaCorta,
  cuantoLlevaDeCliente,
  laActividad,
  loUltimo,
  NOMBRE_DEL_TIPO,
  NOMBRE_DEL_USO,
  type FichaDeCliente,
} from '../datos/clientes.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La ficha de un cliente (A2 · panel de administración 2 · La ficha).
 *
 * Arriba, **lo de los diez segundos**: contrato, actividad y las alertas. Debajo,
 * las pestañas en el orden del documento. Lo que el admin cambia pide motivo, y lo
 * que es del cliente —su nombre, su suscripción, su correo— **se le dice** en su
 * propia auditoría. De la suscripción, tres gestos; lo demás, en Stripe.
 */

const PESTANAS = [
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'datos', nombre: 'Datos' },
  { id: 'personas', nombre: 'Personas' },
  { id: 'suscripcion', nombre: 'Suscripción' },
  { id: 'uso', nombre: 'Uso' },
  { id: 'actividad', nombre: 'Actividad' },
  { id: 'notas', nombre: 'Notas' },
] as const;

type PestanaDeLaFicha = (typeof PESTANAS)[number]['id'];

/** Los gestos que abren una hoja. */
type Gesto =
  | { readonly que: 'nombre' }
  | { readonly que: 'ficha' }
  | { readonly que: 'alargar' }
  | { readonly que: 'casa' }
  | { readonly que: 'cancelar' }
  | { readonly que: 'correo'; readonly personaId: string; readonly nombre: string };

export function FichaDelCliente({
  organizacionId,
  alCerrar,
}: {
  readonly organizacionId: string;
  readonly alCerrar: () => void;
}) {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [pestana, setPestana] = useState<PestanaDeLaFicha>('resumen');
  const [gesto, setGesto] = useState<Gesto | null>(null);

  const consulta = useQuery({
    queryKey: ['admin_un_cliente', organizacionId],
    queryFn: async () => {
      const respuesta = await cliente.consultar<FichaDeCliente>('admin_un_cliente', {
        organizacion_id: organizacionId,
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  async function alCambiar() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_un_cliente', organizacionId] }),
      cache.invalidateQueries({ queryKey: ['admin_los_clientes'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  }

  const ficha = consulta.data;
  const esTotal = yo?.nivel === 'total';

  return (
    <PanelLateral abierta titulo={ficha?.cliente.nombre ?? 'Cliente'} alCerrar={alCerrar}>
      {consulta.isPending ? (
        <div className="pt-e4">
          <Cargando que="la ficha" lineas={5} />
        </div>
      ) : consulta.error instanceof FalloDeLaApi ? (
        <div className="pt-e4">
          <ErrorEnCristiano error={consulta.error.error} />
        </div>
      ) : ficha === undefined ? null : (
        <div className="flex flex-col gap-e4 pt-e4">
          <Cabecera ficha={ficha} />

          <Vistas
            vistas={PESTANAS}
            activa={pestana}
            acento="var(--color-naranja)"
            de={ficha.cliente.nombre}
            alElegir={(id) => {
              setPestana(id as PestanaDeLaFicha);
            }}
          />

          {pestana === 'resumen' && <Resumen ficha={ficha} />}
          {pestana === 'datos' && <Datos ficha={ficha} alGesto={setGesto} />}
          {pestana === 'personas' && (
            <Personas ficha={ficha} puedeCambiarCorreo={esTotal} alGesto={setGesto} />
          )}
          {pestana === 'suscripcion' && (
            <Suscripcion ficha={ficha} puede={esTotal} alGesto={setGesto} />
          )}
          {pestana === 'uso' && <Uso ficha={ficha} />}
          {pestana === 'actividad' && <Actividad ficha={ficha} />}
          {pestana === 'notas' && <Notas ficha={ficha} alCambiar={alCambiar} />}
        </div>
      )}

      {ficha !== undefined && gesto !== null && (
        <HojaDelGesto
          gesto={gesto}
          ficha={ficha}
          alCerrar={() => {
            setGesto(null);
          }}
          alHecho={alCambiar}
        />
      )}
    </PanelLateral>
  );
}

// ── Lo de los diez segundos ─────────────────────────────────────────────────

function Cabecera({ ficha }: { readonly ficha: FichaDeCliente }) {
  const c = ficha.cliente;
  const contrato = elContrato(c);
  const actividad = laActividad(c.actividad);
  return (
    <div className="flex flex-col gap-e3">
      <div className="flex flex-wrap items-center gap-e2">
        <Etiqueta tono={contrato.tono}>{contrato.texto}</Etiqueta>
        <Etiqueta tono={actividad.tono}>{actividad.texto}</Etiqueta>
        <span className="text-secundario text-texto-suave">
          {c.codigo} · {cuantoLlevaDeCliente(c.diasDeCliente)} ·{' '}
          {c.diasSinEntrar === null
            ? 'nunca ha entrado'
            : `entró ${cuandoEntro(c.diasSinEntrar).toLowerCase()}`}
        </span>
      </div>
      {ficha.alertas.length > 0 && (
        <ul className="flex flex-col gap-e1" aria-label="Alertas">
          {ficha.alertas.map((alerta) => (
            <li key={alerta} className="flex items-center gap-e2 text-secundario text-atencion">
              <IconoAtencion size={16} />
              {alerta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Una línea de dato: etiqueta a la izquierda, valor a la derecha. */
function Dato({ que, children }: { readonly que: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-e3 py-e2">
      <dt className="shrink-0 text-secundario text-texto-suave">{que}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  );
}

function Bloque({
  titulo,
  accion,
  children,
}: {
  readonly titulo: string;
  readonly accion?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e1 rounded-grande bg-fondo px-e4 py-e3">
      <div className="flex items-center justify-between gap-e2">
        <h3 className="font-semibold">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

function planYCuota(ficha: FichaDeCliente): string {
  const c = ficha.cliente;
  if (c.deLaCasa) return 'De la casa: no paga';
  if (c.plan === null) return 'Sin plan';
  const plan = planPorCodigo(c.plan)?.nombre ?? c.plan;
  return c.cuota === null
    ? plan
    : `${plan} · ${conSimbolo(centimos(c.cuota))} ${c.intervalo === 'ano' ? 'al año' : 'al mes'}`;
}

// ── Resumen ──────────────────────────────────────────────────────────────────

function Resumen({ ficha }: { readonly ficha: FichaDeCliente }) {
  const c = ficha.cliente;
  const fijadas = ficha.notas.filter((n) => n.fijada).slice(0, 3);
  const ultimas = fijadas.length > 0 ? fijadas : ficha.notas.slice(0, 2);
  return (
    <div className="flex flex-col gap-e3">
      <Bloque titulo="Contrato">
        <dl className="divide-y divide-borde">
          <Dato que="Plan">{planYCuota(ficha)}</Dato>
          <Dato que="Locales">{c.locales}</Dato>
          <Dato que="Tipo">{NOMBRE_DEL_TIPO[c.tipo]}</Dato>
          <Dato que="Dirige">{c.correos.length === 0 ? '—' : c.correos.join(', ')}</Dato>
        </dl>
      </Bloque>
      <Bloque titulo="Lo último">
        <p className="py-e2 text-secundario">
          {ficha.ultimoApunte === null
            ? 'Su gente todavía no ha apuntado nada.'
            : `${loUltimo(ficha.ultimoApunte.accion, ficha.ultimoApunte.entidad)} · ${fechaYHora(ficha.ultimoApunte.en)}`}
        </p>
      </Bloque>
      {ultimas.length > 0 && (
        <Bloque titulo={fijadas.length > 0 ? 'Notas fijadas' : 'Últimas notas'}>
          <ul className="flex flex-col divide-y divide-borde">
            {ultimas.map((n) => (
              <li key={n.id} className="py-e2">
                <p className="whitespace-pre-line">{n.texto}</p>
                <p className="text-etiqueta text-texto-suave">
                  {n.autor ?? 'Un admin'} · {fechaYHora(n.en)}
                </p>
              </li>
            ))}
          </ul>
        </Bloque>
      )}
    </div>
  );
}

// ── Datos ────────────────────────────────────────────────────────────────────

function Datos({
  ficha,
  alGesto,
}: {
  readonly ficha: FichaDeCliente;
  readonly alGesto: (gesto: Gesto) => void;
}) {
  const c = ficha.cliente;
  const f = ficha.ficha;
  return (
    <div className="flex flex-col gap-e3">
      <Bloque
        titulo="La organización"
        accion={
          <Boton
            tono="texto"
            onClick={() => {
              alGesto({ que: 'nombre' });
            }}
          >
            Cambiar el nombre
          </Boton>
        }
      >
        <dl className="divide-y divide-borde">
          <Dato que="Nombre">{c.nombre}</Dato>
          <Dato que="Código">{c.codigo}</Dato>
          <Dato que="Alta">{fechaCorta(c.alta)}</Dato>
        </dl>
        <p className="pb-e1 text-etiqueta text-texto-suave">
          Es del cliente: si lo cambias, se le dice en su auditoría.
        </p>
      </Bloque>

      <Bloque
        titulo="Contacto comercial"
        accion={
          <Boton
            tono="texto"
            onClick={() => {
              alGesto({ que: 'ficha' });
            }}
          >
            Editar
          </Boton>
        }
      >
        <dl className="divide-y divide-borde">
          <Dato que="Responsable">{f.responsable ?? '—'}</Dato>
          <Dato que="Teléfono">{f.telefono ?? '—'}</Dato>
          <Dato que="Correo">{f.correo ?? '—'}</Dato>
          <Dato que="Tipo">{NOMBRE_DEL_TIPO[c.tipo]}</Dato>
        </dl>
      </Bloque>

      <Bloque titulo={ficha.locales.length === 1 ? 'Su local' : 'Sus locales'}>
        <ul className="flex flex-col divide-y divide-borde">
          {ficha.locales.map((l) => (
            <li key={`${l.nombre}-${l.direccion ?? ''}`} className="flex flex-col py-e2">
              <span className="font-medium">
                {l.nombre}
                {l.activo ? '' : ' · cerrado'}
              </span>
              <span className="text-secundario text-texto-suave">
                {[l.poblacion, l.telefono].filter((x) => x !== null && x !== '').join(' · ') ||
                  'Sin dirección todavía'}
                {l.altaTerminada ? '' : ' · alta sin terminar'}
              </span>
            </li>
          ))}
        </ul>
      </Bloque>
    </div>
  );
}

// ── Personas ─────────────────────────────────────────────────────────────────

const NOMBRE_DEL_ROL: Readonly<Record<string, string>> = {
  direccion: 'Dirección',
  gerente: 'Gerente',
  jefe_de_cocina: 'Jefe de cocina',
  cocinero: 'Cocina',
  camarero: 'Sala',
  encargado_de_sala: 'Encargado de sala',
};

function Personas({
  ficha,
  puedeCambiarCorreo,
  alGesto,
}: {
  readonly ficha: FichaDeCliente;
  readonly puedeCambiarCorreo: boolean;
  readonly alGesto: (gesto: Gesto) => void;
}) {
  const estaSemana = ficha.personas.filter((p) => p.estaSemana).length;
  return (
    <div className="flex flex-col gap-e3">
      <p className="text-secundario text-texto-suave">
        {ficha.personas.length === 1 ? '1 persona' : `${String(ficha.personas.length)} personas`} ·{' '}
        {estaSemana} han entrado esta semana. Sin sus datos personales: nombre y rol.
      </p>
      <ul className="flex flex-col gap-e2">
        {ficha.personas.map((p) => (
          <li key={p.id} className="flex flex-col gap-e1 rounded-grande bg-fondo px-e4 py-e3">
            <span className="flex items-center justify-between gap-e2">
              <span className="font-medium">{p.nombre}</span>
              <Etiqueta tono={p.esDireccion ? 'marca' : 'neutro'}>
                {NOMBRE_DEL_ROL[p.rol] ?? p.rol.replace(/_/g, ' ')}
              </Etiqueta>
            </span>
            <span className="text-secundario text-texto-suave">
              {p.correo === null ? '' : `${p.correo} · `}
              {p.ultimoAcceso === null ? 'nunca ha entrado' : `entró ${fechaYHora(p.ultimoAcceso)}`}
              {' · '}
              {p.dobleFactor ? 'con segundo factor' : 'sin segundo factor'}
              {p.sesiones > 0 ? ` · ${String(p.sesiones)} sesiones abiertas` : ''}
            </span>
            {p.esDireccion && puedeCambiarCorreo && (
              <span>
                <Boton
                  tono="texto"
                  onClick={() => {
                    alGesto({ que: 'correo', personaId: p.id, nombre: p.nombre });
                  }}
                >
                  Cambiar el correo de acceso
                </Boton>
              </span>
            )}
          </li>
        ))}
      </ul>

      {ficha.cambiosDeCorreo.length > 0 && (
        <Bloque titulo="Cambios de correo">
          <ul className="flex flex-col divide-y divide-borde">
            {ficha.cambiosDeCorreo.map((cambio) => (
              <li key={cambio.pedidoEn} className="flex flex-col py-e2">
                <span>
                  {cambio.correoViejo} → {cambio.correoNuevo}
                </span>
                <span className="text-secundario text-texto-suave">
                  {fechaYHora(cambio.pedidoEn)} ·{' '}
                  {
                    {
                      pendiente: 'esperando a que lo confirme',
                      confirmado: 'confirmado',
                      parado: 'parado desde el correo de antes',
                      caducado: 'caducó sin confirmar',
                    }[cambio.como]
                  }
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}
    </div>
  );
}

// ── Suscripción ──────────────────────────────────────────────────────────────

const NOMBRE_DEL_ESTADO: Readonly<Record<string, string>> = {
  prueba: 'En prueba',
  pendiente_de_pago: 'Sin pagar',
  activa: 'Activa',
  impago: 'Cobro fallido',
  solo_lectura: 'Solo lectura',
  archivada: 'Archivada',
};

function quienFue(quien: string): string {
  if (quien.startsWith('admin:')) return 'Estook';
  if (quien.startsWith('persona:')) return 'El cliente';
  if (quien === 'stripe') return 'Stripe';
  if (quien === 'reloj') return 'El reloj';
  if (quien === 'crear_cuenta') return 'Al crear la cuenta';
  return quien;
}

function Suscripcion({
  ficha,
  puede,
  alGesto,
}: {
  readonly ficha: FichaDeCliente;
  readonly puede: boolean;
  readonly alGesto: (gesto: Gesto) => void;
}) {
  const c = ficha.cliente;
  const cobrandose =
    c.conStripe &&
    !c.cancelaAlAcabar &&
    (c.como === 'al_dia' || c.como === 'prueba' || c.como === 'impago');
  return (
    <div className="flex flex-col gap-e3">
      <Bloque
        titulo="Ahora"
        accion={
          c.stripe === null ? undefined : (
            <a
              href={enStripe(c.stripe)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-toque items-center gap-e1 font-medium text-texto hover:underline"
            >
              Abrir en Stripe
              <IconoAbrirFuera size={16} />
            </a>
          )
        }
      >
        <dl className="divide-y divide-borde">
          <Dato que="Estado">{NOMBRE_DEL_ESTADO[c.estado] ?? c.estado}</Dato>
          <Dato que="Plan">{planYCuota(ficha)}</Dato>
          {c.pruebaHasta !== null && <Dato que="Prueba hasta">{fechaCorta(c.pruebaHasta)}</Dato>}
          {c.periodoHasta !== null && (
            <Dato que={c.cancelaAlAcabar ? 'Se acaba el' : 'Renueva el'}>
              {fechaCorta(c.periodoHasta)}
            </Dato>
          )}
          {c.impagoDesde !== null && (
            <Dato que="Cobro fallido desde">{fechaCorta(c.impagoDesde)}</Dato>
          )}
          <Dato que="Tarjeta">{c.tarjeta ?? '—'}</Dato>
        </dl>
      </Bloque>

      {puede ? (
        <div className="flex flex-wrap gap-e2">
          {c.como === 'prueba' && c.pruebaHasta !== null && (
            <Boton
              tono="secundario"
              onClick={() => {
                alGesto({ que: 'alargar' });
              }}
            >
              Alargar la prueba
            </Boton>
          )}
          {(c.deLaCasa || !cobrandose) && (
            <Boton
              tono="secundario"
              onClick={() => {
                alGesto({ que: 'casa' });
              }}
            >
              {c.deLaCasa ? 'Quitar de la casa' : 'Hacer de la casa'}
            </Boton>
          )}
          {c.conStripe && (
            <Boton
              tono={c.cancelaAlAcabar ? 'secundario' : 'peligro'}
              onClick={() => {
                alGesto({ que: 'cancelar' });
              }}
            >
              {c.cancelaAlAcabar ? 'Que siga' : 'Cancelar al acabar'}
            </Boton>
          )}
        </div>
      ) : (
        <p className="text-secundario text-texto-suave">Los cambios los hace un admin total.</p>
      )}

      <Bloque titulo="Historial">
        {ficha.historial.length === 0 ? (
          <p className="py-e2 text-secundario text-texto-suave">Sin cambios todavía.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {ficha.historial.map((h) => (
              <li key={`${h.en}-${h.a}`} className="flex flex-col py-e2">
                <span>
                  {h.de === null ? '' : `${NOMBRE_DEL_ESTADO[h.de] ?? h.de} → `}
                  {NOMBRE_DEL_ESTADO[h.a] ?? h.a}
                </span>
                <span className="text-secundario text-texto-suave">
                  {fechaYHora(h.en)} · {quienFue(h.quien)} · {h.porque}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}

// ── Uso ──────────────────────────────────────────────────────────────────────

function Uso({ ficha }: { readonly ficha: FichaDeCliente }) {
  const cosas = ficha.uso.filter((u) => u.ultimos > 0 || u.anteriores > 0);
  return (
    <div className="flex flex-col gap-e3">
      <p className="text-secundario text-texto-suave">
        Lo que ha hecho en los últimos 30 días, frente a los 30 de antes. Solo lo que ya existe en
        Estook.
      </p>
      {cosas.length === 0 ? (
        <p className="rounded-grande bg-fondo px-e4 py-e4 text-center text-texto-suave">
          Todavía no ha apuntado nada.
        </p>
      ) : (
        <dl className="divide-y divide-borde rounded-grande bg-fondo px-e4">
          {cosas.map((u) => {
            const sube = u.ultimos - u.anteriores;
            return (
              <Dato key={u.que} que={NOMBRE_DEL_USO[u.que] ?? u.que}>
                <span className="font-medium tabular-nums">{u.ultimos}</span>
                <span
                  className={clases(
                    'ml-e2 text-secundario tabular-nums',
                    sube > 0 ? 'text-bien' : sube < 0 ? 'text-mal' : 'text-texto-suave',
                  )}
                >
                  {sube === 0 ? 'igual' : `${sube > 0 ? '+' : ''}${String(sube)}`}
                </span>
              </Dato>
            );
          })}
        </dl>
      )}
    </div>
  );
}

// ── Actividad del admin ──────────────────────────────────────────────────────

const LO_QUE_HIZO: Readonly<Record<string, string>> = {
  editar: 'Editó sus datos',
  anotar: 'Escribió una nota',
  alargar_la_prueba: 'Alargó la prueba',
  de_la_casa: 'Lo hizo de la casa',
  deja_de_ser_de_la_casa: 'Dejó de ser de la casa',
  cancelar_al_acabar: 'Canceló al acabar el periodo',
  reanudar: 'Deshizo la cancelación',
  pedir_cambio_de_correo: 'Pidió cambiar un correo de acceso',
};

function Actividad({ ficha }: { readonly ficha: FichaDeCliente }) {
  if (ficha.auditoria.length === 0) {
    return (
      <p className="rounded-grande bg-fondo px-e4 py-e4 text-center text-texto-suave">
        Ningún admin ha tocado este cliente.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-borde rounded-grande bg-fondo px-e4">
      {ficha.auditoria.map((a) => (
        <li key={`${a.en}-${a.accion}`} className="flex flex-col py-e3">
          <span className="font-medium">
            {LO_QUE_HIZO[a.accion] ?? a.accion.replace(/_/g, ' ')}
          </span>
          <span className="text-secundario text-texto-suave">
            {a.quien ?? 'Un admin'} · {fechaYHora(a.en)}
            {a.motivo === null ? '' : ` · ${a.motivo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Notas ────────────────────────────────────────────────────────────────────

function Notas({
  ficha,
  alCambiar,
}: {
  readonly ficha: FichaDeCliente;
  readonly alCambiar: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const id = useId();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('admin_escribir_una_nota', {
      organizacion_id: ficha.cliente.organizacionId,
      texto,
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setTexto('');
    await alCambiar();
  }

  async function fijar(notaId: number, fijada: boolean) {
    await cliente.ejecutar('admin_fijar_una_nota', { nota_id: notaId, fijada });
    await alCambiar();
  }

  return (
    <div className="flex flex-col gap-e3">
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e2"
      >
        <Envoltorio
          id={id}
          etiqueta="Una nota"
          ayuda="Solo la ve Estook. No se edita: se corrige con otra."
        >
          <textarea
            id={id}
            rows={3}
            maxLength={2000}
            value={texto}
            onChange={(evento) => {
              setTexto(evento.currentTarget.value);
            }}
            className={clases(CAJA, 'py-e2')}
          />
        </Envoltorio>
        {error !== null && <ErrorEnCristiano error={error} />}
        <div>
          <Boton
            type="submit"
            tono="principal"
            disabled={texto.trim() === ''}
            cargando={enviando}
            textoCargando="Guardando"
          >
            Guardar la nota
          </Boton>
        </div>
      </form>

      <ul className="flex flex-col gap-e2">
        {ficha.notas.map((n) => (
          <li
            key={n.id}
            className={clases(
              'flex flex-col gap-e1 rounded-grande px-e4 py-e3',
              n.fijada ? 'bg-naranja-suave' : 'bg-fondo',
            )}
          >
            <p className="whitespace-pre-line">{n.texto}</p>
            <span className="flex items-center justify-between gap-e2">
              <span className="text-etiqueta text-texto-suave">
                {n.autor ?? 'Un admin'} · {fechaYHora(n.en)}
              </span>
              <Boton
                tono="texto"
                onClick={() => {
                  void fijar(n.id, !n.fijada);
                }}
              >
                {n.fijada ? 'Soltar' : 'Fijar arriba'}
              </Boton>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Las hojas de cada gesto ─────────────────────────────────────────────────

const TITULO_DEL_GESTO: Readonly<Record<Gesto['que'], string>> = {
  nombre: 'Cambiar el nombre',
  ficha: 'El contacto comercial',
  alargar: 'Alargar la prueba',
  casa: 'De la casa',
  cancelar: 'Cancelar al acabar',
  correo: 'Cambiar el correo de acceso',
};

/**
 * Una hoja para cada gesto, con lo que pide cada uno. Lo que toca al cliente pide
 * **por qué**; y el correo de acceso, además, **el código otra vez**.
 */
function HojaDelGesto({
  gesto,
  ficha,
  alCerrar,
  alHecho,
}: {
  readonly gesto: Gesto;
  readonly ficha: FichaDeCliente;
  readonly alCerrar: () => void;
  readonly alHecho: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const c = ficha.cliente;
  const [motivo, setMotivo] = useState('');
  const [nombre, setNombre] = useState(c.nombre);
  const [dias, setDias] = useState('7');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contacto, setContacto] = useState({
    responsable: ficha.ficha.responsable ?? '',
    telefono: ficha.ficha.telefono ?? '',
    correo: ficha.ficha.correo ?? '',
    tipo: ficha.ficha.tipo ?? '',
  });
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mandado, setMandado] = useState(false);

  const id = c.organizacionId;
  const sinVacio = (valor: string) => (valor.trim() === '' ? null : valor.trim());

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta =
      gesto.que === 'nombre'
        ? await cliente.ejecutar('admin_cambiar_el_nombre', { organizacion_id: id, nombre, motivo })
        : gesto.que === 'ficha'
          ? await cliente.ejecutar('admin_guardar_la_ficha_comercial', {
              organizacion_id: id,
              responsable: sinVacio(contacto.responsable),
              telefono: sinVacio(contacto.telefono),
              correo: sinVacio(contacto.correo),
              tipo: sinVacio(contacto.tipo),
            })
          : gesto.que === 'alargar'
            ? await cliente.ejecutar('admin_alargar_la_prueba', {
                organizacion_id: id,
                dias: Number(dias),
                motivo,
              })
            : gesto.que === 'casa'
              ? await cliente.ejecutar('admin_de_la_casa', {
                  organizacion_id: id,
                  de_la_casa: !c.deLaCasa,
                  motivo,
                })
              : gesto.que === 'cancelar'
                ? await cliente.ejecutar('admin_cancelar_al_acabar', {
                    organizacion_id: id,
                    cancelar: !c.cancelaAlAcabar,
                    motivo,
                  })
                : await cliente.ejecutar('admin_cambiar_el_correo', {
                    organizacion_id: id,
                    persona_id: gesto.personaId,
                    correo_nuevo: correo,
                    motivo,
                    codigo,
                  });
    setEnviando(false);
    setCodigo('');
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    // Hecho: la hoja se cierra ya, y la ficha y la lista se ponen al día por detrás.
    void alHecho();
    if (gesto.que === 'correo') setMandado(true);
    else alCerrar();
  }

  if (mandado) {
    return (
      <Hoja abierta titulo={TITULO_DEL_GESTO.correo} alCerrar={alCerrar}>
        <div className="flex flex-col gap-e4">
          <Aviso tono="bien" titulo="Mandados los dos correos">
            Al nuevo, para confirmarlo; al de ahora, para pararlo si no lo ha pedido. El cambio solo
            se hace cuando lo confirme, y caduca en 24 horas.
          </Aviso>
          <Boton tono="principal" ancho onClick={alCerrar}>
            Hecho
          </Boton>
        </div>
      </Hoja>
    );
  }

  const conMotivo = gesto.que !== 'ficha';

  return (
    <Hoja abierta titulo={TITULO_DEL_GESTO[gesto.que]} alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        {gesto.que === 'nombre' && (
          <Campo
            etiqueta="Nombre"
            name="nombre"
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value);
            }}
            obligatorio
          />
        )}

        {gesto.que === 'ficha' && (
          <>
            <Campo
              etiqueta="Responsable del contrato"
              name="responsable"
              value={contacto.responsable}
              onChange={(evento) => {
                setContacto({ ...contacto, responsable: evento.target.value });
              }}
            />
            <Campo
              etiqueta="Teléfono"
              tipo="telefono"
              name="telefono"
              value={contacto.telefono}
              onChange={(evento) => {
                setContacto({ ...contacto, telefono: evento.target.value });
              }}
            />
            <Campo
              etiqueta="Correo de contacto"
              tipo="correo"
              name="correo"
              value={contacto.correo}
              ayuda="Para hablar con él. No es el correo con el que entra."
              onChange={(evento) => {
                setContacto({ ...contacto, correo: evento.target.value });
              }}
            />
            <Selector
              etiqueta="Tipo de cliente"
              sinElegir="Según sus locales"
              opciones={[
                { valor: 'independiente', texto: 'Independiente' },
                { valor: 'grupo', texto: 'Grupo' },
                { valor: 'cadena', texto: 'Cadena' },
              ]}
              value={contacto.tipo}
              onChange={(evento) => {
                setContacto({ ...contacto, tipo: evento.target.value });
              }}
            />
          </>
        )}

        {gesto.que === 'alargar' && (
          <Campo
            etiqueta="Cuántos días más"
            tipo="numero"
            name="dias"
            min={1}
            max={60}
            value={dias}
            {...(c.pruebaHasta === null
              ? {}
              : { ayuda: `Ahora acaba el ${fechaCorta(c.pruebaHasta)}.` })}
            onChange={(evento) => {
              setDias(evento.target.value);
            }}
            obligatorio
          />
        )}

        {gesto.que === 'casa' && (
          <p className="text-secundario text-texto-suave">
            {c.deLaCasa
              ? 'Vuelve a tener que pagar: la próxima vez que entre, elegirá un plan.'
              : 'No paga y tiene todo abierto. Se le dice en su historial.'}
          </p>
        )}

        {gesto.que === 'cancelar' && (
          <p className="text-secundario text-texto-suave">
            {c.cancelaAlAcabar
              ? 'Stripe le volverá a cobrar al acabar el periodo, como antes.'
              : `Sigue trabajando hasta el ${c.periodoHasta === null ? 'final del periodo' : fechaCorta(c.periodoHasta)}, y Stripe ya no le cobra más.`}
          </p>
        )}

        {gesto.que === 'correo' && (
          <>
            <p className="text-secundario text-texto-suave">
              De {gesto.nombre}. Le llega un enlace al correo nuevo para confirmarlo, y un aviso al
              de ahora para pararlo.
            </p>
            <Campo
              etiqueta="El correo nuevo"
              tipo="correo"
              name="correo_nuevo"
              value={correo}
              onChange={(evento) => {
                setCorreo(evento.target.value);
              }}
              obligatorio
            />
          </>
        )}

        {conMotivo && (
          <Campo
            etiqueta="Por qué"
            name="motivo"
            value={motivo}
            ayuda="Se queda escrito, y el cliente lo ve si le toca."
            onChange={(evento) => {
              setMotivo(evento.target.value);
            }}
            obligatorio
          />
        )}

        {gesto.que === 'correo' && (
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
        )}

        {error !== null && <ErrorEnCristiano error={error} />}

        <Botones>
          <Boton
            type="submit"
            tono={gesto.que === 'cancelar' && !c.cancelaAlAcabar ? 'peligro' : 'principal'}
            cargando={enviando}
            textoCargando="Un momento"
          >
            {gesto.que === 'correo' ? 'Mandar los dos correos' : 'Guardar'}
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}
