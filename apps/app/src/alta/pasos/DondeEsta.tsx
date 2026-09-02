import { useState, type FormEvent } from 'react';
import { Boton, Campo } from '@estook/ui';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 4 · «¿Dónde está tu restaurante?» (M5).
 *
 * ── Esto lo iba a rellenar Google, y de momento no ───────────────────────────
 *
 * El Manifiesto pide aquí Google Places: se escribe el nombre, salen los
 * resultados y al tocar el tuyo se rellenan nombre, dirección, teléfono y
 * horarios, con las reseñas y los competidores de propina.
 *
 * **Se aplaza a M23**, que es donde viven las reseñas y la competencia y donde
 * hay que enlazar la ficha de Google de todas formas. Está razonado en
 * `docs/decisiones/0013`. Mientras tanto se escribe a mano, que son cuatro
 * casillas y treinta segundos.
 *
 * ── La hora de cierre no es un adorno ────────────────────────────────────────
 *
 * «Un bar cierra a las tres de la mañana. Una venta de las 02:30 del sábado
 *  pertenece a la jornada del **viernes**» (motor de tiempo, M2). Sin esta
 * respuesta, las ventas del cierre acabarían en el día equivocado y la
 * desviación de género no cuadraría nunca. Por eso se pregunta aquí y no en un
 * ajuste avanzado que nadie abre.
 */
export function DondeEsta({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const [nombre, setNombre] = useState(alta.nombre);
  const [direccion, setDireccion] = useState(alta.ficha.direccion ?? '');
  const [codigoPostal, setCodigoPostal] = useState(alta.ficha.codigoPostal ?? '');
  const [poblacion, setPoblacion] = useState(alta.ficha.poblacion ?? '');
  const [provincia, setProvincia] = useState(alta.ficha.provincia ?? '');
  const [telefono, setTelefono] = useState(alta.ficha.telefono ?? '');
  const [horaDeCorte, setHoraDeCorte] = useState(alta.ficha.horaDeCorte);
  const [enviando, setEnviando] = useState(false);

  const cpMal = codigoPostal !== '' && !/^[0-9]{5}$/.test(codigoPostal);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (cpMal) return;

    setEnviando(true);

    const respuesta = await cliente.ejecutar('guardar_donde_esta', {
      nombre: nombre.trim(),
      // Vacío es nulo: una casilla en blanco significa «no lo sé», no «».
      direccion: direccion.trim() || null,
      codigo_postal: codigoPostal.trim() || null,
      poblacion: poblacion.trim() || null,
      provincia: provincia.trim() || null,
      telefono: telefono.trim() || null,
      hora_de_corte: horaDeCorte,
    });

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setEnviando(false);
      return;
    }

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
        etiqueta="Cómo se llama"
        name="nombre"
        value={nombre}
        onChange={(evento) => {
          setNombre(evento.target.value);
        }}
        obligatorio
      />

      <Campo
        etiqueta="Dirección"
        name="direccion"
        value={direccion}
        onChange={(evento) => {
          setDireccion(evento.target.value);
        }}
        ayuda="Sale en los documentos que genera Estook."
      />

      <div className="grid gap-e4 sm:grid-cols-2">
        <Campo
          etiqueta="Código postal"
          name="codigo-postal"
          inputMode="numeric"
          value={codigoPostal}
          onChange={(evento) => {
            setCodigoPostal(evento.target.value.slice(0, 5));
          }}
          {...(cpMal ? { error: 'Un código postal son cinco cifras.' } : {})}
        />

        <Campo
          etiqueta="Población"
          name="poblacion"
          value={poblacion}
          onChange={(evento) => {
            setPoblacion(evento.target.value);
          }}
        />
      </div>

      <div className="grid gap-e4 sm:grid-cols-2">
        <Campo
          etiqueta="Provincia"
          name="provincia"
          value={provincia}
          onChange={(evento) => {
            setProvincia(evento.target.value);
          }}
        />

        <Campo
          etiqueta="Teléfono"
          tipo="telefono"
          name="telefono"
          value={telefono}
          onChange={(evento) => {
            setTelefono(evento.target.value);
          }}
        />
      </div>

      <Campo
        etiqueta="¿A qué hora cierras?"
        tipo="hora"
        name="hora-de-corte"
        value={horaDeCorte}
        onChange={(evento) => {
          setHoraDeCorte(evento.target.value);
        }}
        ayuda="Lo que se venda antes de esta hora cuenta como el día anterior. Si cierras a las tres, pon las 03:00."
        obligatorio
      />

      <Boton
        type="submit"
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        disabled={nombre.trim() === '' || cpMal}
      >
        Continuar
      </Boton>
    </form>
  );
}
