import { useState, type FormEvent } from 'react';
import type { ClienteApi, ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Campo } from '@estook/ui';
import { BuscarTuLocal, type CasillasDeGoogle } from './BuscarTuLocal.tsx';

/**
 * El nombre, la dirección, el teléfono y cuándo acaba el día de un local: **el mismo
 * formulario en el alta y en Ajustes › Tu local** (la pausa del 8-nov, 0142). Antes solo
 * estaba en el alta, y lo escrito ahí ya no se podía cambiar (Richi: «eso es necesario
 * poder editarlo»). Guarda con `guardar_donde_esta`, que siempre fue de los dos sitios.
 *
 * ── La hora de corte ya no se pregunta ───────────────────────────────────────
 *
 * Hace falta —lo vendido a la 1:30 del sábado cuenta en el viernes—, pero «¿a qué hora
 * cierras?» confundía: no es la hora de cerrar. Se pone sola a las cinco, o la que propone
 * Google si el local cierra más tarde (`horaDeCorteDelHorario`), y se cambia plegada.
 */
export interface LaFicha {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provincia: string | null;
  readonly telefono: string | null;
  readonly horaDeCorte: string;
}

export function LaFichaDelLocal({
  ficha,
  cliente,
  boton,
  alGuardar,
  alFallar,
  conBuscador,
}: {
  readonly ficha: LaFicha;
  readonly cliente: ClienteApi;
  /** «Continuar» en el alta, «Guardar» en Ajustes. */
  readonly boton: string;
  readonly alGuardar: () => Promise<void>;
  readonly alFallar: (error: ErrorDeLaApi) => void;
  /** En el alta, abierto de entrada; en Ajustes, detrás de «Rellenar desde Google». */
  readonly conBuscador: boolean;
}) {
  const [nombre, setNombre] = useState(ficha.nombre);
  const [direccion, setDireccion] = useState(ficha.direccion ?? '');
  const [codigoPostal, setCodigoPostal] = useState(ficha.codigoPostal ?? '');
  const [poblacion, setPoblacion] = useState(ficha.poblacion ?? '');
  const [provincia, setProvincia] = useState(ficha.provincia ?? '');
  const [telefono, setTelefono] = useState(ficha.telefono ?? '');
  const [horaDeCorte, setHoraDeCorte] = useState(ficha.horaDeCorte.slice(0, 5));
  const [horario, setHorario] = useState<readonly string[] | null>(null);
  const [deGoogle, setDeGoogle] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cpMal = codigoPostal !== '' && !/^[0-9]{5}$/.test(codigoPostal);

  /** Lo de Google pisa lo escrito: se acaba de elegir, y se ve antes de guardar. */
  function rellenar(c: CasillasDeGoogle) {
    if (c.nombre !== null) setNombre(c.nombre);
    if (c.direccion !== null) setDireccion(c.direccion);
    if (c.codigoPostal !== null) setCodigoPostal(c.codigoPostal);
    if (c.poblacion !== null) setPoblacion(c.poblacion);
    if (c.provincia !== null) setProvincia(c.provincia);
    if (c.telefono !== null) setTelefono(c.telefono.replace(/[^0-9+ ()-]/g, ''));
    setHoraDeCorte(c.horaDeCorte);
    setHorario(c.horario);
    setDeGoogle(true);
  }

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
      {conBuscador && <BuscarTuLocal deEntrada={ficha.nombre} alEncontrar={rellenar} />}

      {deGoogle && (
        <p className="rounded-medio bg-fondo px-e3 py-e2 text-secundario text-texto-suave">
          Rellenado desde Google: cámbialo si algo no está bien.
          {horario !== null && horario.length > 0 && (
            <span className="mt-e1 block text-texto">Abre: {horario.join(' · ')}</span>
          )}
        </p>
      )}

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

      <details className="text-secundario">
        <summary className="min-h-toque cursor-pointer py-e1 text-texto-suave">
          Tu día en Estook acaba a las <b className="text-texto">{horaDeCorte}</b>
        </summary>
        <div className="mt-e2 flex flex-col gap-e2">
          <p className="text-texto-suave">
            Lo que se venda antes de esa hora cuenta para el día anterior: la 1:30 del sábado es
            del viernes. Cámbiala solo si cierras más tarde de las cinco.
          </p>
          <Campo
            etiqueta="Tu día acaba a las"
            tipo="hora"
            name="hora-de-corte"
            value={horaDeCorte}
            onChange={(evento) => {
              setHoraDeCorte(evento.target.value);
            }}
          />
        </div>
      </details>

      <Boton
        type="submit"
        tono="principal"
        ancho
        cargando={enviando}
        textoCargando="Guardando"
        disabled={nombre.trim() === '' || cpMal}
      >
        {boton}
      </Boton>
    </form>
  );
}
