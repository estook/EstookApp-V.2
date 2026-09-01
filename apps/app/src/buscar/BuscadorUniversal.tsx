import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IconoAjustes, IconoPanel, IconoTamanoDeLetra } from '@estook/iconos';
import { Buscador, type Accion, type App, type ResultadoDeBusqueda } from '@estook/ui';
import { PERSONA_DE_DESARROLLO, crearClienteDeLaApp, hayApi } from '../datos/cliente.ts';

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

export interface BuscadorUniversalProps {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  readonly apps: readonly App[];
}

export function BuscadorUniversal({ abierto, alCerrar, apps }: BuscadorUniversalProps) {
  const navegar = useNavigate();
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
  const sePregunta = hayApi && PERSONA_DE_DESARROLLO !== null && texto.length >= 2;

  const consulta = useQuery({
    queryKey: ['buscar', texto, PERSONA_DE_DESARROLLO],
    enabled: sePregunta,
    queryFn: async () => {
      const cliente = crearClienteDeLaApp({ personaId: PERSONA_DE_DESARROLLO });
      const respuesta = await cliente.consultar<
        readonly {
          tipo: string;
          id: string;
          titulo: string;
          subtitulo: string;
          local_id: string | null;
        }[]
      >('buscar', { texto });
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
        icono: <IconoPanel size={18} />,
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
          const pestana = app.pestanas[0]?.id;
          navegar(pestana === undefined ? `/${app.id}` : `/${app.id}/${pestana}`);
        },
      })),
      // Y las pestanas de cada app: son sitios, y buscar «fichas» tiene que
      // llevar a Escandallos · Fichas sin pasar por Escandallos.
      ...apps.flatMap((app) =>
        app.pestanas.map((pestana) => ({
          id: `pestana-${app.id}-${pestana.id}`,
          nombre: `${app.nombre}: ${pestana.nombre}`,
          donde: app.nombre,
          icono: <app.icono size={18} />,
          hacer: () => {
            navegar(`/${app.id}/${pestana.id}`);
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
      {
        id: 'tamano-de-letra',
        nombre: 'Cambiar el tamano de letra',
        donde: 'Ajustes',
        icono: <IconoTamanoDeLetra size={18} />,
        hacer: () => {
          navegar('/ajustes#tamano-de-letra');
        },
      },
    ],
    [apps, navegar],
  );

  const resultados = useMemo<readonly ResultadoDeBusqueda[]>(
    () =>
      (consulta.data ?? []).map((fila) => ({
        tipo: fila.tipo,
        id: fila.id,
        titulo: fila.titulo,
        subtitulo: fila.subtitulo,
        ir: () => {
          // Los destinos de verdad los traen los modulos de cada app. Hoy lo
          // unico que se puede abrir es un local, y eso llega con M4.
          navegar('/');
        },
      })),
    [consulta.data, navegar],
  );

  const alEscribir = useCallback((valor: string) => {
    setEscrito(valor);
    if (valor === '') setReposado('');
  }, []);

  return (
    <Buscador
      abierto={abierto}
      alCerrar={alCerrar}
      acciones={acciones}
      resultados={resultados}
      buscando={sePregunta && consulta.isLoading}
      alEscribir={alEscribir}
    />
  );
}
