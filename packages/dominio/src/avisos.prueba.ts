import { describe, expect, it } from 'vitest';
import {
  avisoDeConfirmar,
  TIPOS_DE_AVISO,
  avisoDeCaducidad,
  avisoDeEntrasEnUnRato,
  avisoDeFichajeCorregido,
  avisoDeFichajeSinApuntar,
  avisoDePedidoQueNoLlega,
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
  avisoDeInventarioContado,
  avisoDeRecontar,
  avisoDeTocaContar,
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

  it('de fábrica, al correo la invitación a un pedido, los informes de la semana y del mes, un fichaje corregido y el horario', () => {
    // La invitación suele ir con prisa; los informes, los eligió Richi (27-sep). El
    // diario, no: un correo cada día acaba sin leerse. A quién le llegan lo decide
    // aparte el permiso (`LO_QUE_PIDE_EL_AVISO`): los informes, a quien ve Negocio.
    // Y el fichaje corregido (0068): es el registro horario de quien lo recibe, y
    // puede no abrir la app en días. Y el horario, al publicarse y al cambiar (0066,
    // 0069): se mira para organizarse la semana.
    const conCorreo = TIPOS_DE_AVISO.filter((tipo) => deFabrica(tipo, 70).porCorreo);
    expect(conCorreo).toEqual([
      'pedido.invitacion',
      'informe.semana',
      'informe.mes',
      'fichaje.corregido',
      'horario.publicado',
      'horario.cambiado',
      'chat.confirmar',
    ]);
  });

  it('el aviso de un fichaje corregido dice quién, qué día y por qué, y que el de antes sigue', () => {
    const dice = avisoDeFichajeCorregido('Carla', '2026-09-25', 'Se fue sin fichar la salida');
    expect(dice.titulo).toBe('Carla ha corregido tu fichaje del viernes 25 de septiembre');
    expect(dice.detalle).toBe(
      'Motivo: se fue sin fichar la salida. El de antes sigue a la vista en tus fichajes.',
    );
  });

  it('lo bajo mínimo no llega de fábrica: ya sale en «Hoy»', () => {
    expect(deFabrica('almacen.bajo_minimo', 70)).toEqual({
      enLaApp: false,
      porCorreo: false,
      alMovil: false,
    });
    // Encendido, llega, y por correo si se quiere.
    expect(laPreferencia('almacen.bajo_minimo', 70, { enLaApp: true, porCorreo: true })).toEqual({
      enLaApp: true,
      porCorreo: true,
      alMovil: false,
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
      alMovil: false,
    });
    expect(laPreferencia('pedido.invitacion', 30, { enLaApp: false })).toEqual({
      enLaApp: false,
      porCorreo: false,
      alMovil: false,
    });
    expect(laPreferencia('merma.grande', 70, { porCorreo: true })).toEqual({
      enLaApp: true,
      porCorreo: true,
      alMovil: false,
    });
    expect(laPreferencia('merma.grande', 70, null)).toEqual({
      enLaApp: true,
      porCorreo: false,
      alMovil: false,
    });
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

  it('los de inventario (M8 · 0078): toca contar, alguien ha contado y vuelve a contarlo', () => {
    expect(avisoDeTocaContar(['pulpo', 'solomillo'], 'Los que más valen.')).toEqual({
      titulo: 'Toca contar 2 productos',
      detalle: 'Pulpo y solomillo. Los que más valen.',
    });
    expect(avisoDeInventarioContado(['Marcos'], 'Cocina', 42, 3)).toEqual({
      titulo: 'Marcos ha contado cocina',
      detalle: '42 productos, 3 no cuadran. Míralo y ciérralo.',
    });
    expect(avisoDeInventarioContado([], null, 1, 0).titulo).toBe('Alguien ha contado el almacén');
    expect(avisoDeInventarioContado(['Ana'], 'Sala', 1, 0).detalle).toBe(
      '1 producto, y cuadra todo. Míralo y ciérralo.',
    );
    expect(avisoDeRecontar(['Pulpo'], 'Luis')).toEqual({
      titulo: 'Vuelve a contar 1 producto',
      detalle: 'Pulpo. Te lo pide Luis.',
    });
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

describe('los avisos al móvil (I · 0070)', () => {
  it('de fábrica suena en el móvil solo lo que pide hacer algo ya', () => {
    const alMovil = TIPOS_DE_AVISO.filter((tipo) => deFabrica(tipo, 70).alMovil);
    expect(alMovil).toEqual([
      'pedido.invitacion',
      'fichaje.corregido',
      'horario.publicado',
      'horario.cambiado',
      'turno.entras',
      'lote.caduca',
      'pedido.no_llega',
      'fichaje.sin_apuntar',
      'chat.confirmar',
      // M8 (0078): que vuelvas a contar algo, mientras sigues en la cámara.
      'inventario.recontar',
    ]);
  });

  it('sin campana no hay móvil, igual que no hay correo', () => {
    expect(laPreferencia('turno.entras', 30, { enLaApp: false, alMovil: true }).alMovil).toBe(
      false,
    );
    expect(laPreferencia('tablon.nota', 30, { alMovil: true }).alMovil).toBe(true);
    expect(laPreferencia('turno.entras', 30, { alMovil: false }).alMovil).toBe(false);
  });

  it('lo que dicen los cuatro nuevos', () => {
    expect(avisoDeEntrasEnUnRato(5, '10:00', 'Bar Centro')).toEqual({
      titulo: 'Entras en 5 minutos',
      detalle: 'A las 10:00 en Bar Centro. Tócalo para fichar.',
    });
    expect(avisoDeEntrasEnUnRato(0, '10:00', 'Bar Centro').titulo).toBe('Entras ahora');
    expect(avisoDeCaducidad('manana', ['leche', 'nata', 'leche'])).toEqual({
      titulo: 'Mañana caducan 3 lotes',
      detalle: 'Leche y nata. Gástalo primero.',
    });
    expect(avisoDeCaducidad('hoy', ['pulpo']).titulo).toBe('Hoy caduca un lote');
    expect(avisoDePedidoQueNoLlega('Frutas Pepe', 12, '10:00')).toEqual({
      titulo: 'El pedido 12 a Frutas Pepe no ha llegado',
      detalle: 'Suele llegar hacia las 10:00. Llama al proveedor, o recíbelo cuando llegue.',
    });
    expect(
      avisoDeFichajeSinApuntar('entrada', 'Tablet barra', 'el martes 6 a las 09:02', 'pin', null)
        .detalle,
    ).toBe(
      'Una entrada en Tablet barra, el martes 6 a las 09:02: el PIN no era de nadie del local. Pregunta quién fue y apúntaselo en su ficha.',
    );
  });
});

describe('el recordatorio de confirmar (C2 · 0075)', () => {
  it('dice quién lo pidió, dónde, y una línea del mensaje', () => {
    expect(avisoDeConfirmar('Rosa', 'Todo el equipo', 'El lunes no hay pescado')).toEqual({
      titulo: 'Te falta confirmar un mensaje de Rosa en Todo el equipo',
      detalle: 'El lunes no hay pescado. Tócalo para leerlo y confirmarlo.',
    });
    const largo = 'Muy largo '.repeat(30);
    expect(avisoDeConfirmar('Rosa', 'Cocina', largo).detalle?.length ?? 0).toBeLessThan(200);
  });
});
