import { describe, expect, it } from 'vitest';
import { propuestaDeVentas } from './cierre.ts';
import {
  comoVaFrenteAlObjetivo,
  enPuntos,
  lasCifrasDelSemaforo,
  mermaSobreCompras,
  objetivoDelCostePrimo,
  type LoQueSeSabeDeLaSemana,
} from './objetivos.ts';

/**
 * El semáforo de los objetivos (entrega O, 0047).
 *
 * Verde dentro, ámbar a poco del objetivo, rojo fuera, y **sin dato** cuando no se
 * sabe: un semáforo que se pone verde por no tener datos es la mentira más cómoda.
 */

describe('el color', () => {
  it('los porcentajes: verde hasta el objetivo, ámbar tres puntos más, rojo después', () => {
    expect(comoVaFrenteAlObjetivo('materia_prima', 30, 0.3)).toBe('verde');
    expect(comoVaFrenteAlObjetivo('materia_prima', 32, 0.32)).toBe('verde'); // la coma flotante no lo tiñe
    expect(comoVaFrenteAlObjetivo('materia_prima', 30.1, 0.3)).toBe('ambar');
    expect(comoVaFrenteAlObjetivo('materia_prima', 33, 0.3)).toBe('ambar');
    expect(comoVaFrenteAlObjetivo('materia_prima', 33.2, 0.3)).toBe('rojo');
    expect(comoVaFrenteAlObjetivo('personal', 36, 0.32)).toBe('rojo');
    expect(comoVaFrenteAlObjetivo('coste_primo', 64, 0.62)).toBe('ambar');
  });

  it('la merma, con un punto de franja', () => {
    expect(comoVaFrenteAlObjetivo('merma', 4, 0.04)).toBe('verde');
    expect(comoVaFrenteAlObjetivo('merma', 5, 0.04)).toBe('ambar');
    expect(comoVaFrenteAlObjetivo('merma', 5.2, 0.04)).toBe('rojo');
  });

  it('las ventas: al revés, verde desde el objetivo y ámbar desde el 90 %', () => {
    expect(comoVaFrenteAlObjetivo('ventas_semanales', 500_000, 500_000)).toBe('verde');
    expect(comoVaFrenteAlObjetivo('ventas_semanales', 450_000, 500_000)).toBe('ambar');
    expect(comoVaFrenteAlObjetivo('ventas_semanales', 449_999, 500_000)).toBe('rojo');
  });

  it('sin dato o sin objetivo no hay color, y nunca es verde', () => {
    expect(comoVaFrenteAlObjetivo('materia_prima', null, 0.3)).toBe('sin_dato');
    expect(comoVaFrenteAlObjetivo('ventas_semanales', 100, null)).toBe('sin_dato');
    expect(comoVaFrenteAlObjetivo('ventas_semanales', 100, 0)).toBe('sin_dato');
  });
});

describe('las cuentas', () => {
  it('el coste primo es la suma de los dos objetivos, y sin uno no hay', () => {
    expect(objetivoDelCostePrimo(0.32, 0.3)).toBeCloseTo(0.62);
    expect(objetivoDelCostePrimo(0.32, null)).toBeNull();
  });

  it('la merma se mide sobre lo comprado, y sin compras no se sabe', () => {
    expect(mermaSobreCompras(2_000, 20_000)).toBe(10);
    expect(mermaSobreCompras(2_000, 0)).toBeNull();
  });

  it('los puntos se leen sin decimales que sobren', () => {
    expect(enPuntos(32)).toBe('32 %');
    expect(enPuntos(32.44)).toBe('32,4 %');
  });

  it('la propuesta de ventas: la media de cuatro semanas, a 50 €; con menos, nada', () => {
    expect(propuestaDeVentas([400_000, 420_000, 410_000, 430_000])).toBe(415_000);
    expect(propuestaDeVentas([400_000, 0, 410_000])).toBeNull();
  });
});

describe('las cifras, con su porqué', () => {
  const semana: LoQueSeSabeDeLaSemana = {
    diasConCaja: 7,
    ventas: 1_000_000,
    genero: 330_000,
    personal: 300_000,
    sinSalario: 0,
    merma: 5_000,
    compras: 100_000,
    ventasDeAntes: 900_000,
    masPesa: { nombre: 'merluza', centimos: 80_000 },
    masSeTira: { nombre: 'pulpo', centimos: 3_000 },
  };
  const objetivos = {
    materia_prima: 0.3,
    personal: 0.3,
    merma: 0.04,
    ventas_semanales: 1_200_000,
  };

  it('cada una con su color, su cifra y de dónde sale', () => {
    const [genero, personal, primo, merma, ventas] = lasCifrasDelSemaforo(semana, objetivos);
    expect(genero).toMatchObject({ valor: 33, semaforo: 'ambar', valorEnTexto: '33 %' });
    expect(genero?.porque.join(' ')).toContain('merluza');
    expect(personal).toMatchObject({ valor: 30, semaforo: 'verde' });
    expect(primo).toMatchObject({ valor: 63, semaforo: 'ambar', objetivoEnTexto: 'objetivo 60 %' });
    expect(merma).toMatchObject({ valor: 5, semaforo: 'ambar' });
    expect(merma?.porque.join(' ')).toContain('pulpo');
    expect(ventas).toMatchObject({ semaforo: 'rojo' });
    expect(ventas?.porque).toContain('La semana anterior, 9.000,00 €.');
  });

  it('una semana sin cajas: ni food cost ni personal, y el botón de cerrar la caja', () => {
    const [genero, personal, primo] = lasCifrasDelSemaforo(
      { ...semana, diasConCaja: 0, ventas: 0 },
      objetivos,
    );
    expect(genero).toMatchObject({ valor: null, semaforo: 'sin_dato' });
    expect(genero?.queHacer?.texto).toBe('Cerrar la caja');
    expect(personal?.semaforo).toBe('sin_dato');
    expect(primo?.semaforo).toBe('sin_dato');
  });

  it('gente fichando sin salario: se dice, y si no cobra nadie no hay cifra', () => {
    const [, conFaltas] = lasCifrasDelSemaforo({ ...semana, sinSalario: 2 }, objetivos);
    expect(conFaltas?.porque.join(' ')).toContain('2 personas fichan sin lo que cobran');
    const [, nadie] = lasCifrasDelSemaforo({ ...semana, personal: 0, sinSalario: 3 }, objetivos);
    expect(nadie).toMatchObject({ valor: null, semaforo: 'sin_dato' });
    expect(nadie?.queHacer?.texto).toBe('Ponerlo en Equipo');
  });

  it('pocos días con caja se dicen, para no leer una semana entera donde no la hay', () => {
    const [genero] = lasCifrasDelSemaforo({ ...semana, diasConCaja: 3 }, objetivos);
    expect(genero?.porque[0]).toContain('en 3 días con caja');
  });
});
