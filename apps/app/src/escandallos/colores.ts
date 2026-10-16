import type { Alergeno } from '@estook/dominio';

/** Los colores de los pictogramas de siempre, oscuros para que el blanco se lea encima. */
export const COLOR_DEL_ALERGENO: Readonly<Record<Alergeno, string>> = {
  gluten: '#B7791F',
  crustaceos: '#2B7FA8',
  huevos: '#B07A08',
  pescado: '#1F5FA3',
  cacahuetes: '#8B5A2B',
  soja: '#4F7A28',
  lacteos: '#5B6B8C',
  frutos_de_cascara: '#9A4A2A',
  apio: '#3E8E41',
  mostaza: '#94800A',
  sesamo: '#8C6D46',
  sulfitos: '#7A3E8E',
  altramuces: '#9C7A00',
  moluscos: '#167C80',
};
