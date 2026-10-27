import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { laPruebaEnPapel } from '@estook/dominio';
import type { ImpresoraEncontrada } from '@estook/impresion';
import { puedeEditar } from '@estook/permisos';
import { Boton, Cargando, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala, type DondeSale } from '../ganchos/usarLaSala.ts';
import { IconoEnSuColor, type Tono } from '../iconos.tsx';
import { DONDE_SE_DESCARGA, laCajaParaWindows } from '../datos/laCajaParaWindows.ts';

/**
 * **Ajustes del TPV › Impresoras y cajón** (T5 · 1, decisión 0119; maquetas de T5, 2; Anexo 6.5 y
 * 11.13): las impresoras del local con cómo están, **«Buscar impresoras»** en la red del local
 * (solo dentro de la caja para Windows: la web no puede), **«Imprimir prueba» y «¿Ha salido?»**,
 * qué imprime cada una, el cajón, la de reserva, y **dónde sale lo de la cocina y la barra**.
 *
 * La dirección de una impresora no llega nunca aquí (Anexo 6.8): la sabe la caja que la imprime.
 */

type Imprime = 'cocina' | 'barra' | 'caja';

interface Impresora {
  readonly id: string;
  readonly nombre: string;
  readonly modelo: string | null;
  readonly anchoMm: 58 | 80;
  readonly imprime: readonly Imprime[];
  readonly tieneCajon: boolean;
  readonly reservaId: string | null;
  readonly estado: 'sin_saber' | 'lista' | 'poco_papel' | 'sin_papel' | 'no_responde';
  readonly vistoEn: string | null;
  readonly laImprime: string;
  readonly deEstaCaja: boolean;
}

interface LasImpresoras {
  readonly impresoras: readonly Impresora[];
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
}

interface LaCocinaYLaBarra {
  readonly avisoMin: number;
  readonly tardeMin: number;
  readonly suena: boolean;
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
}

const LO_QUE_IMPRIME: Readonly<Record<Imprime, string>> = {
  cocina: 'Cocina',
  barra: 'Barra',
  caja: 'Caja',
};
const DE_QUE_ES: Readonly<Record<Imprime, string>> = {
  cocina: 'comandas de cocina',
  barra: 'lo de la barra',
  caja: 'la cuenta y el ticket',
};
const TONO: Readonly<Record<Imprime, Tono>> = { cocina: 'verde', barra: 'ambar', caja: 'naranja' };

const COMO_ESTA: Readonly<Record<Impresora['estado'], { texto: string; color: string }>> = {
  sin_saber: { texto: 'Sin saber aún', color: 'text-texto-tenue' },
  lista: { texto: 'Lista', color: 'text-bien' },
  poco_papel: { texto: 'Poco papel', color: 'text-atencion' },
  sin_papel: { texto: 'Sin papel', color: 'text-mal' },
  no_responde: { texto: 'No responde', color: 'text-mal' },
};

const DONDE: readonly { readonly valor: DondeSale; readonly texto: string }[] = [
  { valor: 'pantalla', texto: 'Pantalla' },
  { valor: 'papel', texto: 'Papel' },
  { valor: 'las_dos', texto: 'Las dos' },
];

export function ImpresorasYCajon() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const caja = laCajaParaWindows();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Impresora | 'nueva' | null>(null);
  const [nueva, setNueva] = useState<ImpresoraEncontrada | null>(null);
  const [cajon, setCajon] = useState(false);
  const [encontradas, setEncontradas] = useState<readonly ImpresoraEncontrada[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const puedeElCajon = puedeEditar(yo.permisos, 'accion.abrir_el_cajon');

  const lista = useQuery({
    queryKey: ['las_impresoras'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LasImpresoras>('las_impresoras');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
    refetchInterval: 15_000,
  });

  async function volverALeer() {
    await cache.invalidateQueries({ queryKey: ['las_impresoras'] });
    await cache.invalidateQueries({ queryKey: ['sala'] });
  }

  async function hacer(nombre: string, entrada: unknown, hecho: string): Promise<boolean> {
    setError(null);
    setAviso(null);
    const respuesta = await cliente.ejecutar(nombre, entrada);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return false;
    }
    setAviso(hecho);
    await volverALeer();
    return true;
  }

  async function buscar() {
    if (caja === null) return;
    setBuscando(true);
    setEncontradas(null);
    try {
      setEncontradas(await caja.buscarImpresoras());
    } finally {
      setBuscando(false);
    }
  }

  if (lista.isLoading) return <Cargando que="las impresoras" />;
  if (lista.data === undefined) {
    return lista.error instanceof FalloDeLaSala ? <ErrorEnCristiano error={lista.error.error} /> : null;
  }
  const datos = lista.data;
  const conCajon = datos.impresoras.filter((i) => i.tieneCajon).length;
  const nuevasDeVerdad = (encontradas ?? []).filter((e) => e.yaDadaDeAlta === null);

  return (
    <div className="flex max-w-[48rem] flex-col gap-e5">
      <div className="flex flex-wrap items-center gap-e3">
        <div className="flex flex-1 flex-col">
          <h1 className="text-cifra-media font-bold">Impresoras y cajón</h1>
          <span className="text-secundario text-texto-tenue">
            {datos.impresoras.length === 1
              ? '1 impresora'
              : `${String(datos.impresoras.length)} impresoras`}
            {' · '}
            {conCajon === 0 ? 'sin cajón' : conCajon === 1 ? '1 cajón' : `${String(conCajon)} cajones`}
          </span>
        </div>
        {caja !== null && (
          <Boton tono="principal" cargando={buscando} textoCargando="Buscando" onClick={() => void buscar()}>
            Buscar impresoras
          </Boton>
        )}
      </div>

      {error !== null && <ErrorEnCristiano error={error} />}
      {aviso !== null && (
        <p role="status" className="font-semibold text-bien">
          {aviso}
        </p>
      )}

      {caja === null && <DescargaLaCaja />}

      {encontradas !== null && (
        <section aria-label="Encontradas" className="flex flex-col gap-e3 rounded-mayor bg-superficie p-e5">
          <span className="text-seccion font-bold">
            {nuevasDeVerdad.length === 0
              ? 'No hay ninguna nueva en la red'
              : nuevasDeVerdad.length === 1
                ? '1 nueva en la red'
                : `${String(nuevasDeVerdad.length)} nuevas en la red`}
          </span>
          {nuevasDeVerdad.length === 0 && (
            <span className="text-secundario text-texto-tenue">
              Mira que esté encendida y con el cable de red puesto, y vuelve a buscar.
            </span>
          )}
          {nuevasDeVerdad.map((e) => (
            <LaEncontrada
              key={e.direccion}
              encontrada={e}
              local={yo.local?.nombre ?? 'Tu local'}
              alSalir={() => {
                setNueva(e);
                setEditando('nueva');
              }}
            />
          ))}
        </section>
      )}

      <section aria-label="Las impresoras" className="flex flex-col rounded-mayor bg-superficie">
        {datos.impresoras.length === 0 && (
          <p className="p-e5 text-secundario text-texto-tenue">
            {caja === null
              ? 'Ninguna todavía. Se dan de alta desde la caja para Windows, que las encuentra en la red.'
              : 'Ninguna todavía. «Buscar impresoras» las encuentra en la red del local.'}
          </p>
        )}
        {datos.impresoras.map((i) => {
          const estado = COMO_ESTA[i.estado];
          const principal = i.imprime[0] ?? 'caja';
          return (
            <div
              key={i.id}
              className="flex flex-wrap items-center gap-e3 border-b border-borde p-e4 last:border-b-0"
            >
              <IconoEnSuColor dibujo="impresora" tono={TONO[principal]} />
              <div className="flex min-w-0 flex-[1_1_14rem] flex-col">
                <span className="font-bold">{i.nombre}</span>
                <span className="text-secundario text-texto-tenue">
                  {[
                    i.modelo ?? 'Impresora',
                    'por la red',
                    i.imprime.length === 0 ? 'no imprime nada aún' : i.imprime.map((x) => DE_QUE_ES[x]).join(', '),
                    i.tieneCajon ? 'con el cajón' : null,
                    i.deEstaCaja ? null : `la imprime ${i.laImprime}`,
                  ]
                    .filter((x) => x !== null)
                    .join(' · ')}
                </span>
              </div>
              <span className={`text-secundario font-bold ${estado.color}`}>{estado.texto}</span>
              <Boton
                tono="secundario"
                onClick={() =>
                  void hacer('imprimir_prueba', { impresora_id: i.id }, `Sale la prueba por ${i.nombre}.`)
                }
              >
                Prueba
              </Boton>
              {i.tieneCajon && i.deEstaCaja && puedeElCajon && (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    setCajon(true);
                  }}
                >
                  Abrir el cajón
                </Boton>
              )}
              <Boton
                tono="texto"
                onClick={() => {
                  setEditando(i);
                }}
              >
                Cambiar
              </Boton>
            </div>
          );
        })}
      </section>

      <DondeSaleCadaCosa datos={datos} alGuardar={volverALeer} />

      {editando !== null && (
        <Hoja
          abierta
          titulo={editando === 'nueva' ? 'Darla de alta' : editando.nombre}
          alCerrar={() => {
            setEditando(null);
            setNueva(null);
          }}
        >
          <ElEditor
            impresora={editando === 'nueva' ? null : editando}
            encontrada={nueva}
            lasDemas={datos.impresoras.filter((x) => editando === 'nueva' || x.id !== editando.id)}
            alGuardar={async (entrada, hecho) => {
              const bien = await hacer('guardar_impresora', entrada, hecho);
              if (bien) {
                setEditando(null);
                setNueva(null);
                if (caja !== null) setEncontradas(await caja.buscarImpresoras().catch(() => null));
              }
            }}
            alQuitar={async (id) => {
              const bien = await hacer('quitar_impresora', { impresora_id: id }, 'Quitada.');
              if (bien) setEditando(null);
            }}
          />
        </Hoja>
      )}

      {cajon && (
        <Hoja
          abierta
          titulo="Abrir el cajón"
          alCerrar={() => {
            setCajon(false);
          }}
        >
          <AbrirElCajon
            alAbrir={async (motivo) => {
              const bien = await hacer('abrir_el_cajon', { motivo }, 'El cajón se abre. Queda apuntado.');
              if (bien) setCajon(false);
            }}
          />
        </Hoja>
      )}
    </div>
  );
}

/** Fuera del programa: la web no puede hablar con una impresora (Anexo 6.1). */
function DescargaLaCaja() {
  return (
    <section className="flex flex-col gap-e3 rounded-mayor border-2 border-info bg-info-suave p-e5">
      <span className="text-seccion font-bold">Para imprimir, descarga la caja para Windows</span>
      <span className="text-secundario">
        Es esta misma caja en un programa: imprime las comandas y la cuenta, abre el cajón y, más
        adelante, sigue sin internet. Al abrirla, pásale esta caja con el código de Aparatos › esta
        caja › «Pasar a la app».
      </span>
      <div className="flex flex-wrap gap-e3">
        <a
          href={DONDE_SE_DESCARGA}
          className="inline-flex min-h-toque items-center rounded-grande bg-naranja px-e5 font-bold text-sobre-naranja"
        >
          Descargar
        </a>
      </div>
      <span className="text-secundario text-texto-tenue">
        La primera vez, Windows puede decir «Windows protegió su PC»: toca «Más información» y
        «Ejecutar de todas formas».
      </span>
    </section>
  );
}

/** Una nueva en la red: su prueba, directa, y «¿Ha salido?». */
function LaEncontrada({
  encontrada,
  local,
  alSalir,
}: {
  readonly encontrada: ImpresoraEncontrada;
  readonly local: string;
  readonly alSalir: () => void;
}) {
  const caja = laCajaParaWindows();
  const [probando, setProbando] = useState(false);
  const [como, setComo] = useState<'sin_probar' | 'preguntando' | 'no_salio'>('sin_probar');
  const [porque, setPorque] = useState<string | null>(null);

  async function probar() {
    if (caja === null) return;
    setProbando(true);
    const ahora = new Date();
    const salio = await caja.imprimirDirecto(
      encontrada.direccion,
      80,
      laPruebaEnPapel({
        local,
        impresora: encontrada.modelo ?? 'Impresora nueva',
        cuando: ahora.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
        imprime: [],
      }),
    );
    setProbando(false);
    setPorque(salio.porque);
    setComo(salio.salio ? 'preguntando' : 'no_salio');
  }

  return (
    <div className="flex flex-col gap-e3 rounded-grande border border-borde p-e4">
      <div className="flex flex-wrap items-center gap-e3">
        <IconoEnSuColor dibujo="impresora" tono="gris" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{encontrada.modelo ?? 'Impresora'}</span>
          <span className="text-secundario text-texto-tenue">por la red · nueva</span>
        </div>
        <Boton tono="principal" cargando={probando} textoCargando="Imprimiendo" onClick={() => void probar()}>
          Imprimir prueba
        </Boton>
      </div>
      {como === 'preguntando' && (
        <div className="flex flex-wrap items-center gap-e3 rounded-grande bg-info-suave p-e3">
          <span className="flex-1 font-semibold">¿Ha salido el papel de prueba?</span>
          <Boton tono="principal" onClick={alSalir}>
            Sí, ha salido
          </Boton>
          <Boton
            tono="secundario"
            onClick={() => {
              setComo('no_salio');
            }}
          >
            No
          </Boton>
        </div>
      )}
      {como === 'no_salio' && (
        <div className="flex flex-wrap items-center gap-e3 rounded-grande bg-atencion-suave p-e3">
          <span className="flex-1">
            {porque ?? 'No ha salido.'} Mira que esté encendida, con papel y con el cable de red
            puesto.
          </span>
          <Boton tono="secundario" onClick={() => void probar()}>
            Probar otra vez
          </Boton>
        </div>
      )}
    </div>
  );
}

function ElEditor({
  impresora,
  encontrada,
  lasDemas,
  alGuardar,
  alQuitar,
}: {
  readonly impresora: Impresora | null;
  readonly encontrada: ImpresoraEncontrada | null;
  readonly lasDemas: readonly Impresora[];
  readonly alGuardar: (entrada: Record<string, unknown>, hecho: string) => Promise<void>;
  readonly alQuitar: (id: string) => Promise<void>;
}) {
  // Lo que falta por imprimir en el local se propone primero: la primera, la de la cocina.
  const falta = (['cocina', 'caja', 'barra'] as const).find(
    (x) => !lasDemas.some((i) => i.imprime.includes(x)),
  );
  const [nombre, setNombre] = useState(impresora?.nombre ?? LO_QUE_IMPRIME[falta ?? 'cocina']);
  const [imprime, setImprime] = useState<readonly Imprime[]>(
    impresora?.imprime ?? [falta ?? 'cocina'],
  );
  const [tieneCajon, setTieneCajon] = useState(impresora?.tieneCajon ?? falta === 'caja');
  const [reservaId, setReservaId] = useState<string | null>(impresora?.reservaId ?? null);
  const [anchoMm, setAnchoMm] = useState<58 | 80>(impresora?.anchoMm ?? 80);
  const [ocupado, setOcupado] = useState(false);
  const [seguro, setSeguro] = useState(false);

  async function guardar() {
    setOcupado(true);
    await alGuardar(
      {
        ...(impresora === null ? {} : { impresora_id: impresora.id }),
        nombre: nombre.trim(),
        ...(encontrada === null
          ? {}
          : { direccion: encontrada.direccion, modelo: encontrada.modelo }),
        ancho_mm: anchoMm,
        imprime,
        tiene_cajon: tieneCajon,
        reserva_id: reservaId,
      },
      impresora === null ? `${nombre.trim()}, dada de alta.` : 'Guardado.',
    );
    setOcupado(false);
  }

  return (
    <div className="flex flex-col gap-e5 pb-e4">
      <label className="flex flex-col gap-e2">
        <span className="text-secundario font-semibold text-texto-tenue">Cómo se llama</span>
        <input
          value={nombre}
          maxLength={40}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
          className="min-h-toque rounded-grande border border-borde bg-fondo px-e4 text-cuerpo"
        />
      </label>

      <fieldset className="flex flex-col gap-e2">
        <legend className="mb-e2 text-secundario font-semibold text-texto-tenue">Qué imprime</legend>
        <div className="flex flex-wrap gap-e2">
          {(['cocina', 'barra', 'caja'] as const).map((x) => {
            const si = imprime.includes(x);
            return (
              <button
                key={x}
                type="button"
                aria-pressed={si}
                onClick={() => {
                  setImprime(si ? imprime.filter((y) => y !== x) : [...imprime, x]);
                }}
                className={[
                  'min-h-toque rounded-grande border-2 px-e4 font-bold',
                  si ? 'border-naranja bg-naranja-suave text-naranja' : 'border-borde',
                ].join(' ')}
              >
                {LO_QUE_IMPRIME[x]}
              </button>
            );
          })}
        </div>
        <span className="text-secundario text-texto-tenue">
          Caja es la cuenta antes de cobrar, y el ticket cuando llegue el cobro.
        </span>
      </fieldset>

      <SiONo
        titulo="¿Tiene el cajón enchufado?"
        frase="El cable del cajón va a la impresora: casi siempre, a la de la caja"
        si={tieneCajon}
        alCambiar={setTieneCajon}
      />

      <label className="flex flex-col gap-e2">
        <span className="text-secundario font-semibold text-texto-tenue">
          Si no responde, sale por…
        </span>
        <select
          value={reservaId ?? ''}
          onChange={(e) => {
            setReservaId(e.target.value === '' ? null : e.target.value);
          }}
          className="min-h-toque rounded-grande border border-borde bg-fondo px-e4 text-cuerpo"
        >
          <option value="">Ninguna</option>
          {lasDemas.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </select>
      </label>

      <SiONo
        titulo="Papel estrecho (58 mm)"
        frase="Casi todas las de bar son de 80 mm"
        si={anchoMm === 58}
        alCambiar={(si) => {
          setAnchoMm(si ? 58 : 80);
        }}
      />

      <div className="flex flex-wrap gap-e3">
        <Boton
          tono="principal"
          tamano="l"
          cargando={ocupado}
          textoCargando="Guardando"
          disabled={nombre.trim() === ''}
          onClick={() => void guardar()}
        >
          {impresora === null ? 'Darla de alta' : 'Guardar'}
        </Boton>
        {impresora !== null &&
          (seguro ? (
            <Boton tono="peligro" onClick={() => void alQuitar(impresora.id)}>
              Sí, quitarla
            </Boton>
          ) : (
            <Boton
              tono="texto"
              onClick={() => {
                setSeguro(true);
              }}
            >
              Quitar esta impresora
            </Boton>
          ))}
      </div>
    </div>
  );
}

function SiONo({
  titulo,
  frase,
  si,
  alCambiar,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly si: boolean;
  readonly alCambiar: (si: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-e4">
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{titulo}</span>
        <span className="text-secundario text-texto-tenue">{frase}</span>
      </span>
      <input
        type="checkbox"
        checked={si}
        onChange={(e) => {
          alCambiar(e.target.checked);
        }}
        className="size-7 accent-naranja"
      />
    </label>
  );
}

const MOTIVOS = ['Cambiar un billete', 'Probar el cajón'] as const;

function AbrirElCajon({ alAbrir }: { readonly alAbrir: (motivo: string) => Promise<void> }) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]);
  const [otro, setOtro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const elMotivo = motivo === 'otro' ? otro.trim() : motivo;
  return (
    <div className="flex flex-col gap-e4 pb-e4">
      <p className="text-secundario text-texto-suave">
        Sin una venta, con su motivo: queda quién lo abrió y cuándo.
      </p>
      <div className="flex flex-wrap gap-e2">
        {[...MOTIVOS, 'otro'].map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={motivo === m}
            onClick={() => {
              setMotivo(m);
            }}
            className={[
              'min-h-toque rounded-grande border-2 px-e4 font-bold',
              motivo === m ? 'border-naranja bg-naranja-suave text-naranja' : 'border-borde',
            ].join(' ')}
          >
            {m === 'otro' ? 'Otro motivo' : m}
          </button>
        ))}
      </div>
      {motivo === 'otro' && (
        <input
          value={otro}
          maxLength={200}
          placeholder="Por qué se abre"
          onChange={(e) => {
            setOtro(e.target.value);
          }}
          className="min-h-toque rounded-grande border border-borde bg-fondo px-e4 text-cuerpo"
        />
      )}
      <Boton
        tono="principal"
        tamano="l"
        cargando={ocupado}
        textoCargando="Abriendo"
        disabled={elMotivo.length < 3}
        onClick={async () => {
          setOcupado(true);
          await alAbrir(elMotivo);
          setOcupado(false);
        }}
      >
        Abrir el cajón
      </Boton>
    </div>
  );
}

/** **Lo de la cocina y la barra sale en…** (0119): pantalla, papel o las dos. */
function DondeSaleCadaCosa({
  datos,
  alGuardar,
}: {
  readonly datos: LasImpresoras;
  readonly alGuardar: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function guardar(sitio: 'cocina' | 'barra', donde: DondeSale) {
    setOcupado(true);
    setError(null);
    // Los minutos y el sonido no se tocan: se mandan como están.
    const ahora = await cliente.consultar<LaCocinaYLaBarra>('la_cocina_y_la_barra');
    if (!ahora.ok) {
      setError(ahora.error);
      setOcupado(false);
      return;
    }
    const respuesta = await cliente.ejecutar('guardar_la_cocina_y_la_barra', {
      aviso_min: ahora.datos.avisoMin,
      tarde_min: ahora.datos.tardeMin,
      suena: ahora.datos.suena,
      [sitio === 'cocina' ? 'cocina_sale_en' : 'barra_sale_en']: donde,
    });
    setOcupado(false);
    if (!respuesta.ok) setError(respuesta.error);
    else await alGuardar();
  }

  const filas: readonly { sitio: 'cocina' | 'barra'; nombre: string; frase: string; valor: DondeSale }[] =
    [
      {
        sitio: 'cocina',
        nombre: 'Cocina',
        frase: 'Con las dos, el papel lleva lo nuevo, lo marchado y lo anulado',
        valor: datos.cocinaSaleEn,
      },
      { sitio: 'barra', nombre: 'Barra', frase: 'Las bebidas, al momento', valor: datos.barraSaleEn },
    ];
  const sinImpresora = (sitio: 'cocina' | 'barra') =>
    !datos.impresoras.some((i) => i.imprime.includes(sitio));

  return (
    <section aria-label="Dónde sale" className="flex flex-col gap-e4 rounded-mayor bg-superficie p-e5">
      <span className="text-seccion font-bold">Lo de la cocina y la barra sale en…</span>
      {error !== null && <ErrorEnCristiano error={error} />}
      {filas.map((f) => (
        <div key={f.sitio} className="flex flex-wrap items-center gap-e3">
          <IconoEnSuColor dibujo="cocina" tono={TONO[f.sitio]} lado={36} />
          <span className="flex min-w-0 flex-[1_1_12rem] flex-col">
            <span className="font-bold">{f.nombre}</span>
            <span className="text-secundario text-texto-tenue">
              {f.valor !== 'pantalla' && sinImpresora(f.sitio)
                ? 'Sin impresora que lo imprima: dala de alta arriba'
                : f.frase}
            </span>
          </span>
          <div role="radiogroup" aria-label={`Dónde sale lo de ${f.nombre.toLowerCase()}`} className="flex gap-e2">
            {DONDE.map((d) => (
              <button
                key={d.valor}
                type="button"
                role="radio"
                aria-checked={f.valor === d.valor}
                disabled={ocupado}
                onClick={() => void guardar(f.sitio, d.valor)}
                className={[
                  'min-h-toque rounded-grande border-2 px-e4 font-bold',
                  f.valor === d.valor ? 'border-naranja bg-naranja-suave text-naranja' : 'border-borde',
                ].join(' ')}
              >
                {d.texto}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
