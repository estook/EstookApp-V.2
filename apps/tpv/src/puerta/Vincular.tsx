import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { elAparato as elNavegador, type ErrorDeLaApi } from '@estook/cliente-api';
import { CODIGO_PARA_VINCULAR, elCodigoDeLaDireccion } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv, LA_VERSION } from '../datos/cliente.ts';
import type { AparatoVinculado, DondeSePuedeVincular, QueSera } from '../datos/tipos.ts';
import { Teclado } from './Teclado.tsx';
import { cifraDeLaTecla } from './teclas.ts';
import { ElegirQueSera, Pastilla } from './ElegirQueSera.tsx';

/**
 * **Vincular este aparato** (maqueta 1; Anexo 11.3). Dos caminos:
 *
 *   · **Tengo un código** (lo normal): las seis cifras que se sacan en otro aparato del
 *     local, o el QR, que abre `estook.com/tpv/vincular#482913` y se vincula solo. El
 *     aparato llega ya con su función, su nombre y su local.
 *   · **Es el primero: entro con mi correo**: quien lleva el local, una vez, en este
 *     aparato. Elige qué es, y **su sesión se cierra al acabar**: lo que se queda es la
 *     llave del aparato.
 */
export function Vincular({ alVincular }: { readonly alVincular: (v: AparatoVinculado) => void }) {
  const [conCorreo, setConCorreo] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col bg-fondo text-texto lg:flex-row">
      <section className="flex flex-col gap-e5 border-borde bg-superficie p-e5 lg:w-[28rem] lg:border-r lg:p-e7">
        <div className="flex items-center gap-e3">
          <span className="flex size-12 items-center justify-center rounded-grande bg-naranja text-pantalla font-bold text-sobre-naranja">
            E
          </span>
          <span className="flex flex-col">
            <span className="text-pantalla font-bold">Estook TPV</span>
            <span className="text-secundario text-texto-tenue">Sala, caja y cocina</span>
          </span>
        </div>
        <h1 className="text-cifra font-bold">Vincula este aparato a tu local</h1>
        <p className="text-cuerpo text-texto-suave">
          Una vez y ya está. Después, cada persona entra con su PIN, el mismo con el que ficha.
        </p>
        {!conCorreo && (
          <ol className="flex flex-col gap-e3 text-cuerpo text-texto-suave">
            <Paso n={1}>
              En otro aparato del local:{' '}
              <b className="text-texto">Ajustes del TPV › Aparatos › Añadir</b>. Pídeselo a quien
              lleva el local.
            </Paso>
            <Paso n={2}>
              Sale un código de 6 cifras que dura 10 minutos. Escríbelo aquí, o lee su QR con la
              cámara.
            </Paso>
            <Paso n={3}>El código ya dice qué es: caja, comandero o el aparato para fichar.</Paso>
          </ol>
        )}
        <div className="flex-1" />
        <div className="flex flex-col gap-e2 rounded-grande bg-charcoal p-e4">
          {conCorreo ? (
            <>
              <span className="font-semibold">¿Tienes un código?</span>
              <button
                type="button"
                className="self-start text-cuerpo font-bold text-naranja"
                onClick={() => {
                  setConCorreo(false);
                }}
              >
                Vincular con un código
              </button>
            </>
          ) : (
            <>
              <span className="font-semibold">¿Es el primer aparato del local?</span>
              <span className="text-secundario text-texto-tenue">
                Entra una vez con el correo de quien lleva el local.
              </span>
              <button
                type="button"
                className="self-start text-cuerpo font-bold text-naranja"
                onClick={() => {
                  setConCorreo(true);
                }}
              >
                Entrar con mi correo
              </button>
            </>
          )}
        </div>
      </section>
      <section className="flex flex-1 flex-col items-center justify-center gap-e5 p-e5">
        {conCorreo ? (
          <ConMiCorreo alVincular={alVincular} />
        ) : (
          <ConCodigo alVincular={alVincular} />
        )}
      </section>
    </main>
  );
}

function Paso({ n, children }: { readonly n: number; readonly children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-e3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-redondo bg-charcoal text-secundario font-bold text-texto">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

// ── Con el código ────────────────────────────────────────────────────────────

function ConCodigo({ alVincular }: { readonly alVincular: (v: AparatoVinculado) => void }) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  // El código que trae el QR (`#482913`): se lee una vez y se quita de la dirección.
  const [codigo, setCodigo] = useState(() => elCodigoDeLaDireccion(window.location) ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const yaProbado = useRef<string | null>(null);

  const vincular = useCallback(
    async (elCodigo: string) => {
      if (yaProbado.current === elCodigo) return;
      yaProbado.current = elCodigo;
      setOcupado(true);
      setError(null);
      const respuesta = await cliente.ejecutar<AparatoVinculado>('vincular_con_codigo', {
        codigo: elCodigo,
        version: LA_VERSION,
      });
      setOcupado(false);
      if (respuesta.ok) {
        window.history.replaceState(null, '', import.meta.env.BASE_URL);
        alVincular(respuesta.datos);
        return;
      }
      setError(respuesta.error);
      setCodigo('');
      yaProbado.current = null;
    },
    [cliente, alVincular],
  );

  // **Al escribir la sexta cifra se vincula solo**, y también al llegar con el QR.
  useEffect(() => {
    if (codigo.length === CODIGO_PARA_VINCULAR.cifras) void vincular(codigo);
  }, [codigo, vincular]);

  const teclear = useCallback(
    (cifra: string) => {
      if (ocupado) return;
      setError(null);
      setCodigo((c) => (c.length >= CODIGO_PARA_VINCULAR.cifras ? c : `${c}${cifra}`));
    },
    [ocupado],
  );
  const borrar = useCallback(() => {
    setCodigo((c) => c.slice(0, -1));
  }, []);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar]);

  return (
    <div className="flex w-full max-w-[24rem] flex-col items-center gap-e5">
      <span className="text-seccion font-semibold text-texto-suave">El código de vinculación</span>
      <div className="flex gap-e2" role="img" aria-label={`${String(codigo.length)} de 6 cifras`}>
        {Array.from({ length: CODIGO_PARA_VINCULAR.cifras }, (_, i) => (
          <span
            key={i}
            className={[
              'flex h-16 w-12 items-center justify-center rounded-grande bg-superficie text-cifra-media font-bold',
              i < codigo.length
                ? 'border-2 border-naranja'
                : 'border-2 border-borde text-texto-tenue',
            ].join(' ')}
          >
            {codigo[i] ?? '·'}
          </span>
        ))}
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
      <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} redondo={false} />
      <span className="text-center text-secundario text-texto-tenue">
        {ocupado
          ? 'Vinculando…'
          : 'Al escribir la sexta cifra se vincula solo. Con el QR, ábrelo con la cámara de este aparato.'}
      </span>
    </div>
  );
}

// ── El primero, con el correo ────────────────────────────────────────────────

type Paso =
  | { readonly que: 'entrar' }
  | { readonly que: 'doble_factor' }
  | { readonly que: 'elegir_local'; readonly donde: DondeSePuedeVincular['locales'] }
  | { readonly que: 'que_sera'; readonly local: DondeSePuedeVincular['locales'][number] };

function ConMiCorreo({ alVincular }: { readonly alVincular: (v: AparatoVinculado) => void }) {
  // **La sesión vive solo en la memoria y solo para esto**: no se guarda en el aparato,
  // y la API la cierra al vincular (Anexo 11.3).
  const token = useRef<string | null>(null);
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => token.current }), []);
  const [paso, setPaso] = useState<Paso>({ que: 'entrar' });
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function dondeSePuede() {
    const respuesta = await cliente.consultar<DondeSePuedeVincular>('donde_puedo_vincular');
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    const { locales } = respuesta.datos;
    if (locales.length === 0) {
      setAviso('Tu puesto no vincula aparatos. Lo hace quien lleva el local: pídeselo.');
      token.current = null;
      setPaso({ que: 'entrar' });
    } else if (locales.length === 1 && locales[0] !== undefined) {
      setPaso({ que: 'que_sera', local: locales[0] });
    } else {
      setPaso({ que: 'elegir_local', donde: locales });
    }
  }

  async function entrar() {
    setOcupado(true);
    setError(null);
    setAviso(null);
    const respuesta = await cliente.ejecutar<{
      token: string;
      faltaDobleFactor: boolean;
      debeActivarDobleFactor: boolean;
      debeCambiarClave: boolean;
    }>('entrar', { correo: correo.trim(), contrasena, aparato: elNavegador() ?? undefined });
    setOcupado(false);
    setContrasena('');
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    token.current = respuesta.datos.token;
    if (respuesta.datos.debeCambiarClave || respuesta.datos.debeActivarDobleFactor) {
      setAviso(
        respuesta.datos.debeCambiarClave
          ? 'Antes tienes que poner tu propia contraseña: entra en Estook, cámbiala y vuelve aquí.'
          : 'Tu cuenta tiene que activar el segundo factor: hazlo en Estook › Mi acceso y vuelve aquí.',
      );
      token.current = null;
      return;
    }
    if (respuesta.datos.faltaDobleFactor) {
      setPaso({ que: 'doble_factor' });
      return;
    }
    await dondeSePuede();
  }

  async function superar() {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ superado: boolean }>('superar_doble_factor', {
      codigo: codigo.trim(),
    });
    setOcupado(false);
    setCodigo('');
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await dondeSePuede();
  }

  async function vincular(localId: string, que: QueSera) {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<AparatoVinculado>('vincular_el_primer_aparato', {
      local_id: localId,
      ...que,
      version: LA_VERSION,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    token.current = null;
    alVincular(respuesta.datos);
  }

  const campo =
    'min-h-toque-cocina w-full rounded-grande border-2 border-borde bg-superficie px-e4 text-seccion text-texto';

  return (
    <div className="flex w-full max-w-[52rem] flex-col gap-e5">
      {aviso !== null && (
        <p
          role="status"
          className="rounded-grande bg-atencion-suave p-e4 text-cuerpo text-atencion"
        >
          {aviso}
        </p>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}

      {paso.que === 'entrar' && (
        <form
          className="mx-auto flex w-full max-w-[24rem] flex-col gap-e4"
          onSubmit={(e) => {
            e.preventDefault();
            void entrar();
          }}
        >
          <h2 className="text-pantalla font-bold">Entra con tu correo</h2>
          <label className="flex flex-col gap-e2">
            <span className="text-secundario font-semibold text-texto-tenue">Correo</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
              }}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-e2">
            <span className="text-secundario font-semibold text-texto-tenue">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(e) => {
                setContrasena(e.target.value);
              }}
              className={campo}
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja disabled:opacity-60"
          >
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="text-secundario text-texto-tenue">
            Tu sesión no se queda en este aparato: al vincularlo se cierra, y cada uno entra con su
            PIN.
          </p>
        </form>
      )}

      {paso.que === 'doble_factor' && (
        <form
          className="mx-auto flex w-full max-w-[24rem] flex-col gap-e4"
          onSubmit={(e) => {
            e.preventDefault();
            void superar();
          }}
        >
          <h2 className="text-pantalla font-bold">El código de tu aplicación</h2>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Código del segundo factor"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
            }}
            className={campo}
          />
          <button
            type="submit"
            disabled={ocupado || codigo.trim().length < 6}
            className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja disabled:opacity-60"
          >
            {ocupado ? 'Comprobando…' : 'Seguir'}
          </button>
        </form>
      )}

      {paso.que === 'elegir_local' && (
        <div className="flex flex-col gap-e4">
          <h2 className="text-pantalla font-bold">¿De qué local es este aparato?</h2>
          <div role="radiogroup" aria-label="El local" className="flex flex-wrap gap-e2">
            {paso.donde.map((l) => (
              <Pastilla
                key={l.id}
                puesta={false}
                alElegir={() => {
                  setPaso({ que: 'que_sera', local: l });
                }}
              >
                {l.nombre}
              </Pastilla>
            ))}
          </div>
        </div>
      )}

      {paso.que === 'que_sera' && (
        <div className="flex flex-col gap-e4">
          <div className="flex flex-col">
            <span className="text-secundario text-texto-tenue">
              Vinculado a {paso.local.nombre}
            </span>
            <h2 className="text-cifra-media font-bold">¿Qué es este aparato?</h2>
          </div>
          <ElegirQueSera
            cajones={paso.local.cajones}
            personas={paso.local.personas}
            losQueHay={paso.local.aparatos}
            textoDelBoton="Listo"
            ocupado={ocupado}
            alElegir={(que) => {
              void vincular(paso.local.id, que);
            }}
          />
          <p className="text-secundario text-texto-tenue">
            Al tocar «Listo» tu sesión se cierra en este aparato: se queda con su propia llave y
            cada uno entra con su PIN. Se cambia cuando quieras en Ajustes del TPV › Aparatos.
          </p>
        </div>
      )}
    </div>
  );
}
