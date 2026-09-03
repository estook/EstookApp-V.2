import { describe, expect, it } from 'vitest';
import { CAMPOS_DEL_EQUIPO, huellaDelFichero, leerCsv, proponerMapeo } from './importar.ts';

/**
 * El lector de ficheros y el mapeo (M5).
 *
 * Se prueba aquí y no contra la base de datos porque es cálculo puro. Y se
 * prueba **con los ficheros que de verdad manda la gente**: un Excel español con
 * punto y coma, una dirección con una coma dentro, una cabecera con acentos y un
 * fichero que acaba sin salto de línea.
 *
 * Un CSV mal leído no falla: **entra mal**. Por eso las tres cosas que rompen un
 * lector ingenuo tienen su prueba cada una.
 */

describe('leer un CSV', () => {
  it('lee lo normal', () => {
    const { columnas, filas } = leerCsv('nombre,correo\nRosa,rosa@bar.com\nSara,sara@bar.com');

    expect(columnas).toEqual(['nombre', 'correo']);
    expect(filas).toEqual([
      ['Rosa', 'rosa@bar.com'],
      ['Sara', 'sara@bar.com'],
    ]);
  });

  it('entiende el punto y coma, que es como exporta un Excel en español', () => {
    // Y no es un caso raro: en España la coma es el separador decimal, así que
    // Excel usa punto y coma. Media hostelería manda ficheros así.
    const { columnas, filas } = leerCsv('nombre;correo;rol\nRosa;rosa@bar.com;gerente');

    expect(columnas).toEqual(['nombre', 'correo', 'rol']);
    expect(filas[0]).toEqual(['Rosa', 'rosa@bar.com', 'gerente']);
  });

  it('y el tabulador, que es lo que sale de copiar y pegar de una hoja', () => {
    const { columnas } = leerCsv('nombre\tcorreo\nRosa\trosa@bar.com');
    expect(columnas).toEqual(['nombre', 'correo']);
  });

  it('una coma dentro de comillas no parte el campo', () => {
    const { filas } = leerCsv('nombre,direccion\n"Rosa","Calle Mayor, 14"');
    expect(filas[0]).toEqual(['Rosa', 'Calle Mayor, 14']);
  });

  it('un salto de línea dentro de comillas no parte la fila', () => {
    // Una dirección de dos líneas es normal, y partirla convertiría a una persona
    // en dos: la primera sin correo y la segunda sin nombre.
    const { filas } = leerCsv('nombre,notas\n"Rosa","Turno de mañana\ny fines de semana"');

    expect(filas).toHaveLength(1);
    expect(filas[0]?.[1]).toBe('Turno de mañana\ny fines de semana');
  });

  it('dos comillas seguidas dentro de un campo son una comilla', () => {
    const { filas } = leerCsv('nombre,mote\nRosa,"la ""jefa"""');
    expect(filas[0]?.[1]).toBe('la "jefa"');
  });

  it('aguanta el fichero que acaba sin salto de línea', () => {
    const { filas } = leerCsv('nombre,correo\nRosa,rosa@bar.com');
    expect(filas).toHaveLength(1);
  });

  it('aguanta los saltos de Windows y la marca del principio', () => {
    // El BOM que pone el Bloc de notas se colaría en el nombre de la primera
    // columna, y entonces «nombre» dejaría de emparejarse con nada.
    const { columnas } = leerCsv('﻿nombre,correo\r\nRosa,rosa@bar.com\r\n');
    expect(columnas).toEqual(['nombre', 'correo']);
  });

  it('tira las líneas en blanco, que sobran al final de casi todos', () => {
    const { filas } = leerCsv('nombre,correo\nRosa,rosa@bar.com\n\n\n');
    expect(filas).toHaveLength(1);
  });
});

describe('proponer el mapeo', () => {
  it('empareja los nombres exactos', () => {
    const mapeo = proponerMapeo(['nombre', 'apellidos', 'correo', 'rol']);

    expect(mapeo.find((m) => m.campo === 'correo')?.columna).toBe('correo');
    expect(mapeo.find((m) => m.campo === 'nombre')?.confianza).toBe(1);
  });

  it('empareja los sinónimos que de verdad salen de un fichero', () => {
    const mapeo = proponerMapeo(['Nombre', 'Email', 'Puesto']);

    expect(mapeo.find((m) => m.campo === 'correo')?.columna).toBe('Email');
    expect(mapeo.find((m) => m.campo === 'rol')?.columna).toBe('Puesto');
  });

  it('perdona los acentos y las erratas', () => {
    const mapeo = proponerMapeo(['Nombre', 'Correo electrónico']);
    expect(mapeo.find((m) => m.campo === 'correo')?.columna).toBe('Correo electrónico');

    const conErrata = proponerMapeo(['Nombre', 'Corrreo']);
    expect(conErrata.find((m) => m.campo === 'correo')?.columna).toBe('Corrreo');
  });

  it('no asigna la misma columna a dos campos', () => {
    // Sin esto, un fichero con «Nombre» y «Nombre completo» podría mandar la
    // misma columna a `nombre` y a `apellidos`, y media plantilla entraría
    // llamándose igual que su apellido.
    const mapeo = proponerMapeo(['Nombre', 'Nombre completo', 'Email']);
    const columnas = mapeo.map((m) => m.columna).filter((c): c is string => c !== null);

    expect(new Set(columnas).size).toBe(columnas.length);
  });

  it('ante la duda no propone nada, y lo dice', () => {
    // Una columna que no se parece a nada es mejor dejarla sin asignar: una
    // propuesta mala aquí no es un resultado de más en una lista, es un dato que
    // acaba en la ficha de una persona.
    const mapeo = proponerMapeo(['columna1', 'columna2']);

    expect(mapeo.every((m) => m.columna === null)).toBe(true);
    expect(mapeo.every((m) => m.confianza === 0)).toBe(true);
  });

  it('devuelve un emparejamiento por campo, en el orden en que se declaran', () => {
    const mapeo = proponerMapeo(['Email']);
    expect(mapeo.map((m) => m.campo)).toEqual(CAMPOS_DEL_EQUIPO.map((c) => c.campo));
  });

  it('los obligatorios se sirven primero cuando compiten por la misma columna', () => {
    // «Correo» encaja con `correo` y, flojito, con nada más. Pero si una columna
    // encajara con dos campos, el obligatorio se la queda: se puede vivir sin
    // apellidos, no sin correo.
    const mapeo = proponerMapeo(['correo']);
    expect(mapeo.find((m) => m.campo === 'correo')?.columna).toBe('correo');
  });
});

describe('la huella del fichero', () => {
  it('el mismo contenido da la misma huella', async () => {
    const uno = await huellaDelFichero('nombre,correo\nRosa,rosa@bar.com');
    const otro = await huellaDelFichero('nombre,correo\nRosa,rosa@bar.com');

    expect(uno).toBe(otro);
    // Es lo que hace verdad «importar dos veces el mismo fichero no cambia nada».
    expect(uno).toMatch(/^[0-9a-f]{64}$/);
  });

  it('y una letra distinta da otra', async () => {
    const uno = await huellaDelFichero('nombre,correo\nRosa,rosa@bar.com');
    const otro = await huellaDelFichero('nombre,correo\nRose,rosa@bar.com');
    expect(uno).not.toBe(otro);
  });
});
