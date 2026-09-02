import { useState, type FormEvent } from 'react';
import { Boton, Campo } from '@estook/ui';
import { usarSesion } from '../../sesion/Sesion.tsx';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 1 · «¿Cómo te llamas?» (M5).
 *
 * «Nombre y correo. **Ese correo recibe lo importante**» (Manifiesto 8).
 *
 * ── Por qué no se pregunta el correo de entrar ───────────────────────────────
 *
 * Porque quien hace el alta **ya ha entrado**: el alta es la quinta comprobación
 * al entrar, no un registro. Su correo ya lo sabemos.
 *
 * Lo que sí falta, y es lo que este paso resuelve, es el **correo de
 * recuperación** de la organización: la otra mitad de «segundo administrador o
 * correo de recuperación obligatorio» de M4. Quien monta su bar solo no tiene
 * segundo administrador, así que sin esto se queda sin forma de volver a entrar
 * el día que pierda la contraseña, y no se entera hasta ese día.
 */
export function QuienEres({ cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const { yo, refrescar } = usarSesion();

  const [nombre, setNombre] = useState(yo?.nombre ?? '');
  const [apellidos, setApellidos] = useState(yo?.apellidos ?? '');
  const [recuperacion, setRecuperacion] = useState(yo?.organizacion?.correoDeRecuperacion ?? '');
  const [enviando, setEnviando] = useState(false);

  const yaEsElSuyo = recuperacion.trim().toLowerCase() === (yo?.correo ?? '').toLowerCase();

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);

    // El correo de recuperación solo se manda si se ha escrito uno **distinto**
    // del de entrar. El mismo correo no recupera nada: si pierdes el acceso a
    // esa cuenta, pierdes las dos.
    if (recuperacion.trim() !== '' && !yaEsElSuyo && yo?.organizacion) {
      const respuesta = await cliente.ejecutar('poner_correo_de_recuperacion', {
        organizacion_id: yo.organizacion.id,
        correo: recuperacion.trim().toLowerCase(),
        version: yo.organizacion.version,
      });
      if (!respuesta.ok) {
        alFallar(respuesta.error);
        setEnviando(false);
        return;
      }
    }

    await refrescar();
    await alGuardar();
    setEnviando(false);
  }

  return (
    <form
      onSubmit={(evento) => {
        void alEnviar(evento);
      }}
      className="flex flex-col gap-e4"
    >
      <Campo
        etiqueta="Tu nombre"
        name="nombre"
        value={nombre}
        onChange={(evento) => {
          setNombre(evento.target.value);
        }}
        ayuda="Es el que sale al lado de lo que hagas en la aplicación."
        obligatorio
      />

      <Campo
        etiqueta="Apellidos"
        name="apellidos"
        value={apellidos}
        onChange={(evento) => {
          setApellidos(evento.target.value);
        }}
      />

      <Campo
        etiqueta="Un correo por si pierdes el acceso"
        tipo="correo"
        name="recuperacion"
        value={recuperacion}
        onChange={(evento) => {
          setRecuperacion(evento.target.value);
        }}
        {...(yaEsElSuyo
          ? {
              error:
                'Ese es con el que entras. Pon otro: si pierdes esa cuenta, perderías las dos.',
            }
          : {
              ayuda: `Distinto de ${yo?.correo ?? 'el tuyo'}. Es lo único que te devuelve la cuenta si pierdes la contraseña.`,
            })}
      />

      <Boton
        type="submit"
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        disabled={yaEsElSuyo}
      >
        Continuar
      </Boton>
    </form>
  );
}
