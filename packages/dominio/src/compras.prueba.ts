import { describe, expect, it } from 'vitest';
import {
  comoSeLePide,
  comoSePide,
  comoVaElMinimo,
  precioPorFormato,
  conciliar,
  cuandoCae,
  cuantoPedir,
  enlaceDeCorreo,
  enlaceDeWhatsApp,
  importeEstimado,
  incidenciasDe,
  lineaRecibida,
  numeroParaWhatsApp,
  proximoReparto,
  puntualidad,
  quienLoDejaMejor,
  textoDelPedido,
  totalDelPedido,
} from './compras.ts';
import { diaDeLaSemana, fechaOperativa, horaEnElLocal } from './tiempo.ts';

/**
 * El motor de compras (M7).
 *
 * El 11 de septiembre de 2026 es **viernes**, y las pruebas se leen mejor sabiéndolo:
 * un proveedor que reparte martes y viernes, pedido «hoy para mañana» antes de las
 * ocho de la tarde.
 */
const VIERNES = fechaOperativa('2026-09-11');
const MAKRO = { dias: [2, 5], plazo: 1, horaLimite: '20:00' } as const;

describe('el día de la semana y la hora del local', () => {
  it('el 11 de septiembre de 2026 es viernes, y el 13 domingo', () => {
    expect(diaDeLaSemana(VIERNES)).toBe(5);
    expect(diaDeLaSemana(fechaOperativa('2026-09-13'))).toBe(7);
    expect(diaDeLaSemana(fechaOperativa('2026-09-14'))).toBe(1);
  });

  it('la hora es la del reloj de pared del local, no la del servidor', () => {
    // A las 18:30 en UTC son las 20:30 en Madrid en verano.
    expect(horaEnElLocal(new Date('2026-09-11T18:30:00Z'), 'Europe/Madrid')).toBe('20:30');
    expect(horaEnElLocal(new Date('2026-09-11T18:30:00Z'), 'Atlantic/Canary')).toBe('19:30');
  });
});

describe('el próximo reparto', () => {
  it('un viernes por la mañana, lo que se pide llega el martes, y el reparto de después es el viernes', () => {
    // El viernes es día de reparto, pero con plazo de un día había que haberlo
    // pedido el jueves. El siguiente al que se llega es el martes, pidiéndolo el
    // lunes.
    const reparto = proximoReparto(MAKRO, VIERNES, '10:00');
    expect(reparto).toEqual({
      llega: '2026-09-15',
      pedirEl: '2026-09-14',
      pedirAntesDe: '20:00',
      siguiente: '2026-09-18',
    });
  });

  it('un lunes antes de la hora límite, se llega al martes pidiendo hoy', () => {
    const lunes = fechaOperativa('2026-09-14');
    expect(proximoReparto(MAKRO, lunes, '19:59')?.pedirEl).toBe(lunes);
    expect(proximoReparto(MAKRO, lunes, '19:59')?.llega).toBe('2026-09-15');
  });

  it('y pasada la hora límite ya no: se va al viernes', () => {
    const lunes = fechaOperativa('2026-09-14');
    const reparto = proximoReparto(MAKRO, lunes, '20:00');
    expect(reparto?.llega).toBe('2026-09-18');
    expect(reparto?.pedirEl).toBe('2026-09-17');
  });

  it('sin hora límite se puede pedir a cualquier hora del día', () => {
    const lunes = fechaOperativa('2026-09-14');
    expect(proximoReparto({ ...MAKRO, horaLimite: null }, lunes, '23:59')?.llega).toBe(
      '2026-09-15',
    );
  });

  it('el panadero que viene cada mañana y se le pide el mismo día', () => {
    const todos = { dias: [1, 2, 3, 4, 5, 6, 7], plazo: 0, horaLimite: '07:00' };
    expect(proximoReparto(todos, VIERNES, '06:30')?.llega).toBe(VIERNES);
    expect(proximoReparto(todos, VIERNES, '08:00')?.llega).toBe('2026-09-12');
    expect(proximoReparto(todos, VIERNES, '06:30')?.siguiente).toBe('2026-09-12');
  });

  it('sin días de reparto no se inventa uno', () => {
    expect(proximoReparto({ dias: [], plazo: 1, horaLimite: null }, VIERNES, '10:00')).toBeNull();
  });

  it('con un solo día a la semana, el siguiente es la semana que viene', () => {
    const soloMartes = { dias: [2], plazo: 2, horaLimite: null };
    const reparto = proximoReparto(soloMartes, VIERNES, '10:00');
    expect(reparto?.llega).toBe('2026-09-15');
    expect(reparto?.siguiente).toBe('2026-09-22');
  });
});

describe('cómo se dice una fecha cercana', () => {
  it('hoy, mañana, el día de la semana y, lejos, con su número', () => {
    expect(cuandoCae(VIERNES, VIERNES)).toBe('hoy');
    expect(cuandoCae(fechaOperativa('2026-09-12'), VIERNES)).toBe('mañana');
    expect(cuandoCae(fechaOperativa('2026-09-15'), VIERNES)).toBe('el martes');
    expect(cuandoCae(fechaOperativa('2026-09-22'), VIERNES)).toBe('el martes 22 de septiembre');
    expect(cuandoCae(fechaOperativa('2026-09-10'), VIERNES)).toBe('ayer');
  });
});

describe('cuánto pedir', () => {
  const pollo = {
    existencias: 4.2,
    consumoPorDia: 3.1,
    minimo: null,
    factor: 5,
    unidadDeUso: 'kg',
  };

  it('cuenta hasta el reparto de después, con un 20 % de margen, en cajas enteras', () => {
    // Del viernes al martes son 4 días, y del martes al viernes 3: siete días a
    // 3,1 kg son 21,7 kg, con el margen 26,04. Hay 4,2: faltan 21,84, que en
    // cajas de 5 kg son cinco cajas.
    const sugerencia = cuantoPedir(pollo, {
      hoy: VIERNES,
      llega: fechaOperativa('2026-09-15'),
      siguiente: fechaOperativa('2026-09-18'),
    });
    expect(sugerencia?.formatos).toBe(5);
    expect(sugerencia?.cuanto).toBe(25);
    // El reparto siguiente cae dentro de una semana justa: un viernes, dicho un
    // viernes, lleva su número para que no se entienda «hoy».
    expect(sugerencia?.motivo).toBe(
      'Llega el martes y el reparto siguiente es el viernes 18 de septiembre: 7 días a 3,1 kg al día, con un 20 % de margen.',
    );
  });

  it('sin días de reparto, calcula para cinco días y dice por qué', () => {
    // Cinco días a 3,1 con el margen son 18,6; hay 4,2; faltan 14,4: tres cajas.
    const sugerencia = cuantoPedir(pollo, null);
    expect(sugerencia?.formatos).toBe(3);
    expect(sugerencia?.motivo).toContain('unos 5 días');
    expect(sugerencia?.motivo).toContain('días de reparto');
  });

  it('no sugiere nada si ya hay de sobra', () => {
    expect(cuantoPedir({ ...pollo, existencias: 100 }, null)).toBeNull();
  });

  it('no sugiere nada si no sabe a qué ritmo se gasta y no hay mínimo', () => {
    // Una recomendación sin base es peor que ninguna.
    expect(cuantoPedir({ ...pollo, consumoPorDia: null }, null)).toBeNull();
  });

  it('sin saber el ritmo, pero por debajo del mínimo, sugiere llegar al mínimo', () => {
    const sugerencia = cuantoPedir({ ...pollo, consumoPorDia: null, minimo: 12 }, null);
    // Faltan 7,8 kg para el mínimo: dos cajas.
    expect(sugerencia?.formatos).toBe(2);
    expect(sugerencia?.motivo).toContain('mínimo que pusiste (12 kg)');
  });

  it('con mínimo puesto, lo que llegue deja al menos el mínimo el día que llega', () => {
    // Hasta el martes se gastan 12,4 kg; con un mínimo de 30 hacen falta 42,4, y
    // eso manda sobre los 26 que salen del ciclo.
    const sugerencia = cuantoPedir(
      { ...pollo, minimo: 30 },
      {
        hoy: VIERNES,
        llega: fechaOperativa('2026-09-15'),
        siguiente: fechaOperativa('2026-09-18'),
      },
    );
    expect(sugerencia?.formatos).toBe(8);
  });

  it('una cuenta exacta no pide una caja de más por la coma flotante', () => {
    // 3 × 10 / 10 no puede acabar en 4 cajas.
    const exacto = cuantoPedir(
      { existencias: 0, consumoPorDia: 5, minimo: null, factor: 10, unidadDeUso: 'kg' },
      {
        hoy: VIERNES,
        llega: fechaOperativa('2026-09-12'),
        siguiente: fechaOperativa('2026-09-16'),
      },
    );
    // Uno más cuatro son cinco días a 5 kg con el margen: 30 kg, tres cajas justas.
    expect(exacto?.formatos).toBe(3);
  });

  it('con la cámara en negativo pide también lo que se debe', () => {
    const debe = cuantoPedir({ ...pollo, existencias: -3 }, null);
    expect(debe?.formatos).toBe(5);
  });

  it('dice cómo se pide: cajas, o la cantidad si no hay formato', () => {
    expect(comoSePide(3, 'Caja 10 kg', 10, 'kg')).toBe('3 × Caja 10 kg');
    expect(comoSePide(2, null, 1, 'kg')).toBe('2 kg');
    expect(comoSePide(1.5, 'Garrafa 5 l', 5, 'l')).toBe('1,5 × Garrafa 5 l');
  });
});

describe('lo que se espera pagar y el pedido mínimo', () => {
  it('suma lo que tiene precio y cuenta lo que no', () => {
    const total = totalDelPedido([
      { cantidad: 3, precioCentimos: 1600 },
      { cantidad: 2, precioCentimos: 4250 },
      { cantidad: 1, precioCentimos: null },
    ]);
    expect(total).toEqual({ total: 13_300, sinPrecio: 1 });
    expect(importeEstimado(2.5, 1000)).toBe(2500);
    expect(importeEstimado(2, null)).toBeNull();
  });

  it('avisa de lo que falta para el mínimo, con los portes', () => {
    const va = comoVaElMinimo({ total: 12_660 as never, sinPrecio: 0 }, 15_000, 1200);
    expect(va?.llega).toBe(false);
    expect(va?.falta).toBe(2340);
    expect(va?.frase).toBe(
      'Faltan 23,40 € para el pedido mínimo (150,00 €): si no, son 12,00 € de portes.',
    );
  });

  it('y dice que llega cuando llega, sin contar lo que no tiene precio', () => {
    const va = comoVaElMinimo({ total: 20_000 as never, sinPrecio: 2 }, 15_000, null);
    expect(va?.llega).toBe(true);
    expect(va?.frase).toContain('Sin contar 2 productos sin precio');
  });

  it('sin mínimo no hay nada que decir', () => {
    expect(comoVaElMinimo({ total: 100 as never, sinPrecio: 0 }, null, 500)).toBeNull();
  });
});

describe('el pedido escrito para mandarlo', () => {
  const pedido = {
    numero: 23,
    local: 'Bar Centro',
    contacto: 'Juan',
    llega: fechaOperativa('2026-09-15'),
    hoy: VIERNES,
    lineas: [
      {
        producto: 'Tomate pera',
        cantidad: 3,
        formato: 'Caja 10 kg',
        factor: 10,
        unidadDeUso: 'kg',
      },
      {
        producto: 'Merluza',
        cantidad: 2,
        formato: 'Pieza',
        factor: 1,
        unidadDeUso: 'kg',
        nota: 'que sean grandes',
      },
    ],
    notas: 'Dejadlo por la puerta de atrás.',
  };

  it('saluda, dice para cuándo, cada línea con su caja, las notas y el número', () => {
    expect(textoDelPedido(pedido)).toBe(
      [
        'Hola, Juan. Soy de Bar Centro.',
        'Os hago un pedido para el martes, por favor:',
        '',
        '· 3 × Caja 10 kg de Tomate pera',
        '· 2 × Pieza de Merluza (que sean grandes)',
        '',
        'Dejadlo por la puerta de atrás.',
        '',
        'Gracias. Pedido 23.',
      ].join('\n'),
    );
  });

  it('no lleva ni un precio', () => {
    expect(textoDelPedido(pedido)).not.toMatch(/€/);
  });

  it('sin contacto ni fecha, saluda en general', () => {
    const texto = textoDelPedido({ ...pedido, contacto: null, llega: null, notas: null });
    expect(texto.startsWith('Hola. Soy de Bar Centro.\nOs hago un pedido, por favor:')).toBe(true);
    // Y sin exclamaciones: el tono de Estook es sereno.
    expect(texto).not.toMatch(/[!¡]/);
  });
});

describe('WhatsApp y el correo', () => {
  it('entiende los teléfonos como se escriben', () => {
    expect(numeroParaWhatsApp('612 34 56 78')).toBe('34612345678');
    expect(numeroParaWhatsApp('+34 612-345-678')).toBe('34612345678');
    expect(numeroParaWhatsApp('0034612345678')).toBe('34612345678');
    expect(numeroParaWhatsApp('+351 912 345 678')).toBe('351912345678');
    expect(numeroParaWhatsApp('928 12 34 56')).toBe('34928123456');
  });

  it('y dice que no cuando no es un teléfono', () => {
    expect(numeroParaWhatsApp(null)).toBeNull();
    expect(numeroParaWhatsApp('')).toBeNull();
    expect(numeroParaWhatsApp('1234')).toBeNull();
  });

  it('los enlaces llevan el texto escapado', () => {
    expect(enlaceDeWhatsApp('34612345678', 'Hola, Juan.\n· 3 × Caja')).toBe(
      'https://wa.me/34612345678?text=Hola%2C%20Juan.%0A%C2%B7%203%20%C3%97%20Caja',
    );
    expect(enlaceDeCorreo('pedidos@makro.es', 'Pedido 23', 'Hola')).toBe(
      'mailto:pedidos%40makro.es?subject=Pedido%2023&body=Hola',
    );
  });
});

describe('lo que ha llegado', () => {
  it('lo normal: cajas por su precio, y el coste por unidad de uso con el rendimiento', () => {
    const linea = lineaRecibida({
      pesoVariable: false,
      factor: 10,
      rendimiento: 0.9,
      formatos: 3,
      precioFormatoCentimos: 1600,
    });
    expect(linea.cantidadDeUso).toBe(30);
    expect(linea.importeCentimos).toBe(4800);
    // 16 € / (10 kg × 0,9) = 1,7778 €/kg, en milésimas de céntimo.
    expect(linea.costeMilesimas).toBe(177_778);
  });

  it('sin precio, entra igual y sin valorar', () => {
    const linea = lineaRecibida({ pesoVariable: false, factor: 5, rendimiento: 1, formatos: 2 });
    expect(linea.cantidadDeUso).toBe(10);
    expect(linea.importeCentimos).toBeNull();
    expect(linea.costeMilesimas).toBeNull();
  });

  it('el peso variable: los kilos reales y lo que cobra la línea, y el coste por kilo real', () => {
    // «5,4 kg · 67,50 €»: el kilo sale a 12,50 €, no al precio de una caja nominal.
    const linea = lineaRecibida({
      pesoVariable: true,
      factor: 5,
      rendimiento: 1,
      formatos: 2,
      cantidadDeUso: 5.4,
      importeCentimos: 6750,
    });
    expect(linea.cantidadDeUso).toBe(5.4);
    expect(linea.importeCentimos).toBe(6750);
    expect(linea.costeMilesimas).toBe(1_250_000);
    // Y la caja nominal de 5 kg a ese precio, para el histórico del producto.
    expect(linea.precioFormatoCentimos).toBe(6250);
  });
});

describe('lo que no cuadra al recibir', () => {
  const base = { pesoVariable: false, rechazada: false, precioEsperado: 1600, precioCobrado: 1600 };

  it('entero no tiene incidencias', () => {
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 3 })).toEqual([]);
  });

  it('menos, más, otro precio, rechazado y lo que no se pidió', () => {
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 2 })).toEqual(['falta']);
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 4 })).toEqual(['sobra']);
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 3, precioCobrado: 1750 })).toEqual([
      'precio',
    ]);
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 0, rechazada: true })).toEqual([
      'rechazado',
    ]);
    expect(incidenciasDe({ ...base, pedida: null, recibida: 1 })).toEqual(['no_pedido']);
  });

  it('el peso variable no compara kilos con piezas, pero sí dice si no ha venido', () => {
    const merluza = { ...base, pesoVariable: true, pedida: 2 };
    expect(incidenciasDe({ ...merluza, recibida: 5.4 })).toEqual([]);
    expect(incidenciasDe({ ...merluza, recibida: 0 })).toEqual(['falta']);
  });

  it('sin precio en un lado no es una incidencia de precio', () => {
    expect(incidenciasDe({ ...base, pedida: 3, recibida: 3, precioEsperado: null })).toEqual([]);
  });
});

describe('la factura contra sus albaranes', () => {
  const albaran = (importes: (number | null)[], tipo: 'entrega' | 'devolucion' = 'entrega') => ({
    tipo,
    lineas: importes.map((importeCentimos) => ({
      importeCentimos,
      importeFacturadoCentimos: null,
    })),
  });

  it('una factura con tres albaranes que cuadra', () => {
    const c = conciliar('factura', 41_230, [
      albaran([10_000, 5_000]),
      albaran([20_000]),
      albaran([6_230]),
    ]);
    expect(c.estado).toBe('conciliada');
    expect(c.diferenciaCentimos).toBe(0);
    expect(c.frase).toBe('Cuadra: los 3 albaranes suman 412,30 €, lo mismo que la factura.');
  });

  it('y con una diferencia: conciliada, con la diferencia señalada', () => {
    // Es el criterio de terminado de M7, dicho con cifras.
    const c = conciliar('factura', 41_880, [
      albaran([10_000, 5_000]),
      albaran([20_000]),
      albaran([6_230]),
    ]);
    expect(c.estado).toBe('con_diferencia');
    expect(c.diferenciaCentimos).toBe(650);
    expect(c.frase).toBe(
      'La factura dice 418,80 € y los 3 albaranes suman 412,30 €: te cobran 6,50 € de más.',
    );
  });

  it('lo que dice la factura de una línea manda sobre lo que decía el albarán', () => {
    const corregido = {
      tipo: 'entrega' as const,
      lineas: [{ importeCentimos: 4200, importeFacturadoCentimos: 4500 }],
    };
    expect(conciliar('factura', 4500, [corregido]).estado).toBe('conciliada');
  });

  it('una línea sin ningún precio no deja conciliar sin decirlo', () => {
    const c = conciliar('factura', 10_000, [albaran([10_000, null])]);
    expect(c.estado).toBe('con_diferencia');
    expect(c.sinPrecio).toBe(1);
    expect(c.frase).toContain('Hay una línea sin precio');
  });

  it('una factura resta las devoluciones, y un abono las cuenta en positivo', () => {
    const entrega = albaran([10_000]);
    const devolucion = albaran([1_500], 'devolucion');
    expect(conciliar('factura', 8_500, [entrega, devolucion]).estado).toBe('conciliada');
    expect(conciliar('abono', 1_500, [devolucion]).estado).toBe('conciliada');
  });

  it('sin albaranes no concilia nada', () => {
    const c = conciliar('factura', 1000, []);
    expect(c.estado).toBe('con_diferencia');
    expect(c.frase).toBe('No hay albaranes con los que comparar la factura.');
  });
});

describe('quién te lo deja mejor', () => {
  const aceite = [
    { proveedorId: 'makro', proveedor: 'Makro', costeMilesimas: 850 },
    { proveedorId: 'paco', proveedor: 'Aceites Paco', costeMilesimas: 780 },
  ];

  it('se compara por unidad de uso y el ahorro se dice en euros al mes', () => {
    // 0,07 céntimos menos por ml, a 320 ml al día: 6,72 € al mes.
    const c = quienLoDejaMejor(aceite, 'makro', 320, 'ml');
    expect(c?.mejor.proveedor).toBe('Aceites Paco');
    expect(c?.ahorroAlMesCentimos).toBe(672);
    expect(c?.frase).toBe(
      'Aceites Paco te lo deja más barato que Makro: al ritmo al que lo gastas, unos 6,72 € al mes.',
    );
  });

  it('si ya se compra al mejor, se dice', () => {
    expect(quienLoDejaMejor(aceite, 'paco', 320, 'ml')?.frase).toBe(
      'Ya se lo compras a quien te lo deja mejor.',
    );
  });

  it('con un solo proveedor no hay nada que comparar', () => {
    expect(quienLoDejaMejor(aceite.slice(0, 1), 'makro', 320, 'ml')).toBeNull();
  });
});

describe('cómo se le pide a un proveedor', () => {
  it('en una frase, sin un solo importe', () => {
    expect(comoSeLePide(1, '20:00')).toBe('Se le pide la víspera, hasta las 20:00.');
    expect(comoSeLePide(0, '07:00')).toBe('Se le pide el mismo día, hasta las 07:00.');
    expect(comoSeLePide(2, null)).toBe('Se le pide con 2 días de antelación.');
  });
});

describe('el precio de un formato, desde lo que cobró la línea', () => {
  it('con cajas contadas, el importe entre las cajas', () => {
    expect(precioPorFormato(4800, { formatos: 3, cantidadDeUso: 30, factor: 10 })).toBe(1600);
  });

  it('en el peso variable, el kilo real por lo que pesa una caja nominal', () => {
    // 67,50 € por 5,4 kg son 12,50 €/kg; la caja de 5 kg, 62,50 €.
    expect(precioPorFormato(6750, { formatos: null, cantidadDeUso: 5.4, factor: 5 })).toBe(6250);
  });

  it('sin nada que dividir, nulo', () => {
    expect(precioPorFormato(100, { formatos: 0, cantidadDeUso: 0, factor: 5 })).toBeNull();
  });
});

describe('la puntualidad', () => {
  it('cuenta las que llegaron el día previsto o antes', () => {
    const p = puntualidad([
      { prevista: fechaOperativa('2026-09-08'), llego: fechaOperativa('2026-09-08') },
      { prevista: fechaOperativa('2026-09-11'), llego: fechaOperativa('2026-09-12') },
      { prevista: null, llego: fechaOperativa('2026-09-10') },
    ]);
    expect(p.aTiempo).toBe(1);
    expect(p.tarde).toBe(1);
    expect(p.frase).toBe('1 de 2 entregas llegaron tarde.');
  });

  it('sin fechas previstas no dice nada', () => {
    expect(puntualidad([]).frase).toBeNull();
  });
});
