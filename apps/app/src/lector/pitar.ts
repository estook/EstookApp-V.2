/**
 * El pitido del lector (entrega L): «pita y vibra distinto si el código no es de
 * ningún producto». Con guantes y ruido de campana, la cocina no mira la pantalla
 * después de cada lectura: el oído y la mano dicen si ha ido bien.
 *
 *   · **Bien**: un pitido agudo y corto, y una vibración corta.
 *   · **No es de nada**: dos graves, y dos vibraciones.
 *
 * Sin sonido ni vibración disponibles (un navegador que no deja, un ordenador), no
 * pasa nada: la pantalla lo dice igual.
 */
let audio: AudioContext | null = null;

export function pitar(bien: boolean): void {
  try {
    // Safari no vibra: ahí no existe, y se mira antes de pedirlo.
    if ('vibrate' in navigator) navigator.vibrate(bien ? 60 : [70, 50, 70]);
  } catch {
    // Sin vibración: la pantalla lo dice igual.
  }
  try {
    audio ??= new AudioContext();
    const tonos = bien
      ? [{ hz: 1320, desde: 0, dura: 0.09 }]
      : [
          { hz: 220, desde: 0, dura: 0.12 },
          { hz: 220, desde: 0.18, dura: 0.12 },
        ];
    for (const tono of tonos) {
      const oscilador = audio.createOscillator();
      const volumen = audio.createGain();
      oscilador.frequency.value = tono.hz;
      volumen.gain.value = 0.08;
      oscilador.connect(volumen).connect(audio.destination);
      const empieza = audio.currentTime + tono.desde;
      oscilador.start(empieza);
      oscilador.stop(empieza + tono.dura);
    }
  } catch {
    // Sin sonido: la pantalla lo dice igual.
  }
}
