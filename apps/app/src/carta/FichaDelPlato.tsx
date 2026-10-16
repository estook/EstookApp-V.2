import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centimos, comisionDe } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  CAJA,
  Cargando,
  Envoltorio,
  ErrorEnCristiano,
  Interruptor,
  PanelLateral,
  Selector,
  clases,
} from '@estook/ui';
import { IconoDesvincular, IconoEscandallos, IconoPicante, IconoVincular } from '@estook/iconos';
import { puedeEditar, puedeVer } from '@estook/permisos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero } from '../almacen/contrato.ts';
import { FotoQueSePone } from '../fotos/FotoQueSePone.tsx';
import {
  canalesConPrecio,
  comoSeLeeElCuando,
  queCambio,
  type CanalDeVenta,
  type ElPlato,
  type MiCarta,
  type UnCanal,
} from './contrato.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { ElegirAlergenos, LosAlergenos } from '../escandallos/Alergenos.tsx';
import { VincularAlAlmacen } from '../escandallos/VincularAlAlmacen.tsx';
import { losAlergenosDe } from './contrato.ts';

/**
 * La ficha de un plato en la Carta (M9 · 1, decisión 0086).
 *
 * Lo que se vende y a cuánto: su foto, su nombre, su sección y su descripción; **su
 * precio de sala** y, en cada canal activo, **su precio a mano** —sin él, vale el de
 * sala, y lo dice—. Debajo de cada precio de plataforma, lo que se lleva y lo que te
 * queda («Uber Eats se lleva 3,75 €: te quedan 8,75 €»): el margen de verdad, con el
 * coste, llega cuando el plato se desgrane en Escandallos.
 *
 * Y **el historial**, plegado: quién cambió qué precio y cuándo (Richi, 15-oct). Sale
 * de la auditoría, que ya guardaba el antes y el después.
 */
export function FichaDelPlato({
  platoId,
  carta,
  alCerrar,
}: {
  readonly platoId: string;
  readonly carta: MiCarta;
  readonly alCerrar: () => void;
}) {
  const consulta = usarLectura<ElPlato>('un_plato', { plato_id: platoId });
  const datos = consulta.data;
  // Aquí y no dentro: al guardar, la ficha se monta otra vez con la versión nueva, y
  // el «Guardado» se perdía con ella (lo vio la prueba a mano, 15-oct).
  const [hecho, setHecho] = useState<string | null>(null);
  const [conHistorial, setConHistorial] = useState(false);

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Plato">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir este plato">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="el plato" lineas={4} />
        )}
      </PanelLateral>
    );
  }

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={datos.plato.nombre}>
      {datos.puedeEditar ? (
        <ParaEditar
          key={datos.plato.version}
          datos={datos}
          carta={carta}
          alCerrar={alCerrar}
          hecho={hecho}
          alHacer={setHecho}
          conHistorial={conHistorial}
          alVerHistorial={setConHistorial}
        />
      ) : (
        <ParaMirar datos={datos} carta={carta} />
      )}
    </PanelLateral>
  );
}

function nombreDeLaSeccion(carta: MiCarta) {
  return (id: string | null) =>
    id === null
      ? 'Sin sección'
      : (carta.secciones.find((s) => s.id === id)?.nombre ?? 'Sin sección');
}

/** Lo que se lleva la plataforma de ese precio y lo que queda, en una frase. */
function loQueSeLleva(canal: UnCanal, precio: number | null): string | undefined {
  if (precio === null || canal.comisionPorcentaje === null || canal.comisionPorcentaje <= 0) {
    return undefined;
  }
  const comision = comisionDe(precio, canal.comisionPorcentaje) + (canal.envaseCentimos ?? 0);
  return `${canal.nombre} se lleva ${comoDinero(comision)}: te quedan ${comoDinero(precio - comision)}`;
}

// ── Para quien la edita ──────────────────────────────────────────────────────

function ParaEditar({
  datos,
  carta,
  alCerrar,
  hecho,
  alHacer: setHecho,
  conHistorial,
  alVerHistorial,
}: {
  readonly datos: ElPlato;
  readonly carta: MiCarta;
  readonly alCerrar: () => void;
  /** Lo último que se hizo, en una palabra: vive arriba, que esta se vuelve a montar. */
  readonly hecho: string | null;
  readonly alHacer: (frase: string | null) => void;
  /** Si el historial está desplegado: también arriba, por lo mismo. */
  readonly conHistorial: boolean;
  readonly alVerHistorial: (abierto: boolean) => void;
}) {
  const { cliente } = usarSesion();
  const navegar = useNavigate();
  const refrescar = usarRefrescarLaCarta();
  const plato = datos.plato;
  const conPrecio = canalesConPrecio(carta.canales);

  const [nombre, setNombre] = useState(plato.nombre);
  const [seccion, setSeccion] = useState(plato.seccionId ?? '');
  const [descripcion, setDescripcion] = useState(plato.descripcion ?? '');
  const [precio, setPrecio] = useState<number | null>(plato.precioCentimos);
  const [precios, setPrecios] = useState<Partial<Record<CanalDeVenta, number | null>>>(
    plato.precios,
  );
  // Lo que la carta le dice al cliente (0087).
  const [unidades, setUnidades] = useState(
    plato.unidadesPorRacion === null ? '' : String(plato.unidadesPorRacion),
  );
  const [alergenos, setAlergenos] = useState<readonly string[]>(plato.alergenos);
  const [picante, setPicante] = useState(plato.picante);
  const [distintivos, setDistintivos] = useState<readonly string[]>(plato.distintivos);
  const [vinculando, setVinculando] = useState(false);
  const { permisos } = usarSesion();
  const refrescarLasFichas = usarRefrescarLasFichas();
  const puedeVincular =
    puedeEditar(permisos, 'app.escandallos') && puedeVer(permisos, 'app.almacen');
  const unidadesLeidas = unidades.trim() === '' ? null : Number.parseInt(unidades, 10);
  const unidadesMal =
    unidadesLeidas !== null &&
    (!Number.isInteger(unidadesLeidas) || unidadesLeidas < 1 || unidadesLeidas > 99);
  const mismaLista = (a: readonly string[], b: readonly string[]) =>
    [...a].sort().join(',') === [...b].sort().join(',');
  const [trabajando, setTrabajando] = useState<'guardando' | 'archivando' | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const preciosCambiados = Object.fromEntries(
    conPrecio
      .map((c) => [c.canal, precios[c.canal] ?? null] as const)
      .filter(([canal, valor]) => (plato.precios[canal] ?? null) !== valor),
  );
  const hayCambios =
    nombre.trim() !== plato.nombre ||
    seccion !== (plato.seccionId ?? '') ||
    descripcion.trim() !== (plato.descripcion ?? '') ||
    precio !== plato.precioCentimos ||
    Object.keys(preciosCambiados).length > 0 ||
    unidadesLeidas !== plato.unidadesPorRacion ||
    !mismaLista(alergenos, plato.alergenos) ||
    picante !== plato.picante ||
    !mismaLista(distintivos, plato.distintivos);

  async function guardar() {
    setTrabajando('guardando');
    setError(null);
    setHecho(null);
    const respuesta = await cliente.ejecutar('cambiar_plato', {
      plato_id: plato.id,
      version: plato.version,
      ...(nombre.trim() === plato.nombre ? {} : { nombre: nombre.trim() }),
      ...(seccion === (plato.seccionId ?? '')
        ? {}
        : { seccion_id: seccion === '' ? null : seccion }),
      ...(descripcion.trim() === (plato.descripcion ?? '')
        ? {}
        : { descripcion: descripcion.trim() === '' ? null : descripcion.trim() }),
      ...(precio === plato.precioCentimos ? {} : { precio_centimos: precio }),
      ...(Object.keys(preciosCambiados).length === 0 ? {} : { precios: preciosCambiados }),
      ...(unidadesLeidas === plato.unidadesPorRacion
        ? {}
        : { unidades_por_racion: unidadesLeidas }),
      ...(mismaLista(alergenos, plato.alergenos) ? {} : { alergenos }),
      ...(picante === plato.picante ? {} : { picante }),
      ...(mismaLista(distintivos, plato.distintivos) ? {} : { distintivos }),
    });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setHecho('Guardado');
    await refrescar();
  }

  async function archivarORecuperar() {
    setTrabajando('archivando');
    const respuesta = await cliente.ejecutar(plato.activo ? 'archivar_plato' : 'recuperar_plato', {
      plato_id: plato.id,
    });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    if (plato.activo) alCerrar();
  }

  return (
    <div className="flex flex-col gap-e4 pt-e3">
      {!plato.activo && (
        <Aviso tono="info" titulo="Archivado">
          No sale en la carta. Recupéralo y vuelve con todo lo que tenía.
        </Aviso>
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
      {hecho !== null && error === null && (
        <p aria-live="polite" className="text-secundario font-semibold text-bien">
          {hecho}
        </p>
      )}

      <div className="flex items-start gap-e3">
        <FotoQueSePone
          nombre={plato.nombre}
          categoria={null}
          foto={plato.foto}
          miniatura={plato.miniatura}
          puedeTocar
          poner={(reducida) =>
            cliente.ejecutar('poner_foto_de_plato', { plato_id: plato.id, ...reducida })
          }
          quitar={() => cliente.ejecutar('quitar_foto_de_plato', { plato_id: plato.id })}
          alHecho={async (frase) => {
            setHecho(frase);
            await refrescar();
          }}
          alFallar={setError}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-e3">
          <Campo
            etiqueta="Nombre"
            value={nombre}
            maxLength={120}
            onChange={(evento) => {
              setNombre(evento.target.value);
            }}
          />
          <Selector
            etiqueta="Sección"
            opciones={[
              { valor: '', texto: 'Sin sección' },
              ...carta.secciones.map((s) => ({ valor: s.id, texto: s.nombre })),
            ]}
            value={seccion}
            onChange={(evento) => {
              setSeccion(evento.target.value);
            }}
          />
        </div>
      </div>

      <Envoltorio id={`descripcion-${plato.id}`} etiqueta="Descripción">
        <textarea
          id={`descripcion-${plato.id}`}
          value={descripcion}
          maxLength={500}
          rows={2}
          onChange={(evento) => {
            setDescripcion(evento.target.value);
          }}
          className={`${CAJA} min-h-[4.5rem] py-e2`}
        />
      </Envoltorio>

      <section aria-label="Precios" className="flex flex-col gap-e3">
        <h3 className="text-secundario font-semibold text-texto-suave">Precios, con IVA</h3>
        <CampoMoneda
          etiqueta="Sala"
          valor={precio === null ? null : centimos(precio)}
          alCambiar={(valor) => {
            setPrecio(valor === null ? null : Number(valor));
          }}
        />
        {conPrecio.map((canal) => {
          const suyo = precios[canal.canal] ?? null;
          const vale = suyo ?? precio;
          const lleva = loQueSeLleva(canal, vale);
          const ayuda =
            suyo === null
              ? `Igual que sala${precio === null ? '' : ` (${comoDinero(precio)})`}${lleva === undefined ? '' : ` · ${lleva}`}`
              : lleva;
          return (
            <CampoMoneda
              key={canal.canal}
              etiqueta={canal.nombre}
              valor={suyo === null ? null : centimos(suyo)}
              alCambiar={(valor) => {
                setPrecios((antes) => ({
                  ...antes,
                  [canal.canal]: valor === null ? null : Number(valor),
                }));
              }}
              {...(ayuda === undefined ? {} : { ayuda })}
            />
          );
        })}
        {conPrecio.length === 0 && (
          <Boton
            tono="texto"
            onClick={() => {
              navegar('/carta/canales');
            }}
          >
            ¿Lo vendes también en Uber Eats? Actívalo en Canales
          </Boton>
        )}
      </section>

      {(puedeVincular || puedeVer(permisos, 'app.escandallos')) && (
        <ElVinculo
          plato={plato}
          puedeVincular={puedeVincular}
          puedeVerLaFicha={puedeVer(permisos, 'app.escandallos')}
          alVincular={() => {
            setVinculando(true);
          }}
          alQuitar={async () => {
            const respuesta = await cliente.ejecutar('vincular_plato', {
              plato_id: plato.id,
              producto_id: null,
            });
            if (!respuesta.ok) {
              setError(respuesta.error);
              return;
            }
            setHecho('Desvinculado');
            await refrescarLasFichas();
          }}
          alVerLaFicha={() => {
            navegar(`/escandallos/fichas/todas?ficha=plato.${plato.id}`);
          }}
        />
      )}

      <details
        open={
          plato.alergenos.length > 0 ||
          plato.picante > 0 ||
          plato.distintivos.length > 0 ||
          plato.unidadesPorRacion !== null ||
          undefined
        }
        className="rounded-grande border border-borde"
      >
        <summary className="flex min-h-toque cursor-pointer items-center gap-e2 px-e3 text-secundario font-semibold text-texto-suave">
          Alérgenos, picante y más
        </summary>
        <div className="flex flex-col gap-e4 px-e3 pb-e3">
          <ElegirAlergenos
            puestos={alergenos}
            deLaReceta={plato.alergenosDeLaReceta}
            alCambiar={setAlergenos}
          />
          {plato.alergenosDeLaReceta.length > 0 && (
            <p className="text-etiqueta text-texto-suave">
              Los marcados por su receta no se quitan desde aquí.
            </p>
          )}
          <div className="flex flex-col gap-e2">
            <span className="text-secundario font-medium text-texto-suave">Picante</span>
            <div role="radiogroup" aria-label="Picante" className="flex flex-wrap gap-e2">
              {[0, 1, 2, 3].map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  role="radio"
                  aria-checked={picante === nivel}
                  aria-label={nivel === 0 ? 'No pica' : `Picante ${String(nivel)} de 3`}
                  onClick={() => {
                    setPicante(nivel);
                  }}
                  className={clases(
                    'flex min-h-toque min-w-[3.5rem] items-center justify-center gap-[1px] rounded-medio border px-e3 text-secundario',
                    picante === nivel
                      ? 'border-texto bg-fondo font-semibold'
                      : 'border-borde text-texto-suave',
                  )}
                >
                  {nivel === 0
                    ? 'No'
                    : Array.from({ length: nivel }, (_, i) => (
                        <IconoPicante key={i} size={18} className="text-[#C62828]" />
                      ))}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-e3">
            <Interruptor
              etiqueta="Vegetariano"
              puesto={distintivos.includes('vegetariano') || distintivos.includes('vegano')}
              disabled={distintivos.includes('vegano')}
              alCambiar={(puesto) => {
                setDistintivos(puesto ? ['vegetariano'] : []);
              }}
            />
            <Interruptor
              etiqueta="Vegano"
              puesto={distintivos.includes('vegano')}
              alCambiar={(puesto) => {
                setDistintivos(puesto ? ['vegano'] : []);
              }}
            />
          </div>
          <Campo
            etiqueta="Unidades por ración"
            inputMode="numeric"
            value={unidades}
            detras="ud"
            ayuda="Si se dice en la carta: «8 croquetas»."
            onChange={(evento) => {
              setUnidades(evento.target.value.replace(/\D/g, ''));
            }}
            {...(unidadesMal ? { error: 'Entre 1 y 99' } : {})}
          />
        </div>
      </details>

      <Botones>
        <Boton
          tono="texto"
          cargando={trabajando === 'archivando'}
          textoCargando={plato.activo ? 'Archivando' : 'Recuperando'}
          onClick={() => {
            void archivarORecuperar();
          }}
        >
          {plato.activo ? 'Archivar' : 'Recuperar'}
        </Boton>
        <Boton
          tono="principal"
          disabled={!hayCambios || nombre.trim() === '' || unidadesMal}
          cargando={trabajando === 'guardando'}
          textoCargando="Guardando"
          onClick={() => {
            void guardar();
          }}
        >
          Guardar
        </Boton>
      </Botones>

      <Historial datos={datos} carta={carta} abierto={conHistorial} alCambiar={alVerHistorial} />

      {vinculando && (
        <VincularAlAlmacen
          platoId={plato.id}
          nombre={plato.nombre}
          alCerrar={() => {
            setVinculando(false);
          }}
          alHecho={(frase) => {
            setVinculando(false);
            setHecho(frase);
          }}
        />
      )}
    </div>
  );
}

// ── El vínculo con el Almacén, y la ficha ────────────────────────────────────

function ElVinculo({
  plato,
  puedeVincular,
  puedeVerLaFicha,
  alVincular,
  alQuitar,
  alVerLaFicha,
}: {
  readonly plato: ElPlato['plato'];
  readonly puedeVincular: boolean;
  readonly puedeVerLaFicha: boolean;
  readonly alVincular: () => void;
  readonly alQuitar: () => Promise<void>;
  readonly alVerLaFicha: () => void;
}) {
  const [quitando, setQuitando] = useState(false);
  if (plato.vinculadoA !== null) {
    return (
      <div className="flex items-center gap-e3 rounded-grande bg-fondo px-e3 py-e2">
        <IconoVincular size={18} className="shrink-0 text-texto-suave" />
        <span className="min-w-0 flex-1 text-secundario">
          Vinculado a <strong className="font-semibold">{plato.vinculadoA.nombre}</strong>
          {plato.vinculadoA.racion !== null && (
            <span className="tabular-nums"> · {plato.vinculadoA.racion}</span>
          )}
        </span>
        {puedeVincular && (
          <Boton
            tono="texto"
            tamano="s"
            icono={<IconoDesvincular size={16} />}
            cargando={quitando}
            textoCargando="Quitando"
            onClick={() => {
              setQuitando(true);
              void alQuitar().finally(() => {
                setQuitando(false);
              });
            }}
          >
            Quitar
          </Boton>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-e2">
      {!plato.tieneFicha && puedeVincular && (
        <Boton tono="secundario" icono={<IconoVincular size={18} />} onClick={alVincular}>
          Vincular
        </Boton>
      )}
      {puedeVerLaFicha && (
        <Boton tono="secundario" icono={<IconoEscandallos size={18} />} onClick={alVerLaFicha}>
          {plato.tieneFicha ? 'Su ficha' : 'Desgranar'}
        </Boton>
      )}
    </div>
  );
}

// ── Para quien solo la mira ──────────────────────────────────────────────────

function ParaMirar({ datos, carta }: { readonly datos: ElPlato; readonly carta: MiCarta }) {
  const plato = datos.plato;
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  return (
    <div className="flex flex-col gap-e4 pt-e3">
      {plato.foto !== null && (
        <img
          src={plato.foto}
          alt={`Foto de ${plato.nombre}`}
          className="max-h-[40vh] w-full rounded-grande bg-fondo object-cover"
        />
      )}
      <p className="text-secundario text-texto-suave">
        {nombreDeLaSeccion(carta)(plato.seccionId)}
      </p>
      {plato.descripcion !== null && <p className="text-cuerpo">{plato.descripcion}</p>}
      <LosAlergenos
        alergenos={losAlergenosDe(plato)}
        picante={plato.picante}
        distintivos={plato.distintivos}
        lado={26}
        conNombre
      />
      {plato.unidadesPorRacion !== null && (
        <p className="text-secundario text-texto-suave">{plato.unidadesPorRacion} ud por ración</p>
      )}
      <dl className="flex flex-col gap-e2">
        <div className="flex justify-between gap-e3">
          <dt className="text-texto-suave">Sala</dt>
          <dd className="font-semibold tabular-nums">{comoDinero(plato.precioCentimos)}</dd>
        </div>
        {canalesConPrecio(carta.canales).map((canal) => (
          <div key={canal.canal} className="flex justify-between gap-e3">
            <dt className="text-texto-suave">{canal.nombre}</dt>
            <dd className="font-semibold tabular-nums">
              {comoDinero(plato.precios[canal.canal] ?? plato.precioCentimos)}
            </dd>
          </div>
        ))}
      </dl>
      {plato.tieneFicha && puedeVer(permisos, 'app.escandallos') && (
        <Boton
          tono="secundario"
          icono={<IconoEscandallos size={18} />}
          onClick={() => {
            navegar(`/escandallos/fichas/todas?ficha=plato.${plato.id}`);
          }}
        >
          Ver la ficha
        </Boton>
      )}
    </div>
  );
}

// ── El historial, plegado ────────────────────────────────────────────────────

function Historial({
  datos,
  carta,
  abierto,
  alCambiar,
}: {
  readonly datos: ElPlato;
  readonly carta: MiCarta;
  readonly abierto: boolean;
  readonly alCambiar: (abierto: boolean) => void;
}) {
  if (datos.historial.length === 0) return null;
  const seccion = nombreDeLaSeccion(carta);
  return (
    <details
      open={abierto}
      onToggle={(evento) => {
        alCambiar(evento.currentTarget.open);
      }}
      className="rounded-grande border border-borde"
    >
      <summary className="flex min-h-toque cursor-pointer items-center px-e3 text-secundario font-semibold text-texto-suave">
        Historial
      </summary>
      <ol aria-label="Historial del plato" className="flex flex-col gap-e2 px-e3 pb-e3">
        {datos.historial.map((cambio) => (
          <li key={`${cambio.cuando}-${cambio.que}`} className="flex flex-col">
            <span className="text-etiqueta text-texto-tenue">
              {comoSeLeeElCuando(cambio.cuando)}
              {cambio.quien === null ? '' : ` · ${cambio.quien}`}
            </span>
            {queCambio(cambio, seccion).map((linea) => (
              <span key={linea} className="text-secundario">
                {linea}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </details>
  );
}
