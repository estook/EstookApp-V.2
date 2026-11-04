import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  LA_AUTORIZACION_EN_LLANO,
  comoEsElNif,
  foralDelCodigoPostal,
  prefijoValido,
  primerNumero,
  provinciaDelCodigoPostal,
  sePuedeEmpezarOtra,
  type ModalidadDeFacturacion,
  type TipoDeSerie,
} from '@estook/dominio';
import { Aviso, Boton, Botones, Campo, ComoFactura, ErrorEnCristiano, Selector } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarUnPasoDelAlta } from '../ganchos/usarLaFacturacion.ts';
import { bajarElDocumento, type UnDocumento } from '../documentos/BotonDelDocumento.tsx';
import type { ElNifComprobado, LaAutorizacion, MiFacturacion } from './contrato.ts';

/**
 * **Los cinco pasos del alta de facturación**, uno por hoja (T6 · 1, decisión 0126; maquetas
 * de T6, sección 2, aprobadas el 2-nov).
 *
 * Cada paso guarda lo suyo y la hoja se cierra: el alta se puede dejar a medias y seguir otro
 * día desde Ajustes › Facturación. **Lo que ya sabe Estook no se pregunta**: el territorio sale
 * del local, la provincia del código postal y el nombre de la empresa, de Hacienda.
 */

function Pregunta({
  titulo,
  opciones,
  elegida,
  alElegir,
}: {
  readonly titulo: string;
  readonly opciones: readonly { readonly valor: string; readonly texto: string }[];
  readonly elegida: string | null;
  readonly alElegir: (valor: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-e2">
      <legend className="mb-e2 text-cuerpo font-medium">{titulo}</legend>
      <div className="flex flex-wrap gap-e2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={elegida === o.valor}
            onClick={() => {
              alElegir(o.valor);
            }}
            className={
              'min-h-toque rounded-medio border px-e4 text-cuerpo ' +
              (elegida === o.valor
                ? 'border-naranja bg-naranja-suave font-medium text-texto'
                : 'border-borde-fuerte bg-superficie text-texto-suave')
            }
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Pie({ children }: { readonly children: ReactNode }) {
  return <div className="mt-e2">{children}</div>;
}

// ── Paso 1 · tu empresa ───────────────────────────────────────────────────────────

export function PasoDeLaEmpresa({
  lo,
  alAcabar,
}: {
  readonly lo: MiFacturacion;
  readonly alAcabar: () => void;
}) {
  const { cliente, yo } = usarSesion();
  const { hacer, haciendo, error } = usarUnPasoDelAlta();
  const e = lo.empresa;
  const [nif, setNif] = useState(e?.nif ?? '');
  const [nombre, setNombre] = useState(e?.nombre ?? '');
  const [comercial, setComercial] = useState(e?.nombreComercial ?? '');
  const [calle, setCalle] = useState(e?.calle ?? '');
  const [numero, setNumero] = useState(e?.numero ?? '');
  const [codigoPostal, setCodigoPostal] = useState(e?.codigoPostal ?? '');
  const [municipio, setMunicipio] = useState(e?.municipio ?? '');
  const [titular, setTitular] = useState(
    e?.titular?.id ?? lo.puedenSerTitular.find((p) => p.id === yo?.personaId)?.id ?? '',
  );
  const [comprobado, setComprobado] = useState<ElNifComprobado | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [errorDelNif, setErrorDelNif] = useState<ErrorDeLaApi | null>(null);
  const ultimo = useRef('');

  const forma = nif.trim() === '' ? null : comoEsElNif(nif);
  const provincia = provinciaDelCodigoPostal(codigoPostal);

  const nifConForma = forma?.valido === true ? forma.nif : null;
  const personaDelNif = forma?.valido === true ? forma.persona : null;

  // **El NIF se comprueba en Hacienda al escribirlo** (Anexo 4.3), cuando ya tiene su forma, y
  // a una persona con su nombre (Hacienda lo pide). Medio segundo después de dejar de escribir.
  useEffect(() => {
    if (nifConForma === null || personaDelNif === null) {
      setComprobado(null);
      setErrorDelNif(null);
      return;
    }
    const conNombre = personaDelNif === 'fisica' ? nombre.trim() : '';
    if (personaDelNif === 'fisica' && conNombre === '') return;
    const clave = `${nifConForma}|${conNombre}`;
    if (clave === ultimo.current) return;
    const espera = setTimeout(() => {
      ultimo.current = clave;
      setComprobando(true);
      void cliente
        .ejecutar<ElNifComprobado>('comprobar_un_nif', {
          nif: nifConForma,
          ...(conNombre === '' ? {} : { nombre: conNombre }),
        })
        .then((respuesta) => {
          setComprobando(false);
          if (respuesta.ok) {
            setComprobado(respuesta.datos);
            setErrorDelNif(null);
            if (respuesta.datos.nombreEnHacienda !== null && personaDelNif === 'juridica') {
              setNombre(respuesta.datos.nombreEnHacienda);
            }
          } else {
            setComprobado(null);
            setErrorDelNif(respuesta.error);
          }
        });
    }, 600);
    return () => {
      clearTimeout(espera);
    };
  }, [cliente, nifConForma, personaDelNif, nombre]);

  const reconocido =
    comprobado !== null &&
    (comprobado.enHacienda === 'identificado' || comprobado.enHacienda === 'parecido');

  const ayudaDelNif =
    forma !== null && !forma.valido
      ? undefined
      : comprobando
        ? 'Mirándolo en Hacienda…'
        : reconocido
          ? `✓ En Hacienda: ${comprobado.nombreEnHacienda ?? comprobado.nif}`
          : forma?.valido === true && forma.persona === 'fisica' && nombre.trim() === ''
            ? 'Es de una persona: escribe abajo sus apellidos y su nombre.'
            : 'Se mira en Hacienda al escribirlo.';
  const errorEnElNif =
    forma !== null && !forma.valido
      ? forma.porque
      : comprobado !== null && !reconocido
        ? comprobado.enHacienda === 'de_baja'
          ? 'Hacienda lo tiene de baja.'
          : comprobado.enHacienda === 'revocado'
            ? 'Hacienda lo tiene revocado.'
            : 'Hacienda no lo tiene a ese nombre. Míralo en tus papeles de Hacienda.'
        : undefined;

  const listo =
    reconocido &&
    nombre.trim() !== '' &&
    calle.trim() !== '' &&
    numero.trim() !== '' &&
    provincia !== null &&
    municipio.trim() !== '' &&
    titular !== '';

  return (
    <div className="flex flex-col gap-e4">
      {e === null && lo.otrasEmpresas.length > 0 && (
        <Aviso tono="info" titulo="Ya tienes una empresa en Estook">
          <span className="block">Si este local es de la misma, elígela y no escribes nada.</span>
          <span className="mt-e2 flex flex-col gap-e2">
            {lo.otrasEmpresas.map((otra) => (
              <Boton
                key={otra.id}
                tono="secundario"
                cargando={haciendo}
                onClick={() => {
                  void hacer('usar_la_empresa', { empresa_id: otra.id }).then((r) => {
                    if (r !== null) alAcabar();
                  });
                }}
              >
                Usar {otra.nombre} · {otra.nif}
              </Boton>
            ))}
          </span>
        </Aviso>
      )}

      <Campo
        etiqueta="NIF de la empresa"
        value={nif}
        autoComplete="off"
        onChange={(ev) => {
          setNif(ev.currentTarget.value);
        }}
        {...(ayudaDelNif === undefined ? {} : { ayuda: ayudaDelNif })}
        {...(errorEnElNif === undefined ? {} : { error: errorEnElNif })}
        obligatorio
      />
      {errorDelNif !== null && <ErrorEnCristiano error={errorDelNif} />}
      <Campo
        etiqueta={
          forma?.valido === true && forma.persona === 'fisica'
            ? 'Apellidos y nombre'
            : 'Razón social'
        }
        value={nombre}
        onChange={(ev) => {
          setNombre(ev.currentTarget.value);
        }}
        ayuda="Como lo tiene Hacienda: es lo que sale en cada ticket."
        obligatorio
      />
      <Campo
        etiqueta="Nombre comercial (si tiene)"
        value={comercial}
        onChange={(ev) => {
          setComercial(ev.currentTarget.value);
        }}
      />
      <p className="text-cuerpo font-medium">El domicilio fiscal</p>
      <div className="grid grid-cols-[1fr_6rem] gap-e3">
        <Campo
          etiqueta="Calle"
          value={calle}
          onChange={(ev) => {
            setCalle(ev.currentTarget.value);
          }}
          obligatorio
        />
        <Campo
          etiqueta="Número"
          value={numero}
          onChange={(ev) => {
            setNumero(ev.currentTarget.value);
          }}
          obligatorio
        />
      </div>
      <div className="grid grid-cols-[8rem_1fr] gap-e3">
        <Campo
          etiqueta="Código postal"
          inputMode="numeric"
          maxLength={5}
          value={codigoPostal}
          onChange={(ev) => {
            setCodigoPostal(ev.currentTarget.value.replace(/\D/g, ''));
          }}
          {...(codigoPostal.length === 5 && provincia === null
            ? { error: 'No es de España' }
            : provincia === null
              ? {}
              : { ayuda: provincia })}
          obligatorio
        />
        <Campo
          etiqueta="Municipio"
          value={municipio}
          onChange={(ev) => {
            setMunicipio(ev.currentTarget.value);
          }}
          obligatorio
        />
      </div>
      <Selector
        etiqueta="Quién la autoriza ante Hacienda"
        value={titular}
        onChange={(ev) => {
          setTitular(ev.currentTarget.value);
        }}
        opciones={lo.puedenSerTitular.map((p) => ({ valor: p.id, texto: p.nombre }))}
        sinElegir="Elige al titular o su representante"
        ayuda="El titular o su representante legal. Solo esa persona firma la autorización del paso 5."
        obligatorio
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      <Pie>
        <Botones>
          <Boton
            disabled={!listo}
            cargando={haciendo}
            textoCargando="Guardando"
            onClick={() => {
              void hacer('guardar_la_empresa', {
                empresa_id: e?.id ?? null,
                nif: comprobado?.nif ?? nif,
                nombre: nombre.trim(),
                ...(comercial.trim() === '' ? {} : { nombre_comercial: comercial.trim() }),
                calle: calle.trim(),
                numero: numero.trim(),
                codigo_postal: codigoPostal,
                municipio: municipio.trim(),
                titular_id: titular,
              }).then((r) => {
                if (r !== null) alAcabar();
              });
            }}
          >
            Guardar la empresa
          </Boton>
        </Botones>
      </Pie>
    </div>
  );
}

// ── Paso 2 · dónde tributa ──────────────────────────────────────────────────────────

const TERRITORIO_EN_LLANO: Record<MiFacturacion['territorio'], string> = {
  peninsula_y_baleares: 'Península y Baleares · IVA',
  canarias: 'Canarias · IGIC',
  ceuta: 'Ceuta · IPSI',
  melilla: 'Melilla · IPSI',
};

export function PasoDeDondeTributa({
  lo,
  alAcabar,
}: {
  readonly lo: MiFacturacion;
  readonly alAcabar: () => void;
}) {
  const { hacer, haciendo, error } = usarUnPasoDelAlta();
  const e = lo.empresa;
  const propuesta = e === null ? null : foralDelCodigoPostal(e.codigoPostal);
  const [sii, setSii] = useState<string | null>(
    e?.enSii === null || e === null ? 'no' : e.enSii ? 'si' : 'no',
  );
  const [foral, setForal] = useState<string | null>(e?.foral ?? propuesta ?? 'no');
  // Cómo factura (0127): con el SII va fuera; si no, la elegida (VERI*FACTU de fábrica).
  const [modalidad, setModalidad] = useState<ModalidadDeFacturacion>(
    e === null || e.modalidad === 'fuera_sii' ? 'verifactu' : e.modalidad,
  );

  return (
    <div className="flex flex-col gap-e5">
      <div>
        <p className="text-secundario text-texto-suave">Tu local está en</p>
        <p className="text-cuerpo font-medium">{TERRITORIO_EN_LLANO[lo.territorio]}</p>
        <p className="text-secundario text-texto-suave">
          Lo dice el local, y el impuesto lo decide dónde se vende: no se pregunta otra vez.
        </p>
      </div>
      <Pregunta
        titulo="¿Tu empresa lleva los libros por el SII?"
        opciones={[
          { valor: 'no', texto: 'No (lo normal)' },
          { valor: 'si', texto: 'Sí' },
        ]}
        elegida={sii}
        alElegir={setSii}
      />
      <Pregunta
        titulo="¿Dónde está su domicilio fiscal?"
        opciones={[
          { valor: 'no', texto: 'Fuera del País Vasco y Navarra' },
          { valor: 'alava', texto: 'Álava' },
          { valor: 'gipuzkoa', texto: 'Gipuzkoa' },
          { valor: 'bizkaia', texto: 'Bizkaia' },
          { valor: 'navarra', texto: 'Navarra' },
        ]}
        elegida={foral}
        alElegir={setForal}
      />
      <ComoFactura
        elegida={sii === 'si' ? 'fuera_sii' : modalidad}
        enSii={sii === 'si'}
        alElegir={setModalidad}
        ocupado={haciendo}
      />
      {propuesta !== null && foral === propuesta && (
        <p className="text-secundario text-texto-suave">
          Lo hemos marcado por el código postal de tu empresa. Cámbialo si no es así.
        </p>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
      <Pie>
        <Botones>
          <Boton
            cargando={haciendo}
            textoCargando="Guardando"
            onClick={() => {
              void (async () => {
                const contestado = await hacer('contestar_donde_tributa', {
                  en_sii: sii === 'si',
                  foral: foral ?? 'no',
                });
                if (contestado === null) return;
                // Con el SII, la base ya la ha puesto fuera; sin él, la elegida si ha cambiado.
                const antes = e?.modalidad === 'fuera_sii' ? 'verifactu' : e?.modalidad;
                if (sii !== 'si' && modalidad !== antes) {
                  const elegida = await hacer('elegir_la_modalidad', { modalidad });
                  if (elegida === null) return;
                }
                alAcabar();
              })();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      </Pie>
    </div>
  );
}

// ── Paso 3 · las series ─────────────────────────────────────────────────────────────

const NOMBRE_DE_LA_SERIE: Record<TipoDeSerie, string> = {
  ticket: 'Tickets',
  factura: 'Facturas',
  rectificativa: 'Devoluciones y correcciones',
};

export function PasoDeLasSeries({
  lo,
  alAcabar,
}: {
  readonly lo: MiFacturacion;
  readonly alAcabar: () => void;
}) {
  const { hacer, haciendo, error } = usarUnPasoDelAlta();
  const [series, setSeries] = useState<Record<TipoDeSerie, string>>({
    ticket: lo.series.ticket ?? lo.propuestas.ticket,
    factura: lo.series.factura ?? lo.propuestas.factura,
    rectificativa: lo.series.rectificativa ?? lo.propuestas.rectificativa,
  });
  const [otro, setOtro] = useState<string | null>(
    lo.otroPrograma === null ? null : lo.otroPrograma ? 'si' : 'no',
  );
  const tipos: TipoDeSerie[] = ['ticket', 'factura', 'rectificativa'];
  const repetidas = new Set(Object.values(series)).size < 3;
  const todasValen = tipos.every((t) => prefijoValido(series[t]));

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-secundario text-texto-suave">
        Cada documento lleva su número, sin huecos, en su serie. El año y el número los pone Estook.
      </p>
      {tipos.map((tipo) => (
        <Campo
          key={tipo}
          etiqueta={NOMBRE_DE_LA_SERIE[tipo]}
          value={series[tipo]}
          maxLength={20}
          autoComplete="off"
          onChange={(ev) => {
            const valor = ev.currentTarget.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            setSeries((antes) => ({ ...antes, [tipo]: valor }));
          }}
          {...(prefijoValido(series[tipo])
            ? { ayuda: `El primero: ${primerNumero(series[tipo], lo.ano)}` }
            : { error: 'Letras y números, con guiones en medio' })}
        />
      ))}
      {repetidas && todasValen && (
        <Aviso tono="atencion" titulo="Tienen que ser distintas">
          Lo normal: T para los tickets, F para las facturas y R para las correcciones.
        </Aviso>
      )}
      <Pregunta
        titulo="¿Este local ya hace facturas con otro programa?"
        opciones={[
          { valor: 'no', texto: 'No' },
          { valor: 'si', texto: 'Sí' },
        ]}
        elegida={otro}
        alElegir={setOtro}
      />
      {otro === 'si' && (
        <Aviso tono="info" titulo="Que no choquen">
          Usa letras distintas de las de ese programa: dos documentos con la misma serie y el mismo
          número son un problema con Hacienda.
        </Aviso>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
      <Pie>
        <Botones>
          <Boton
            disabled={repetidas || !todasValen || otro === null}
            cargando={haciendo}
            textoCargando="Guardando"
            onClick={() => {
              void hacer('poner_las_series', { ...series, otro_programa: otro === 'si' }).then(
                (r) => {
                  if (r !== null) alAcabar();
                },
              );
            }}
          >
            Guardar las series
          </Boton>
        </Botones>
      </Pie>
    </div>
  );
}

// ── Paso 4 · el alta en Verifacti ──────────────────────────────────────────────────

export function PasoDeVerifacti({
  lo,
  alAcabar,
}: {
  readonly lo: MiFacturacion;
  readonly alAcabar: () => void;
}) {
  const { hacer, haciendo, error } = usarUnPasoDelAlta();
  return (
    <div className="flex flex-col gap-e4">
      <p className="text-cuerpo">
        Verifacti es quien lleva tus tickets a Hacienda: Estook prepara cada uno y Verifacti lo
        registra y lo manda. Darte de alta se hace solo, con los datos de tu empresa.
      </p>
      <p className="text-secundario text-texto-suave">
        En pruebas: nada llega a Hacienda de verdad hasta que Estook lo pase a real.
      </p>
      {!lo.conectada && (
        <Aviso tono="info" titulo="Todavía no está conectada">
          En cuanto Estook conecte la facturación, este paso se hace desde aquí.
        </Aviso>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
      <Pie>
        <Botones>
          <Boton
            disabled={!lo.conectada}
            cargando={haciendo}
            textoCargando="Dándola de alta"
            onClick={() => {
              void hacer('dar_de_alta_en_verifacti', {}).then((r) => {
                if (r !== null) alAcabar();
              });
            }}
          >
            Darla de alta
          </Boton>
        </Botones>
      </Pie>
    </div>
  );
}

// ── Paso 5 · la autorización ante Hacienda ─────────────────────────────────────────

function elDia(instante: string | null): string {
  if (instante === null) return '';
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
  }).format(new Date(instante));
}

export function PasoDeLaAutorizacion({ lo }: { readonly lo: MiFacturacion }) {
  const { cliente } = usarSesion();
  const { hacer, haciendo, error } = usarUnPasoDelAlta();
  const e = lo.empresa;
  const [respuesta, setRespuesta] = useState<LaAutorizacion | null>(null);
  const [firma, setFirma] = useState({
    nombre: '',
    apellidos: '',
    calle: e?.calle ?? '',
    numero: e?.numero ?? '',
    municipio: e?.municipio ?? '',
  });
  const [representante, setRepresentante] = useState({
    nombre: '',
    nif: '',
    calle: '',
    numero: '',
    municipio: '',
  });
  const [bajando, setBajando] = useState(false);
  const [errorAlBajar, setErrorAlBajar] = useState<ErrorDeLaApi | null>(null);
  const subir = useRef<HTMLInputElement>(null);

  if (e === null) return null;
  const estado = respuesta?.estado ?? e.autorizacion.estado;
  const enlace = respuesta?.enlace ?? null;

  const mirar = () => {
    void hacer<LaAutorizacion>('mirar_la_autorizacion', {}).then((r) => {
      if (r !== null) setRespuesta(r);
    });
  };

  const comoEsta = (
    <div className="rounded-grande border border-borde p-e4">
      <p className="text-secundario text-texto-suave">Cómo está</p>
      <p className="text-cuerpo font-semibold">{LA_AUTORIZACION_EN_LLANO[estado]}</p>
      {estado === 'pendiente' && (respuesta?.caduca ?? e.autorizacion.caducaEn) !== null && (
        <p className="text-secundario text-texto-suave">
          El enlace vale hasta el {elDia(respuesta?.caduca ?? e.autorizacion.caducaEn)}.
        </p>
      )}
      {estado === 'correcta' && (
        <p className="text-secundario text-texto-suave">
          {e.autorizacion.firmante === null ? 'Firmada' : `Firmó ${e.autorizacion.firmante}`}
          {e.autorizacion.correctaEn === null ? '' : `, el ${elDia(e.autorizacion.correctaEn)}`}.
        </p>
      )}
      {estado === 'rechazada' && (respuesta?.error ?? e.autorizacion.error) !== null && (
        <p className="text-secundario text-mal">{respuesta?.error ?? e.autorizacion.error}</p>
      )}
    </div>
  );

  if (!lo.soyElTitular) {
    return (
      <div className="flex flex-col gap-e4">
        {comoEsta}
        {estado !== 'correcta' && (
          <p className="text-cuerpo">
            Solo la da {e.titular?.nombre ?? 'el titular de la empresa'}, el titular o su
            representante. Pídele que entre en Estook, a Ajustes › Facturación.
          </p>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Botones>
          <Boton tono="secundario" cargando={haciendo} onClick={mirar}>
            Mirar cómo está
          </Boton>
        </Botones>
      </div>
    );
  }

  if (estado === 'correcta') return comoEsta;

  if (e.persona === 'fisica') {
    const puedeEmpezar = sePuedeEmpezarOtra(estado);
    return (
      <div className="flex flex-col gap-e4">
        <p className="text-cuerpo">
          Autorizas a Verifacti a mandar tus tickets a Hacienda en tu nombre. Se firma en el móvil:
          tu DNI o tu pasaporte y un vídeo corto, sin certificado. Unos minutos.
        </p>
        {comoEsta}
        {enlace !== null && (
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-toque items-center justify-center rounded-medio border border-naranja bg-naranja px-e5 font-medium text-sobre-naranja"
          >
            Abrir el enlace para firmar
          </a>
        )}
        {puedeEmpezar && (
          <>
            <p className="text-secundario text-texto-suave">
              Tu nombre tiene que ser el de Hacienda. El enlace te llega también al correo.
            </p>
            <div className="grid grid-cols-2 gap-e3">
              <Campo
                etiqueta="Nombre"
                value={firma.nombre}
                onChange={(ev) => {
                  const v = ev.currentTarget.value;
                  setFirma((f) => ({ ...f, nombre: v }));
                }}
                obligatorio
              />
              <Campo
                etiqueta="Apellidos"
                value={firma.apellidos}
                onChange={(ev) => {
                  const v = ev.currentTarget.value;
                  setFirma((f) => ({ ...f, apellidos: v }));
                }}
                obligatorio
              />
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-e3">
              <Campo
                etiqueta="Calle donde vives"
                value={firma.calle}
                onChange={(ev) => {
                  const v = ev.currentTarget.value;
                  setFirma((f) => ({ ...f, calle: v }));
                }}
                obligatorio
              />
              <Campo
                etiqueta="Número"
                value={firma.numero}
                onChange={(ev) => {
                  const v = ev.currentTarget.value;
                  setFirma((f) => ({ ...f, numero: v }));
                }}
                obligatorio
              />
            </div>
            <Campo
              etiqueta="Municipio"
              value={firma.municipio}
              onChange={(ev) => {
                const v = ev.currentTarget.value;
                setFirma((f) => ({ ...f, municipio: v }));
              }}
              obligatorio
            />
          </>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Botones>
          {puedeEmpezar ? (
            <Boton
              disabled={Object.values(firma).some((v) => v.trim() === '')}
              cargando={haciendo}
              textoCargando="Pidiéndolo"
              onClick={() => {
                void hacer<LaAutorizacion>('firmar_en_linea', firma).then((r) => {
                  if (r !== null) setRespuesta(r);
                });
              }}
            >
              Recibir el enlace para firmar
            </Boton>
          ) : (
            <Boton tono="secundario" cargando={haciendo} onClick={mirar}>
              {enlace === null ? 'Ver el enlace y cómo está' : 'Ya he firmado: mirar'}
            </Boton>
          )}
        </Botones>
      </div>
    );
  }

  // Una sociedad: el modelo, relleno, para el certificado de su representante.
  const nifDelRepresentante = comoEsElNif(representante.nif);
  const representanteListo =
    Object.values(representante).every((v) => v.trim() !== '') &&
    nifDelRepresentante.valido &&
    nifDelRepresentante.persona === 'fisica';

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-cuerpo">
        Una sociedad la firma con el certificado de su representante: descargas el modelo ya
        relleno, lo firmas con AutoFirma y lo subes aquí. Es gratis.
      </p>
      {comoEsta}
      <p className="text-cuerpo font-medium">Quién la representa</p>
      <Campo
        etiqueta="Nombre y apellidos"
        value={representante.nombre}
        onChange={(ev) => {
          const v = ev.currentTarget.value;
          setRepresentante((r) => ({ ...r, nombre: v }));
        }}
        obligatorio
      />
      <Campo
        etiqueta="Su DNI o NIE"
        value={representante.nif}
        onChange={(ev) => {
          const v = ev.currentTarget.value;
          setRepresentante((r) => ({ ...r, nif: v }));
        }}
        {...(representante.nif.trim() !== '' && !nifDelRepresentante.valido
          ? { error: nifDelRepresentante.porque }
          : {})}
        obligatorio
      />
      <div className="grid grid-cols-[1fr_6rem] gap-e3">
        <Campo
          etiqueta="Calle donde vive"
          value={representante.calle}
          onChange={(ev) => {
            const v = ev.currentTarget.value;
            setRepresentante((r) => ({ ...r, calle: v }));
          }}
          obligatorio
        />
        <Campo
          etiqueta="Número"
          value={representante.numero}
          onChange={(ev) => {
            const v = ev.currentTarget.value;
            setRepresentante((r) => ({ ...r, numero: v }));
          }}
          obligatorio
        />
      </div>
      <Campo
        etiqueta="Municipio"
        value={representante.municipio}
        onChange={(ev) => {
          const v = ev.currentTarget.value;
          setRepresentante((r) => ({ ...r, municipio: v }));
        }}
        obligatorio
      />
      {errorAlBajar !== null && <ErrorEnCristiano error={errorAlBajar} />}
      {error !== null && <ErrorEnCristiano error={error} />}
      <input
        ref={subir}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-label="El modelo firmado, en PDF"
        onChange={(ev) => {
          const fichero = ev.currentTarget.files?.[0];
          ev.currentTarget.value = '';
          if (fichero === undefined) return;
          void fichero.arrayBuffer().then((buffer) => {
            const bytes = new Uint8Array(buffer);
            let texto = '';
            for (let i = 0; i < bytes.length; i += 0x8000) {
              texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            void hacer<LaAutorizacion>('mandar_el_modelo_firmado', {
              base64: btoa(texto),
              firmante:
                representante.nombre.trim() === ''
                  ? (e.titular?.nombre ?? 'El representante')
                  : representante.nombre.trim(),
            }).then((r) => {
              if (r !== null) setRespuesta(r);
            });
          });
        }}
      />
      <Botones>
        <Boton
          tono="secundario"
          disabled={!representanteListo}
          cargando={bajando}
          textoCargando="Haciéndolo"
          onClick={() => {
            setBajando(true);
            setErrorAlBajar(null);
            void cliente.ejecutar<UnDocumento>('el_modelo_para_firmar', representante).then((r) => {
              setBajando(false);
              if (r.ok) bajarElDocumento(r.datos);
              else setErrorAlBajar(r.error);
            });
          }}
        >
          Descargar el modelo relleno
        </Boton>
        <Boton
          cargando={haciendo}
          textoCargando="Mandándolo"
          onClick={() => {
            subir.current?.click();
          }}
        >
          Subir el modelo firmado
        </Boton>
      </Botones>
    </div>
  );
}
