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
 * Puestos el 21 de septiembre de 2026. **Todavía no hay sociedad**: el titular es
 * una persona física, y por eso donde iba la razón social va su nombre y
 * apellidos, y el NIF es su DNI.
 *
 * Esto es **obligatorio y público**, no una formalidad: el artículo 10 de la
 * LSSI-CE exige que quien presta un servicio por internet dé su nombre, su NIF y
 * su domicilio de forma «permanente, fácil, directa y gratuita». Sin esto no se
 * puede cobrar a nadie.
 *
 * > **Y lo que eso significa, dicho claro:** hasta que haya una sociedad con su
 * > domicilio social, el que sale publicado es **el domicilio particular del
 * > titular**. Es lo que le pasa a cualquier autónomo, y se arregla el día que se
 * > constituya la sociedad: se cambia aquí, y ya.
 *
 * Cuando exista la sociedad hay que cambiar además el CIF, añadir los datos del
 * Registro Mercantil, y volver a mirar las condiciones enteras.
 */
export const TITULAR = {
  nombre: 'Estook',
  /** Nombre y apellidos mientras no haya sociedad. */
  razonSocial: 'Ricardo Ruiz García' as string | null,
  nif: '54217804L' as string | null,
  domicilio: 'Avenida del Monte 59, 28250 Torrelodones, Madrid, España' as string | null,
  correo: 'estookapp@gmail.com',
} as const;

/** La fecha de la versión vigente. Se cambia cada vez que cambie el texto. */
export const VERSION_DE_LOS_TEXTOS = '25 de septiembre de 2026';

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
