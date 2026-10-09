import { NOMBRE_DE_LA_ZONA, esZona } from '@estook/dominio';
import type { ProductoEnLista } from './contrato.ts';

/**
 * Lo que el inventario recibe del servidor (M8 · decisión 0078), y lo que se hace con
 * ello sin pintar nada: la hoja impresa y el fichero del valor.
 *
 * Copia de lo que devuelven `el_inventario`, `un_inventario`, `valor_del_almacen` y
 * `minimos_propuestos`: la aplicación no importa del servidor (regla de
 * dependencias). Lo que decía el libro y el dinero llegan **opcionales a propósito**:
 * a quien cuenta sin poder cerrar no le llega lo primero, y sin precios de compra no
 * llega lo segundo.
 */

export type PorQueTocaContar = 'lo_caro' | 'lo_demas';

export interface ProductoQueToca {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly unidadDeUso: string;
  readonly porque: PorQueTocaContar;
  readonly contadoEl: string | null;
}

export interface InventarioEnLista {
  readonly id: string;
  readonly zona: string | null;
  readonly estado: 'contado' | 'cerrado' | 'descartado';
  readonly contadoPor: string | null;
  readonly esMio: boolean;
  readonly contadoEn: string;
  readonly cerradoPor: string | null;
  readonly cerradoEn: string | null;
  readonly contados: number;
  readonly noCuadran?: number;
  readonly aRecontar: number;
  readonly motivoDeDescarte: string | null;
}

export interface LoQueHayQueRecontar {
  readonly inventarioId: string;
  readonly productoId: string;
  readonly nombre: string;
  readonly unidadDeUso: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly pesoVariable: boolean;
}

export interface ElInventario {
  readonly hoy: string;
  readonly puedeCerrar: boolean;
  readonly tocaContar: { readonly productos: readonly ProductoQueToca[]; readonly frase: string };
  readonly porCerrar: readonly InventarioEnLista[];
  readonly paraRecontar: readonly LoQueHayQueRecontar[];
  readonly cerrados: readonly InventarioEnLista[];
}

export interface LineaDelInventario {
  readonly productoId: string;
  readonly producto: string;
  readonly unidadDeUso: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly pesoVariable: boolean;
  readonly hay: number;
  readonly formatos: number | null;
  readonly sueltas: number | null;
  readonly contadoPor: string | null;
  readonly contadoEn: string;
  readonly recontar: boolean;
  readonly decia?: number;
  readonly diferencia?: number;
  readonly valorDeLaDiferenciaCentimos?: number | null;
}

export interface UnInventario {
  readonly inventario: InventarioEnLista;
  readonly lineas: readonly LineaDelInventario[];
  readonly puedeCerrar: boolean;
  readonly puedeVerPrecios: boolean;
}

export interface Cerrado {
  readonly inventarioId: string;
  readonly fechaOperativa: string;
  readonly corregidos: number;
  readonly yaCuadraban: number;
  readonly vaciados: number;
  readonly fuera?: number;
  readonly loQueMasBaila: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly decia: number;
    readonly hay: number;
    readonly unidadDeUso: string;
  }[];
}

export interface ProductoValorado {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly categoria: string | null;
  readonly unidadDeUso: string;
  readonly cantidad: number;
  readonly costeMilesimas: number | null;
  readonly valorCentimos: number | null;
  readonly valorEsEstimado: boolean;
}

export interface ValorDelAlmacen {
  readonly fecha: string;
  readonly hoy: string;
  readonly totalCentimos: number;
  readonly porZona: readonly { readonly zona: string; readonly valorCentimos: number }[];
  readonly porCategoria: readonly {
    readonly categoria: string | null;
    readonly valorCentimos: number;
    readonly cuantos: number;
  }[];
  readonly productos: readonly ProductoValorado[];
  readonly sinCoste: number;
}

export interface MinimoPropuesto {
  readonly id: string;
  readonly nombre: string;
  readonly unidadDeUso: string;
  readonly cantidad: number;
  readonly minimo: number | null;
  readonly propuesto: { readonly minimo: number; readonly porque: string };
}

export interface MinimosPropuestos {
  readonly propuestas: readonly MinimoPropuesto[];
  readonly automaticos: number;
  readonly sinDatos: number;
}

/** «Cocina», o lo que venga si no es una zona conocida. Nulo: el almacén entero. */
export function nombreDeZona(zona: string | null): string {
  if (zona === null) return 'Todo el almacén';
  return esZona(zona) ? NOMBRE_DE_LA_ZONA[zona] : zona;
}

// ── Contar como está en la estantería ────────────────────────────────────────

/**
 * Si un producto se cuenta en cajas y sueltas: tiene envase, el envase trae más de
 * una unidad y no va a peso variable (una caja de merluza no pesa lo mismo que otra).
 */
export function seCuentaEnCajas(p: {
  readonly formato: string | null;
  readonly factor: number;
  readonly pesoVariable: boolean;
}): boolean {
  return p.formato !== null && p.formato.trim() !== '' && p.factor > 1 && !p.pesoVariable;
}

/** Lo que se ha escrito de un producto: en una casilla, o en cajas y sueltas. */
export interface LoEscrito {
  readonly hay?: string;
  readonly formatos?: string;
  readonly sueltas?: string;
}

/** Un número escrito a mano, con coma o con punto. Nulo si no hay nada o no vale. */
export function numeroEscrito(escrito: string | undefined): number | null {
  if (escrito === undefined) return null;
  const limpio = escrito.trim().replace(',', '.');
  if (limpio === '') return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

/**
 * Lo escrito al escanear, junto con lo que ya se llevaba (repaso del 9-oct, punto 1).
 *
 * Escanear ya no suma uno: pregunta cuántos hay. Si ese producto ya estaba contado
 * —la misma leche en dos estanterías—, **se suma** a lo de antes, casilla a casilla;
 * con `sumar` apagado, lo nuevo sustituye a lo de antes. Lo que se deja en blanco no
 * borra lo que había.
 */
export function juntarLoContado(
  antes: LoEscrito | undefined,
  nuevo: LoEscrito,
  sumar: boolean,
): LoEscrito {
  const casilla = (campo: keyof LoEscrito): string | undefined => {
    const escrito = numeroEscrito(nuevo[campo]);
    const tenia = numeroEscrito(antes?.[campo]);
    if (escrito === null) return sumar ? antes?.[campo] : undefined;
    if (!sumar || tenia === null) return String(escrito);
    return String(Number((tenia + escrito).toFixed(4)));
  };
  const hay = casilla('hay');
  const formatos = casilla('formatos');
  const sueltas = casilla('sueltas');
  return {
    ...(hay === undefined ? {} : { hay }),
    ...(formatos === undefined ? {} : { formatos }),
    ...(sueltas === undefined ? {} : { sueltas }),
  };
}

/** «Caja 6 ud» → «Caja», para la casilla: lo que se cuenta son cajas. */
export function nombreDelEnvase(formato: string | null): string {
  if (formato === null) return 'Cajas';
  const primera = formato.trim().split(/\s+/)[0] ?? '';
  return primera === '' ? 'Cajas' : `${primera.charAt(0).toUpperCase()}${primera.slice(1)}s`;
}

// ── La hoja de inventario, impresa ──────────────────────────────────────────

/**
 * Imprime la hoja para contar a mano: por zonas y categorías, con una casilla en
 * blanco por producto y **sin lo que dice el libro** (0078): un número escrito de
 * antemano se confirma sin mirar.
 *
 * En una ventana aparte y hecha con el DOM, como el pedido (`imprimirTexto`): sale
 * igual en todos los navegadores, y un producto que se llame «<b>» sale tal cual.
 * Devuelve falso si el navegador no dejó abrirla.
 */
export function imprimirLaHoja(
  titulo: string,
  productos: readonly Pick<
    ProductoEnLista,
    'nombre' | 'categoria' | 'formato' | 'unidadDeUso' | 'zona'
  >[],
): boolean {
  const ventana = window.open('', '_blank', 'width=760,height=900');
  if (ventana === null) return false;
  const documento = ventana.document;
  documento.title = titulo;
  documento.documentElement.lang = 'es';

  const estilo = documento.createElement('style');
  estilo.textContent = [
    "body { font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 2rem; color: #1b1b1b; }",
    'h1 { font-size: 1.25rem; margin: 0 0 .25rem; }',
    'p { margin: 0 0 1.25rem; color: #555; }',
    'h2 { font-size: 1rem; margin: 1.5rem 0 .5rem; }',
    'table { width: 100%; border-collapse: collapse; }',
    'th, td { text-align: left; padding: .45rem .5rem; border-bottom: 1px solid #ccc; }',
    'th { font-size: .8rem; color: #555; font-weight: 600; }',
    'td.casilla { width: 8rem; border: 1px solid #999; }',
    'td.unidad { width: 3rem; color: #555; }',
    '@media print { body { margin: 1cm; } h2 { break-after: avoid; } tr { break-inside: avoid; } }',
  ].join('\n');
  documento.head.append(estilo);

  const cabecera = documento.createElement('h1');
  cabecera.textContent = titulo;
  const pie = documento.createElement('p');
  pie.textContent = 'Contado por: ____________________   Día y hora: ____________________';
  documento.body.append(cabecera, pie);

  // Por zona y, dentro, por categoría: es el orden en que se recorre la cámara.
  const grupos = new Map<string, typeof productos>();
  for (const p of [...productos].sort(
    (a, b) =>
      a.zona.localeCompare(b.zona) ||
      (a.categoria ?? '~').localeCompare(b.categoria ?? '~', 'es') ||
      a.nombre.localeCompare(b.nombre, 'es'),
  )) {
    const clave = `${nombreDeZona(p.zona)} · ${p.categoria ?? 'Sin categoría'}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
  }

  for (const [nombre, deEste] of grupos) {
    const titular = documento.createElement('h2');
    titular.textContent = nombre;
    const tabla = documento.createElement('table');
    const cabeza = tabla.createTHead().insertRow();
    for (const texto of ['Producto', 'Envase', 'Contado', '']) {
      const th = documento.createElement('th');
      th.textContent = texto;
      cabeza.append(th);
    }
    const cuerpo = tabla.createTBody();
    for (const p of deEste) {
      const fila = cuerpo.insertRow();
      fila.insertCell().textContent = p.nombre;
      fila.insertCell().textContent = p.formato ?? '';
      fila.insertCell().className = 'casilla';
      const unidad = fila.insertCell();
      unidad.className = 'unidad';
      unidad.textContent = p.unidadDeUso;
    }
    documento.body.append(titular, tabla);
  }

  ventana.focus();
  ventana.print();
  return true;
}

// ── El valor del almacén, en un fichero ─────────────────────────────────────

/**
 * El valor del almacén de un día, en CSV con punto y coma y BOM, como las mermas:
 * lo abre Excel de un doble clic y con los acentos bien.
 */
export function descargarElValor(datos: ValorDelAlmacen): void {
  const celda = (valor: string | number | null) => {
    const texto = valor === null ? '' : String(valor);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const euros = (centimos: number | null) =>
    centimos === null ? '' : (centimos / 100).toFixed(2).replace('.', ',');
  const cabecera = ['Producto', 'Zona', 'Categoria', 'Cantidad', 'Unidad', 'Valor en euros'];
  const filas = datos.productos.map((p) => [
    p.nombre,
    nombreDeZona(p.zona),
    p.categoria ?? '',
    String(p.cantidad).replace('.', ','),
    p.unidadDeUso,
    euros(p.valorCentimos),
  ]);
  const csv = [cabecera, ...filas, ['Total', '', '', '', '', euros(datos.totalCentimos)]]
    .map((fila) => fila.map(celda).join(';'))
    .join('\r\n');
  const fichero = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(fichero);
  enlace.download = `valor-del-almacen-${datos.fecha}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
