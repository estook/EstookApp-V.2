import { useInfiniteQuery } from '@tanstack/react-query';
import { Boton, Cargando, ErrorEnCristiano, EstadoVacio, Tarjeta } from '@estook/ui';
import { FalloDeLaApi } from '@estook/cliente-api';
import { fechaYHora } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Lo que se ha hecho en el admin (0041, entrega A1).
 *
 * Cada línea dice quién, qué, sobre quién, cuándo, por qué y desde dónde. Se lee
 * como una frase y no como una fila de base de datos: esto se abre cuando algo no
 * cuadra, y ahí nadie quiere traducir `dar_acceso` a mano.
 *
 * De cincuenta en cincuenta y del más nuevo al más viejo: crece cada vez que
 * alguien entra.
 */

interface LineaDelAdmin {
  readonly id: string;
  readonly ocurridoEn: string;
  readonly quien: string | null;
  readonly accion: string;
  readonly entidad: string;
  readonly sobreQuien: string | null;
  readonly despues: Record<string, unknown> | null;
  readonly motivo: string | null;
  readonly ip: string | null;
}

interface Tanda {
  readonly lineas: readonly LineaDelAdmin[];
  readonly hayMas: boolean;
}

/** La frase de cada acción. Lo que no esté aquí se dice tal cual, sin inventarse nada. */
function queHizo(linea: LineaDelAdmin): string {
  const sobre = linea.sobreQuien ?? 'alguien';
  switch (linea.accion) {
    case 'entrar':
      return 'entró en el admin';
    case 'dar_acceso': {
      const nueva = linea.despues?.['personaNueva'] === true;
      return `dio acceso total a ${sobre}${nueva ? ', con cuenta nueva' : ''}`;
    }
    case 'quitar_acceso':
      return `quitó el acceso a ${sobre}`;
    // Los dos rescates de `bd:dar-admin`, que solo hace la consola.
    case 'poner_clave_nueva':
      return `le puso una contraseña de un solo uso a ${sobre}`;
    case 'cambiar_oferta': {
      const activa = linea.despues?.['activa'] === true;
      const dias = linea.despues?.['dias'];
      return activa
        ? `encendió la oferta de prueba, con ${String(dias)} días`
        : 'apagó la oferta de prueba';
    }
    case 'quitar_segundo_factor':
      return `le quitó el segundo factor a ${sobre}, para volver a montarlo`;
    default:
      return linea.accion.replace(/_/g, ' ');
  }
}

export function Auditoria() {
  const { cliente } = usarSesion();

  const consulta = useInfiniteQuery({
    queryKey: ['admin_auditoria'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Tanda> => {
      const respuesta = await cliente.consultar<Tanda>(
        'admin_auditoria',
        pageParam === null ? {} : { antesDe: pageParam },
      );
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
    getNextPageParam: (ultima) =>
      ultima.hayMas ? (ultima.lineas[ultima.lineas.length - 1]?.id ?? null) : null,
  });

  const lineas = consulta.data?.pages.flatMap((tanda) => tanda.lineas) ?? [];

  return (
    <div className="flex flex-col gap-e5">
      <div>
        <h1 className="text-pantalla font-semibold">Auditoría</h1>
        <p className="text-secundario text-texto-suave">
          Todo lo que cambia algo en el admin. No se puede corregir ni borrar.
        </p>
      </div>

      {consulta.isLoading ? (
        <Cargando que="Lo que se ha hecho" lineas={5} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : lineas.length === 0 ? (
        <EstadoVacio
          dibujo="libro"
          titulo="Todavía no se ha hecho nada"
          frase="En cuanto alguien entre o dé un acceso, aparecerá aquí."
        />
      ) : (
        <Tarjeta pegado origen="Hora de España">
          <ol className="divide-y divide-borde">
            {lineas.map((linea) => (
              <li key={linea.id} className="flex flex-col gap-e1 px-e4 py-e3">
                <p className="text-cuerpo">
                  <strong className="font-semibold">{linea.quien ?? 'La consola'}</strong>{' '}
                  {queHizo(linea)}
                </p>
                <p className="text-secundario text-texto-suave">
                  {fechaYHora(linea.ocurridoEn)}
                  {linea.ip === null ? '' : ` · desde ${linea.ip}`}
                </p>
                {linea.motivo !== null && (
                  <p className="text-secundario">Motivo: «{linea.motivo}»</p>
                )}
              </li>
            ))}
          </ol>
        </Tarjeta>
      )}

      {consulta.hasNextPage && (
        <div className="flex justify-center">
          <Boton
            tono="secundario"
            cargando={consulta.isFetchingNextPage}
            textoCargando="Trayendo más"
            onClick={() => {
              void consulta.fetchNextPage();
            }}
          >
            Ver más
          </Boton>
        </div>
      )}
    </div>
  );
}
