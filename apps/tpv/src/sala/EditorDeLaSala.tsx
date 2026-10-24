import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  COSAS_DE_LA_SALA,
  FORMAS_DE_MESA,
  NOMBRE_DE_LA_COSA,
  NOMBRE_DE_LA_FORMA,
  PLANTILLAS_DE_SALA,
  PLAZAS_DE_UN_TOQUE,
  tamanoDeLaCosa,
  tamanoDeLaMesa,
  unSitioLibre,
  type CosaDeLaSala,
  type FormaDeMesa,
  type Guia,
  enUnidades,
} from '@estook/dominio';
import { Cargando, ErrorEnCristiano, Hoja } from '@estook/ui';
import type { CosaDibujada, ElPlanoParaDibujar } from '../datos/tipos.ts';
import { FalloDeLaSala, usarAcciones, type Resultado } from '../ganchos/usarLaSala.ts';
import { irAlPlano } from '../navegar.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { enderezar, estiloEnElPlano, redondeoDeLaForma } from '../plano/dibujo.tsx';
import {
  alLado,
  estirarHasta,
  girarHasta,
  moverHasta,
  moverVariasHasta,
  type Colocacion,
  type Esquina,
} from './geometria.ts';

/**
 * **Editar sala, en Estook TPV** (T2 · La sala, maqueta 10; Anexo 11.9): el plano se dibuja
 * aquí, **a ojo**, sin un solo número de centímetros.
 *
 *   · **la paleta**: se arrastra a la sala (o se toca, y sale en un hueco libre). La mesa
 *     nueva nace con el número siguiente y su tamaño según sus plazas
 *   · **se estira** desde las esquinas y **se gira** con el asa de arriba, que se queda en
 *     0°, 45° y 90°; **imán y guías** al moverla
 *   · **duplicar**, **elegir varias** y moverlas juntas, **deshacer y rehacer**
 *   · **las salas en pestañas**, «+ Sala», y **plantillas** para empezar
 *   · **se guarda solo, al soltar**, y los demás aparatos lo ven al momento. Mover una mesa
 *     abierta no toca su cuenta; quitarla, no se puede
 *
 * En la caja y en la tablet; en el móvil no («Edita la sala en una tablet o en la caja»).
 */

type Que =
  { readonly tipo: 'mesa'; readonly id: string } | { readonly tipo: 'cosa'; readonly id: string };

type Sala = ElPlanoParaDibujar['salas'][number];
type MesaParaDibujar = Sala['mesas'][number];

/** Lo que se puede deshacer: lo que se hizo y cómo volver atrás, como órdenes de la API. */
interface Paso {
  readonly que: string;
  deshacer: () => Promise<boolean>;
  rehacer: () => Promise<boolean>;
}

type Arrastre =
  | {
      readonly como: 'mover';
      readonly inicioX: number;
      readonly inicioY: number;
      readonly desde: readonly (Colocacion & { readonly que: Que })[];
    }
  | {
      readonly como: 'estirar';
      readonly esquina: Esquina;
      readonly inicioX: number;
      readonly inicioY: number;
      readonly desde: Colocacion & { readonly que: Que };
    }
  | { readonly como: 'girar'; readonly desde: Colocacion & { readonly que: Que } }
  | {
      readonly como: 'nueva';
      readonly cual: FormaDeMesa | CosaDeLaSala;
      readonly x: number;
      readonly y: number;
      readonly dentro: boolean;
    };

const CLAVE = ['sala', 'el_plano_del_local'];

function esLaMisma(a: Que, b: Que): boolean {
  return a.tipo === b.tipo && a.id === b.id;
}

export function EditorDeLaSala() {
  const { cliente, aparato } = usarSesion();
  const ejecutar = usarAcciones();
  const plano = useQuery({
    queryKey: CLAVE,
    queryFn: async () => {
      const respuesta = await cliente.consultar<ElPlanoParaDibujar>('el_plano_del_local');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });

  const [salaElegida, setSalaElegida] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<readonly Que[]>([]);
  const [variasALaVez, setVariasALaVez] = useState(false);
  /** Lo que se está moviendo o se acaba de soltar y aún no ha vuelto de la API. */
  const [puesto, setPuesto] = useState<ReadonlyMap<string, Colocacion>>(new Map());
  const [guias, setGuias] = useState<readonly Guia[]>([]);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [guardando, setGuardando] = useState(0);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [plantillas, setPlantillas] = useState(false);
  const [deshechos, setDeshechos] = useState<readonly Paso[]>([]);
  const [hechos, setHechos] = useState<readonly Paso[]>([]);
  const lienzo = useRef<HTMLDivElement>(null);

  const datos = plano.data;
  const salas = useMemo(() => datos?.salas ?? [], [datos]);
  const sala = salas.find((s) => s.id === salaElegida) ?? salas[0];

  /** Cada orden a la API cuenta para «Guardando…»; lo de la pantalla vuelve a ser lo de la API. */
  const orden = useCallback(
    async <T,>(nombre: string, entrada: unknown): Promise<Resultado<T>> => {
      setGuardando((n) => n + 1);
      setFallo(null);
      const hecho = await ejecutar<T>(nombre, entrada);
      setGuardando((n) => n - 1);
      if (!hecho.ok) setFallo(hecho.error);
      return hecho;
    },
    [ejecutar],
  );

  const apuntar = useCallback((paso: Paso) => {
    setHechos((h) => [...h.slice(-49), paso]);
    setDeshechos([]);
  }, []);

  // Al volver la API, lo puesto de antes ya está en sus datos.
  useEffect(() => {
    setPuesto(new Map());
  }, [datos]);

  const colocacionDe = useCallback(
    (que: Que): (Colocacion & { readonly que: Que }) | null => {
      if (sala === undefined) return null;
      const propio = puesto.get(`${que.tipo}:${que.id}`);
      const base =
        que.tipo === 'mesa'
          ? sala.mesas.find((m) => m.id === que.id)
          : sala.cosas.find((c) => c.id === que.id);
      if (base === undefined) return null;
      const c = propio ?? base;
      return { x: c.x, y: c.y, ancho: c.ancho, fondo: c.fondo, giro: c.giro, que };
    },
    [sala, puesto],
  );

  if (aparato.esPersonal) {
    return <SoloEnLaTablet />;
  }
  if (plano.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="la sala" />
      </main>
    );
  }
  if (datos === undefined) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-e4 bg-fondo p-e5 text-texto">
        {plano.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={plano.error.error} />
        ) : null}
        <BotonSuave onClick={irAlPlano}>Volver a las mesas</BotonSuave>
      </main>
    );
  }

  const medidas = () => {
    const r = lienzo.current?.getBoundingClientRect();
    return r === undefined ? null : { r, lienzo: { ancho: r.width, alto: r.height } };
  };

  const lasCajasDeLasDemas = (sinEstas: readonly Que[]) =>
    sala === undefined
      ? []
      : [
          ...sala.mesas.map((m) => ({ que: { tipo: 'mesa', id: m.id } satisfies Que, caja: m })),
          ...sala.cosas.map((c) => ({ que: { tipo: 'cosa', id: c.id } satisfies Que, caja: c })),
        ]
          .filter((o) => !sinEstas.some((q) => esLaMisma(q, o.que)))
          .map((o) => o.caja);

  // ── Elegir ─────────────────────────────────────────────────────────────────

  function elegir(que: Que, sumando: boolean) {
    if (sumando || variasALaVez) {
      setElegidas((e) =>
        e.some((x) => esLaMisma(x, que)) ? e.filter((x) => !esLaMisma(x, que)) : [...e, que],
      );
    } else {
      setElegidas([que]);
    }
  }

  // ── Arrastrar, estirar y girar ─────────────────────────────────────────────

  function empezarAMover(evento: React.PointerEvent, que: Que) {
    evento.stopPropagation();
    const ya = elegidas.some((e) => esLaMisma(e, que));
    const juntas = ya ? elegidas : [que];
    if (!ya) elegir(que, evento.shiftKey);
    const desde = juntas.map(colocacionDe).filter((c) => c !== null);
    (evento.target as Element).setPointerCapture(evento.pointerId);
    setArrastre({ como: 'mover', inicioX: evento.clientX, inicioY: evento.clientY, desde });
  }

  function empezarAEstirar(evento: React.PointerEvent, que: Que, esquina: Esquina) {
    evento.stopPropagation();
    const desde = colocacionDe(que);
    if (desde === null) return;
    (evento.target as Element).setPointerCapture(evento.pointerId);
    setArrastre({
      como: 'estirar',
      esquina,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      desde,
    });
  }

  function empezarAGirar(evento: React.PointerEvent, que: Que) {
    evento.stopPropagation();
    const desde = colocacionDe(que);
    if (desde === null) return;
    (evento.target as Element).setPointerCapture(evento.pointerId);
    setArrastre({ como: 'girar', desde });
  }

  function alMoverElDedo(evento: React.PointerEvent) {
    if (arrastre === null) return;
    const m = medidas();
    if (m === null) return;
    if (arrastre.como === 'mover') {
      const dx = evento.clientX - arrastre.inicioX;
      const dy = evento.clientY - arrastre.inicioY;
      const nuevo = new Map(puesto);
      if (arrastre.desde.length === 1 && arrastre.desde[0] !== undefined) {
        const una = arrastre.desde[0];
        const { caja, guias: lasDeAhora } = moverHasta(
          m.lienzo,
          una,
          dx,
          dy,
          lasCajasDeLasDemas([una.que]),
        );
        nuevo.set(`${una.que.tipo}:${una.que.id}`, caja);
        setGuias(lasDeAhora);
      } else {
        moverVariasHasta(m.lienzo, arrastre.desde, dx, dy).forEach((c, i) => {
          const de = arrastre.desde[i];
          if (de !== undefined) nuevo.set(`${de.que.tipo}:${de.que.id}`, c);
        });
      }
      setPuesto(nuevo);
    } else if (arrastre.como === 'estirar') {
      const caja = estirarHasta(
        m.lienzo,
        arrastre.desde,
        arrastre.esquina,
        evento.clientX - arrastre.inicioX,
        evento.clientY - arrastre.inicioY,
      );
      setPuesto(new Map(puesto).set(`${arrastre.desde.que.tipo}:${arrastre.desde.que.id}`, caja));
    } else if (arrastre.como === 'girar') {
      const caja = girarHasta(
        m.lienzo,
        arrastre.desde,
        evento.clientX - m.r.left,
        evento.clientY - m.r.top,
      );
      setPuesto(new Map(puesto).set(`${arrastre.desde.que.tipo}:${arrastre.desde.que.id}`, caja));
    } else {
      const dentro =
        evento.clientX >= m.r.left &&
        evento.clientX <= m.r.right &&
        evento.clientY >= m.r.top &&
        evento.clientY <= m.r.bottom;
      setArrastre({ ...arrastre, x: evento.clientX, y: evento.clientY, dentro });
    }
  }

  /** **Al soltar, se guarda**: una orden con todo lo movido, y su paso para deshacerlo. */
  async function alSoltar(evento: React.PointerEvent) {
    const fue = arrastre;
    setArrastre(null);
    setGuias([]);
    if (fue === null) return;
    if (fue.como === 'nueva') {
      const m = medidas();
      if (fue.dentro && m !== null && sala !== undefined) {
        const x = ((evento.clientX - m.r.left) * 1000) / m.lienzo.ancho;
        const y = ((evento.clientY - m.r.top) * 1000) / m.lienzo.alto;
        await poner(fue.cual, { x, y });
      }
      return;
    }
    const antes = fue.como === 'mover' ? fue.desde : [fue.desde];
    const despues = antes
      .map((a) => ({ a, d: puesto.get(`${a.que.tipo}:${a.que.id}`) }))
      .filter((p): p is { a: (typeof antes)[number]; d: Colocacion } => p.d !== undefined);
    const cambiadas = despues.filter(
      ({ a, d }) =>
        a.x !== d.x ||
        a.y !== d.y ||
        a.ancho !== d.ancho ||
        a.fondo !== d.fondo ||
        a.giro !== d.giro,
    );
    if (cambiadas.length === 0) return;
    const conTamano = fue.como === 'estirar';
    const lasColocaciones = (cuales: readonly { que: Que; c: Colocacion }[]) => ({
      cosas: cuales.map(({ que, c }) => ({
        ...(que.tipo === 'mesa' ? { mesa_id: que.id } : { cosa_id: que.id }),
        x: c.x,
        y: c.y,
        ...(conTamano ? { ancho: c.ancho, fondo: c.fondo } : {}),
        giro: c.giro,
      })),
    });
    const haciaDelante = lasColocaciones(cambiadas.map(({ a, d }) => ({ que: a.que, c: d })));
    const hecho = await orden('colocar_en_el_plano', haciaDelante);
    if (!hecho.ok) {
      setPuesto(new Map());
      return;
    }
    const mesasEstiradas = new Map((sala?.mesas ?? []).map((m) => [m.id, m.estirada] as const));
    apuntar({
      que: conTamano ? 'Estirar' : fue.como === 'girar' ? 'Girar' : 'Mover',
      deshacer: async () => {
        let bien = true;
        for (const { a } of cambiadas) {
          const vuelta =
            a.que.tipo === 'mesa'
              ? await orden('cambiar_mesa', {
                  mesa_id: a.que.id,
                  x: a.x,
                  y: a.y,
                  giro: a.giro,
                  ...(conTamano
                    ? mesasEstiradas.get(a.que.id) === true
                      ? { ancho: a.ancho, fondo: a.fondo }
                      : { ancho: null, fondo: null }
                    : {}),
                })
              : await orden('cambiar_cosa_de_la_sala', {
                  cosa_id: a.que.id,
                  x: a.x,
                  y: a.y,
                  ancho: a.ancho,
                  fondo: a.fondo,
                  giro: a.giro,
                });
          bien = bien && vuelta.ok;
        }
        return bien;
      },
      rehacer: async () => (await orden('colocar_en_el_plano', haciaDelante)).ok,
    });
  }

  // ── Poner, duplicar y quitar ───────────────────────────────────────────────

  async function poner(cual: FormaDeMesa | CosaDeLaSala, dondeCae?: { x: number; y: number }) {
    if (sala === undefined) return;
    const esMesa = (FORMAS_DE_MESA as readonly string[]).includes(cual);
    const tamano = esMesa
      ? tamanoDeLaMesa(cual as FormaDeMesa, cual === 'taburete' ? 1 : 4)
      : tamanoDeLaCosa(cual as CosaDeLaSala);
    const sitio =
      dondeCae === undefined
        ? unSitioLibre(tamano, lasCajasDeLasDemas([]))
        : { x: dondeCae.x - tamano.ancho / 2, y: dondeCae.y - tamano.fondo / 2 };
    const x = enUnidades(Math.min(Math.max(sitio.x, 0), 1000 - tamano.ancho));
    const y = enUnidades(Math.min(Math.max(sitio.y, 0), 1000 - tamano.fondo));
    if (esMesa) {
      const entrada = { zona_id: sala.id, forma: cual, x, y };
      const hecho = await orden<{ mesaId: string; nombre: string }>('crear_mesa', entrada);
      if (!hecho.ok) return;
      let id = hecho.datos.mesaId;
      setElegidas([{ tipo: 'mesa', id }]);
      apuntar({
        que: `Poner la mesa ${hecho.datos.nombre}`,
        deshacer: async () => (await orden('archivar_mesa', { mesa_id: id })).ok,
        rehacer: async () => {
          const otra = await orden<{ mesaId: string }>('crear_mesa', {
            ...entrada,
            nombre: hecho.datos.nombre,
          });
          if (otra.ok) id = otra.datos.mesaId;
          return otra.ok;
        },
      });
    } else {
      const entrada = { zona_id: sala.id, tipo: cual, x, y };
      const hecho = await orden<{ cosaId: string }>('crear_cosa_de_la_sala', entrada);
      if (!hecho.ok) return;
      let id = hecho.datos.cosaId;
      setElegidas([{ tipo: 'cosa', id }]);
      apuntar({
        que: `Poner ${NOMBRE_DE_LA_COSA[cual as CosaDeLaSala].toLowerCase()}`,
        deshacer: async () => (await orden('quitar_cosa_de_la_sala', { cosa_id: id })).ok,
        rehacer: async () => {
          const otra = await orden<{ cosaId: string }>('crear_cosa_de_la_sala', entrada);
          if (otra.ok) id = otra.datos.cosaId;
          return otra.ok;
        },
      });
    }
  }

  async function duplicar(que: Que) {
    if (sala === undefined) return;
    if (que.tipo === 'mesa') {
      const mesa = sala.mesas.find((m) => m.id === que.id);
      if (mesa === undefined) return;
      const entrada = {
        zona_id: sala.id,
        forma: mesa.forma,
        plazas: mesa.plazas,
        ...alLado(mesa),
        ...(mesa.estirada ? { ancho: mesa.ancho, fondo: mesa.fondo } : {}),
        giro: mesa.giro,
      };
      const hecho = await orden<{ mesaId: string; nombre: string }>('crear_mesa', entrada);
      if (!hecho.ok) return;
      let id = hecho.datos.mesaId;
      setElegidas([{ tipo: 'mesa', id }]);
      apuntar({
        que: `Duplicar la mesa ${mesa.nombre}`,
        deshacer: async () => (await orden('archivar_mesa', { mesa_id: id })).ok,
        rehacer: async () => {
          const otra = await orden<{ mesaId: string }>('crear_mesa', {
            ...entrada,
            nombre: hecho.datos.nombre,
          });
          if (otra.ok) id = otra.datos.mesaId;
          return otra.ok;
        },
      });
    } else {
      const laCosa = sala.cosas.find((c) => c.id === que.id);
      if (laCosa === undefined) return;
      const entrada = {
        zona_id: sala.id,
        tipo: laCosa.tipo,
        ...alLado(laCosa),
        ancho: laCosa.ancho,
        fondo: laCosa.fondo,
        giro: laCosa.giro,
        ...(laCosa.texto === null ? {} : { texto: laCosa.texto }),
      };
      const hecho = await orden<{ cosaId: string }>('crear_cosa_de_la_sala', entrada);
      if (!hecho.ok) return;
      let id = hecho.datos.cosaId;
      setElegidas([{ tipo: 'cosa', id }]);
      apuntar({
        que: 'Duplicar',
        deshacer: async () => (await orden('quitar_cosa_de_la_sala', { cosa_id: id })).ok,
        rehacer: async () => {
          const otra = await orden<{ cosaId: string }>('crear_cosa_de_la_sala', entrada);
          if (otra.ok) id = otra.datos.cosaId;
          return otra.ok;
        },
      });
    }
  }

  async function quitar(cuales: readonly Que[]) {
    if (sala === undefined) return;
    for (const que of cuales) {
      if (que.tipo === 'mesa') {
        const mesa = sala.mesas.find((m) => m.id === que.id);
        if (mesa === undefined || mesa.abierta) continue;
        const hecho = await orden('archivar_mesa', { mesa_id: mesa.id });
        if (!hecho.ok) continue;
        const entrada = {
          zona_id: sala.id,
          nombre: mesa.nombre,
          forma: mesa.forma,
          plazas: mesa.plazas,
          x: mesa.x,
          y: mesa.y,
          ...(mesa.estirada ? { ancho: mesa.ancho, fondo: mesa.fondo } : {}),
          giro: mesa.giro,
        };
        let id = mesa.id;
        apuntar({
          que: `Quitar la mesa ${mesa.nombre}`,
          deshacer: async () => {
            const otra = await orden<{ mesaId: string }>('crear_mesa', entrada);
            if (otra.ok) id = otra.datos.mesaId;
            return otra.ok;
          },
          rehacer: async () => (await orden('archivar_mesa', { mesa_id: id })).ok,
        });
      } else {
        const laCosa = sala.cosas.find((c) => c.id === que.id);
        if (laCosa === undefined) continue;
        const hecho = await orden('quitar_cosa_de_la_sala', { cosa_id: laCosa.id });
        if (!hecho.ok) continue;
        const entrada = {
          zona_id: sala.id,
          tipo: laCosa.tipo,
          x: laCosa.x,
          y: laCosa.y,
          ancho: laCosa.ancho,
          fondo: laCosa.fondo,
          giro: laCosa.giro,
          ...(laCosa.texto === null ? {} : { texto: laCosa.texto }),
        };
        let id = laCosa.id;
        apuntar({
          que: `Quitar ${NOMBRE_DE_LA_COSA[laCosa.tipo].toLowerCase()}`,
          deshacer: async () => {
            const otra = await orden<{ cosaId: string }>('crear_cosa_de_la_sala', entrada);
            if (otra.ok) id = otra.datos.cosaId;
            return otra.ok;
          },
          rehacer: async () => (await orden('quitar_cosa_de_la_sala', { cosa_id: id })).ok,
        });
      }
    }
    setElegidas([]);
  }

  /** Lo que cambia en el panel de la derecha: el nombre, las plazas, la forma, el giro. */
  async function cambiarLaMesa(mesa: MesaParaDibujar, cambios: Record<string, unknown>) {
    const antes: Record<string, unknown> = {};
    for (const clave of Object.keys(cambios)) {
      if (clave === 'ancho' || clave === 'fondo') {
        antes[clave] = mesa.estirada ? mesa[clave] : null;
      } else {
        antes[clave] = mesa[clave as keyof MesaParaDibujar];
      }
    }
    // Las plazas y la forma cambian el tamaño: deshacer lo devuelve como estaba.
    if (('plazas' in cambios || 'forma' in cambios) && mesa.estirada) {
      antes['ancho'] = mesa.ancho;
      antes['fondo'] = mesa.fondo;
    }
    const hecho = await orden('cambiar_mesa', { mesa_id: mesa.id, ...cambios });
    if (!hecho.ok) return;
    apuntar({
      que: `Cambiar la mesa ${mesa.nombre}`,
      deshacer: async () => (await orden('cambiar_mesa', { mesa_id: mesa.id, ...antes })).ok,
      rehacer: async () => (await orden('cambiar_mesa', { mesa_id: mesa.id, ...cambios })).ok,
    });
  }

  async function cambiarLaCosa(laCosa: CosaDibujada, cambios: Record<string, unknown>) {
    const antes = Object.fromEntries(
      Object.keys(cambios).map((k) => [k, laCosa[k as keyof CosaDibujada]]),
    );
    const hecho = await orden('cambiar_cosa_de_la_sala', { cosa_id: laCosa.id, ...cambios });
    if (!hecho.ok) return;
    apuntar({
      que: 'Cambiar',
      deshacer: async () =>
        (await orden('cambiar_cosa_de_la_sala', { cosa_id: laCosa.id, ...antes })).ok,
      rehacer: async () =>
        (await orden('cambiar_cosa_de_la_sala', { cosa_id: laCosa.id, ...cambios })).ok,
    });
  }

  async function deshacer() {
    const paso = hechos.at(-1);
    if (paso === undefined) return;
    if (await paso.deshacer()) {
      setHechos((h) => h.slice(0, -1));
      setDeshechos((d) => [...d, paso]);
      setElegidas([]);
    }
  }

  async function rehacer() {
    const paso = deshechos.at(-1);
    if (paso === undefined) return;
    if (await paso.rehacer()) {
      setDeshechos((d) => d.slice(0, -1));
      setHechos((h) => [...h, paso]);
      setElegidas([]);
    }
  }

  // ── Las salas ──────────────────────────────────────────────────────────────

  async function nuevaSala() {
    const nombres = new Set(salas.map((s) => s.nombre.toLowerCase()));
    let nombre = 'Sala nueva';
    for (let n = 2; nombres.has(nombre.toLowerCase()); n++) nombre = `Sala nueva ${String(n)}`;
    const hecho = await orden<{ zonaId: string }>('crear_zona_de_sala', { nombre });
    if (hecho.ok) {
      setSalaElegida(hecho.datos.zonaId);
      setElegidas([]);
    }
  }

  async function moverLaSala(cuanto: -1 | 1) {
    if (sala === undefined) return;
    const ids = salas.map((s) => s.id);
    const donde = ids.indexOf(sala.id);
    const otra = donde + cuanto;
    if (otra < 0 || otra >= ids.length) return;
    [ids[donde], ids[otra]] = [ids[otra] as string, ids[donde] as string];
    await orden('ordenar_las_salas', { zonas: ids });
  }

  async function conPlantilla(clave: string) {
    setPlantillas(false);
    const hecho = await orden<{ zonaId: string }>('empezar_con_una_plantilla', {
      plantilla: clave,
    });
    if (hecho.ok) {
      setSalaElegida(hecho.datos.zonaId);
      setElegidas([]);
    }
  }

  // ── Lo que se pinta ────────────────────────────────────────────────────────

  const unaSola = elegidas.length === 1 ? elegidas[0] : undefined;
  const mesaElegida =
    unaSola?.tipo === 'mesa' ? sala?.mesas.find((m) => m.id === unaSola.id) : undefined;
  const cosaElegida =
    unaSola?.tipo === 'cosa' ? sala?.cosas.find((c) => c.id === unaSola.id) : undefined;

  return (
    <>
      {/* En una pantalla pequeña no se dibuja: no cabe el plano para el dedo. */}
      <div className="md:hidden">
        <SoloEnLaTablet />
      </div>
      <div
        className="hidden h-dvh flex-col bg-fondo text-texto md:flex"
        onPointerMove={alMoverElDedo}
        onPointerUp={(e) => void alSoltar(e)}
        onKeyDown={(e) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && elegidas.length > 0) {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            void quitar(elegidas);
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') void deshacer();
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') void rehacer();
        }}
        tabIndex={-1}
      >
        {/* Arriba: las salas en pestañas, lo guardado, las plantillas y «Listo». */}
        <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e3">
          <h1 className="text-pantalla font-bold">Editar sala</h1>
          <nav aria-label="Las salas" className="flex min-w-0 flex-1 gap-e1 overflow-x-auto">
            {salas.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === sala?.id}
                onClick={() => {
                  setSalaElegida(s.id);
                  setElegidas([]);
                }}
                className={[
                  'min-h-toque shrink-0 rounded-redondo px-e4 font-semibold',
                  s.id === sala?.id ? 'bg-charcoal' : 'text-texto-suave',
                ].join(' ')}
              >
                {s.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void nuevaSala()}
              className="min-h-toque shrink-0 rounded-redondo border-2 border-dashed border-borde px-e4 font-semibold"
            >
              + Sala
            </button>
          </nav>
          <span role="status" className="text-secundario font-semibold text-texto-suave">
            {guardando > 0 ? 'Guardando…' : '✓ Guardado'}
          </span>
          <BotonSuave onClick={() => void deshacer()} desactivado={hechos.length === 0}>
            Deshacer
          </BotonSuave>
          <BotonSuave onClick={() => void rehacer()} desactivado={deshechos.length === 0}>
            Rehacer
          </BotonSuave>
          <BotonSuave
            onClick={() => {
              setPlantillas(true);
            }}
          >
            Plantillas
          </BotonSuave>
          <button
            type="button"
            onClick={irAlPlano}
            className="min-h-toque-cocina rounded-grande bg-naranja px-e6 font-bold text-sobre-naranja"
          >
            Listo
          </button>
        </header>

        {fallo !== null && (
          <div className="px-e4 pt-e3">
            <ErrorEnCristiano error={fallo} />
          </div>
        )}

        {sala === undefined ? (
          <main className="flex flex-1 flex-col items-center justify-center gap-e4 p-e5 text-center">
            <h2 className="text-cifra-media font-bold">Empieza tu sala</h2>
            <p className="max-w-[32rem] text-cuerpo text-texto-suave">
              Con una plantilla de tu tipo de local, que luego se ajusta con el dedo, o con la sala
              vacía.
            </p>
            <LasPlantillas alElegir={(clave) => void conPlantilla(clave)} />
            <BotonSuave onClick={() => void nuevaSala()}>Empezar con la sala vacía</BotonSuave>
          </main>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* La paleta: lo que se abre y lo que no. */}
            <aside className="flex w-[11rem] shrink-0 flex-col gap-e3 overflow-y-auto border-r border-borde bg-superficie p-e3">
              <LaPaleta
                titulo="Mesas"
                cosas={FORMAS_DE_MESA.map((f) => ({ cual: f, nombre: NOMBRE_DE_LA_FORMA[f] }))}
                alEmpezar={(cual, e) => {
                  setArrastre({ como: 'nueva', cual, x: e.clientX, y: e.clientY, dentro: false });
                }}
                alTocar={(cual) => void poner(cual)}
              />
              <LaPaleta
                titulo="La sala"
                cosas={COSAS_DE_LA_SALA.map((c) => ({ cual: c, nombre: NOMBRE_DE_LA_COSA[c] }))}
                alEmpezar={(cual, e) => {
                  setArrastre({ como: 'nueva', cual, x: e.clientX, y: e.clientY, dentro: false });
                }}
                alTocar={(cual) => void poner(cual)}
              />
              <p className="text-etiqueta text-texto-tenue">
                Arrastra a la sala, o tócalo y sale en un hueco. Tira de los puntos para el tamaño;
                el redondo de arriba gira. Se guarda solo.
              </p>
            </aside>

            {/* La sala. */}
            <main className="flex min-w-0 flex-1 flex-col gap-e3 p-e4">
              <div className="flex flex-wrap items-center gap-e2">
                <BotonSuave
                  onClick={() => {
                    setVariasALaVez(!variasALaVez);
                    if (variasALaVez) setElegidas([]);
                  }}
                  puesto={variasALaVez}
                >
                  {variasALaVez ? `Elegir varias · ${String(elegidas.length)}` : 'Elegir varias'}
                </BotonSuave>
                {elegidas.length > 1 && (
                  <BotonSuave onClick={() => void quitar(elegidas)}>Quitar las elegidas</BotonSuave>
                )}
              </div>
              <div
                ref={lienzo}
                aria-label={`La sala ${sala.nombre}`}
                onPointerDown={() => {
                  setElegidas([]);
                }}
                className="relative aspect-[16/10] w-full touch-none overflow-hidden rounded-mayor bg-superficie shadow-s2 [background-image:radial-gradient(var(--color-borde)_1px,transparent_1px)] [background-size:2%_3.2%]"
              >
                {sala.cosas.map((c) => {
                  const que: Que = { tipo: 'cosa', id: c.id };
                  const caja = colocacionDe(que) ?? c;
                  return (
                    <Pieza
                      key={c.id}
                      caja={caja}
                      redondeo={COMO_SE_VE_LA_COSA[c.tipo]}
                      etiqueta={
                        c.tipo === 'texto' ? (c.texto ?? 'Texto') : NOMBRE_DE_LA_COSA[c.tipo]
                      }
                      elegida={elegidas.some((e) => esLaMisma(e, que))}
                      sola={unaSola !== undefined && esLaMisma(unaSola, que)}
                      alEmpezar={(e) => {
                        empezarAMover(e, que);
                      }}
                      alEstirar={(e, esquina) => {
                        empezarAEstirar(e, que, esquina);
                      }}
                      alGirar={(e) => {
                        empezarAGirar(e, que);
                      }}
                    >
                      {(c.tipo === 'barra' || c.tipo === 'texto') && (
                        <span
                          style={enderezar(caja.giro)}
                          className="truncate px-e1 text-etiqueta font-bold uppercase tracking-[0.12em] text-texto-tenue"
                        >
                          {c.tipo === 'barra' ? 'Barra' : (c.texto ?? 'Texto')}
                        </span>
                      )}
                    </Pieza>
                  );
                })}
                {sala.mesas.map((m) => {
                  const que: Que = { tipo: 'mesa', id: m.id };
                  const caja = colocacionDe(que) ?? m;
                  return (
                    <Pieza
                      key={m.id}
                      caja={caja}
                      redondeo={`border-2 ${m.abierta ? 'border-bien bg-bien-suave' : 'border-borde-fuerte bg-charcoal'} ${redondeoDeLaForma(m.forma)}`}
                      etiqueta={`Mesa ${m.nombre}`}
                      elegida={elegidas.some((e) => esLaMisma(e, que))}
                      sola={unaSola !== undefined && esLaMisma(unaSola, que)}
                      alEmpezar={(e) => {
                        empezarAMover(e, que);
                      }}
                      alEstirar={(e, esquina) => {
                        empezarAEstirar(e, que, esquina);
                      }}
                      alGirar={(e) => {
                        empezarAGirar(e, que);
                      }}
                    >
                      <span
                        style={enderezar(caja.giro)}
                        className="flex flex-col items-center leading-none"
                      >
                        <span className="text-seccion font-bold">{m.nombre}</span>
                        {m.forma !== 'taburete' && (
                          <span className="text-etiqueta text-texto-tenue">{m.plazas} pl.</span>
                        )}
                      </span>
                    </Pieza>
                  );
                })}
                {guias.map((g) => (
                  <span
                    key={`${g.eje}-${String(g.en)}`}
                    aria-hidden="true"
                    className={[
                      'pointer-events-none absolute bg-naranja',
                      g.eje === 'x' ? 'top-0 h-full w-[2px]' : 'left-0 h-[2px] w-full',
                    ].join(' ')}
                    style={
                      g.eje === 'x'
                        ? { left: `${String(g.en / 10)}%` }
                        : { top: `${String(g.en / 10)}%` }
                    }
                  />
                ))}
              </div>
            </main>

            {/* A la derecha: lo elegido, o la sala. */}
            <aside className="w-[18rem] shrink-0 overflow-y-auto border-l border-borde bg-superficie p-e4">
              {mesaElegida !== undefined ? (
                <PanelDeLaMesa
                  key={mesaElegida.id}
                  mesa={mesaElegida}
                  alCambiar={(cambios) => void cambiarLaMesa(mesaElegida, cambios)}
                  alDuplicar={() => void duplicar({ tipo: 'mesa', id: mesaElegida.id })}
                  alQuitar={() => void quitar([{ tipo: 'mesa', id: mesaElegida.id }])}
                />
              ) : cosaElegida !== undefined ? (
                <PanelDeLaCosa
                  key={cosaElegida.id}
                  cosa={cosaElegida}
                  alCambiar={(cambios) => void cambiarLaCosa(cosaElegida, cambios)}
                  alDuplicar={() => void duplicar({ tipo: 'cosa', id: cosaElegida.id })}
                  alQuitar={() => void quitar([{ tipo: 'cosa', id: cosaElegida.id }])}
                />
              ) : (
                <PanelDeLaSala
                  key={sala.id}
                  sala={sala}
                  esLaPrimera={salas[0]?.id === sala.id}
                  esLaUltima={salas.at(-1)?.id === sala.id}
                  alRenombrar={(nombre) =>
                    void orden('cambiar_zona_de_sala', { zona_id: sala.id, nombre })
                  }
                  alMover={(cuanto) => void moverLaSala(cuanto)}
                  alQuitar={() =>
                    void orden('archivar_zona_de_sala', { zona_id: sala.id }).then((hecho) => {
                      if (hecho.ok) setSalaElegida(null);
                    })
                  }
                />
              )}
            </aside>
          </div>
        )}

        {/* Lo que se arrastra desde la paleta, debajo del dedo. */}
        {arrastre?.como === 'nueva' && (
          <span
            aria-hidden="true"
            style={{ left: arrastre.x - 28, top: arrastre.y - 28 }}
            className="pointer-events-none fixed z-50 flex size-14 items-center justify-center rounded-grande border-2 border-naranja bg-charcoal text-etiqueta font-bold"
          >
            {(FORMAS_DE_MESA as readonly string[]).includes(arrastre.cual)
              ? NOMBRE_DE_LA_FORMA[arrastre.cual as FormaDeMesa]
              : NOMBRE_DE_LA_COSA[arrastre.cual as CosaDeLaSala]}
          </span>
        )}

        {plantillas && (
          <Hoja
            abierta
            titulo="Empezar con una plantilla"
            alCerrar={() => {
              setPlantillas(false);
            }}
          >
            <p className="mb-e4 text-cuerpo text-texto-suave">
              Sale en una sala nueva, con sus mesas numeradas detrás de las que ya tienes. Luego se
              ajusta con el dedo.
            </p>
            <LasPlantillas alElegir={(clave) => void conPlantilla(clave)} />
          </Hoja>
        )}
      </div>
    </>
  );
}

const COMO_SE_VE_LA_COSA: Readonly<Record<CosaDeLaSala, string>> = {
  barra: 'rounded-medio border-2 border-borde-fuerte bg-charcoal',
  pared: 'rounded-[2px] bg-borde-fuerte',
  columna: 'rounded-[3px] bg-borde-fuerte',
  puerta: 'rounded-t-redondo border-2 border-dashed border-borde-fuerte',
  planta: 'rounded-redondo border-2 border-bien bg-bien-suave',
  texto: 'border border-dashed border-borde',
};

/** Una pieza de la sala en el editor: se arrastra, y si es la única elegida, se estira y gira. */
function Pieza({
  caja,
  redondeo,
  etiqueta,
  elegida,
  sola,
  alEmpezar,
  alEstirar,
  alGirar,
  children,
}: {
  readonly caja: Colocacion;
  readonly redondeo: string;
  readonly etiqueta: string;
  readonly elegida: boolean;
  readonly sola: boolean;
  readonly alEmpezar: (e: React.PointerEvent) => void;
  readonly alEstirar: (e: React.PointerEvent, esquina: Esquina) => void;
  readonly alGirar: (e: React.PointerEvent) => void;
  readonly children?: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={etiqueta}
      aria-pressed={elegida}
      style={estiloEnElPlano(caja)}
      onPointerDown={alEmpezar}
      className={[
        'absolute flex cursor-grab touch-none select-none items-center justify-center overflow-visible',
        redondeo,
        elegida ? 'outline outline-[3px] outline-offset-2 outline-naranja' : '',
      ].join(' ')}
    >
      {children}
      {sola && (
        <>
          {(['no', 'ne', 'so', 'se'] as const).map((esquina) => (
            <span
              key={esquina}
              role="button"
              aria-label={`Estirar desde la esquina ${NOMBRE_DE_LA_ESQUINA[esquina]}`}
              onPointerDown={(e) => {
                alEstirar(e, esquina);
              }}
              className={[
                'absolute size-5 rounded-redondo border-2 border-fondo bg-naranja',
                esquina === 'no' ? '-left-2.5 -top-2.5 cursor-nwse-resize' : '',
                esquina === 'ne' ? '-right-2.5 -top-2.5 cursor-nesw-resize' : '',
                esquina === 'so' ? '-bottom-2.5 -left-2.5 cursor-nesw-resize' : '',
                esquina === 'se' ? '-bottom-2.5 -right-2.5 cursor-nwse-resize' : '',
              ].join(' ')}
            />
          ))}
          <span
            role="button"
            aria-label="Girar"
            onPointerDown={alGirar}
            className="absolute -top-9 left-1/2 size-6 -translate-x-1/2 cursor-grab rounded-redondo border-2 border-naranja bg-fondo"
          />
        </>
      )}
    </div>
  );
}

const NOMBRE_DE_LA_ESQUINA: Readonly<Record<Esquina, string>> = {
  no: 'de arriba a la izquierda',
  ne: 'de arriba a la derecha',
  so: 'de abajo a la izquierda',
  se: 'de abajo a la derecha',
};

function LaPaleta<T extends FormaDeMesa | CosaDeLaSala>({
  titulo,
  cosas,
  alEmpezar,
  alTocar,
}: {
  readonly titulo: string;
  readonly cosas: readonly { readonly cual: T; readonly nombre: string }[];
  readonly alEmpezar: (cual: T, e: React.PointerEvent) => void;
  readonly alTocar: (cual: T) => void;
}) {
  // Un toque pone la pieza en un hueco; arrastrarla, donde se suelte.
  const empezo = useRef<{ x: number; y: number; cual: T } | null>(null);
  return (
    <section className="flex flex-col gap-e2">
      <h2 className="text-etiqueta font-bold uppercase tracking-[0.12em] text-texto-tenue">
        {titulo}
      </h2>
      <div className="grid grid-cols-2 gap-e2">
        {cosas.map((c) => (
          <button
            key={c.cual}
            type="button"
            aria-label={`Poner ${c.nombre.toLowerCase()}`}
            onPointerDown={(e) => {
              empezo.current = { x: e.clientX, y: e.clientY, cual: c.cual };
            }}
            onPointerMove={(e) => {
              const inicio = empezo.current;
              if (inicio === null) return;
              if (Math.abs(e.clientX - inicio.x) + Math.abs(e.clientY - inicio.y) > 12) {
                empezo.current = null;
                alEmpezar(c.cual, e);
              }
            }}
            onClick={() => {
              if (empezo.current !== null) alTocar(c.cual);
              empezo.current = null;
            }}
            className="flex min-h-toque-cocina touch-none flex-col items-center justify-center rounded-grande bg-charcoal p-e1 text-etiqueta font-semibold"
          >
            {c.nombre}
          </button>
        ))}
      </div>
    </section>
  );
}

function PanelDeLaMesa({
  mesa,
  alCambiar,
  alDuplicar,
  alQuitar,
}: {
  readonly mesa: MesaParaDibujar;
  readonly alCambiar: (cambios: Record<string, unknown>) => void;
  readonly alDuplicar: () => void;
  readonly alQuitar: () => void;
}) {
  const [nombre, setNombre] = useState(mesa.nombre);
  const giroDeUnToque = [0, 45, 90].includes(mesa.giro);
  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">Mesa {mesa.nombre}</h2>
      <label className="flex flex-col gap-e1">
        <span className="text-secundario font-semibold text-texto-tenue">Nombre</span>
        <input
          value={nombre}
          maxLength={20}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
          onBlur={() => {
            if (nombre.trim() !== '' && nombre.trim() !== mesa.nombre)
              alCambiar({ nombre: nombre.trim() });
          }}
          className="min-h-toque rounded-grande border-2 border-borde bg-fondo px-e3 text-seccion font-semibold"
        />
      </label>
      {mesa.forma !== 'taburete' && (
        <div className="flex flex-col gap-e2">
          <span className="text-secundario font-semibold text-texto-tenue">Plazas</span>
          <div className="flex items-center gap-e2">
            <BotonSuave
              onClick={() => {
                alCambiar({ plazas: Math.max(1, mesa.plazas - 1) });
              }}
              desactivado={mesa.plazas <= 1}
              etiqueta="Una plaza menos"
            >
              −
            </BotonSuave>
            <span className="min-w-[2.5rem] text-center text-cifra-media font-bold tabular-nums">
              {mesa.plazas}
            </span>
            <BotonSuave
              onClick={() => {
                alCambiar({ plazas: Math.min(50, mesa.plazas + 1) });
              }}
              etiqueta="Una plaza más"
            >
              +
            </BotonSuave>
          </div>
          <div role="radiogroup" aria-label="Plazas de un toque" className="flex flex-wrap gap-e1">
            {PLAZAS_DE_UN_TOQUE.map((p) => (
              <BotonSuave
                key={p}
                radio
                puesto={mesa.plazas === p}
                onClick={() => {
                  alCambiar({ plazas: p });
                }}
              >
                {p}
              </BotonSuave>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-e2">
        <span className="text-secundario font-semibold text-texto-tenue">Forma</span>
        <div role="radiogroup" aria-label="Forma" className="grid grid-cols-2 gap-e1">
          {FORMAS_DE_MESA.map((f) => (
            <BotonSuave
              key={f}
              radio
              puesto={mesa.forma === f}
              onClick={() => {
                alCambiar({ forma: f });
              }}
            >
              {NOMBRE_DE_LA_FORMA[f]}
            </BotonSuave>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-e1">
        <span className="text-secundario font-semibold text-texto-tenue">Tamaño, a ojo</span>
        <span className="text-secundario text-texto-suave">
          Crece sola con sus plazas. Para afinar, tira de los puntos de las esquinas.
        </span>
        {mesa.estirada && (
          <BotonSuave
            onClick={() => {
              alCambiar({ ancho: null, fondo: null });
            }}
          >
            Volver al tamaño de {mesa.plazas} {mesa.plazas === 1 ? 'plaza' : 'plazas'}
          </BotonSuave>
        )}
      </div>
      <LosGiros
        giro={mesa.giro}
        libre={!giroDeUnToque}
        alGirar={(giro) => {
          alCambiar({ giro });
        }}
      />
      <div className="flex gap-e2">
        <BotonSuave onClick={alDuplicar}>Duplicar</BotonSuave>
        <BotonSuave onClick={alQuitar} desactivado={mesa.abierta}>
          Quitar
        </BotonSuave>
      </div>
      {mesa.abierta && (
        <p className="text-secundario text-texto-suave">
          Está abierta: se puede mover sin tocar su cuenta, pero no quitar hasta que se libere.
        </p>
      )}
    </div>
  );
}

function PanelDeLaCosa({
  cosa,
  alCambiar,
  alDuplicar,
  alQuitar,
}: {
  readonly cosa: CosaDibujada;
  readonly alCambiar: (cambios: Record<string, unknown>) => void;
  readonly alDuplicar: () => void;
  readonly alQuitar: () => void;
}) {
  const [texto, setTexto] = useState(cosa.texto ?? '');
  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">{NOMBRE_DE_LA_COSA[cosa.tipo]}</h2>
      {cosa.tipo === 'texto' && (
        <label className="flex flex-col gap-e1">
          <span className="text-secundario font-semibold text-texto-tenue">Lo que pone</span>
          <input
            value={texto}
            maxLength={40}
            onChange={(e) => {
              setTexto(e.target.value);
            }}
            onBlur={() => {
              if (texto.trim() !== '' && texto.trim() !== cosa.texto)
                alCambiar({ texto: texto.trim() });
            }}
            className="min-h-toque rounded-grande border-2 border-borde bg-fondo px-e3 text-seccion font-semibold"
          />
        </label>
      )}
      <p className="text-secundario text-texto-suave">
        {cosa.tipo === 'pared' || cosa.tipo === 'barra'
          ? 'Tira de los extremos para alargarla.'
          : 'Tira de los puntos de las esquinas para el tamaño.'}{' '}
        No se abre: es la sala.
      </p>
      <LosGiros
        giro={cosa.giro}
        libre={![0, 45, 90].includes(cosa.giro)}
        alGirar={(giro) => {
          alCambiar({ giro });
        }}
      />
      <div className="flex gap-e2">
        <BotonSuave onClick={alDuplicar}>Duplicar</BotonSuave>
        <BotonSuave onClick={alQuitar}>Quitar</BotonSuave>
      </div>
    </div>
  );
}

function PanelDeLaSala({
  sala,
  esLaPrimera,
  esLaUltima,
  alRenombrar,
  alMover,
  alQuitar,
}: {
  readonly sala: Sala;
  readonly esLaPrimera: boolean;
  readonly esLaUltima: boolean;
  readonly alRenombrar: (nombre: string) => void;
  readonly alMover: (cuanto: -1 | 1) => void;
  readonly alQuitar: () => void;
}) {
  const [nombre, setNombre] = useState(sala.nombre);
  const [seguro, setSeguro] = useState(false);
  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">La sala</h2>
      <p className="text-secundario text-texto-suave">
        Toca una mesa o algo de la sala para cambiarlo. {sala.mesas.length}{' '}
        {sala.mesas.length === 1 ? 'mesa' : 'mesas'}.
      </p>
      <label className="flex flex-col gap-e1">
        <span className="text-secundario font-semibold text-texto-tenue">Cómo se llama</span>
        <input
          value={nombre}
          maxLength={40}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
          onBlur={() => {
            if (nombre.trim() !== '' && nombre.trim() !== sala.nombre) alRenombrar(nombre.trim());
          }}
          className="min-h-toque rounded-grande border-2 border-borde bg-fondo px-e3 text-seccion font-semibold"
        />
      </label>
      <div className="flex flex-col gap-e1">
        <span className="text-secundario font-semibold text-texto-tenue">
          Su sitio en las pestañas
        </span>
        <div className="flex gap-e2">
          <BotonSuave
            onClick={() => {
              alMover(-1);
            }}
            desactivado={esLaPrimera}
          >
            ‹ Antes
          </BotonSuave>
          <BotonSuave
            onClick={() => {
              alMover(1);
            }}
            desactivado={esLaUltima}
          >
            Después ›
          </BotonSuave>
        </div>
      </div>
      {sala.conAlgoAbierto ? (
        <p className="text-secundario text-texto-suave">
          Tiene mesas abiertas: no se quita hasta que se liberen.
        </p>
      ) : seguro ? (
        <div className="flex flex-col gap-e2">
          <span className="text-cuerpo font-semibold">¿Quitar {sala.nombre} con todo lo suyo?</span>
          <div className="flex gap-e2">
            <BotonSuave onClick={alQuitar}>Sí, quitarla</BotonSuave>
            <BotonSuave
              onClick={() => {
                setSeguro(false);
              }}
            >
              No
            </BotonSuave>
          </div>
        </div>
      ) : (
        <BotonSuave
          onClick={() => {
            setSeguro(true);
          }}
        >
          Quitar la sala
        </BotonSuave>
      )}
    </div>
  );
}

function LosGiros({
  giro,
  libre,
  alGirar,
}: {
  readonly giro: number;
  readonly libre: boolean;
  readonly alGirar: (giro: number) => void;
}) {
  return (
    <div className="flex flex-col gap-e2">
      <span className="text-secundario font-semibold text-texto-tenue">Giro</span>
      <div role="radiogroup" aria-label="Giro" className="flex flex-wrap gap-e1">
        {[0, 45, 90].map((g) => (
          <BotonSuave
            key={g}
            radio
            puesto={giro === g}
            onClick={() => {
              alGirar(g);
            }}
          >
            {g}°
          </BotonSuave>
        ))}
        <BotonSuave radio puesto={libre} onClick={() => undefined} desactivado={!libre}>
          {libre ? `Libre · ${String(giro)}°` : 'Libre'}
        </BotonSuave>
      </div>
      <span className="text-etiqueta text-texto-tenue">Libre: con el asa redonda de arriba.</span>
    </div>
  );
}

function LasPlantillas({ alElegir }: { readonly alElegir: (clave: string) => void }) {
  return (
    <div className="grid w-full max-w-[44rem] gap-e3 sm:grid-cols-3">
      {PLANTILLAS_DE_SALA.map((p) => (
        <button
          key={p.clave}
          type="button"
          onClick={() => {
            alElegir(p.clave);
          }}
          className="flex flex-col gap-e1 rounded-mayor border-2 border-borde bg-superficie p-e4 text-left"
        >
          <span className="text-seccion font-bold">{p.nombre}</span>
          <span className="text-secundario text-texto-suave">{p.frase}</span>
        </button>
      ))}
    </div>
  );
}

function BotonSuave({
  onClick,
  children,
  desactivado = false,
  puesto,
  radio = false,
  etiqueta,
}: {
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly desactivado?: boolean;
  readonly puesto?: boolean;
  readonly radio?: boolean;
  readonly etiqueta?: string;
}) {
  return (
    <button
      type="button"
      disabled={desactivado}
      onClick={onClick}
      aria-label={etiqueta}
      {...(radio
        ? { role: 'radio', 'aria-checked': puesto === true }
        : puesto === undefined
          ? {}
          : { 'aria-pressed': puesto })}
      className={[
        'min-h-toque rounded-grande px-e4 font-semibold disabled:opacity-50',
        puesto === true ? 'bg-texto text-fondo' : 'border-2 border-borde',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SoloEnLaTablet() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-e4 bg-fondo p-e5 text-center text-texto">
      <h1 className="text-pantalla font-bold">Edita la sala en una tablet o en la caja</h1>
      <p className="max-w-[28rem] text-cuerpo text-texto-suave">
        En el móvil no cabe un plano para dibujarlo con el dedo.
      </p>
      <BotonSuave onClick={irAlPlano}>Volver a las mesas</BotonSuave>
    </main>
  );
}
