import { describe, expect, it } from 'vitest';
import {
  avisoDeHorarioCambiado,
  avisoDeHorarioPublicado,
  avisosDelHorario,
  comoSeLeeElDia,
  costeDelHorario,
  laSemanaEnLetra,
  loQueHaCambiado,
  lunesDe,
  minutosDeTrabajo,
  minutosDelTramo,
  parteDePersonal,
  ventasPrevistas,
  type TurnoDelHorario,
} from './horario.ts';
import { fechaOperativa } from './tiempo.ts';

const LUNES = fechaOperativa('2026-10-05');

function trabajo(
  personaId: string,
  dia: string,
  entra: string,
  sale: string,
  descansoMinutos = 0,
): TurnoDelHorario {
  return { personaId, dia, tipo: 'trabajo', entra, sale, descansoMinutos };
}

function ausencia(
  personaId: string,
  dia: string,
  tipo: 'libre' | 'vacaciones' | 'baja',
): TurnoDelHorario {
  return { personaId, dia, tipo, entra: null, sale: null, descansoMinutos: 0 };
}

describe('lo que dura un tramo', () => {
  it('cuenta de la entrada a la salida', () => {
    expect(minutosDelTramo('12:00', '16:30')).toBe(270);
  });

  it('cruza la medianoche si sale antes de entrar: es el turno de noche', () => {
    expect(minutosDelTramo('20:00', '02:00')).toBe(360);
    expect(minutosDelTramo('23:30', '00:00')).toBe(30);
  });

  it('resta el descanso previsto, y una ausencia no trabaja', () => {
    expect(minutosDeTrabajo(trabajo('ana', '2026-10-05', '12:00', '17:00', 30))).toBe(270);
    expect(minutosDeTrabajo(ausencia('ana', '2026-10-05', 'vacaciones'))).toBe(0);
  });
});

describe('la semana', () => {
  it('empieza el lunes, sea cual sea el día', () => {
    expect(lunesDe(fechaOperativa('2026-10-11'))).toBe('2026-10-05');
    expect(lunesDe(fechaOperativa('2026-10-05'))).toBe('2026-10-05');
    expect(lunesDe(fechaOperativa('2026-10-01'))).toBe('2026-09-28');
  });

  it('se dice en letra, con el mes una vez si no cambia', () => {
    expect(laSemanaEnLetra(LUNES)).toBe('del 5 al 11 de octubre');
    expect(laSemanaEnLetra(fechaOperativa('2026-09-28'))).toBe(
      'del 28 de septiembre al 4 de octubre',
    );
  });

  it('cada día se lee con sus tramos en orden, o con su ausencia', () => {
    expect(
      comoSeLeeElDia([
        trabajo('ana', '2026-10-05', '20:00', '00:30'),
        trabajo('ana', '2026-10-05', '12:00', '16:00', 30),
      ]),
    ).toBe('12:00–16:00 (30 min de descanso) y 20:00–00:30');
    expect(comoSeLeeElDia([ausencia('ana', '2026-10-05', 'libre')])).toBe('Libre');
    expect(comoSeLeeElDia([])).toBe('');
  });
});

describe('los avisos al montarlo', () => {
  const contrato = new Map<string, number | null>([['ana', 40]]);

  it('una semana normal de cuarenta horas no avisa de nada más que de estar al límite', () => {
    // Lunes a viernes, 10:00–18:00, sábado y domingo libres.
    const turnos = [0, 1, 2, 3, 4].map((d) =>
      trabajo('ana', `2026-10-0${String(5 + d)}`, '10:00', '18:00'),
    );
    const avisos = avisosDelHorario(turnos, LUNES, contrato);
    expect(avisos.map((a) => a.que)).toEqual(['horas_de_contrato']);
    expect(avisos[0]?.nivel).toBe('ambar');
  });

  it('menos de doce horas entre cerrar y abrir es rojo, y dice qué día', () => {
    const turnos = [
      trabajo('ana', '2026-10-05', '18:00', '02:00'),
      trabajo('ana', '2026-10-06', '10:00', '14:00'),
    ];
    const aviso = avisosDelHorario(turnos, LUNES, contrato).find(
      (a) => a.que === 'descanso_entre_jornadas',
    );
    expect(aviso?.nivel).toBe('rojo');
    expect(aviso?.dia).toBe('2026-10-06');
    expect(aviso?.texto).toBe('Solo 8 h de descanso antes del martes: la ley pide 12 horas.');
  });

  it('el hueco del horario partido no es el descanso entre jornadas', () => {
    const turnos = [
      trabajo('ana', '2026-10-05', '12:00', '16:00'),
      trabajo('ana', '2026-10-05', '20:00', '23:30'),
      trabajo('ana', '2026-10-06', '12:00', '16:00'),
    ];
    const avisos = avisosDelHorario(turnos, LUNES, contrato);
    expect(avisos.some((a) => a.que === 'descanso_entre_jornadas')).toBe(false);
  });

  it('más de nueve horas de trabajo un día es ámbar, contando sin el descanso', () => {
    const largo = avisosDelHorario(
      [trabajo('ana', '2026-10-07', '09:00', '19:30', 30)],
      LUNES,
      contrato,
    );
    expect(largo.find((a) => a.que === 'jornada_larga')?.texto).toBe(
      'Más de 9 horas el miércoles: 10 h.',
    );
    const justo = avisosDelHorario(
      [trabajo('ana', '2026-10-07', '09:00', '18:30', 30)],
      LUNES,
      contrato,
    );
    expect(justo.some((a) => a.que === 'jornada_larga')).toBe(false);
  });

  it('sin día y medio seguido de descanso en la semana, ámbar', () => {
    // Todos los días un rato: el hueco más largo no llega a 36 horas.
    const turnos = [5, 6, 7, 8, 9, 10, 11].map((d) =>
      trabajo('ana', `2026-10-${String(d).padStart(2, '0')}`, '12:00', '16:00'),
    );
    const aviso = avisosDelHorario(turnos, LUNES, contrato).find(
      (a) => a.que === 'descanso_semanal',
    );
    expect(aviso?.nivel).toBe('ambar');
  });

  it('pasarse de sus horas es rojo; y quien no tiene contrato se compara con 40', () => {
    const turnos = [5, 6, 7, 8, 9].map((d) =>
      trabajo('luis', `2026-10-${String(d).padStart(2, '0')}`, '10:00', '19:00'),
    );
    const avisos = avisosDelHorario(turnos, LUNES, new Map());
    const horas = avisos.find((a) => a.que === 'horas_de_contrato');
    expect(horas?.nivel).toBe('rojo');
    expect(horas?.texto).toBe(
      '45 h de 40 h de referencia (no tiene contrato puesto): se pasa 5 h.',
    );
  });

  it('quien solo tiene ausencias no avisa de nada', () => {
    const turnos = [5, 6, 7].map((d) => ausencia('ana', `2026-10-0${String(d)}`, 'vacaciones'));
    expect(avisosDelHorario(turnos, LUNES, contrato)).toEqual([]);
  });
});

describe('lo que cuesta', () => {
  it('suma cada minuto a su precio, y cuenta aparte quien no tiene sueldo', () => {
    const coste = costeDelHorario(
      [
        trabajo('ana', '2026-10-05', '10:00', '18:00', 30),
        trabajo('luis', '2026-10-05', '10:00', '14:00'),
        {
          personaId: 'ana',
          dia: '2026-10-06',
          tipo: 'libre',
          entra: null,
          sale: null,
          descansoMinutos: 0,
        },
      ],
      new Map([
        ['ana', { forma: 'por_hora' as const, importeCentimos: 1200, horasSemanales: null }],
        ['luis', null],
      ]),
    );
    // 7 h 30 min a 12 € la hora son 90 €.
    expect(coste.totalCentimos).toBe(9000);
    expect(coste.sinSueldo).toEqual(['luis']);
  });
});

describe('las ventas previstas', () => {
  it('son la media de ese mismo día en las semanas de antes que tuvieron caja', () => {
    const ventas = [
      { fecha: '2026-09-28', centimos: 100_000 },
      { fecha: '2026-09-21', centimos: 80_000 },
      { fecha: '2026-09-26', centimos: 300_000 },
    ];
    const previstas = ventasPrevistas(ventas, LUNES);
    expect(previstas?.porDia[0]).toBe(90_000);
    // El sábado solo tuvo caja una de las dos semanas: la otra, el local no abrió.
    expect(previstas?.porDia[5]).toBe(150_000);
    expect(previstas?.totalCentimos).toBe(240_000);
  });

  it('con menos de dos semanas de cajas, todavía no se sabe', () => {
    expect(ventasPrevistas([{ fecha: '2026-09-28', centimos: 100_000 }], LUNES)).toBeNull();
  });

  it('no mira la propia semana ni lo de hace más de cuatro', () => {
    const ventas = [
      { fecha: '2026-10-05', centimos: 999_999 },
      { fecha: '2026-09-01', centimos: 999_999 },
      { fecha: '2026-09-28', centimos: 100_000 },
      { fecha: '2026-09-21', centimos: 100_000 },
    ];
    expect(ventasPrevistas(ventas, LUNES)?.totalCentimos).toBe(100_000);
  });

  it('el personal es una parte de lo previsto, y sin ventas no se inventa', () => {
    expect(parteDePersonal(30_000, 100_000)).toBe(0.3);
    expect(parteDePersonal(30_000, null)).toBeNull();
  });
});

describe('lo que ha cambiado desde lo publicado', () => {
  const antes = [
    trabajo('ana', '2026-10-06', '12:00', '16:00'),
    trabajo('luis', '2026-10-06', '12:00', '16:00'),
  ];

  it('solo cambia a quien le cambia algo, y dice qué día y cómo', () => {
    const ahora = [
      trabajo('ana', '2026-10-06', '13:00', '17:00'),
      trabajo('luis', '2026-10-06', '12:00', '16:00'),
    ];
    expect(loQueHaCambiado(antes, ahora, LUNES)).toEqual([
      { personaId: 'ana', dias: ['martes: 12:00–16:00 → 13:00–17:00'] },
    ]);
  });

  it('quitar y volver a poner lo mismo no es un cambio', () => {
    expect(loQueHaCambiado(antes, [...antes].reverse(), LUNES)).toEqual([]);
  });

  it('lo que se quita y lo que se pone nuevo también se dice', () => {
    const cambios = loQueHaCambiado(
      antes,
      [antes[0] as TurnoDelHorario, ausencia('luis', '2026-10-06', 'baja')],
      LUNES,
    );
    expect(cambios).toEqual([{ personaId: 'luis', dias: ['martes: 12:00–16:00 → Baja'] }]);
  });
});

describe('lo que dicen los avisos', () => {
  it('al publicar, a cada uno lo suyo', () => {
    const aviso = avisoDeHorarioPublicado(LUNES, [
      trabajo('ana', '2026-10-05', '12:00', '16:00'),
      ausencia('ana', '2026-10-06', 'libre'),
    ]);
    expect(aviso.titulo).toBe('Tu horario de la semana del 5 al 11 de octubre');
    expect(aviso.detalle).toBe('Lunes 12:00–16:00, martes libre.');
  });

  it('sin nada puesto, lo dice', () => {
    expect(avisoDeHorarioPublicado(LUNES, []).detalle).toBe('Esta semana no tienes nada puesto.');
  });

  it('al cambiar, qué días', () => {
    const aviso = avisoDeHorarioCambiado(LUNES, {
      personaId: 'ana',
      dias: ['martes: 12:00–16:00 → 13:00–17:00'],
    });
    expect(aviso.titulo).toBe('Cambia tu horario de la semana del 5 al 11 de octubre');
    expect(aviso.detalle).toBe('1 día cambia. Martes: 12:00–16:00 → 13:00–17:00.');
  });
});
