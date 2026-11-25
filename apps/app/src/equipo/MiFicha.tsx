import { Link } from 'react-router-dom';
import { Aviso, Cargando, GrupoDePlegables, Plegable } from '@estook/ui';
import {
  IconoDocumento,
  IconoFicha,
  IconoFlechaDerecha,
  IconoHistorial,
  IconoMaletin,
  IconoPalmera,
} from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { SuCara } from './SuCara.tsx';
import { comoSeLeenMinutos, type UnaPersona } from './contrato.ts';
import { CuatroBaldosas } from './ficha/Baldosas.tsx';
import { mesConMayuscula, resumenDeLasVacaciones } from './ficha/comoSeLee.ts';
import {
  InformacionLaboral,
  InformacionPersonal,
  SusNominas,
  SusVacaciones,
} from './ficha/Secciones.tsx';

/**
 * **Mi ficha** (la Ampliación 3 · 2, decisión 0153): lo suyo, para cada trabajador, tenga o no
 * la app Equipo, como Mis fichajes (0068).
 *
 * Richi, el 24-nov (pregunta 5): **«el trabajador ve y descarga sus nóminas: sí»**. Aquí las
 * tiene, con sus vacaciones, sus condiciones y sus datos. **Lo ve todo y no cambia nada**: su
 * ficha la rellena quien lleva el equipo (0127). Se llega desde Tu cuenta y desde el aviso
 * «Tu nómina ya está».
 */

function hoyEnFecha(): string {
  const hoy = new Date(Date.now());
  return `${String(hoy.getFullYear())}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

export function MiFicha() {
  const { yo } = usarSesion();
  const consulta = usarLectura<UnaPersona>(
    'una_persona',
    { persona_id: yo?.personaId ?? '' },
    yo !== null,
  );
  if (yo === null) return null;
  const datos = consulta.data;
  const ficha = datos?.ficha;
  const nombreEntero = `${yo.nombre} ${yo.apellidos ?? ''}`.trim();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-e4">
      <header>
        <h1 className="text-pantalla font-semibold">Mi ficha</h1>
        <p className="mt-e1 text-secundario text-texto-suave">
          Tus nóminas, tus vacaciones, tu contrato y tus datos. Si algo no está bien, díselo a quien
          lleva el local: es quien la rellena.
        </p>
      </header>

      {consulta.isError && (
        <Aviso tono="mal" titulo="No he podido abrir tu ficha">
          Vuelve a intentarlo dentro de un momento.
        </Aviso>
      )}
      {datos === undefined && !consulta.isError && <Cargando que="tu ficha" />}

      {datos !== undefined && (
        <>
          <section className="flex items-center gap-e3">
            <SuCara
              personaId={datos.personaId}
              nombre={nombreEntero}
              foto={datos.foto ?? null}
              tamano={64}
              puedeCambiarla
            />
            <div className="min-w-0">
              <p className="truncate text-cuerpo font-semibold">{nombreEntero}</p>
              <p className="text-secundario text-texto-suave">
                {ficha?.laboral?.categoria ?? datos.rolNombre}
              </p>
            </div>
          </section>

          {ficha === undefined || ficha.laboral === null ? (
            <Aviso tono="info" titulo="Tu ficha todavía está sin rellenar">
              La rellena quien lleva el local, con tu contrato. Cuando esté, aquí verás tus
              vacaciones y tus nóminas.
            </Aviso>
          ) : (
            <CuatroBaldosas
              ficha={ficha}
              horasDeLaRetribucion={datos.retribucion?.horasSemanales ?? null}
              hoy={hoyEnFecha()}
            />
          )}

          {ficha !== undefined && (
            <GrupoDePlegables titulo="Tu ficha">
              <Plegable
                titulo="Mis nóminas"
                degradado="horas"
                icono={<IconoDocumento size={18} />}
                resumen={
                  (ficha.nominas ?? []).length === 0
                    ? 'Ninguna todavía'
                    : `La última, ${mesConMayuscula(ficha.nominas?.[0]?.mes ?? '').toLowerCase()}`
                }
                abierto
              >
                <SusNominas nominas={ficha.nominas ?? []} />
              </Plegable>
              <Plegable
                titulo="Mis vacaciones"
                degradado="vacaciones"
                icono={<IconoPalmera size={18} />}
                resumen={resumenDeLasVacaciones(ficha.vacaciones)}
                abierto
              >
                <SusVacaciones saldo={ficha.vacaciones} />
              </Plegable>
              <Plegable
                titulo="Mi contrato"
                degradado="contrato"
                icono={<IconoMaletin size={18} />}
                resumen={
                  [ficha.laboral?.categoria, ficha.laboral?.convenio].filter(Boolean).join(' · ') ||
                  'Categoría, convenio, contrato y jornada'
                }
              >
                <InformacionLaboral
                  laboral={ficha.laboral}
                  privada={ficha.privada ?? null}
                  documentos={ficha.documentos ?? []}
                />
              </Plegable>
              <Plegable
                titulo="Mis datos"
                degradado="fechas"
                icono={<IconoFicha size={18} />}
                resumen="DNI, teléfono y domicilio"
              >
                <InformacionPersonal
                  nombreEntero={nombreEntero}
                  correo={datos.correo}
                  privada={ficha.privada ?? null}
                />
              </Plegable>
            </GrupoDePlegables>
          )}

          <Link
            to="/mis-fichajes"
            className="flex min-h-toque items-center gap-e3 rounded-mayor border border-borde bg-superficie p-e3 [box-shadow:var(--sombra-tarjeta)] hover:bg-fondo/60"
          >
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-grande text-white"
              style={{ background: 'var(--degradado-historial)' }}
            >
              <IconoHistorial size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-cuerpo font-semibold">Mis fichajes</span>
              <span className="block text-secundario text-texto-suave">
                {comoSeLeenMinutos(datos.minutosDelMes)} en los últimos 30 días
              </span>
            </span>
            <IconoFlechaDerecha size={18} aria-hidden />
          </Link>
        </>
      )}
    </div>
  );
}
