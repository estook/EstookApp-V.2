import { useRef, useState } from 'react';
import type { ClaseDeCliente, ElDestinatario } from '@estook/dominio';
import type { ErrorDeLaApi } from '../componentes/Aviso.tsx';
import type { ClienteDeFacturas } from './usarLectura.ts';

/**
 * **Lo que se escribe del cliente de una factura** (T6 · 2 · 2, decisiones 0137 y 0139), para una
 * factura, una señal o una corrección: se comprueba en Hacienda al escribirlo, y si su número ya tiene
 * una factura, lo demás sale de ella. Lo pinta `ParaQuien`.
 */

export interface Comprobado {
  readonly vale: boolean;
  readonly dice: string | null;
  readonly nombre: string | null;
  readonly domicilio: string | null;
  readonly correo: string | null;
}

/** Lo que salió solo del número escrito: si se cambia el número, eso ya no vale. */
const SIN_RELLENAR: {
  nombre: string | null;
  domicilio: string | null;
  correo: string | null;
} = { nombre: null, domicilio: null, correo: null };

/** El estado de «Para quién». Con `inicial` empieza con los datos de esa factura, para corregirlos. */
export function usarElCliente(cliente: ClienteDeFacturas, inicial?: ElDestinatario | null) {
  const [clase, setClase] = useState<ClaseDeCliente>(inicial?.clase ?? 'empresa');
  const [identificador, setIdentificador] = useState(inicial?.identificador ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [domicilio, setDomicilio] = useState(inicial?.domicilio ?? '');
  const [correo, setCorreo] = useState('');
  const [codigoPais, setCodigoPais] = useState(inicial?.codigo_pais ?? 'DE');
  const [idTipo, setIdTipo] = useState<'02' | '03'>(inicial?.id_tipo ?? '02');
  const [comprobado, setComprobado] = useState<Comprobado | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [rellenado, setRellenado] = useState(SIN_RELLENAR);
  const [errorAlComprobar, setErrorAlComprobar] = useState<ErrorDeLaApi | null>(null);
  const preguntas = useRef(0);

  /** Cambia el número: lo que salió del número de antes no vale para este. Lo escrito a mano, sí. */
  function cambiarElNumero(numero: string) {
    setIdentificador(numero);
    setComprobado(null);
    setComprobando(false);
    preguntas.current += 1;
    setNombre((n) => (n === rellenado.nombre ? '' : n));
    setDomicilio((d) => (d === rellenado.domicilio ? '' : d));
    setCorreo((c) => (c === rellenado.correo ? '' : c));
    setRellenado(SIN_RELLENAR);
  }

  async function comprobar() {
    if (identificador.trim() === '') return;
    preguntas.current += 1;
    const estaPregunta = preguntas.current;
    setComprobando(true);
    const r = await cliente.ejecutar<Comprobado>('comprobar_al_cliente', {
      clase,
      identificador,
      ...(nombre.trim() === '' ? {} : { nombre }),
      ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
    });
    // Mientras contestaba se ha cambiado el número: esto es de otro cliente.
    if (estaPregunta !== preguntas.current) return;
    setComprobando(false);
    if (!r.ok) {
      setErrorAlComprobar(r.error);
      return;
    }
    setErrorAlComprobar(null);
    setComprobado(r.datos);
    const nuevos = { ...rellenado };
    if (r.datos.nombre !== null) {
      setNombre(r.datos.nombre);
      nuevos.nombre = r.datos.nombre;
    }
    if (r.datos.domicilio !== null && domicilio.trim() === '') {
      setDomicilio(r.datos.domicilio);
      nuevos.domicilio = r.datos.domicilio;
    }
    if (r.datos.correo !== null && correo.trim() === '') {
      setCorreo(r.datos.correo);
      nuevos.correo = r.datos.correo;
    }
    setRellenado(nuevos);
  }

  const elCliente = {
    clase,
    nombre,
    identificador,
    domicilio,
    ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
  };
  const faltaCliente =
    identificador.trim() === '' || nombre.trim() === '' || domicilio.trim().length < 5;
  const noVale = comprobado !== null && !comprobado.vale;

  return {
    clase,
    setClase,
    identificador,
    nombre,
    setNombre,
    domicilio,
    setDomicilio,
    correo,
    setCorreo,
    codigoPais,
    setCodigoPais,
    idTipo,
    setIdTipo,
    comprobado,
    setComprobado,
    comprobando,
    rellenado,
    errorAlComprobar,
    cambiarElNumero,
    comprobar,
    elCliente,
    faltaCliente,
    noVale,
    /** Lo que Hacienda ya ha dado por bueno: si es el mismo número, la señal ya es suya. */
    numeroComprobado: comprobado?.vale === true ? identificador.trim() : '',
  };
}

export type ElEstadoDelCliente = ReturnType<typeof usarElCliente>;
