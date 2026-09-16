import type { ReactNode } from 'react';
import { Marco } from './Marco.tsx';

/**
 * Las páginas legales de la web (0042): la privacidad y las condiciones.
 *
 * ── Son un borrador razonable, no un texto revisado por un abogado ───────────
 *
 * Richi: «redáctalas tú, básicas». Están escritas para decir la verdad de lo que
 * Estook hace hoy —qué datos guarda, con quién los comparte, qué se paga— y en
 * lenguaje llano. **Antes de crecer, que las revise alguien que sepa**: está
 * apuntado en `docs/pasos-antes-de-m8.md`.
 *
 * ── Quién es el titular ──────────────────────────────────────────────────────
 *
 * La razón social, el NIF y el domicilio los tiene que dar Richi. Hasta entonces
 * se enseña lo que sí se sabe —el nombre y el correo de contacto— y **no se
 * inventa nada**: un NIF de mentira en una página legal es peor que ninguno.
 */
export const TITULAR = {
  nombre: 'Estook',
  /** Razón social, cuando Richi la dé. */
  razonSocial: null as string | null,
  nif: null as string | null,
  domicilio: null as string | null,
  correo: 'estookapp@gmail.com',
} as const;

/** La fecha de la versión vigente. Se cambia cada vez que cambie el texto. */
export const VERSION_DE_LOS_TEXTOS = '16 de septiembre de 2026';

export function PaginaLegal({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children: ReactNode;
}) {
  return (
    <Marco raiz="../">
      <main className="mx-auto max-w-[44rem] px-e4 py-e6">
        <p className="text-secundario text-texto-suave">Versión del {VERSION_DE_LOS_TEXTOS}</p>
        <h1 className="mt-e2 text-pantalla font-semibold">{titulo}</h1>
        <div className="mt-e5 flex flex-col gap-e5">{children}</div>
      </main>
    </Marco>
  );
}

export function Apartado({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e2 text-cuerpo">
      <h2 className="text-seccion font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export function Lista({ children }: { readonly children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-e1 pl-e5">{children}</ul>;
}

/** Quién es el titular, con lo que se sabe y sin inventar lo que no. */
export function ElTitular() {
  return (
    <Lista>
      <li>Nombre comercial: {TITULAR.nombre}</li>
      {TITULAR.razonSocial !== null && <li>Titular: {TITULAR.razonSocial}</li>}
      {TITULAR.nif !== null && <li>NIF: {TITULAR.nif}</li>}
      {TITULAR.domicilio !== null && <li>Domicilio: {TITULAR.domicilio}</li>}
      <li>
        Contacto:{' '}
        <a className="text-texto underline" href={`mailto:${TITULAR.correo}`}>
          {TITULAR.correo}
        </a>
      </li>
    </Lista>
  );
}
