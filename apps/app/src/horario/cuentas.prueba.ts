import { describe, expect, it } from 'vitest';
import { fraseDeLoPublicado } from './cuentas.ts';

/** Lo que se dice al publicar el horario (repaso del 10-oct): por dónde le llega a cada uno. */
describe('lo que se dice al publicar', () => {
  it('lo de Richi el 10-oct: uno en el móvil y tres por correo', () => {
    expect(
      fraseDeLoPublicado({
        primeraVez: false,
        avisados: 4,
        alMovil: 1,
        porCorreo: 3,
        soloEnLaApp: 0,
      }),
    ).toBe('Publicado. Le llega a 1 persona en el móvil y 3 personas por correo.');
  });

  it('si a alguien no le llega por ningún lado, se dice', () => {
    expect(
      fraseDeLoPublicado({
        primeraVez: true,
        avisados: 3,
        alMovil: 2,
        porCorreo: 0,
        soloEnLaApp: 1,
      }),
    ).toBe(
      'Publicado. Le llega a 2 personas en el móvil. 1 persona no tiene ni móvil ni correo: lo verá al entrar en Estook.',
    );
  });

  it('sin nadie a quien avisar, se dice por qué', () => {
    expect(fraseDeLoPublicado({ primeraVez: false, avisados: 0 })).toBe(
      'Publicado. No le cambia nada a nadie: no se avisa a nadie.',
    );
    expect(fraseDeLoPublicado({ primeraVez: true, avisados: 0 })).toBe(
      'Publicado. Nadie tiene turno esta semana: no hay a quién avisar.',
    );
  });
});
