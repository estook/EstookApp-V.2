import { useEffect, useState } from 'react';
import { crearCliente } from '@estook/cliente-api';
import { DIRECCION_DE_ESTOOK, laCartaDeLaDireccion } from '@estook/dominio';
import { Cargando, EstadoVacio, Logo } from '@estook/ui';
import { IconoAbrirFuera, IconoLocal, IconoReloj } from '@estook/iconos';

/**
 * La carta de un local, la que abre el QR de la mesa (entrega O, punto 20 · 0047).
 *
 * `estook.com/carta/<dirección>`: sin sesión, sin almohadilla y para siempre. Hasta
 * M12 enseña lo que el local ya enseña al mundo —su nombre, su valoración, dónde
 * está, su teléfono y su horario de Google—; el día que haya platos con precio y
 * alérgenos, **el mismo QR ya impreso** enseñará la carta entera.
 *
 * ── Y por qué esta página también es la de «no existe» del sitio ────────────
 *
 * GitHub Pages solo sirve ficheros, y `/carta/ikatz` no es ninguno. Lo que sí hace es
 * servir **una** página para lo que no existe, la `404.html` de la raíz. Esa página
 * es esta (\`publicar.yml\`): si la dirección es la de una carta, la enseña; si no,
 * dice que no existe y lleva a estook.com, que es mejor que la portada suelta que
 * salía antes para cualquier errata.
 */
const API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

interface LaCartaDelLocal {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly web: string | null;
  readonly mapa: string | null;
  readonly valoracion: number | null;
  readonly resenas: number | null;
  readonly horario: readonly string[];
  readonly colorDeMarca: string | null;
  readonly logo: string | null;
}

type ComoVa =
  | { readonly que: 'cargando' }
  | { readonly que: 'lista'; readonly carta: LaCartaDelLocal }
  | { readonly que: 'no_existe' }
  | { readonly que: 'sin_red' };

/** La dirección de la carta, de la barra del navegador. Nula si no es una carta. */
function laDeEstaPagina(): string | null {
  return laCartaDeLaDireccion(window.location.pathname);
}

export function LaCarta() {
  const direccion = laDeEstaPagina();
  const [como, setComo] = useState<ComoVa>({ que: 'cargando' });

  useEffect(() => {
    if (direccion === null || API === '') return;
    let vigente = true;
    void crearCliente({ base: API })
      .consultar<LaCartaDelLocal>('la_carta', { direccion })
      .then((respuesta) => {
        if (!vigente) return;
        if (respuesta.ok) {
          setComo({ que: 'lista', carta: respuesta.datos });
          document.title = `${respuesta.datos.nombre} · Carta`;
        } else {
          setComo({ que: respuesta.error.codigo === 'no_existe' ? 'no_existe' : 'sin_red' });
        }
      });
    return () => {
      vigente = false;
    };
  }, [direccion]);

  if (direccion === null) return <NoEsUnaCarta />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[36rem] flex-col gap-e5 px-e4 pb-e7 pt-[calc(env(safe-area-inset-top)+var(--spacing-e6))]">
      {como.que === 'cargando' && <Cargando que="la carta" lineas={4} />}
      {como.que === 'no_existe' && (
        <EstadoVacio
          dibujo="perdido"
          titulo="Esta carta no existe"
          frase="Puede que el local ya no use Estook, o que la dirección tenga una errata."
        />
      )}
      {como.que === 'sin_red' && (
        <EstadoVacio
          dibujo="sin-conexion"
          titulo="No llego a la carta"
          frase="Puede ser la conexión del móvil. Vuelve a escanear el código dentro de un momento."
        />
      )}
      {como.que === 'lista' && <ElLocal carta={como.carta} />}

      <footer className="mt-auto flex items-center justify-center gap-e2 pt-e5 text-etiqueta text-texto-tenue">
        <span>Carta hecha con</span>
        <a href={DIRECCION_DE_ESTOOK} aria-label="Estook">
          <Logo alto={16} />
        </a>
      </footer>
    </main>
  );
}

function ElLocal({ carta }: { readonly carta: LaCartaDelLocal }) {
  const acento = carta.colorDeMarca ?? undefined;
  return (
    <>
      <header className="flex flex-col items-center gap-e3 text-center">
        {carta.logo !== null && (
          <img
            src={carta.logo}
            alt={`Logo de ${carta.nombre}`}
            className="size-[88px] rounded-grande border border-borde bg-superficie object-contain p-e2"
          />
        )}
        <h1 className="text-pantalla font-semibold leading-tight">{carta.nombre}</h1>
        {carta.valoracion !== null && (
          <p className="text-secundario text-texto-suave">
            <span className="font-semibold text-texto">
              {carta.valoracion.toFixed(1).replace('.', ',')}
            </span>{' '}
            de 5 en Google
            {carta.resenas !== null ? ` · ${String(carta.resenas)} reseñas` : ''}
          </p>
        )}
        <div
          aria-hidden
          className="h-[3px] w-e7 rounded-redondo bg-naranja"
          style={acento === undefined ? undefined : { backgroundColor: acento }}
        />
      </header>

      <section
        aria-label="La carta"
        className="rounded-grande border border-borde bg-superficie p-e4 text-center shadow-s1"
      >
        <p className="font-semibold">La carta, muy pronto aquí</p>
        <p className="mt-e1 text-secundario text-texto-suave">
          Pregunta al personal por los platos del día y los alérgenos.
        </p>
      </section>

      <section aria-label="El local" className="flex flex-col gap-e3">
        {carta.direccion !== null && (
          <Fila icono={<IconoLocal size={20} />} titulo="Dónde estamos" texto={carta.direccion}>
            {carta.mapa !== null && (
              <a
                href={carta.mapa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-toque items-center gap-e1 font-semibold underline"
              >
                Cómo llegar <IconoAbrirFuera size={14} />
              </a>
            )}
          </Fila>
        )}
        {carta.horario.length > 0 && (
          <Fila icono={<IconoReloj size={20} />} titulo="Horario" texto={null}>
            <ul className="text-secundario text-texto-suave">
              {carta.horario.map((linea) => (
                <li key={linea} className="first-letter:uppercase">
                  {linea}
                </li>
              ))}
            </ul>
          </Fila>
        )}
      </section>

      <div className="flex flex-wrap justify-center gap-e2">
        {carta.telefono !== null && (
          <a
            href={`tel:${carta.telefono.replace(/[^0-9+]/g, '')}`}
            className="inline-flex min-h-toque items-center rounded-redondo bg-naranja px-e5 font-semibold text-sobre-naranja"
          >
            Llamar
          </a>
        )}
        {carta.web !== null && (
          <a
            href={carta.web}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-toque items-center gap-e1 rounded-redondo border border-borde-fuerte px-e5 font-semibold"
          >
            Su web <IconoAbrirFuera size={14} />
          </a>
        )}
      </div>
    </>
  );
}

function Fila({
  icono,
  titulo,
  texto,
  children,
}: {
  readonly icono: React.ReactNode;
  readonly titulo: string;
  readonly texto: string | null;
  readonly children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-e3 rounded-grande border border-borde bg-superficie p-e4">
      <span className="mt-[2px] shrink-0 text-texto-suave">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        {texto !== null && <p className="text-secundario text-texto-suave">{texto}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * Lo que no es una carta: la raíz de `/carta/` o cualquier dirección del sitio que
 * no existe (esta página es la `404.html` de estook.com).
 */
function NoEsUnaCarta() {
  const enLaCarta = window.location.pathname.replace(/\/+$/, '') === '/carta';
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col items-center justify-center gap-e4 px-e4 py-e7 text-center">
      <Logo alto={32} />
      <EstadoVacio
        dibujo={enLaCarta ? 'platos' : 'perdido'}
        titulo={enLaCarta ? 'La carta de cada local' : 'Esta página no existe'}
        frase={
          enLaCarta
            ? 'Cada local tiene su dirección y su código QR. Escanéalo en la mesa para ver su carta.'
            : 'Puede que la dirección tenga una errata, o que la página ya no esté.'
        }
        accion={
          <a
            href={DIRECCION_DE_ESTOOK}
            className="inline-flex min-h-toque items-center rounded-redondo bg-naranja px-e5 font-semibold text-sobre-naranja"
          >
            Ir a estook.com
          </a>
        }
      />
    </main>
  );
}
