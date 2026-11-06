import {
  NIF_DE_LA_EMPRESA_DE_PRUEBAS,
  VerifactiNoContesta,
  type ElRegistroEnVerifacti,
  type LaAutorizacionEnVerifacti,
  type LoQuePasoAlEmitir,
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

/**
 * Cómo contesta a `emitir` (T6 · 2 · 1, 0136), para las pruebas del capítulo 8 del Anexo:
 *
 *   · `normal`            lo registra y contesta «Pendiente», con su QR
 *   · `rechazar`          400 por los datos: no registra nada (prueba 5)
 *   · `perder_respuesta`  lo registra, pero la respuesta no llega (prueba 7)
 *   · `caido`             no llega a Verifacti: nada registrado (prueba 14)
 *   · `en_curso`          409: otra petición con la misma clave está en curso
 */
export type ComoEmite = 'normal' | 'rechazar' | 'perder_respuesta' | 'caido' | 'en_curso';

export interface UnRegistroDeMentira {
  readonly uuid: string;
  readonly nif: string;
  readonly serie: string;
  readonly numero: string;
  readonly fecha: string;
  readonly cuerpo: unknown;
  estado: string;
  codigoError: string | null;
  mensajeError: string | null;
}

export interface VerifactiDeMentira extends Verifacti {
  /** Lo que se le ha pedido, para comprobarlo en las pruebas. */
  readonly llamadas: string[];
  /** Cada registro que ha generado, como los tiene Verifacti. */
  readonly registros: UnRegistroDeMentira[];
  /** Cómo contesta a lo siguiente que se le mande. */
  emitirAsi(como: ComoEmite): void;
  /** Lo que dice Hacienda de un registro: «Correcto», «Incorrecto»… */
  decirHacienda(uuid: string, estado: string, codigo?: string, mensaje?: string): void;
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
  const registros: UnRegistroDeMentira[] = [];
  // Lo que se recuerda de cada clave de idempotencia: el cuerpo y lo que se contestó (24 h).
  const claves = new Map<string, { cuerpo: string; respuesta: LoQuePasoAlEmitir }>();
  let comoEmite: ComoEmite = 'normal';

  function elQr(r: UnRegistroDeMentira): string {
    return `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=${r.nif}&numserie=${r.serie}${r.numero}&fecha=${r.fecha}`;
  }

  function comoRegistro(r: UnRegistroDeMentira): ElRegistroEnVerifacti {
    return {
      uuid: r.uuid,
      estado: r.estado,
      url: elQr(r),
      qr: 'iVBORw0KGgo-qr-de-mentira',
      codigoError: r.codigoError,
      mensajeError: r.mensajeError,
      operacion: 'Alta',
      serie: r.serie,
      numero: r.numero,
    };
  }

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
    registros,

    emitirAsi(como) {
      comoEmite = como;
    },

    decirHacienda(uuid, estado, codigo, mensaje) {
      const r = registros.find((x) => x.uuid === uuid);
      if (r === undefined) throw new Error(`No hay registro ${uuid}`);
      r.estado = estado;
      r.codigoError = codigo ?? null;
      r.mensajeError = mensaje ?? null;
    },

    emitir(nif, entorno, cuerpo, idempotencia) {
      llamadas.push(`emitir ${entorno} ${nif} ${idempotencia}`);
      const texto = JSON.stringify(cuerpo);
      const recordada = claves.get(`${nif}/${idempotencia}`);
      if (recordada !== undefined) {
        // La misma clave con otro cuerpo: 422. Con el mismo, la respuesta de la primera vez.
        if (recordada.cuerpo !== texto) {
          return Promise.resolve({ resultado: 'sin_respuesta', codigoHttp: 422, mensaje: '' });
        }
        if (comoEmite !== 'caido' && comoEmite !== 'perder_respuesta') {
          return Promise.resolve(recordada.respuesta);
        }
      }
      if (callado || comoEmite === 'caido') {
        return Promise.resolve({
          resultado: 'sin_respuesta',
          codigoHttp: null,
          mensaje: 'TimeoutError',
        });
      }
      if (comoEmite === 'en_curso')
        return Promise.resolve({ resultado: 'en_curso', codigoHttp: 409 });
      if (comoEmite === 'rechazar') {
        const respuesta: LoQuePasoAlEmitir = {
          resultado: 'rechazado_por_datos',
          codigoHttp: 400,
          codigo: 'vf-verifactu-descripcion_requerida',
          mensaje: 'El campo descripcion es obligatorio.',
        };
        claves.set(`${nif}/${idempotencia}`, { cuerpo: texto, respuesta });
        return Promise.resolve(respuesta);
      }
      const c = cuerpo as { serie: string; numero: string; fecha_expedicion: string };
      const r: UnRegistroDeMentira = {
        uuid: crypto.randomUUID(),
        nif,
        serie: c.serie,
        numero: c.numero,
        fecha: c.fecha_expedicion,
        cuerpo,
        estado: 'Pendiente',
        codigoError: null,
        mensajeError: null,
      };
      registros.push(r);
      const respuesta: LoQuePasoAlEmitir = {
        resultado: 'aceptado',
        uuid: r.uuid,
        estado: 'Pendiente',
        url: elQr(r),
        qr: 'iVBORw0KGgo-qr-de-mentira',
        huella: 'B11F3A015173AD99075E2720F61E2DE1FF08CBFEDD85C6F73C77AD835301B2A3',
      };
      claves.set(`${nif}/${idempotencia}`, { cuerpo: texto, respuesta });
      // Registrado, pero la respuesta se pierde por el camino (prueba 7).
      if (comoEmite === 'perder_respuesta') {
        return Promise.resolve({
          resultado: 'sin_respuesta',
          codigoHttp: null,
          mensaje: 'TimeoutError',
        });
      }
      return Promise.resolve(respuesta);
    },

    elRegistro(nif, entorno, uuid) {
      apuntar(`registro ${entorno} ${uuid}`);
      const r = registros.find((x) => x.uuid === uuid && x.nif === nif);
      return Promise.resolve(r === undefined ? null : comoRegistro(r));
    },

    buscarEnHacienda(nif, entorno, factura) {
      apuntar(`buscar ${entorno} ${factura.serie}${factura.numero}`);
      const r = registros.find(
        (x) =>
          x.nif === nif &&
          x.serie === factura.serie &&
          x.numero === factura.numero &&
          x.fecha === factura.fecha &&
          x.estado !== 'Pendiente',
      );
      return Promise.resolve(r?.uuid ?? null);
    },

    escucharElNif(entorno, nif, aviso) {
      apuntar(`escuchar ${entorno} ${nif}`);
      return Promise.resolve(aviso.id ?? 'aviso-de-mentira');
    },

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

    comprobarIva(codigoPais, iva) {
      apuntar(`comprobar IVA ${codigoPais} ${iva}`);
      return Promise.resolve(
        iva === 'DE123456789' ? 'si' : iva === 'DE000000000' ? 'no_se_sabe' : 'no',
      );
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
