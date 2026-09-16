import type { ReactNode } from 'react';
import { Logo } from '@estook/ui';

/**
 * El marco de la web pública (0042): la marca y los dos accesos arriba, el pie con
 * lo legal abajo. **Básico a propósito**: la web de verdad es la Parte C del Plan, y
 * esto existe para que desde `estook.com` se pueda entrar y crear cuenta.
 *
 * Las direcciones son relativas a la raíz de la web: la app vive en `app/`, y la
 * pantalla de crear cuenta en `app/#/crear-cuenta`.
 */
export const A_ENTRAR = 'app/';
export const A_CREAR_CUENTA = 'app/#/crear-cuenta';

export function Marco({
  children,
  raiz = './',
}: {
  readonly children: ReactNode;
  /** Desde una subpágina (`privacidad/`), la raíz está un nivel arriba. */
  readonly raiz?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-fondo">
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-e3 px-e4 py-e3">
          <a href={raiz} aria-label="Estook, la portada">
            <Logo alto={28} />
          </a>
          <nav aria-label="Acceso" className="flex items-center gap-e2">
            <a
              href={`${raiz}${A_ENTRAR}`}
              className="inline-flex min-h-toque items-center rounded-medio px-e3 text-cuerpo text-texto hover:bg-fondo"
            >
              Iniciar sesión
            </a>
            <a
              href={`${raiz}${A_CREAR_CUENTA}`}
              className="hidden min-h-toque items-center rounded-medio bg-naranja px-e4 text-cuerpo font-medium text-sobre-naranja hover:brightness-95 sm:inline-flex"
            >
              Crear cuenta
            </a>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-borde">
        <div className="mx-auto flex max-w-[64rem] flex-wrap items-center justify-between gap-e3 px-e4 py-e4 text-secundario text-texto-suave">
          <span>Estook · tu cocina, bajo control</span>
          <nav aria-label="Legal" className="flex gap-e4">
            <a href={`${raiz}privacidad/`} className="hover:text-texto">
              Privacidad
            </a>
            <a href={`${raiz}condiciones/`} className="hover:text-texto">
              Condiciones
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
