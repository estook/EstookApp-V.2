import {
  IconoAjustes,
  IconoLocal,
  IconoPersona,
  IconoSalir,
  IconoTamanoDeLetra,
} from '@estook/iconos';
import { Avatar, Hoja, clases } from '@estook/ui';
import type { ReactNode } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Tu cuenta · la hoja que hay detras del avatar.
 *
 * ── Que arregla ──────────────────────────────────────────────────────────────
 *
 * Habia **dos puertas a Ajustes a diez centimetros una de otra**: un icono de
 * ajustes en la barra de arriba del movil y la posicion «Ajustes» en la barra de
 * abajo. Y en escritorio lo mismo: un icono de ajustes y, pegado, un avatar que
 * abria la misma pantalla.
 *
 * Quitar sin mas el de arriba habria vuelto a abrir el agujero que M6 tapo:
 * **dentro de una app la barra de abajo es la de esa app**, asi que ahi no hay
 * posicion «Ajustes» y no habria forma de llegar. Por eso el avatar deja de ser
 * un atajo a Ajustes y pasa a ser lo que es en cualquier aplicacion: la puerta de
 * tu cuenta, desde la que se llega a Ajustes, a tu acceso, a cambiar de local y a
 * salir. Desde cualquier pantalla, dentro o fuera de una app.
 *
 * ── Por que el local esta aqui tambien ───────────────────────────────────────
 *
 * En la barra de arriba el nombre del local se ve siempre, y se cambia con un
 * desplegable. Eso funciona con dos o tres; con seis locales, un `<select>` en
 * 200 px es una lista que no se lee. Aqui caben con su nombre entero y se ve cual
 * es el de ahora, y cambiar de local sigue pudiendose deshacer.
 */
export function MiCuenta({
  abierta,
  alCerrar,
  alIrAAjustes,
  alIrAMiAcceso,
  alCambiarDeLocal,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly alIrAAjustes: () => void;
  readonly alIrAMiAcceso: () => void;
  readonly alCambiarDeLocal: (id: string) => void;
}) {
  const { yo, salir } = usarSesion();

  const suOrganizacion = yo?.organizacion?.id;
  const susLocales = (yo?.locales ?? []).filter((local) => local.organizacionId === suOrganizacion);

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu cuenta">
      <div className="flex flex-col gap-e4">
        <header className="flex items-center gap-e3">
          <Avatar nombre={yo?.nombre ?? ''} tamano={44} />
          <div className="min-w-0">
            <p className="truncate text-seccion font-semibold">
              {yo?.nombre}
              {yo?.apellidos === null || yo?.apellidos === undefined ? '' : ` ${yo.apellidos}`}
            </p>
            <p className="truncate text-secundario text-texto-suave">{yo?.correo}</p>
          </div>
        </header>

        {/* Donde estas, y donde mas puedes estar. Con un solo local se ensena y
            ya: una lista de un elemento no es una lista. */}
        {yo?.local !== null && yo?.local !== undefined && (
          <section className="flex flex-col gap-e1">
            <p className="text-etiqueta uppercase tracking-wide text-texto-suave">Dónde estás</p>
            {susLocales.length <= 1 ? (
              <p className="flex items-center gap-e2 px-e2 py-e2 text-cuerpo">
                <IconoLocal size={18} />
                {yo.local.nombre}
              </p>
            ) : (
              susLocales.map((local) => {
                const esDeAhora = local.id === yo.local?.id;
                return (
                  <button
                    key={local.id}
                    type="button"
                    aria-current={esDeAhora ? 'true' : undefined}
                    onClick={() => {
                      if (!esDeAhora) alCambiarDeLocal(local.id);
                      alCerrar();
                    }}
                    className={clases(
                      'flex min-h-toque items-center gap-e2 rounded-medio px-e2 text-left text-cuerpo',
                      esDeAhora ? 'bg-naranja-suave font-medium' : 'hover:bg-fondo',
                    )}
                  >
                    <IconoLocal size={18} />
                    <span className="min-w-0 flex-1 truncate">{local.nombre}</span>
                    {esDeAhora && (
                      <span className="text-etiqueta uppercase tracking-wide text-texto-suave">
                        aquí
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </section>
        )}

        <section className="flex flex-col gap-e1">
          <p className="text-etiqueta uppercase tracking-wide text-texto-suave">Tu cuenta</p>

          <Fila
            icono={<IconoPersona size={18} />}
            titulo="Mi acceso"
            detalle="Contraseña, PIN, doble factor y mis aparatos"
            alPulsar={() => {
              alCerrar();
              alIrAMiAcceso();
            }}
          />
          <Fila
            icono={<IconoAjustes size={18} />}
            titulo="Ajustes"
            detalle="La aplicación, el idioma y el negocio"
            alPulsar={() => {
              alCerrar();
              alIrAAjustes();
            }}
          />
          <Fila
            icono={<IconoTamanoDeLetra size={18} />}
            titulo="Tamaño de letra"
            detalle="Crece toda la aplicación, no solo esta pantalla"
            alPulsar={() => {
              alCerrar();
              alIrAAjustes();
            }}
          />
        </section>

        <section className="flex flex-col gap-e1 border-t border-borde pt-e3">
          <Fila
            icono={<IconoSalir size={18} />}
            titulo="Salir"
            detalle="Cierra la sesión en este aparato"
            tono="mal"
            alPulsar={() => {
              alCerrar();
              void salir();
            }}
          />
        </section>
      </div>
    </Hoja>
  );
}

function Fila({
  icono,
  titulo,
  detalle,
  alPulsar,
  tono,
}: {
  readonly icono: ReactNode;
  readonly titulo: string;
  readonly detalle: string;
  readonly alPulsar: () => void;
  readonly tono?: 'mal';
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className={clases(
        'flex min-h-toque items-center gap-e3 rounded-medio px-e2 py-e2 text-left hover:bg-fondo',
        tono === 'mal' ? 'text-mal' : '',
      )}
    >
      <span className={clases('shrink-0', tono === 'mal' ? '' : 'text-texto-suave')}>{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-cuerpo font-medium">{titulo}</span>
        <span className="block text-secundario text-texto-suave">{detalle}</span>
      </span>
    </button>
  );
}
