import { contextBridge, ipcRenderer } from 'electron';
import type { PuenteDeLaCaja } from '@estook/impresion';

/**
 * **El puente** (T5 · 1, decisión 0119): lo único que la web de Estook TPV puede pedirle al
 * programa, con nombre, en `window.estookCaja`. Corre aislado de la web (`contextIsolation`) y
 * sin Node: cada cosa es un mensaje al proceso principal, que mira que venga de Estook TPV.
 */
const puente: PuenteDeLaCaja = {
  version: String(ipcRenderer.sendSync('caja:version') ?? ''),
  conectar: (datos) => {
    ipcRenderer.send('caja:conectar', datos);
  },
  desconectar: () => {
    ipcRenderer.send('caja:desconectar');
  },
  buscarImpresoras: () => ipcRenderer.invoke('caja:buscar'),
  imprimirDirecto: (direccion, anchoMm, papel) =>
    ipcRenderer.invoke('caja:imprimir-directo', direccion, anchoMm, papel),
  comoVa: () => ipcRenderer.invoke('caja:como-va'),
  arrancaConWindows: () => ipcRenderer.invoke('caja:arranca-con-windows'),
  ponerArrancaConWindows: async (si) => {
    await ipcRenderer.invoke('caja:poner-arranca-con-windows', si);
  },
};

contextBridge.exposeInMainWorld('estookCaja', puente);
