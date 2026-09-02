import { useState } from 'react';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Campo, ErrorEnCristiano, Interruptor, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Lo que la organizacion decide sobre el acceso (M4).
 *
 * Dos cosas, y las dos estan en el Plan de M4 palabra por palabra: «doble factor
 * **exigible desde la organizacion**» y «**segundo administrador o correo de
 * recuperacion obligatorio**».
 *
 * ── Por que estan aqui y no en «Mi acceso» ───────────────────────────────────
 *
 * Porque no son de una persona: son del negocio. Quien exige el segundo factor lo
 * exige a las catorce personas de su plantilla, y quien pone el correo de
 * recuperacion decide como se vuelve a entrar el dia que se pierda el acceso.
 * Mezclarlo con «mi contrasena» haria pensar que solo afecta a quien lo toca.
 *
 * Solo sale a quien puede tocarlo. Y eso **no es lo que protege**: lo protege la
 * politica de M1 sobre `estook.organizacion`, que exige `app.ajustes` en
 * `ver_y_editar`. Esconder un boton no protege nada (principio 7); esto es para
 * que a quien no puede no se le ensene un boton que le va a decir que no.
 */
export function AjustesDeOrganizacion() {
  const { yo, cliente, refrescar, permisos } = usarSesion();

  const [correo, setCorreo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [aQuienLeFalta, setAQuienLeFalta] = useState<number | null>(null);

  // La version del control optimista: si otra persona lo cambia mientras esta
  // pantalla esta abierta, el servidor para y lo dice, en vez de pisarlo.
  const organizacion = yo?.organizacion ?? null;

  if (organizacion === null) return null;
  if (!puedeEditar(permisos, 'app.ajustes')) return null;

  async function exigirDobleFactor(exigir: boolean) {
    if (organizacion === null) return;
    setCambiando(true);
    setError(null);

    const respuesta = await cliente.ejecutar<{ aQuienLeFalta: number }>('exigir_doble_factor', {
      organizacion_id: organizacion.id,
      exigir,
      version: organizacion.version,
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setCambiando(false);
      return;
    }

    // A cuanta gente le va a caer encima. Se dice antes de que empiecen a llamar.
    setAQuienLeFalta(exigir ? respuesta.datos.aQuienLeFalta : null);
    await refrescar();
    setCambiando(false);
  }

  // Lo escrito, o lo que ya habia. Un campo controlado que empieza en `null`
  // ensena lo guardado hasta que alguien lo toca, y a partir de ahi lo suyo.
  const escrito = correo ?? organizacion.correoDeRecuperacion ?? '';

  async function guardarCorreo() {
    if (organizacion === null) return;
    setCambiando(true);
    setError(null);

    const respuesta = await cliente.ejecutar('poner_correo_de_recuperacion', {
      organizacion_id: organizacion.id,
      correo: escrito.trim() === '' ? null : escrito.trim(),
      version: organizacion.version,
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setCambiando(false);
      return;
    }

    await refrescar();
    setCambiando(false);
  }

  return (
    <Tarjeta
      titulo={`Acceso de ${organizacion.nombre}`}
      origen="Afecta a todo el equipo, no solo a ti"
    >
      {error && (
        <div className="mb-e3">
          <ErrorEnCristiano error={error} />
        </div>
      )}

      <div className="flex flex-col gap-e4">
        <div>
          <Interruptor
            etiqueta="Exigir el doble factor a todo el mundo"
            puesto={organizacion.exigeDobleFactor}
            disabled={cambiando}
            alCambiar={(puesto) => {
              void exigirDobleFactor(puesto);
            }}
          />
          <p className="mt-e1 text-secundario text-texto-suave">
            Con esto puesto, nadie del negocio entra sin el código de su aplicación de
            autenticación. A quien todavía no lo tenga <strong>se le deja entrar</strong>, porque
            desde fuera no podría activarlo, y la aplicación se lo pide nada más entrar.
          </p>
          {aQuienLeFalta !== null && aQuienLeFalta > 0 && (
            <div className="mt-e2">
              <Aviso tono="atencion" titulo={`Le falta a ${aQuienLeFalta} personas`}>
                Mañana te van a preguntar. Merece la pena avisarlas antes.
              </Aviso>
            </div>
          )}
        </div>

        <div className="border-t border-borde pt-e3">
          <Campo
            etiqueta="Correo de recuperación"
            tipo="correo"
            value={escrito}
            onChange={(evento) => {
              setCorreo(evento.target.value);
            }}
            ayuda="Para volver a entrar si el negocio se queda sin nadie que pueda administrarlo. Se puede quitar si hay una segunda persona con ese acceso."
          />
          <div className="mt-e2">
            <Boton
              cargando={cambiando}
              onClick={() => {
                void guardarCorreo();
              }}
            >
              Guardar
            </Boton>
          </div>
        </div>
      </div>
    </Tarjeta>
  );
}
