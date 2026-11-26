import { describe, expect, it } from 'vitest';
import { catalogo } from './catalogo.ts';
import type { Puertas } from './contrato.ts';

/**
 * **S1 · Cada plan, lo suyo** (decisión 0147): cada operación de Estook TPV está decidida.
 *
 * Lo que se hace en un aparato ya lo cierra la puerta del pago sin Pro (0120). Esta prueba mira
 * lo de Estook TPV que se puede llamar **con la sesión de una persona, desde Estook**: o lleva
 * `deEstookTpv` y sin Pro se cierra, o está en la lista de lo que un local que deja Pro conserva,
 * con su motivo. Una operación nueva de Estook TPV que no esté en ninguno de los dos lados pone
 * esta prueba en rojo hasta que alguien lo decida.
 */

interface Operacion extends Puertas {
  readonly nombre: string;
  readonly exige?: string;
}

const TODAS: readonly Operacion[] = [
  ...Object.values(catalogo.consultas),
  ...Object.values(catalogo.comandos),
];

/** Los permisos de Estook TPV (Roles 1.12). `accion.conectar_tpv` es el TPV de otro: Esencial. */
const PERMISOS_DE_ESTOOK_TPV = new Set([
  'accion.tomar_nota',
  'accion.cocinar',
  'accion.quitar_de_cocina',
  'accion.vincular_aparatos',
  'accion.ajustes_del_tpv',
  'accion.abrir_el_cajon',
  'accion.alta_de_facturacion',
  'accion.factura_de_un_ticket',
  'accion.factura_a_mano',
  'accion.ver_documentos',
  'accion.devolver',
  'accion.corregir_datos',
  'accion.anular',
  'accion.llevar_la_caja',
  'accion.cobrar',
]);

/** Sin Pro, cerradas: montar, emitir algo nuevo o trabajar el servicio. */
const SE_CIERRAN = [
  // El alta de facturación, paso a paso, y quién factura (0126 a 0128).
  'comprobar_un_nif',
  'guardar_la_empresa',
  'usar_la_empresa',
  'contestar_donde_tributa',
  'poner_las_series',
  'dar_de_alta_en_verifacti',
  'firmar_en_linea',
  'el_modelo_para_firmar',
  'mandar_el_modelo_firmado',
  'elegir_la_modalidad',
  'poner_pide_tu_factura',
  'dar_la_facturacion',
  'dar_un_permiso',
  // Un documento nuevo que no sale de un ticket ya cobrado.
  'hacer_factura_a_mano',
  'hacer_factura_de_senal',
  'imprimir_un_ticket_de_prueba',
  // La cocina en el servicio.
  'la_cocina',
  'tachar',
  'destachar',
  'todo_fuera',
  'recuperar',
  // Las reservas (la Ampliación 5 · 2, 0153), también en Servicio › Reservas: son de Pro, como el TPV.
  'las_reservas',
  'los_ajustes_de_reservas',
].sort();

/**
 * Lo que un local que deja Pro **conserva** (0120: «no pierde nada»; 0147). Cada una, con su motivo.
 */
const SE_QUEDAN: Readonly<Record<string, string>> = {
  // Lo suyo: verlo y descargarlo, siempre.
  tickets_y_facturas: 'ver sus tickets y facturas',
  un_documento: 'ver un documento',
  el_documento_en_pdf: 'descargarlo',
  reimprimir_el_documento: 'una copia de lo ya emitido',
  mandar_el_documento: 'mandar por correo lo ya emitido',
  cierres_de_caja: 'ver sus cierres de caja',
  un_dia_de_caja: 'ver un día de caja',
  los_cobros: 'ver lo cobrado',
  el_z_en_pdf: 'descargar el Z',
  mi_facturacion: 'ver cómo estaba su alta',
  mirar_la_autorizacion: 'ver la autorización ante Hacienda',
  la_declaracion_responsable: 'la declaración de Estook, que es pública',
  la_declaracion_responsable_en_pdf: 'la misma, en PDF',
  quien_hace_que: 'ver quién facturaba',
  las_senales_del_cliente: 'ver las señales que cobró',
  lo_que_se_puede_facturar: 'ver qué tickets cobrados quedan por facturar',
  quitar_la_empresa: 'irse sin dejar la empresa a medias (0129)',
  // Lo que la ley pide sobre lo ya cobrado (RD 1619/2012; lo investigado, A5 y A19).
  comprobar_al_cliente: 'el NIF del cliente que pide su factura',
  hacer_factura_de_tickets: 'la factura completa de un ticket ya cobrado (F3, A19)',
  marcar_cobrada: 'apuntar el cobro de una factura ya emitida',
  devolver_el_documento: 'devolver lo cobrado, con su rectificativa (A5)',
  corregir_los_datos: 'corregir un documento ya emitido (A5)',
  anular_el_documento: 'anular lo que nunca debió existir (0140)',
  corregir_lo_rechazado: 'corregir lo que rechaza Hacienda',
  // Vincular ya mira el plan por dentro (0120): sin Pro no sale ningún código.
  sacar_codigo_desde_estook: 'mira el plan por dentro (0120)',
  vincular_el_primer_aparato: 'mira el plan por dentro (0120)',
};

/** Una operación de Estook TPV que se puede llamar con la sesión de una persona desde Estook. */
function esDeEstookTpvDesdeEstook(o: Operacion): boolean {
  if (o.sinSesion || o.soloAdmin || o.enElTpv === 'solo') return false;
  return o.exige !== undefined && PERMISOS_DE_ESTOOK_TPV.has(o.exige);
}

describe('S1 · Cada plan, lo suyo (0147)', () => {
  it('lo que se cierra sin Pro lleva la puerta, y nada más la lleva', () => {
    const conLaPuerta = TODAS.filter((o) => o.deEstookTpv === true)
      .map((o) => o.nombre)
      .sort();
    expect(conLaPuerta).toEqual(SE_CIERRAN);
  });

  it('cada operación de Estook TPV que se hace desde Estook está decidida', () => {
    const sinDecidir = TODAS.filter(esDeEstookTpvDesdeEstook)
      .map((o) => o.nombre)
      .filter((n) => !SE_CIERRAN.includes(n) && !(n in SE_QUEDAN));
    expect(sinDecidir).toEqual([]);
  });

  it('lo que se queda existe y no se cierra: no hay listas con nombres viejos', () => {
    const nombres = new Set(TODAS.map((o) => o.nombre));
    for (const n of [...SE_CIERRAN, ...Object.keys(SE_QUEDAN)])
      expect(nombres.has(n), n).toBe(true);
    for (const n of Object.keys(SE_QUEDAN)) {
      expect(TODAS.find((o) => o.nombre === n)?.deEstookTpv, n).toBeUndefined();
    }
  });
});
