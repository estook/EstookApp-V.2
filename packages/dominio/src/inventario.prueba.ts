import { describe, expect, it } from 'vitest';
import { cantidad, costePorUnidadDeUso, milesimas, valorDeLasExistencias } from './coste.ts';
import { centimos } from './dinero.ts';
import { fechaOperativa, masDias } from './tiempo.ts';
import {
  CAMARA_VACIA,
  DIAS_MINIMOS_PARA_PREDECIR,
  ajusteHasta,
  comoEsta,
  comoHaCambiado,
  consumoMedioDiario,
  diaDeAgotamiento,
  diasDeCobertura,
  pedidoRecomendado,
  previsionDeAgotamiento,
  reconstruir,
  siguienteEstado,
  urgenciaDe,
  type Movimiento,
} from './inventario.ts';

/**
 * El motor de inventario (M6).
 *
 * Las cuatro primeras secciones son los cuatro criterios de terminado del
 * módulo, en el mismo orden en que los escribe el Plan.
 */

describe('el libro de movimientos', () => {
  it('una entrada sobre la cámara vacía deja el precio de lo que ha entrado', () => {
    const despues = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(5000),
      coste: milesimas(200),
    });

    expect(despues.cantidad).toBe(5000);
    expect(despues.coste).toBe(200);
  });

  it('una segunda entrada pondera, y no pisa el precio anterior', () => {
    const primera = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(1000),
      coste: milesimas(100),
    });
    const segunda = siguienteEstado(primera, {
      tipo: 'entrada',
      cantidad: cantidad(1000),
      coste: milesimas(200),
    });

    // Mil a 100 y mil a 200 son dos mil a 150. Si saliera 200, el margen de
    // todos los platos saltaria cada vez que llega un albaran caro.
    expect(segunda.cantidad).toBe(2000);
    expect(segunda.coste).toBe(150);
  });

  it('una salida no toca el precio medio', () => {
    const conStock = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(1000),
      coste: milesimas(150),
    });
    const despues = siguienteEstado(conStock, { tipo: 'salida', cantidad: cantidad(-300) });

    expect(despues.cantidad).toBe(700);
    expect(despues.coste).toBe(150);
  });

  it('una entrada sin precio deja el que habia', () => {
    const conStock = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(1000),
      coste: milesimas(150),
    });
    const despues = siguienteEstado(conStock, { tipo: 'entrada', cantidad: cantidad(500) });

    expect(despues.cantidad).toBe(1500);
    expect(despues.coste).toBe(150);
  });

  it('el stock negativo se permite', () => {
    const conStock = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(2),
      coste: milesimas(500),
    });
    const despues = siguienteEstado(conStock, { tipo: 'salida', cantidad: cantidad(-5) });

    expect(despues.cantidad).toBe(-3);
  });

  it('y entrar genero sobre una camara en negativo NO pondera: manda el precio nuevo', () => {
    // Es la fila del medio de la tabla del fichero, y la razon de que este
    // motor exista. Ponderar con -3 daria un precio medio disparatado, y ese
    // numero acabaria dentro del coste de un plato.
    const enNegativo = siguienteEstado(CAMARA_VACIA, {
      tipo: 'salida',
      cantidad: cantidad(-3),
    });
    expect(enNegativo.cantidad).toBe(-3);

    const despues = siguienteEstado(enNegativo, {
      tipo: 'entrada',
      cantidad: cantidad(10),
      coste: milesimas(400),
    });

    expect(despues.cantidad).toBe(7);
    expect(despues.coste).toBe(400);
  });

  it('«hay 4 kg» se convierte en la diferencia, no en una sobreescritura', () => {
    expect(ajusteHasta(cantidad(6.2), cantidad(4))).toBe(-2.2);
    expect(ajusteHasta(cantidad(1), cantidad(4))).toBe(3);
  });

  it('y un ajuste que no cambia nada no se apunta', () => {
    expect(ajusteHasta(cantidad(4), cantidad(4))).toBeNull();
  });
});

describe('al cambiar el precio, con factor y rendimiento distintos de 1', () => {
  // El segundo criterio de terminado de M6, literal: «al cambiar el precio, el
  // coste por unidad de uso y el medio ponderado cambian bien en un producto
  // con factor y rendimiento distintos de 1».
  //
  // Pulpo congelado: caja de 5 kg, o sea 5.000 g, con un 55 % de rendimiento
  // porque se le va la cabeza, la piel y el agua de la coccion.
  const conversion = { factor: 5000, rendimiento: 0.55 };

  it('el coste por unidad de uso sale de precio ÷ (factor × rendimiento)', () => {
    // 60 € la caja: 6.000 centimos entre 2.750 g utiles = 2,18 centimos/g,
    // que en milesimas son 2.182.
    const antes = costePorUnidadDeUso(centimos(6000), conversion);
    expect(antes).toBe(2182);

    // Sube a 72 €, que es un 20 % mas.
    const despues = costePorUnidadDeUso(centimos(7200), conversion);
    expect(despues).toBe(2618);

    // Y el coste por gramo sube exactamente ese 20 %, no otra cosa.
    expect(comoHaCambiado(antes, despues).variacion).toBeCloseTo(0.2, 3);
  });

  it('y el precio medio ponderado se mueve solo en la parte que toca', () => {
    // Entra una caja al precio viejo.
    const primera = siguienteEstado(CAMARA_VACIA, {
      tipo: 'entrada',
      cantidad: cantidad(2750),
      coste: costePorUnidadDeUso(centimos(6000), conversion),
    });
    expect(primera.coste).toBe(2182);

    // Y despues otra al nuevo. Mitad y mitad: la media de 2.182 y 2.618.
    const segunda = siguienteEstado(primera, {
      tipo: 'entrada',
      cantidad: cantidad(2750),
      coste: costePorUnidadDeUso(centimos(7200), conversion),
    });

    expect(segunda.cantidad).toBe(5500);
    expect(segunda.coste).toBe(2400);

    // Lo que vale la camara, ya en dinero: 5.500 g a 2,4 centimos = 132 €.
    expect(valorDeLasExistencias(segunda)).toBe(13200);
  });

  it('el precio del formato NUNCA se usa como coste de uso', () => {
    // «El precio del formato no costea nunca» (Manifiesto 12). 60 € la caja no
    // son 60 centimos el gramo, y confundirlo es la primera causa de
    // escandallos falsos.
    const precioDelFormato = centimos(6000);
    const costeDeUso = costePorUnidadDeUso(precioDelFormato, conversion);
    expect(costeDeUso).toBeLessThan(precioDelFormato);
  });
});

describe('reconstruir el stock desde los movimientos', () => {
  // El tercer criterio de terminado: «el stock se reconstruye entero desde los
  // movimientos».
  const libro: Movimiento[] = [
    { tipo: 'entrada', cantidad: cantidad(5000), coste: milesimas(392) },
    { tipo: 'salida', cantidad: cantidad(-1200) },
    { tipo: 'entrada', cantidad: cantidad(5000), coste: milesimas(450) },
    { tipo: 'ajuste', cantidad: cantidad(-140) },
    { tipo: 'salida', cantidad: cantidad(-900) },
    { tipo: 'entrada', cantidad: cantidad(10000), coste: milesimas(410) },
  ];

  it('da el mismo resultado que ir apuntando uno a uno', () => {
    const deGolpe = reconstruir(libro);

    let unoAUno = CAMARA_VACIA;
    const apuntados = libro.map((m) => {
      unoAUno = siguienteEstado(unoAUno, m);
      return unoAUno;
    });

    expect(deGolpe).toEqual(apuntados);
  });

  it('y reconstruirlo dos veces da exactamente lo mismo', () => {
    // «Reconstruir los agregados desde cero da exactamente los mismos numeros»
    // (Auditoria, parte 8). Sin esto, cuadrar un inventario seria una loteria.
    expect(reconstruir(libro)).toEqual(reconstruir(libro));
  });

  it('el ultimo estado del libro es lo que hay hoy en camara', () => {
    const estados = reconstruir(libro);
    const ultimo = estados[estados.length - 1];

    expect(ultimo?.cantidad).toBe(17760);
    // Y el coste es el ponderado de las tres entradas, no el de la ultima.
    expect(ultimo?.coste).toBeGreaterThan(392);
    expect(ultimo?.coste).toBeLessThan(450);
  });

  it('un libro vacio es una camara vacia, no un fallo', () => {
    expect(reconstruir([])).toEqual([]);
  });
});

describe('la prevision de agotamiento', () => {
  // El cuarto criterio: «la prevision de agotamiento acierta el dia en un
  // producto con consumo estable».
  const hoy = fechaOperativa('2026-09-03');
  // El instante viene de fuera, nunca de un reloj: es la regla 10, y ademas
  // hace que estas pruebas den lo mismo en enero que en agosto.
  const UN_INSTANTE = new Date('2026-09-03T10:00:00Z');

  function salidasEstables(cuantosDias: number, cuanto: number) {
    return Array.from({ length: cuantosDias }, (_, i) => ({
      fecha: masDias(hoy, -(cuantosDias - i)),
      cantidad: cuanto,
    }));
  }

  it('con un consumo estable de 3,1 kg al dia y 4,2 kg en camara, acierta el dia', () => {
    // Es el ejemplo del Manifiesto, con sus cifras: pollo, 4,2 kg, 3,1 al dia.
    const consumo = consumoMedioDiario(salidasEstables(28, 3.1), masDias(hoy, -28), hoy, 28);
    expect(consumo.porDia).toBeCloseTo(3.1, 4);

    // 4,2 / 3,1 = 1,35 dias: se agota manana.
    expect(diasDeCobertura(4.2, consumo.porDia)).toBeCloseTo(1.35, 2);
    expect(diaDeAgotamiento(4.2, consumo.porDia, hoy)).toBe('2026-09-04');
  });

  it('y da la hora, no solo el dia', () => {
    const ahora = new Date('2026-09-03T10:00:00Z');
    const cuando = previsionDeAgotamiento(4.2, 3.1, ahora);

    expect(cuando).not.toBeNull();
    // 1,35 dias son 32 h 24 min: el 4 por la tarde.
    expect(cuando?.toISOString()).toBe('2026-09-04T18:24:00.000Z');
  });

  it('con quince dias de cobertura acierta el dia quince, no el catorce', () => {
    const consumo = consumoMedioDiario(salidasEstables(28, 2), masDias(hoy, -28), hoy, 28);
    expect(consumo.porDia).toBe(2);
    expect(diaDeAgotamiento(30, consumo.porDia, hoy)).toBe('2026-09-18');
  });

  it('con poca historia NO se inventa una cifra, y dice por que', () => {
    const consumo = consumoMedioDiario(salidasEstables(3, 3.1), masDias(hoy, -28), hoy, 3);

    expect(consumo.porDia).toBeNull();
    expect(consumo.diasMirados).toBe(3);
    expect(consumo.porque).toContain(String(DIAS_MINIMOS_PARA_PREDECIR));
    expect(previsionDeAgotamiento(4.2, consumo.porDia, UN_INSTANTE)).toBeNull();
  });

  it('sin ninguna salida tampoco se inventa nada', () => {
    const consumo = consumoMedioDiario([], masDias(hoy, -28), hoy, 28);
    expect(consumo.porDia).toBeNull();
    expect(consumo.porque).toContain('No ha salido nada');
  });

  it('el consumo se reparte entre TODOS los dias, no solo los que tuvieron salida', () => {
    // Catorce dias de historia y salidas solo siete: 3,1 al dia esos siete son
    // 1,55 de media. Si se dividiera entre los dias con movimiento saldria 3,1,
    // y la prevision avisaria el doble de pronto de lo que toca.
    const soloUnaSemana = salidasEstables(14, 3.1).filter((_, i) => i % 2 === 0);
    const consumo = consumoMedioDiario(soloUnaSemana, masDias(hoy, -14), hoy, 14);
    expect(consumo.porDia).toBeCloseTo(1.55, 3);
  });

  it('deja fuera lo que cae antes de la ventana', () => {
    const viejas = [{ fecha: masDias(hoy, -90), cantidad: 500 }];
    const consumo = consumoMedioDiario(viejas, masDias(hoy, -28), hoy, 28);
    expect(consumo.porDia).toBeNull();
  });

  it('con el stock en negativo, la cobertura es cero y no un numero raro', () => {
    expect(diasDeCobertura(-3, 2)).toBe(0);
    expect(diasDeCobertura(0, 2)).toBe(0);
  });
});

describe('como esta un producto', () => {
  it('distingue los cinco estados', () => {
    expect(comoEsta(-2, 5)).toBe('negativo');
    expect(comoEsta(0, 5)).toBe('agotado');
    expect(comoEsta(3, 5)).toBe('bajo_minimo');
    expect(comoEsta(9, 5)).toBe('bien');
    expect(comoEsta(9, null)).toBe('sin_minimo');
  });

  it('«no se» y «esta bien» no son lo mismo', () => {
    // Un producto sin minimo puesto no puede salir en verde: nadie ha dicho
    // cuanto hace falta tener.
    expect(comoEsta(1, null)).not.toBe('bien');
  });

  it('ordena primero lo peor', () => {
    const estados = (['bien', 'negativo', 'sin_minimo', 'agotado', 'bajo_minimo'] as const)
      .slice()
      .sort((a, b) => urgenciaDe(a) - urgenciaDe(b));

    expect(estados).toEqual(['negativo', 'agotado', 'bajo_minimo', 'sin_minimo', 'bien']);
  });
});

describe('la sugerencia de pedido', () => {
  it('dice cuanto y por que', () => {
    const sugerencia = pedidoRecomendado(4.2, 3.1);
    // Cinco dias a 3,1 son 15,5; hay 4,2; faltan 11,3.
    expect(sugerencia?.cuanto).toBeCloseTo(11.3, 2);
    expect(sugerencia?.motivo).toContain('5 días de cobertura');
  });

  it('no sugiere nada si ya hay de sobra', () => {
    expect(pedidoRecomendado(100, 3.1)).toBeNull();
  });

  it('no sugiere nada si no sabe a que ritmo se gasta', () => {
    // Una recomendacion sin base es peor que ninguna.
    expect(pedidoRecomendado(4.2, null)).toBeNull();
  });
});

describe('cuanto ha cambiado un precio', () => {
  it('cuenta la subida en su frase', () => {
    const cambio = comoHaCambiado(100, 112);
    expect(cambio.subeBaja).toBe('sube');
    expect(cambio.variacion).toBeCloseTo(0.12, 4);
    expect(cambio.frase).toBe('Ha subido un 12 %.');
  });

  it('y la bajada', () => {
    expect(comoHaCambiado(100, 90).frase).toBe('Ha bajado un 10 %.');
  });

  it('el primer precio no es una subida del infinito por ciento', () => {
    const cambio = comoHaCambiado(null, 500);
    expect(cambio.subeBaja).toBe('primero');
    expect(cambio.variacion).toBeNull();
  });

  it('el mismo precio no cuenta como cambio', () => {
    expect(comoHaCambiado(500, 500).subeBaja).toBe('igual');
  });
});
