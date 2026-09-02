import { useState } from 'react';
import { centimos, conSimbolo, type Centimos } from '@estook/dominio';
import { Campo, CampoMoneda, Interruptor, Selector } from '@estook/ui';
import { Pieza } from '../Pieza.tsx';

/**
 * Los campos.
 *
 * El de moneda es el importante: trabaja en **céntimos enteros** y enseña euros
 * (regla 9). Aquí se ve lo que devuelve mientras se escribe, que es donde se
 * rompen los campos de dinero: teclea «10.000,50» y mira el céntimo de abajo.
 */
export function LosCampos() {
  const [importe, setImporte] = useState<Centimos | null>(centimos(1230));
  const [aviso, setAviso] = useState(true);
  const [silencio, setSilencio] = useState(false);

  return (
    <>
      <Pieza
        nombre="Campo"
        cuando="Etiqueta siempre, nunca solo un texto de ejemplo dentro (B8). El error va atado al campo, para que un lector de pantalla lo lea al entrar."
      >
        <div className="grid gap-e4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del producto" placeholder="Tomate pera" obligatorio />
          <Campo
            etiqueta="Correo"
            tipo="correo"
            defaultValue="sinarroba"
            error="Eso no parece un correo. Tiene que llevar una arroba."
          />
          <Campo etiqueta="Unidades" tipo="numero" defaultValue={12} detras="uds" />
          <Campo etiqueta="Fecha de caducidad" tipo="fecha" ayuda="La que viene en el envase" />
          <Campo etiqueta="Hora de corte" tipo="hora" defaultValue="06:00" />

          {/*
            M4. Los dos que trajo el login. El de PIN no es un `number`: un
            `<input type="number">` trae flechitas, admite notacion cientifica y en
            algunos moviles se come los ceros de la izquierda. Un PIN que empieza
            por cero no es un numero, es una clave.
          */}
          <Campo
            etiqueta="Tu contraseña"
            tipo="contrasena"
            defaultValue="no se ve"
            ayuda="Se pinta con puntos, y el gestor de contraseñas la reconoce"
          />
          <Campo
            etiqueta="Tu PIN"
            tipo="pin"
            defaultValue="048213"
            ayuda="Teclado numérico en móvil, y sin las pegas de un campo de número"
          />
          <Campo etiqueta="Sin tocar" placeholder="Deshabilitado" disabled />
        </div>
      </Pieza>

      <Pieza
        nombre="CampoMoneda"
        cuando="Entra y sale en céntimos enteros; los euros solo existen mientras se escribe. Se ordena al salir del campo, no a cada tecla."
      >
        <div className="grid gap-e4 sm:grid-cols-2">
          <CampoMoneda
            etiqueta="Precio de compra"
            valor={importe}
            alCambiar={setImporte}
            ayuda="Prueba a escribir 10.000,50"
          />
          <div className="flex flex-col justify-center gap-e1">
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
              Lo que devuelve
            </p>
            <p className="text-seccion font-semibold">
              {importe === null ? 'null · no es lo mismo que cero' : `${importe} céntimos`}
            </p>
            <p className="text-secundario text-texto-suave">
              {importe === null ? 'Vacío es «no se ha puesto»' : conSimbolo(importe)}
            </p>
          </div>
        </div>
      </Pieza>

      <Pieza
        nombre="Selector"
        cuando="Un desplegable de verdad, para que traiga gratis el teclado, el lector de pantalla y la rueda del móvil. Si la lista es larga, no es esto: es el buscador."
      >
        <div className="grid gap-e4 sm:grid-cols-2">
          <Selector
            etiqueta="Territorio"
            defaultValue="peninsula"
            opciones={[
              { valor: 'peninsula', texto: 'Península y Baleares' },
              { valor: 'canarias', texto: 'Canarias' },
              { valor: 'ceuta', texto: 'Ceuta' },
              { valor: 'melilla', texto: 'Melilla' },
            ]}
          />
          <Selector
            etiqueta="Proveedor"
            opciones={[]}
            cuandoNoHay="Todavía no hay proveedores"
            ayuda="Un desplegable vacío dice por qué lo está"
          />
        </div>
      </Pieza>

      <Pieza
        nombre="Interruptor"
        cuando="Surte efecto al momento. Si hace falta darle a «Guardar», entonces no es un interruptor: es una casilla."
      >
        <div className="flex flex-col gap-e4">
          <Interruptor
            etiqueta="Avisarme de los agotados"
            puesto={aviso}
            alCambiar={setAviso}
            ayuda="Llega al móvil en cuanto alguien marca un plato como agotado"
          />
          <Interruptor
            etiqueta="Silencio fuera del turno"
            puesto={silencio}
            alCambiar={setSilencio}
          />
          <Interruptor
            etiqueta="Deshabilitado"
            puesto={false}
            alCambiar={() => undefined}
            disabled
          />
        </div>
      </Pieza>
    </>
  );
}
