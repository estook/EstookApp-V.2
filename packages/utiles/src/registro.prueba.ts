import { describe, expect, it } from 'vitest';
import { crearRegistro } from './registro.ts';
import type { Linea } from './registro.ts';
import { esCorrelacionId, nuevaCorrelacionId, nuevaSesionId } from './correlacion.ts';

function registroDePrueba() {
  const lineas: Linea[] = [];
  const registro = crearRegistro({ escribir: (linea) => lineas.push(linea) });
  return { registro, lineas };
}

/** Saca la primera linea o falla diciendo por que, en vez de reventar con undefined. */
function primera(lineas: readonly Linea[]): Linea {
  const linea = lineas[0];
  if (!linea) throw new Error('No se ha escrito ninguna linea de registro');
  return linea;
}

describe('registro', () => {
  it('toda linea lleva su correlacion_id, y es valido', () => {
    const { registro, lineas } = registroDePrueba();
    registro.informacion('local abierto', { local_id: 'ldn-1' });
    expect(lineas).toHaveLength(1);
    expect(esCorrelacionId(primera(lineas).correlacion_id)).toBe(true);
    expect(primera(lineas).local_id).toBe('ldn-1');
  });

  it('acepta una correlacion que venga de fuera y la conserva', () => {
    const recibida = '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77';
    const lineas: Linea[] = [];
    const registro = crearRegistro({ correlacion_id: recibida, escribir: (l) => lineas.push(l) });
    registro.error('fallo al recibir el pedido');
    expect(primera(lineas).correlacion_id).toBe(recibida);
  });

  it('sustituye una correlacion con formato invalido en vez de propagarla', () => {
    const lineas: Linea[] = [];
    const registro = crearRegistro({
      correlacion_id: 'esto-no-es-un-uuid',
      escribir: (l) => lineas.push(l),
    });
    registro.aviso('ojo');
    expect(primera(lineas).correlacion_id).not.toBe('esto-no-es-un-uuid');
    expect(esCorrelacionId(primera(lineas).correlacion_id)).toBe(true);
  });

  it('el registro hijo arrastra la correlacion y suma sus datos', () => {
    const { registro, lineas } = registroDePrueba();
    const hijo = registro.con({ comando: 'recibir_pedido' }).con({ intento: 2 });
    hijo.informacion('reintento');
    expect(hijo.correlacion_id).toBe(registro.correlacion_id);
    expect(primera(lineas).comando).toBe('recibir_pedido');
    expect(primera(lineas).intento).toBe(2);
  });

  it('por debajo del nivel minimo no escribe nada', () => {
    const { registro, lineas } = registroDePrueba();
    registro.depuracion('detalle caro');
    expect(lineas).toHaveLength(0);
  });
});

describe('sesion y correlacion son cosas distintas', () => {
  /**
   * Lo pregunto Richi al ver que el numero cambiaba en cada recarga: «es
   * normal?». Si lo es, y al comprobarlo aparecio que la pantalla llamaba
   * «correlacion» a lo que en realidad era la sesion.
   *
   *   Una sesion  = una visita. Cambia al recargar, y tiene que cambiar.
   *   Una correlacion = una accion dentro de esa visita.
   *
   * Una sesion contiene muchas correlaciones. Si hubiera una sola para toda la
   * visita, en un turno de ocho horas ese numero no distinguiria nada.
   */
  it('cada visita tiene su sesion, y son distintas', () => {
    expect(nuevaSesionId()).not.toBe(nuevaSesionId());
  });

  it('cada accion tiene su correlacion, y son distintas', () => {
    expect(nuevaCorrelacionId()).not.toBe(nuevaCorrelacionId());
  });

  it('una sesion agrupa muchas acciones sin perder de vista cual es cual', () => {
    const sesion = nuevaSesionId();
    const lineas: Linea[] = [];
    const registroDeLaVisita = crearRegistro({
      base: { sesion_id: sesion },
      escribir: (l) => lineas.push(l),
    });

    // Dos acciones distintas dentro de la misma visita.
    registroDeLaVisita.con({ correlacion_de_accion: nuevaCorrelacionId() }).informacion('merma');
    registroDeLaVisita.con({ correlacion_de_accion: nuevaCorrelacionId() }).informacion('agotado');

    expect(lineas).toHaveLength(2);
    expect(lineas[0]?.sesion_id).toBe(sesion);
    expect(lineas[1]?.sesion_id).toBe(sesion);
    expect(lineas[0]?.correlacion_de_accion).not.toBe(lineas[1]?.correlacion_de_accion);
  });
});
