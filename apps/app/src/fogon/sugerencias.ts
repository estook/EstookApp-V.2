/**
 * Lo que se le puede preguntar a Fogón en cada sitio (19-oct, Richi: «ayudar a la gente a
 * entender qué puede hacer en cada página»).
 *
 * Tres o cuatro preguntas que se tocan y se mandan, **solo de lo que Fogón sabe contestar
 * en esa pantalla** (lo que lleva su resumen, `fogon-resumen.ts`): una sugerencia que no
 * sabe contestar enseña a no usarlo. Las que hablan de dinero solo salen a quien ve
 * importes; a los demás, Fogón les diría que eso no lo llevan.
 */
export interface Sugerencia {
  readonly texto: string;
  /** Solo para quien ve importes y costes. */
  readonly conDinero?: true;
}

const DE_SIEMPRE: readonly Sugerencia[] = [
  { texto: '¿Qué tengo que atender hoy?' },
  { texto: '¿Qué puedo hacer en esta pantalla?' },
];

const POR_APP: Readonly<Record<string, readonly Sugerencia[]>> = {
  '': [
    { texto: '¿Qué tengo que atender hoy?' },
    { texto: '¿Qué llega hoy y qué tengo que pedir?' },
    { texto: '¿Cómo voy con mis objetivos esta semana?', conDinero: true },
    { texto: '¿Qué caduca hoy o mañana?' },
  ],
  almacen: [
    { texto: '¿Qué está bajo mínimo o agotado?' },
    { texto: '¿Qué caduca pronto?' },
    { texto: '¿Qué tengo que pedir hoy, y a quién?' },
    { texto: '¿Cuánto vale lo que tengo en el almacén?', conDinero: true },
  ],
  escandallos: [
    { texto: '¿Qué platos no tienen escandallo todavía?' },
    { texto: '¿Qué plato me deja menos margen?', conDinero: true },
    { texto: '¿Qué platos tienen alérgenos?' },
    { texto: '¿Qué fichas técnicas no tienen pasos?' },
  ],
  carta: [
    { texto: '¿Cuántos platos tengo en la carta?' },
    { texto: '¿Qué platos no tienen foto?' },
    { texto: '¿Qué plato es el más caro de hacer?', conDinero: true },
  ],
  negocio: [
    { texto: '¿Cómo voy con mis objetivos esta semana?', conDinero: true },
    { texto: '¿Qué tengo que atender hoy?' },
  ],
};

/** Las de la app en la que estás (`almacen/compras` → Almacén), según lo que ves. */
export function lasSugerencias(app: string, veDinero: boolean): readonly Sugerencia[] {
  const todas = POR_APP[app] ?? DE_SIEMPRE;
  return todas.filter((s) => veDinero || s.conDinero !== true).slice(0, 4);
}
