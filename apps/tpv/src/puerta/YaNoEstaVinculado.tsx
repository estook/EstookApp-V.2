/**
 * **Este aparato ya no está vinculado** (maqueta 20): lo que ve un aparato que alguien ha
 * desvinculado, en su siguiente toque (Anexo 11.3, punto 6). Su llave ya no abre nada, y
 * desde aquí se vuelve a vincular.
 */
export function YaNoEstaVinculado({
  local,
  alVincular,
}: {
  readonly local: string | null;
  readonly alVincular: () => void;
}) {
  return (
    <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5 text-texto">
      <section className="flex max-w-[30rem] flex-col items-center gap-e4 text-center">
        <span className="flex size-20 items-center justify-center rounded-redondo bg-superficie">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 15l6-6" />
            <path d="M11 6l1.5-1.5a4 4 0 0 1 5.7 5.7L17 11.5M13 18l-1.5 1.5a4 4 0 0 1-5.7-5.7L7 12.5" />
            <path d="M3 3l18 18" />
          </svg>
        </span>
        <h1 className="text-cifra-media font-bold">
          Este aparato ya no está vinculado{local === null ? '' : ` a ${local}`}
        </h1>
        <p className="text-cuerpo text-texto-suave">
          Si tiene que seguir siendo del local, pide un código nuevo a quien lo lleva.
        </p>
        <button
          type="button"
          onClick={alVincular}
          className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
        >
          Vincular este aparato
        </button>
      </section>
    </main>
  );
}
