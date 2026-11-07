import { useEffect, useRef, useState, type ReactNode } from 'react';
import { crearCliente, type ErrorDeLaApi } from '@estook/cliente-api';
import {
  CAMINO_DE_LA_FACTURA,
  DIRECCION_DE_ESTOOK,
  elCodigoEscrito,
  elCodigoParaEnsenar,
  importeDelDocumento,
  type ClaseDeCliente,
  type LoQueDiceLaPagina,
} from '@estook/dominio';
import {
  Aviso,
  bajarElPdf,
  Boton,
  Campo,
  Cargando,
  DE_LA_UNION,
  Elegir,
  ErrorEnCristiano,
  Logo,
  PAISES,
  Selector,
} from '@estook/ui';

/**
 * **Pide tu factura** (T6 · 2 · 3, decisiones 0125 y 0141; maquetas del 2-nov y del 7-nov).
 *
 * `estook.com/factura/<código>`: lo que abre el cliente en su móvil, sin sesión. Vive con la carta
 * porque esta aplicación es la que sirve las direcciones que no son ficheros (`publicar.yml`). Pone
 * sus datos, y la factura le llega al correo sin que nadie del equipo teclee nada.
 *
 * **Aquí nunca se rellena nada solo ni se enseña lo que ya se dio**: quien se encuentre un ticket en
 * una papelera no puede leer los datos de nadie.
 */
const API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

/** Mientras el ticket se registra, se vuelve a mirar: «la página se pone al día sola». */
const CADA_CUANTO_SE_MIRA_MS = 30_000;

interface LoQueEnsena {
  readonly dice: LoQueDiceLaPagina;
  readonly local: string;
  readonly numero: string;
  readonly total: number;
  readonly fecha: string;
  readonly pruebas: boolean;
  readonly seDescarga: boolean;
  readonly conCorreo: boolean;
  readonly rechazada: boolean;
}

interface LoQueDiceHacienda {
  readonly vale: boolean;
  readonly dice: string | null;
  readonly nombre: string | null;
}

type ComoVa =
  | { readonly que: 'cargando' }
  | { readonly que: 'sin_codigo' }
  | { readonly que: 'no_existe' }
  | { readonly que: 'demasiados' }
  | { readonly que: 'sin_red' }
  | { readonly que: 'lista'; readonly ticket: LoQueEnsena }
  | { readonly que: 'hecha'; readonly correo: string; readonly ticket: LoQueEnsena };

const LAS_CLASES: readonly { readonly valor: ClaseDeCliente; readonly texto: string }[] = [
  { valor: 'empresa', texto: 'Empresa' },
  { valor: 'particular', texto: 'Particular' },
  { valor: 'de_fuera', texto: 'De fuera' },
];

/** Con su propio texto: el del catálogo habla de entrar a la app. */
const sonDemasiados = (error: ErrorDeLaApi) => error.codigo === 'demasiados_intentos';

export function PideTuFactura({ codigoInicial }: { readonly codigoInicial: string | null }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [como, setComo] = useState<ComoVa>({
    que: codigoInicial === null ? 'sin_codigo' : 'cargando',
  });
  const cliente = useRef(crearCliente({ base: API })).current;

  useEffect(() => {
    if (codigo === null) return undefined;
    if (API === '') {
      setComo({ que: 'sin_red' });
      return undefined;
    }
    let vigente = true;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const mirar = async () => {
      const r = await cliente.ejecutar<LoQueEnsena>('abrir_pide_tu_factura', { codigo });
      if (!vigente) return;
      if (r.ok) {
        setComo({ que: 'lista', ticket: r.datos });
        document.title = `Tu factura de ${r.datos.local}`;
        if (r.datos.dice === 'todavia') {
          reloj = setTimeout(() => void mirar(), CADA_CUANTO_SE_MIRA_MS);
        }
      } else if (r.error.codigo === 'no_existe') {
        setComo({ que: 'no_existe' });
      } else if (sonDemasiados(r.error)) {
        setComo({ que: 'demasiados' });
      } else {
        setComo({ que: 'sin_red' });
      }
    };
    void mirar();
    return () => {
      vigente = false;
      if (reloj !== undefined) clearTimeout(reloj);
    };
  }, [codigo, cliente]);

  const ticket = como.que === 'lista' || como.que === 'hecha' ? como.ticket : null;

  function irAlCodigo(nuevo: string) {
    window.history.pushState(null, '', `${CAMINO_DE_LA_FACTURA}/${elCodigoParaEnsenar(nuevo)}`);
    setComo({ que: 'cargando' });
    setCodigo(nuevo);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col gap-e4 px-e4 pb-e7 pt-[calc(env(safe-area-inset-top)+var(--spacing-e5))]">
      {ticket?.pruebas === true && (
        <p className="rounded-medio bg-atencion-suave px-e3 py-e1 text-center text-etiqueta font-semibold text-atencion">
          PRUEBA · SIN VALIDEZ
        </p>
      )}

      {como.que === 'cargando' && <Cargando que="tu ticket" lineas={4} />}
      {como.que === 'sin_codigo' && <EscribirElCodigo alEscribir={irAlCodigo} />}
      {como.que === 'no_existe' && (
        <>
          <UnEstado
            titulo="Este código no es de ningún ticket"
            frase="Revisa lo que has escrito o vuelve a escanear el papel."
          />
          <EscribirElCodigo sinTitulo alEscribir={irAlCodigo} />
        </>
      )}
      {como.que === 'demasiados' && (
        <UnEstado titulo="Demasiados intentos" frase="Espera una hora y vuelve a probar." />
      )}
      {como.que === 'sin_red' && (
        <UnEstado
          titulo="No llego a tu ticket"
          frase="Puede ser la conexión del móvil. Vuelve a abrir el enlace dentro de un momento."
        />
      )}
      {como.que === 'hecha' && (
        <UnEstado dibujo="bien" titulo="Ya está">
          <p>
            Tu factura de {como.ticket.local} llega en un momento a <strong>{como.correo}</strong>.
          </p>
          <p className="text-etiqueta text-texto-suave">
            Si no la ves, mira en correo no deseado. ¿El correo está mal? Pregunta en{' '}
            {como.ticket.local}, que te la manda a otro.
          </p>
        </UnEstado>
      )}
      {como.que === 'lista' && codigo !== null && (
        <LoQueTocaConElTicket
          ticket={como.ticket}
          codigo={codigo}
          cliente={cliente}
          alHecha={(correo) => {
            setComo({ que: 'hecha', correo, ticket: como.ticket });
          }}
          alCambiar={() => {
            setComo({ que: 'cargando' });
            setCodigo(null);
            setTimeout(() => {
              setCodigo(codigo);
            }, 0);
          }}
          alDemasiados={() => {
            setComo({ que: 'demasiados' });
          }}
        />
      )}

      <footer className="mt-auto flex items-center justify-center gap-e2 pt-e5 text-etiqueta text-texto-tenue">
        <span>Hecho con</span>
        <a href={DIRECCION_DE_ESTOOK} aria-label="Estook" rel="noreferrer">
          <Logo alto={16} />
        </a>
      </footer>
    </main>
  );
}

type Cliente = ReturnType<typeof crearCliente>;

function LoQueTocaConElTicket({
  ticket,
  codigo,
  cliente,
  alHecha,
  alCambiar,
  alDemasiados,
}: {
  readonly ticket: LoQueEnsena;
  readonly codigo: string;
  readonly cliente: Cliente;
  readonly alHecha: (correo: string) => void;
  readonly alCambiar: () => void;
  readonly alDemasiados: () => void;
}) {
  switch (ticket.dice) {
    case 'puede':
      return (
        <ElFormulario
          ticket={ticket}
          codigo={codigo}
          cliente={cliente}
          alHecha={alHecha}
          alCambiar={alCambiar}
          alDemasiados={alDemasiados}
        />
      );
    case 'todavia':
      return (
        <UnEstado
          dibujo="espera"
          titulo="Tu ticket se está registrando"
          frase="Suele tardar un minuto. Esta página se pone al día sola, y el enlace no caduca: puedes volver cuando quieras."
        />
      );
    case 'ya_tiene':
      return <YaTieneFactura ticket={ticket} codigo={codigo} cliente={cliente} />;
    case 'no_se_puede':
      return (
        <UnEstado
          dibujo="parado"
          titulo="Este ticket no se puede facturar"
          frase={`Se anuló o tiene una devolución. Pregunta en ${ticket.local} y te lo resuelven.`}
        />
      );
    case 'apagada':
      return (
        <>
          <UnEstado
            dibujo="parado"
            titulo={`En ${ticket.local}, la factura se pide en el local`}
            frase="Enseña tu ticket y te la hacen."
          />
          {ticket.seDescarga && (
            <DescargarElTicket ticket={ticket} codigo={codigo} cliente={cliente} />
          )}
        </>
      );
  }
}

function ElTicket({ ticket }: { readonly ticket: LoQueEnsena }) {
  return (
    <p className="text-secundario text-texto-suave">
      Ticket {ticket.numero} · {importeDelDocumento(ticket.total)} · {ticket.fecha}
    </p>
  );
}

function DescargarElTicket({
  ticket,
  codigo,
  cliente,
}: {
  readonly ticket: LoQueEnsena;
  readonly codigo: string;
  readonly cliente: Cliente;
}) {
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  if (!ticket.seDescarga) return null;
  return (
    <div className="flex flex-col items-start gap-e2">
      <button
        type="button"
        disabled={haciendo}
        className="text-secundario font-semibold text-info underline"
        onClick={() => {
          setHaciendo(true);
          setError(null);
          void cliente
            .ejecutar<{ nombre: string; tipo: string; base64: string }>('descargar_mi_ticket', {
              codigo,
            })
            .then((r) => {
              setHaciendo(false);
              if (r.ok) bajarElPdf(r.datos);
              else setError(r.error);
            });
        }}
      >
        {haciendo ? 'Preparándolo…' : 'Descargar el ticket'}
      </button>
      {error !== null && <ErrorEnCristiano error={error} />}
    </div>
  );
}

function ElFormulario({
  ticket,
  codigo,
  cliente,
  alHecha,
  alCambiar,
  alDemasiados,
}: {
  readonly ticket: LoQueEnsena;
  readonly codigo: string;
  readonly cliente: Cliente;
  readonly alHecha: (correo: string) => void;
  readonly alCambiar: () => void;
  readonly alDemasiados: () => void;
}) {
  const [clase, setClase] = useState<ClaseDeCliente>('empresa');
  const [identificador, setIdentificador] = useState('');
  const [nombre, setNombre] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoPais, setCodigoPais] = useState('FR');
  const [idTipo, setIdTipo] = useState<'02' | '03'>('03');
  const [comprobado, setComprobado] = useState<LoQueDiceHacienda | null>(null);
  const [comprobando, setComprobando] = useState(false);
  // Hacienda no ha dado el nombre de ese número (un autónomo, o que no conteste): se escribe. No sale
  // de `comprobado`, que se olvida al escribir, porque el campo desaparecería con la primera letra.
  const [pideElNombre, setPideElNombre] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const preguntas = useRef(0);

  const deEmpresa = clase === 'empresa';
  // A una empresa el nombre se lo da Hacienda.
  const seVeElNombre = !deEmpresa || pideElNombre;
  const correoBueno = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
  const falta =
    identificador.trim() === '' ||
    domicilio.trim().length < 5 ||
    !correoBueno ||
    (seVeElNombre && nombre.trim() === '') ||
    comprobado?.vale === false;

  function olvidarLoComprobado() {
    preguntas.current += 1;
    setComprobado(null);
    setComprobando(false);
  }

  async function comprobar() {
    if (identificador.trim() === '' || comprobado !== null) return;
    preguntas.current += 1;
    const estaPregunta = preguntas.current;
    setComprobando(true);
    const r = await cliente.ejecutar<LoQueDiceHacienda>('comprobar_en_pide_tu_factura', {
      codigo,
      clase,
      identificador,
      ...(nombre.trim() === '' ? {} : { nombre }),
      ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
    });
    if (estaPregunta !== preguntas.current) return;
    setComprobando(false);
    if (!r.ok) {
      if (sonDemasiados(r.error)) alDemasiados();
      else setError(r.error);
      return;
    }
    setError(null);
    setComprobado(r.datos);
    if (r.datos.nombre !== null) setNombre(r.datos.nombre);
    else if (r.datos.vale) setPideElNombre(true);
  }

  async function pedir() {
    setPidiendo(true);
    setError(null);
    const r = await cliente.ejecutar<{ correo: string }>('pedir_mi_factura', {
      codigo,
      correo: correo.trim(),
      cliente: {
        clase,
        nombre,
        identificador,
        domicilio,
        ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
      },
    });
    setPidiendo(false);
    if (r.ok) {
      alHecha(r.datos.correo);
      return;
    }
    if (sonDemasiados(r.error)) {
      alDemasiados();
    } else if (r.error.codigo === 'nif_no_vale' || r.error.codigo === 'faltan_datos') {
      setError(r.error);
    } else {
      // Otro ya la ha pedido, o el ticket ha cambiado: que la página diga cómo está.
      alCambiar();
    }
  }

  const loDeHacienda =
    comprobado?.vale === false
      ? { error: comprobado.dice ?? 'Revisa este número.' }
      : comprobando
        ? { ayuda: 'Mirando en Hacienda…' }
        : comprobado !== null && comprobado.dice !== null
          ? {
              ayuda: `✓ ${deEmpresa && comprobado.nombre !== null ? comprobado.nombre : comprobado.dice}`,
            }
          : {};

  return (
    <form
      className="flex flex-col gap-e4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!falta && !pidiendo) void pedir();
      }}
    >
      <header className="flex flex-col gap-e1">
        <h1 className="text-pantalla font-semibold leading-tight">Tu factura de {ticket.local}</h1>
        <ElTicket ticket={ticket} />
        <DescargarElTicket ticket={ticket} codigo={codigo} cliente={cliente} />
      </header>

      {ticket.rechazada && (
        <Aviso tono="mal" titulo="Hacienda no ha aceptado los datos que se dieron">
          Escríbelos otra vez o pregunta en {ticket.local}.
        </Aviso>
      )}

      <Elegir
        nombre="Para quién es"
        opciones={LAS_CLASES}
        valor={clase}
        alElegir={(v) => {
          // El número y el nombre de otra clase de cliente no sirven: el domicilio y el correo, sí.
          setClase(v);
          setIdentificador('');
          setNombre('');
          setPideElNombre(false);
          olvidarLoComprobado();
        }}
      />

      {clase === 'de_fuera' && (
        <>
          <Selector
            etiqueta="País"
            opciones={PAISES.map((p) => ({ valor: p.valor, texto: p.texto }))}
            value={codigoPais}
            onChange={(e) => {
              setCodigoPais(e.target.value);
              if (!DE_LA_UNION.has(e.target.value)) setIdTipo('03');
              olvidarLoComprobado();
            }}
          />
          <Elegir
            nombre="Con qué te identificas"
            opciones={
              DE_LA_UNION.has(codigoPais)
                ? [
                    { valor: '02' as const, texto: 'N.º de IVA' },
                    { valor: '03' as const, texto: 'Pasaporte' },
                  ]
                : [{ valor: '03' as const, texto: 'Pasaporte' }]
            }
            valor={idTipo}
            alElegir={(v) => {
              setIdTipo(v);
              olvidarLoComprobado();
            }}
          />
        </>
      )}

      <Campo
        etiqueta={
          clase === 'empresa'
            ? 'Tu NIF'
            : clase === 'particular'
              ? 'DNI o NIE'
              : idTipo === '02'
                ? 'Número de IVA'
                : 'Pasaporte'
        }
        value={identificador}
        autoComplete="off"
        onChange={(e) => {
          setIdentificador(e.target.value);
          olvidarLoComprobado();
          if (deEmpresa) {
            setNombre('');
            setPideElNombre(false);
          }
        }}
        onBlur={() => void comprobar()}
        {...(seVeElNombre ? {} : loDeHacienda)}
      />
      {seVeElNombre && (
        <Campo
          etiqueta={clase === 'de_fuera' ? 'Nombre' : 'Nombre y apellidos'}
          value={nombre}
          autoComplete="name"
          onChange={(e) => {
            setNombre(e.target.value);
            olvidarLoComprobado();
          }}
          onBlur={() => void comprobar()}
          {...loDeHacienda}
        />
      )}
      <Campo
        etiqueta="Domicilio"
        value={domicilio}
        autoComplete="street-address"
        onChange={(e) => {
          setDomicilio(e.target.value);
        }}
      />
      <Campo
        etiqueta="Dónde te la mandamos"
        tipo="correo"
        value={correo}
        onChange={(e) => {
          setCorreo(e.target.value);
        }}
      />

      {error !== null && <ErrorEnCristiano error={error} />}

      <Boton
        tono="principal"
        type="submit"
        disabled={falta}
        cargando={pidiendo}
        textoCargando="Haciéndola"
      >
        Quiero la factura
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        Tus datos los trata {ticket.local}, que es quien te factura; Estook solo la hace. Se piden
        solo los que una factura exige.
      </p>
    </form>
  );
}

function YaTieneFactura({
  ticket,
  codigo,
  cliente,
}: {
  readonly ticket: LoQueEnsena;
  readonly codigo: string;
  readonly cliente: Cliente;
}) {
  const [haciendo, setHaciendo] = useState(false);
  const [mandada, setMandada] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  if (!ticket.conCorreo) {
    return (
      <UnEstado
        dibujo="bien"
        titulo="Este ticket ya tiene factura"
        frase={`Esta factura la tiene ${ticket.local}. Pídesela allí.`}
      />
    );
  }
  return (
    <UnEstado dibujo="bien" titulo="Este ticket ya tiene factura">
      {mandada ? (
        <p className="text-secundario">
          Mandada. Te llega en un momento; si no, pregunta en {ticket.local}.
        </p>
      ) : (
        <>
          <p className="text-secundario text-texto-suave">
            Se manda al correo que se dio, nunca a uno nuevo.
          </p>
          <Boton
            tono="secundario"
            cargando={haciendo}
            textoCargando="Mandando"
            onClick={() => {
              setHaciendo(true);
              setError(null);
              void cliente.ejecutar('mandar_otra_vez_mi_factura', { codigo }).then((r) => {
                setHaciendo(false);
                if (r.ok) setMandada(true);
                else setError(r.error);
              });
            }}
          >
            Mandarla otra vez
          </Boton>
        </>
      )}
      {error !== null &&
        (sonDemasiados(error) ? (
          <p className="text-secundario">
            Ya se ha mandado varias veces. Prueba dentro de una hora.
          </p>
        ) : (
          <ErrorEnCristiano error={error} />
        ))}
    </UnEstado>
  );
}

function EscribirElCodigo({
  alEscribir,
  sinTitulo = false,
}: {
  readonly alEscribir: (codigo: string) => void;
  readonly sinTitulo?: boolean;
}) {
  const [escrito, setEscrito] = useState('');
  const [mal, setMal] = useState(false);
  return (
    <form
      className="flex flex-col gap-e4"
      onSubmit={(e) => {
        e.preventDefault();
        const codigo = elCodigoEscrito(escrito);
        if (codigo === null) setMal(true);
        else alEscribir(codigo);
      }}
    >
      {!sinTitulo && (
        <h1 className="text-pantalla font-semibold leading-tight">Tu ticket o tu factura</h1>
      )}
      <Campo
        etiqueta="El código de tu papel"
        value={escrito}
        autoComplete="off"
        onChange={(e) => {
          setEscrito(e.target.value);
          setMal(false);
        }}
        {...(mal ? { error: 'Ese código no tiene buena pinta. Revísalo en el papel.' } : {})}
      />
      <Boton tono="principal" type="submit" disabled={escrito.trim() === ''}>
        Seguir
      </Boton>
    </form>
  );
}

const LOS_DIBUJOS = {
  bien: { signo: '✓', clases: 'bg-bien-suave text-bien' },
  espera: { signo: '…', clases: 'bg-info-suave text-info' },
  parado: { signo: '!', clases: 'bg-atencion-suave text-atencion' },
} as const;

function UnEstado({
  dibujo,
  titulo,
  frase,
  children,
}: {
  readonly dibujo?: keyof typeof LOS_DIBUJOS;
  readonly titulo: string;
  readonly frase?: string;
  readonly children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e3 py-e3">
      {dibujo !== undefined && (
        <span
          aria-hidden
          className={`grid size-e7 place-items-center rounded-redondo text-pantalla font-bold ${LOS_DIBUJOS[dibujo].clases}`}
        >
          {LOS_DIBUJOS[dibujo].signo}
        </span>
      )}
      <h1 className="text-pantalla font-semibold leading-tight">{titulo}</h1>
      {frase !== undefined && <p className="text-secundario text-texto-suave">{frase}</p>}
      {children}
    </section>
  );
}
