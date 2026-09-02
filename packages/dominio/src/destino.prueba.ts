import { describe, expect, it } from 'vitest';
import { DESTINOS, aDondeEntra, type QuienAcabaDeEntrar } from './destino.ts';

/**
 * M4 · las seis comprobaciones, en su orden.
 *
 * El criterio de terminado de M4, literal: «**una camarera con dos locales elige
 * donde esta**; **un area manager entra en su consolidado**; y una llamada a la
 * API pidiendo un local ajeno devuelve 403». Los dos primeros son estas pruebas;
 * el tercero se comprueba llamando a la API a pelo, en `acceso.prueba.ts` y en
 * `bd:comprobar-api`.
 *
 * Lo que estas pruebas cazan y ninguna pantalla ensena: **el orden**. Cambiar dos
 * comprobaciones de sitio no rompe nada visible y lo rompe todo. Por ejemplo:
 * preguntar «¿donde estas hoy?» antes de mirar el alcance mandaria al area
 * manager a elegir uno de sus seis locales, cuando lo suyo es el conjunto.
 */

const CADENA = 'org-costa';
const OTRA = 'org-mar';

function quien(cambios: Partial<QuienAcabaDeEntrar> = {}): QuienAcabaDeEntrar {
  return {
    organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'local' }],
    locales: [
      { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
    ],
    ...cambios,
  };
}

describe('el catalogo', () => {
  it('son seis destinos, ni uno mas', () => {
    expect(DESTINOS).toHaveLength(6);
  });
});

// ── 1 · El estado de la suscripcion, antes que nada ──────────────────────────

describe('1 · la suscripcion', () => {
  it('archivada no pasa de la primera puerta', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'archivada', alcance: 'local' },
        ],
      }),
    );

    expect(salida.destino).toBe('cuenta_parada');
    // «Nada se borra nunca, y pagar lo devuelve todo tal cual» (Manifiesto 28).
    expect(salida.porque).toContain('Nada se ha borrado');
  });

  it('impagada tampoco', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'impago', alcance: 'local' }],
      }),
    );
    expect(salida.destino).toBe('cuenta_parada');
  });

  it('en prueba se entra igual: son catorce dias sin tarjeta', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'prueba', alcance: 'local' }],
      }),
    );
    expect(salida.destino).toBe('panel');
  });

  it('en solo lectura se entra, porque si no nadie podria exportar sus datos', () => {
    // «Al dia 15 sin contratar: solo lectura, **con todo exportable**.» Dejar a
    // alguien fuera de sus propios datos seria peor que no cobrar.
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'solo_lectura', alcance: 'local' },
        ],
      }),
    );
    expect(salida.destino).toBe('panel');
  });

  it('con dos empresas y una impagada, se entra en la otra', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'impago', alcance: 'local' },
          { id: OTRA, nombre: 'Bar del Mar', estado: 'activa', alcance: 'local' },
        ],
        locales: [
          { id: 'mar', nombre: 'Bar del Mar', organizacionId: OTRA, onboardingTerminado: true },
        ],
      }),
    );

    // Y sin preguntar cual, porque solo queda una viva.
    expect(salida.destino).toBe('panel');
    expect(salida.organizacionId).toBe(OTRA);
  });

  it('quien no llega a ninguna organizacion recibe una frase, no una pantalla vacia', () => {
    const salida = aDondeEntra(quien({ organizaciones: [], locales: [] }));
    expect(salida.destino).toBe('cuenta_parada');
    expect(salida.porque).toContain('ningún negocio');
  });
});

// ── 2 · Varias organizaciones ────────────────────────────────────────────────

describe('2 · en que empresa', () => {
  it('con dos empresas, se pregunta cual', () => {
    // «La misma persona en dos empresas entra con un solo correo: el selector es
    // de organizacion y luego de local» (Manifiesto 25).
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'local' },
          { id: OTRA, nombre: 'Bar del Mar', estado: 'activa', alcance: 'local' },
        ],
        locales: [
          { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
          { id: 'mar', nombre: 'Bar del Mar', organizacionId: OTRA, onboardingTerminado: true },
        ],
      }),
    );

    expect(salida.destino).toBe('elegir_organizacion');
    expect(salida.organizacionId).toBeNull();
  });

  it('con una sola, no se pregunta nada', () => {
    expect(aDondeEntra(quien()).destino).toBe('panel');
  });

  it('si ya eligio en esta sesion, no se le vuelve a preguntar', () => {
    // Es lo que hace que cambiar de local no obligue a repetir el camino.
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'local' },
          { id: OTRA, nombre: 'Bar del Mar', estado: 'activa', alcance: 'local' },
        ],
        locales: [
          { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
          { id: 'mar', nombre: 'Bar del Mar', organizacionId: OTRA, onboardingTerminado: true },
        ],
        organizacionElegida: OTRA,
      }),
    );

    expect(salida.destino).toBe('panel');
    expect(salida.localId).toBe('mar');
  });
});

// ── 3 · La vista de cadena ───────────────────────────────────────────────────

describe('3 · el area manager entra en su consolidado', () => {
  const TRES_LOCALES = [
    { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
    { id: 'puerto', nombre: 'Bar Puerto', organizacionId: CADENA, onboardingTerminado: true },
    { id: 'playa', nombre: 'Bar Playa', organizacionId: CADENA, onboardingTerminado: true },
  ];

  it('criterio de M4 · con alcance de area entra en el conjunto', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'area' }],
        locales: TRES_LOCALES,
      }),
    );

    expect(salida.destino).toBe('vista_de_cadena');
    expect(salida.localId).toBeNull();
    expect(salida.porque).toContain('3 locales');
  });

  it('la direccion, igual', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'organizacion' },
        ],
        locales: TRES_LOCALES,
      }),
    );
    expect(salida.destino).toBe('vista_de_cadena');
  });

  it('**va antes** que «¿donde estas hoy?», y esto es lo que hay que no romper', () => {
    // Si estas dos comprobaciones se cambiasen de orden, al area manager se le
    // preguntaria en cual de sus tres locales esta, cuando la respuesta es «en
    // ninguno y en todos». No se veria roto: se veria mal.
    const salida = aDondeEntra(
      quien({
        organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'area' }],
        locales: TRES_LOCALES,
      }),
    );
    expect(salida.destino).not.toBe('elegir_local');
  });

  it('pero con un solo local no hay conjunto que ensenar: se va al Panel', () => {
    const salida = aDondeEntra(
      quien({
        organizaciones: [
          { id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'organizacion' },
        ],
        locales: [
          { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
        ],
      }),
    );

    expect(salida.destino).toBe('panel');
    expect(salida.localId).toBe('centro');
  });

  it('y si ya habia entrado en uno, sigue dentro de ese', () => {
    // «Al volver, el consolidado aparece donde se dejo» y el selector de local
    // sigue arriba: se salta de Puerto a Playa sin pasar por el consolidado.
    const salida = aDondeEntra(
      quien({
        organizaciones: [{ id: CADENA, nombre: 'Grupo Costa', estado: 'activa', alcance: 'area' }],
        locales: TRES_LOCALES,
        localElegido: 'puerto',
      }),
    );

    expect(salida.destino).toBe('panel');
    expect(salida.localId).toBe('puerto');
  });
});

// ── 4 · «¿Donde estas hoy?» ──────────────────────────────────────────────────

describe('4 · la camarera con dos locales', () => {
  const DOS = [
    { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
    { id: 'puerto', nombre: 'Bar Puerto', organizacionId: CADENA, onboardingTerminado: true },
  ];

  it('criterio de M4 · elige donde esta', () => {
    const salida = aDondeEntra(quien({ locales: DOS }));

    expect(salida.destino).toBe('elegir_local');
    expect(salida.porque).toBe('¿Dónde estás hoy?');
    expect(salida.localId).toBeNull();
  });

  it('con uno solo no se le pregunta', () => {
    expect(aDondeEntra(quien()).destino).toBe('panel');
  });

  it('si ya dijo donde estaba, no se le vuelve a preguntar', () => {
    const salida = aDondeEntra(quien({ locales: DOS, localElegido: 'puerto' }));
    expect(salida.destino).toBe('panel');
    expect(salida.localId).toBe('puerto');
  });

  it('si dijo un local que ya no es suyo, se le vuelve a preguntar', () => {
    // El caso de «se cambia el rol de alguien»: la sesion sigue viva y el local
    // que traia ya no esta en los suyos. Se pregunta otra vez, no se le cuela.
    const salida = aDondeEntra(quien({ locales: DOS, localElegido: 'playa-ajeno' }));
    expect(salida.destino).toBe('elegir_local');
  });

  it('quien no tiene ningun local recibe una frase, no una lista vacia', () => {
    const salida = aDondeEntra(quien({ locales: [] }));
    expect(salida.destino).toBe('cuenta_parada');
    expect(salida.porque).toContain('ningún local');
  });
});

// ── 5 · El onboarding a medias ───────────────────────────────────────────────

describe('5 · el alta a medias', () => {
  it('si el local no termino el alta, se sigue por donde iba', () => {
    const salida = aDondeEntra(
      quien({
        locales: [
          {
            id: 'centro',
            nombre: 'Bar Centro',
            organizacionId: CADENA,
            onboardingTerminado: false,
          },
        ],
      }),
    );

    expect(salida.destino).toBe('onboarding');
    // Con el local ya resuelto: M5 necesita saber cual esta dando de alta.
    expect(salida.localId).toBe('centro');
  });

  it('va **despues** de elegir local, no antes', () => {
    // Con dos locales y uno a medias, primero se pregunta donde esta. Al reves,
    // se le meteria en el alta de un local en el que a lo mejor no trabaja hoy.
    const salida = aDondeEntra(
      quien({
        locales: [
          { id: 'centro', nombre: 'Bar Centro', organizacionId: CADENA, onboardingTerminado: true },
          { id: 'nuevo', nombre: 'Bar Nuevo', organizacionId: CADENA, onboardingTerminado: false },
        ],
      }),
    );
    expect(salida.destino).toBe('elegir_local');
  });
});

// ── 6 · El Panel ─────────────────────────────────────────────────────────────

describe('6 · el Panel', () => {
  it('el caso normal: una empresa, un local, todo hecho', () => {
    const salida = aDondeEntra(quien());

    expect(salida.destino).toBe('panel');
    expect(salida.organizacionId).toBe(CADENA);
    expect(salida.localId).toBe('centro');
    expect(salida.porque).toContain('Bar Centro');
  });

  it('siempre sale con el contexto resuelto, o con el destino que lo pide', () => {
    // Nadie acaba en el Panel sin saber de que local. Si esto se rompiera, la
    // aplicacion entera preguntaria por los permisos de `null`.
    const salida = aDondeEntra(quien());
    expect(salida.localId).not.toBeNull();
    expect(salida.organizacionId).not.toBeNull();
  });
});
