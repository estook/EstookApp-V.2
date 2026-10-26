import type { Sonido } from './laCocina.ts';

/**
 * **Los sonidos de la cocina** (T4 · 1, decisión 0116; Anexo 3.2), hechos aquí, sin ficheros:
 *
 *   nueva    dos toques: ha entrado una mesa
 *   marcha   tres hacia arriba: «¡MARCHA EL 2.º!»
 *   aviso    tres arriba y abajo, fuerte: algo anulado o «tienen prisa»
 *
 * **Para sonar, el navegador pide que alguien toque la pantalla una vez** cada vez que se
 * abre. Instalado en Chrome o Edge (Android o el ordenador), suena sin eso. Si no puede, la
 * pantalla lo dice en grande, y el primer toque lo despierta (`despertar`).
 */

type Nota = readonly [frecuencia: number, empieza: number, dura: number];

const LAS_NOTAS: Readonly<Record<Sonido, readonly Nota[]>> = {
  nueva: [
    [880, 0, 0.14],
    [880, 0.22, 0.14],
  ],
  marcha: [
    [660, 0, 0.14],
    [880, 0.18, 0.14],
    [1175, 0.36, 0.22],
  ],
  aviso: [
    [1175, 0, 0.16],
    [784, 0.2, 0.16],
    [1175, 0.4, 0.16],
    [784, 0.6, 0.16],
    [1175, 0.8, 0.24],
  ],
};

let contexto: AudioContext | null = null;
const oyentes = new Set<() => void>();

function elContexto(): AudioContext | null {
  if (contexto !== null) return contexto;
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;
  contexto = new window.AudioContext();
  contexto.addEventListener('statechange', () => {
    for (const oyente of oyentes) oyente();
  });
  return contexto;
}

/** Si ahora mismo puede sonar (el navegador ya lo deja). */
export function puedeSonar(): boolean {
  return elContexto()?.state === 'running';
}

/** Para la pantalla: avisa cuando cambia si puede sonar. */
export function alCambiarSiSuena(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Con un toque en la pantalla: el navegador deja sonar desde ahí. */
export function despertar(): void {
  void elContexto()?.resume();
}

export function tocar(sonido: Sonido): void {
  const ctx = elContexto();
  if (ctx === null) return;
  if (ctx.state !== 'running') void ctx.resume();
  const ahora = ctx.currentTime;
  for (const [frecuencia, empieza, dura] of LAS_NOTAS[sonido]) {
    const oscilador = ctx.createOscillator();
    const volumen = ctx.createGain();
    oscilador.type = sonido === 'aviso' ? 'square' : 'sine';
    oscilador.frequency.value = frecuencia;
    // Sube y baja suave: sin el chasquido de cortarlo de golpe.
    volumen.gain.setValueAtTime(0.0001, ahora + empieza);
    volumen.gain.exponentialRampToValueAtTime(0.5, ahora + empieza + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + empieza + dura);
    oscilador.connect(volumen).connect(ctx.destination);
    oscilador.start(ahora + empieza);
    oscilador.stop(ahora + empieza + dura + 0.02);
  }
}
