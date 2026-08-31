import { describe, expect, it } from 'vitest';
import { crearRegistro } from './registro.ts';
import type { Linea } from './registro.ts';
import { esCorrelacionId } from './correlacion.ts';

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
