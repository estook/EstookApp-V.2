/**
 * servidor/dominio · entidades, invariantes y servicios.
 *
 * El corazon. No importa red, ni base de datos, ni framework. Se puede probar sin levantar nada.
 *
 * Vacio a proposito en M0. El modelo maestro entra en M1 y los siete motores en M2.
 * En M4 entra lo unico que el servidor calcula y el cliente no puede calcular
 * jamas: contrasenas, PIN, tokens de sesion y el segundo factor.
 */
export const CAPA = 'dominio' as const;

export {
  VUELTAS,
  DIGITOS_DEL_PIN,
  LARGO_MINIMO_DE_CLAVE,
  salNueva,
  derivar,
  derivarConSalDelLocal,
  comprobar,
  pinNuevo,
  esPinConForma,
  tokenNuevo,
  huellaDeToken,
  porQueNoValeLaClave,
} from './secretos.ts';

export {
  SEGUNDOS_POR_CODIGO,
  DIGITOS,
  VENTANA,
  CUANTOS_DE_RESPALDO,
  aBase32,
  deBase32,
  secretoNuevo,
  enlaceDeAlta,
  secretoParaTeclear,
  codigoEn,
  comprobarCodigo,
  codigosDeRespaldo,
} from './doble-factor.ts';
