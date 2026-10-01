import { QueryClient, onlineManager } from '@tanstack/react-query';
import { alCambiarLaRed, hayRed } from '../sinConexion/red.ts';

/**
 * La caché de lo que dice el servidor, una para toda la app (M3).
 *
 * Vive aquí, fuera de `Aplicacion.tsx`, desde I (0070): **lo último que se vio se
 * recupera del móvil antes de pintar** (`sinConexion/cacheGuardada.ts`), y para eso
 * `principal.tsx` la necesita antes de que exista ninguna pantalla.
 */
export const cacheDeLaApp = new QueryClient({
  defaultOptions: {
    queries: {
      // Un minuto: lo que dice el servidor sobre permisos y busquedas no cambia
      // cada segundo, y reintentar cada vez que se abre una pantalla en un movil
      // con mala cobertura es gastar bateria para nada.
      staleTime: 60_000,
      retry: 1,
      // Al volver a la app se pone al día lo que tenga más de ese minuto (30-sep,
      // `datos/alDia.ts`). Antes no: quien dejaba el móvil y lo volvía a coger
      // veía lo de hace una hora hasta cambiar de pantalla.
      refetchOnWindowFocus: true,
    },
  },
});

/*
  **Sin señal no se pregunta** (0070): las consultas se quedan esperando y la pantalla
  enseña lo último que tenía, en vez de llenarse de «No hay conexión». Y la señal no
  la dice solo el navegador, que miente a menudo, sino lo que pasa de verdad con la API
  (`sinConexion/red.ts`). Cuando vuelve, se pregunta todo lo que se había quedado.
*/
onlineManager.setEventListener((ponerEnLinea) => {
  ponerEnLinea(hayRed());
  return alCambiarLaRed(() => {
    ponerEnLinea(hayRed());
  });
});
