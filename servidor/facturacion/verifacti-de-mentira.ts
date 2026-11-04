import {
  NIF_DE_LA_EMPRESA_DE_PRUEBAS,
  VerifactiNoContesta,
  type LaAutorizacionEnVerifacti,
  type Verifacti,
} from './verifacti.ts';

/**
 * Un Verifacti de mentira, para las pruebas y la API de pruebas (T6 · 1, 0126).
 *
 * Hace lo mismo que el de verdad, con las respuestas que dice su documentación, sin salir de
 * la máquina: Hacienda conoce unos pocos NIF, el alta da 409 la segunda vez, la firma en línea
 * se queda «Pendiente» hasta que alguien la firma (`firmar`), y un modelo que no es un PDF se
 * rechaza. Con `callar` deja de contestar, como cuando Verifacti no responde.
 */

/** Lo que Hacienda tiene, en la mentira: los de las pruebas y nada más. */
const EN_HACIENDA: Readonly<Record<string, string>> = {
  [NIF_DE_LA_EMPRESA_DE_PRUEBAS]: 'BILBABIT SL',
  B12345674: 'IKATZ RESTAURACION SL',
  '12345678Z': 'GARCIA LOPEZ ANA',
  B84935048: 'EJEMPLO NORTE SL',
};

export interface VerifactiDeMentira extends Verifacti {
  /** Lo que se le ha pedido, para comprobarlo en las pruebas. */
  readonly llamadas: string[];
  /** La persona firma en el enlace: la autorización pasa a «Correcto». */
  firmar(nif: string): void;
  /** Deja de contestar (o vuelve a hacerlo): como cuando Verifacti no responde. */
  callar(callado: boolean): void;
}

export function verifactiDeMentira(): VerifactiDeMentira {
  const llamadas: string[] = [];
  const dadosDeAlta = new Set<string>();
  const autorizaciones = new Map<string, LaAutorizacionEnVerifacti>();
  let callado = false;

  function apuntar(que: string) {
    llamadas.push(que);
    if (callado) throw new VerifactiNoContesta(null, 'TimeoutError');
  }

  function laDe(nif: string): LaAutorizacionEnVerifacti {
    if (nif === NIF_DE_LA_EMPRESA_DE_PRUEBAS) {
      return { estado: 'Correcto', error: null, url: null, caduca: null };
    }
    return (
      autorizaciones.get(nif) ?? { estado: 'Inexistente', error: null, url: null, caduca: null }
    );
  }

  return {
    quien: 'verifacti-de-mentira',
    llamadas,

    firmar(nif) {
      autorizaciones.set(nif, { estado: 'Correcto', error: null, url: null, caduca: null });
    },

    callar(estaCallado) {
      callado = estaCallado;
    },

    probar() {
      apuntar('probar');
      return Promise.resolve({ nifs: dadosDeAlta.size + 1 });
    },

    comprobarNif(nif, nombre) {
      apuntar(`comprobar ${nif}`);
      const suyo = EN_HACIENDA[nif];
      if (suyo === undefined)
        return Promise.resolve({ resultado: 'NO IDENTIFICADO', nombre: null });
      // Una persona con el nombre casi igual: Hacienda da el suyo.
      if (nombre !== null && nombre.toUpperCase() !== suyo && nif === '12345678Z') {
        return Promise.resolve({ resultado: 'NO IDENTIFICADO-SIMILAR', nombre: suyo });
      }
      return Promise.resolve({ resultado: 'IDENTIFICADO', nombre: suyo });
    },

    darDeAlta(datos) {
      apuntar(`alta ${datos.entorno} ${datos.nif}`);
      if (EN_HACIENDA[datos.nif] === undefined) {
        return Promise.reject(new VerifactiNoContesta(400, 'NIF no registrado en la AEAT'));
      }
      const clave = `${datos.entorno}/${datos.nif}`;
      if (dadosDeAlta.has(clave)) return Promise.resolve('ya_estaba' as const);
      dadosDeAlta.add(clave);
      return Promise.resolve('dado_de_alta' as const);
    },

    elNif(entorno, nif) {
      apuntar(`nif ${entorno} ${nif}`);
      if (nif !== NIF_DE_LA_EMPRESA_DE_PRUEBAS && !dadosDeAlta.has(`${entorno}/${nif}`)) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        nif,
        nombre: EN_HACIENDA[nif] ?? nif,
        direccion: 'Calle Udaberria 10',
        cp: '48992',
        poblacion: 'Getxo',
        provincia: 'Bizkaia',
        activo: true,
      });
    },

    empezarLaFirmaEnLinea(nif) {
      apuntar(`firma ${nif}`);
      const ahora = laDe(nif);
      if (ahora.estado === 'Pendiente' || ahora.estado === 'Correcto') {
        return Promise.reject(
          new VerifactiNoContesta(
            400,
            'ya existe una representacion correcta o una firma en curso',
          ),
        );
      }
      if (!/^[0-9XYZKLM]/.test(nif)) {
        return Promise.reject(new VerifactiNoContesta(400, 'el NIF no es un DNI/NIE'));
      }
      const url = `https://firma.ejemplo/${nif}`;
      autorizaciones.set(nif, {
        estado: 'Pendiente',
        error: null,
        url,
        caduca: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      });
      return Promise.resolve({ url });
    },

    elModeloParaFirmar(nif) {
      apuntar(`modelo ${nif}`);
      return Promise.resolve(new TextEncoder().encode(`%PDF-1.4 modelo de ${nif}`));
    },

    mandarElModeloFirmado(nif, pdf) {
      apuntar(`firmado ${nif}`);
      const esPdf = new TextDecoder().decode(pdf.slice(0, 5)) === '%PDF-';
      const estado: LaAutorizacionEnVerifacti = esPdf
        ? { estado: 'Correcto', error: null, url: null, caduca: null }
        : { estado: 'Rechazado', error: 'El documento no está firmado', url: null, caduca: null };
      autorizaciones.set(nif, estado);
      return Promise.resolve(estado);
    },

    laAutorizacion(nif) {
      apuntar(`autorizacion ${nif}`);
      return Promise.resolve(laDe(nif));
    },

    laDeclaracion() {
      apuntar('declaracion');
      return Promise.resolve({
        url: 'https://storage.googleapis.com/verifacti_non_sensitive_prod/declaracion/actual.pdf',
        urlDeLaVersion:
          'https://storage.googleapis.com/verifacti_non_sensitive_prod/declaracion/1.0.0.pdf',
        sistema: { nombre: 'bilbabit', id: 'A1', version: '1.0.0' },
      });
    },
  };
}
