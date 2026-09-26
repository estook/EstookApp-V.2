import { Boton, EstadoVacio } from '@estook/ui';
import { usarSesion } from './Sesion.tsx';

/**
 * El servidor no contesta y hay una sesión guardada (24-sep).
 *
 * **No es la pantalla de entrar**, y esa es toda la razón de que exista. Antes,
 * cualquier fallo al preguntar quién eres —sin red, o la API sin conexiones a la
 * base— pintaba «Entra en Estook» en mitad de Almacén: parecía que te habían
 * echado, y la contraseña tampoco servía, porque el problema no era la sesión.
 *
 * Aquí se dice lo que pasa, que no es culpa de quien mira y que no se ha perdido
 * nada, y se deja volver a probar. «Salir» sigue a mano para quien quiera entrar
 * con otra cuenta.
 */
export function SinServidor() {
  const { volverAProbar, probandoOtraVez, salir } = usarSesion();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-[30rem]">
        <EstadoVacio
          esLaPagina
          dibujo="sin-conexion"
          titulo="No llego al servidor"
          frase="Sigues dentro y no se ha perdido nada. Puede ser la conexión del teléfono o un momento de mucho trabajo del servidor."
          accion={
            <Boton
              tono="principal"
              cargando={probandoOtraVez}
              textoCargando="Probando"
              onClick={volverAProbar}
            >
              Volver a probar
            </Boton>
          }
          alternativa={
            <Boton
              tono="texto"
              onClick={() => {
                void salir();
              }}
            >
              Salir
            </Boton>
          }
        />
      </div>
    </main>
  );
}
