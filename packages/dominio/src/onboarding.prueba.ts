import { describe, expect, it } from 'vitest';
import {
  CODIGOS_DE_PASO,
  CUANTOS_PASOS,
  NOMBRE_DEL_TIPO,
  PASOS_DEL_ALTA,
  TIPOS_DE_LOCAL,
  comoVa,
  esPasoDelAlta,
  numeroDelPaso,
  pasoNumero,
} from './onboarding.ts';

/**
 * Las pruebas del alta (M5).
 *
 * Lo que se comprueba aquí es la **barra de progreso con valor**, que es la
 * única parte del alta que es cálculo y no pantalla, y por tanto la única que se
 * puede equivocar en silencio.
 *
 * Los casos que se prueban son los raros a propósito: todo saltado, todo hecho,
 * y el que empieza. Son los que nadie mira a mano y los que enseñan un «0 de 8»
 * o un «8 de 8» donde no toca.
 */

describe('los ocho pasos', () => {
  it('son ocho, y la base de datos guarda de 0 a 8', () => {
    expect(CUANTOS_PASOS).toBe(8);
    expect(PASOS_DEL_ALTA).toHaveLength(8);
  });

  it('no hay dos con el mismo codigo', () => {
    expect(new Set(CODIGOS_DE_PASO).size).toBe(CUANTOS_PASOS);
  });

  it('cada uno dice para que sirve, que es lo que se enseña', () => {
    for (const paso of PASOS_DEL_ALTA) {
      expect(paso.paraQue.length).toBeGreaterThan(20);
      expect(paso.titulo.length).toBeGreaterThan(3);
    }
  });

  it('el numero y el codigo son la misma cosa mirada de dos formas', () => {
    for (let i = 0; i < CUANTOS_PASOS; i++) {
      const paso = pasoNumero(i);
      // Comprobado y no aseverado: una asercion de no-nulo es una promesa que
      // nadie verifica, y si un dia `pasoNumero` devolviera `undefined` la
      // prueba fallaria con un error confuso en vez de decir que pasa.
      if (paso === undefined) throw new Error(`No hay paso numero ${i}`);
      expect(numeroDelPaso(paso.codigo)).toBe(i);
    }
    expect(pasoNumero(8)).toBeUndefined();
  });

  it('reconoce un codigo suyo y rechaza uno inventado', () => {
    expect(esPasoDelAlta('marca')).toBe(true);
    expect(esPasoDelAlta('conectar_el_tpv')).toBe(false);
  });
});

describe('los tipos de local', () => {
  it('todos tienen nombre para pintar', () => {
    for (const tipo of TIPOS_DE_LOCAL) {
      expect(NOMBRE_DEL_TIPO[tipo]).toBeTruthy();
    }
  });
});

describe('la barra de progreso cuenta valor, no tareas', () => {
  it('quien no ha empezado no ha ganado nada, y se le dice que gana con lo primero', () => {
    const progreso = comoVa({ paso: 0, saltados: [], terminado: false });

    expect(progreso.respondidos).toBe(0);
    expect(progreso.fraccion).toBe(0);
    expect(progreso.loQueYaTienes).toBeNull();
    expect(progreso.loQueTeFalta).toContain('correo');
    expect(progreso.pendientes).toHaveLength(8);
  });

  it('lo saltado NO cuenta como hecho', () => {
    // Ha pasado por los cuatro primeros, pero se saltó dos.
    const progreso = comoVa({
      paso: 4,
      saltados: ['marca', 'quien_eres'],
      terminado: false,
    });

    expect(progreso.respondidos).toBe(3);
    expect(progreso.pendientes).toContain('quien_eres');
    // `marca` es el paso 5: todavía no ha llegado, y además está saltado. Sale
    // una sola vez, no dos.
    expect(progreso.pendientes.filter((p) => p === 'marca')).toHaveLength(1);
  });

  it('quien lo salta todo llega al final con cero', () => {
    const progreso = comoVa({
      paso: 8,
      saltados: [...CODIGOS_DE_PASO],
      terminado: true,
    });

    expect(progreso.respondidos).toBe(0);
    expect(progreso.fraccion).toBe(0);
    // Y aun así se le sigue diciendo qué gana si vuelve. Terminar el alta no
    // cierra la puerta a completarla: eso es lo que hace la tarjeta del Panel.
    expect(progreso.loQueTeFalta).not.toBeNull();
    expect(progreso.pendientes).toHaveLength(8);
  });

  it('quien lo responde todo tiene el alta entera y nada que ofrecerle', () => {
    const progreso = comoVa({ paso: 8, saltados: [], terminado: true });

    expect(progreso.respondidos).toBe(8);
    expect(progreso.fraccion).toBe(1);
    expect(progreso.loQueTeFalta).toBeNull();
    expect(progreso.pendientes).toEqual([]);
  });

  it('lo que se ha ganado se dice por lo mas valioso, no por el ultimo paso', () => {
    // Ha llegado hasta los objetivos, así que eso es lo que se le dice, aunque
    // el último que tocó fuera la marca.
    const hastaObjetivos = comoVa({ paso: 6, saltados: [], terminado: false });
    expect(hastaObjetivos.loQueYaTienes).toContain('rojo');

    // Y quien solo ha dicho qué tipo de local tiene, oye eso.
    const soloElTipo = comoVa({
      paso: 6,
      saltados: ['quien_eres', 'cuantos_locales', 'donde_esta', 'marca', 'fiscal_y_objetivos'],
      terminado: false,
    });
    expect(soloElTipo.loQueYaTienes).toContain('objetivos');
  });

  it('un paso saltado que ya se respondio despues deja de estar pendiente', () => {
    // Se saltó la marca, volvió y la puso: quien la puso ya no la tiene saltada,
    // porque el comando de guardar la quita de la lista. Aquí se comprueba que
    // el cálculo respeta eso y no la sigue pidiendo.
    const conMarca = comoVa({ paso: 8, saltados: [], terminado: true });
    const sinMarca = comoVa({ paso: 8, saltados: ['marca'], terminado: true });

    expect(conMarca.pendientes).not.toContain('marca');
    expect(sinMarca.pendientes).toContain('marca');
  });
});
