import { ERRORES, type CodigoDeError } from '@estook/dominio';
import { IconoAnadir } from '@estook/iconos';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Esqueleto,
  TarjetaCargando,
  TodaviaNo,
} from '@estook/ui';
import { Pieza } from '../Pieza.tsx';

/**
 * Los avisos, los errores, los estados vacíos y la carga.
 *
 * Esta sección es la que más dice del producto. «Todo error dice **qué ha
 * pasado, qué se puede hacer y con qué botón**» (B4), y aquí se ve que no es una
 * intención: `ErrorEnCristiano` **no recibe texto, recibe el error del catálogo
 * cerrado de M2**, así que no hay forma de pintar un mensaje suelto escrito con
 * prisa.
 *
 * Y se pintan **los doce errores que existen**, generados desde el catálogo.
 * Si alguien añade uno, aparece aquí sin tocar nada; si alguien escribe uno mal,
 * se ve.
 */
const CODIGOS = Object.keys(ERRORES) as CodigoDeError[];

export function LosAvisos() {
  return (
    <>
      <Pieza
        nombre="Aviso"
        cuando="Los colores de estado nunca van solos: siempre con icono y con texto, porque hay gente que no distingue rojo de verde."
      >
        <div className="flex flex-col gap-e3">
          <Aviso tono="bien" titulo="Recuento cerrado">
            El inventario de hoy cuadra con lo que había ayer más lo recibido.
          </Aviso>
          <Aviso tono="atencion" titulo="Tres productos caducan esta semana">
            Míralos antes del jueves para poder darles salida.
          </Aviso>
          <Aviso
            tono="mal"
            titulo="La cámara ha estado fuera de rango"
            accion={<Boton tono="secundario">Apuntar la acción correctiva</Boton>}
            alCerrar={() => undefined}
          >
            Estuvo a 9 ºC durante cuarenta minutos. Hay que dejar escrito qué se hizo.
          </Aviso>
          <Aviso tono="info" titulo="La carta está en borrador">
            Los cambios no se ven en la carta digital hasta que alguien la publique.
          </Aviso>
        </div>
      </Pieza>

      <Pieza
        nombre="ErrorEnCristiano"
        cuando="No recibe texto: recibe el error del catálogo de M2. Estos son los doce que existen, tal como los verá quien se los encuentre."
      >
        <div className="flex flex-col gap-e3">
          {CODIGOS.map((codigo) => (
            <ErrorEnCristiano key={codigo} error={ERRORES[codigo]} alActuar={() => undefined} />
          ))}
        </div>
      </Pieza>

      <Pieza
        nombre="EstadoVacio"
        cuando="Siempre con una frase y un botón. Nunca una pantalla en blanco. Si de verdad no hay acción posible, hay que decir por qué."
      >
        <div className="grid gap-e4 md:grid-cols-2">
          <div className="rounded-grande border border-borde">
            <EstadoVacio
              titulo="Todavía no hay productos"
              frase="Cuando entre el primer albarán, aquí sale lo que hay, lo que falta y lo que se ha ido sin explicación."
              accion={
                <Boton tono="principal" icono={<IconoAnadir size={18} />}>
                  Añadir un producto
                </Boton>
              }
            />
          </div>
          <div className="rounded-grande border border-borde">
            <EstadoVacio
              titulo="No hay nada que revisar"
              frase="Cuando un APPCC se salga de rango, aparecerá aquí con lo que hay que hacer."
              sinAccionPorque="No hay nada que crear desde esta pantalla: los registros los abre el turno."
            />
          </div>
        </div>
      </Pieza>

      <Pieza
        nombre="TodaviaNo"
        cuando="El estado vacío de una pantalla que todavía no tiene su módulo. Dice qué irá ahí y en cuál se construye: honesto y útil, en vez de una pantalla que parece rota."
      >
        <div className="rounded-grande border border-borde">
          <TodaviaNo
            que="Inventario · Pedidos"
            queHabra="Los pedidos a proveedor, su recepción y la conciliación con la factura."
            modulo="M7 · Proveedores y compras"
          />
        </div>
      </Pieza>

      <Pieza
        nombre="Cargando"
        cuando="Esqueletos, nunca ruedas girando. Una rueda dice «espera»; un esqueleto dice «va a haber una tabla de tres filas aquí», y además evita que la pantalla salte al llegar los datos."
      >
        <div className="flex flex-col gap-e4">
          <Cargando que="los productos" lineas={3} />

          <div className="grid gap-e3 sm:grid-cols-3">
            <TarjetaCargando que="las ventas de hoy" />
            <TarjetaCargando que="los pendientes" />
            <TarjetaCargando que="la salud de los datos" />
          </div>

          <div className="flex items-center gap-e3">
            <Esqueleto alto={32} ancho="32px" redondo />
            <div className="flex flex-1 flex-col gap-e2">
              <Esqueleto alto={14} ancho="40%" />
              <Esqueleto alto={12} ancho="70%" />
            </div>
          </div>
        </div>
      </Pieza>
    </>
  );
}
