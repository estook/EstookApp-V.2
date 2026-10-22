import { useRef, useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CREDITOS_DE_FOGON,
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
import { IconoAnadir, IconoBorrar, IconoDocumento } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CifrasDeLaApp } from '../panel/CifrasDeLaApp.tsx';
import { ComoEntranTusVentas } from './ComoEntranTusVentas.tsx';
import {
  comoSeLeeElDia,
  comoSeLeeLaHoraDe,
  conLaJornada,
  type ElCierreDeUnDia,
} from './contrato.ts';
import { ElRepaso, LasMermasDelDia, LosPasos, type Paso } from './LosPasosDelCierre.tsx';
import { comoDinero } from '../almacen/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { FotoParaFogon } from '../fogon/FotoParaFogon.tsx';
import { AvisoDelBorrador } from '../fogon/PedirleAFogon.tsx';
import type { CierreLeido, FogonYYo } from '../fogon/contrato.ts';

/**
 * Servicio · Jornada · Cierre (M6½), que desde M16a es **cerrar el día** (0105).
 *
 * «Cierre en cuatro pasos y sesenta segundos» (Manifiesto): de dónde salen las ventas, las
 * mermas, el APPCC que falte y un repaso que queda a nombre de quien cierra. **Son tres
 * mientras no exista el APPCC** (M16b): un paso que no tiene nada que hacer no se enseña.
 * Y queda a tu nombre por tu sesión, sin PIN en tu móvil (Richi, 22-oct).
 *
 * Un día cerrado ya no se corrige sin más: se **reabre con un motivo**, que queda a la
 * vista en el cierre, y se vuelve a cerrar (Auditoría de Flujos, la jornada).
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

  const consulta = useQuery({
    queryKey: ['un_cierre', fecha ?? ''],
    enabled: puedeVer(permisos, 'dato.ventas'),
    queryFn: async (): Promise<ElCierreDeUnDia> => {
      const respuesta = await cliente.consultar<ElCierreDeUnDia>(
        'un_cierre',
        fecha === null ? {} : { fecha },
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return conLaJornada(respuesta.datos);
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
          dibujo="candado"
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

      {datos.cierre !== null && datos.jornada.estado === 'cerrada' ? (
        <Resumen datos={datos} />
      ) : datos.puedeCerrar ? (
        <Formulario
          key={`${datos.fecha}-${datos.cierre?.cierreId ?? 'nuevo'}-${datos.jornada.estado}`}
          datos={datos}
        />
      ) : (
        <Tarjeta titulo={`Sin cerrar · ${comoSeLeeElDia(datos.fecha)}`}>
          <p className="text-secundario text-texto-suave">
            Esta caja no está cerrada, y cerrarla no está en tu acceso.
          </p>
        </Tarjeta>
      )}

      {/*
        «Cómo va» · ventas, ticket medio, food cost y cajas cerradas, con su flecha
        (V, punto 2). Debajo del cierre del día, que es lo que se viene a hacer; son
        las mismas cuentas que `mis_cierres`, y el food cost lo vigila una prueba.
      */}
      <CifrasDeLaApp app="servicio" />
    </div>
  );
}

// ── Un cierre ya hecho ───────────────────────────────────────────────────────

function Resumen({ datos }: { readonly datos: ElCierreDeUnDia }) {
  const [reabriendo, setReabriendo] = useState(false);
  const cierre = datos.cierre;
  if (cierre === null) return null;
  const medio = ticketMedio(cierre.totalCentimos, cierre.tickets);
  const diferencia = loQueNoCuadra(cierre.totalCentimos, cierre);

  return (
    <Tarjeta
      titulo={`Día cerrado · ${comoSeLeeElDia(datos.fecha)}`}
      acento="var(--color-app-servicio)"
      origen={`${nombreEn(NOMBRE_DEL_ORIGEN_DEL_CIERRE, cierre.origen, cierre.origen)}${cierre.quien === null ? '' : ` · por ${cierre.quien}`} · a las ${comoSeLeeLaHoraDe(cierre.cerradoEn)}`}
      accion={
        datos.puedeCerrar && !reabriendo ? (
          <Boton
            tono="texto"
            onClick={() => {
              setReabriendo(true);
            }}
          >
            Reabrir
          </Boton>
        ) : undefined
      }
    >
      {reabriendo && (
        <Reabrir
          fecha={datos.fecha}
          alDejarlo={() => {
            setReabriendo(false);
          }}
        />
      )}

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
          <h3 className="mt-e4 text-secundario font-medium text-texto-suave">Lo que salió</h3>
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

      <LasReaperturas reaperturas={datos.jornada.reaperturas} />
    </Tarjeta>
  );
}

/** Las veces que se reabrió el día, con su motivo: a la vista de quien mira el cierre. */
function LasReaperturas({
  reaperturas,
}: {
  readonly reaperturas: ElCierreDeUnDia['jornada']['reaperturas'];
}) {
  if (reaperturas.length === 0) return null;
  return (
    <ul className="mt-e3 flex flex-col gap-e1 border-t border-borde pt-e3 text-secundario text-texto-suave">
      {reaperturas.map((r) => (
        <li key={r.cuando}>
          Reabierto {r.quien === null ? '' : `por ${r.quien} `}el{' '}
          {comoSeLeeElDia(r.cuando.slice(0, 10))} a las {comoSeLeeLaHoraDe(r.cuando)}: «{r.motivo}»
        </li>
      ))}
    </ul>
  );
}

/**
 * Reabrir un día cerrado (M16a, 0105): el motivo se escribe siempre.
 *
 * Lo reabre quien puede cerrar la caja (Richi, 22-oct). Reabrir no cambia nada: el día
 * vuelve al formulario con lo que tenía, para corregirlo y cerrarlo otra vez.
 */
function Reabrir({ fecha, alDejarlo }: { readonly fecha: string; readonly alDejarlo: () => void }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const [reabriendo, setReabriendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function reabrir() {
    setError(null);
    setReabriendo(true);
    const respuesta = await cliente.ejecutar('reabrir_la_jornada', {
      fecha,
      motivo: motivo.trim(),
    });
    setReabriendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['un_cierre'] });
    await cache.invalidateQueries({ queryKey: ['la_jornada'] });
  }

  return (
    <div className="mb-e4 flex flex-col gap-e3 rounded-medio border border-borde bg-fondo p-e3">
      {error !== null && <ErrorEnCristiano error={error} />}
      <Campo
        etiqueta="¿Por qué lo reabres?"
        ayuda="Queda escrito en el cierre. «Me equivoqué con la tarjeta: eran 412, no 421.»"
        value={motivo}
        autoFocus
        onChange={(e) => {
          setMotivo(e.currentTarget.value);
        }}
      />
      <Botones>
        <Boton tono="texto" onClick={alDejarlo}>
          Dejarlo cerrado
        </Boton>
        <Boton
          tono="principal"
          disabled={motivo.trim().length < 3 || reabriendo}
          cargando={reabriendo}
          textoCargando="Reabriendo"
          onClick={() => {
            void reabrir();
          }}
        >
          Reabrir el día
        </Boton>
      </Botones>
    </div>
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

function Formulario({ datos }: { readonly datos: ElCierreDeUnDia }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const antes = datos.cierre;
  const [paso, setPaso] = useState<Paso>(0);
  // Cada paso empieza arriba de la tarjeta: en el móvil «Siguiente» queda abajo del
  // todo, y el paso nuevo se quedaba fuera de la vista.
  const arriba = useRef<HTMLDivElement>(null);
  const irAlPaso = (nuevo: Paso) => {
    setPaso(nuevo);
    arriba.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

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
  const [origen, setOrigen] = useState<'a_mano' | 'csv' | 'foto'>(
    antes?.origen === 'csv' || antes?.origen === 'foto' ? antes.origen : 'a_mano',
  );
  // El Z por foto (Fogón 1 · 2, 0098): lo lee Fogón y rellena el formulario.
  const fogon = usarLectura<FogonYYo>('fogon_y_yo', {});
  const [leidoPorFogon, setLeidoPorFogon] = useState(false);
  const [noEntendidas, setNoEntendidas] = useState<readonly number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  /*
    ── El importe de cada plato, propuesto y no pedido ─────────────────────────
    «Pones el importe de cada plato a mano: poner el que tiene en la carta, y que
    se pueda cambiar.» La carta es M10; hasta entonces el precio sale de **la
    última vez que se apuntó ese plato**. Se escribe «croquetas», se pone cuántas
    y el importe sale solo; si no es ese, se cambia y manda lo escrito.
  */
  const precioDe = new Map(datos.platosConocidos.map((p) => [p.clave, p.precioUnidadCentimos]));

  // Lo vendido en Almacén que todavía no está entre las líneas. Lo que ya
  // está no se vuelve a ofrecer: añadirlo dos veces es el fallo que esto viene a
  // evitar, no uno nuevo que trae.
  const yaPuestos = new Set(lineas.map((l) => claveDePlato(l.concepto)));
  const porPoner = datos.vendidoEnCamara.filter(
    (v) => !v.yaEstaPuesto && !yaPuestos.has(claveDePlato(v.concepto)),
  );
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

  /** Lo que ha leído Fogón del Z, en el formulario. Lo que ya estaba escrito, se pisa. */
  async function leerElZ(foto: { tipo: 'image/jpeg'; base64: string }) {
    const respuesta = await cliente.ejecutar<CierreLeido>('leer_el_cierre_con_fogon', { foto });
    if (!respuesta.ok) return respuesta.error;
    const z = respuesta.datos;
    setTotal(z.totalCentimos as Centimos | null);
    setEfectivo(z.efectivoCentimos as Centimos | null);
    setTarjeta(z.tarjetaCentimos as Centimos | null);
    setOtros(z.otrosCentimos as Centimos | null);
    setTickets(z.tickets === null ? '' : String(z.tickets));
    setComensales(z.comensales === null ? '' : String(z.comensales));
    if (z.lineas.length > 0) {
      setLineas(
        z.lineas.map((l) => ({
          concepto: l.concepto,
          unidades: String(l.unidades).replace('.', ','),
          importe: l.importeCentimos as Centimos | null,
          importeTocado: l.importeCentimos !== null,
        })),
      );
    }
    setOrigen('foto');
    setLeidoPorFogon(true);
    return null;
  }

  async function guardar() {
    if (total === null) return;
    setError(null);
    setGuardando(true);
    const numero = (texto: string) => (texto.trim() === '' ? null : Math.trunc(Number(texto)));

    const respuesta = await cliente.ejecutar('cerrar_la_caja', {
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

    // Cerrado, la pantalla pasa sola al resumen del día: lo dice su título.
    await cache.invalidateQueries({ queryKey: ['un_cierre'] });
    await cache.invalidateQueries({ queryKey: ['mis_cierres'] });
    await cache.invalidateQueries({ queryKey: ['un_indicador'] });
    await cache.invalidateQueries({ queryKey: ['la_jornada'] });
    await cache.invalidateQueries({ queryKey: ['lo_de_hoy'] });
  }

  const lineasQueCuentan = lineas.filter(
    (l) => l.concepto.trim() !== '' && Number(l.unidades.replace(',', '.')) > 0,
  ).length;
  const ultimaReapertura = datos.jornada.reaperturas[0];

  return (
    <div ref={arriba} className="scroll-mt-[5rem]">
      <Tarjeta
        titulo={
          datos.jornada.estado === 'reabierta'
            ? `Reabierto · ${comoSeLeeElDia(datos.fecha)}`
            : `Cerrar el día · ${comoSeLeeElDia(datos.fecha)}`
        }
        acento="var(--color-app-servicio)"
      >
        <div className="flex flex-col gap-e4">
          {datos.jornada.estado === 'reabierta' && ultimaReapertura !== undefined && (
            <Aviso tono="atencion" titulo="Sin volver a cerrar">
              {ultimaReapertura.quien === null
                ? 'Se reabrió'
                : `Lo reabrió ${ultimaReapertura.quien}`}
              : «{ultimaReapertura.motivo}». Corrige lo que haga falta y ciérralo otra vez.
            </Aviso>
          )}

          <LosPasos paso={paso} />

          {paso === 1 && <LasMermasDelDia fecha={datos.fecha} esHoy={datos.jornada.esHoy} />}

          {paso === 2 && (
            <ElRepaso
              total={total}
              efectivo={efectivo}
              tarjeta={tarjeta}
              otros={otros}
              tickets={tickets}
              platos={lineasQueCuentan}
              fecha={datos.fecha}
              siguenDentro={datos.jornada.siguenDentro}
            />
          )}
          {paso === 2 && error !== null && <ErrorEnCristiano error={error} />}

          {paso === 0 && (
            <>
              {/* ── Con una foto del Z, lo lee Fogón (0098) ──────────────────── */}
              {fogon.data?.habla === true && !leidoPorFogon && (
                <FotoParaFogon
                  titulo="¿Te lo lee Fogón?"
                  ayuda="Hazle una foto al Z de la caja y Fogón rellena el total, el efectivo, la tarjeta y lo vendido por plato si lo trae."
                  boton="Foto del Z"
                  gasta={CREDITOS_DE_FOGON.leer_cierre}
                  alLeer={leerElZ}
                />
              )}
              {leidoPorFogon && <AvisoDelBorrador />}

              {/* ── Cómo se hace, en tres líneas ───────────────────────────────── */}
              <ol className="flex list-decimal flex-col gap-e1 pl-e4 text-secundario text-texto-suave">
                <li>Saca el cierre (el «Z») de tu caja y escribe el total.</li>
                <li>Si quieres, cuánto fue en efectivo y cuánto con tarjeta.</li>
                <li>
                  Si tu TPV saca un fichero con las ventas por plato, súbelo y se rellenan solos.
                </li>
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
                    {/* Leer el Z de una foto llega con Fogón (M22); el botón apagado que
                  había aquí se quitó en la entrega V (0045). */}
                  </div>
                </div>

                {noEntendidas.length > 0 && (
                  <Aviso tono="atencion" titulo="Hay filas que no he entendido">
                    Las filas {noEntendidas.join(', ')} del fichero no tenían un plato y una
                    cantidad. El resto está abajo: revísalo antes de guardar.
                  </Aviso>
                )}

                {/* Los platos que ya se han apuntado alguna vez, para elegirlos. */}
                <datalist id="platos-conocidos">
                  {datos.platosConocidos.map((plato) => (
                    <option key={plato.clave} value={plato.concepto} />
                  ))}
                </datalist>

                {/*
            ── Lo que se vendió desde Almacén, propuesto ──────────────────

            Quien saca un botellín de la cámara y dice «vendido» apunta lo que ha
            cobrado, y esa línea **espera aquí**: al cerrar la caja sale con su
            nombre y su importe, y se añade de un toque.

            No se añade sola, y esa es la decisión. Si este cierre viene del Z o
            del TPV, esas ventas ya están dentro del total, y meterlas otra vez
            contaría el día dos veces. Lo sabe quien cierra la caja, no Estook,
            así que lo decide quien cierra la caja.
          */}
                {porPoner.length > 0 && (
                  <div className="flex flex-col gap-e2 rounded-medio border border-borde bg-fondo p-e3">
                    <p className="text-secundario">
                      <strong>Se ha vendido esto desde Almacén hoy.</strong> Si tu total de arriba
                      sale del TPV o del Z, ya está contado: no lo añadas.
                    </p>
                    <ul className="flex flex-col gap-e1">
                      {porPoner.map((v) => (
                        <li
                          key={v.concepto}
                          className="flex flex-wrap items-baseline justify-between gap-e2"
                        >
                          <span>
                            {v.concepto}{' '}
                            <span className="text-texto-suave">
                              · {v.unidades.toLocaleString('es-ES')}
                            </span>
                          </span>
                          {/*
                      El importe sale de lo que costó ese mismo concepto la última
                      vez que se cerró la caja, **no del producto**: un ingrediente
                      no tiene precio de venta. Si nunca se ha cerrado, se dice que
                      falta en vez de inventarlo.
                    */}
                          <span className="font-medium">
                            {v.precioUnidadCentimos === null ? (
                              <span className="font-normal text-texto-suave">
                                pon tú el importe
                              </span>
                            ) : (
                              comoDinero(v.precioUnidadCentimos * v.unidades)
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div>
                      <Boton
                        tono="secundario"
                        onClick={() => {
                          setLineas((todas) => [
                            ...todas,
                            ...porPoner.map((v) => ({
                              concepto: v.concepto,
                              unidades: String(v.unidades),
                              importe:
                                v.precioUnidadCentimos === null
                                  ? null
                                  : ((v.precioUnidadCentimos * v.unidades) as Centimos),
                              // Sin tocar cuando no se sabía: así, si luego se escribe
                              // el concepto de otra forma, el importe se vuelve a
                              // proponer solo en vez de quedarse en blanco para siempre.
                              importeTocado: v.precioUnidadCentimos !== null,
                            })),
                          ]);
                        }}
                      >
                        Añadirlas a la lista
                      </Boton>
                    </div>
                  </div>
                )}

                {lineas.length === 0 ? (
                  <p className="text-secundario text-texto-suave">
                    Opcional. El importe se pone solo con el precio de la última vez; cuando exista
                    la carta, con el de la carta.
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
                              A {comoDinero(precioDelPlato(linea.concepto))} cada uno, como la
                              última vez. Cámbialo si no es así.
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
            </>
          )}

          <Botones>
            {paso > 0 && (
              <Boton
                tono="texto"
                onClick={() => {
                  irAlPaso((paso - 1) as Paso);
                }}
              >
                Atrás
              </Boton>
            )}
            {paso < 2 ? (
              <Boton
                tono="principal"
                disabled={total === null}
                onClick={() => {
                  irAlPaso((paso + 1) as Paso);
                }}
              >
                Siguiente
              </Boton>
            ) : (
              <Boton
                tono="principal"
                disabled={total === null || guardando}
                cargando={guardando}
                textoCargando="Cerrando"
                onClick={() => {
                  void guardar();
                }}
              >
                Cerrar el día
              </Boton>
            )}
          </Botones>
        </div>
      </Tarjeta>
    </div>
  );
}
