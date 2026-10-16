import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M9 · 2 · Fichas y escandallos (decisión 0087, migración 0069), contra una base de
 * verdad y como cada persona: lo que lleva cada plato y cada elaboración, lo que cuesta
 * y deja en cada canal, que **un cocinero o un camarero no reciban ni un euro**, el
 * historial con recuperar, vincular lo que se vende tal cual, y lo nuevo de la carta.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: lo edita todo y ve costes
const SARA = 'sara@ejemplo.estook.com'; // camarera: ve la ficha (ahora sí), sin euros
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: ve la ficha, sin euros
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let marcos: string;
let luis: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
  luis = await api.entrar(LUIS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function unProducto(datos: Record<string, unknown>): Promise<string> {
  return losDatos<{ productoId: string }>(await api.ejecutar(rosa, 'crear_producto', datos))
    .productoId;
}

interface Linea {
  id: string;
  tipo: string;
  refId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costeCentimos?: number | null;
  parte?: number | null;
}
interface Ficha {
  tipo: string;
  nombre: string;
  receta: { version: number; lineas: Linea[]; pasos: string[] };
  alergenos: string[];
  usadaEn: { nombre: string }[];
  escandallo?: {
    costeCentimos: number | null;
    faltanPrecios: number;
    foodCost: number | null;
    precioRecomendadoCentimos: number | null;
    canales: {
      canal: string;
      margenCentimos: number | null;
      pierde: boolean;
      seLlevaCentimos: number;
    }[];
  };
  historial: {
    id: string;
    version: number;
    cambios: string[];
    quien: string | null;
    receta: { lineas: { nombre: string; cantidad: number }[] };
  }[];
  puedeEditar: boolean;
}

async function laFicha(token: string, de: Record<string, string>): Promise<Ficha> {
  return losDatos<Ficha>(await api.consultar(token, 'una_ficha', de));
}

let carne: string;
let pan: string;
let mayonesa: string;
let pepinillo: string;
let refresco: string;
let hamburguesa: string;
let salsa: string;

describe('lo que hay antes', () => {
  it('el almacén y la carta de Rosa', async () => {
    // 10 kg a 60 € con un 80 % útil: 7,50 €/kg de verdad.
    carne = await unProducto({
      nombre: 'Carne picada ficha',
      factor: 10,
      unidad_de_uso: 'kg',
      rendimiento: 0.8,
      precio_centimos: 6000,
    });
    pan = await unProducto({
      nombre: 'Pan brioche ficha',
      factor: 1,
      unidad_de_uso: 'ud',
      precio_centimos: 40,
      alergenos: ['gluten', 'huevos'],
    });
    mayonesa = await unProducto({
      nombre: 'Mayonesa ficha',
      factor: 1,
      unidad_de_uso: 'l',
      precio_centimos: 400,
      alergenos: ['huevos'],
    });
    // Sin precio: el plato que lo lleve no puede dar un coste.
    pepinillo = await unProducto({
      nombre: 'Pepinillo ficha',
      unidad_de_uso: 'g',
      alergenos: ['mostaza'],
    });
    refresco = await unProducto({
      nombre: 'Refresco lata ficha',
      factor: 24,
      unidad_de_uso: 'ud',
      precio_centimos: 1200,
      zona: 'sala',
    });

    hamburguesa = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'Hamburguesa ficha', precio_centimos: 1450 }],
      }),
    ).creados[0]?.platoId as string;
    await api.ejecutar(rosa, 'configurar_canal', {
      canal: 'uber_eats',
      activo: true,
      comision_porcentaje: 30,
      envase_centimos: 40,
    });
  });

  it('el plato nace sin ficha, y Escandallos lo cuenta', async () => {
    const fichas = losDatos<{
      cifras: { platos: number; sinFicha: number };
      platos: { id: string; tieneFicha: boolean }[];
    }>(await api.consultar(rosa, 'mis_fichas'));
    expect(fichas.platos.find((p) => p.id === hamburguesa)?.tieneFicha).toBe(false);
    expect(fichas.cifras.sinFicha).toBeGreaterThanOrEqual(1);
  });
});

describe('las elaboraciones', () => {
  it('se crean con lo que rinden y se les escribe la receta', async () => {
    salsa = losDatos<{ elaboracionId: string }>(
      await api.ejecutar(rosa, 'crear_elaboracion', {
        nombre: 'Salsa de la casa ficha',
        rinde_cantidad: 1.25,
        rinde_unidad: 'l',
      }),
    ).elaboracionId;
    const guardada = losDatos<{ version: number }>(
      await api.ejecutar(rosa, 'guardar_ficha', {
        elaboracion_id: salsa,
        version: 0,
        lineas: [{ producto_id: mayonesa, cantidad: 1, unidad: 'l' }],
        pasos: ['Mezclar todo'],
      }),
    );
    expect(guardada.version).toBe(1);
  });

  it('una que se lleva a sí misma se rechaza', async () => {
    const fallo = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: salsa,
      version: 1,
      lineas: [{ elaboracion_id: salsa, cantidad: 100, unidad: 'ml' }],
      pasos: [],
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
  });

  it('y por el camino tampoco: el fondo lleva la salsa, y la salsa no puede llevar el fondo', async () => {
    const fondo = losDatos<{ elaboracionId: string }>(
      await api.ejecutar(rosa, 'crear_elaboracion', {
        nombre: 'Fondo ficha',
        rinde_cantidad: 3,
        rinde_unidad: 'l',
      }),
    ).elaboracionId;
    await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: fondo,
      version: 0,
      lineas: [{ elaboracion_id: salsa, cantidad: 200, unidad: 'ml' }],
      pasos: [],
    });
    const fallo = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: salsa,
      version: 1,
      lineas: [
        { producto_id: mayonesa, cantidad: 1, unidad: 'l' },
        { elaboracion_id: fondo, cantidad: 100, unidad: 'ml' },
      ],
      pasos: [],
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
  });

  it('una unidad que no casa con la del producto se rechaza', async () => {
    const fallo = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: salsa,
      version: 1,
      lineas: [{ producto_id: mayonesa, cantidad: 30, unidad: 'g' }],
      pasos: [],
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
  });
});

describe('el escandallo', () => {
  it('la hamburguesa cuesta lo que una cuenta a mano, y lo repetido se suma', async () => {
    const guardada = losDatos<{ version: number; sumadas: string[] }>(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: hamburguesa,
        version: 0,
        lineas: [
          { producto_id: carne, cantidad: 150, unidad: 'g' },
          { producto_id: pan, cantidad: 1, unidad: 'ud' },
          { elaboracion_id: salsa, cantidad: 30, unidad: 'ml', nota: 'por encima' },
          { producto_id: carne, cantidad: 30, unidad: 'g' },
        ],
        pasos: ['Marcar la carne', 'Montar'],
        tiempo_minutos: 12,
      }),
    );
    expect(guardada.sumadas).toEqual(['Carne picada ficha']);

    const ficha = await laFicha(rosa, { plato_id: hamburguesa });
    expect(ficha.receta.lineas).toHaveLength(3);
    expect(ficha.receta.lineas[0]).toMatchObject({ cantidad: 180, unidad: 'g' });
    // 0,18 kg × 7,50 = 1,35 €; pan 0,40 €; 30 ml de salsa a 3,20 €/l = 0,096 €.
    expect(ficha.receta.lineas.map((l) => l.costeCentimos)).toEqual([135, 40, 10]);
    expect(ficha.escandallo?.costeCentimos).toBe(185);
    // 14,50 € con un 10 %: 13,18 € sin IVA; 1,85 / 13,18 = 14 %.
    expect(ficha.escandallo?.foodCost).toBe(14);
    const sala = ficha.escandallo?.canales.find((c) => c.canal === 'sala');
    const uber = ficha.escandallo?.canales.find((c) => c.canal === 'uber_eats');
    expect(sala?.margenCentimos).toBe(1318 - 185);
    // Uber Eats se lleva el 30 % de 14,50 € (4,35 €) y el envase (0,40 €).
    expect(uber?.seLlevaCentimos).toBe(475);
    expect(uber?.margenCentimos).toBe(1318 - 475 - 185);
    expect(ficha.alergenos).toEqual(['gluten', 'huevos']);
  });

  it('con un ingrediente sin precio no se da un coste falso', async () => {
    const antes = await laFicha(rosa, { plato_id: hamburguesa });
    await api.ejecutar(rosa, 'guardar_ficha', {
      plato_id: hamburguesa,
      version: antes.receta.version,
      lineas: [
        ...antes.receta.lineas.map((l) => ({
          [l.tipo === 'producto' ? 'producto_id' : 'elaboracion_id']: l.refId,
          cantidad: l.cantidad,
          unidad: l.unidad,
        })),
        { producto_id: pepinillo, cantidad: 20, unidad: 'g' },
      ],
      pasos: antes.receta.pasos,
      tiempo_minutos: 12,
    });
    const ficha = await laFicha(rosa, { plato_id: hamburguesa });
    expect(ficha.escandallo?.costeCentimos).toBeNull();
    expect(ficha.escandallo?.faltanPrecios).toBe(1);
    expect(ficha.escandallo?.foodCost).toBeNull();
    expect(ficha.alergenos).toEqual(['gluten', 'huevos', 'mostaza']);
  });

  it('dos guardando a la vez: el segundo no pisa al primero', async () => {
    const fallo = await api.ejecutar(rosa, 'guardar_ficha', {
      plato_id: hamburguesa,
      version: 1,
      lineas: [],
      pasos: [],
    });
    expect(elFallo(fallo)).toBe('lo_cambio_otra_persona');
  });
});

describe('quién ve qué', () => {
  it('el cocinero ve la ficha entera y no recibe ni un euro', async () => {
    const respuesta = await api.consultar(marcos, 'una_ficha', { plato_id: hamburguesa });
    const ficha = losDatos<Ficha>(respuesta);
    expect(ficha.receta.lineas.map((l) => l.nombre)).toContain('Carne picada ficha');
    expect(ficha.escandallo).toBeUndefined();
    expect(ficha.puedeEditar).toBe(false);
    // Ni un campo de dinero, en ningún rincón de lo que manda el servidor.
    expect(JSON.stringify(respuesta)).not.toMatch(/coste|precio|margen|foodCost|seLleva/i);
  });

  it('la camarera también la ve, sin euros, y su lista no trae costes', async () => {
    const ficha = losDatos<Ficha>(
      await api.consultar(sara, 'una_ficha', { plato_id: hamburguesa }),
    );
    expect(ficha.escandallo).toBeUndefined();
    const lista = await api.consultar(sara, 'mis_fichas');
    expect(JSON.stringify(lista)).not.toMatch(/coste|margen|foodCost|pierdeEn/i);
  });

  it('ni el cocinero ni la camarera la cambian', async () => {
    for (const token of [marcos, sara]) {
      expect(
        elFallo(
          await api.ejecutar(token, 'guardar_ficha', {
            plato_id: hamburguesa,
            version: 2,
            lineas: [],
            pasos: [],
          }),
        ),
      ).toBe('sin_permiso');
    }
  });

  it('el PDF lo pide cualquiera que la ve; sin motor, se dice', async () => {
    expect(elFallo(await api.consultar(sara, 'la_ficha_en_pdf', { plato_id: hamburguesa }))).toBe(
      'pdf_sin_encender',
    );
  });

  it('desde otra organización no se ve', async () => {
    expect(elFallo(await api.consultar(luis, 'una_ficha', { plato_id: hamburguesa }))).toBe(
      'no_existe',
    );
  });
});

describe('lo que rinde una elaboración que ya se usa', () => {
  it('no cambia de familia: la hamburguesa la lleva en ml y se quedaría sin coste', async () => {
    const ficha = await laFicha(rosa, { elaboracion_id: salsa });
    const fallo = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: salsa,
      version: ficha.receta.version,
      lineas: [{ producto_id: mayonesa, cantidad: 1, unidad: 'l' }],
      pasos: ['Mezclar todo'],
      rinde_cantidad: 1.2,
      rinde_unidad: 'kg',
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
    // Dentro de la misma familia, sí: de 1,25 l a 1.250 ml es lo mismo.
    const bien = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: salsa,
      version: ficha.receta.version,
      lineas: [{ producto_id: mayonesa, cantidad: 1, unidad: 'l' }],
      pasos: ['Mezclar todo'],
      rinde_cantidad: 1250,
      rinde_unidad: 'ml',
    });
    losDatos(bien);
  });
});

describe('el historial, con recuperar', () => {
  it('cada guardado dice quién y qué cambió, y la de antes se recupera', async () => {
    const ahora = await laFicha(rosa, { plato_id: hamburguesa });
    expect(ahora.historial.map((h) => h.version)).toEqual([2, 1]);
    expect(ahora.historial[0]?.cambios).toEqual(['Añadió Pepinillo ficha (20 g)']);
    expect(ahora.historial[0]?.quien).toBe('Rosa');

    const primera = ahora.historial.find((h) => h.version === 1);
    const recuperada = losDatos<{ version: number; cambios: string[] }>(
      await api.ejecutar(rosa, 'recuperar_receta', { guardada_id: primera?.id }),
    );
    expect(recuperada.version).toBe(3);
    expect(recuperada.cambios[0]).toMatch(/^Recuperó la del /);
    expect(recuperada.cambios).toContain('Quitó Pepinillo ficha');

    const despues = await laFicha(rosa, { plato_id: hamburguesa });
    expect(despues.receta.lineas.map((l) => l.nombre)).not.toContain('Pepinillo ficha');
    expect(despues.escandallo?.costeCentimos).toBe(185);
  });

  it('guardar lo mismo no apunta nada', async () => {
    const antes = await laFicha(rosa, { plato_id: hamburguesa });
    const igual = losDatos<{ version: number; cambios: string[] }>(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: hamburguesa,
        version: antes.receta.version,
        lineas: antes.receta.lineas.map((l) => ({
          [l.tipo === 'producto' ? 'producto_id' : 'elaboracion_id']: l.refId,
          cantidad: l.cantidad,
          unidad: l.unidad,
          nota: l.tipo === 'elaboracion' ? 'por encima' : null,
        })),
        pasos: antes.receta.pasos,
        tiempo_minutos: 12,
      }),
    );
    expect(igual).toMatchObject({ version: antes.receta.version, cambios: [] });
  });

  it('la elaboración sabe dónde entra', async () => {
    const ficha = await laFicha(rosa, { elaboracion_id: salsa });
    expect(ficha.usadaEn.map((u) => u.nombre)).toEqual(['Fondo ficha', 'Hamburguesa ficha']);
  });
});

describe('vincular lo que se vende tal cual', () => {
  let lata: string;

  it('se crea un plato desde el Almacén ya vinculado, y cuesta lo que la unidad', async () => {
    lata = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'Refresco lata ficha', precio_centimos: 250, producto_id: refresco }],
      }),
    ).creados[0]?.platoId as string;
    const carta = losDatos<{
      platos: { id: string; vinculadoA: { nombre: string } | null; tieneFicha: boolean }[];
    }>(await api.consultar(rosa, 'mi_carta'));
    expect(carta.platos.find((p) => p.id === lata)).toMatchObject({
      vinculadoA: { nombre: 'Refresco lata ficha' },
      tieneFicha: true,
    });
    // 12 € la caja de 24: 0,50 € la lata.
    expect((await laFicha(rosa, { plato_id: lata })).escandallo?.costeCentimos).toBe(50);
  });

  it('lo que va en kilos no se vincula: se desgrana', async () => {
    const otro = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'Lomo ficha', precio_centimos: 1800 }],
      }),
    ).creados[0]?.platoId as string;
    expect(
      elFallo(await api.ejecutar(rosa, 'vincular_plato', { plato_id: otro, producto_id: carne })),
    ).toBe('faltan_datos');
  });

  it('un plato ya desgranado no se pisa con un vínculo', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'vincular_plato', {
          plato_id: hamburguesa,
          producto_id: refresco,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('se desvincula y vuelve a estar sin ficha', async () => {
    await api.ejecutar(rosa, 'vincular_plato', { plato_id: lata, producto_id: null });
    const carta = losDatos<{ platos: { id: string; vinculadoA: unknown; tieneFicha: boolean }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(carta.platos.find((p) => p.id === lata)).toMatchObject({
      vinculadoA: null,
      tieneFicha: false,
    });
  });

  it('el jefe de sala tiene Carta pero no Escandallos para editar: no vincula al crear', async () => {
    // Sara no edita la carta; Rosa sí. Lo que se prueba es la puerta del vínculo, con
    // el cocinero, que no edita ni la carta ni las fichas.
    expect(
      elFallo(
        await api.ejecutar(marcos, 'vincular_plato', { plato_id: lata, producto_id: refresco }),
      ),
    ).toBe('sin_permiso');
  });
});

describe('lo nuevo de la carta', () => {
  it('unidades de la ración, alérgenos a mano, picante y distintivos, con su historial', async () => {
    const carta = losDatos<{ platos: { id: string; version: number }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    const plato = carta.platos.find((p) => p.id === hamburguesa);
    await api.ejecutar(rosa, 'cambiar_plato', {
      plato_id: hamburguesa,
      version: plato?.version,
      unidades_por_racion: 2,
      alergenos: ['sesamo', 'gluten'],
      picante: 2,
      distintivos: ['vegetariano'],
    });
    const leido = losDatos<{
      plato: {
        unidadesPorRacion: number;
        alergenos: string[];
        alergenosDeLaReceta: string[];
        picante: number;
        distintivos: string[];
      };
      historial: { despues: Record<string, unknown> | null }[];
    }>(await api.consultar(rosa, 'un_plato', { plato_id: hamburguesa }));
    expect(leido.plato).toMatchObject({
      unidadesPorRacion: 2,
      // En el orden oficial, como se guardan.
      alergenos: ['gluten', 'sesamo'],
      alergenosDeLaReceta: ['gluten', 'huevos'],
      picante: 2,
      distintivos: ['vegetariano'],
    });
    expect(leido.historial[0]?.despues).toMatchObject({ picante: 2, unidades: 2 });
  });

  it('un alérgeno que no es de los catorce no entra', async () => {
    const carta = losDatos<{ platos: { id: string; version: number }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(
      elFallo(
        await api.ejecutar(rosa, 'cambiar_plato', {
          plato_id: hamburguesa,
          version: carta.platos.find((p) => p.id === hamburguesa)?.version,
          alergenos: ['picante'],
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('la camarera, en la carta, ve los alérgenos de la receta', async () => {
    const carta = losDatos<{ platos: { id: string; alergenosDeLaReceta: string[] }[] }>(
      await api.consultar(sara, 'mi_carta'),
    );
    expect(carta.platos.find((p) => p.id === hamburguesa)?.alergenosDeLaReceta).toEqual([
      'gluten',
      'huevos',
    ]);
  });
});

describe('la desviación de los platos (construida, a la vista con el TPV)', () => {
  it('sin dos inventarios, no hay nada que comparar, y no se enseña todavía', async () => {
    const desviacion = losDatos<{ aLaVista: boolean; productos: unknown[] }>(
      await api.consultar(rosa, 'la_desviacion_de_los_platos'),
    );
    expect(desviacion.aLaVista).toBe(false);
    expect(desviacion.productos).toEqual([]);
  });

  it('el cocinero no la pide: no ve ventas', async () => {
    expect(elFallo(await api.consultar(marcos, 'la_desviacion_de_los_platos'))).toBe('sin_permiso');
  });
});
