import { useRef, useState, type ReactNode } from 'react';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Selector,
} from '@estook/ui';
import { IconoCamara, IconoEditar, IconoFogon, IconoSubir } from '@estook/iconos';
import {
  TIPOS_DE_CONTRATO,
  esUnDniValido,
  type Centimos,
  type TipoDeContrato,
} from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../../sesion/Sesion.tsx';
import {
  NoSeHaPodidoLeer,
  esPdf,
  paginasParaFogon,
  textoDeCadaPagina,
} from '../../carta/paginasDeLaCarta.ts';
import type { ElContratoLeido, LaFichaDelTrabajador } from '../contrato.ts';

/**
 * Rellenar la ficha del trabajador (la Ampliación 3 · 1, decisión 0153; maqueta, pestaña 3).
 *
 * **Tres formas, y Estook dice cuál es la mejor**:
 *
 *   · **Archivo del contrato** (la recomendada): el PDF que pasa la gestoría. Su texto se
 *     saca aquí, en el móvil, página a página, y Fogón lo lee sin errores.
 *   · **Foto del contrato**, si solo está en papel: una foto por página, con buena luz.
 *   · **A mano**, si no lo tienes o prefieres no subirlo.
 *
 * Fogón lee en el servidor y **propone**: cada campo con la página de donde sale, lo que
 * no sale en ámbar para escribirlo, y **nada se guarda hasta pulsar «Confirmar la
 * ficha»**. Lo que se escribe aquí manda sobre lo que leyó.
 */

/** Las páginas del contrato que se leen: en foto, cinco; en texto, doce (el servidor igual). */
const PAGINAS_EN_FOTO = 5;
const PAGINAS_EN_TEXTO = 12;
/** Lo más que se guarda del contrato: 10 MB, como un adjunto del chat. */
const TOPE_DEL_CONTRATO = 10 * 1024 * 1024;

type Forma = 'foto' | 'archivo' | 'a_mano';

/** De dónde sale cada campo: de una página, no sale, o se escribe a mano. */
type Origen = number | 'leido' | 'no_sale' | 'a_mano';

interface Valores {
  incorporacion: string;
  contrato: string;
  jornada: string;
  horasSemanales: string;
  categoria: string;
  convenio: string;
  vacacionesAlAno: string;
  vacacionesEn: string;
  pendientesAnteriores: string;
  dni: string;
  telefono: string;
  domicilio: string;
  sueldoCentimos: Centimos | null;
  sueldoEs: string;
  sueldoCada: string;
  pagas: string;
}

type CampoDeLaFicha = keyof Valores;

interface ContratoParaGuardar {
  readonly nombre: string;
  readonly ficheros: readonly { readonly mime: string; readonly base64: string }[];
}

function aTexto(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n).replace('.', ',');
}

function deLaFicha(ficha: LaFichaDelTrabajador | undefined): Valores {
  const l = ficha?.laboral ?? null;
  const p = ficha?.privada ?? null;
  return {
    incorporacion: l?.incorporacion ?? '',
    contrato: l?.contrato ?? '',
    jornada: l?.jornada ?? '',
    horasSemanales: aTexto(l?.horasSemanales),
    categoria: l?.categoria ?? '',
    convenio: l?.convenio ?? '',
    vacacionesAlAno: aTexto(l?.vacacionesAlAno),
    vacacionesEn: l?.vacacionesEn ?? 'naturales',
    pendientesAnteriores: aTexto(l?.pendientesAnteriores ?? 0),
    dni: p?.dni ?? '',
    telefono: p?.telefono ?? '',
    domicilio: p?.domicilio ?? '',
    sueldoCentimos: (p?.sueldoCentimos ?? null) as Centimos | null,
    sueldoEs: p?.sueldoEs ?? '',
    sueldoCada: p?.sueldoCada ?? '',
    pagas: aTexto(p?.pagas),
  };
}

/** De dónde sale un campo leído: su página, «Leído» si no dijo cuál, o «No sale». */
function deDonde(leido: { readonly valor: unknown; readonly pagina: number | null }): Origen {
  if (leido.valor === null) return 'no_sale';
  return leido.pagina ?? 'leido';
}

/** Lo leído por Fogón encima de lo que ya había: lo que no sale, se queda como estaba. */
function conLoLeido(
  antes: Valores,
  leido: ElContratoLeido,
): {
  valores: Valores;
  origen: Partial<Record<CampoDeLaFicha, Origen>>;
} {
  const c = leido.campos;
  const valores: Valores = {
    ...antes,
    incorporacion: c.incorporacion.valor ?? antes.incorporacion,
    contrato: c.contrato.valor ?? antes.contrato,
    jornada: c.jornada.valor ?? antes.jornada,
    horasSemanales:
      c.horasSemanales.valor === null ? antes.horasSemanales : aTexto(c.horasSemanales.valor),
    categoria: c.categoria.valor ?? antes.categoria,
    convenio: c.convenio.valor ?? antes.convenio,
    vacacionesAlAno:
      c.vacacionesAlAno.valor === null ? antes.vacacionesAlAno : aTexto(c.vacacionesAlAno.valor),
    vacacionesEn: c.vacacionesEn.valor ?? antes.vacacionesEn,
    dni: c.dni.valor ?? antes.dni,
    domicilio: c.domicilio.valor ?? antes.domicilio,
    sueldoCentimos:
      c.sueldoCentimos.valor === null ? antes.sueldoCentimos : (c.sueldoCentimos.valor as Centimos),
    sueldoEs: c.sueldoEs.valor ?? antes.sueldoEs,
    sueldoCada: c.sueldoCada.valor ?? antes.sueldoCada,
    pagas: c.pagas.valor === null ? antes.pagas : aTexto(c.pagas.valor),
  };
  return {
    valores,
    origen: {
      incorporacion: deDonde(c.incorporacion),
      contrato: deDonde(c.contrato),
      jornada: deDonde(c.jornada),
      horasSemanales: deDonde(c.horasSemanales),
      categoria: deDonde(c.categoria),
      convenio: deDonde(c.convenio),
      vacacionesAlAno: deDonde(c.vacacionesAlAno),
      vacacionesEn: deDonde(c.vacacionesEn),
      dni: deDonde(c.dni),
      domicilio: deDonde(c.domicilio),
      sueldoCentimos: deDonde(c.sueldoCentimos),
      sueldoEs: deDonde(c.sueldoEs),
      sueldoCada: deDonde(c.sueldoCada),
      pagas: deDonde(c.pagas),
      // Lo que nunca sale de un contrato: lo pone el gerente (0153).
      pendientesAnteriores: 'a_mano',
      telefono: 'a_mano',
    },
  };
}

function numero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function nuloSiVacio(texto: string): string | null {
  const limpio = texto.trim();
  return limpio === '' ? null : limpio;
}

function enBase64(fichero: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      const texto = typeof lector.result === 'string' ? lector.result : '';
      resolver(texto.slice(texto.indexOf(',') + 1));
    };
    lector.onerror = () => {
      rechazar(new NoSeHaPodidoLeer('No se ha podido leer el fichero.'));
    };
    lector.readAsDataURL(fichero);
  });
}

/** La píldora de cada campo: «Pág. 2», «No sale» o «A mano». */
function DeDonde({ origen }: { readonly origen: Origen | undefined }) {
  if (origen === undefined) return null;
  if (origen === 'no_sale') return <Etiqueta tono="atencion">No sale</Etiqueta>;
  if (origen === 'a_mano') return <Etiqueta>A mano</Etiqueta>;
  if (origen === 'leido') return <Etiqueta tono="info">Leído</Etiqueta>;
  return <Etiqueta tono="bien">Pág. {origen}</Etiqueta>;
}

/** Un campo con su píldora a la derecha de la etiqueta; en ámbar si no salió. */
function ConSuOrigen({
  origen,
  children,
}: {
  readonly origen: Origen | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={
        origen === 'no_sale'
          ? 'relative rounded-medio bg-atencion-suave/60 p-e2 ring-1 ring-atencion/40'
          : 'relative'
      }
    >
      <span
        className={origen === 'no_sale' ? 'absolute right-e2 top-e2' : 'absolute right-0 top-0'}
      >
        <DeDonde origen={origen} />
      </span>
      {children}
    </div>
  );
}

function FormaDeRellenar({
  icono,
  titulo,
  detalle,
  recomendada = false,
  alElegir,
}: {
  readonly icono: ReactNode;
  readonly titulo: string;
  readonly detalle: string;
  readonly recomendada?: boolean;
  readonly alElegir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alElegir}
      aria-label={`${titulo}${recomendada ? ' (recomendado)' : ''}. ${detalle}`}
      className={`relative grid min-h-toque content-start gap-e1 rounded-[16px] border-2 bg-superficie p-e3 text-left transition-colors hover:bg-fondo/60 ${
        recomendada ? 'border-naranja' : 'border-borde'
      }`}
    >
      {recomendada && (
        <span className="absolute -top-[10px] right-e3 rounded-[7px] bg-naranja px-e2 py-[3px] text-[0.62rem] font-extrabold text-sobre-naranja">
          Recomendado
        </span>
      )}
      <span
        aria-hidden
        className={`grid size-10 place-items-center rounded-[12px] ${
          recomendada ? 'bg-naranja-suave text-naranja' : 'bg-fondo text-texto'
        }`}
      >
        {icono}
      </span>
      <strong className="text-cuerpo">{titulo}</strong>
      <span className="text-secundario text-texto-suave">{detalle}</span>
    </button>
  );
}

export function RellenarLaFicha({
  personaId,
  nombre,
  ficha,
  empezarPor,
  alCerrar,
  alHecho,
}: {
  readonly personaId: string;
  readonly nombre: string;
  readonly ficha: LaFichaDelTrabajador | undefined;
  /** «Subir contrato» abre directamente la elección; «Editar», el formulario. */
  readonly empezarPor: 'elegir' | 'a_mano';
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const [paso, setPaso] = useState<'elegir' | 'leyendo' | 'revisar'>(
    empezarPor === 'a_mano' ? 'revisar' : 'elegir',
  );
  const [valores, setValores] = useState<Valores>(() => deLaFicha(ficha));
  const [origen, setOrigen] = useState<Partial<Record<CampoDeLaFicha, Origen>>>({});
  const [leido, setLeido] = useState<ElContratoLeido | null>(null);
  const [contrato, setContrato] = useState<ContratoParaGuardar | null>(null);
  const [guardarElContrato, setGuardarElContrato] = useState(true);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const fotos = useRef<HTMLInputElement>(null);
  const archivo = useRef<HTMLInputElement>(null);

  function cambiar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function leer(forma: Exclude<Forma, 'a_mano'>, ficheros: readonly File[]) {
    if (ficheros.length === 0) return;
    setError(null);
    setProblema(null);
    setPaso('leyendo');
    try {
      const primero = ficheros[0];
      let entrada: Record<string, unknown>;
      let paraGuardar: ContratoParaGuardar | null = null;
      if (forma === 'archivo' && primero !== undefined && esPdf(primero)) {
        const texto = await textoDeCadaPagina(primero, PAGINAS_EN_TEXTO);
        // Un PDF escaneado no tiene letras: se pasa a fotos y lo lee Fogón igual.
        entrada =
          texto === null
            ? { fotos: await paginasParaFogon([primero], PAGINAS_EN_FOTO) }
            : { paginas_de_texto: texto };
        if (primero.size <= TOPE_DEL_CONTRATO) {
          paraGuardar = {
            nombre: primero.name.replace(/\.pdf$/i, '') || 'Contrato',
            ficheros: [{ mime: 'application/pdf', base64: await enBase64(primero) }],
          };
        }
      } else {
        const paginas = await paginasParaFogon(ficheros, PAGINAS_EN_FOTO);
        entrada = { fotos: paginas };
        paraGuardar = {
          nombre: 'Contrato',
          ficheros: paginas.map((p) => ({ mime: p.tipo, base64: p.base64 })),
        };
      }
      const respuesta = await cliente.ejecutar<ElContratoLeido>('leer_el_contrato_con_fogon', {
        persona_id: personaId,
        ...entrada,
      });
      if (!respuesta.ok) {
        setError(respuesta.error);
        setPaso('elegir');
        return;
      }
      const conLo = conLoLeido(valores, respuesta.datos);
      setValores(conLo.valores);
      setOrigen(conLo.origen);
      setLeido(respuesta.datos);
      setContrato(paraGuardar);
      setGuardarElContrato(paraGuardar !== null);
      setPaso('revisar');
    } catch (fallo) {
      setProblema(
        fallo instanceof NoSeHaPodidoLeer
          ? fallo.message
          : 'No se ha podido preparar el contrato. Prueba con otro fichero.',
      );
      setPaso('elegir');
    }
  }

  const dniMal = valores.dni.trim() !== '' && !esUnDniValido(valores.dni);
  const horas = numero(valores.horasSemanales);
  const vacaciones = numero(valores.vacacionesAlAno);
  const pendientes = numero(valores.pendientesAnteriores) ?? 0;
  const pagas = numero(valores.pagas);
  const malas: string[] = [];
  if (horas !== null && (horas <= 0 || horas > 60)) malas.push('las horas a la semana');
  if (vacaciones !== null && (vacaciones < 0 || vacaciones > 60)) malas.push('las vacaciones');
  if (pendientes < 0 || pendientes > 120) malas.push('los días de años anteriores');
  if (pagas !== null && (!Number.isInteger(pagas) || pagas < 1 || pagas > 16)) {
    malas.push('las pagas');
  }
  const veLoPrivado = ficha?.veLoPrivado !== false;

  async function confirmar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('guardar_la_ficha_del_trabajador', {
      persona_id: personaId,
      origen: leido === null ? 'a_mano' : 'contrato',
      laboral: {
        incorporacion: nuloSiVacio(valores.incorporacion),
        contrato: (nuloSiVacio(valores.contrato) as TipoDeContrato | null) ?? null,
        jornada: nuloSiVacio(valores.jornada),
        horas_semanales: horas,
        categoria: nuloSiVacio(valores.categoria),
        convenio: nuloSiVacio(valores.convenio),
        vacaciones_al_ano: vacaciones,
        vacaciones_en: valores.vacacionesEn === 'laborables' ? 'laborables' : 'naturales',
        pendientes_anteriores: pendientes,
      },
      ...(veLoPrivado
        ? {
            privada: {
              dni: nuloSiVacio(valores.dni),
              telefono: nuloSiVacio(valores.telefono),
              domicilio: nuloSiVacio(valores.domicilio),
              sueldo_centimos: valores.sueldoCentimos,
              sueldo_es: nuloSiVacio(valores.sueldoEs),
              sueldo_cada: nuloSiVacio(valores.sueldoCada),
              pagas,
            },
          }
        : {}),
      ...(contrato !== null && guardarElContrato ? { contrato } : {}),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    alHecho(leido === null ? 'Ficha guardada' : 'Ficha confirmada');
  }

  const titulo =
    paso === 'revisar' && leido !== null
      ? 'Fogón ha leído el contrato'
      : paso === 'revisar'
        ? `La ficha de ${nombre}`
        : `La ficha de ${nombre}`;

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={titulo}
      amplia={paso === 'revisar'}
      {...(paso === 'revisar'
        ? {
            pie: (
              <Botones>
                <Boton tono="texto" onClick={alCerrar}>
                  Dejarlo
                </Boton>
                <Boton
                  tono="principal"
                  disabled={malas.length > 0 || guardando}
                  cargando={guardando}
                  textoCargando="Guardando"
                  onClick={() => {
                    void confirmar();
                  }}
                >
                  {leido === null ? 'Guardar la ficha' : 'Confirmar la ficha'}
                </Boton>
              </Botones>
            ),
          }
        : {})}
    >
      {paso === 'elegir' && (
        <div className="flex flex-col gap-e4">
          <p className="text-cuerpo">
            <strong>¿Cómo rellenamos su ficha?</strong> Con el contrato, Fogón la rellena en un
            momento y tú la revisas antes de guardar.
          </p>
          {error !== null && <ErrorEnCristiano error={error} />}
          {problema !== null && (
            <Aviso tono="atencion" titulo="No se ha podido leer">
              {problema}
            </Aviso>
          )}
          <div className="grid gap-e3 pt-e2 sm:grid-cols-3">
            <FormaDeRellenar
              icono={<IconoCamara size={20} />}
              titulo="Foto del contrato"
              detalle="Si lo tienes en papel. Una foto por página, con buena luz."
              alElegir={() => fotos.current?.click()}
            />
            <FormaDeRellenar
              icono={<IconoSubir size={20} />}
              titulo="Archivo del contrato"
              detalle="El PDF que te pasa la gestoría. Se lee entero y sin errores."
              recomendada
              alElegir={() => archivo.current?.click()}
            />
            <FormaDeRellenar
              icono={<IconoEditar size={20} />}
              titulo="A mano"
              detalle="Si no lo tienes o prefieres no subirlo."
              alElegir={() => {
                setPaso('revisar');
              }}
            />
          </div>
          <p className="flex items-start gap-e2 text-secundario text-texto-suave">
            <IconoFogon size={16} aria-hidden className="mt-[2px] shrink-0" />
            Fogón lo lee en el servidor y te propone cada dato con la página de donde sale. Nada se
            guarda hasta que lo confirmas, y las vacaciones las cuenta Estook, nunca la IA.
          </p>
          <input
            ref={fotos}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            aria-label="Fotos del contrato"
            onChange={(e) => {
              void leer('foto', [...(e.currentTarget.files ?? [])]);
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={archivo}
            type="file"
            accept="application/pdf,image/*"
            hidden
            aria-label="Archivo del contrato"
            onChange={(e) => {
              void leer('archivo', [...(e.currentTarget.files ?? [])]);
              e.currentTarget.value = '';
            }}
          />
        </div>
      )}

      {paso === 'leyendo' && (
        <div className="flex flex-col gap-e3 py-e4">
          <Cargando que="el contrato" />
          <p className="text-center text-secundario text-texto-suave">
            Fogón está leyendo el contrato. Tarda unos segundos.
          </p>
        </div>
      )}

      {paso === 'revisar' && (
        <div className="flex flex-col gap-e4">
          {error !== null && <ErrorEnCristiano error={error} />}
          {leido !== null && (
            <Aviso tono="info" titulo="Revisa y confirma">
              Cada dato lleva la página del contrato de donde sale. Lo que está en ámbar no sale:
              escríbelo tú. Lo que cambies aquí manda sobre lo leído.
            </Aviso>
          )}
          {leido?.pareceDeOtro === true && (
            <Aviso tono="atencion" titulo={`Este contrato parece de «${leido.trabajador ?? ''}»`}>
              No de {nombre}. Mira que sea el suyo antes de confirmar.
            </Aviso>
          )}

          <fieldset className="flex flex-col gap-e3">
            <legend className="mb-e2 text-seccion font-semibold">Lo laboral</legend>
            <ConSuOrigen origen={origen.incorporacion}>
              <Campo
                etiqueta="Incorporación"
                tipo="fecha"
                value={valores.incorporacion}
                onChange={(e) => {
                  cambiar('incorporacion', e.currentTarget.value);
                }}
              />
            </ConSuOrigen>
            <div className="grid gap-e3 sm:grid-cols-2">
              <ConSuOrigen origen={origen.contrato}>
                <Selector
                  etiqueta="Contrato"
                  sinElegir="Sin poner"
                  opciones={Object.entries(TIPOS_DE_CONTRATO).map(([valor, texto]) => ({
                    valor,
                    texto,
                  }))}
                  value={valores.contrato}
                  onChange={(e) => {
                    cambiar('contrato', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
              <ConSuOrigen origen={origen.jornada}>
                <Selector
                  etiqueta="Jornada"
                  sinElegir="Sin poner"
                  opciones={[
                    { valor: 'completa', texto: 'Completa' },
                    { valor: 'parcial', texto: 'Parcial' },
                  ]}
                  value={valores.jornada}
                  onChange={(e) => {
                    cambiar('jornada', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
            </div>
            <ConSuOrigen origen={origen.horasSemanales}>
              <Campo
                etiqueta="Horas a la semana"
                tipo="numero"
                detras="h"
                value={valores.horasSemanales}
                onChange={(e) => {
                  cambiar('horasSemanales', e.currentTarget.value);
                }}
              />
            </ConSuOrigen>
            <ConSuOrigen origen={origen.categoria}>
              <Campo
                etiqueta="Categoría"
                ayuda="La del contrato: «Camarera», «Ayudante de cocina»."
                value={valores.categoria}
                onChange={(e) => {
                  cambiar('categoria', e.currentTarget.value);
                }}
              />
            </ConSuOrigen>
            <ConSuOrigen origen={origen.convenio}>
              <Campo
                etiqueta="Convenio"
                value={valores.convenio}
                onChange={(e) => {
                  cambiar('convenio', e.currentTarget.value);
                }}
              />
            </ConSuOrigen>
            <div className="grid gap-e3 sm:grid-cols-2">
              <ConSuOrigen origen={origen.vacacionesAlAno}>
                <Campo
                  etiqueta="Vacaciones al año"
                  tipo="numero"
                  detras="días"
                  ayuda="Las que dice su contrato o su convenio."
                  value={valores.vacacionesAlAno}
                  onChange={(e) => {
                    cambiar('vacacionesAlAno', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
              <ConSuOrigen origen={origen.vacacionesEn}>
                <Selector
                  etiqueta="Se cuentan en días"
                  opciones={[
                    { valor: 'naturales', texto: 'Naturales' },
                    { valor: 'laborables', texto: 'Laborables' },
                  ]}
                  value={valores.vacacionesEn}
                  onChange={(e) => {
                    cambiar('vacacionesEn', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
            </div>
            <ConSuOrigen origen={origen.pendientesAnteriores}>
              <Campo
                etiqueta="Pendientes de años anteriores"
                tipo="numero"
                detras="días"
                ayuda="Los días que le quedan de otros años. No salen del contrato: los pones tú."
                value={valores.pendientesAnteriores}
                onChange={(e) => {
                  cambiar('pendientesAnteriores', e.currentTarget.value);
                }}
              />
            </ConSuOrigen>
          </fieldset>

          {veLoPrivado && (
            <fieldset className="flex flex-col gap-e3">
              <legend className="mb-e2 text-seccion font-semibold">Lo privado</legend>
              <p className="-mt-e2 text-secundario text-texto-suave">
                Solo lo verán quien lleva el local y {nombre}.
              </p>
              <ConSuOrigen origen={origen.dni}>
                <Campo
                  etiqueta="DNI/NIE"
                  value={valores.dni}
                  {...(dniMal ? { error: 'La letra no cuadra con el número. Míralo bien.' } : {})}
                  onChange={(e) => {
                    cambiar('dni', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
              <ConSuOrigen origen={origen.telefono}>
                <Campo
                  etiqueta="Teléfono"
                  tipo="telefono"
                  value={valores.telefono}
                  onChange={(e) => {
                    cambiar('telefono', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
              <ConSuOrigen origen={origen.domicilio}>
                <Campo
                  etiqueta="Domicilio"
                  value={valores.domicilio}
                  onChange={(e) => {
                    cambiar('domicilio', e.currentTarget.value);
                  }}
                />
              </ConSuOrigen>
              <ConSuOrigen origen={origen.sueldoCentimos}>
                <CampoMoneda
                  etiqueta="Sueldo"
                  ayuda="El del contrato. Lo que le cuesta al local se pone aparte, en «Lo que cuesta al local»."
                  valor={valores.sueldoCentimos}
                  alCambiar={(v) => {
                    cambiar('sueldoCentimos', v);
                  }}
                />
              </ConSuOrigen>
              <div className="grid gap-e3 sm:grid-cols-3">
                <ConSuOrigen origen={origen.sueldoEs}>
                  <Selector
                    etiqueta="Es"
                    sinElegir="Sin poner"
                    opciones={[
                      { valor: 'bruto', texto: 'Bruto' },
                      { valor: 'neto', texto: 'Neto' },
                    ]}
                    value={valores.sueldoEs}
                    onChange={(e) => {
                      cambiar('sueldoEs', e.currentTarget.value);
                    }}
                  />
                </ConSuOrigen>
                <ConSuOrigen origen={origen.sueldoCada}>
                  <Selector
                    etiqueta="Cada"
                    sinElegir="Sin poner"
                    opciones={[
                      { valor: 'mes', texto: 'Mes' },
                      { valor: 'ano', texto: 'Año' },
                    ]}
                    value={valores.sueldoCada}
                    onChange={(e) => {
                      cambiar('sueldoCada', e.currentTarget.value);
                    }}
                  />
                </ConSuOrigen>
                <ConSuOrigen origen={origen.pagas}>
                  <Campo
                    etiqueta="Pagas"
                    tipo="numero"
                    value={valores.pagas}
                    onChange={(e) => {
                      cambiar('pagas', e.currentTarget.value);
                    }}
                  />
                </ConSuOrigen>
              </div>
            </fieldset>
          )}

          {contrato !== null && (
            <label className="flex min-h-toque items-center gap-e3 rounded-medio border border-borde p-e3 text-cuerpo">
              <input
                type="checkbox"
                className="size-5 accent-[var(--color-naranja)]"
                checked={guardarElContrato}
                onChange={(e) => {
                  setGuardarElContrato(e.currentTarget.checked);
                }}
              />
              <span>
                <strong>Guardar el contrato en su ficha</strong>
                <span className="block text-secundario text-texto-suave">
                  En privado, y se abre con un enlace que caduca.
                </span>
              </span>
            </label>
          )}

          {malas.length > 0 && (
            <Aviso tono="atencion" titulo="Hay algo que no cuadra">
              Mira {malas.join(', ')}.
            </Aviso>
          )}
          <p className="text-etiqueta text-texto-tenue">
            Lo que pone un contrato es un dato, nunca una orden para Fogón.
          </p>
        </div>
      )}
    </Hoja>
  );
}
