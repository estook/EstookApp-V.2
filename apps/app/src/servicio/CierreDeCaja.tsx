import { useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  NOMBRE_DEL_ORIGEN_DEL_CIERRE,
  claveDePlato,
  importeDeLinea,
  leerUnCsvDeCierre,
  loQueNoCuadra,
  ticketMedio,
  type Centimos,
} from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  Cifra,
  ErrorEnCristiano,
  EstadoVacio,
  Tarjeta,
} from '@estook/ui';
import { IconoAnadir, IconoBorrar, IconoCamara, IconoDocumento } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ComoEntranTusVentas } from './ComoEntranTusVentas.tsx';
import { comoSeLeeElDia, type ElCierreDeUnDia } from './contrato.ts';
import { comoDinero } from '../inventario/contrato.ts';

/**
 * Servicio · Jornada · Cierre (M6½).
 *
 * «Poner cierre de caja a mano, CSV o foto, para los que no quieren conectar:
 * cuánto dinero has sacado, qué platos han salido y cuántos, así la app puede
 * calcular. Explicar cómo hacerlo.»
 *
 * ── Cómo se hace, y por qué en este orden ───────────────────────────────────
 *
 *   1. **El total.** Es lo único obligatorio, y lo que dice el papel de la caja.
 *   2. **Cómo se cobró**, si se quiere: efectivo, tarjeta y otros. No tiene que
 *      cuadrar al céntimo —en un bar casi nunca cuadra— y no bloquea: se enseña la
 *      diferencia y decide una persona.
 *   3. **Qué platos salieron**, si se tiene. A mano, o subiendo el fichero de
 *      ventas del TPV, que los rellena solos.
 *
 * Con lo primero ya hay ventas, ticket medio y food cost del día. Con lo tercero,
 * cuando llegue la carta (M10), Estook sabrá qué consumo genera cada plato.
 *
 * ── Y la foto del Z ─────────────────────────────────────────────────────────
 *
 * El botón está y **no se puede pulsar**: leer una foto y sacar de ahí las cifras
 * es Fogón, que llega con M22. Se deja el sitio hecho porque saber que va a poder
 * hacerse cambia cómo se usa esto hoy, y no se pone a funcionar a medias porque un
 * botón que promete y no hace es el fallo que este proyecto persigue desde M4.
 */
export function CierreDeCaja() {
  const { cliente, permisos } = usarSesion();
  const [parametros, ponerParametros] = useSearchParams();
  const navegar = useNavigate();
  const fecha = parametros.get('fecha');
  const [editando, setEditando] = useState(false);

  const consulta = useQuery({
    queryKey: ['un_cierre', fecha ?? ''],
    enabled: puedeVer(permisos, 'dato.ventas'),
    queryFn: async (): Promise<ElCierreDeUnDia> => {
      const respuesta = await cliente.consultar<ElCierreDeUnDia>(
        'un_cierre',
        fecha === null ? {} : { fecha },
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  // Un camarero tiene Servicio y no tiene las ventas del local: la matriz de M1
  // se lo niega a propósito. No se le pinta un formulario que el servidor le va a
  // rechazar; se le dice quién lo hace.
  if (!puedeVer(permisos, 'dato.ventas')) {
    return (
      <Tarjeta titulo="El cierre de caja">
        <EstadoVacio
          compacto
          titulo="Lo cierra quien lleva la caja"
          frase="Las ventas del local no están en tu acceso."
          sinAccionPorque="Lo hace el encargado o la gerencia."
        />
      </Tarjeta>
    );
  }

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="el cierre" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer el cierre">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const cambiarDeDia = (nueva: string) => {
    const nuevos = new URLSearchParams(parametros);
    if (nueva === '') nuevos.delete('fecha');
    else nuevos.set('fecha', nueva);
    ponerParametros(nuevos, { replace: true });
    setEditando(false);
  };

  return (
    <div className="flex max-w-[48rem] flex-col gap-e4">
      {datos.comoSeCierra === 'sin_decidir' && <ComoEntranTusVentas modo="ajustes" />}

      <div className="flex flex-wrap items-end justify-between gap-e3">
        <div className="w-[12rem]">
          <Campo
            etiqueta="Día"
            tipo="fecha"
            value={datos.fecha}
            onChange={(e) => {
              cambiarDeDia(e.currentTarget.value);
            }}
          />
        </div>
        <Boton
          tono="texto"
          onClick={() => {
            navegar('/negocio/ventas');
          }}
        >
          Ver todas las ventas
        </Boton>
      </div>

      {datos.cierre !== null && !editando ? (
        <Resumen
          datos={datos}
          alCorregir={() => {
            setEditando(true);
          }}
        />
      ) : datos.puedeCerrar ? (
        <Formulario
          key={`${datos.fecha}-${datos.cierre?.cierreId ?? 'nuevo'}`}
          datos={datos}
          alTerminar={() => {
            setEditando(false);
          }}
          {...(datos.cierre === null
            ? {}
            : {
                alDejarlo: () => {
                  setEditando(false);
                },
              })}
        />
      ) : (
        <Tarjeta titulo={`Sin cerrar · ${comoSeLeeElDia(datos.fecha)}`}>
          <p className="text-secundario text-texto-suave">
            Esta caja no está cerrada, y cerrarla no está en tu acceso.
          </p>
        </Tarjeta>
      )}
    </div>
  );
}

// ── Un cierre ya hecho ───────────────────────────────────────────────────────

function Resumen({
  datos,
  alCorregir,
}: {
  readonly datos: ElCierreDeUnDia;
  readonly alCorregir: () => void;
}) {
  const cierre = datos.cierre;
  if (cierre === null) return null;
  const medio = ticketMedio(cierre.totalCentimos, cierre.tickets);
  const diferencia = loQueNoCuadra(cierre.totalCentimos, cierre);

  return (
    <Tarjeta
      titulo={`Caja cerrada · ${comoSeLeeElDia(datos.fecha)}`}
      acento="var(--color-app-servicio)"
      origen={`${nombreEn(NOMBRE_DEL_ORIGEN_DEL_CIERRE, cierre.origen, cierre.origen)}${cierre.quien === null ? '' : ` · por ${cierre.quien}`}`}
      accion={
        datos.puedeCerrar ? (
          <Boton tono="texto" onClick={alCorregir}>
            Corregir
          </Boton>
        ) : undefined
      }
    >
      <div className="grid gap-e3 sm:grid-cols-3">
        <Cifra
          etiqueta="Facturado"
          valor={cierre.totalCentimos}
          formato={(v) => comoDinero(v)}
          origen="Con IVA, tal cual la caja"
        />
        <Cifra
          etiqueta="Tickets"
          valor={cierre.tickets ?? 0}
          formato={(v) => (cierre.tickets === null ? '—' : String(v))}
          origen={medio === null ? 'Sin contar' : `Ticket medio ${comoDinero(medio)}`}
        />
        <Cifra
          etiqueta="Comensales"
          valor={cierre.comensales ?? 0}
          formato={(v) => (cierre.comensales === null ? '—' : String(v))}
          origen="Si se contaron"
        />
      </div>

      {(cierre.efectivoCentimos !== null ||
        cierre.tarjetaCentimos !== null ||
        cierre.otrosCentimos !== null) && (
        <p className="mt-e3 text-secundario text-texto-suave">
          Efectivo {comoDinero(cierre.efectivoCentimos)} · tarjeta{' '}
          {comoDinero(cierre.tarjetaCentimos)} · otros {comoDinero(cierre.otrosCentimos)}
          {diferencia !== null && diferencia !== 0 && (
            <strong className="text-atencion">
              {' '}
              · {diferencia > 0 ? 'sobran' : 'faltan'} {comoDinero(Math.abs(diferencia))}
            </strong>
          )}
        </p>
      )}

      {datos.lineas.length > 0 && (
        <>
          <h3 className="mt-e4 text-etiqueta uppercase tracking-wide text-texto-suave">
            Lo que salió
          </h3>
          <ul className="mt-e2 flex flex-col">
            {datos.lineas.map((linea, indice) => (
              <li
                key={`${linea.concepto}-${indice}`}
                className="flex items-baseline justify-between gap-e2 border-b border-borde py-e1 last:border-0"
              >
                <span className="min-w-0 truncate">{linea.concepto}</span>
                <span className="shrink-0 text-secundario text-texto-suave tabular-nums">
                  {linea.unidades.toLocaleString('es-ES')}
                  {linea.importeCentimos === null ? '' : ` · ${comoDinero(linea.importeCentimos)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {cierre.notas !== null && cierre.notas.trim() !== '' && (
        <p className="mt-e3 text-secundario text-texto-suave">«{cierre.notas}»</p>
      )}
    </Tarjeta>
  );
}

// ── Cerrar, o corregir ───────────────────────────────────────────────────────

interface LineaEnElFormulario {
  readonly concepto: string;
  readonly unidades: string;
  readonly importe: Centimos | null;
  /**
   * Si el importe lo ha escrito una persona. Mientras no, se propone solo con el
   * precio del plato; en cuanto alguien lo toca, manda lo que ha escrito.
   */
  readonly importeTocado: boolean;
}

function Formulario({
  datos,
  alTerminar,
  alDejarlo,
}: {
  readonly datos: ElCierreDeUnDia;
  readonly alTerminar: () => void;
  readonly alDejarlo?: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const antes = datos.cierre;

  const [total, setTotal] = useState<Centimos | null>(
    (antes?.totalCentimos ?? null) as Centimos | null,
  );
  const [efectivo, setEfectivo] = useState<Centimos | null>(
    (antes?.efectivoCentimos ?? null) as Centimos | null,
  );
  const [tarjeta, setTarjeta] = useState<Centimos | null>(
    (antes?.tarjetaCentimos ?? null) as Centimos | null,
  );
  const [otros, setOtros] = useState<Centimos | null>(
    (antes?.otrosCentimos ?? null) as Centimos | null,
  );
  const [tickets, setTickets] = useState(
    antes?.tickets === null || antes === null ? '' : String(antes.tickets),
  );
  const [comensales, setComensales] = useState(
    antes?.comensales === null || antes === null ? '' : String(antes.comensales),
  );
  const [notas, setNotas] = useState(antes?.notas ?? '');
  const [lineas, setLineas] = useState<readonly LineaEnElFormulario[]>(
    datos.lineas.map((l) => ({
      concepto: l.concepto,
      unidades: String(l.unidades),
      importe: l.importeCentimos as Centimos | null,
      importeTocado: true,
    })),
  );
  const [origen, setOrigen] = useState<'a_mano' | 'csv'>(
    antes?.origen === 'csv' ? 'csv' : 'a_mano',
  );
  const [noEntendidas, setNoEntendidas] = useState<readonly number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  /*
    ── El importe de cada plato, propuesto y no pedido ─────────────────────────
    «Pones el importe de cada plato a mano: poner el que tiene en la carta, y que
    se pueda cambiar.» La carta es M10; hasta entonces el precio sale de **la
    última vez que se apuntó ese plato**. Se escribe «croquetas», se pone cuántas
    y el importe sale solo; si no es ese, se cambia y manda lo escrito.
  */
  const precioDe = new Map(datos.platosConocidos.map((p) => [p.clave, p.precioUnidadCentimos]));
  const precioDelPlato = (concepto: string) => precioDe.get(claveDePlato(concepto)) ?? null;
  const propuesto = (concepto: string, unidades: string): Centimos | null => {
    const precio = precioDelPlato(concepto);
    const cuantos = Number(unidades.replace(',', '.'));
    return precio === null || !(cuantos > 0) ? null : importeDeLinea(precio, cuantos);
  };

  const diferencia =
    total === null
      ? null
      : loQueNoCuadra(total, {
          efectivoCentimos: efectivo,
          tarjetaCentimos: tarjeta,
          otrosCentimos: otros,
        });

  /**
   * Leer el fichero de ventas del TPV.
   *
   * El trabajo lo hace `leerUnCsvDeCierre`, del dominio, que sabe del `;` español,
   * de la coma decimal y del euro pegado al número. Lo que no entiende **no lo
   * tira en silencio**: se dice qué filas son, para que nadie importe diecinueve
   * de veinte platos y se quede tan ancho.
   */
  async function leerFichero(fichero: File) {
    const texto = await fichero.text();
    const leido = leerUnCsvDeCierre(texto);
    setLineas(
      leido.lineas.map((l) => ({
        concepto: l.concepto,
        unidades: String(l.unidades),
        // El fichero trae su importe, y ese manda. Si no lo trae, se propone.
        importe:
          l.importeCentimos === null
            ? propuesto(l.concepto, String(l.unidades))
            : (l.importeCentimos as Centimos),
        importeTocado: l.importeCentimos !== null,
      })),
    );
    setNoEntendidas(leido.noEntendidas.map((f) => f.fila));
    setOrigen('csv');
    // El total se **propone**, no se impone: lo que dice el papel de la caja manda
    // sobre lo que sumen las líneas, que pueden no traer las propinas o los vales.
    if (total === null && leido.sumaCentimos > 0) setTotal(leido.sumaCentimos as Centimos);
  }

  async function guardar() {
    if (total === null) return;
    setError(null);
    setGuardando(true);
    const numero = (texto: string) => (texto.trim() === '' ? null : Math.trunc(Number(texto)));

    const respuesta = await cliente.ejecutar<{ seHaCorregido: boolean }>('cerrar_la_caja', {
      fecha: datos.fecha,
      total_centimos: total,
      efectivo_centimos: efectivo,
      tarjeta_centimos: tarjeta,
      otros_centimos: otros,
      tickets: numero(tickets),
      comensales: numero(comensales),
      origen,
      notas: notas.trim() === '' ? null : notas.trim(),
      lineas: lineas
        .filter((l) => l.concepto.trim() !== '' && Number(l.unidades.replace(',', '.')) > 0)
        .map((l) => ({
          concepto: l.concepto.trim(),
          unidades: Number(l.unidades.replace(',', '.')),
          importe_centimos: l.importe,
        })),
    });
    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    setHecho(respuesta.datos.seHaCorregido ? 'Cierre corregido' : 'Caja cerrada');
    await cache.invalidateQueries({ queryKey: ['un_cierre'] });
    await cache.invalidateQueries({ queryKey: ['mis_cierres'] });
    alTerminar();
  }

  return (
    <Tarjeta
      titulo={
        antes === null
          ? `Cerrar la caja · ${comoSeLeeElDia(datos.fecha)}`
          : `Corregir el cierre · ${comoSeLeeElDia(datos.fecha)}`
      }
      acento="var(--color-app-servicio)"
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {hecho !== null && (
          <Aviso tono="bien" titulo={hecho} esNoticia>
            Ya cuenta en las ventas del día.
          </Aviso>
        )}

        {/* ── Cómo se hace, en tres líneas ───────────────────────────────── */}
        <ol className="flex list-decimal flex-col gap-e1 pl-e4 text-secundario text-texto-suave">
          <li>Saca el cierre (el «Z») de tu caja y escribe el total.</li>
          <li>Si quieres, cuánto fue en efectivo y cuánto con tarjeta.</li>
          <li>Si tu TPV saca un fichero con las ventas por plato, súbelo y se rellenan solos.</li>
        </ol>

        {/* ── 1 · El total ─────────────────────────────────────────────── */}
        <CampoMoneda
          etiqueta="Total facturado"
          ayuda="Con IVA, como lo dice la caja."
          valor={total}
          alCambiar={setTotal}
        />

        {/* ── 2 · Cómo se cobró ────────────────────────────────────────── */}
        <div className="grid gap-e3 sm:grid-cols-3">
          <CampoMoneda etiqueta="Efectivo" valor={efectivo} alCambiar={setEfectivo} />
          <CampoMoneda etiqueta="Tarjeta" valor={tarjeta} alCambiar={setTarjeta} />
          <CampoMoneda etiqueta="Otros" valor={otros} alCambiar={setOtros} />
        </div>
        {diferencia !== null && diferencia !== 0 && (
          <p aria-live="polite" className="text-secundario text-atencion">
            El desglose {diferencia > 0 ? 'se pasa' : 'se queda corto'} en{' '}
            {comoDinero(Math.abs(diferencia))}. Se puede guardar igual.
          </p>
        )}

        <div className="grid gap-e3 sm:grid-cols-2">
          <Campo
            etiqueta="Tickets"
            tipo="numero"
            ayuda="Opcional. Con esto sale el ticket medio."
            value={tickets}
            onChange={(e) => {
              setTickets(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Comensales"
            tipo="numero"
            ayuda="Opcional."
            value={comensales}
            onChange={(e) => {
              setComensales(e.currentTarget.value);
            }}
          />
        </div>

        {/* ── 3 · Qué salió ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e2">
          <div className="flex flex-wrap items-center justify-between gap-e2">
            <h3 className="text-seccion font-semibold">Qué platos salieron</h3>
            <div className="flex flex-wrap gap-e2">
              <label className="inline-flex min-h-toque cursor-pointer items-center gap-e2 rounded-medio border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo">
                <IconoDocumento size={16} />
                Subir el fichero del TPV
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const fichero = e.currentTarget.files?.[0];
                    if (fichero !== undefined) void leerFichero(fichero);
                  }}
                />
              </label>
              {/* La foto del Z, apagada con su motivo: leer una foto es Fogón (M22). */}
              <Boton
                tono="secundario"
                disabled
                icono={<IconoCamara size={16} />}
                onClick={() => undefined}
              >
                Con una foto · M22
              </Boton>
            </div>
          </div>

          {noEntendidas.length > 0 && (
            <Aviso tono="atencion" titulo="Hay filas que no he entendido">
              Las filas {noEntendidas.join(', ')} del fichero no tenían un plato y una cantidad. El
              resto está abajo: revísalo antes de guardar.
            </Aviso>
          )}

          {/* Los platos que ya se han apuntado alguna vez, para elegirlos. */}
          <datalist id="platos-conocidos">
            {datos.platosConocidos.map((plato) => (
              <option key={plato.clave} value={plato.concepto} />
            ))}
          </datalist>

          {lineas.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              Opcional. El importe se pone solo con el precio de la última vez; cuando exista la
              carta, con el de la carta.
            </p>
          ) : (
            <ul className="flex flex-col gap-e2">
              {lineas.map((linea, indice) => (
                <li
                  key={indice}
                  className="grid grid-cols-[1fr_5rem_8rem_auto] items-end gap-e2 border-b border-borde pb-e2"
                >
                  <Campo
                    etiqueta="Plato"
                    list="platos-conocidos"
                    value={linea.concepto}
                    onChange={(e) => {
                      const valor = e.currentTarget.value;
                      setLineas((todas) =>
                        todas.map((l, i) =>
                          i === indice
                            ? {
                                ...l,
                                concepto: valor,
                                ...(l.importeTocado
                                  ? {}
                                  : { importe: propuesto(valor, l.unidades) }),
                              }
                            : l,
                        ),
                      );
                    }}
                  />
                  <Campo
                    etiqueta="Cuántos"
                    tipo="numero"
                    value={linea.unidades}
                    onChange={(e) => {
                      const valor = e.currentTarget.value;
                      setLineas((todas) =>
                        todas.map((l, i) =>
                          i === indice
                            ? {
                                ...l,
                                unidades: valor,
                                ...(l.importeTocado
                                  ? {}
                                  : { importe: propuesto(l.concepto, valor) }),
                              }
                            : l,
                        ),
                      );
                    }}
                  />
                  <CampoMoneda
                    etiqueta="Importe"
                    valor={linea.importe}
                    alCambiar={(valor) => {
                      // Borrarlo devuelve la propuesta: vacío no es «lo he tocado».
                      setLineas((todas) =>
                        todas.map((l, i) =>
                          i === indice
                            ? { ...l, importe: valor, importeTocado: valor !== null }
                            : l,
                        ),
                      );
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar ${linea.concepto === '' ? 'esta línea' : linea.concepto}`}
                    onClick={() => {
                      setLineas((todas) => todas.filter((_, i) => i !== indice));
                    }}
                    className="grid size-[44px] place-items-center rounded-medio text-texto-suave hover:bg-fondo hover:text-mal"
                  >
                    <IconoBorrar size={18} />
                  </button>
                  {!linea.importeTocado &&
                    linea.importe !== null &&
                    precioDelPlato(linea.concepto) !== null && (
                      <p className="col-span-full text-etiqueta text-texto-suave">
                        A {comoDinero(precioDelPlato(linea.concepto))} cada uno, como la última vez.
                        Cámbialo si no es así.
                      </p>
                    )}
                </li>
              ))}
            </ul>
          )}

          <div>
            <Boton
              tono="texto"
              icono={<IconoAnadir size={16} />}
              onClick={() => {
                setLineas((todas) => [
                  ...todas,
                  { concepto: '', unidades: '1', importe: null, importeTocado: false },
                ]);
              }}
            >
              Añadir un plato
            </Boton>
          </div>
        </section>

        <Campo
          etiqueta="Notas"
          ayuda="Opcional. «Faltan 10 € de un vale», «cerró Marta»."
          value={notas}
          onChange={(e) => {
            setNotas(e.currentTarget.value);
          }}
        />

        <Botones>
          {alDejarlo !== undefined && (
            <Boton tono="texto" onClick={alDejarlo}>
              Dejarlo como estaba
            </Boton>
          )}
          <Boton
            tono="principal"
            disabled={total === null || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            {antes === null ? 'Cerrar la caja' : 'Guardar la corrección'}
          </Boton>
        </Botones>
      </div>
    </Tarjeta>
  );
}
