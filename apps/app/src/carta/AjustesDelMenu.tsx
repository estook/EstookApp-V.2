import { useState } from 'react';
import {
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  Plegable,
  Selector,
  clases,
} from '@estook/ui';
import { IconoAnadir, IconoBorrar, IconoFlechaAbajo, IconoFlechaArriba } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { INICIAL_DEL_DIA, NOMBRE_DEL_DIA, centimos, type Centimos } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import type { LoQuePuedeLlevar } from '../escandallos/contrato.ts';
import type { UnMenu } from './contratoDeLosMenus.ts';

/**
 * Los ajustes de un menú (M10 · 2, 0103): el precio, si entra pan, café y postre, los
 * días que se sirve, las secciones —«también pueden añadir más secciones o quitar esas
 * predeterminadas»— y, plegado, lo que cuestan el pan y el café.
 *
 * En una hoja y no en la pantalla: se tocan una vez y la pantalla se queda con lo que se
 * mira cada día (poco texto).
 */

export function AjustesDelMenu({
  menu,
  verCostes,
  alCerrar,
}: {
  readonly menu: UnMenu;
  readonly verCostes: boolean;
  readonly alCerrar: () => void;
}) {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const delDia = menu.clase === 'del_dia';
  const postre = menu.secciones.find((s) => s.esPostre);

  const [nombre, setNombre] = useState(menu.nombre);
  const [precio, setPrecio] = useState<Centimos | null>(
    menu.precioCentimos === null ? null : centimos(menu.precioCentimos),
  );
  const [pan, setPan] = useState(menu.entraPan);
  const [cafe, setCafe] = useState(menu.entraCafe);
  const [conPostre, setConPostre] = useState(postre?.incluida ?? false);
  const [dias, setDias] = useState<readonly number[]>(menu.diasQueSeSirve);
  const [panProducto, setPanProducto] = useState(menu.pan?.productoId ?? '');
  const [panRaciones, setPanRaciones] = useState(String(menu.pan?.raciones ?? ''));
  const [cafeProducto, setCafeProducto] = useState(menu.cafe?.productoId ?? '');
  const [cafeRaciones, setCafeRaciones] = useState(String(menu.cafe?.raciones ?? ''));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // El pan y el café, con un producto del Almacén: hace falta poder escribir escandallos.
  const conProductos = verCostes && puedeEditar(permisos, 'app.escandallos');
  const productos = usarLectura<LoQuePuedeLlevar>('lo_que_puede_llevar', {}, conProductos);
  const opciones = (productos.data?.productos ?? []).map((p) => ({ valor: p.id, texto: p.nombre }));

  function loQueEntra(producto: string, raciones: string) {
    const cuantas = Number(raciones);
    if (producto === '') return null;
    return {
      producto_id: producto,
      raciones: Number.isInteger(cuantas) && cuantas > 0 ? cuantas : 1,
    };
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('cambiar_menu', {
      menu_id: menu.id,
      version: menu.version,
      ...(nombre.trim() !== menu.nombre ? { nombre: nombre.trim() } : {}),
      precio_centimos: precio,
      entra_pan: pan,
      entra_cafe: cafe,
      entra_postre: conPostre,
      ...(delDia ? { dias_que_se_sirve: dias } : {}),
      ...(conProductos
        ? {
            pan: loQueEntra(panProducto, panRaciones),
            cafe: loQueEntra(cafeProducto, cafeRaciones),
          }
        : {}),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  async function archivar() {
    setError(null);
    const respuesta = await cliente.ejecutar('archivar_menu', { menu_id: menu.id });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Ajustes · ${menu.nombre}`}
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tono="principal"
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => void guardar()}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {!delDia && (
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value);
            }}
          />
        )}
        <CampoMoneda etiqueta="Precio, con IVA" valor={precio} alCambiar={setPrecio} />

        <div className="flex flex-col gap-e2">
          <p className="text-secundario font-semibold">Qué entra</p>
          <Interruptor etiqueta="¿Entra pan?" puesto={pan} alCambiar={setPan} />
          <Interruptor
            etiqueta="¿Entra café?"
            puesto={cafe}
            alCambiar={setCafe}
            {...(cafe && conPostre ? { ayuda: 'Sale «Postre o café».' } : {})}
          />
          <Interruptor etiqueta="¿Entra postre?" puesto={conPostre} alCambiar={setConPostre} />
        </div>

        {delDia && (
          <fieldset className="flex flex-col gap-e2">
            <legend className="mb-e2 text-secundario font-semibold">Los días que se sirve</legend>
            <div className="flex gap-e1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const puesto = dias.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={puesto}
                    aria-label={NOMBRE_DEL_DIA[d]}
                    onClick={() => {
                      const otros = puesto ? dias.filter((x) => x !== d) : [...dias, d];
                      if (otros.length > 0) setDias(otros.sort((a, b) => a - b));
                    }}
                    className={clases(
                      'flex min-h-toque flex-1 items-center justify-center rounded-mediano border text-secundario font-semibold',
                      puesto
                        ? 'border-transparent bg-[var(--color-app-carta)] text-white'
                        : 'border-borde bg-superficie text-texto-suave',
                    )}
                  >
                    {INICIAL_DEL_DIA[d]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <LasSecciones menu={menu} alFallar={setError} />

        {conProductos && (
          <Plegable
            titulo="Lo que cuestan el pan y el café"
            resumen={
              menu.pan === null && menu.cafe === null
                ? 'Sin decir: cuentan 0 €'
                : [menu.pan?.nombre, menu.cafe?.nombre].filter(Boolean).join(' · ')
            }
          >
            <div className="flex flex-col gap-e3">
              <p className="text-secundario text-texto-suave">
                Elige su producto del Almacén y cuántas raciones da cada uno: una barra da 6, un
                kilo de café da 140.
              </p>
              <Selector
                etiqueta="El pan"
                sinElegir="Sin decir"
                value={panProducto}
                opciones={opciones}
                onChange={(evento) => {
                  setPanProducto(evento.target.value);
                }}
              />
              {panProducto !== '' && (
                <Campo
                  etiqueta="Raciones que da cada uno"
                  inputMode="numeric"
                  value={panRaciones}
                  onChange={(evento) => {
                    setPanRaciones(evento.target.value.replace(/\D/g, ''));
                  }}
                />
              )}
              <Selector
                etiqueta="El café"
                sinElegir="Sin decir"
                value={cafeProducto}
                opciones={opciones}
                onChange={(evento) => {
                  setCafeProducto(evento.target.value);
                }}
              />
              {cafeProducto !== '' && (
                <Campo
                  etiqueta="Raciones que da cada uno"
                  inputMode="numeric"
                  value={cafeRaciones}
                  onChange={(evento) => {
                    setCafeRaciones(evento.target.value.replace(/\D/g, ''));
                  }}
                />
              )}
            </div>
          </Plegable>
        )}

        {!delDia && (
          <Boton tono="peligro" icono={<IconoBorrar size={16} />} onClick={() => void archivar()}>
            Quitar este menú
          </Boton>
        )}
      </div>
    </Hoja>
  );
}

/**
 * Las secciones: cambiarles el nombre, quitarlas, moverlas y añadir una. Cada cosa se
 * guarda al momento: no espera al «Guardar» de arriba.
 */
function LasSecciones({
  menu,
  alFallar,
}: {
  readonly menu: UnMenu;
  readonly alFallar: (error: ErrorDeLaApi | null) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [nueva, setNueva] = useState('');
  const [nombres, setNombres] = useState<Readonly<Record<string, string>>>({});

  async function hacer(comando: string, entrada: Record<string, unknown>) {
    alFallar(null);
    const respuesta = await cliente.ejecutar(comando, entrada);
    if (!respuesta.ok) alFallar(respuesta.error);
    await refrescar();
    return respuesta.ok;
  }

  async function mover(desde: number, hasta: number) {
    const orden = menu.secciones.map((s) => s.id);
    const [quitada] = orden.splice(desde, 1);
    if (quitada === undefined) return;
    orden.splice(hasta, 0, quitada);
    await hacer('ordenar_secciones_de_menu', { menu_id: menu.id, secciones: orden });
  }

  // Las que no van (el postre apagado) se ven, en suave: siguen ahí, con sus platos.
  return (
    <fieldset className="flex flex-col gap-e2">
      <legend className="mb-e2 text-secundario font-semibold">Las secciones</legend>
      {menu.secciones.map((s, i) => (
        <div key={s.id} className="flex items-end gap-e1">
          <div className="min-w-0 flex-1">
            <Campo
              etiqueta={
                s.incluida ? `Sección ${String(i + 1)}` : `Sección ${String(i + 1)} · no entra`
              }
              value={nombres[s.id] ?? s.nombre}
              onChange={(evento) => {
                setNombres({ ...nombres, [s.id]: evento.target.value });
              }}
              onBlur={() => {
                const escrito = (nombres[s.id] ?? s.nombre).trim();
                if (escrito !== '' && escrito !== s.nombre) {
                  void hacer('cambiar_seccion_de_menu', { seccion_id: s.id, nombre: escrito });
                }
              }}
            />
          </div>
          <Boton
            tono="texto"
            tamano="s"
            icono={<IconoFlechaArriba size={16} />}
            aria-label={`Subir ${s.nombre}`}
            disabled={i === 0}
            onClick={() => void mover(i, i - 1)}
          />
          <Boton
            tono="texto"
            tamano="s"
            icono={<IconoFlechaAbajo size={16} />}
            aria-label={`Bajar ${s.nombre}`}
            disabled={i === menu.secciones.length - 1}
            onClick={() => void mover(i, i + 1)}
          />
          <Boton
            tono="texto"
            tamano="s"
            icono={<IconoBorrar size={16} />}
            aria-label={`Quitar ${s.nombre}`}
            onClick={() => void hacer('quitar_seccion_de_menu', { seccion_id: s.id })}
          />
        </div>
      ))}
      <div className="flex items-end gap-e2">
        <div className="min-w-0 flex-1">
          <Campo
            etiqueta="Otra sección"
            placeholder="Para picar, Entrantes…"
            value={nueva}
            onChange={(evento) => {
              setNueva(evento.target.value);
            }}
          />
        </div>
        <Boton
          tono="secundario"
          icono={<IconoAnadir size={16} />}
          disabled={nueva.trim() === ''}
          onClick={() => {
            void hacer('poner_seccion_de_menu', { menu_id: menu.id, nombre: nueva.trim() }).then(
              (bien) => {
                if (bien) setNueva('');
              },
            );
          }}
        >
          Añadir
        </Boton>
      </div>
    </fieldset>
  );
}
