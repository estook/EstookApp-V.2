import { useState, type FormEvent } from 'react';
import { ALCANCE_DEL_ROL, type Rol } from '@estook/dominio';
import { Boton, Botones, Campo, ErrorEnCristiano, Hoja, Selector } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

// ── Invitar ──────────────────────────────────────────────────────────────────

/**
 * Los roles que se conceden sobre un local. Los de organizacion y area se dan
 * desde Ajustes de la organizacion, que es donde se ven todos los locales.
 */
const ROLES_DE_LOCAL = [
  { valor: 'gerente', texto: 'Gerente · todo lo de su local' },
  { valor: 'jefe_de_cocina', texto: 'Jefe de cocina · inventario, escandallos y APPCC' },
  { valor: 'jefe_de_sala', texto: 'Jefe de sala · cuadrante de sala y ventas del turno' },
  { valor: 'cocinero', texto: 'Cocinero · sus fichas y su turno. Ningún importe' },
  { valor: 'camarero', texto: 'Camarero · su turno, el menú y los alérgenos' },
] as const;

export function Invitar({
  alCerrar,
  alHecho,
}: {
  alCerrar: () => void;
  alHecho: (quien: { nombre: string; pin: string | null; yaExistia: boolean }) => void;
}) {
  const { cliente, yo } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState<string>('camarero');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const alcance = ALCANCE_DEL_ROL[rol as Rol];

    const respuesta = await cliente.ejecutar<{ pin: string | null; yaExistia: boolean }>(
      'invitar_persona',
      {
        correo,
        nombre,
        ...(apellidos === '' ? {} : { apellidos }),
        rol,
        organizacion_id: yo?.organizacion?.id ?? '',
        ...(alcance === 'local' ? { local_id: yo?.local?.id ?? '' } : {}),
      },
    );

    if (!respuesta.ok) {
      setError(respuesta.error);
      setEnviando(false);
      return;
    }

    alHecho({
      nombre,
      pin: respuesta.datos.pin,
      yaExistia: respuesta.datos.yaExistia,
    });
  }

  return (
    <Hoja abierta titulo="Invitar a alguien" alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="Su correo"
          tipo="correo"
          ayuda="Si ya trabaja en otro local de Estook, se le añade el acceso: nunca se duplica la persona."
          value={correo}
          onChange={(evento) => {
            setCorreo(evento.target.value);
          }}
          obligatorio
        />

        <Campo
          etiqueta="Su nombre"
          value={nombre}
          onChange={(evento) => {
            setNombre(evento.target.value);
          }}
          obligatorio
        />

        <Campo
          etiqueta="Sus apellidos"
          value={apellidos}
          onChange={(evento) => {
            setApellidos(evento.target.value);
          }}
        />

        <Selector
          etiqueta="Qué hace aquí"
          value={rol}
          opciones={[...ROLES_DE_LOCAL]}
          onChange={(evento) => {
            setRol(evento.target.value);
          }}
        />

        {error && <ErrorEnCristiano error={error} />}

        <p className="text-secundario text-texto-suave">
          Al guardar sale su <strong>PIN, en pantalla y una sola vez</strong>, para dárselo en mano.
          No hace falta que le llegue ningún correo.
        </p>

        <Botones>
          <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Dando de alta">
            Invitar
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}
