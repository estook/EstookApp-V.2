import type { ComponentType } from 'react';

/**
 * Los dibujos de los vacíos, y dónde está cada uno (entrega V, punto 4).
 *
 * ── Por qué cada uno es una importación aparte ───────────────────────────────
 *
 * «**Se cargan aparte** del paquete inicial: nadie descarga el dibujo de
 * "todavía no hay pedidos" para fichar» (mejoras antes de M8). Cada entrada de aquí
 * es un `import()`, y eso es lo que le dice al empaquetador que haga un trozo por
 * dibujo: el paquete inicial no crece ni un byte por tener veinte, y quien ve un
 * vacío descarga uno de un kilobyte y medio, una vez.
 *
 * Una prueba lo vigila (`dibujos.prueba.ts`): si alguien importara un dibujo de
 * frente, los veinte entrarían en el arranque sin que se notara en ninguna pantalla.
 *
 * ── Y por qué son pocos y se repiten ─────────────────────────────────────────
 *
 * Son una familia, no uno por pantalla: «nada congelado» y «nada que comparar» no
 * necesitan su propio dibujo cada vez que aparecen. Un dibujo nuevo se añade aquí,
 * con su línea de para qué es, y sale solo en el catálogo del admin.
 */
type Cargador = () => Promise<{ readonly default: ComponentType }>;

export const DIBUJOS = {
  camara: () => import('./Camara.tsx'),
  buscar: () => import('./Buscar.tsx'),
  'todo-en-orden': () => import('./TodoEnOrden.tsx'),
  congelador: () => import('./Congelador.tsx'),
  archivo: () => import('./Archivo.tsx'),
  proveedores: () => import('./Proveedores.tsx'),
  pedidos: () => import('./Pedidos.tsx'),
  albaranes: () => import('./Albaranes.tsx'),
  facturas: () => import('./Facturas.tsx'),
  precios: () => import('./Precios.tsx'),
  equipo: () => import('./Equipo.tsx'),
  reloj: () => import('./Reloj.tsx'),
  caja: () => import('./Caja.tsx'),
  mermas: () => import('./Mermas.tsx'),
  libro: () => import('./Libro.tsx'),
  candado: () => import('./Candado.tsx'),
  perdido: () => import('./Perdido.tsx'),
  local: () => import('./Local.tsx'),
  grafica: () => import('./Grafica.tsx'),
  platos: () => import('./Platos.tsx'),
} as const satisfies Record<string, Cargador>;

export type NombreDelDibujo = keyof typeof DIBUJOS;

/** Para qué es cada uno, en una línea. Lo enseña el catálogo del admin. */
export const PARA_QUE_ES: Readonly<Record<NombreDelDibujo, string>> = {
  camara: 'La cámara sin género',
  buscar: 'Lo buscado o filtrado no da nada',
  'todo-en-orden': 'Un vacío que es buena noticia',
  congelador: 'Nada congelado',
  archivo: 'Lo quitado de en medio',
  proveedores: 'Sin proveedores',
  pedidos: 'Sin pedidos',
  albaranes: 'Sin albaranes',
  facturas: 'Sin facturas',
  precios: 'Nada que comparar',
  equipo: 'Sin equipo',
  reloj: 'Sin fichajes',
  caja: 'Sin cajas cerradas',
  mermas: 'Sin mermas',
  libro: 'Sin movimientos ni registros',
  candado: 'Tu acceso no llega',
  perdido: 'Una dirección que no existe',
  local: 'Sin local',
  grafica: 'Sin datos que dibujar',
  platos: 'Sin platos',
};

export const NOMBRES_DE_LOS_DIBUJOS = Object.keys(DIBUJOS) as readonly NombreDelDibujo[];
