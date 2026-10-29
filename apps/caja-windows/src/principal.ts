import { join } from 'node:path';
import {
  BrowserWindow,
  Menu,
  app,
  ipcMain,
  shell,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from 'electron';
import electronUpdater from 'electron-updater';
import { crearCliente } from '@estook/cliente-api';
import { escucharAlSegundo, type Escucha } from '@estook/cliente-api/al-segundo';
import { esPapelCompuesto } from '@estook/dominio';
import { aEscPos, IMPRESORA_DE_58_MM, IMPRESORA_DE_80_MM } from '@estook/impresion';
import type { ImpresoraEncontrada, LoQueNecesitaLaCaja } from '@estook/impresion';
import { comoEstaLaImpresora, mandarALaImpresora, suNombre } from './la-impresora.ts';
import {
  elNombreDeSuWeb,
  lasQueContestan,
  lasQueSeProbaran,
  lasRedesDelPc,
  losNombres,
} from './buscar.ts';
import { LaColaEnMarcha, type LaColaQueDaLaApi, type LoQueSeApunta } from './la-cola.ts';

/**
 * **La caja para Windows** (T5 · 1, decisión 0119): Estook TPV tal cual, en una ventana, y lo que
 * un navegador no puede hacer —hablar con las impresoras de la red del local— en este proceso.
 *
 *   · la ventana carga **la misma Estook TPV** que la web (`estook.com/tpv/`): no hay pantallas
 *     de Windows, y se actualiza al fusionar, como siempre
 *   · la web no toca nada del sistema: solo el puente (`puente.ts`), y solo desde su dirección
 *   · con la llave de la caja, **imprime su cola** también con la caja bloqueada
 *   · se actualiza solo, y lo nuevo **se pone al cerrar el programa**, nunca en mitad del servicio
 */

const LA_WEB = process.env['ESTOOK_TPV'] ?? 'https://estook.com/tpv/';
const SU_ORIGEN = new URL(LA_WEB).origin;

let ventana: BrowserWindow | null = null;
let cola: LaColaEnMarcha | null = null;
let escucha: Escucha | null = null;
let conLaLlave: string | null = null;
/** Lo que la cola sabe de sus impresoras: para decir cuáles ya están dadas de alta. */
let lasSuyas: readonly { readonly id: string; readonly direccion: string }[] = [];

/** Solo la web de Estook TPV habla con el programa; un enlace que se abra no. */
function esDeEstook(evento: IpcMainEvent | IpcMainInvokeEvent): boolean {
  try {
    return new URL(evento.senderFrame?.url ?? '').origin === SU_ORIGEN;
  } catch {
    return false;
  }
}

function conectar(datos: LoQueNecesitaLaCaja): void {
  if (datos.llave === conLaLlave && cola !== null) {
    cola.despertar();
    return;
  }
  desconectar();
  conLaLlave = datos.llave;
  const cliente = crearCliente({ base: datos.api, token: () => null });
  cola = new LaColaEnMarcha(
    {
      leerLaCola: async () => {
        const respuesta = await cliente.ejecutar<LaColaQueDaLaApi>('la_cola_de_la_caja', {
          llave: datos.llave,
        });
        if (!respuesta.ok) {
          // No es una caja, o la desvincularon: no hay nada que imprimir aquí.
          if (
            respuesta.error.codigo === 'sin_permiso' ||
            respuesta.error.codigo === 'aparato_retirado'
          ) {
            desconectar();
          }
          throw new Error(respuesta.error.codigo);
        }
        return respuesta.datos;
      },
      apuntar: async (lo: LoQueSeApunta) => {
        await cliente.ejecutar('apuntar_lo_impreso', { llave: datos.llave, ...lo });
      },
      mandar: (direccion, bytes) => mandarALaImpresora(direccion, bytes),
      comoEsta: (direccion) => comoEstaLaImpresora(direccion),
    },
    60_000,
    (vuelta) => {
      lasSuyas = vuelta.impresoras;
      // El toque al segundo, con el tema que dio la API: así se entera al momento.
      if (escucha === null && vuelta.temaAlSegundo !== null) {
        escucha = escucharAlSegundo(
          datos.supabase,
          vuelta.temaAlSegundo,
          (canal) => {
            if (canal.startsWith('impresion:') || canal.startsWith('servicio:')) cola?.despertar();
          },
          () => undefined,
        );
      }
    },
  );
  cola.empezar();
}

function desconectar(): void {
  cola?.parar();
  escucha?.parar();
  cola = null;
  escucha = null;
  conLaLlave = null;
  lasSuyas = [];
}

async function buscarImpresoras(): Promise<ImpresoraEncontrada[]> {
  const encontradas = await lasQueContestan(lasQueSeProbaran(lasRedesDelPc()));
  // A lo que el local no ha elegido no se le manda nada: el 9100 de una de oficina imprime.
  const conNombre = await losNombres(encontradas, new Set(lasSuyas.map((s) => s.direccion)), {
    porEscPos: (direccion) => suNombre(direccion),
    porSuWeb: (host) => elNombreDeSuWeb(host),
  });
  return conNombre.map(({ direccion, modelo }) => ({
    direccion,
    modelo,
    yaDadaDeAlta: lasSuyas.find((s) => s.direccion === direccion)?.id ?? null,
  }));
}

function crearLaVentana(): void {
  ventana = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0f1719',
    title: 'Estook TPV',
    autoHideMenuBar: true,
    icon: join(__dirname, '..', 'recursos', 'icono.png'),
    webPreferences: {
      preload: join(__dirname, 'puente.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  ventana.maximize();
  // Fuera de Estook TPV no se navega dentro de la caja: un enlace de fuera se abre en el navegador.
  ventana.webContents.on('will-navigate', (evento, direccion) => {
    if (new URL(direccion).origin !== SU_ORIGEN) {
      evento.preventDefault();
      if (direccion.startsWith('https://')) void shell.openExternal(direccion);
    }
  });
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  void ventana.loadURL(LA_WEB);
  ventana.on('closed', () => {
    ventana = null;
  });
}

// Una sola caja por PC: abrirla otra vez trae la que ya está delante.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventana === null) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });

  app
    .whenReady()
    .then(() => {
      Menu.setApplicationMenu(null);

      ipcMain.on('caja:version', (evento) => {
        evento.returnValue = esDeEstook(evento) ? app.getVersion() : null;
      });
      ipcMain.on('caja:conectar', (evento, datos: LoQueNecesitaLaCaja) => {
        if (
          esDeEstook(evento) &&
          typeof datos.llave === 'string' &&
          typeof datos.api === 'string'
        ) {
          conectar(datos);
        }
      });
      ipcMain.on('caja:desconectar', (evento) => {
        if (esDeEstook(evento)) desconectar();
      });
      ipcMain.handle('caja:buscar', async (evento) =>
        esDeEstook(evento) ? buscarImpresoras() : [],
      );
      ipcMain.handle(
        'caja:imprimir-directo',
        async (evento, direccion: unknown, anchoMm: unknown, papel: unknown) => {
          if (!esDeEstook(evento) || typeof direccion !== 'string' || !esPapelCompuesto(papel)) {
            return { salio: false, porque: 'No se puede' };
          }
          // Solo a una que acaba de contestar en la red: la web no manda bytes a donde quiera.
          const encontradas = await lasQueContestan([direccion.split(':')[0] ?? '']);
          if (!encontradas.includes(direccion)) return { salio: false, porque: 'No responde' };
          return mandarALaImpresora(
            direccion,
            aEscPos(papel, anchoMm === 58 ? IMPRESORA_DE_58_MM : IMPRESORA_DE_80_MM),
          );
        },
      );
      ipcMain.handle('caja:como-va', (evento) => {
        const va = cola?.comoVa() ?? { conectada: false, porSalir: 0 };
        return esDeEstook(evento)
          ? { ...va, porCable: null }
          : { conectada: false, porSalir: 0, porCable: null };
      });
      ipcMain.handle('caja:arranca-con-windows', (evento) =>
        esDeEstook(evento) ? app.getLoginItemSettings().openAtLogin : false,
      );
      ipcMain.handle('caja:poner-arranca-con-windows', (evento, si: unknown) => {
        if (esDeEstook(evento) && typeof si === 'boolean')
          app.setLoginItemSettings({ openAtLogin: si });
      });

      crearLaVentana();

      // **Las actualizaciones**: se descargan solas y se ponen al cerrar el programa (Anexo 10.12).
      const { autoUpdater } = electronUpdater;
      autoUpdater.autoInstallOnAppQuit = true;
      const mirar = () => {
        void autoUpdater.checkForUpdates().catch(() => undefined);
      };
      if (app.isPackaged) {
        mirar();
        setInterval(mirar, 6 * 60 * 60_000);
      }
    })
    .catch(() => {
      app.quit();
    });

  app.on('window-all-closed', () => {
    desconectar();
    app.quit();
  });
}
