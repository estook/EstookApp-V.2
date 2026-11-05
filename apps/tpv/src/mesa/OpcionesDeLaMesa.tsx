import { useState, type ReactNode } from 'react';
import { ALERGENOS, enSuOrden, NOMBRE_CORTO_DEL_ALERGENO } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { puedeEditar } from '@estook/permisos';
import {
  IconoAtencion,
  IconoCambiarDeMesa,
  IconoCobrar,
  IconoEquipo,
  IconoCuaderno,
  IconoCuenta,
  IconoAnadir,
  IconoBien,
  IconoCerrar,
  IconoImprimir,
  IconoJuntar,
  IconoMas,
  IconoMover,
  IconoPases,
  IconoPersona,
  IconoPrisa,
  type Icono,
} from '@estook/iconos';
import { Boton, CAJA, Cargando, Envoltorio, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  usarAcciones,
  usarAlSegundo,
  usarLaMesa,
  usarLasImpresoras,
} from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano, ElPlano } from '../datos/tipos.ts';
import { elPase, losGruposDeLaCuenta } from '../logica/laCuenta.ts';
import { comensales, cuantoLlevan, euros, eurosConSimbolo, losNombres } from '../logica/texto.ts';
import { irAlPlano } from '../navegar.ts';
import { LaCuenta } from './LaCuenta.tsx';

/**
 * **La mesa, al tocarla** (0106, «MesaAcciones»; rehecha en la pausa del 5-nov, 0131).
 *
 * Antes salía una lista de trece opciones y los platos no se veían: para ver la cuenta había
 * que abrir la mesa y luego «Ver la cuenta». Ahora, en una hoja **del alto de lo que lleva**:
 *
 *   · **los platos**, con cómo va cada uno (la misma cuenta que dentro de la mesa), y el total
 *   · abajo, **los botones de siempre**: Pedir, Cuenta (imprimirla) y Cobrar (apagado hasta que
 *     se cobre con Estook TPV, M20C)
 *   · arriba, **tres iconos**: mover (cambiar de mesa, juntar, pasar a otro camarero), la nota
 *     para cocina y **«···»** con lo que se usa menos, lo que borra al final y en rojo
 *
 * Dentro de la mesa se abre igual, desde sus tres iconos, por el paso que toque.
 *
 * **Imprimir la cuenta y reimprimir la comanda** (T5 · 1, 0119), si hay impresora para ello:
 * lo imprime la caja para Windows, desde cualquier aparato. **Alergias** (T4 · 2, 0117): los
 * catorce, de un toque; al pedir lo que lleva alguno, la sala avisa, y en cocina sale en rojo.
 */

/** Por dónde se entra: la mesa entera (desde el plano), o uno de sus tres iconos. */
export type PasoDeLaMesa =
  | 'mesa'
  | 'mover'
  | 'mas'
  | 'cambiar'
  | 'juntar'
  | 'pasar'
  | 'nota'
  | 'personas'
  | 'alergias'
  | 'liberar'
  | 'anular';

/** De qué menú sale cada paso, para «Volver». */
const VUELVE_A: Readonly<Partial<Record<PasoDeLaMesa, PasoDeLaMesa>>> = {
  cambiar: 'mover',
  juntar: 'mover',
  pasar: 'mover',
  personas: 'mas',
  alergias: 'mas',
  liberar: 'mas',
  anular: 'mas',
};

export function OpcionesDeLaMesa({
  cuenta,
  plano,
  alCerrar,
  alAbrir,
  empiezaEn = 'mesa',
  sinMandarAqui = 0,
}: {
  readonly cuenta: CuentaEnElPlano;
  readonly plano: ElPlano;
  readonly alCerrar: () => void;
  /** «Pedir»: solo desde el plano; dentro de la mesa ya se está. */
  readonly alAbrir?: () => void;
  /** Por dónde se abre: desde el plano, la mesa entera; desde dentro, el icono tocado. */
  readonly empiezaEn?: PasoDeLaMesa;
  /** Lo pedido en esta tablet que aún no ha salido de ella (`comanda.ts`). */
  readonly sinMandarAqui?: number;
}) {
  const { porPases, notaParaCocina } = cuenta;
  const { yo } = usarSesion();
  const ejecutar = usarAcciones();
  const [paso, setPaso] = useState<PasoDeLaMesa>(empiezaEn);
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
  // Los platos de la mesa: los mismos que dentro de ella (y, desde dentro, ya leídos).
  const mesa = usarLaMesa(cuenta.cuentaId, usarAlSegundo());
  const grupos = losGruposDeLaCuenta(mesa.data, []);
  const hayParaLaCuenta = impresoras.data?.hayParaLaCuenta === true;

  /**
   * «Volver»: de una opción, a su menú; de un menú o de la nota, a la mesa si se entró por
   * ella (desde el plano), o se cierra si se entró por su icono (desde dentro de la mesa).
   */
  const volver = () => {
    setFallo(null);
    setTexto('');
    const menu = VUELVE_A[paso];
    if (menu !== undefined) setPaso(menu);
    else if (empiezaEn === 'mesa') setPaso('mesa');
    else alCerrar();
  };

  function imprimirLaCuenta() {
    setImpreso(null);
    void hacer('imprimir_la_cuenta', { cuenta_id: cuenta.cuentaId }, () => {
      setImpreso('La cuenta sale por la impresora de la caja.');
    });
  }

  const iconos = (
    <>
      <BotonRedondo
        etiqueta="Mover la mesa: cambiar, juntar o pasar"
        icono={IconoMover}
        onClick={() => {
          setPaso('mover');
        }}
      />
      <BotonRedondo
        etiqueta={
          notaParaCocina === null ? 'Nota para cocina' : `Nota para cocina: ${notaParaCocina}`
        }
        icono={IconoCuaderno}
        puesto={notaParaCocina !== null}
        onClick={() => {
          setTexto(notaParaCocina ?? '');
          setPaso('nota');
        }}
      />
      <BotonRedondo
        etiqueta="Más opciones de la mesa"
        icono={IconoMas}
        onClick={() => {
          setPaso('mas');
        }}
      />
    </>
  );

  const pie = (
    <div className="grid grid-cols-3 gap-e2">
      <BotonDeLaMesa
        icono={IconoAnadir}
        texto="Pedir"
        principal
        {...(alAbrir === undefined ? { apagado: 'ya estás dentro' } : { onClick: alAbrir })}
      />
      <BotonDeLaMesa
        icono={IconoCuenta}
        texto="Cuenta"
        etiqueta="Imprimir la cuenta"
        detalle={hayParaLaCuenta ? 'imprimir' : 'sin impresora'}
        {...(hayParaLaCuenta ? { onClick: imprimirLaCuenta } : { apagado: 'sin impresora' })}
      />
      {/* Cobrar llega con el cobro (M20C): se ve ya, apagado, para que nadie lo busque luego. */}
      <BotonDeLaMesa icono={IconoCobrar} texto="Cobrar" detalle="pronto" apagado="llega pronto" />
    </div>
  );

  return (
    <Hoja
      abierta
      ajustada
      alCerrar={alCerrar}
      titulo={cuenta.titulo}
      {...(paso === 'mesa' ? { acciones: iconos, pie } : {})}
    >
      {paso === 'mesa' && (
        <p className="mb-e2 mt-e2 text-secundario text-texto-suave">
          {[
            comensales(cuenta.personas),
            cuenta.camarero,
            `sentados hace ${cuantoLlevan(cuenta.minutos)}`,
          ]
            .filter((x) => x !== null)
            .join(' · ')}
        </p>
      )}

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

      {paso === 'mesa' && (
        <div className="flex flex-col gap-e2">
          {alergias.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMarcadas(alergias);
                setPaso('alergias');
              }}
              className="flex min-h-toque items-center gap-e1 self-start font-bold text-mal"
            >
              <IconoAtencion size={18} aria-hidden />
              {losNombres(alergias)}
            </button>
          )}
          {toca !== null && (
            <Boton
              tono="principal"
              tamano="l"
              ancho
              cargando={haciendo}
              onClick={() => {
                void hacer('marchar', { cuenta_id: cuenta.cuentaId, pase: toca }, () => undefined);
              }}
            >
              Marchar el {elPase(toca)}
            </Boton>
          )}
          {mesa.data === undefined ? (
            <Cargando que="los platos de la mesa" forma="lista" lineas={3} />
          ) : (
            <LaCuenta
              grupos={grupos}
              borrador={[]}
              alCambiarElBorrador={() => undefined}
              porPases={mesa.data.porPases}
              pases={mesa.data.pases.map((p) => p.numero)}
              tocaMarchar={toca}
              sinPreguntarAlMarchar={impresoras.data?.cocinaSaleEn === 'papel'}
              alMarchar={(pase) => {
                void hacer('marchar', { cuenta_id: cuenta.cuentaId, pase }, () => undefined);
              }}
            />
          )}
          <div className="flex items-baseline justify-between border-t border-borde pt-e3">
            <span className="font-bold">Total</span>
            <span className="text-cifra">{eurosConSimbolo(cuenta.totalCentimos)}</span>
          </div>
        </div>
      )}

      {/* **Mover**: las tres que cambian de sitio la mesa o de quién es, juntas. */}
      {paso === 'mover' && (
        <Menu alVolver={volver} volverEsCerrar={empiezaEn !== 'mesa'}>
          <OpcionDelMenu
            icono={IconoCambiarDeMesa}
            texto={cuenta.tipo === 'mesa' ? 'Cambiar de mesa' : 'Llevar a una mesa'}
            onClick={() => {
              setPaso('cambiar');
            }}
          />
          <OpcionDelMenu
            icono={IconoJuntar}
            texto="Juntar con otra mesa"
            onClick={() => {
              setPaso('juntar');
            }}
          />
          <OpcionDelMenu
            icono={IconoPersona}
            texto="Pasar a otro camarero"
            onClick={() => {
              setPaso('pasar');
            }}
          />
          {/* **Cualquiera se queda o pasa cualquier mesa**, con rastro (0107, Anexo 11.8). */}
          {cuenta.camareroId !== yo.personaId && (
            <OpcionDelMenu
              icono={IconoBien}
              texto="Quedármela"
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
        </Menu>
      )}

      {/* **«···»**: lo que se usa menos; lo que borra, al final y en rojo. */}
      {paso === 'mas' && (
        <Menu alVolver={volver} volverEsCerrar={empiezaEn !== 'mesa'}>
          <OpcionDelMenu
            icono={IconoAtencion}
            texto={alergias.length === 0 ? 'Alergias' : `Alergias · ${losNombres(alergias)}`}
            peligro={alergias.length > 0}
            onClick={() => {
              setMarcadas(alergias);
              setPaso('alergias');
            }}
          />
          <OpcionDelMenu
            icono={IconoPrisa}
            texto={cuenta.conPrisa ? 'Ya no tienen prisa' : 'Tienen prisa'}
            onClick={() => {
              void hacer('cambiar_la_prisa', {
                cuenta_id: cuenta.cuentaId,
                con_prisa: !cuenta.conPrisa,
              });
            }}
          />
          <OpcionDelMenu
            icono={IconoEquipo}
            texto={`Comensales · ${cuenta.personas === null ? 'sin decir' : String(cuenta.personas)}`}
            onClick={() => {
              setTexto(cuenta.personas === null ? '' : String(cuenta.personas));
              setPaso('personas');
            }}
          />
          {/* Lo de llevar sale siempre todo junto (28-oct): ni pases ni «Sacadlo todo». */}
          {cuenta.tipo !== 'para_llevar' && (
            <OpcionDelMenu
              icono={IconoPases}
              texto={porPases ? 'Sacadlo todo junto' : 'Por pases'}
              onClick={() => {
                void hacer('cambiar_la_mesa', { cuenta_id: cuenta.cuentaId, por_pases: !porPases });
              }}
            />
          )}
          {/* Dentro de la mesa no hay botón de la cuenta: aquí. */}
          {empiezaEn !== 'mesa' && hayParaLaCuenta && (
            <OpcionDelMenu
              icono={IconoCuenta}
              texto="Imprimir la cuenta"
              onClick={imprimirLaCuenta}
            />
          )}
          {impresoras.data?.hayParaLaComanda === true && (
            <OpcionDelMenu
              icono={IconoImprimir}
              texto="Reimprimir la comanda"
              onClick={() => {
                setImpreso(null);
                void hacer('reimprimir_la_comanda', { cuenta_id: cuenta.cuentaId }, () => {
                  setImpreso('La comanda sale otra vez, marcada «COPIA».');
                });
              }}
            />
          )}
          <hr className="my-e1 border-borde" />
          <OpcionDelMenu
            icono={IconoBien}
            texto="Liberar la mesa"
            onClick={() => {
              setPaso('liberar');
            }}
          />
          {esJefe && (
            <OpcionDelMenu
              icono={IconoCerrar}
              texto="Anular la mesa"
              peligro
              onClick={() => {
                setPaso('anular');
              }}
            />
          )}
        </Menu>
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

/** Uno de los tres iconos de arriba: mover, la nota y «···». Con su nombre para quien no ve. */
function BotonRedondo({
  etiqueta,
  icono: Dibujo,
  onClick,
  puesto = false,
}: {
  readonly etiqueta: string;
  readonly icono: Icono;
  readonly onClick: () => void;
  /** Con algo dentro: la nota escrita se nota en el icono, en naranja. */
  readonly puesto?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className={[
        'grid size-toque place-items-center rounded-redondo',
        puesto ? 'bg-naranja-suave text-naranja' : 'bg-fondo text-texto',
      ].join(' ')}
    >
      <Dibujo size={20} aria-hidden />
    </button>
  );
}

/**
 * Un botón de abajo: Pedir, Cuenta y Cobrar, con su icono encima y grande, que en pleno
 * servicio se pulsa con el pulgar. Apagado dice por qué, también a quien no ve.
 */
function BotonDeLaMesa({
  icono: Dibujo,
  texto,
  etiqueta = texto,
  detalle,
  principal = false,
  onClick,
  apagado,
}: {
  readonly icono: Icono;
  readonly texto: string;
  /** Lo que oye quien no ve, si dice más que el texto: «Imprimir la cuenta». */
  readonly etiqueta?: string;
  readonly detalle?: string;
  readonly principal?: boolean;
  readonly onClick?: () => void;
  /** Por qué no se puede: «llega pronto», «sin impresora». */
  readonly apagado?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={apagado !== undefined}
      aria-label={apagado === undefined ? etiqueta : `${etiqueta}: ${apagado}`}
      className={[
        'flex min-h-toque-cocina flex-col items-center justify-center gap-[2px] rounded-grande px-e2 py-e2 font-bold disabled:opacity-45',
        principal ? 'bg-naranja text-sobre-naranja' : 'bg-fondo text-texto',
      ].join(' ')}
    >
      <Dibujo size={22} aria-hidden />
      <span>{texto}</span>
      {detalle !== undefined && (
        <span
          className={[
            'text-etiqueta font-semibold',
            principal ? 'text-sobre-naranja/80' : 'text-texto-suave',
          ].join(' ')}
        >
          {detalle}
        </span>
      )}
    </button>
  );
}

/** Un menú de la mesa (mover o «···»): sus opciones en filas, y abajo «Volver» o «Cerrar». */
function Menu({
  children,
  alVolver,
  volverEsCerrar,
}: {
  readonly children: ReactNode;
  readonly alVolver: () => void;
  /** Se entró por el icono, desde dentro de la mesa: volver es cerrar. */
  readonly volverEsCerrar: boolean;
}) {
  return (
    <div className="flex flex-col gap-e1 pt-e3">
      {children}
      <div className="flex justify-end pt-e2">
        <Boton tono="texto" onClick={alVolver}>
          {volverEsCerrar ? 'Cerrar' : 'Volver'}
        </Boton>
      </div>
    </div>
  );
}

/** Una fila de un menú: su icono y lo que hace, en una línea; lo que borra, en rojo. */
function OpcionDelMenu({
  icono: Dibujo,
  texto,
  detalle,
  onClick,
  peligro = false,
}: {
  readonly icono: Icono;
  readonly texto: string;
  readonly detalle?: string;
  readonly onClick: () => void;
  readonly peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-h-toque-cocina items-center gap-e3 rounded-grande px-e3 text-left hover:bg-fondo',
        peligro ? 'text-mal' : 'text-texto',
      ].join(' ')}
    >
      <Dibujo size={22} aria-hidden className="shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{texto}</span>
        {detalle !== undefined && (
          <span className="text-secundario text-texto-suave">{detalle}</span>
        )}
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
