/**
 * Lo que Estook declara de sí mismo como programa de facturación (T6 · 1, decisión 0126; Anexo
 * 4.14 y Orden HAC/1177/2024, art. 15). **Un solo sitio**: lo leen la declaración en la app,
 * su PDF y la prueba que comprueba que dicen lo mismo.
 *
 * **La versión sube cuando cambia la parte fiscal** (emitir, numerar, el papel, lo que se manda a
 * Verifacti), y entonces se revisa con el asesor si hay que volver a firmarla (Anexo 4.14). No
 * sube con cada mejora de la app: es la versión del sistema de facturación, no la de Estook.
 */

export const EL_SISTEMA = {
  nombre: 'Estook',
  /** Lo elige el productor: dos caracteres. Lo confirma el asesor al redactar la declaración. */
  id: 'ES',
  version: '1.0',
} as const;

export const LOS_COMPONENTES: readonly { readonly nombre: string; readonly queHace: string }[] = [
  {
    nombre: 'Estook (la app web)',
    queHace:
      'Da de alta la facturación de cada local, guarda sus series y enseña los tickets y las facturas emitidos con su estado ante Hacienda.',
  },
  {
    nombre: 'Estook TPV y la caja para Windows',
    queHace: 'Cobran en el local e imprimen el ticket con su QR tributario.',
  },
  {
    nombre: 'La API de Estook (Supabase, en la Unión Europea)',
    queHace:
      'Numera cada documento en su serie, lo guarda sin poder cambiarlo y lo manda al componente externo.',
  },
  {
    nombre: 'Verifacti, componente externo',
    queHace:
      'Genera el registro de facturación, su huella y su encadenamiento, y lo remite a la AEAT.',
  },
];

export const LA_FIRMA =
  'En VERI*FACTU los registros no se firman electrónicamente: los remite a la AEAT el componente externo, con su certificado de colaborador social (convenio 017 con la AEAT).';

/** Lo que dice mientras el asesor no escriba la suya. Es un borrador y lo dice. */
export const EL_CUMPLIMIENTO_EN_BORRADOR =
  'El productor declara que este sistema informático de facturación cumple lo dispuesto en el artículo 29.2.j) de la Ley 58/2003, General Tributaria, en el Reglamento aprobado por el Real Decreto 1007/2023 y en la Orden HAC/1177/2024. Texto provisional: lo redacta y lo revisa el asesor antes de firmarlo.';
