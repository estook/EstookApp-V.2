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
  { valor: 'jefe_de_cocina', texto: 'Jefe de cocina · almacén, escandallos y APPCC' },
  { valor: 'jefe_de_sala', texto: 'Jefe de sala · cuadrante de sala y ventas del turno' },
  { valor: 'cocinero', texto: 'Cocinero · sus fichas y su turno. Ningún importe' },
  { valor: 'camarero', texto: 'Camarero · su turno, el menú y los alérgenos' },
] as const;

export function Invitar({
  alCerrar,
  alHecho,
}: {
  alCerrar: () => void;
  alHecho: (quien: {
    nombre: string;
    pin: string | null;
    yaExistia: boolean;
    sinCorreo: boolean;
  }) => void;
}) {
  const { cliente, yo } = usarSesion();
  // Solo los que se pueden dar: los que quedan por debajo del rol de quien invita
  // (0034). Un gerente no ve «Gerente»: lo nombra quien está por encima de los dos.
  const sePuedenDar = new Set(yo?.rolesQuePuedoDar ?? []);
  const roles = ROLES_DE_LOCAL.filter((r) => sePuedenDar.has(r.valor));
  const [correo, setCorreo] = useState('');
  // Sin correo (0057): un extra, un friegaplatos. Ficha con su PIN en el aparato del local.
  const [sinCorreo, setSinCorreo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState<string>(
    roles.some((r) => r.valor === 'camarero') ? 'camarero' : (roles.at(-1)?.valor ?? 'camarero'),
  );
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
        ...(sinCorreo ? {} : { correo }),
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
      sinCorreo,
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
        {!sinCorreo && (
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
        )}

        {/*
          Sin correo (0057). Va como casilla y no escondido: un extra que no da su
          correo es lo normal en hostelería, y quien da de alta tiene que saber que
          se puede. Solo para puestos de este local: sin correo se entra únicamente
          en el aparato del local, con el PIN de aquí.
        */}
        <label className="flex min-h-toque items-start gap-e2 text-cuerpo">
          <input
            type="checkbox"
            checked={sinCorreo}
            onChange={(evento) => {
              setSinCorreo(evento.currentTarget.checked);
            }}
            className="mt-[3px] size-[20px] shrink-0 accent-[var(--color-naranja)]"
          />
          <span>
            No tiene correo, o no lo quiere dar
            <span className="block text-secundario text-texto-suave">
              Ficha con su PIN en el aparato del local. No podrá entrar desde un móvil suyo; si un
              día da su correo, se le pone en su ficha.
            </span>
          </span>
        </label>

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
          opciones={[...roles]}
          ayuda="Los que quedan por debajo del tuyo. A alguien de tu nivel lo nombra quien está por encima."
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
