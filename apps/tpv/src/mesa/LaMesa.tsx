import { useEffect, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Hoja } from '@estook/ui';
import {
  FalloDeLaSala,
  usarAcciones,
  usarAlSegundo,
  usarElPlano,
  usarLaCarta,
  usarLaCola,
  usarLaMesa,
  usarLasImpresoras,
} from '../ganchos/usarLaSala.ts';
import { lineasGuardadas, marchadoSinInternet } from '../sinInternet/loGuardado.ts';
import { laCocinaLoTiene, loQueEspera, type LineaGuardada } from '../sinInternet/laCola.ts';
import { estamosSinInternet } from '../sinInternet/laConexion.ts';
import {
  laHoraDeAhora,
  laMarchaParaLaCaja,
  loMandadoParaLaCaja,
} from '../sinInternet/paraLaCaja.ts';
import { LaFranjaSinInternet } from '../sinInternet/LaFranjaSinInternet.tsx';
import type { CuentaEnElPlano } from '../datos/tipos.ts';
import {
  comoPedido,
  guardarBorrador,
  leerBorrador,
  loQueVale,
  type Borrador,
} from '../logica/comanda.ts';
import { elPase, losGruposDeLaCuenta } from '../logica/laCuenta.ts';
import { comensales, cuantoLlevan, eurosConSimbolo, laHora } from '../logica/texto.ts';
import { irAlPlano } from '../navegar.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { LaCuenta } from './LaCuenta.tsx';
import { LoQueSePide } from './LoQueSePide.tsx';
import { LosPasesEnPestanas } from './LosPasesEnPestanas.tsx';
import { laPestanaDeFabrica, type PestanaDelPase } from '../logica/losPases.ts';
import { OpcionesDeLaMesa, type PasoDeLaMesa } from './OpcionesDeLaMesa.tsx';
import {
  IconoCuaderno,
  IconoFlechaIzquierda,
  IconoMas,
  IconoMover,
  type Icono,
} from '@estook/iconos';
import { LaCocinaLlama } from '../plano/LaCocinaLlama.tsx';

/**
 * Una mesa (0106, «Comanda»; T2, maqueta 9): a la izquierda, **las pestañas de los pases**
 * y la cuenta en el orden en que se come; a la derecha, lo que se pide, por páginas. **El botón grande dice siempre lo siguiente**: mandar lo
 * nuevo, marchar el pase que toca o, si todo va, nada que hacer. En el móvil, lo que se
 * pide ocupa la pantalla y la cuenta se abre desde abajo («Movil»).
 *
 * Lo nuevo se queda en el aparato hasta «Mandar» (`comanda.ts`): sale a la vez a cocina
 * y a la barra, y lo que sale en marcha lo decide la API (el 1.º sale; el 2.º espera).
 */
export function LaMesa({ cuentaId }: { readonly cuentaId: string }) {
  const conectado = usarAlSegundo();
  const mesa = usarLaMesa(cuentaId, conectado);
  const plano = usarElPlano(conectado);
  // **Con la cocina solo en papel, marchar va directo** (T5 · 1, 0119): nadie tacha, así que
  // «lo de antes aún no ha salido» saldría siempre.
  const impresoras = usarLasImpresoras(conectado);
  const sinPreguntarAlMarchar = impresoras.data?.cocinaSaleEn === 'papel';
  // «La cocina te llama» también dentro de una mesa (0116): las de todo el plano.
  const enElPlanoTodas =
    plano.data === undefined
      ? null
      : [
          ...plano.data.zonas.flatMap((z) =>
            z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta])),
          ),
          ...plano.data.sinMesa,
        ];
  const carta = usarLaCarta();
  const ejecutar = usarAcciones();
  const { aparato } = usarSesion();
  // Lo que lleva cada plato de la carta, para «LLEVA GLUTEN» en el papel de la caja (0123).
  const alergenosDe = (platoId: string): readonly string[] =>
    carta.data?.paginas.flatMap((p) => p.platos).find((p) => p.id === platoId)?.alergenos ?? [];
  // **Lo mandado sin internet** (T5 · 2 · 1): se ve aparte hasta que llega a Estook.
  const cola = usarLaCola();
  const loGuardado = lineasGuardadas(cuentaId, cola);
  const [borrador, setBorradorEnMemoria] = useState<Borrador>(() => leerBorrador(cuentaId));
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  /** La hoja de la mesa, abierta por uno de sus tres iconos de arriba (0131). */
  const [opciones, setOpciones] = useState<PasoDeLaMesa | null>(null);
  const [cuentaEnElMovil, setCuentaEnElMovil] = useState(false);
  const [salir, setSalir] = useState(false);
  /** El pase marcado: lo que se toca va aquí (Anexo 11.10). Sin tocar, el que toca. */
  const [marcada, setMarcada] = useState<PestanaDelPase | null>(null);

  const setBorrador = (nuevo: Borrador) => {
    setBorradorEnMemoria(nuevo);
    guardarBorrador(cuentaId, nuevo);
  };

  useEffect(() => {
    if (hecho === null) return undefined;
    const reloj = window.setTimeout(() => {
      setHecho(null);
    }, 5_000);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [hecho]);

  if (mesa.isLoading) {
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo">
        <Cargando que="la mesa" />
      </main>
    );
  }
  const datos = mesa.data;
  if (datos === undefined) {
    return (
      <main className="flex min-h-pantalla flex-col items-center justify-center gap-e4 bg-fondo p-e5">
        {mesa.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={mesa.error.error} />
        ) : (
          <Aviso tono="mal" titulo="No llegamos a la mesa">
            Puede ser la conexión. Se vuelve a probar solo.
          </Aviso>
        )}
        <Boton onClick={irAlPlano}>Volver al plano</Boton>
      </main>
    );
  }

  // Otro la liberó, la anuló o la juntó con otra mientras se miraba: se dice, y lo que
  // no se llegó a mandar se enseña para pedirlo donde toque, en vez de perderlo callado.
  if (!datos.abierta) {
    return (
      <main className="flex min-h-pantalla flex-col items-center justify-center gap-e4 bg-fondo p-e5">
        <div className="w-full max-w-[32rem]">
          <Aviso tono="atencion" titulo={`${datos.titulo} ya no está abierta`}>
            Se liberó, se anuló o se juntó con otra desde otro aparato.
            {borrador.length > 0 &&
              ` No se llegó a mandar: ${borrador
                .filter((l) => l.parteDe === null)
                .map((l) => `${l.cantidad} ${l.nombre}`)
                .join(', ')}.`}
          </Aviso>
        </div>
        <Boton
          tono="principal"
          onClick={() => {
            guardarBorrador(cuentaId, []);
            irAlPlano();
          }}
        >
          Volver al plano
        </Boton>
      </main>
    );
  }

  const guardadas = datos.platos.filter((p) => p.estado === 'sin_mandar').length;
  const porMandar = borrador.length + guardadas;
  const grupos = losGruposDeLaCuenta(datos, borrador);
  const total =
    datos.totalCentimos +
    loQueVale(borrador) +
    loGuardado.reduce((suma, l) => suma + l.precioCentimos * l.cantidad, 0);
  // Lo que se lleva, para «La cuenta · 9 platos»: sin lo quitado, y un menú cuenta una vez.
  const cuantos = grupos
    .flatMap((g) => g.lineas)
    .filter((l) => l.quitada === null && !l.delMenu)
    .reduce((suma, l) => suma + l.cantidad, 0);
  const pestana = marcada ?? laPestanaDeFabrica(datos);
  const lasPestanas = datos.porPases ? (
    <LosPasesEnPestanas mesa={datos} marcada={pestana} alMarcar={setMarcada} />
  ) : null;
  // Lo marchado sin internet no se vuelve a ofrecer: ya va camino de la cocina.
  const siguiente =
    datos.loSiguiente.que === 'marchar' &&
    marchadoSinInternet(cuentaId, datos.loSiguiente.pase, cola)
      ? ({ que: 'pedir' } as const)
      : datos.loSiguiente;
  const enElPlano: CuentaEnElPlano | undefined = [
    ...(plano.data?.zonas.flatMap((z) =>
      z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta])),
    ) ?? []),
    ...(plano.data?.sinMesa ?? []),
  ].find((c) => c.cuentaId === cuentaId);

  const titulo = datos.titulo;
  // Para lo que se arma al mandar sin internet (0123): la mesa tal como se leyó.
  const laMesaLeida = datos;

  /** Lo que dice abajo al mandar, y la cuenta del móvil que se cierra. */
  function mandado(
    datos: Parameters<typeof loQueSeMando>[0] & {
      readonly guardado?: true;
      readonly porLaCaja?: true;
    },
  ): true {
    setHecho(
      datos.porLaCaja === true
        ? 'Sin internet: la cocina ya lo tiene, por la caja'
        : datos.guardado === true
          ? 'Guardado en este aparato: la cocina lo recibe al volver internet'
          : loQueSeMando(datos),
    );
    setCuentaEnElMovil(false);
    return true;
  }

  async function mandar(): Promise<boolean> {
    setMandando(true);
    setFallo(null);
    // **De una vez, con internet** (la pausa del 5-nov): lo nuevo se pide y se manda en una
    // sola orden, y solo se espera a releer esta mesa. Antes eran dos órdenes y, entre una y
    // otra, se releía toda la sala: la cocina esperaba a las dos.
    if (borrador.length > 0 && !estamosSinInternet() && loQueEspera(cola).length === 0) {
      const deUnaVez = await ejecutar<Parameters<typeof loQueSeMando>[0]>(
        'mandar_a_cocina',
        { cuenta_id: cuentaId, platos: comoPedido(borrador) },
        undefined,
        undefined,
        ['sala', 'la_mesa', cuentaId],
      );
      if (deUnaVez.ok) {
        setBorrador([]);
        setMandando(false);
        return mandado(deUnaVez.datos);
      }
      if (deUnaVez.error.codigo !== 'sin_conexion') {
        setMandando(false);
        setFallo(deUnaVez.error);
        return false;
      }
      // Se cortó justo ahora: como sin internet, por partes, que se guardan en el aparato y
      // suben al volver. Pedir dos veces lo mismo no lo pide dos veces (cada plato lleva su id).
    }
    if (borrador.length > 0) {
      const lineas = borrador
        .filter((l) => l.parteDe === null)
        .map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precioCentimos: l.precioCentimos }));
      const pedido = await ejecutar(
        'pedir',
        { cuenta_id: cuentaId, platos: comoPedido(borrador) },
        undefined,
        {
          que: `${titulo} · ${platosPedidos(lineas)}`,
          cuentaId,
          lineas,
          respuesta: { pedidos: borrador.length, yaEstaban: 0 },
        },
      );
      if (!pedido.ok) {
        setMandando(false);
        setFallo(pedido.error);
        return false;
      }
      setBorrador([]);
    }
    const loQueVa = borrador;
    const loMandado = await ejecutar<{
      aCocina: number;
      aLaBarra: number;
      talCual?: number;
      salen: number[];
      esperan: number[];
      guardado?: true;
      porLaCaja?: true;
    }>('mandar_a_cocina', { cuenta_id: cuentaId }, undefined, {
      que: `${titulo} · mandar a cocina`,
      cuentaId,
      respuesta: { aCocina: 0, aLaBarra: 0, salen: [], esperan: [], guardado: true },
      paraLaCaja: (clave) =>
        loMandadoParaLaCaja(
          clave,
          laMesaLeida,
          loQueVa,
          cola,
          { hora: laHoraDeAhora(), aparato: aparato.nombre },
          alergenosDe,
        ),
    });
    setMandando(false);
    if (!loMandado.ok) {
      setFallo(loMandado.error);
      return false;
    }
    return mandado(loMandado.datos);
  }

  async function marchar(pase: number) {
    setMandando(true);
    setFallo(null);
    const marchado = await ejecutar<{ pase: number; guardado?: true; porLaCaja?: true }>(
      'marchar',
      { cuenta_id: cuentaId, pase },
      undefined,
      {
        que: `${titulo} · marchar el ${elPase(pase)}`,
        cuentaId,
        respuesta: { pase, guardado: true },
        paraLaCaja: (clave) =>
          laMarchaParaLaCaja(clave, laMesaLeida, pase, cola, {
            hora: laHoraDeAhora(),
            aparato: aparato.nombre,
          }),
      },
      ['sala', 'la_mesa', cuentaId],
    );
    setMandando(false);
    if (!marchado.ok) setFallo(marchado.error);
    else if (marchado.datos.porLaCaja === true) {
      setHecho(`Sin internet: marchado el ${elPase(pase)}, la cocina ya lo tiene por la caja`);
    } else if (marchado.datos.guardado === true) {
      setHecho(`Guardado: el ${elPase(pase)} se marcha al volver internet`);
    } else setHecho(`Marchado el ${elPase(pase)}: la cocina ya lo tiene`);
  }

  const elBoton =
    porMandar > 0 ? (
      <Boton
        tono="principal"
        tamano="l"
        ancho
        cargando={mandando}
        textoCargando="Mandando"
        onClick={() => {
          void mandar();
        }}
      >
        Mandar
      </Boton>
    ) : siguiente.que === 'marchar' ? (
      <Boton
        tono="principal"
        tamano="l"
        ancho
        cargando={mandando}
        textoCargando="Marchando"
        onClick={() => {
          void marchar(siguiente.pase);
        }}
      >
        Marchar el {elPase(siguiente.pase)}
      </Boton>
    ) : null;

  // Lo que dice abajo cuando no hay nada que pulsar: qué espera, o que todo va.
  const espera = datos.pases.find((p) => p.marchadoEn === null);
  const comoVa =
    espera === undefined
      ? 'Todo en marcha o servido.'
      : `El ${elPase(espera.numero)} espera: te avisamos cuando salga todo lo de antes.`;

  const subtitulo = [
    datos.paraLas === undefined || datos.paraLas === null
      ? null
      : `Para las ${laHora(datos.paraLas)}`,
    comensales(datos.personas),
    cuantoLlevan(datos.minutos),
    // El camarero, lo último (0131): en el móvil es lo que se corta, y ya está en su pastilla.
    datos.camarero,
  ]
    .filter((x) => x !== null)
    .join(' · ');

  const laCuenta = (
    <LaCuenta
      grupos={grupos}
      borrador={borrador}
      alCambiarElBorrador={setBorrador}
      porPases={datos.porPases}
      pases={datos.pases.map((p) => p.numero)}
      tocaMarchar={siguiente.que === 'marchar' ? siguiente.pase : null}
      sinPreguntarAlMarchar={sinPreguntarAlMarchar}
      alMarchar={(pase) => {
        void marchar(pase);
      }}
    />
  );

  const volver = () => {
    if (borrador.length > 0) setSalir(true);
    else irAlPlano();
  };

  return (
    <div className="flex h-pantalla flex-col bg-fondo text-texto md:flex-row">
      {enElPlanoTodas !== null && <LaCocinaLlama flotante cuentas={enElPlanoTodas} />}
      {/* La cuenta: a la izquierda en la tablet. */}
      <section
        aria-label="La cuenta de la mesa"
        className="hidden w-[26rem] shrink-0 flex-col border-r border-borde bg-superficie md:flex"
      >
        <Cabecera
          titulo={datos.titulo}
          subtitulo={subtitulo}
          nota={datos.notaParaCocina}
          alVolver={volver}
          alAbrir={setOpciones}
          listas={enElPlano !== undefined}
        />
        {lasPestanas}
        <div className="flex-1 overflow-y-auto px-e4">
          <LoGuardado lineas={loGuardado} enCocina={laCocinaLoTiene(cuentaId, cola)} />
          {laCuenta}
        </div>
        <div className="flex flex-col gap-e3 border-t border-borde p-e4">
          <LaFranjaSinInternet enLaMesa />
          <Avisos hecho={hecho} fallo={fallo} />
          <div className="flex items-baseline justify-between">
            <span className="text-texto-suave">Total</span>
            <span className="text-cifra">{eurosConSimbolo(total)}</span>
          </div>
          {elBoton}
          {elBoton === null && datos.platos.length > 0 && (
            <p className="text-center text-secundario text-texto-suave">{comoVa}</p>
          )}
        </div>
      </section>

      {/* Lo que se pide: la pantalla entera en el móvil. */}
      <section aria-label="Lo que se pide" className="flex min-h-0 flex-1 flex-col">
        <div className="md:hidden">
          <Cabecera
            titulo={datos.titulo}
            subtitulo={subtitulo}
            nota={datos.notaParaCocina}
            alVolver={volver}
            alAbrir={setOpciones}
            listas={enElPlano !== undefined}
          />
          {lasPestanas}
        </div>
        <LoQueSePide
          carta={carta.data}
          cargando={carta.isLoading}
          mesa={datos}
          borrador={borrador}
          alCambiarElBorrador={setBorrador}
          marcada={pestana}
          alMarcar={setMarcada}
        />
        <div className="flex flex-col gap-e2 border-t border-borde bg-superficie p-e3 md:hidden">
          <LaFranjaSinInternet enLaMesa />
          <Avisos hecho={hecho} fallo={fallo} />
          <div className="flex items-center gap-e2">
            {/* **La cuenta, siempre a un toque** (0131): cuántos platos y cuánto, ya con lo nuevo. */}
            <button
              type="button"
              aria-label={`Ver la cuenta: ${cuantosPlatos(cuantos)}, ${eurosConSimbolo(total)}`}
              onClick={() => {
                setCuentaEnElMovil(true);
              }}
              className="flex min-h-toque flex-1 flex-col items-start justify-center rounded-grande bg-fondo px-e3 py-e1 text-left"
            >
              <span className="text-secundario text-texto-suave">
                La cuenta · {cuantosPlatos(cuantos)}
              </span>
              <span className="font-bold">{eurosConSimbolo(total)}</span>
            </button>
            {elBoton !== null && <div className="flex-1">{elBoton}</div>}
          </div>
        </div>
      </section>

      {cuentaEnElMovil && (
        <Hoja
          abierta
          titulo={`La cuenta · ${datos.titulo}`}
          alCerrar={() => {
            setCuentaEnElMovil(false);
          }}
          pie={elBoton ?? undefined}
        >
          <LoGuardado lineas={loGuardado} enCocina={laCocinaLoTiene(cuentaId, cola)} />
          {laCuenta}
          <div className="mt-e4 flex items-baseline justify-between">
            <span className="text-texto-suave">Total</span>
            <span className="text-cifra">{eurosConSimbolo(total)}</span>
          </div>
        </Hoja>
      )}

      {opciones !== null && plano.data !== undefined && enElPlano !== undefined && (
        <OpcionesDeLaMesa
          cuenta={enElPlano}
          plano={plano.data}
          sinMandarAqui={borrador.length}
          empiezaEn={opciones}
          alCerrar={() => {
            setOpciones(null);
          }}
        />
      )}

      {salir && (
        <Hoja
          abierta
          titulo="Hay platos sin mandar"
          alCerrar={() => {
            setSalir(false);
          }}
        >
          <div className="flex flex-col gap-e3">
            <p>
              {borrador.length === 1 ? 'Un plato nuevo' : `${borrador.length} platos nuevos`} no han
              llegado a la cocina. Se quedan apuntados en esta tablet para cuando vuelvas.
            </p>
            <Boton
              tono="principal"
              tamano="l"
              ancho
              cargando={mandando}
              onClick={() => {
                void mandar().then((bien) => {
                  setSalir(false);
                  if (bien) irAlPlano();
                });
              }}
            >
              Mandar ahora
            </Boton>
            <Boton ancho onClick={irAlPlano}>
              Volver al plano sin mandar
            </Boton>
          </div>
        </Hoja>
      )}
    </div>
  );
}

/** «1 plato», «9 platos». */
function cuantosPlatos(cuantos: number): string {
  return cuantos === 1 ? '1 plato' : `${String(cuantos)} platos`;
}

/** «2 Croquetas, 1 Ensalada» → «3 platos pedidos». */
function platosPedidos(lineas: readonly LineaGuardada[]): string {
  const cuantos = lineas.reduce((suma, l) => suma + l.cantidad, 0);
  return cuantos === 1 ? '1 plato pedido' : `${cuantos} platos pedidos`;
}

/**
 * **Lo mandado sin internet** (T5 · 2 · 1): aparte y en ámbar, porque la cocina aún no lo
 * tiene. Al subir, desaparece de aquí y sale en la cuenta como todo lo demás.
 */
function LoGuardado({
  lineas,
  enCocina,
}: {
  readonly lineas: readonly LineaGuardada[];
  /** La caja de centro ya se lo dio a la cocina (0123): solo falta que llegue a Estook. */
  readonly enCocina: boolean;
}) {
  if (lineas.length === 0) return null;
  return (
    <section
      aria-label="Guardado en este aparato"
      className={[
        'my-e3 flex flex-col gap-e2 rounded-grande border-2 p-e3',
        enCocina
          ? 'border-borde bg-superficie text-texto'
          : 'border-atencion bg-atencion-suave text-atencion',
      ].join(' ')}
    >
      <span className="font-bold">
        {enCocina
          ? 'En cocina, por la caja · sube a Estook al volver internet'
          : 'Guardado aquí · la cocina aún no lo recibe'}
      </span>
      <ul className="flex flex-col gap-e1 text-texto">
        {lineas.map((l, i) => (
          <li key={`${l.nombre}-${String(i)}`} className="flex justify-between gap-e3">
            <span>
              {l.cantidad} {l.nombre}
            </span>
            <span className="tabular-nums">{eurosConSimbolo(l.precioCentimos * l.cantidad)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Cabecera({
  titulo,
  subtitulo,
  nota,
  alVolver,
  alAbrir,
  listas,
}: {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly nota: string | null;
  readonly alVolver: () => void;
  /** Los tres iconos (0131): mover la mesa, la nota para cocina y «···». */
  readonly alAbrir: (paso: PasoDeLaMesa) => void;
  /** Las opciones necesitan el plano (las mesas libres, quién toma nota): hasta que llega, espera. */
  readonly listas: boolean;
}) {
  return (
    <div className="flex items-center gap-e2 border-b border-borde bg-superficie px-e3 py-e2">
      <button
        type="button"
        aria-label="Volver al plano"
        onClick={alVolver}
        className="grid size-toque shrink-0 place-items-center rounded-medio bg-fondo"
      >
        <IconoFlechaIzquierda size={22} aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-seccion font-bold">{titulo}</h1>
        <span className="truncate text-secundario text-texto-suave">{subtitulo}</span>
        {nota !== null && (
          <span className="truncate text-secundario font-semibold text-atencion">
            Cocina: {nota}
          </span>
        )}
      </div>
      {/* **Los mismos tres iconos que la mesa en el plano** (0131), en vez de «Opciones», que
          abría una lista de trece. Hasta que llega el plano, apagados. */}
      <IconoDeArriba
        etiqueta="Mover la mesa: cambiar, juntar o pasar"
        icono={IconoMover}
        listo={listas}
        onClick={() => {
          alAbrir('mover');
        }}
      />
      <IconoDeArriba
        etiqueta={nota === null ? 'Nota para cocina' : `Nota para cocina: ${nota}`}
        icono={IconoCuaderno}
        listo={listas}
        puesto={nota !== null}
        onClick={() => {
          alAbrir('nota');
        }}
      />
      <IconoDeArriba
        etiqueta="Más opciones de la mesa"
        icono={IconoMas}
        listo={listas}
        onClick={() => {
          alAbrir('mas');
        }}
      />
      <BotonDeBloquear />
    </div>
  );
}

function IconoDeArriba({
  etiqueta,
  icono: Dibujo,
  listo,
  onClick,
  puesto = false,
}: {
  readonly etiqueta: string;
  readonly icono: Icono;
  readonly listo: boolean;
  readonly onClick: () => void;
  readonly puesto?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={!listo}
      onClick={onClick}
      className={[
        'grid size-toque shrink-0 place-items-center rounded-redondo disabled:opacity-45',
        puesto ? 'bg-naranja-suave text-naranja' : 'bg-fondo text-texto',
      ].join(' ')}
    >
      <Dibujo size={20} aria-hidden />
    </button>
  );
}

/**
 * **Bloquear** (Anexo 11.4), en la tablet y la caja. En el móvil no cabe con los tres iconos
 * (0131): ahí se bloquea desde el plano, con tu nombre y el candado, y solo al rato sin tocarlo.
 * Lo que se estaba pidiendo se queda en la mesa, sin mandar, y el siguiente que la abre lo ve.
 */
function BotonDeBloquear() {
  const { bloquear } = usarSesion();
  return (
    <span className="max-md:hidden">
      <Boton tono="secundario" onClick={bloquear}>
        Bloquear
      </Boton>
    </span>
  );
}

function Avisos({
  hecho,
  fallo,
}: {
  readonly hecho: string | null;
  readonly fallo: ErrorDeLaApi | null;
}) {
  if (fallo !== null) return <ErrorEnCristiano error={fallo} />;
  if (hecho !== null) {
    return (
      <p role="status" className="rounded-medio bg-bien-suave px-e3 py-e2 font-semibold text-bien">
        {hecho}
      </p>
    );
  }
  return null;
}

/** «A cocina 4, a la barra 2 y 1 tal cual · sale el 1.º, el 2.º espera». */
function loQueSeMando(m: {
  readonly aCocina: number;
  readonly aLaBarra: number;
  /** Lo de «Nadie»; una API de antes de T3 no lo dice. */
  readonly talCual?: number;
  readonly salen: readonly number[];
  readonly esperan: readonly number[];
}): string {
  const adonde = [
    m.aCocina > 0 ? `a cocina ${m.aCocina}` : null,
    m.aLaBarra > 0 ? `a la barra ${m.aLaBarra}` : null,
    (m.talCual ?? 0) > 0 ? `${String(m.talCual)} tal cual` : null,
  ]
    .filter((x) => x !== null)
    .join(', ')
    .replace(/, ([^,]*)$/, ' y $1');
  const pases = [
    m.salen.length > 0 ? `sale el ${m.salen.map(elPase).join(' y el ')}` : null,
    m.esperan.length > 0
      ? `el ${m.esperan.map(elPase).join(' y el ')} espera${m.esperan.length > 1 ? 'n' : ''}`
      : null,
  ]
    .filter((x) => x !== null)
    .join(', ');
  return `Mandado: ${adonde || 'nada nuevo'}${pases === '' ? '' : ` · ${pases}`}`;
}
