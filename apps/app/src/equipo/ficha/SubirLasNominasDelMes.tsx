import { useRef, useState } from 'react';
import {
  Aviso,
  Boton,
  Botones,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Selector,
} from '@estook/ui';
import { IconoFogon, IconoSubir } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../../sesion/Sesion.tsx';
import {
  NoSeHaPodidoLeer,
  esPdf,
  paginasParaGuardar,
  textoDeCadaPagina,
} from '../../carta/paginasDeLaCarta.ts';
import { comoDinero, type LasNominasLeidas, type NominaLeida } from '../contrato.ts';
import { esteMes, losUltimosMeses, mesConMayuscula } from './comoSeLee.ts';
import { aBase64, pdfDeImagenes, type PaginaEnImagen } from './pdfDeImagenes.ts';

/**
 * «Subir las nóminas del mes» (la Ampliación 3 · 2, decisión 0153; la maqueta, pestaña 3).
 *
 * La gestoría manda **un PDF con las nóminas de todos**. Se sube una vez:
 *
 *   1 · **Fogón lee** cada página (en texto, si el PDF lo tiene; si es un escaneado, en
 *       imagen, de cinco en cinco) y **Estook la casa** con su persona por el DNI de su ficha
 *       o por el nombre. La que no sabe de quién es, la pregunta: «¿Quién es?».
 *   2 · **Tú lo revisas**: de quién es cada página, su bruto y su neto, y, si la nómina dice
 *       otra categoría u otro convenio que su ficha, si la pones al día (marcándolo tú).
 *   3 · **Se guarda cada una sola** en la ficha de su persona: el móvil hace un PDF con sus
 *       páginas. El PDF entero **no se guarda en ningún sitio**: lleva las de todos.
 */

const PAGINAS_EN_TEXTO = 40;
const PAGINAS_EN_FOTO_POR_VEZ = 5;
const PAGINAS_COMO_MUCHO = 40;

type Paso =
  | { readonly que: 'elegir' }
  | { readonly que: 'leyendo'; readonly detalle: string }
  | { readonly que: 'repartir' }
  | { readonly que: 'guardando'; readonly hechas: number; readonly de: number }
  | { readonly que: 'hecho'; readonly guardadas: number; readonly fallos: readonly string[] };

/** De quién es cada página: una persona, o «fuera». */
type Reparto = Record<number, string>;

const FUERA = '';

export function SubirLasNominasDelMes({
  mesPropuesto,
  alCerrar,
  alHecho,
}: {
  readonly mesPropuesto: string;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
}) {
  const { cliente } = usarSesion();
  const meses = losUltimosMeses(esteMes(), 13);
  const [mes, setMes] = useState(mesPropuesto);
  const [paso, setPaso] = useState<Paso>({ que: 'elegir' });
  const [leidas, setLeidas] = useState<LasNominasLeidas | null>(null);
  const [paginas, setPaginas] = useState<readonly PaginaEnImagen[]>([]);
  const [reparto, setReparto] = useState<Reparto>({});
  const [alDia, setAlDia] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const elegir = useRef<HTMLInputElement>(null);

  async function leer(ficheros: readonly File[]) {
    if (ficheros.length === 0) return;
    setError(null);
    setProblema(null);
    try {
      setPaso({ que: 'leyendo', detalle: 'Preparando las páginas' });
      const primero = ficheros[0];
      const enImagen = await paginasParaGuardar(ficheros, PAGINAS_COMO_MUCHO);
      setPaginas(enImagen);

      let todas: LasNominasLeidas | null = null;
      const texto =
        primero !== undefined && ficheros.length === 1 && esPdf(primero)
          ? await textoDeCadaPagina(primero, PAGINAS_EN_TEXTO)
          : null;
      if (texto !== null) {
        setPaso({ que: 'leyendo', detalle: `Fogón está leyendo ${String(texto.length)} páginas` });
        const respuesta = await cliente.ejecutar<LasNominasLeidas>('leer_las_nominas_con_fogon', {
          paginas_de_texto: texto,
        });
        if (!respuesta.ok) {
          setError(respuesta.error);
          setPaso({ que: 'elegir' });
          return;
        }
        todas = respuesta.datos;
      } else {
        // Un escaneado o fotos: de cinco en cinco, con el número de página del conjunto.
        for (let desde = 0; desde < enImagen.length; desde += PAGINAS_EN_FOTO_POR_VEZ) {
          const tanda = enImagen.slice(desde, desde + PAGINAS_EN_FOTO_POR_VEZ);
          setPaso({
            que: 'leyendo',
            detalle: `Fogón está leyendo las páginas ${String(desde + 1)} a ${String(desde + tanda.length)} de ${String(enImagen.length)}`,
          });
          const respuesta = await cliente.ejecutar<LasNominasLeidas>('leer_las_nominas_con_fogon', {
            fotos: tanda.map((p) => ({ tipo: 'image/jpeg', base64: aBase64(p.jpeg) })),
            primera_pagina: desde + 1,
          });
          if (!respuesta.ok) {
            setError(respuesta.error);
            setPaso({ que: 'elegir' });
            return;
          }
          todas =
            todas === null
              ? respuesta.datos
              : { ...respuesta.datos, nominas: [...todas.nominas, ...respuesta.datos.nominas] };
        }
      }
      if (todas === null) return;
      setLeidas(todas);
      setReparto(Object.fromEntries(todas.nominas.map((n) => [n.pagina, n.personaId ?? FUERA])));
      // El mes, el que dicen las nóminas si todas dicen el mismo.
      const losMeses = new Set(todas.nominas.map((n) => n.mes).filter((m) => m !== null));
      const unico = [...losMeses][0];
      if (losMeses.size === 1 && unico !== undefined && meses.includes(unico)) setMes(unico);
      setPaso({ que: 'repartir' });
    } catch (fallo) {
      setProblema(
        fallo instanceof NoSeHaPodidoLeer
          ? fallo.message
          : 'No se ha podido preparar el PDF. Prueba con otro.',
      );
      setPaso({ que: 'elegir' });
    }
  }

  // Lo que se guarda: por persona, sus páginas en orden, y lo que suman.
  const porPersona = new Map<string, NominaLeida[]>();
  for (const n of leidas?.nominas ?? []) {
    const quien = reparto[n.pagina] ?? FUERA;
    if (quien === FUERA) continue;
    porPersona.set(quien, [...(porPersona.get(quien) ?? []), n]);
  }
  const personas = new Map((leidas?.personas ?? []).map((p) => [p.personaId, p]));
  /** Lo que la nómina dice distinto de su ficha: lo que se propone poner al día. */
  function loQueCambia(personaId: string): { categoria?: string; convenio?: string } {
    const suFicha = personas.get(personaId);
    const primera = porPersona.get(personaId)?.[0];
    if (suFicha === undefined || primera === undefined) return {};
    return {
      ...(primera.categoria !== null && primera.categoria !== suFicha.categoria
        ? { categoria: primera.categoria }
        : {}),
      ...(primera.convenio !== null && primera.convenio !== suFicha.convenio
        ? { convenio: primera.convenio }
        : {}),
    };
  }

  async function guardar() {
    const lista = [...porPersona.entries()];
    const fallos: string[] = [];
    let guardadas = 0;
    for (const [i, [personaId, suyas]] of lista.entries()) {
      setPaso({ que: 'guardando', hechas: i, de: lista.length });
      const susPaginas = suyas
        .map((n) => paginas[n.pagina - 1])
        .filter((p): p is PaginaEnImagen => p !== undefined);
      const nombre = personas.get(personaId)?.nombre ?? 'Alguien';
      if (susPaginas.length === 0) {
        fallos.push(`${nombre}: no se ha encontrado su página.`);
        continue;
      }
      const primera = suyas[0];
      const cambia = loQueCambia(personaId);
      const respuesta = await cliente.ejecutar('guardar_una_nomina', {
        persona_id: personaId,
        mes,
        fichero: { mime: 'application/pdf', base64: aBase64(pdfDeImagenes(susPaginas)) },
        bruto_centimos: primera?.brutoCentimos ?? null,
        neto_centimos: primera?.netoCentimos ?? null,
        ...(alDia[personaId] === true && Object.keys(cambia).length > 0
          ? { poner_al_dia: cambia }
          : {}),
      });
      if (respuesta.ok) guardadas += 1;
      else {
        const porque = respuesta.error.detalle?.['porque'];
        fallos.push(`${nombre}: ${typeof porque === 'string' ? porque : respuesta.error.quePasa}`);
      }
    }
    setPaso({ que: 'hecho', guardadas, fallos });
  }

  const sinDuenio = (leidas?.nominas ?? []).filter((n) => (reparto[n.pagina] ?? FUERA) === FUERA);
  const deOtroMes = (leidas?.nominas ?? []).filter((n) => n.mes !== null && n.mes !== mes);
  const paginasSinNomina = paginas
    .map((_, i) => i + 1)
    .filter((p) => !(leidas?.nominas ?? []).some((n) => n.pagina === p));

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={
        paso.que === 'repartir' || paso.que === 'guardando'
          ? `Nóminas de ${mesConMayuscula(mes).toLowerCase()}`
          : 'Subir las nóminas del mes'
      }
      amplia={paso.que === 'repartir'}
      {...(paso.que === 'repartir'
        ? {
            pie: (
              <Botones>
                <Boton tono="texto" onClick={alCerrar}>
                  Dejarlo
                </Boton>
                <Boton
                  tono="principal"
                  disabled={porPersona.size === 0}
                  onClick={() => {
                    void guardar();
                  }}
                >
                  {porPersona.size === 1
                    ? 'Guardar 1 nómina'
                    : `Guardar ${String(porPersona.size)} nóminas`}
                </Boton>
              </Botones>
            ),
          }
        : {})}
    >
      {paso.que === 'elegir' && (
        <div className="flex flex-col gap-e4">
          <p className="text-cuerpo">
            Sube el PDF que te manda la gestoría con <strong>las nóminas de todos</strong>. Fogón
            reparte cada página a su persona y tú lo confirmas.
          </p>
          {error !== null && <ErrorEnCristiano error={error} />}
          {problema !== null && (
            <Aviso tono="atencion" titulo="No se ha podido leer">
              {problema}
            </Aviso>
          )}
          <Selector
            etiqueta="De qué mes son"
            opciones={meses.map((m) => ({ valor: m, texto: mesConMayuscula(m) }))}
            value={mes}
            onChange={(e) => {
              setMes(e.currentTarget.value);
            }}
          />
          <div>
            <Boton
              tono="principal"
              icono={<IconoSubir size={18} />}
              onClick={() => {
                elegir.current?.click();
              }}
            >
              Elegir el PDF de las nóminas
            </Boton>
          </div>
          <p className="flex items-start gap-e2 text-secundario text-texto-suave">
            <IconoFogon size={16} aria-hidden className="mt-[2px] shrink-0" />
            Fogón lee lo que pone cada nómina; quién es quién lo decide Estook por el DNI y el
            nombre de cada ficha, y lo que no sabe te lo pregunta. El PDF entero no se guarda: cada
            nómina va sola, en privado, a la ficha de su persona.
          </p>
          <input
            ref={elegir}
            type="file"
            accept="application/pdf,image/*"
            multiple
            hidden
            aria-label="El PDF de las nóminas"
            onChange={(e) => {
              void leer([...(e.currentTarget.files ?? [])]);
              e.currentTarget.value = '';
            }}
          />
        </div>
      )}

      {paso.que === 'leyendo' && (
        <div className="flex flex-col gap-e3 py-e4">
          <Cargando que="las nóminas" />
          <p className="text-center text-secundario text-texto-suave">{paso.detalle}…</p>
        </div>
      )}

      {paso.que === 'repartir' && leidas !== null && (
        <div className="flex flex-col gap-e4">
          <div className="flex flex-wrap items-center gap-e2">
            <Etiqueta tono="info" icono={<IconoFogon size={14} />}>
              {leidas.nominas.length === 1
                ? '1 página leída'
                : `${String(leidas.nominas.length)} páginas leídas`}
            </Etiqueta>
            <Selector
              etiqueta="Mes"
              opciones={meses.map((m) => ({ valor: m, texto: mesConMayuscula(m) }))}
              value={mes}
              onChange={(e) => {
                setMes(e.currentTarget.value);
              }}
            />
          </div>
          {sinDuenio.length > 0 && (
            <Aviso tono="atencion" titulo="Hay páginas que no sé de quién son">
              Elige a quién va cada una o déjala fuera. Nunca se guarda una nómina en una ficha sin
              que lo digas tú.
            </Aviso>
          )}
          {deOtroMes.length > 0 && (
            <Aviso tono="atencion" titulo="Alguna nómina dice otro mes">
              {deOtroMes
                .map(
                  (n) =>
                    `la página ${String(n.pagina)} dice ${mesConMayuscula(n.mes ?? '').toLowerCase()}`,
                )
                .join(', ')}
              . Se guardan todas en {mesConMayuscula(mes).toLowerCase()}: cambia el mes arriba si no
              es ese.
            </Aviso>
          )}

          <div className="overflow-x-auto rounded-medio border border-borde">
            <table className="w-full min-w-[34rem] text-secundario">
              <thead className="bg-fondo text-left text-etiqueta text-texto-suave">
                <tr>
                  <th className="px-e3 py-e2 font-semibold">Página</th>
                  <th className="px-e3 py-e2 font-semibold">Es de</th>
                  <th className="px-e3 py-e2 text-right font-semibold">Bruto</th>
                  <th className="px-e3 py-e2 text-right font-semibold">Neto</th>
                  <th className="px-e3 py-e2 font-semibold">
                    <span className="sr-only">Cómo se sabe</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leidas.nominas.map((n) => {
                  const elegida = reparto[n.pagina] ?? FUERA;
                  const sinElegir = elegida === FUERA;
                  return (
                    <tr
                      key={n.pagina}
                      className={`border-t border-borde ${sinElegir ? 'bg-atencion-suave/50' : ''}`}
                    >
                      <td className="px-e3 py-e2 font-semibold tabular-nums">{n.pagina}</td>
                      <td className="px-e3 py-e2">
                        <label className="flex flex-col gap-[2px]">
                          <span className="sr-only">De quién es la página {n.pagina}</span>
                          <select
                            className="min-h-toque rounded-medio border border-borde bg-superficie px-e2"
                            value={elegida}
                            onChange={(e) => {
                              const valor = e.currentTarget.value;
                              setReparto((r) => ({ ...r, [n.pagina]: valor }));
                            }}
                          >
                            <option value={FUERA}>Dejarla fuera</option>
                            {leidas.personas.map((p) => (
                              <option key={p.personaId} value={p.personaId}>
                                {`${p.nombre} ${p.apellidos ?? ''}`.trim()}
                              </option>
                            ))}
                          </select>
                          {n.trabajador !== null && (
                            <span className="text-etiqueta text-texto-tenue">
                              Pone «{n.trabajador}»
                            </span>
                          )}
                        </label>
                      </td>
                      <td className="px-e3 py-e2 text-right tabular-nums">
                        {n.brutoCentimos === null ? '—' : comoDinero(n.brutoCentimos)}
                      </td>
                      <td className="px-e3 py-e2 text-right tabular-nums">
                        {n.netoCentimos === null ? '—' : comoDinero(n.netoCentimos)}
                      </td>
                      <td className="px-e3 py-e2">
                        {sinElegir ? (
                          <Etiqueta tono="atencion">¿Quién es?</Etiqueta>
                        ) : elegida === n.personaId && n.coincide === 'dni' ? (
                          <Etiqueta tono="bien">DNI coincide</Etiqueta>
                        ) : elegida === n.personaId && n.coincide === 'nombre' ? (
                          <Etiqueta tono="bien">Nombre coincide</Etiqueta>
                        ) : (
                          <Etiqueta>Elegida por ti</Etiqueta>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paginasSinNomina.length > 0 && (
            <p className="text-secundario text-texto-suave">
              {paginasSinNomina.length === 1
                ? `En la página ${String(paginasSinNomina[0])} Fogón no ha visto una nómina: se queda fuera.`
                : `En las páginas ${paginasSinNomina.join(', ')} Fogón no ha visto nóminas: se quedan fuera.`}
            </p>
          )}

          {[...porPersona.keys()].some((id) => Object.keys(loQueCambia(id)).length > 0) && (
            <fieldset className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
              <legend className="px-e1 text-cuerpo font-semibold">Poner su ficha al día</legend>
              <p className="text-secundario text-texto-suave">
                La nómina dice otra cosa que su ficha. Márcalo si quieres que su ficha diga lo de la
                nómina.
              </p>
              {[...porPersona.keys()].map((id) => {
                const cambia = loQueCambia(id);
                if (Object.keys(cambia).length === 0) return null;
                const suFicha = personas.get(id);
                return (
                  <label key={id} className="flex min-h-toque items-start gap-e3 text-secundario">
                    <input
                      type="checkbox"
                      className="mt-[3px] size-5 accent-[var(--color-naranja)]"
                      checked={alDia[id] === true}
                      onChange={(e) => {
                        const marcado = e.currentTarget.checked;
                        setAlDia((a) => ({ ...a, [id]: marcado }));
                      }}
                    />
                    <span>
                      <strong>{suFicha?.nombre}</strong>
                      {cambia.categoria !== undefined &&
                        ` · categoría «${suFicha?.categoria ?? 'sin poner'}» → «${cambia.categoria}»`}
                      {cambia.convenio !== undefined &&
                        ` · convenio «${suFicha?.convenio ?? 'sin poner'}» → «${cambia.convenio}»`}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          <p className="text-etiqueta text-texto-tenue">
            Lo que pone una nómina es un dato, nunca una orden para Fogón. A cada persona le llega
            un aviso para ver la suya.
          </p>
        </div>
      )}

      {paso.que === 'guardando' && (
        <div className="flex flex-col gap-e3 py-e4">
          <Cargando que="las nóminas" />
          <p className="text-center text-secundario text-texto-suave">
            Guardando {paso.hechas + 1} de {paso.de}…
          </p>
        </div>
      )}

      {paso.que === 'hecho' && (
        <div className="flex flex-col gap-e4">
          <Aviso
            tono={paso.fallos.length === 0 ? 'bien' : 'atencion'}
            titulo={
              paso.guardadas === 1
                ? '1 nómina guardada'
                : `${String(paso.guardadas)} nóminas guardadas`
            }
          >
            Cada una, en la ficha de su persona, y a cada uno le llega su aviso para verla.
            {paso.fallos.length > 0 && ` No se han podido guardar: ${paso.fallos.join(' ')}`}
          </Aviso>
          <Boton
            tono="principal"
            ancho
            onClick={() => {
              alHecho();
            }}
          >
            Hecho
          </Boton>
        </div>
      )}
    </Hoja>
  );
}
