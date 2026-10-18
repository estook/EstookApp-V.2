import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconoAjustes, IconoInicio } from '@estook/iconos';
import {
  Buscador,
  destinoPorId,
  destinosQueSeAbren,
  rutaDe,
  seBuscaYa,
  type Accion,
  type App,
  type ResultadoDeBusqueda,
} from '@estook/ui';
import { hayApi } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  ajustesQueVe,
  nombreDeLaSeccion,
  rutaDelAjuste,
} from '../pantallas/lasSeccionesDeAjustes.ts';
import {
  apuntarUnReciente,
  leerLosRecientes,
  olvidarLosRecientes,
  type Reciente,
} from './recientes.ts';

/**
 * El buscador universal, enchufado (M3, Parte B5).
 *
 * «Buscador universal con `pg_trgm` y `unaccent` que busca **tambien acciones**»
 * · «Buscar en el buscador universal: **150 ms**» (B7).
 *
 * ── Las acciones son instantaneas ────────────────────────────────────────────
 *
 * Ir a una app, ir a Ajustes, cambiar el tamano de letra: eso no esta en ninguna
 * tabla y no hace falta preguntar. Sale escrito antes de levantar el dedo, y
 * funciona sin conexion. Los 150 ms de B7 son para lo otro.
 *
 * ── Los datos esperan un poco ────────────────────────────────────────────────
 *
 * Se espera 180 ms desde la ultima tecla antes de preguntar. Sin eso, escribir
 * «bahia» son cinco consultas de las que solo importa la ultima, y en un movil
 * con mala cobertura las cuatro primeras llegan tarde y desordenadas.
 */
const ESPERA_ANTES_DE_PREGUNTAR = 180;

/** Lo que devuelve `buscar` por cada cosa encontrada: lo mismo que se guarda al abrirla. */
type FilaEncontrada = Reciente;

export interface BuscadorUniversalProps {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  readonly apps: readonly App[];
}

export function BuscadorUniversal({ abierto, alCerrar, apps }: BuscadorUniversalProps) {
  const navegar = useNavigate();
  // M4: el cliente es el de la sesion. Antes se creaba uno con el identificador
  // de desarrollo puesto a mano; ahora lleva el token de quien ha entrado, asi
  // que el buscador encuentra exactamente lo que esa persona puede ver.
  const { cliente, yo, permisos, cambiarDeSitio } = usarSesion();
  const [escrito, setEscrito] = useState('');
  const [reposado, setReposado] = useState('');

  useEffect(() => {
    const reloj = setTimeout(() => {
      setReposado(escrito);
    }, ESPERA_ANTES_DE_PREGUNTAR);
    return () => {
      clearTimeout(reloj);
    };
  }, [escrito]);

  const texto = reposado.trim();
  // Con dos letras, o con un número suelto: «7» es el pedido 7 (0085).
  const sePregunta = hayApi && yo !== null && seBuscaYa(texto);
  /*
    **Lo escrito que todavía no se ha preguntado** (19-oct). Durante los 180 ms de
    espera el buscador decía «Nada con «…»» sin haber preguntado a nadie, y al salir
    la pregunta lo cambiaba por el «Cargando»: un vacío que parpadeaba, y un «Borrar
    lo escrito» que desaparecía bajo el dedo. Mientras se espera, se está buscando.
  */
  const porPreguntar = hayApi && yo !== null && seBuscaYa(escrito) && escrito.trim() !== texto;

  // Lo último abierto desde aquí, de esta persona en este aparato (0085). Se vuelve a
  // leer al abrir: entre una vez y otra se ha podido abrir algo más.
  const personaId = yo?.personaId ?? null;
  const [recientes, setRecientes] = useState<readonly Reciente[]>([]);
  useEffect(() => {
    if (abierto && personaId !== null) setRecientes(leerLosRecientes(personaId));
  }, [abierto, personaId]);

  const consulta = useQuery({
    queryKey: ['buscar', texto, yo?.personaId ?? null],
    enabled: sePregunta,
    queryFn: async () => {
      const respuesta = await cliente.consultar<readonly FilaEncontrada[]>('buscar', { texto });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const acciones = useMemo<readonly Accion[]>(
    () => [
      {
        id: 'panel',
        nombre: 'Ir al Panel',
        donde: 'Panel',
        icono: <IconoInicio size={18} />,
        hacer: () => {
          navegar('/');
        },
      },
      ...apps.map((app) => ({
        id: `app-${app.id}`,
        nombre: `Ir a ${app.nombre}`,
        donde: app.queHace,
        icono: <app.icono size={18} />,
        hacer: () => {
          navegar(rutaDe(app));
        },
      })),
      /*
        Y los destinos de cada app: son sitios, y buscar «movimientos» tiene que
        llevar a Almacén · Movimientos sin pasar por Almacén.

        **Solo los construidos.** Antes salian todos, asi que el buscador ofrecia
        «Almacén: Pedidos» y «Carta: Menus», que no llevaban a ningun sitio: se
        elegia un resultado y aparecia un cartel de «esto llega en M7». Un
        resultado de busqueda que no lleva a nada es peor que no salir, porque
        ademas ha tapado a otro que si.
      */
      ...apps.flatMap((app) =>
        destinosQueSeAbren(app).map((destino) => ({
          id: `destino-${app.id}-${destino.id}`,
          nombre: `${app.nombre}: ${destino.nombre}`,
          donde: destino.queContesta,
          icono: <app.icono size={18} />,
          hacer: () => {
            navegar(rutaDe(app, destino));
          },
        })),
      ),
      {
        id: 'ajustes',
        nombre: 'Ir a Ajustes',
        donde: 'Ajustes',
        icono: <IconoAjustes size={18} />,
        hacer: () => {
          navegar('/ajustes');
        },
      },
      /*
        Y cada ajuste que esta persona ve, con las palabras con las que se busca
        (entrega V, mejora 7): «nadie tiene que saber que el tema está en
        Ajustes». Salen del mismo catálogo que la pantalla de Ajustes.
      */
      ...ajustesQueVe({
        permisos,
        tieneLocal: yo?.local !== null && yo?.local !== undefined,
        tieneOrganizacion: yo?.organizacion !== null && yo?.organizacion !== undefined,
        llevaLaSuscripcion: yo?.cuenta?.laLlevo === true,
      }).map((ajuste) => ({
        id: `ajuste-${ajuste.id}`,
        nombre: ajuste.nombre,
        donde: `Ajustes · ${nombreDeLaSeccion(ajuste.seccion)}`,
        palabras: ajuste.palabras,
        icono: <IconoAjustes size={18} />,
        hacer: () => {
          navegar(rutaDelAjuste(ajuste));
        },
      })),
    ],
    [apps, navegar, permisos, yo?.local, yo?.organizacion, yo?.cuenta?.laLlevo],
  );

  /*
    **A dónde lleva cada resultado** (las bases firmes, 0084).

    Hasta el 14-oct todos llevaban al Panel —«los destinos de verdad los traen los
    módulos»—, y los módulos llegaron sin que nadie volviera aquí: se buscaba
    «salmón», salía, se tocaba y no pasaba nada. «La búsqueda no funciona nunca.»
    Ahora cada cosa abre su ficha donde vive, y si es de otro local, primero se
    cambia a ese local: abrir el salmón de Bar Puerto estando en Bar Centro sería
    enseñar otra cosa con el mismo nombre.
  */
  const almacen = apps.find((app) => app.id === 'almacen');
  const equipo = apps.find((app) => app.id === 'equipo');
  const carta = apps.find((app) => app.id === 'carta');
  const localDeAhora = yo?.local?.id ?? null;

  const { encontrados, abiertosAntes } = useMemo(() => {
    const enSuLocal = (localId: string | null, despues: () => void) => {
      if (localId === null || localId === localDeAhora) {
        despues();
        return;
      }
      void cambiarDeSitio({ local: localId }).then((hecho) => {
        if (hecho) despues();
      });
    };

    const aDonde = (fila: FilaEncontrada): (() => void) | null => {
      switch (fila.tipo) {
        case 'producto': {
          const productos = almacen && destinoPorId(almacen, 'productos');
          if (!almacen || !productos) return null;
          return () => {
            enSuLocal(fila.local_id, () => {
              navegar(`${rutaDe(almacen, productos)}?producto=${fila.id}`);
            });
          };
        }
        // Los pedidos y las facturas (0067), con su ficha abierta encima de su lista:
        // `?pedido=` y `?factura=` se abren desde cualquier vista de Compras.
        case 'pedido':
        case 'factura': {
          const compras = almacen && destinoPorId(almacen, 'compras');
          const vista = compras?.vistas.find(
            (v) => v.id === (fila.tipo === 'pedido' ? 'pedidos' : 'facturas'),
          );
          if (!almacen || !compras) return null;
          return () => {
            enSuLocal(fila.local_id, () => {
              navegar(`${rutaDe(almacen, compras, vista)}?${fila.tipo}=${fila.id}`);
            });
          };
        }
        // Los platos de la carta (0068), con su ficha abierta encima de la carta.
        case 'plato': {
          const lasCartas = carta && destinoPorId(carta, 'carta');
          if (!carta || !lasCartas) return null;
          return () => {
            enSuLocal(fila.local_id, () => {
              navegar(`${rutaDe(carta, lasCartas)}?plato=${fila.id}`);
            });
          };
        }
        case 'proveedor': {
          const compras = almacen && destinoPorId(almacen, 'compras');
          const proveedores = compras?.vistas.find((v) => v.id === 'proveedores');
          if (!almacen || !compras) return null;
          return () => {
            enSuLocal(fila.local_id, () => {
              navegar(`${rutaDe(almacen, compras, proveedores)}?proveedor=${fila.id}`);
            });
          };
        }
        case 'persona': {
          const personas = equipo && destinoPorId(equipo, 'personas');
          if (!equipo || !personas) return null;
          return () => {
            navegar(`${rutaDe(equipo, personas)}?persona=${fila.id}`);
          };
        }
        case 'local':
          return () => {
            enSuLocal(fila.id, () => {
              navegar('/');
            });
          };
        case 'organizacion':
        case 'area':
          return () => {
            navegar('/cadena');
          };
        default:
          return null;
      }
    };

    // Lo que no se puede abrir no sale: un resultado que no lleva a nada es peor que
    // no salir, porque además tapa a otro que sí. Y lo que se abre, se apunta en los
    // recientes.
    const comoResultado = (fila: FilaEncontrada): ResultadoDeBusqueda[] => {
      const ir = aDonde(fila);
      if (ir === null) return [];
      return [
        {
          tipo: fila.tipo,
          id: fila.id,
          titulo: fila.titulo,
          subtitulo: fila.subtitulo,
          ir: () => {
            if (personaId !== null) setRecientes(apuntarUnReciente(personaId, fila));
            ir();
          },
        },
      ];
    };

    return {
      encontrados: (consulta.data ?? []).flatMap(comoResultado),
      // Un reciente que hoy ya no se puede abrir (otro acceso, otra app) no sale.
      abiertosAntes: recientes.flatMap(comoResultado),
    };
  }, [
    consulta.data,
    recientes,
    personaId,
    navegar,
    almacen,
    equipo,
    carta,
    localDeAhora,
    cambiarDeSitio,
  ]);

  const alEscribir = useCallback((valor: string) => {
    setEscrito(valor);
    if (valor === '') setReposado('');
  }, []);

  return (
    <Buscador
      abierto={abierto}
      alCerrar={alCerrar}
      acciones={acciones}
      resultados={encontrados}
      buscando={porPreguntar || (sePregunta && consulta.isLoading)}
      alEscribir={alEscribir}
      recientes={abiertosAntes}
      alOlvidarRecientes={() => {
        if (personaId !== null) olvidarLosRecientes(personaId);
        setRecientes([]);
      }}
    />
  );
}
