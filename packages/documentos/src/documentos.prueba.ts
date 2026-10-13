import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COLOR_DE_ESTOOK,
  MONTSERRAT_WOFF2_BASE64,
  colorSeguro,
  documentoDelHorario,
  documentoDelInforme,
  documentoDelRegistro,
  escapar,
  pieDelDocumento,
} from './index.ts';

const MARCA = { nombreDelLocal: 'Bar Centro', color: '#1E6B52', logo: null };

describe('la base de los documentos', () => {
  it('lo que viene de fuera no puede meter nada en la página', () => {
    expect(escapar('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapar(`Pepe's "Bar" & Co`)).toBe('Pepe&#39;s &quot;Bar&quot; &amp; Co');
    expect(escapar(null)).toBe('');
  });

  it('solo un color de verdad llega a la hoja de estilo', () => {
    expect(colorSeguro('#1E6B52')).toBe('#1E6B52');
    // Un «color» que cerrara la regla y abriera otra se queda en el de Estook.
    expect(colorSeguro('red; } body { display: none')).toBe(COLOR_DE_ESTOOK);
    expect(colorSeguro(null)).toBe(COLOR_DE_ESTOOK);
  });

  it('la letra es la misma que sirve la app', () => {
    // Si un día cambia la de la app, esto se pone en rojo hasta pasar
    // `pnpm documentos:letra`: un documento no puede ir con otra letra.
    const deLaApp = readFileSync(
      fileURLToPath(new URL('../../ui/fuentes/montserrat-latin.woff2', import.meta.url)),
    ).toString('base64');
    expect(MONTSERRAT_WOFF2_BASE64).toBe(deLaApp);
  });

  it('el pie dice la página, y lo escrito va a salvo', () => {
    const pie = pieDelDocumento('Registro de <jornada>');
    expect(pie).toContain('class="pageNumber"');
    expect(pie).toContain('Registro de &lt;jornada&gt;');
  });
});

describe('el informe en PDF', () => {
  const pagina = documentoDelInforme({
    marca: { ...MARCA, logo: 'javascript:alert(1)' },
    titulo: 'Tu semana',
    periodo: 'del 21 al 27 de septiembre',
    comparado: 'frente a la semana anterior',
    hechoEl: 'Hecho el 30 de septiembre, 19:40',
    cifras: [{ nombre: 'Ventas', valor: '4.230,00 €', cambio: '+12 %', bueno: true }],
    frases: ['Lo mejor: las ventas, un 12 % más que la semana anterior.'],
    semaforo: [
      {
        nombre: 'Food cost',
        valor: '34 %',
        objetivo: 'objetivo 30 %',
        semaforo: 'rojo',
        porque: 'La merluza ha subido un 18 %.',
      },
    ],
  });

  it('lleva el nombre del local, el periodo, las cifras y el semáforo', () => {
    expect(pagina).toContain('Bar Centro · del 21 al 27 de septiembre');
    expect(pagina).toContain('4.230,00 €');
    expect(pagina).toContain('+12 %');
    expect(pagina).toContain('Fuera');
    expect(pagina).toContain('La merluza ha subido un 18 %.');
  });

  it('un logo que no es una imagen de verdad no entra: va la inicial', () => {
    expect(pagina).not.toContain('javascript:');
    expect(pagina).toContain('class="inicial"');
  });
});

describe('el registro de jornada', () => {
  const pagina = documentoDelRegistro({
    marca: MARCA,
    periodo: 'septiembre de 2026',
    hechoEl: 'Hecho el 1 de octubre, 10:00',
    filas: [
      {
        persona: 'Omar S.',
        fecha: 'vie 25 sep',
        entrada: '20:00',
        salida: '00:30',
        pausas: '—',
        trabajado: '4 h 30 min',
        desde: 'Aparato del local',
        correccion: {
          veces: 1,
          original: '20:00 – sin salida',
          motivo: 'Se fue sin fichar la salida',
          quienYCuando: 'Carla Soto, el 26 de septiembre',
        },
      },
    ],
    totales: [{ persona: 'Omar S.', dias: 1, trabajado: '4 h 30 min' }],
    huella: 'a'.repeat(64),
    pausaCuenta: false,
  });

  it('cada corrección se ve con cómo era antes, por qué y quién', () => {
    expect(pagina).toContain('Corregido');
    expect(pagina).toContain('Antes: 20:00 – sin salida');
    expect(pagina).toContain('Carla Soto, el 26 de septiembre');
  });

  it('lleva la huella de la hoja de cálculo, y va apaisado', () => {
    expect(pagina).toContain('a'.repeat(64));
    expect(pagina).toContain('A4 landscape');
    expect(pagina).toContain('no cuentan');
  });
});

describe('el horario de la pared (repaso del 10-oct)', () => {
  const dia = (horas: string, descanso: string | null = null) => ({
    tramos: [{ horas, descanso }],
    ausencia: null,
  });
  const libre = { tramos: [], ausencia: 'Libre' };
  const datos = {
    marca: MARCA,
    semana: 'del 5 al 11 de octubre',
    hechoEl: 'Hecho el 10 de octubre',
    dias: ['Lun 5', 'Mar 6', 'Mié 7', 'Jue 8', 'Vie 9', 'Sáb 10', 'Dom 11'],
    grupos: [
      {
        nombre: 'Cocina',
        filas: [
          {
            persona: 'Antonio P.',
            puesto: 'Jefe de cocina',
            horas: '19 h',
            dias: [dia('12:00–18:30', 'Descanso 30 min'), libre, libre, libre, libre, libre, libre],
          },
        ],
      },
      {
        nombre: 'El resto del equipo',
        filas: [
          {
            persona: 'Alejandro S.',
            puesto: 'Gerente',
            horas: '5 h',
            dias: [libre, libre, libre, dia('12:30–17:30'), libre, libre, libre],
          },
        ],
      },
    ],
    publicado: 'Publicado el 10 de octubre por Ricardo',
  };

  it('es una sola tabla para todos los grupos, con las columnas fijas: los días caen unos debajo de otros', () => {
    const html = documentoDelHorario(datos);
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(html).toContain('<colgroup>');
    expect(html).toContain('<tr class="grupo"><th colspan="9" class="color">Cocina</th></tr>');
    expect(html).toContain(
      '<tr class="grupo"><th colspan="9" class="color">El resto del equipo</th></tr>',
    );
  });

  it('el descanso va en pequeño debajo de las horas, no en la misma línea', () => {
    const html = documentoDelHorario(datos);
    expect(html).toContain('<span class="entero">12:00–18:30</span><small>Descanso 30 min</small>');
    expect(html).not.toContain('(30 min de descanso)');
  });

  it('lo de la medianoche solo se dice si algún tramo la cruza', () => {
    expect(documentoDelHorario(datos)).not.toContain('termina al día siguiente');
    expect(documentoDelHorario({ ...datos, cruzaLaMedianoche: true })).toContain(
      'Un tramo que acaba antes de empezar termina al día siguiente.',
    );
  });
});
