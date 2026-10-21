import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Lista,
  Selector,
  Tarjeta,
  clases,
  type ElementoDeLista,
} from '@estook/ui';
import {
  IconoAjustes,
  IconoAnadir,
  IconoDescargar,
  IconoFlechaDerecha,
  IconoFlechaIzquierda,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  INICIAL_DEL_DIA,
  diaDeLaSemana,
  fechaOperativa,
  laSemanaEnLetra,
  lunesDe,
  masDias,
} from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { comoDinero } from '../almacen/contrato.ts';
import {
  elDiaEnLetra,
  elDiaQueSeAbre,
  elSuplemento,
  lasSeccionesQueSalen,
  loQueDejaEnLetra,
  loQueIncluye,
  type MisMenus,
  type UnDiaDelMenu,
  type UnMenu,
  type UnPlatoDelMenu,
} from './contratoDeLosMenus.ts';
import { AjustesDelMenu } from './AjustesDelMenu.tsx';
import { AnadirAlMenu } from './AnadirAlMenu.tsx';
import { DescargarElMenu } from './DescargarElMenu.tsx';
import { UnPlatoEnElMenu } from './UnPlatoEnElMenu.tsx';

/**
 * Carta › Menús (M10 · 2, decisiones 0103 y 0104).
 *
 * Richi, 21-oct: el menú del día con primeros, segundos y bebida, «a elegir si entra pan,
 * café y postre», un precio, otro menú a un botón «que no esté tan a la vista», añadir
 * un plato de la carta o uno nuevo, y descargar sin llenar la pantalla de botones. Y que
 * cambia cada día (A1): **la pantalla es la semana**, y un día que no se toca repite el
 * anterior.
 *
 * **Lo esencial a la vista**: el precio, los días y los platos de cada sección. Lo demás
 * —ajustes, descargar, copiar la semana— a un toque. Lo que deja, a quien ve costes.
 */

export function Menus() {
  const [lunes, setLunes] = useState<string | undefined>(undefined);
  const consulta = usarLectura<MisMenus>('mis_menus', lunes === undefined ? {} : { lunes });
  const [menuId, setMenuId] = useState<string | null>(null);

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus menús" forma="lista" lineas={6} />
      </div>
    );
  }
  const datos = consulta.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus menús">
        Prueba en un momento.
      </Aviso>
    );
  }
  if (datos.sirveMenus !== true) return <SirvesMenus datos={datos} />;

  const menu = datos.menus.find((m) => m.id === menuId) ?? datos.menus[0];
  if (menu === undefined) return <SirvesMenus datos={datos} />;

  return (
    <div className="flex flex-col gap-e4">
      {datos.menus.length > 1 && (
        <Selector
          etiqueta="Menú"
          value={menu.id}
          opciones={datos.menus.map((m) => ({ valor: m.id, texto: m.nombre }))}
          onChange={(evento) => {
            setMenuId(evento.target.value);
          }}
        />
      )}
      <ElMenu
        key={`${menu.id}-${datos.lunes}`}
        datos={datos}
        menu={menu}
        alCambiarDeSemana={(cuantas) => {
          setLunes(masDias(fechaOperativa(datos.lunes), cuantas * 7));
        }}
        alVolverAEstaSemana={() => {
          setLunes(undefined);
        }}
        alCrearOtro={(id) => {
          setMenuId(id);
        }}
      />
    </div>
  );
}

// ═══ ¿Tu local sirve menús? ═══════════════════════════════════════════════════

/**
 * La primera vez que se abre, se pregunta (0103): con «No», la pestaña se esconde y se
 * vuelve a encender en Ajustes › Tu local. Y si ya dijo que no, lo mismo, con el botón.
 */
function SirvesMenus({ datos }: { readonly datos: MisMenus }) {
  const { cliente, refrescar: refrescarLaSesion } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const navegar = useNavigate();
  const [trabajando, setTrabajando] = useState<boolean | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function contestar(sirve: boolean) {
    setTrabajando(sirve);
    setError(null);
    const respuesta = await cliente.ejecutar('sirve_menus', { sirve });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await Promise.all([refrescar(), refrescarLaSesion()]);
    if (!sirve) navegar('/carta', { replace: true });
  }

  const noLosSirve = datos.sirveMenus === false;
  return (
    <Tarjeta>
      {error !== null && <ErrorEnCristiano error={error} />}
      <EstadoVacio
        dibujo="platos"
        acento="var(--color-app-carta)"
        titulo={noLosSirve ? 'Tu local no sirve menús' : '¿Tu local sirve menús?'}
        frase="El menú del día con su precio, sus platos de cada día y lo que te deja. Para imprimirlo o mandarlo en un toque."
        {...(datos.puedeEditar
          ? {
              accion: (
                <div className="flex flex-wrap justify-center gap-e2">
                  <Boton
                    tono="principal"
                    cargando={trabajando === true}
                    onClick={() => {
                      void contestar(true);
                    }}
                  >
                    {noLosSirve ? 'Encender los menús' : 'Sí, sirvo menús'}
                  </Boton>
                  {!noLosSirve && (
                    <Boton
                      tono="secundario"
                      cargando={trabajando === false}
                      onClick={() => {
                        void contestar(false);
                      }}
                    >
                      No
                    </Boton>
                  )}
                </div>
              ),
            }
          : { sinAccionPorque: 'Lo dice quien lleva el local.' })}
      />
      {!noLosSirve && datos.puedeEditar && (
        <p className="px-e4 pb-e4 text-center text-secundario text-texto-suave">
          Con «No», esta pestaña se esconde. Se vuelve a encender en Ajustes › Tu local.
        </p>
      )}
    </Tarjeta>
  );
}

// ═══ Un menú ══════════════════════════════════════════════════════════════════

function ElMenu({
  datos,
  menu,
  alCambiarDeSemana,
  alVolverAEstaSemana,
  alCrearOtro,
}: {
  readonly datos: MisMenus;
  readonly menu: UnMenu;
  readonly alCambiarDeSemana: (cuantas: number) => void;
  readonly alVolverAEstaSemana: () => void;
  readonly alCrearOtro: (menuId: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const navegar = useNavigate();
  const [fecha, setFecha] = useState<string | null>(() => elDiaQueSeAbre(menu));
  const [ajustes, setAjustes] = useState(false);
  const [descargar, setDescargar] = useState(false);
  const [anadirEn, setAnadirEn] = useState<string | null>(null);
  const [plato, setPlato] = useState<{ seccionId: string; plato: UnPlatoDelMenu } | null>(null);
  const [copiando, setCopiando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const delDia = menu.clase === 'del_dia';
  const dia = menu.dias.find((d) => d.fecha === fecha) ?? menu.dias[0];
  const sePuedeTocar = datos.puedeEditar && dia !== undefined && !dia.yaPaso;
  const esEstaSemana = lunesDe(fechaOperativa(datos.hoy)) === datos.lunes;

  async function copiarLaSemana() {
    setCopiando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('copiar_la_semana_pasada', {
      menu_id: menu.id,
      lunes: datos.lunes,
    });
    setCopiando(false);
    if (!respuesta.ok) setError(respuesta.error);
    await refrescar();
  }

  async function crearOtro() {
    setCreando(true);
    setError(null);
    const nombres = new Set(datos.menus.map((m) => m.nombre.toLocaleLowerCase('es')));
    const nombre =
      ['Menú ejecutivo', 'Menú de grupo', 'Menú degustación', 'Menú especial'].find(
        (n) => !nombres.has(n.toLocaleLowerCase('es')),
      ) ?? `Menú ${String(datos.menus.length + 1)}`;
    const respuesta = await cliente.ejecutar<{ menuId: string }>('crear_menu', { nombre });
    setCreando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCrearOtro(respuesta.datos.menuId);
  }

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}

      <Tarjeta
        titulo={menu.nombre}
        acento="var(--color-app-carta)"
        {...(datos.puedeEditar
          ? {
              accion: (
                <Boton
                  tono="texto"
                  tamano="s"
                  icono={<IconoAjustes size={18} />}
                  aria-label="Ajustes: precio, secciones y lo que entra"
                  onClick={() => {
                    setAjustes(true);
                  }}
                >
                  Ajustes
                </Boton>
              ),
            }
          : {})}
      >
        <div className="flex flex-col gap-e3 px-e3 pb-e3">
          <div className="flex flex-wrap items-center justify-between gap-e2">
            <ElPrecio
              menu={menu}
              dia={dia}
              alPonerlo={() => {
                setAjustes(true);
              }}
              puede={datos.puedeEditar}
            />
            {/* «Descargar, que sea ampliable y salgan las opciones» (Richi): un botón. */}
            <Boton
              tono="secundario"
              tamano="s"
              icono={<IconoDescargar size={16} />}
              onClick={() => {
                setDescargar(true);
              }}
            >
              Descargar
            </Boton>
          </div>

          {delDia && (
            <LaSemana
              menu={menu}
              lunes={datos.lunes}
              fecha={dia?.fecha ?? null}
              esEstaSemana={esEstaSemana}
              alElegir={setFecha}
              alCambiarDeSemana={alCambiarDeSemana}
              alVolverAEstaSemana={alVolverAEstaSemana}
            />
          )}

          {dia !== undefined && <ComoEstaElDia dia={dia} delDia={delDia} />}
        </div>
      </Tarjeta>

      {dia !== undefined &&
        lasSeccionesQueSalen(menu).map((seccion) => {
          const platos = dia.platos[seccion.id] ?? [];
          const filas: ElementoDeLista[] = platos.map((p) => {
            const suplemento = elSuplemento(p.suplementoCentimos);
            return {
              clave: p.platoId,
              titulo: (
                <span className={clases(p.agotado && 'text-texto-suave line-through')}>
                  {p.nombre}
                </span>
              ),
              ...(p.agotado || p.soloDelMenu
                ? {
                    detalle: (
                      <span className="flex flex-wrap gap-e1">
                        {p.agotado && <Etiqueta tono="mal">Agotado</Etiqueta>}
                        {p.soloDelMenu && <Etiqueta tono="info">Solo del menú</Etiqueta>}
                      </span>
                    ),
                  }
                : {}),
              ...(suplemento === null
                ? {}
                : { derecha: <span className="text-secundario font-semibold">{suplemento}</span> }),
              ...(sePuedeTocar
                ? {
                    alPulsar: () => {
                      setPlato({ seccionId: seccion.id, plato: p });
                    },
                  }
                : {}),
            };
          });
          return (
            <Tarjeta key={seccion.id} titulo={seccion.comoSeLlama} cuantos={platos.length}>
              <Lista
                titulo={seccion.comoSeLlama}
                elementos={filas}
                cuandoNoHay={
                  <p className="px-e3 py-e2 text-secundario text-texto-suave">
                    {sePuedeTocar ? 'Sin platos todavía.' : 'Sin platos.'}
                  </p>
                }
              />
              {sePuedeTocar && (
                <div className="px-e3 pb-e3 pt-e1">
                  <Boton
                    tono="secundario"
                    tamano="s"
                    icono={<IconoAnadir size={16} />}
                    onClick={() => {
                      setAnadirEn(seccion.id);
                    }}
                  >
                    Añadir plato
                  </Boton>
                </div>
              )}
            </Tarjeta>
          );
        })}

      {dia?.loQueDeja !== undefined && (
        <LoQueDeja
          dia={dia}
          alDesgranar={() => {
            navegar('/escandallos/escandallos/menus');
          }}
        />
      )}

      {datos.puedeEditar && (
        <div className="flex flex-wrap gap-e2">
          {delDia && (
            <Boton
              tono="texto"
              cargando={copiando}
              textoCargando="Copiando"
              onClick={() => void copiarLaSemana()}
            >
              Copiar la semana pasada
            </Boton>
          )}
          {/* «Que no esté tan a la vista, que no se usa tanto» (Richi, 21-oct). */}
          <Boton
            tono="texto"
            icono={<IconoAnadir size={16} />}
            cargando={creando}
            textoCargando="Creando"
            onClick={() => void crearOtro()}
          >
            Otro menú
          </Boton>
        </div>
      )}

      {ajustes && (
        <AjustesDelMenu
          menu={menu}
          verCostes={datos.verCostes}
          alCerrar={() => {
            setAjustes(false);
          }}
        />
      )}
      {descargar && dia !== undefined && (
        <DescargarElMenu
          menu={menu}
          dia={dia}
          alCerrar={() => {
            setDescargar(false);
          }}
        />
      )}
      {anadirEn !== null && dia !== undefined && (
        <AnadirAlMenu
          menu={menu}
          fecha={dia.fecha}
          seccionId={anadirEn}
          yaEstan={(dia.platos[anadirEn] ?? []).map((p) => p.platoId)}
          alCerrar={() => {
            setAnadirEn(null);
          }}
        />
      )}
      {plato !== null && dia !== undefined && (
        <UnPlatoEnElMenu
          menu={menu}
          fecha={dia.fecha}
          seccionId={plato.seccionId}
          plato={plato.plato}
          alCerrar={() => {
            setPlato(null);
          }}
        />
      )}
    </div>
  );
}

/** El precio, grande, y lo que entra aparte. Sin precio, se dice dónde ponerlo. */
function ElPrecio({
  menu,
  dia,
  puede,
  alPonerlo,
}: {
  readonly menu: UnMenu;
  readonly dia: UnDiaDelMenu | undefined;
  readonly puede: boolean;
  readonly alPonerlo: () => void;
}) {
  const incluye = dia === undefined ? null : loQueIncluye(menu, dia);
  return (
    <div className="flex flex-wrap items-baseline gap-x-e3 gap-y-e1">
      {menu.precioCentimos === null ? (
        puede ? (
          <Boton tono="secundario" tamano="s" onClick={alPonerlo}>
            Ponerle precio
          </Boton>
        ) : (
          <span className="text-secundario text-texto-suave">Sin precio todavía</span>
        )
      ) : (
        <span className="text-[2rem] font-bold leading-none tracking-tight">
          {comoDinero(menu.precioCentimos)}
        </span>
      )}
      {incluye !== null && <span className="text-secundario text-texto-suave">{incluye}</span>}
    </div>
  );
}

/** La semana: las flechas, y un botón por cada día que se sirve. */
function LaSemana({
  menu,
  lunes,
  fecha,
  esEstaSemana,
  alElegir,
  alCambiarDeSemana,
  alVolverAEstaSemana,
}: {
  readonly menu: UnMenu;
  readonly lunes: string;
  readonly fecha: string | null;
  readonly esEstaSemana: boolean;
  readonly alElegir: (fecha: string) => void;
  readonly alCambiarDeSemana: (cuantas: number) => void;
  readonly alVolverAEstaSemana: () => void;
}) {
  return (
    <div className="flex flex-col gap-e2">
      <div className="flex items-center gap-e1">
        <Boton
          tono="texto"
          tamano="s"
          icono={<IconoFlechaIzquierda size={18} />}
          aria-label="La semana de antes"
          onClick={() => {
            alCambiarDeSemana(-1);
          }}
        />
        <span className="min-w-0 flex-1 text-center text-secundario font-semibold">
          {laSemanaEnLetra(fechaOperativa(lunes))}
        </span>
        <Boton
          tono="texto"
          tamano="s"
          icono={<IconoFlechaDerecha size={18} />}
          aria-label="La semana siguiente"
          onClick={() => {
            alCambiarDeSemana(1);
          }}
        />
      </div>
      <div className="flex gap-e1" role="tablist" aria-label="Los días">
        {menu.dias.map((d) => {
          const elegido = d.fecha === fecha;
          return (
            <button
              key={d.fecha}
              type="button"
              role="tab"
              aria-selected={elegido}
              aria-label={elDiaEnLetra(d.fecha)}
              onClick={() => {
                alElegir(d.fecha);
              }}
              className={clases(
                'relative flex min-h-toque flex-1 flex-col items-center justify-center rounded-mediano border text-secundario font-semibold transition-colors',
                elegido
                  ? 'border-transparent bg-[var(--color-app-carta)] text-white'
                  : 'border-borde bg-superficie',
                !elegido && d.yaPaso && 'text-texto-suave',
              )}
            >
              <span>{INICIAL_DEL_DIA[diaDeLaSemana(fechaOperativa(d.fecha))]}</span>
              <span className="text-[0.7rem] font-normal">{Number(d.fecha.slice(8))}</span>
              {d.esHoy && (
                <span
                  aria-hidden
                  className={clases(
                    'absolute top-1 right-1 size-1.5 rounded-full',
                    elegido ? 'bg-white' : 'bg-[var(--color-app-carta)]',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      {!esEstaSemana && (
        <Boton tono="texto" tamano="s" onClick={alVolverAEstaSemana}>
          Volver a esta semana
        </Boton>
      )}
    </div>
  );
}

/** «Martes 20 de octubre · Repite el lunes», o «Ya pasó». */
function ComoEstaElDia({ dia, delDia }: { readonly dia: UnDiaDelMenu; readonly delDia: boolean }) {
  if (!delDia) return null;
  const nota = dia.yaPaso
    ? 'Ya pasó: se queda como se sirvió'
    : !dia.montado && dia.repiteDe !== null
      ? `Repite el ${elDiaEnLetra(dia.repiteDe).split(' ')[0]?.toLocaleLowerCase('es') ?? ''}`
      : null;
  return (
    <p className="text-secundario">
      <span className="font-semibold">{elDiaEnLetra(dia.fecha)}</span>
      {nota !== null && <span className="text-texto-suave"> · {nota}</span>}
    </p>
  );
}

/** Lo que deja ese día, a quien ve costes: lo peor, lo mejor y lo que lo hunde. */
function LoQueDeja({
  dia,
  alDesgranar,
}: {
  readonly dia: UnDiaDelMenu;
  readonly alDesgranar: () => void;
}) {
  if (dia.loQueDeja === undefined) return null;
  const dice = loQueDejaEnLetra(dia.loQueDeja);
  return (
    <Aviso tono={dice.tono} titulo={dice.titulo}>
      {dice.detalle !== null && <p>{dice.detalle}</p>}
      {dia.loQueDeja.estado === 'faltan_costes' && (
        <Boton
          tono="texto"
          tamano="s"
          icono={<IconoFlechaDerecha size={16} />}
          onClick={alDesgranar}
        >
          Desgranar en Escandallos
        </Boton>
      )}
      {dia.loQueDeja.estado === 'listo' && dia.loQueDeja.sinCoste.length > 0 && (
        <p className="text-texto-suave">
          {dia.loQueDeja.sinCoste.map((q) => (q === 'pan' ? 'El pan' : 'El café')).join(' y ')}{' '}
          {dia.loQueDeja.sinCoste.length === 1 ? 'cuenta' : 'cuentan'} 0 €: dile su producto en
          Ajustes.
        </p>
      )}
    </Aviso>
  );
}
