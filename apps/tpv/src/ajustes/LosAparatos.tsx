import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CODIGO_PARA_VINCULAR, NOMBRE_DE_LA_FUNCION } from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { irA } from '../navegar.ts';
import { ElegirQueSera } from '../puerta/ElegirQueSera.tsx';
import { IconoEnSuColor } from '../iconos.tsx';
import { COMO_SE_VE_LA_FUNCION } from '../logica/comoSeVeElAparato.ts';
import type {
  CodigoParaVincular,
  QueSera,
  LosAparatos as LosAparatosDeLaApi,
  UnAparato,
} from '../datos/tipos.ts';

/**
 * **Ajustes del TPV › Aparatos** (maquetas 11, 16 y 20; Anexo 11.3): los vinculados, con
 * «En línea» o «Visto hace 2 días»; **Añadir aparato**, que pide primero qué será y de
 * quién, y saca el código de 6 cifras con su QR; y en cada uno, **qué es y cómo se
 * llama**, que se cambia sin volver a vincularlo, y **Desvincular**, que lo deja sin valer
 * en su petición siguiente. **Cada uno con su dibujo y su color** (la entrada nueva): la caja,
 * naranja; el comandero, azul; la pantalla de cocina, verde; la de barra, ámbar.
 */
export function LosAparatos({ resto }: { readonly resto: string }) {
  const { cliente } = usarSesion();
  const aparatos = useQuery({
    queryKey: ['los_aparatos'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LosAparatosDeLaApi>('los_aparatos');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
    refetchInterval: 30_000,
  });

  if (aparatos.isLoading) return <Cargando que="los aparatos" />;
  if (aparatos.data === undefined) {
    return aparatos.error instanceof FalloDeLaSala ? (
      <ErrorEnCristiano error={aparatos.error.error} />
    ) : null;
  }
  const datos = aparatos.data;
  if (resto === 'anadir') return <AnadirAparato datos={datos} />;
  const uno = datos.aparatos.find((a) => a.id === resto);
  if (uno !== undefined) {
    return <ElAparato aparato={uno} esEste={uno.id === datos.este} datos={datos} />;
  }

  return (
    <div className="flex max-w-[48rem] flex-col gap-e4">
      <div className="flex flex-wrap items-center gap-e3">
        <h1 className="flex-1 text-cifra-media font-bold">Aparatos</h1>
        <button
          type="button"
          onClick={() => {
            irA('ajustes/aparatos/anadir');
          }}
          className="min-h-toque-cocina rounded-grande bg-naranja px-e5 text-seccion font-bold text-sobre-naranja"
        >
          Añadir aparato
        </button>
      </div>
      <ul className="flex flex-col gap-e3">
        {datos.aparatos.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => {
                irA(`ajustes/aparatos/${a.id}`);
              }}
              className={[
                'flex w-full items-center gap-e4 rounded-mayor bg-superficie p-e4 text-left',
                a.id === datos.este ? 'border-2 border-borde-fuerte' : '',
              ].join(' ')}
            >
              <IconoEnSuColor
                dibujo={COMO_SE_VE_LA_FUNCION[a.funcion].dibujo}
                tono={COMO_SE_VE_LA_FUNCION[a.funcion].tono}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-seccion font-bold">
                  {a.nombre}
                  {a.id === datos.este ? ' · este aparato' : ''}
                </span>
                <span className="truncate text-secundario text-texto-tenue">{loQueEs(a)}</span>
              </span>
              <span
                className={`text-secundario font-bold ${a.enLinea ? 'text-bien' : 'text-texto-tenue'}`}
              >
                {a.vale ? (a.enLinea ? 'En línea' : vistoHace(a.vistoEn)) : 'Ya no vale'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function loQueEs(a: UnAparato): string {
  const partes: string[] = [];
  if (a.funcion === 'comandero')
    partes.push(
      a.dueno === null
        ? 'Comandero para todos'
        : `Comandero personal · solo entra ${a.dueno.nombre}`,
    );
  else partes.push(NOMBRE_DE_LA_FUNCION[a.funcion]);
  if (a.cajon !== null) partes.push(a.cajon.nombre);
  if (!a.vale && a.dueno !== null) partes.push(`${a.dueno.nombre} ya no toma nota en el local`);
  return partes.join(' · ');
}

function vistoHace(cuando: string | null): string {
  if (cuando === null) return 'Sin ver todavía';
  const minutos = Math.floor((Date.now() - new Date(cuando).getTime()) / 60_000);
  if (minutos < 60) return `Visto hace ${String(Math.max(minutos, 1))} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Visto hace ${String(horas)} h`;
  const dias = Math.floor(horas / 24);
  return `Visto hace ${String(dias)} ${dias === 1 ? 'día' : 'días'}`;
}

// ── Añadir: qué será, y el código ────────────────────────────────────────────

function AnadirAparato({ datos }: { readonly datos: LosAparatosDeLaApi }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [codigo, setCodigo] = useState<(CodigoParaVincular & { readonly nombre: string }) | null>(
    null,
  );

  if (codigo !== null) {
    return (
      <ElCodigo
        codigo={codigo}
        alAcabar={() => {
          void cache.invalidateQueries({ queryKey: ['los_aparatos'] });
          irA('ajustes/aparatos');
        }}
      />
    );
  }
  return (
    <div className="flex max-w-[56rem] flex-col gap-e4">
      <div className="flex flex-col">
        <span className="text-secundario text-texto-tenue">Aparatos › Añadir · paso 1 de 2</span>
        <h1 className="text-cifra-media font-bold">¿Qué va a ser el aparato nuevo?</h1>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
      <ElegirQueSera
        cajones={datos.cajones}
        personas={datos.personas}
        losQueHay={datos.aparatos.map((a) => a.nombre)}
        textoDelBoton="Sacar el código"
        ocupado={ocupado}
        alElegir={(que) => {
          void (async () => {
            setOcupado(true);
            setError(null);
            const respuesta = await cliente.ejecutar<CodigoParaVincular>(
              'sacar_codigo_para_vincular',
              que,
            );
            setOcupado(false);
            if (!respuesta.ok) {
              setError(respuesta.error);
              return;
            }
            setCodigo({ ...respuesta.datos, nombre: que.nombre });
          })();
        }}
      />
      <p className="text-secundario text-texto-tenue">
        El código que sale ya lleva todo esto: en el aparato nuevo no hay que elegir nada.
      </p>
    </div>
  );
}

/** El código, una sola vez, con su QR y lo que le queda de vida. */
function ElCodigo({
  codigo,
  alAcabar,
}: {
  readonly codigo: CodigoParaVincular & { readonly nombre: string };
  readonly alAcabar: () => void;
}) {
  const direccion = `${window.location.origin}${import.meta.env.BASE_URL}vincular/#${codigo.codigo}`;
  const [camino, setCamino] = useState<{ d: string; lado: number } | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const estado = { vivo: true };
    void (async () => {
      const { laMatriz, elCaminoDelQr, MARGEN } = await import('@estook/ui/qr');
      const matriz = await laMatriz(direccion);
      if (estado.vivo)
        setCamino({ d: elCaminoDelQr(matriz, MARGEN), lado: matriz.length + MARGEN * 2 });
    })().catch(() => {
      // Sin el QR, el código de seis cifras sigue valiendo.
    });
    const cada = window.setInterval(() => {
      setAhora(Date.now());
    }, 1_000);
    return () => {
      estado.vivo = false;
      window.clearInterval(cada);
    };
  }, [direccion]);

  const quedan = Math.max(0, Math.ceil((new Date(codigo.caducaEn).getTime() - ahora) / 1_000));
  const minutos = Math.floor(quedan / 60);
  const segundos = String(quedan % 60).padStart(2, '0');

  return (
    <div className="flex max-w-[40rem] flex-col gap-e5">
      <div className="flex flex-col">
        <span className="text-secundario text-texto-tenue">Aparatos › Añadir · paso 2 de 2</span>
        <h1 className="text-cifra-media font-bold">Vincula «{codigo.nombre}»</h1>
      </div>
      <p className="text-cuerpo text-texto-suave">
        En el aparato nuevo abre <b className="text-texto">estook.com/tpv</b> y escribe el código, o
        lee el QR con su cámara.
      </p>
      <div className="flex flex-wrap items-center gap-e6 rounded-mayor bg-superficie p-e5">
        {camino !== null && (
          <svg
            role="img"
            aria-label="El QR para vincular el aparato nuevo"
            viewBox={`0 0 ${String(camino.lado)} ${String(camino.lado)}`}
            className="size-40 rounded-grande"
          >
            {/* Negro sobre blanco en cualquier tema, como el QR de la carta: es lo que lee una cámara. */}
            <rect width={camino.lado} height={camino.lado} fill="#fff" />
            <path d={camino.d} fill="#000" />
          </svg>
        )}
        <div className="flex flex-col gap-e2">
          <span
            className="text-[2.75rem] font-bold tracking-[0.12em] tabular-nums"
            aria-label={`Código ${codigo.codigo.split('').join(' ')}`}
          >
            {codigo.codigo.slice(0, 3)} {codigo.codigo.slice(3)}
          </span>
          <span className="text-secundario text-texto-tenue">
            {quedan > 0
              ? `Caduca en ${String(minutos)}:${segundos} · sirve una vez`
              : `Ha caducado: saca otro (dura ${String(CODIGO_PARA_VINCULAR.minutos)} minutos)`}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={alAcabar}
        className="min-h-toque-cocina self-start rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
      >
        Hecho
      </button>
    </div>
  );
}

// ── Uno: qué es, cómo se llama, y desvincular ────────────────────────────────

/**
 * **Entre caja y comandero se cambia aquí** (Anexo 11.3), sin volver a vincular: la caja
 * de la barra que pasa a ser la tablet de la terraza. **El aparato para fichar** vive en
 * la pantalla de fichar de Estook, con su llave, y no en Estook TPV: para que sea otra
 * cosa se desvincula y se vincula otra vez; aquí solo se le cambia el nombre.
 */
const SE_CAMBIA_ENTRE = ['caja', 'comandero'] as const;

function ElAparato({
  aparato,
  esEste,
  datos,
}: {
  readonly aparato: UnAparato;
  readonly esEste: boolean;
  readonly datos: LosAparatosDeLaApi;
}) {
  const { cliente, bloquear } = usarSesion();
  const cache = useQueryClient();
  const [nombre, setNombre] = useState(aparato.nombre);
  const [seguro, setSeguro] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);
  const seCambiaLoQueEs = aparato.funcion === 'caja' || aparato.funcion === 'comandero';

  async function guardar(que: QueSera) {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar('cambiar_aparato', {
      terminal_id: aparato.id,
      ...que,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setGuardado(true);
    await cache.invalidateQueries({ queryKey: ['los_aparatos'] });
    // Si este aparato pasa a ser otra cosa, se bloquea y vuelve con lo que es ahora.
    if (esEste && que.funcion !== aparato.funcion) bloquear();
  }

  function renombrar() {
    void guardar({
      funcion: aparato.funcion,
      nombre: nombre.trim(),
      ...(aparato.dueno === null ? {} : { persona_id: aparato.dueno.id }),
      ...(aparato.cajon === null ? {} : { cajon_id: aparato.cajon.id }),
    });
  }

  async function desvincular() {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ eraEste: boolean }>('desvincular_aparato', {
      terminal_id: aparato.id,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['los_aparatos'] });
    // Si era este, al bloquear el latido dirá que ya no está vinculado.
    if (respuesta.datos.eraEste) bloquear();
    else irA('ajustes/aparatos');
  }

  return (
    <div className="flex max-w-[44rem] flex-col gap-e5">
      <button
        type="button"
        onClick={() => {
          irA('ajustes/aparatos');
        }}
        className="self-start text-secundario font-semibold text-texto-tenue"
      >
        ‹ Aparatos
      </button>
      <div className="flex flex-col">
        <h1 className="text-cifra-media font-bold">
          {aparato.nombre}
          {esEste ? ' · este aparato' : ''}
        </h1>
        <span className="text-secundario text-texto-tenue">
          {loQueEs(aparato)} ·{' '}
          {aparato.enLinea ? 'en línea' : vistoHace(aparato.vistoEn).toLowerCase()}
          {aparato.version === null ? '' : ` · versión ${aparato.version}`}
        </span>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
      {guardado && seCambiaLoQueEs && (
        <p role="status" className="text-cuerpo font-semibold text-bien">
          Guardado
        </p>
      )}
      {seCambiaLoQueEs ? (
        <ElegirQueSera
          // Con lo guardado, vuelve a empezar desde lo que es ahora.
          key={`${aparato.funcion}·${aparato.nombre}·${aparato.dueno?.id ?? ''}·${aparato.cajon?.id ?? ''}`}
          cajones={datos.cajones}
          personas={datos.personas}
          losQueHay={datos.aparatos.filter((a) => a.id !== aparato.id).map((a) => a.nombre)}
          funciones={SE_CAMBIA_ENTRE}
          yaEs={{
            funcion: aparato.funcion,
            nombre: aparato.nombre,
            personaId: aparato.dueno?.id ?? null,
            cajonId: aparato.cajon?.id ?? null,
          }}
          textoDelBoton="Guardar"
          ocupado={ocupado}
          alElegir={(que) => {
            setGuardado(false);
            void guardar(que);
          }}
        />
      ) : (
        <label className="flex flex-col gap-e2">
          <span className="text-secundario font-semibold text-texto-tenue">Cómo se llama</span>
          <span className="flex flex-wrap gap-e3">
            <input
              value={nombre}
              maxLength={60}
              onChange={(e) => {
                setNombre(e.target.value);
                setGuardado(false);
              }}
              className="min-h-toque-cocina min-w-[16rem] flex-1 rounded-grande border-2 border-borde bg-superficie px-e4 text-seccion font-semibold"
            />
            <button
              type="button"
              disabled={ocupado || nombre.trim() === '' || nombre.trim() === aparato.nombre}
              onClick={renombrar}
              className="min-h-toque-cocina rounded-grande bg-charcoal px-e5 font-bold disabled:opacity-60"
            >
              {guardado ? 'Guardado' : 'Guardar'}
            </button>
          </span>
        </label>
      )}

      <section className="flex flex-col gap-e3 rounded-mayor border-2 border-mal bg-mal-suave p-e5">
        <span className="text-seccion font-bold">¿Desvincular {aparato.nombre}?</span>
        <span className="text-cuerpo text-texto-suave">
          Deja de valer al momento: en su siguiente toque dirá que ya no está vinculado. Lo que
          tuviera sin subir, si se enciende con internet antes, se sube; si no, se pierde.
          {esEste
            ? ' Es este aparato: al desvincularlo, habrá que vincularlo otra vez para usarlo.'
            : ''}
        </span>
        {seguro ? (
          <span className="flex flex-wrap gap-e3">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void desvincular()}
              className="min-h-toque-cocina rounded-grande bg-mal px-e5 font-bold text-fondo disabled:opacity-60"
            >
              Sí, desvincular
            </button>
            <button
              type="button"
              onClick={() => {
                setSeguro(false);
              }}
              className="min-h-toque-cocina rounded-grande border-2 border-borde px-e5 font-bold"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSeguro(true);
            }}
            className="min-h-toque-cocina self-start rounded-grande border-2 border-mal px-e5 font-bold text-mal"
          >
            Desvincular
          </button>
        )}
      </section>
    </div>
  );
}
