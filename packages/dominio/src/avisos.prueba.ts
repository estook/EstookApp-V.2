import { describe, expect, it } from 'vitest';
import {
  TIPOS_DE_AVISO,
  avisoDeNota,
  avisoDePedidoEmpezado,
  avisoDePedidoListo,
  avisoDeSubida,
  cuandoFue,
  cuantoSube,
  deFabrica,
  laMermaAvisa,
  laPreferencia,
  laSubidaAvisa,
  laNotaBaja,
  avisoDeBajoMinimo,
  avisoDeNotaDeGoogle,
  avisoDeTocaPedir,
  numeroDeLaCampana,
  quienesEnUnaFrase,
  tramoDelAviso,
} from './avisos.ts';
import { fechaOperativa } from './tiempo.ts';

const dia = fechaOperativa;

describe('los avisos', () => {
  it('de fábrica: lo que hace el equipo no le llega a quien lleva el negocio entero', () => {
    // Un jefe de cocina (50) y un gerente (70), sí; dirección (100) y area manager (80), no.
    expect(deFabrica('pedido.empezado', 50).enLaApp).toBe(true);
    expect(deFabrica('pedido.empezado', 70).enLaApp).toBe(true);
    expect(deFabrica('pedido.empezado', 80).enLaApp).toBe(false);
    expect(deFabrica('pedido.empezado', 100).enLaApp).toBe(false);
    // Lo que no es «de tu equipo» le llega a todos.
    expect(deFabrica('precio.subida', 100).enLaApp).toBe(true);
  });

  it('de fábrica, al correo la invitación a un pedido y los informes de la semana y del mes', () => {
    // La invitación suele ir con prisa; los informes, los eligió Richi (27-sep). El
    // diario, no: un correo cada día acaba sin leerse. A quién le llegan lo decide
    // aparte el permiso (`LO_QUE_PIDE_EL_AVISO`): los informes, a quien ve Negocio.
    const conCorreo = TIPOS_DE_AVISO.filter((tipo) => deFabrica(tipo, 70).porCorreo);
    expect(conCorreo).toEqual(['pedido.invitacion', 'informe.semana', 'informe.mes']);
  });

  it('lo bajo mínimo no llega de fábrica: ya sale en «Hoy»', () => {
    expect(deFabrica('almacen.bajo_minimo', 70)).toEqual({ enLaApp: false, porCorreo: false });
    // Encendido, llega, y por correo si se quiere.
    expect(laPreferencia('almacen.bajo_minimo', 70, { enLaApp: true, porCorreo: true })).toEqual({
      enLaApp: true,
      porCorreo: true,
    });
  });

  it('los informes y «mañana toca pedir» le llegan también a dirección: no son lo que hace el equipo', () => {
    for (const tipo of ['pedido.toca', 'informe.dia', 'informe.semana', 'google.nota'] as const) {
      expect(deFabrica(tipo, 100).enLaApp, tipo).toBe(true);
    }
  });

  it('lo guardado manda, y el correo nunca va sin la campana', () => {
    expect(laPreferencia('pedido.empezado', 100, { enLaApp: true })).toEqual({
      enLaApp: true,
      porCorreo: false,
    });
    expect(laPreferencia('pedido.invitacion', 30, { enLaApp: false })).toEqual({
      enLaApp: false,
      porCorreo: false,
    });
    expect(laPreferencia('merma.grande', 70, { porCorreo: true })).toEqual({
      enLaApp: true,
      porCorreo: true,
    });
    expect(laPreferencia('merma.grande', 70, null)).toEqual({ enLaApp: true, porCorreo: false });
  });

  it('una merma avisa desde 20 €', () => {
    expect(laMermaAvisa(1999)).toBe(false);
    expect(laMermaAvisa(2000)).toBe(true);
    expect(laMermaAvisa(null)).toBe(false);
  });

  it('una subida se cuenta por lo que cuesta la unidad, y avisa desde el umbral', () => {
    expect(cuantoSube(1000, 1120)).toBeCloseTo(0.12);
    expect(cuantoSube(1000, 900)).toBeCloseTo(-0.1);
    expect(cuantoSube(null, 900)).toBeNull();
    expect(cuantoSube(0, 900)).toBeNull();
    expect(laSubidaAvisa(1000, 1049, 5)).toBe(false);
    expect(laSubidaAvisa(1000, 1050, 5)).toBe(true);
    expect(laSubidaAvisa(1000, 800, 5)).toBe(false);
    expect(laSubidaAvisa(null, 1500, 5)).toBe(false);
  });

  it('la subida nombra al otro proveedor solo si de verdad es más barato', () => {
    // 1,88 €/kg → 2,10 €/kg, en milésimas de céntimo por gramo: 188 y 210.
    const conOtro = avisoDeSubida('Frutas Pepe', 'Tomate', 'g', 188, 210, {
      proveedor: 'Distribuciones Sur',
      costeMilesimas: 185,
      desde: dia('2026-09-03'),
    });
    expect(conOtro.titulo).toBe('Frutas Pepe sube Tomate un 12 %');
    expect(conOtro.detalle).toBe(
      'Ahora 2,10 €/kg; antes 1,88 €/kg. Distribuciones Sur te lo deja a 1,85 €/kg desde el 3 de septiembre de 2026.',
    );

    const otroMasCaro = avisoDeSubida('Frutas Pepe', 'Tomate', 'g', 188, 210, {
      proveedor: 'Distribuciones Sur',
      costeMilesimas: 230,
      desde: dia('2026-09-03'),
    });
    expect(otroMasCaro.detalle).toBe('Ahora 2,10 €/kg; antes 1,88 €/kg.');
  });

  it('quienes, en una frase que cabe en el móvil', () => {
    expect(quienesEnUnaFrase([])).toBe('Alguien');
    expect(quienesEnUnaFrase(['Ana'])).toBe('Ana');
    expect(quienesEnUnaFrase(['Ana', 'Ana', 'Marcos'])).toBe('Ana y Marcos');
    expect(quienesEnUnaFrase(['Ana', 'Marcos', 'Luis'])).toBe('Ana, Marcos y Luis');
    expect(quienesEnUnaFrase(['Ana', 'Marcos', 'Luis', 'Sara'])).toBe('Ana y 3 más');
  });

  it('un pedido empezado dice quién, y si son varios, que lo están preparando', () => {
    expect(avisoDePedidoEmpezado(['Ana'], 'Frutas Pepe').titulo).toBe(
      'Ana ha empezado un pedido a Frutas Pepe',
    );
    expect(avisoDePedidoEmpezado(['Ana', 'Marcos'], 'Frutas Pepe').titulo).toBe(
      'Ana y Marcos están preparando un pedido a Frutas Pepe',
    );
  });

  it('un pedido terminado concuerda con cuántos lo han rellenado', () => {
    expect(avisoDePedidoListo(['Ana'], 'Frutas Pepe').titulo).toBe(
      'Ana ha terminado el pedido a Frutas Pepe',
    );
    expect(avisoDePedidoListo(['Ana', 'Marcos'], 'Frutas Pepe').titulo).toBe(
      'Ana y Marcos han terminado el pedido a Frutas Pepe',
    );
  });

  it('una nota del Tablón dice para cuándo es', () => {
    const hoy = dia('2026-09-27');
    expect(avisoDeNota('Rosa', 'Inspección', hoy, hoy, '12:00').titulo).toBe(
      'Rosa en el Tablón, para hoy a las 12:00',
    );
    expect(avisoDeNota('Rosa', 'Cerramos', dia('2026-09-28'), hoy, null).titulo).toBe(
      'Rosa en el Tablón, para mañana',
    );
    expect(avisoDeNota('Rosa', 'Cena', dia('2026-10-03'), hoy, null).titulo).toBe(
      'Rosa en el Tablón, para el 3 de octubre de 2026',
    );
  });

  it('cuándo fue, como se dice en una campana', () => {
    const ahora = new Date('2026-09-27T10:00:00Z');
    expect(cuandoFue(new Date('2026-09-27T09:59:40Z'), ahora)).toBe('Ahora');
    expect(cuandoFue(new Date('2026-09-27T09:55:00Z'), ahora)).toBe('hace 5 min');
    expect(cuandoFue(new Date('2026-09-27T07:00:00Z'), ahora)).toBe('hace 3 h');
    expect(cuandoFue(new Date('2026-09-12T10:00:00Z'), ahora)).toBe('12 sep');
  });

  it('la campana cuenta hasta 9', () => {
    expect(numeroDeLaCampana(0)).toBeNull();
    expect(numeroDeLaCampana(3)).toBe('3');
    expect(numeroDeLaCampana(9)).toBe('9');
    expect(numeroDeLaCampana(10)).toBe('9+');
  });

  it('los avisos se agrupan por cuándo llegaron', () => {
    const hoy = dia('2026-09-27');
    expect(tramoDelAviso(hoy, hoy)).toBe('Hoy');
    expect(tramoDelAviso(dia('2026-09-26'), hoy)).toBe('Ayer');
    expect(tramoDelAviso(dia('2026-09-21'), hoy)).toBe('Esta semana');
    expect(tramoDelAviso(dia('2026-09-20'), hoy)).toBe('Antes');
  });
});

describe('lo que avisa el reloj (R2 · 0053)', () => {
  it('«mañana toca pedir», con cuándo llega y hasta qué hora', () => {
    // Domingo 27: mañana lunes toca pedir para que llegue el martes.
    expect(avisoDeTocaPedir('Frutas Pepe', dia('2026-09-29'), '20:00', dia('2026-09-27'))).toEqual({
      titulo: 'Mañana toca pedir a Frutas Pepe',
      detalle:
        'Para que llegue el martes, pídelo antes de las 20:00. Tócalo y se prepara el pedido con lo que haya entonces.',
    });
    expect(avisoDeTocaPedir('Panadería', dia('2026-09-28'), null, dia('2026-09-27')).detalle).toBe(
      'Para que llegue mañana. Tócalo y se prepara el pedido con lo que haya entonces.',
    );
  });

  it('lo bajo mínimo, con sus nombres y, si son muchos, cuántos más', () => {
    expect(avisoDeBajoMinimo(['leche', 'tomate', 'harina'])).toEqual({
      titulo: '3 productos bajo mínimo',
      detalle: 'Leche, tomate y harina.',
    });
    expect(avisoDeBajoMinimo(['a', 'b', 'c', 'd', 'e', 'f', 'g']).detalle).toBe(
      'A, b, c, d, e y 2 más.',
    );
  });

  it('la nota avisa solo si baja lo que enseña Google, con su decimal', () => {
    expect(laNotaBaja(4.6, 4.5)).toBe(true);
    expect(laNotaBaja(4.5, 4.5)).toBe(false);
    expect(laNotaBaja(4.5, 4.6)).toBe(false);
    expect(laNotaBaja(null, 4.2)).toBe(false);
    expect(avisoDeNotaDeGoogle(4.6, 4.5, 210, 214)).toEqual({
      titulo: 'Tu nota en Google baja de 4,6 a 4,5',
      detalle: '4 reseñas nuevas desde la última vez. Míralas en Google.',
    });
  });
});
