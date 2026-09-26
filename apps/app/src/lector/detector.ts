/**
 * Quien lee el código en la imagen de la cámara (entrega L).
 *
 * **En Android y en Chrome, el lector del propio navegador** (`BarcodeDetector`),
 * que no pesa nada. **En el iPhone —y en cualquier Safari— no existe**, y se usa el
 * mismo lector hecho en WebAssembly (ZXing, a través de `barcode-detector`), que
 * **se descarga solo al abrir el lector** y se sirve desde Estook, no desde una
 * CDN: la política de seguridad no deja cargar código de fuera, y un lector que
 * depende de la red de otro no lee en un sótano con mala cobertura.
 */
export interface Detector {
  /** El primer código que haya en la imagen, o nulo si no hay ninguno. */
  leer(fuente: HTMLVideoElement): Promise<string | null>;
}

/** Los de producto, y los que usan los distribuidores en cajas y palés. */
const FORMATOS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code',
] as const;

interface DetectorDelNavegador {
  detect(fuente: HTMLVideoElement): Promise<readonly { rawValue: string }[]>;
}

interface ConstructorDeDetector {
  new (opciones: { formats: readonly string[] }): DetectorDelNavegador;
  getSupportedFormats?: () => Promise<readonly string[]>;
}

export async function crearDetector(): Promise<Detector> {
  const nativo = (globalThis as { BarcodeDetector?: ConstructorDeDetector }).BarcodeDetector;
  if (nativo !== undefined) {
    const sabe = (await nativo.getSupportedFormats?.()) ?? [];
    if (sabe.includes('ean_13')) {
      const detector = new nativo({ formats: FORMATOS.filter((f) => sabe.includes(f)) });
      return comoDetector(detector);
    }
  }

  // El de WebAssembly, y su fichero, **de Estook**.
  const [{ BarcodeDetector, prepareZXingModule }, wasm] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (ruta: string, prefijo: string) =>
        ruta.endsWith('.wasm') ? wasm.default : `${prefijo}${ruta}`,
    },
  });
  return comoDetector(new BarcodeDetector({ formats: [...FORMATOS] }));
}

function comoDetector(detector: DetectorDelNavegador): Detector {
  return {
    async leer(fuente) {
      if (fuente.readyState < 2 || fuente.videoWidth === 0) return null;
      const leidos = await detector.detect(fuente);
      return leidos[0]?.rawValue ?? null;
    },
  };
}
