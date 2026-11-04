import type { ReactNode } from 'react';
import { Aviso } from './Aviso.tsx';

/**
 * La declaración responsable de Estook, para leerla en la pantalla (T6 · 1, decisión 0126;
 * Anexo 4.14).
 *
 * La Orden HAC/1177/2024 pide que esté **dentro del programa, legible y a mano**: por eso es una
 * pieza de aquí, la misma en Estook (Ajustes › Facturación) y en Estook TPV (sus Ajustes). Lo que
 * dice lo trae el servidor de un solo sitio; esto solo lo pinta, y el PDF lo hace el servidor.
 */

export interface DatosDeLaDeclaracion {
  readonly borrador: boolean;
  readonly sistema: { readonly nombre: string; readonly id: string; readonly version: string };
  readonly componentes: readonly { readonly nombre: string; readonly queHace: string }[];
  readonly verifacti: {
    readonly nombre: string;
    readonly id: string;
    readonly version: string;
    readonly url: string;
  } | null;
  readonly firma: string;
  readonly productor: {
    readonly nombre: string | null;
    readonly nif: string | null;
    readonly direccion: string | null;
  };
  readonly cumplimiento: string;
  readonly firmadaEl: string | null;
  readonly lugar: string | null;
}

function Fila({ que, children }: { readonly que: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px] border-b border-borde py-e2 last:border-b-0 @min-[26rem]:flex-row @min-[26rem]:gap-e4">
      <dt className="text-secundario text-texto-suave @min-[26rem]:w-[40%] @min-[26rem]:shrink-0">
        {que}
      </dt>
      <dd className="min-w-0 break-words text-cuerpo font-medium">{children}</dd>
    </div>
  );
}

const oFalta = (texto: string | null) =>
  texto === null || texto.trim() === '' ? 'Sin rellenar' : texto;

export function DeclaracionResponsable({
  datos,
  pdf,
}: {
  readonly datos: DatosDeLaDeclaracion;
  /** El botón que la baja en PDF: lo pone cada app, que es quien sabe pedirlo. */
  readonly pdf?: ReactNode;
}) {
  return (
    <div className="@container flex flex-col gap-e4">
      {datos.borrador && (
        <Aviso tono="atencion" titulo="Borrador">
          La redacta y la revisa un asesor antes de firmarla. Hasta entonces, la facturación de
          Estook funciona solo en pruebas.
        </Aviso>
      )}

      <section aria-label="El sistema">
        <h3 className="text-cuerpo font-semibold">El sistema de facturación</h3>
        <dl>
          <Fila que="Nombre">{datos.sistema.nombre}</Fila>
          <Fila que="Código identificador">{datos.sistema.id}</Fila>
          <Fila que="Versión">{datos.sistema.version}</Fila>
          <Fila que="Funciona solo como VERI*FACTU">Sí</Fila>
          <Fila que="Sirve a varios obligados">Sí</Fila>
          <Fila que="Firma">{datos.firma}</Fila>
        </dl>
      </section>

      <section aria-label="Sus componentes">
        <h3 className="text-cuerpo font-semibold">Sus componentes</h3>
        <ul className="mt-e1 flex flex-col gap-e2">
          {datos.componentes.map((c) => (
            <li key={c.nombre} className="text-secundario">
              <span className="font-medium text-texto">{c.nombre}</span>
              <span className="text-texto-suave">: {c.queHace}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="El componente externo">
        <h3 className="text-cuerpo font-semibold">El componente externo: Verifacti</h3>
        {datos.verifacti === null ? (
          <p className="text-secundario text-texto-suave">
            Bilbabit SL, colaborador social de la AEAT. Su versión no se ha podido leer ahora.
          </p>
        ) : (
          <dl>
            <Fila que="Su sistema">
              {datos.verifacti.nombre} · {datos.verifacti.id}
            </Fila>
            <Fila que="Su versión">{datos.verifacti.version}</Fila>
            <Fila que="Su declaración">
              <a href={datos.verifacti.url} target="_blank" rel="noreferrer" className="underline">
                Leerla
              </a>
            </Fila>
          </dl>
        )}
      </section>

      <section aria-label="Quién lo produce">
        <h3 className="text-cuerpo font-semibold">Quién lo produce</h3>
        <dl>
          <Fila que="Nombre o razón social">{oFalta(datos.productor.nombre)}</Fila>
          <Fila que="NIF">{oFalta(datos.productor.nif)}</Fila>
          <Fila que="Dirección de contacto">{oFalta(datos.productor.direccion)}</Fila>
        </dl>
      </section>

      <section aria-label="Declaración">
        <h3 className="text-cuerpo font-semibold">Declaración</h3>
        <p className="mt-e1 text-secundario">{datos.cumplimiento}</p>
        <dl className="mt-e2">
          <Fila que="Fecha">{oFalta(datos.firmadaEl)}</Fila>
          <Fila que="Lugar">{oFalta(datos.lugar)}</Fila>
        </dl>
      </section>

      {pdf}
    </div>
  );
}
