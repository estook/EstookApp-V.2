import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Boton, Cargando, Deshacer, Logo, ProveedorDeDeshacer } from '@estook/ui';
import type { Entorno } from '@estook/utiles';
import { Catalogo } from './catalogo/Catalogo.tsx';
import { soloLaHora } from './datos/cliente.ts';
import { Administradores } from './pantallas/Administradores.tsx';
import { Auditoria } from './pantallas/Auditoria.tsx';
import {
  Entrar,
  EscribirElCodigo,
  MontarElSegundoFactor,
  PonerMiContrasena,
} from './sesion/Puerta.tsx';
import { ProveedorDeSesion, usarSesion } from './sesion/Sesion.tsx';

/**
 * El admin de Estook (M3, con su puerta desde la 0041).
 *
 * Hasta la 0041 esto era el catálogo del sistema de diseño, suelto y a la vista de
 * cualquiera. Ahora **todo va detrás de la puerta**: el catálogo es una sección
 * más, al lado de quién tiene acceso y de lo que se ha hecho. Los clientes, los
 * vendedores y las ventas llegan en las entregas A2 a A4
 * (`docs/panel-de-administracion.md`).
 *
 * El proveedor de deshacer está aquí y no dentro de una pantalla porque la barra
 * vive en la raíz: si estuviera dentro, navegar se la llevaría.
 */
export interface AplicacionProps {
  readonly entorno: Entorno;
  readonly sesionId: string;
}

const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
});

export function Aplicacion(props: AplicacionProps) {
  return (
    <QueryClientProvider client={cache}>
      <ProveedorDeDeshacer>
        <ProveedorDeSesion>
          <LaPuerta {...props} />
        </ProveedorDeSesion>
        <Deshacer />
      </ProveedorDeDeshacer>
    </QueryClientProvider>
  );
}

/**
 * Qué pantalla toca. **El orden importa**: el código va antes que la contraseña,
 * porque cambiarla exige haber pasado ya el segundo factor; y montarlo va después
 * de la contraseña, porque montarlo con la que salió por pantalla sería montarlo
 * sobre una cuenta que otra persona ha podido ver.
 */
function LaPuerta(props: AplicacionProps) {
  const { yo, cargando } = usarSesion();

  if (cargando) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="Comprobando quién eres" />
      </main>
    );
  }
  if (yo === null) return <Entrar />;
  if (yo.faltaElCodigo) return <EscribirElCodigo />;
  if (yo.debeCambiarClave) return <PonerMiContrasena />;
  if (!yo.conDobleFactor) return <MontarElSegundoFactor />;
  return <Dentro {...props} />;
}

const SECCIONES = [
  { id: 'administradores', nombre: 'Administradores' },
  { id: 'auditoria', nombre: 'Auditoría' },
  { id: 'diseno', nombre: 'Sistema de diseño' },
] as const;

type Seccion = (typeof SECCIONES)[number]['id'];

function Dentro({ entorno, sesionId }: AplicacionProps) {
  const { yo, salir } = usarSesion();
  const [seccion, setSeccion] = useState<Seccion>('administradores');

  return (
    <div className="min-h-dvh bg-fondo">
      {/*
        En el ordenador, una sola línea. En el móvil, dos: arriba la marca y
        «Salir», y debajo las secciones en una tira que se desliza. Antes se partían
        en tres líneas y la cabecera se comía un tercio de la pantalla (repaso de A1).
      */}
      <div className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-[64rem] flex-wrap items-center gap-x-e4 px-e4 pt-e3 md:flex-nowrap md:py-e3">
          <div className="flex items-center gap-e2">
            <Logo alto={24} />
            <span className="text-etiqueta font-medium uppercase tracking-wide text-texto-suave">
              Admin
            </span>
          </div>

          <nav
            aria-label="Secciones del admin"
            className={[
              'order-last -mx-e4 flex w-[calc(100%+var(--spacing-e4)*2)] gap-e1 overflow-x-auto px-e4 py-e2',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              'md:order-none md:mx-0 md:w-auto md:overflow-visible md:p-0',
            ].join(' ')}
          >
            {SECCIONES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSeccion(s.id);
                }}
                aria-current={s.id === seccion ? 'page' : undefined}
                className={[
                  'inline-flex min-h-toque shrink-0 items-center rounded-medio px-e3 text-cuerpo',
                  s.id === seccion
                    ? 'bg-naranja-suave text-texto'
                    : 'text-texto-suave hover:bg-fondo hover:text-texto',
                ].join(' ')}
              >
                {s.nombre}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-e3">
            {yo !== null && (
              <span className="hidden text-secundario text-texto-suave sm:inline">
                {yo.nombre} · sesión hasta las {soloLaHora(yo.caducaEn)}
              </span>
            )}
            <Boton
              tono="texto"
              onClick={() => {
                void salir();
              }}
            >
              Salir
            </Boton>
          </div>
        </div>
      </div>

      {seccion === 'diseno' ? (
        <Catalogo entorno={entorno} sesionId={sesionId} />
      ) : (
        <main className="mx-auto max-w-[64rem] px-e4 py-e5">
          {seccion === 'administradores' ? <Administradores /> : <Auditoria />}
        </main>
      )}
    </div>
  );
}
