import { execFile } from 'node:child_process';
import type { LoQueDiceWindows } from '@estook/impresion';

/**
 * **Lo que dice Windows de la red** (T5 · 2 · 2 · 2, decisión 0124; maqueta de la caja de centro,
 * secciones 2 y 3): para que la caja de centro reciba a los móviles y a la cocina, Windows tiene
 * que dejarla escuchar en la red del local. Dos cosas lo impiden y la caja las mira sola:
 *
 *   · **el cortafuegos**: la primera vez que la caja escucha, Windows pregunta. Si se tocó
 *     «Cancelar», o se dejó solo para otro tipo de red, no deja entrar a nadie
 *   · **la red como «pública»**: Windows suele marcar así un wifi nuevo, y en una red pública
 *     no deja entrar aunque se contestara bien
 *
 * Se lee con PowerShell **sin ser administrador** (leer no lo pide; cambiarlo sí, y eso lo hace
 * quien lleva el local con los pasos de la pantalla). Tarda un par de segundos: se mira al
 * arrancar, cada pocos minutos y al abrir Aparatos, nunca en mitad de algo.
 */

/** Lo que devuelve PowerShell, tal cual: los números son los de Windows, en cualquier idioma. */
const EL_GUION = `
$ErrorActionPreference = 'SilentlyContinue'
$exe = $env:ESTOOK_EXE
$perfiles = @(Get-NetConnectionProfile | ForEach-Object {
  [pscustomobject]@{ i = [int]$_.InterfaceIndex; nombre = [string]$_.Name; categoria = [int]$_.NetworkCategory } })
$redes = @(Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
  [pscustomobject]@{ i = [int]$_.ifIndex; medio = [int]$_.NdisPhysicalMedium;
    ips = @(Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 | ForEach-Object { [string]$_.IPAddress }) } })
$reglas = @(Get-NetFirewallApplicationFilter -Program $exe | Get-NetFirewallRule |
  Where-Object { [string]$_.Enabled -eq 'True' -and [int]$_.Direction -eq 1 } | ForEach-Object {
  [pscustomobject]@{ accion = [int]$_.Action; perfil = [int]$_.Profile } })
[pscustomobject]@{ perfiles = $perfiles; redes = $redes; reglas = $reglas } | ConvertTo-Json -Depth 4 -Compress
`;

/** Los números de Windows: `NetworkCategory`, `NdisPhysicalMedium`, `Action` y `Profile`. */
const CATEGORIA_PUBLICA = 0;
const CATEGORIA_DOMINIO = 2;
const MEDIO_WIFI = 9;
const ACCION_DEJA = 2;
const ACCION_BLOQUEA = 4;
const PERFIL_DOMINIO = 1;
const PERFIL_PRIVADO = 2;
const PERFIL_PUBLICO = 4;

const NO_SE_SABE: LoQueDiceWindows = { red: null, cortafuegos: 'no_se_sabe' };

interface LoQueLee {
  readonly perfiles: readonly { i: number; nombre: string; categoria: number }[];
  readonly redes: readonly { i: number; medio: number; ips: readonly string[] }[];
  readonly reglas: readonly { accion: number; perfil: number }[];
}

/** PowerShell 5 deja un objeto suelto donde había una lista de uno: se vuelve lista. */
function comoLista<T>(valor: unknown): T[] {
  if (Array.isArray(valor)) return valor as T[];
  return valor === null || valor === undefined ? [] : [valor as T];
}

const esDeLaRedDelLocal = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

/**
 * **Lo que dice Windows**, de lo que contestó PowerShell. Puro, para probarlo sin Windows.
 *
 *   · La red del local es la de la tarjeta física encendida con una dirección del local; si hay
 *     cable y wifi a la vez, el cable (es por donde Windows sale primero).
 *   · El cortafuegos, para el tipo de esa red: una regla que bloquea gana a una que deja; sin
 *     ninguna regla del programa, Windows aún no ha preguntado.
 */
export function leerLoQueDiceWindows(texto: string): LoQueDiceWindows {
  let leido: Partial<LoQueLee>;
  try {
    leido = JSON.parse(texto) as Partial<LoQueLee>;
  } catch {
    return NO_SE_SABE;
  }
  const perfiles = comoLista<LoQueLee['perfiles'][number]>(leido.perfiles);
  const redes = comoLista<LoQueLee['redes'][number]>(leido.redes)
    .map((r) => ({ ...r, ips: comoLista<string>(r.ips).filter(esDeLaRedDelLocal) }))
    .filter((r) => r.ips.length > 0 && perfiles.some((p) => p.i === r.i));
  const reglas = comoLista<LoQueLee['reglas'][number]>(leido.reglas);
  const laRed = redes.find((r) => r.medio !== MEDIO_WIFI) ?? redes[0];
  if (laRed === undefined) return NO_SE_SABE;
  const perfil = perfiles.find((p) => p.i === laRed.i);
  if (perfil === undefined) return NO_SE_SABE;

  const bit =
    perfil.categoria === CATEGORIA_PUBLICA
      ? PERFIL_PUBLICO
      : perfil.categoria === CATEGORIA_DOMINIO
        ? PERFIL_DOMINIO
        : PERFIL_PRIVADO;
  // Perfil 0 es «todos».
  const cubre = (r: { perfil: number }) => r.perfil === 0 || (r.perfil & bit) !== 0;
  const cortafuegos: LoQueDiceWindows['cortafuegos'] =
    reglas.length === 0
      ? 'sin_preguntar'
      : reglas.some((r) => r.accion === ACCION_BLOQUEA && cubre(r))
        ? 'no_deja'
        : reglas.some((r) => r.accion === ACCION_DEJA && cubre(r))
          ? 'deja'
          : 'no_deja';
  return {
    red: {
      nombre: perfil.nombre,
      por: laRed.medio === MEDIO_WIFI ? 'wifi' : 'cable',
      publica: perfil.categoria === CATEGORIA_PUBLICA,
    },
    cortafuegos,
  };
}

/** Lo mira en este PC. Fuera de Windows, o si PowerShell no contesta, no se sabe. */
export function mirarLoQueDiceWindows(exe: string): Promise<LoQueDiceWindows> {
  if (process.platform !== 'win32') return Promise.resolve(NO_SE_SABE);
  return new Promise((resolver) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', EL_GUION],
      { timeout: 15_000, windowsHide: true, env: { ...process.env, ESTOOK_EXE: exe } },
      (fallo, salida) => {
        resolver(fallo === null ? leerLoQueDiceWindows(salida.trim()) : NO_SE_SABE);
      },
    );
  });
}

/**
 * **Abrir en Windows** lo que hay que cambiar, para no buscarlo: la lista de aplicaciones del
 * cortafuegos, o la configuración de esa red.
 */
export function abrirEnWindows(
  que: 'cortafuegos' | 'red',
  por: 'wifi' | 'cable' | null,
  abrirEnlace: (direccion: string) => Promise<void>,
): void {
  if (process.platform !== 'win32') return;
  if (que === 'cortafuegos') {
    execFile(
      'control.exe',
      ['/name', 'Microsoft.WindowsFirewall', '/page', 'pageConfigureApps'],
      { windowsHide: false },
      () => undefined,
    );
    return;
  }
  void abrirEnlace(por === 'cable' ? 'ms-settings:network-ethernet' : 'ms-settings:network-wifi');
}
