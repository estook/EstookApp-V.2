import { cifrarElPin } from '@estook/cliente-api/pin-cifrado';
import type { ElAparatoPorDentro, YoEnElTpv } from '../datos/tipos.ts';
import { anadirALaCola } from './laCola.ts';
import type { LoQueDiceLaCaja, QuienEsParaLaCaja } from './laCaja.ts';

/**
 * **Entrar y fichar sin internet, por la caja** (T5 · 2 · 2 · 2, decisión 0124; maqueta de T5 · 2,
 * sección 1): la caja dice de quién es el PIN, y el aparato hace lo mismo que en T5 · 2 · 1 con
 * quien ya entró hoy: deja entrar, y guarda el PIN cifrado con su pública para que Estook lo dé
 * por bueno al volver, delante de lo que haga. Lo que valga lo dice Estook entonces.
 */

export type QueSeFicha = 'entrada' | 'pausa' | 'vuelta' | 'salida';

/** Lo suyo, como lo daría Estook, con lo que sabe la caja y lo que sabe el aparato de sí. */
export function elYoQueDaLaCaja(aparato: ElAparatoPorDentro, quien: QuienEsParaLaCaja): YoEnElTpv {
  return {
    persona: quien.persona,
    local: aparato.local,
    permisos: quien.permisos,
    aparato: {
      terminalId: aparato.terminalId,
      nombre: aparato.nombre,
      funcion: aparato.funcion,
      esPersonal: aparato.esPersonal,
    },
    fichaje: {
      personaId: quien.persona.id,
      nombre: quien.persona.nombre,
      estado: quien.fichaje,
      desde: quien.desde,
      minutosDeHoy: 0,
      pausasEnUso: quien.pausasEnUso,
    },
    // Las mesas de cada uno las tiene su aparato; sin internet no se saben las de los demás.
    misMesas: [],
    companeros: quien.companeros,
  };
}

/** Lo que se le dice a quien teclea, si la caja no le deja entrar. Nunca de quién era el PIN. */
export function porQueNoEntra(
  porque: Exclude<LoQueDiceLaCaja, { ok: true }>['porque'] | 'sin_caja',
): { readonly titulo: string; readonly frase: string } {
  switch (porque) {
    case 'pin_desconocido':
    case 'no_toca':
      return { titulo: 'Ese PIN no vale.', frase: 'Prueba otra vez.' };
    case 'aparato_parado':
      return {
        titulo: 'Demasiados PIN fallados en este aparato.',
        frase: 'Espera cinco minutos y vuelve a probar.',
      };
    case 'demasiados_intentos':
      return {
        titulo: 'Ese PIN está parado por fallarlo.',
        frase: 'Espera un rato, o entra con el de otra persona.',
      };
    case 'sin_permiso':
      return {
        titulo: 'Tu puesto no ficha en este local.',
        frase: 'Si crees que sí, díselo a quien lo lleva.',
      };
    case 'sin_personas':
      return {
        titulo: 'La caja aún no sabe los PIN del local.',
        frase:
          'Los aprende con internet. Aquí solo entra quien ya entró hoy en este aparato, o espera a que vuelva.',
      };
    case 'no_llega':
      return {
        titulo: 'Sin internet y sin llegar a la caja no se puede comprobar ese PIN.',
        frase:
          'Aquí solo entra quien ya entró hoy en este aparato. Usa la caja o espera a que vuelva.',
      };
    case 'sin_caja':
      return {
        titulo: 'Sin conexión no se puede comprobar ese PIN.',
        frase:
          'Aquí solo entra quien ya entró hoy en este aparato. Usa la caja o espera a que vuelva.',
      };
  }
}

/** La entrada sin internet, a la cola: sube primero, con el PIN cifrado. Devuelve su clave. */
export async function guardarLaEntrada(
  llave: string,
  clavePublica: string,
  pin: string,
  persona: { readonly id: string; readonly nombre: string },
): Promise<string> {
  const id = crypto.randomUUID();
  anadirALaCola({
    id,
    nombre: 'entrar_con_pin',
    entrada: { llave, pin_cifrado: await cifrarElPin(clavePublica, pin) },
    hechoEn: Date.now(),
    quien: persona,
    con: { entrada: id },
    que: `${persona.nombre} · entra sin internet`,
  });
  return id;
}

const LO_QUE_SE_FICHA: Readonly<Record<QueSeFicha, string>> = {
  entrada: 'ficha la entrada',
  pausa: 'empieza la pausa',
  vuelta: 'vuelve de la pausa',
  salida: 'ficha la salida',
};

/**
 * **Lo fichado sin internet en la caja**, a la cola: con el PIN cifrado y sin turno de nadie,
 * como en el aparato de fichar (0070). Sube a la hora en que se fichó.
 */
export async function guardarElFichaje(
  llave: string,
  clavePublica: string,
  pin: string,
  persona: { readonly id: string; readonly nombre: string },
  que: QueSeFicha,
): Promise<void> {
  anadirALaCola({
    id: crypto.randomUUID(),
    nombre: 'fichar_en_la_caja',
    entrada: { llave, pin_cifrado: await cifrarElPin(clavePublica, pin), que },
    hechoEn: Date.now(),
    quien: persona,
    con: { sinTurno: true },
    que: `${persona.nombre} · ${LO_QUE_SE_FICHA[que]}`,
  });
}
