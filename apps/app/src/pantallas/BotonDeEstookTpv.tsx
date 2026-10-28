import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconoDescargar, IconoFlechaDerecha, IconoServicio } from '@estook/iconos';
import { DONDE_SE_DESCARGA_LA_CAJA, centimos, conSimbolo, planPorCodigo } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Boton, Hoja, clases, usarEsEscritorio } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **El botón de Estook TPV en Ajustes** (0120; Richi, 28-oct: «un botón que se diferencie de
 * color»; [la maqueta](../../../../docs/maquetas/estook-tpv-en-ajustes.html)).
 *
 * Es lo único con color propio en Ajustes: oscuro y con el borde naranja. Lo ve quien vincula
 * los aparatos del local (gerente y dirección), que es quien monta Estook TPV.
 *
 *   · **Con Pro** (o Cadena, o la casa): en el ordenador, una hoja con «Abrir Estook TPV» y
 *     «Descargar para Windows»; en el móvil abre Estook TPV, que la descarga no sirve ahí.
 *   · **Con Esencial**, en gris y con «PRO»: al tocarlo **vende** Estook TPV —lo que gana el
 *     local con los dos unidos— y lleva a cambiar de plan. Quien no lleva la suscripción lee
 *     quién puede cambiarla.
 *
 * Abrir Estook TPV no entra con la sesión de Estook (0107): lleva a su puerta, donde se vincula
 * ese aparato. Lo que decide si se puede es la API (`queLleveEstookTpv`); esto solo lo pinta.
 */
const DIRECCION_DE_ESTOOK_TPV = `${import.meta.env.BASE_URL}../tpv/`;

export function BotonDeEstookTpv() {
  const { yo, permisos } = usarSesion();
  const escritorio = usarEsEscritorio();
  const navegar = useNavigate();
  const [abierta, setAbierta] = useState(false);

  if (yo?.local === null || yo?.local === undefined) return null;
  if (!puedeEditar(permisos, 'accion.vincular_aparatos')) return null;
  // Sin el dato todavía (la API sin desplegar), como si lo llevara: no se vende lo que hay.
  const conPro = yo.cuenta?.conEstookTpv !== false;
  const laLlevo = yo.cuenta?.laLlevo === true;
  const alCerrar = () => {
    setAbierta(false);
  };

  const contenido = (
    <>
      <span
        aria-hidden
        className={clases(
          'grid size-9 shrink-0 place-items-center rounded-medio',
          conPro ? 'bg-naranja-en-oscuro text-charcoal' : 'bg-fondo text-texto-suave',
        )}
      >
        <IconoServicio size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-e2 whitespace-nowrap text-cuerpo font-semibold">
          Estook TPV
          {!conPro && (
            <span className="rounded-redondo bg-naranja px-e2 text-[0.6875rem] font-bold tracking-[0.04em] text-sobre-naranja">
              PRO
            </span>
          )}
        </span>
        <span
          className={clases('block text-secundario', conPro ? 'text-white/75' : 'text-texto-suave')}
        >
          {conPro ? 'Sala, cocina y caja' : 'Cobra con Estook'}
        </span>
      </span>
      <IconoFlechaDerecha
        size={18}
        className={clases('shrink-0', conPro ? 'text-naranja-en-oscuro' : 'text-texto-tenue')}
      />
    </>
  );

  const estilo = clases(
    'flex min-h-toque w-full items-center gap-e3 rounded-grande px-e3 py-e2 text-left',
    conPro
      ? 'border-2 border-naranja-en-oscuro bg-charcoal text-white'
      : 'border-2 border-dashed border-borde bg-superficie text-texto',
  );

  // En el móvil, con Pro, abre directamente: no hay nada más que elegir.
  if (conPro && !escritorio) {
    return (
      <a href={DIRECCION_DE_ESTOOK_TPV} className={estilo}>
        {contenido}
      </a>
    );
  }

  const pro = planPorCodigo('pro');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierta(true);
        }}
        className={estilo}
      >
        {contenido}
      </button>
      {conPro ? (
        <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Estook TPV">
          <div className="flex flex-col gap-e3 px-e4 pb-e4 @min-[22rem]:px-e5">
            <p className="text-texto-suave">Toma nota en la sala, manda a cocina y cobra.</p>
            <a
              href={DIRECCION_DE_ESTOOK_TPV}
              className="flex min-h-toque flex-col items-center justify-center rounded-grande bg-naranja px-e4 py-e2 text-center font-semibold text-sobre-naranja"
            >
              Abrir Estook TPV
              <span className="text-secundario font-normal">En este navegador</span>
            </a>
            <a
              href={DONDE_SE_DESCARGA_LA_CAJA}
              className="flex min-h-toque items-center justify-center gap-e2 rounded-grande border border-borde bg-superficie px-e4 py-e2 text-center font-semibold"
            >
              <IconoDescargar size={18} />
              <span className="flex flex-col">
                Descargar para Windows
                <span className="text-secundario font-normal text-texto-suave">
                  Para el PC de la caja: imprime los tickets y abre el cajón
                </span>
              </span>
            </a>
            <p className="text-secundario text-texto-suave">
              Los móviles y las tablets de la sala lo abren en estook.com/tpv y lo instalan desde
              ahí.
            </p>
          </div>
        </Hoja>
      ) : (
        <Hoja
          abierta={abierta}
          alCerrar={alCerrar}
          titulo="Actualiza a Pro para cobrar con nuestro TPV"
          pie={
            <div className="flex flex-wrap justify-end gap-e2">
              <Boton tono="texto" onClick={alCerrar}>
                Ahora no
              </Boton>
              {laLlevo && (
                <Boton
                  tono="principal"
                  onClick={() => {
                    alCerrar();
                    navegar('/ajustes/suscripcion');
                  }}
                >
                  Pasar a Pro
                </Boton>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-e3 px-e4 pb-e4 @min-[22rem]:px-e5">
            <p className="text-texto-suave">
              Estook TPV es la caja de tu local, unida a la Estook que ya usas: lo que vendes entra
              solo, y sabes lo que te deja cada plato.
            </p>
            <ul className="flex flex-col gap-e2">
              {LO_QUE_GANA.map((linea) => (
                <li key={linea} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-e2">
                  <span aria-hidden className="font-bold text-bien">
                    ✓
                  </span>
                  {linea}
                </li>
              ))}
            </ul>
            {pro !== undefined && (
              <p className="rounded-grande bg-naranja-suave px-e3 py-e2 tabular-nums">
                <strong>Pro · {conSimbolo(centimos(pro.alMesPorLocal))}</strong> al mes por local,
                IVA incluido.
              </p>
            )}
            {!laLlevo && (
              <p className="text-secundario text-texto-suave">
                El plan lo cambia quien lleva la suscripción de tu negocio.
              </p>
            )}
          </div>
        </Hoja>
      )}
    </>
  );
}

/** Lo que gana el local con Estook TPV, unido a Estook (Richi: «que lo venda bien»). */
const LO_QUE_GANA = [
  'Los camareros piden desde su móvil, y la mesa llega sola a cocina y barra, en pantalla o en papel.',
  'Cobras en la mesa o en la caja: el cajón se abre solo y la caja se cierra sin apuntar nada.',
  'Lo vendido baja solo del almacén: sabes lo que gastas, lo que falta y lo que se escapa.',
  'El food cost de verdad, plato a plato, y Fogón te avisa de lo que no cuadra.',
] as const;
