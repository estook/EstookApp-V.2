import { useEffect, useState } from 'react';
import { crearCliente } from '@estook/cliente-api';
import { conLaLlegada, elDescuentoEnPalabras } from '@estook/dominio';
import { laLlegadaDeAqui } from './laLlegada.ts';
import { A_CREAR_CUENTA, A_ENTRAR, Marco } from './Marco.tsx';

/**
 * La portada de estook.com · **básica** (0042).
 *
 * Richi: «haz la landing page muy básica, luego la mejoramos, para poder poner esos
 * accesos por ahora». Así que dice qué es Estook en una frase, lleva a crear cuenta y
 * a entrar, y anuncia la oferta de prueba cuando está encendida en el admin. La web
 * de verdad —el problema con números, las ocho apps, el TPV— es la Parte C del Plan,
 * apuntada en `docs/web-publica.md`.
 */

const API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

interface Oferta {
  readonly activa: boolean;
  readonly dias: number;
}

const LO_QUE_HACE = [
  {
    titulo: 'Tu almacén, al día',
    texto:
      'Lo que entra con cada albarán, lo que sale y lo que se tira, con su valor y sus caducidades.',
  },
  {
    titulo: 'Compras sin sorpresas',
    texto:
      'Pedidos a tus proveedores, recepciones línea a línea y el precio de cada cosa, comparado.',
  },
  {
    titulo: 'Tu equipo y tu caja',
    texto:
      'Fichajes, horarios, el cierre del día y el food cost, en el móvil y en la tablet del pase.',
  },
] as const;

export function Portada() {
  const [llegada] = useState(laLlegadaDeAqui);
  // La oferta, si la API contesta. Sin API o sin respuesta, no se anuncia nada: la
  // portada no espera a nadie para pintarse.
  const [oferta, setOferta] = useState<Oferta | null>(null);
  // Y si se llega con el código de un vendedor (A3), lo que da, si vale.
  const [codigo, setCodigo] = useState<{ codigo: string; descuento: number } | null>(null);
  useEffect(() => {
    if (API === '') return;
    let vivo = true;
    const api = crearCliente({ base: API });
    void api.consultar<{ oferta: Oferta }>('como_se_entra').then((respuesta) => {
      if (vivo && respuesta.ok) setOferta(respuesta.datos.oferta);
    });
    if (llegada.codigo !== undefined) {
      // Una visita más a ese enlace (A4 · 0077, 3B): solo un número por código y día.
      // Ni quién, ni nada en el navegador. No se espera la respuesta.
      void api.ejecutar('contar_la_visita', { codigo: llegada.codigo });
      void api
        .consultar<{ codigo: string; descuento: number }>('el_codigo_de_vendedor', {
          codigo: llegada.codigo,
        })
        .then((respuesta) => {
          if (vivo && respuesta.ok) setCodigo(respuesta.datos);
        });
    }
    return () => {
      vivo = false;
    };
  }, [llegada.codigo]);

  const descuento = codigo === null ? null : elDescuentoEnPalabras(codigo.descuento);
  const aCrearCuenta = conLaLlegada(A_CREAR_CUENTA, llegada);

  return (
    <Marco>
      <main>
        <section className="mx-auto flex max-w-[48rem] flex-col items-center px-e4 py-e7 text-center">
          {(oferta?.activa === true || descuento !== null) && (
            <p className="mb-e4 inline-flex flex-wrap justify-center gap-x-e2 rounded-redondo bg-naranja-suave px-e3 py-e1 text-secundario font-medium text-texto">
              {oferta?.activa === true && <span>Prueba {oferta.dias} días gratis</span>}
              {descuento !== null && codigo !== null && (
                <span>
                  {oferta?.activa === true ? '· ' : ''}Con {codigo.codigo}:{' '}
                  {descuento.charAt(0).toLowerCase() + descuento.slice(1)}
                </span>
              )}
            </p>
          )}
          <h1 className="text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-tight">
            Tu cocina, bajo control.
          </h1>
          <p className="mt-e4 max-w-[36rem] text-cuerpo text-texto-suave">
            Estook es la gestión de tu restaurante en una sola aplicación: almacén, compras, equipo
            y caja. Sin cambiar de TPV.
          </p>
          <div className="mt-e6 flex w-full flex-col gap-e3 sm:w-auto sm:flex-row">
            <a
              href={aCrearCuenta}
              className="inline-flex min-h-toque items-center justify-center rounded-medio bg-naranja px-e5 text-cuerpo font-semibold text-sobre-naranja hover:brightness-95"
            >
              {oferta?.activa === true ? 'Empezar la prueba' : 'Crear cuenta'}
            </a>
            <a
              href={conLaLlegada(A_ENTRAR, llegada)}
              className="inline-flex min-h-toque items-center justify-center rounded-medio border border-borde-fuerte bg-superficie px-e5 text-cuerpo font-medium text-texto hover:bg-fondo"
            >
              Iniciar sesión
            </a>
          </div>
        </section>

        <section aria-label="Qué hace Estook" className="mx-auto max-w-[64rem] px-e4 pb-e7">
          <ul className="grid gap-e4 md:grid-cols-3">
            {LO_QUE_HACE.map((cosa) => (
              <li
                key={cosa.titulo}
                className="rounded-mayor border border-borde bg-superficie p-e5"
              >
                <h2 className="text-seccion font-semibold">{cosa.titulo}</h2>
                <p className="mt-e2 text-secundario text-texto-suave">{cosa.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Marco>
  );
}
