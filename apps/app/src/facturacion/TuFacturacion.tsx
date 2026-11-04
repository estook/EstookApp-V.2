import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enMinuscula, type PasoDeFacturacion } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  DeclaracionResponsable,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
  Tarjeta,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLaDeclaracion } from '../ganchos/usarLaFacturacion.ts';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import type { MiFacturacion } from './contrato.ts';
import {
  PasoDeDondeTributa,
  PasoDeLaAutorizacion,
  PasoDeLaEmpresa,
  PasoDeLasSeries,
  PasoDeVerifacti,
} from './PasosDelAlta.tsx';

/**
 * **Ajustes › Facturación** (T6 · 1, decisión 0126; maquetas de T6, sección 1, aprobadas el
 * 2-nov).
 *
 * Arriba, **en una línea, cómo está**; debajo, **los cinco pasos con lo que falta y quién lo
 * hace**, cada uno en su hoja, para dejarlo y seguir otro día. Y lo que va con la facturación:
 * «Pide tu factura», la declaración responsable de Estook y «Pasar a real», que es de Estook.
 *
 * Solo la ven quien puede hacer el alta (gerente, dirección y administrador de cuenta, Roles
 * 1.12). **La autorización ante Hacienda, además, solo su titular.**
 */

const PASOS: readonly { readonly paso: PasoDeFacturacion; readonly titulo: string }[] = [
  { paso: 1, titulo: 'Tu empresa' },
  { paso: 2, titulo: 'Dónde tributa' },
  { paso: 3, titulo: 'Las series' },
  { paso: 4, titulo: 'Alta en Verifacti' },
  { paso: 5, titulo: 'La autorización ante Hacienda' },
];

function enQuePaso(lo: MiFacturacion): number {
  return lo.como.estado === 'lista' ? 6 : lo.como.paso;
}

/**
 * Si un paso está hecho, **por lo suyo** y no por dónde va el alta: con la empresa de pruebas, el
 * alta en Verifacti y la autorización vienen hechas aunque falten las series.
 */
function estaHecho(lo: MiFacturacion, paso: PasoDeFacturacion): boolean {
  const e = lo.empresa;
  if (e === null) return false;
  switch (paso) {
    case 1:
      return true;
    case 2:
      return e.dePruebas || (e.enSii !== null && e.foral !== null && lo.como.estado !== 'parada');
    case 3:
      return (
        lo.series.ticket !== null &&
        lo.series.factura !== null &&
        lo.series.rectificativa !== null &&
        lo.otroPrograma !== null
      );
    case 4:
      return e.enVerifacti;
    case 5:
      return e.autorizacion.estado === 'correcta';
  }
}

/** Lo que se lee debajo de cada paso: lo guardado, o lo que falta. */
function detalleDelPaso(lo: MiFacturacion, paso: PasoDeFacturacion): string {
  const e = lo.empresa;
  switch (paso) {
    case 1:
      return e === null ? 'El NIF se mira en Hacienda al escribirlo' : `${e.nombre} · ${e.nif}`;
    case 2:
      if (e?.dePruebas === true) return 'La empresa de pruebas: no se pregunta';
      return e === null || e.enSii === null || e.foral === null
        ? 'El SII y si tu domicilio fiscal es foral'
        : e.foral === 'no' && !e.enSii
          ? 'Ni SII ni foral'
          : 'Contestado';
    case 3:
      return lo.series.ticket === null
        ? 'Tickets, facturas y correcciones'
        : `${lo.series.ticket} · ${lo.series.factura ?? '—'} · ${lo.series.rectificativa ?? '—'}`;
    case 4:
      return e?.enVerifacti === true ? 'Hecha' : 'Se hace sola';
    case 5:
      if (e === null) return 'La firma el titular';
      if (e.autorizacion.estado === 'correcta') {
        return e.autorizacion.firmante === null
          ? 'Firmada'
          : `Firmada por ${e.autorizacion.firmante}`;
      }
      if (e.autorizacion.estado === 'pendiente') return 'Esperando la firma';
      return `La da ${e.titular?.nombre ?? 'el titular'}`;
  }
}

function LaLinea({ lo }: { readonly lo: MiFacturacion }) {
  if (lo.como.estado === 'parada') {
    return <Etiqueta tono="mal">Parada</Etiqueta>;
  }
  if (lo.empresa?.entorno === 'real') return <Etiqueta tono="bien">En real</Etiqueta>;
  return <Etiqueta tono="atencion">En pruebas</Etiqueta>;
}

export function LaDeclaracionEnUnaHoja({
  abierta,
  alCerrar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
}) {
  const declaracion = usarLaDeclaracion();
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Declaración responsable" amplia>
      {declaracion.isLoading ? (
        <Cargando que="la declaración" lineas={4} />
      ) : declaracion.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={declaracion.error.error} />
      ) : (
        declaracion.data !== undefined && (
          <DeclaracionResponsable
            datos={declaracion.data}
            pdf={
              <BotonDelDocumento
                consulta="la_declaracion_responsable_en_pdf"
                parametros={{}}
                texto="Descargarla en PDF"
              />
            }
          />
        )
      )}
    </Hoja>
  );
}

export function TuFacturacion() {
  const { cliente, yo } = usarSesion();
  const [abierto, setAbierto] = useState<PasoDeFacturacion | 'declaracion' | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const consulta = useQuery({
    queryKey: ['mi_facturacion', yo?.local?.id ?? null],
    queryFn: async () => {
      const respuesta = await cliente.consultar<MiFacturacion>('mi_facturacion');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  if (consulta.isLoading) {
    return (
      <Tarjeta titulo="Facturación">
        <Cargando que="la facturación" lineas={4} />
      </Tarjeta>
    );
  }
  if (consulta.error instanceof FalloDeLaApi || consulta.data === undefined) {
    return (
      <Tarjeta titulo="Facturación">
        {consulta.error instanceof FalloDeLaApi ? (
          <ErrorEnCristiano error={consulta.error.error} />
        ) : (
          <p className="text-secundario text-texto-suave">No he podido leerla.</p>
        )}
      </Tarjeta>
    );
  }

  const lo = consulta.data;
  const llega = enQuePaso(lo);
  const e = lo.empresa;
  const cerrar = () => {
    setAbierto(null);
    void consulta.refetch();
  };

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta titulo="Facturación" accion={<LaLinea lo={lo} />}>
        <div className="flex flex-col gap-e4">
          <p className="text-secundario text-texto-suave">
            {e === null
              ? `Para que ${lo.nombreDelLocal} haga tickets y facturas con Estook TPV.`
              : `${e.nombre} · NIF ${e.nif} · ${lo.territorio === 'canarias' ? 'IGIC' : 'IVA'}`}
          </p>

          {e?.dePruebas === true && (
            <Aviso tono="info" titulo="La empresa de pruebas de Verifacti">
              La ha puesto Estook para probar: lo que se emita aquí nunca es de verdad.
            </Aviso>
          )}

          {!lo.conectada && (
            <Aviso tono="info" titulo="La facturación todavía no está conectada">
              Puedes dejar hechos los primeros pasos. El alta en Verifacti y la autorización se
              hacen cuando Estook la conecte.
            </Aviso>
          )}

          {lo.como.estado === 'parada' && (
            <Aviso
              tono={lo.como.parada.todaviaNo ? 'info' : 'atencion'}
              titulo={lo.como.parada.titulo}
            >
              {lo.como.parada.porque}
            </Aviso>
          )}

          {lo.como.estado === 'lista' ? (
            <Aviso tono="bien" titulo="Lista">
              El alta está terminada. Emitir tickets y facturas llega en la siguiente entrega.
            </Aviso>
          ) : (
            lo.como.estado === 'en_marcha' && (
              <p className="text-cuerpo font-medium">Te falta: {enMinuscula(lo.como.falta)}</p>
            )
          )}

          <ol className="flex flex-col">
            {PASOS.map(({ paso, titulo }) => {
              const hecho = estaHecho(lo, paso);
              const ahora = llega === paso && lo.como.estado !== 'lista';
              const parado = lo.como.estado === 'parada' && paso >= 3;
              const puedeAbrir =
                !parado &&
                (hecho || ahora) &&
                !(paso === 2 && e?.dePruebas === true) &&
                !(paso === 4 && e?.enVerifacti === true);
              return (
                <li
                  key={paso}
                  className="flex min-h-toque items-center gap-e3 border-b border-borde py-e2 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className={
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-redondo text-secundario font-semibold ' +
                      (hecho
                        ? 'bg-bien-suave text-bien'
                        : ahora
                          ? 'bg-naranja-suave text-texto'
                          : 'bg-fondo text-texto-tenue')
                    }
                  >
                    {hecho ? '✓' : String(paso)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo font-medium">{titulo}</span>
                    <span className="block break-words text-secundario text-texto-suave">
                      {detalleDelPaso(lo, paso)}
                    </span>
                  </span>
                  {puedeAbrir && (
                    <Boton
                      tono={ahora ? 'principal' : 'texto'}
                      tamano="s"
                      onClick={() => {
                        setAbierto(paso);
                      }}
                    >
                      {ahora ? 'Seguir' : paso === 5 ? 'Ver' : 'Cambiar'}
                    </Boton>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Tarjeta>

      <Tarjeta titulo="«Pide tu factura» en el ticket">
        <div className="flex flex-col gap-e3">
          <Interruptor
            etiqueta="Encendido"
            puesto={lo.pideTuFactura}
            disabled={cambiando}
            alCambiar={(puesto) => {
              setCambiando(true);
              setError(null);
              void cliente.ejecutar('poner_pide_tu_factura', { encendido: puesto }).then((r) => {
                setCambiando(false);
                if (!r.ok) setError(r.error);
                void consulta.refetch();
              });
            }}
            ayuda="Un QR abajo del ticket, después del de Hacienda: el cliente pide su factura en su móvil y le llega al correo. El QR sale con el cobro."
          />
          {error !== null && <ErrorEnCristiano error={error} />}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Declaración responsable">
        <div className="flex flex-col gap-e3">
          <p className="text-secundario text-texto-suave">
            Lo que Estook declara a Hacienda como programa de facturación.
          </p>
          <div>
            <Boton
              tono="secundario"
              onClick={() => {
                setAbierto('declaracion');
              }}
            >
              Leerla
            </Boton>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Pasar a real">
        <p className="text-secundario text-texto-suave">
          Cuando Estook tenga la revisión del asesor y lo demás que pide la ley, lo encendemos
          nosotros y te avisamos. Lo que hagas en pruebas no pasa a real: allí los números empiezan
          en 1.
        </p>
      </Tarjeta>

      <Hoja abierta={abierto === 1} alCerrar={cerrar} titulo="1 · Tu empresa">
        {abierto === 1 && <PasoDeLaEmpresa lo={lo} alAcabar={cerrar} />}
      </Hoja>
      <Hoja abierta={abierto === 2} alCerrar={cerrar} titulo="2 · Dónde tributa">
        {abierto === 2 && <PasoDeDondeTributa lo={lo} alAcabar={cerrar} />}
      </Hoja>
      <Hoja abierta={abierto === 3} alCerrar={cerrar} titulo="3 · Las series">
        {abierto === 3 && <PasoDeLasSeries lo={lo} alAcabar={cerrar} />}
      </Hoja>
      <Hoja abierta={abierto === 4} alCerrar={cerrar} titulo="4 · Alta en Verifacti">
        {abierto === 4 && <PasoDeVerifacti lo={lo} alAcabar={cerrar} />}
      </Hoja>
      <Hoja abierta={abierto === 5} alCerrar={cerrar} titulo="5 · La autorización ante Hacienda">
        {abierto === 5 && <PasoDeLaAutorizacion lo={lo} />}
      </Hoja>
      <LaDeclaracionEnUnaHoja abierta={abierto === 'declaracion'} alCerrar={cerrar} />
    </div>
  );
}
