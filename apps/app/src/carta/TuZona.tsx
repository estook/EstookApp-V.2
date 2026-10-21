import { useState } from 'react';
import {
  Aviso,
  Boton,
  Cargando,
  ConMasInfo,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Mosaico,
  Plegable,
  Tarjeta,
  type TonoDeEtiqueta,
} from '@estook/ui';
import { IconoAbrirFuera, IconoFogon } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { useQueryClient } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero } from '../almacen/contrato.ts';
import {
  comoEstasEnLetra,
  laWebDe,
  type MiZona,
  type TuPlatoEnLaZona,
} from './contratoDeLosMenus.ts';

/**
 * Carta › Análisis › Tu zona (M10 · 2, decisiones 0103 y 0104).
 *
 * Richi, 21-oct: «una burbuja de Fogón, que puedas decirle analiza mi zona y que él
 * busque en internet… solo 1 al día cada 24 horas». Un botón, y lo que encuentra se
 * queda guardado con su fecha: se vuelve a mirar sin gastar, y si cambias un precio, la
 * comparación se rehace sola. Cada precio dice **de dónde lo ha leído**.
 */

const COMO_TRABAJA = (
  <>
    Fogón busca en internet los locales de alrededor que publican su carta (su web, TheFork,
    Google…) y apunta lo que cobran por los platos que también tienes tú y por el menú del día, con
    el enlace de cada precio. Las medias las calcula Estook, y con menos de tres locales no se
    compara un plato. Los precios son los que publican: puede que alguno no esté al día.
  </>
);

const TONO: Readonly<Record<string, TonoDeEtiqueta>> = {
  por_encima: 'atencion',
  en_la_media: 'bien',
  por_debajo: 'info',
};

/** «21 de octubre a las 12:40». */
function cuando(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${dia} a las ${hora}`;
}

function UnPlato({ plato }: { readonly plato: TuPlatoEnLaZona }) {
  const comparado = plato.comparado;
  return (
    <Tarjeta titulo={plato.nombre}>
      <div className="flex flex-col gap-e2 px-e3 pb-e3">
        <p className="text-cuerpo">
          {plato.miPrecioCentimos === null
            ? 'Sin tu precio'
            : `Tú, ${comoDinero(plato.miPrecioCentimos)}`}
        </p>
        {comparado === null ? (
          <p className="text-secundario text-texto-suave">
            {plato.precios.length === 1 ? 'Un precio' : `${String(plato.precios.length)} precios`}:
            con menos de tres no se compara.
          </p>
        ) : (
          <>
            <div>
              <Etiqueta tono={TONO[comparado.como] ?? 'neutro'}>
                {comoEstasEnLetra(comparado)}
              </Etiqueta>
            </div>
            <p className="text-secundario text-texto-suave">
              De {comoDinero(comparado.desdeCentimos)} a {comoDinero(comparado.hastaCentimos)} en{' '}
              {String(comparado.cuantos)} locales · media {comoDinero(comparado.mediaCentimos)}
            </p>
          </>
        )}
        <Plegable titulo="De dónde sale" resumen={String(plato.precios.length)}>
          <ul className="flex flex-col gap-e2">
            {plato.precios.map((p) => (
              <li
                key={`${p.donde}-${p.enlace}`}
                className="flex items-start justify-between gap-e2"
              >
                <span className="min-w-0">
                  <span className="font-semibold">{p.donde}</span>
                  {p.plato !== null && <span className="text-texto-suave"> · {p.plato}</span>}
                  <a
                    href={p.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-e1 text-secundario text-texto-suave underline"
                  >
                    {laWebDe(p.enlace)}
                    <IconoAbrirFuera size={12} />
                  </a>
                </span>
                <span className="shrink-0 font-semibold">{comoDinero(p.precioCentimos)}</span>
              </li>
            ))}
          </ul>
        </Plegable>
      </div>
    </Tarjeta>
  );
}

export function TuZona() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = usarLectura<MiZona>('mi_zona');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function analizar() {
    setBuscando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<MiZona>('analizar_mi_zona', {});
    setBuscando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    cache.setQueryData(['mi_zona', {}], respuesta.datos);
    await cache.invalidateQueries({ queryKey: ['mi_fogon'] });
  }

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tu zona" forma="tarjetas" lineas={3} />
      </div>
    );
  }
  const datos = consulta.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido mirar tu zona">
        Prueba en un momento.
      </Aviso>
    );
  }

  const analisis = datos.analisis;
  const boton = datos.puedeAnalizar && (
    <div className="flex flex-col items-start gap-e1">
      <Boton
        tono={analisis === null ? 'principal' : 'secundario'}
        icono={<IconoFogon size={18} />}
        cargando={buscando}
        textoCargando="Fogón está buscando"
        disabled={datos.otraVezDesde !== null}
        onClick={() => void analizar()}
      >
        Analiza mi zona
      </Boton>
      <p className="text-secundario text-texto-suave">
        {datos.otraVezDesde === null
          ? `${String(datos.creditos)} créditos de Fogón · una vez cada 24 horas`
          : `Otra vez desde el ${cuando(datos.otraVezDesde)}`}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      {buscando && (
        <Aviso tono="info" titulo="Fogón está buscando en internet">
          Mira las cartas de los locales de alrededor. Puede tardar un minuto: no cierres la app.
        </Aviso>
      )}

      {analisis === null ? (
        <Tarjeta>
          <EstadoVacio
            dibujo="precios"
            acento="var(--color-app-carta)"
            titulo="¿Cobras como los de tu zona?"
            frase="Fogón busca en internet lo que cobran los de alrededor por tus platos y por el menú del día, y te lo compara."
            {...(boton === false
              ? { sinAccionPorque: 'Lo pide quien lleva la carta.' }
              : { accion: boton })}
          />
        </Tarjeta>
      ) : (
        <>
          <div className="flex flex-col gap-e3 lg:flex-row lg:items-start lg:justify-between">
            <ConMasInfo info={COMO_TRABAJA} queExplica="Cómo lo busca Fogón">
              <div>
                <h2 className="text-titulo font-semibold">Tu zona</h2>
                <p className="text-secundario text-texto-suave">
                  Mirado el {cuando(analisis.hechoEn)}
                  {analisis.locales.length > 0 &&
                    ` · ${String(analisis.locales.length)} ${analisis.locales.length === 1 ? 'local' : 'locales'}`}
                </p>
              </div>
            </ConMasInfo>
            {boton}
          </div>
          {analisis.resumen !== null && <p className="text-cuerpo">{analisis.resumen}</p>}
          {analisis.platos.length === 0 ? (
            <Aviso tono="info" titulo="No ha encontrado precios para comparar">
              Pocos locales de tu zona publican su carta con precios. Prueba otro día.
            </Aviso>
          ) : (
            <Mosaico>
              {analisis.platos.map((plato) => (
                <UnPlato key={plato.platoId ?? 'menu'} plato={plato} />
              ))}
            </Mosaico>
          )}
        </>
      )}
    </div>
  );
}
