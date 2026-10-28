import { useState, type ReactNode } from 'react';
import { ALERGENOS, enSuOrden, NOMBRE_CORTO_DEL_ALERGENO } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { puedeEditar } from '@estook/permisos';
import { Boton, CAJA, Envoltorio, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAcciones, usarAlSegundo, usarLasImpresoras } from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano, ElPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { comensales, cuantoLlevan, euros, losNombres } from '../logica/texto.ts';
import { irAlPlano } from '../navegar.ts';

/**
 * Lo que se puede hacer con una mesa abierta (0106, «MesaAcciones»), al tocarla en el
 * plano o desde «Opciones» dentro de ella. Lo de cobrar y dividirla llega con el cobro (M20C):
 * hasta entonces, se cobra en el TPV de siempre y aquí se libera la mesa.
 *
 * **Imprimir la cuenta y reimprimir la comanda** (T5 · 1, 0119), si hay impresora para ello:
 * lo imprime la caja para Windows, desde cualquier aparato.
 *
 * **Alergias** (T4 · 2, 0117): los catorce, de un toque. Al pedir lo que lleva alguno, la sala
 * avisa; y en cocina y en la barra sale en rojo.
 */

type Paso =
  | 'lista'
  | 'cambiar'
  | 'juntar'
  | 'pasar'
  | 'nota'
  | 'personas'
  | 'alergias'
  | 'liberar'
  | 'anular';

export function OpcionesDeLaMesa({
  cuenta,
  plano,
  alCerrar,
  alAbrir,
  sinMandarAqui = 0,
}: {
  readonly cuenta: CuentaEnElPlano;
  readonly plano: ElPlano;
  readonly alCerrar: () => void;
  /** «Abrir la mesa»: solo desde el plano; dentro de la mesa ya se está. */
  readonly alAbrir?: () => void;
  /** Lo pedido en esta tablet que aún no ha salido de ella (`comanda.ts`). */
  readonly sinMandarAqui?: number;
}) {
  const { porPases, notaParaCocina } = cuenta;
  const { yo } = usarSesion();
  const ejecutar = usarAcciones();
  const [paso, setPaso] = useState<Paso>('lista');
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [haciendo, setHaciendo] = useState(false);
  const [texto, setTexto] = useState('');
  const alergias = cuenta.alergias ?? [];
  const [marcadas, setMarcadas] = useState<readonly string[]>(alergias);
  const esJefe = puedeEditar(yo.permisos, 'accion.quitar_de_cocina');
  const impresoras = usarLasImpresoras(usarAlSegundo());
  const [impreso, setImpreso] = useState<string | null>(null);

  async function hacer(nombre: string, entrada: unknown, despues: () => void = alCerrar) {
    setHaciendo(true);
    setFallo(null);
    const hecho = await ejecutar(nombre, entrada);
    setHaciendo(false);
    if (hecho.ok) despues();
    else setFallo(hecho.error);
  }

  const libres = plano.zonas.flatMap((z) =>
    z.mesas.filter((m) => m.cuenta === null).map((m) => ({ ...m, zona: z.nombre })),
  );
  const otras = [
    ...plano.zonas.flatMap((z) => z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta]))),
    ...plano.sinMesa,
  ].filter((c) => c.cuentaId !== cuenta.cuentaId);
  const toca = cuenta.loSiguiente.que === 'marchar' ? cuenta.loSiguiente.pase : null;

  const volver = () => {
    setPaso('lista');
    setFallo(null);
    setTexto('');
  };

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={cuenta.titulo}>
      <p className="mb-e4 text-secundario text-texto-suave">
        {[
          comensales(cuenta.personas),
          cuenta.camarero,
          cuantoLlevan(cuenta.minutos),
          `${euros(cuenta.totalCentimos)} €`,
        ]
          .filter((x) => x !== null)
          .join(' · ')}
      </p>

      {fallo !== null && (
        <div className="mb-e4">
          <ErrorEnCristiano error={fallo} />
        </div>
      )}
      {impreso !== null && (
        <p role="status" className="mb-e4 font-semibold text-bien">
          {impreso}
        </p>
      )}

      {paso === 'lista' && (
        <div className="flex flex-col gap-e2">
          {toca !== null && (
            <Boton
              tono="principal"
              tamano="l"
              ancho
              cargando={haciendo}
              onClick={() => {
                void hacer('marchar', { cuenta_id: cuenta.cuentaId, pase: toca });
              }}
            >
              Marchar el {elPase(toca)}
            </Boton>
          )}
          {alAbrir !== undefined && (
            <Opcion titulo="Abrir la mesa" detalle="pedir y cambiar" onClick={alAbrir} fuerte />
          )}
          {impresoras.data?.hayParaLaCuenta === true && (
            <Opcion
              titulo="🧾 Imprimir la cuenta"
              detalle="lo que llevan, antes de cobrar"
              onClick={() => {
                setImpreso(null);
                void hacer('imprimir_la_cuenta', { cuenta_id: cuenta.cuentaId }, () => {
                  setImpreso('La cuenta sale por la impresora de la caja.');
                });
              }}
            />
          )}
          <Opcion
            titulo={alergias.length === 0 ? '⚠ Alergias' : `⚠ Alergias · ${losNombres(alergias)}`}
            detalle={
              alergias.length === 0
                ? 'avisa al pedir, y en cocina sale en rojo'
                : 'al pedir avisa, y en cocina sale en rojo'
            }
            peligro={alergias.length > 0}
            onClick={() => {
              setMarcadas(alergias);
              setPaso('alergias');
            }}
          />
          <Opcion
            titulo={cuenta.tipo === 'mesa' ? 'Cambiar de mesa' : 'Llevar a una mesa'}
            detalle={cuenta.tipo === 'mesa' ? 'se cambian de sitio' : 'de la barra a una mesa'}
            onClick={() => {
              setPaso('cambiar');
            }}
          />
          <Opcion
            titulo="Juntar mesas"
            detalle="una sola cuenta"
            onClick={() => {
              setPaso('juntar');
            }}
          />
          {/* **Cualquiera se queda o pasa cualquier mesa**, con rastro (0107, Anexo 11.8). */}
          {cuenta.camareroId !== yo.personaId && (
            <Opcion
              titulo="Quedármela"
              detalle={
                cuenta.suCamareroSeHaIdo
                  ? `${cuenta.camarero ?? 'Su camarero'} ha fichado la salida`
                  : `ahora es de ${cuenta.camarero ?? 'nadie'}`
              }
              onClick={() => {
                void hacer('pasar_a_otro_camarero', {
                  cuenta_ids: [cuenta.cuentaId],
                  camarero_id: yo.personaId,
                });
              }}
            />
          )}
          <Opcion
            titulo="Pasar a otro camarero"
            detalle="al cambiar de turno"
            onClick={() => {
              setPaso('pasar');
            }}
          />
          <Opcion
            titulo={cuenta.conPrisa ? '⚡ Ya no tienen prisa' : '⚡ Tienen prisa'}
            detalle={
              cuenta.conPrisa
                ? 'en cocina va arriba, con su franja'
                : 'sube arriba en cocina, con su franja y su sonido'
            }
            onClick={() => {
              void hacer('cambiar_la_prisa', {
                cuenta_id: cuenta.cuentaId,
                con_prisa: !cuenta.conPrisa,
              });
            }}
          />
          <Opcion
            titulo="Nota para cocina"
            detalle={notaParaCocina ?? 'Sin nota: «es un cumpleaños», «sin prisa»…'}
            onClick={() => {
              setTexto(notaParaCocina ?? '');
              setPaso('nota');
            }}
          />
          <Opcion
            titulo="Comensales"
            detalle={comensales(cuenta.personas) ?? 'sin decir'}
            onClick={() => {
              setTexto(cuenta.personas === null ? '' : String(cuenta.personas));
              setPaso('personas');
            }}
          />
          {/* Lo de llevar sale siempre todo junto (28-oct): ni pases ni «Sacadlo todo». */}
          {porPases && cuenta.tipo !== 'para_llevar' && (
            <Opcion
              titulo="Sacadlo todo"
              detalle="lo que espera sale ya, y lo nuevo, todo junto"
              onClick={() => {
                void hacer('cambiar_la_mesa', { cuenta_id: cuenta.cuentaId, por_pases: false });
              }}
            />
          )}
          {!porPases && cuenta.tipo !== 'para_llevar' && (
            <Opcion
              titulo="Por pases"
              detalle="lo nuevo, en su pase"
              onClick={() => {
                void hacer('cambiar_la_mesa', { cuenta_id: cuenta.cuentaId, por_pases: true });
              }}
            />
          )}
          {impresoras.data?.hayParaLaComanda === true && (
            <Opcion
              titulo="Reimprimir la comanda"
              detalle="lo ya mandado, otra vez, marcado «COPIA»"
              onClick={() => {
                setImpreso(null);
                void hacer('reimprimir_la_comanda', { cuenta_id: cuenta.cuentaId }, () => {
                  setImpreso('La comanda sale otra vez, marcada «COPIA».');
                });
              }}
            />
          )}
          <Opcion
            titulo="Liberar la mesa"
            detalle="ya han pagado en el TPV de siempre"
            onClick={() => {
              setPaso('liberar');
            }}
          />
          {esJefe && (
            <Opcion
              titulo="Anular la mesa"
              detalle="con su motivo: queda apuntado"
              peligro
              onClick={() => {
                setPaso('anular');
              }}
            />
          )}
        </div>
      )}

      {paso === 'cambiar' && (
        <Elegir
          titulo="¿A qué mesa se cambian?"
          vacio="No hay ninguna mesa libre."
          alVolver={volver}
          opciones={libres.map((m) => ({
            id: m.id,
            texto: `Mesa ${m.nombre}`,
            detalle: `${m.zona} · ${m.plazas} plazas`,
          }))}
          alElegir={(id) => {
            void hacer('cambiar_de_mesa', { cuenta_id: cuenta.cuentaId, mesa_id: id });
          }}
        />
      )}

      {paso === 'juntar' && (
        <Elegir
          titulo="¿Con qué mesa se juntan?"
          vacio="No hay otra mesa abierta."
          ayuda={`Lo de la otra pasa a ${cuenta.titulo}, y la otra queda libre.`}
          alVolver={volver}
          opciones={otras.map((c) => ({
            id: c.cuentaId,
            texto: c.titulo,
            detalle: `${euros(c.totalCentimos)} € · ${c.camarero ?? ''}`,
          }))}
          alElegir={(id) => {
            void hacer('juntar_mesas', { cuenta_id: cuenta.cuentaId, con: id });
          }}
        />
      )}

      {paso === 'pasar' && (
        <Elegir
          titulo="¿A quién se la pasas?"
          vacio="No hay nadie más que tome nota en el local."
          alVolver={volver}
          opciones={plano.camareros
            .filter((c) => c.id !== cuenta.camareroId)
            .map((c) => ({ id: c.id, texto: c.nombre, detalle: '' }))}
          alElegir={(id) => {
            void hacer('pasar_a_otro_camarero', {
              cuenta_ids: [cuenta.cuentaId],
              camarero_id: id,
            });
          }}
        />
      )}

      {paso === 'nota' && (
        <Escribir
          etiqueta="Nota para cocina"
          valor={texto}
          alCambiar={setTexto}
          ejemplo="Tienen prisa · cumpleaños, el postre con vela…"
          alVolver={volver}
          haciendo={haciendo}
          boton="Guardar la nota"
          alGuardar={() => {
            void hacer('cambiar_la_mesa', {
              cuenta_id: cuenta.cuentaId,
              nota_para_cocina: texto.trim() === '' ? null : texto.trim(),
            });
          }}
        />
      )}

      {paso === 'personas' && (
        <div className="flex flex-col gap-e4">
          <Envoltorio id="personas-de-la-mesa" etiqueta="Nº de comensales">
            <input
              id="personas-de-la-mesa"
              inputMode="numeric"
              className={CAJA}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value.replace(/\D/g, '').slice(0, 2));
              }}
            />
          </Envoltorio>
          <Botonera alVolver={volver}>
            <Boton
              tono="principal"
              disabled={texto === '' || Number(texto) < 1}
              cargando={haciendo}
              onClick={() => {
                void hacer('cambiar_la_mesa', {
                  cuenta_id: cuenta.cuentaId,
                  personas: Number(texto),
                });
              }}
            >
              Guardar
            </Boton>
          </Botonera>
        </div>
      )}

      {paso === 'alergias' && (
        <div className="flex flex-col gap-e4">
          <p className="text-secundario text-texto-suave">
            Toca lo que no pueden tomar. Al pedir algo que lo lleve, te avisamos; y en cocina sale
            en rojo.
          </p>
          <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
            {ALERGENOS.map((a) => {
              const puesta = marcadas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={puesta}
                  onClick={() => {
                    setMarcadas(puesta ? marcadas.filter((x) => x !== a) : [...marcadas, a]);
                  }}
                  className={[
                    'min-h-toque-cocina rounded-grande border-2 px-e3 text-left font-bold',
                    puesta ? 'border-mal bg-mal-suave text-mal' : 'border-borde bg-superficie',
                  ].join(' ')}
                >
                  {NOMBRE_CORTO_DEL_ALERGENO[a]}
                </button>
              );
            })}
          </div>
          <Botonera alVolver={volver}>
            <Boton
              tono="principal"
              cargando={haciendo}
              onClick={() => {
                void hacer('cambiar_las_alergias', {
                  cuenta_id: cuenta.cuentaId,
                  alergenos: enSuOrden(marcadas),
                });
              }}
            >
              {marcadas.length === 0 && alergias.length > 0 ? 'Quitar las alergias' : 'Guardar'}
            </Boton>
          </Botonera>
        </div>
      )}

      {paso === 'liberar' && (
        <div className="flex flex-col gap-e4">
          {(cuenta.loSiguiente.que === 'mandar' || sinMandarAqui > 0) && (
            <p className="rounded-medio bg-atencion-suave px-e3 py-e2 font-semibold text-atencion">
              Tiene platos sin mandar: si la liberas, no llegarán a la cocina.
            </p>
          )}
          <p>
            La mesa queda libre en el plano. Hasta que se cobre con Estook TPV, cóbrala en tu TPV de
            siempre. Lo que quede en cocina se sigue haciendo.
          </p>
          <Botonera alVolver={volver}>
            <Boton
              tono="principal"
              cargando={haciendo}
              onClick={() => {
                void hacer('liberar_mesa', { cuenta_id: cuenta.cuentaId }, () => {
                  alCerrar();
                  irAlPlano();
                });
              }}
            >
              Liberar la mesa
            </Boton>
          </Botonera>
        </div>
      )}

      {paso === 'anular' && (
        <Escribir
          etiqueta="¿Por qué se anula?"
          valor={texto}
          alCambiar={setTexto}
          ejemplo="Se fueron sin pedir · se abrió por error…"
          alVolver={volver}
          haciendo={haciendo}
          boton="Anular la mesa"
          peligro
          minimo={3}
          alGuardar={() => {
            void hacer('anular_mesa', { cuenta_id: cuenta.cuentaId, motivo: texto.trim() }, () => {
              alCerrar();
              irAlPlano();
            });
          }}
        />
      )}
    </Hoja>
  );
}

function Opcion({
  titulo,
  detalle,
  onClick,
  fuerte = false,
  peligro = false,
}: {
  readonly titulo: string;
  readonly detalle: string;
  readonly onClick: () => void;
  readonly fuerte?: boolean;
  readonly peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-h-toque-cocina flex-col items-start justify-center rounded-grande px-e4 py-e2 text-left',
        fuerte ? 'bg-charcoal text-white' : 'border border-borde bg-superficie',
        peligro ? 'text-mal' : '',
      ].join(' ')}
    >
      <span className="font-bold">{titulo}</span>
      <span
        className={['text-secundario', fuerte ? 'text-white/80' : 'text-texto-suave'].join(' ')}
      >
        {detalle}
      </span>
    </button>
  );
}

function Botonera({
  alVolver,
  children,
}: {
  readonly alVolver: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-e2">
      <Boton tono="texto" onClick={alVolver}>
        Volver
      </Boton>
      {children}
    </div>
  );
}

function Elegir({
  titulo,
  vacio,
  ayuda,
  opciones,
  alElegir,
  alVolver,
}: {
  readonly titulo: string;
  readonly vacio: string;
  readonly ayuda?: string;
  readonly opciones: readonly { id: string; texto: string; detalle: string }[];
  readonly alElegir: (id: string) => void;
  readonly alVolver: () => void;
}) {
  return (
    <div className="flex flex-col gap-e3">
      <h3 className="text-seccion font-bold">{titulo}</h3>
      {ayuda !== undefined && <p className="text-secundario text-texto-suave">{ayuda}</p>}
      {opciones.length === 0 ? (
        <p className="text-texto-suave">{vacio}</p>
      ) : (
        <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                alElegir(o.id);
              }}
              className="flex min-h-toque-cocina flex-col items-start justify-center rounded-grande border border-borde bg-superficie px-e4 py-e2 text-left"
            >
              <span className="font-bold">{o.texto}</span>
              {o.detalle !== '' && (
                <span className="text-secundario text-texto-suave">{o.detalle}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <Botonera alVolver={alVolver}>{null}</Botonera>
    </div>
  );
}

function Escribir({
  etiqueta,
  valor,
  alCambiar,
  ejemplo,
  alVolver,
  alGuardar,
  haciendo,
  boton,
  peligro = false,
  minimo = 0,
}: {
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (valor: string) => void;
  readonly ejemplo: string;
  readonly alVolver: () => void;
  readonly alGuardar: () => void;
  readonly haciendo: boolean;
  readonly boton: string;
  readonly peligro?: boolean;
  readonly minimo?: number;
}) {
  return (
    <div className="flex flex-col gap-e4">
      <Envoltorio id="texto-de-la-mesa" etiqueta={etiqueta}>
        <textarea
          id="texto-de-la-mesa"
          rows={3}
          maxLength={200}
          className={[CAJA, 'min-h-[6rem] py-e2'].join(' ')}
          placeholder={ejemplo}
          value={valor}
          onChange={(e) => {
            alCambiar(e.target.value);
          }}
        />
      </Envoltorio>
      <Botonera alVolver={alVolver}>
        <Boton
          tono={peligro ? 'peligro' : 'principal'}
          disabled={valor.trim().length < minimo}
          cargando={haciendo}
          onClick={alGuardar}
        >
          {boton}
        </Boton>
      </Botonera>
    </div>
  );
}
