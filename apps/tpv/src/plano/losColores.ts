/**
 * **La leyenda de los colores** (el rediseño, 0148), pequeña al pie del plano. Entera, con lo que
 * quiere decir cada uno, al final de los Ajustes del TPV.
 */
export const LOS_COLORES_DE_LA_SALA = [
  {
    nombre: 'Libre',
    fondo: 'bg-mesa-libre border border-mesa-libre-borde',
    explica: 'Nadie sentado',
  },
  {
    nombre: 'Te toca',
    fondo: 'bg-mesa-te-toca',
    explica: 'Sin pedir o sin mandar: le falta algo de la sala',
  },
  { nombre: 'Esperando', fondo: 'bg-mesa-esperando', explica: 'La cocina lo tiene' },
  {
    nombre: 'Bebida',
    fondo: 'bg-mesa-bebida',
    explica: 'Pedida y sin servir; en turquesa, la barra ya la ha hecho',
  },
  { nombre: 'Marchar', fondo: 'bg-mesa-marchar', explica: 'Toca pedir el siguiente pase' },
  {
    nombre: 'Comiendo',
    fondo: 'bg-mesa-comiendo',
    explica: 'Todo servido; o bebiendo, si solo hay bebida y ya está en la mesa',
  },
  { nombre: '¿Cuenta?', fondo: 'bg-mesa-cuenta', explica: 'Han acabado o la han pedido' },
] as const;
