import { useState, type ReactNode } from 'react';
import { Boton, ErrorEnCristiano } from '@estook/ui';
import { IconoCandado, IconoDocumento, IconoNoVer, IconoSubir, IconoVer } from '@estook/iconos';
import {
  TIPOS_DE_CONTRATO,
  diasEnLetra,
  dniEscondido,
  type SaldoDeVacaciones,
} from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../../sesion/Sesion.tsx';
import {
  comoDinero,
  type DocumentoDeLaFicha,
  type FichaLaboral,
  type FichaPrivada,
} from '../contrato.ts';
import { fechaCorta, mesConMayuscula } from './comoSeLee.ts';

/**
 * Lo que va dentro de cada plegable de la ficha (la Ampliación 3, 0153): Información
 * personal, Información laboral y Vacaciones y solicitudes. Filas de dos columnas, lo
 * que es a la izquierda y el dato a la derecha, como Ajustes del iPhone.
 */

export function Fila({ que, children }: { readonly que: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-e3 border-t border-borde/70 py-e2 text-secundario first:border-t-0">
      <span className="text-texto-tenue">{que}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}

function SinPoner() {
  return <span className="font-normal text-texto-tenue">Sin poner</span>;
}

/** «Privado: solo lo ven quien lleva el local y la propia persona.» Con su candado. */
function LoPrivado() {
  return (
    <p className="flex items-center gap-e1 text-etiqueta text-texto-tenue">
      <IconoCandado size={14} aria-hidden />
      Privado: solo lo ven quien lleva el local y la propia persona.
    </p>
  );
}

// ── Información personal ─────────────────────────────────────────────────────

/** «6•• ••• 214»: el teléfono, escondido como en la maqueta, con las tres últimas. */
function telefonoEscondido(telefono: string): string {
  const cifras = telefono.replace(/\D/g, '');
  if (cifras.length < 6) return '•••';
  return `${cifras.slice(0, 1)}•• ••• ${cifras.slice(-3)}`;
}

export function InformacionPersonal({
  nombreEntero,
  correo,
  privada,
}: {
  readonly nombreEntero: string;
  readonly correo: string | null | undefined;
  readonly privada: FichaPrivada | null;
}) {
  // Escondido de entrada: es una pantalla que se abre en mitad del local, con gente al
  // lado. Se enseña entero con un toque.
  const [visible, setVisible] = useState(false);
  const dni = privada?.dni ?? null;
  const telefono = privada?.telefono ?? null;
  return (
    <div className="flex flex-col gap-e2">
      <div>
        <Fila que="Nombre y apellidos">{nombreEntero}</Fila>
        <Fila que="DNI/NIE">{dni === null ? <SinPoner /> : visible ? dni : dniEscondido(dni)}</Fila>
        <Fila que="Teléfono">
          {telefono === null ? <SinPoner /> : visible ? telefono : telefonoEscondido(telefono)}
        </Fila>
        {correo !== undefined && <Fila que="Correo">{correo ?? <SinPoner />}</Fila>}
        <Fila que="Domicilio">{privada?.domicilio ?? <SinPoner />}</Fila>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <LoPrivado />
        {(dni !== null || telefono !== null) && (
          <Boton
            tono="texto"
            icono={visible ? <IconoNoVer size={16} /> : <IconoVer size={16} />}
            onClick={() => {
              setVisible((v) => !v);
            }}
          >
            {visible ? 'Esconder' : 'Ver entero'}
          </Boton>
        )}
      </div>
    </div>
  );
}

// ── Información laboral ──────────────────────────────────────────────────────

const SUELDO_ES = { bruto: 'brutos', neto: 'netos' } as const;
const SUELDO_CADA = { mes: 'al mes', ano: 'al año' } as const;

function elSueldo(privada: FichaPrivada): string | null {
  if (privada.sueldoCentimos === null) return null;
  return [
    comoDinero(privada.sueldoCentimos),
    privada.sueldoEs === null ? '' : ` ${SUELDO_ES[privada.sueldoEs]}`,
    privada.sueldoCada === null ? '' : ` ${SUELDO_CADA[privada.sueldoCada]}`,
    privada.pagas === null ? '' : ` · ${String(privada.pagas)} pagas`,
  ].join('');
}

/** «Leída del contrato y confirmada por Rosa el 25 nov 2026», o «Escrita a mano por…». */
function deDondeSale(laboral: FichaLaboral): string {
  const quien = laboral.cambiadaPor === null ? '' : ` por ${laboral.cambiadaPor}`;
  const cuando = fechaCorta(laboral.cambiadaEn.slice(0, 10));
  return laboral.origen === 'contrato'
    ? `Leída del contrato por Fogón y confirmada${quien} el ${cuando}.`
    : `Escrita a mano${quien} el ${cuando}.`;
}

export function InformacionLaboral({
  laboral,
  privada,
  documentos,
  loQueCuesta,
}: {
  readonly laboral: FichaLaboral | null;
  /** Sin la propiedad: quien mira no ve lo privado (el sueldo). */
  readonly privada?: FichaPrivada | null;
  readonly documentos?: readonly DocumentoDeLaFicha[];
  /** Lo que cuesta al local (la retribución, 0027), si quien mira lo ve. */
  readonly loQueCuesta?: ReactNode;
}) {
  const sueldo = privada === undefined || privada === null ? null : elSueldo(privada);
  return (
    <div className="flex flex-col gap-e3">
      <div>
        <Fila que="Categoría">{laboral?.categoria ?? <SinPoner />}</Fila>
        <Fila que="Convenio">{laboral?.convenio ?? <SinPoner />}</Fila>
        <Fila que="Contrato">
          {laboral?.contrato == null ? <SinPoner /> : TIPOS_DE_CONTRATO[laboral.contrato]}
        </Fila>
        <Fila que="Jornada">
          {laboral?.horasSemanales == null ? (
            <SinPoner />
          ) : (
            `${diasEnLetra(laboral.horasSemanales)} h a la semana${
              laboral.jornada === null ? '' : ` · ${laboral.jornada}`
            }`
          )}
        </Fila>
        <Fila que="Vacaciones al año">
          {laboral?.vacacionesAlAno == null ? (
            <SinPoner />
          ) : (
            `${diasEnLetra(laboral.vacacionesAlAno)} días ${laboral.vacacionesEn}`
          )}
        </Fila>
        {privada !== undefined && <Fila que="Sueldo">{sueldo ?? <SinPoner />}</Fila>}
      </div>
      {laboral !== null && <p className="text-etiqueta text-texto-tenue">{deDondeSale(laboral)}</p>}
      {documentos !== undefined && <SusDocumentos documentos={documentos} />}
      {loQueCuesta}
      {privada !== undefined && <LoPrivado />}
    </div>
  );
}

/**
 * Una fila de documento con su «Abrir» (el contrato, una nómina): la ventana se abre al tocar y
 * se le pone el enlace firmado cuando llega, que caduca a los cinco minutos (0127).
 */
export function FilaDeDocumento({
  documento,
  titulo,
  detalle,
}: {
  readonly documento: DocumentoDeLaFicha;
  readonly titulo: string;
  readonly detalle: string;
}) {
  const { cliente } = usarSesion();
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function abrir() {
    setAbriendo(true);
    setError(null);
    // Si se abriera después de esperar, el navegador del móvil la bloquearía como una ventana
    // que salta sola.
    const ventana = window.open('', '_blank');
    const respuesta = await cliente.consultar<{ enlace: string }>('abrir_un_documento_de_persona', {
      documento_id: documento.documentoId,
    });
    setAbriendo(false);
    if (!respuesta.ok) {
      ventana?.close();
      setError(respuesta.error);
      return;
    }
    if (ventana === null) window.location.assign(respuesta.datos.enlace);
    else ventana.location.href = respuesta.datos.enlace;
  }

  return (
    <div className="flex flex-col gap-e1 border-t border-borde/70 py-e2 first:border-t-0">
      <div className="flex items-center gap-e2 text-secundario">
        <span
          aria-hidden
          className="grid h-[30px] w-[26px] shrink-0 place-items-center rounded-[6px] bg-mal-suave text-[0.56rem] font-extrabold text-mal"
        >
          {documento.mime === 'application/pdf' ? 'PDF' : 'FOTO'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{titulo}</span>
          <span className="text-etiqueta text-texto-tenue">{detalle}</span>
        </span>
        <Boton
          tono="texto"
          icono={<IconoDocumento size={16} />}
          cargando={abriendo}
          textoCargando="Abriendo"
          aria-label={`Abrir ${titulo}`}
          onClick={() => {
            void abrir();
          }}
        >
          Abrir
        </Boton>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
    </div>
  );
}

function SusDocumentos({ documentos }: { readonly documentos: readonly DocumentoDeLaFicha[] }) {
  if (documentos.length === 0) {
    return <p className="text-secundario text-texto-suave">Sin contrato subido.</p>;
  }
  return (
    <div className="flex flex-col">
      {documentos.map((d) => (
        <FilaDeDocumento
          key={d.documentoId}
          documento={d}
          titulo={d.nombre}
          detalle={`Subido el ${fechaCorta(d.subidoEn.slice(0, 10))}${
            d.subidoPor === null ? '' : ` por ${d.subidoPor}`
          }`}
        />
      ))}
    </div>
  );
}

// ── Las nóminas (la 3 · 2) ───────────────────────────────────────────────────

export function SusNominas({
  nominas,
  alSubir,
}: {
  readonly nominas: readonly DocumentoDeLaFicha[];
  /** Solo quien puede subirlas: «Subir una nómina». */
  readonly alSubir?: () => void;
}) {
  return (
    <div className="flex flex-col gap-e3">
      {nominas.length === 0 ? (
        <p className="text-secundario text-texto-suave">Todavía no hay ninguna nómina.</p>
      ) : (
        <div className="flex flex-col">
          {nominas.map((n) => (
            <FilaDeDocumento
              key={n.documentoId}
              documento={n}
              titulo={n.mes === undefined ? n.nombre : mesConMayuscula(n.mes)}
              detalle={
                n.netoCentimos != null
                  ? `${comoDinero(n.netoCentimos)} netos`
                  : `Subida el ${fechaCorta(n.subidoEn.slice(0, 10))}`
              }
            />
          ))}
        </div>
      )}
      {alSubir !== undefined && (
        <div>
          <Boton icono={<IconoSubir size={16} />} onClick={alSubir}>
            Subir una nómina
          </Boton>
        </div>
      )}
      <LoPrivado />
    </div>
  );
}

// ── Vacaciones y solicitudes ─────────────────────────────────────────────────

export function SusVacaciones({ saldo }: { readonly saldo: SaldoDeVacaciones | null }) {
  if (saldo === null) {
    return (
      <p className="text-secundario text-texto-suave">
        Sin los días de vacaciones al año no se pueden contar. Salen de su contrato o su convenio:
        ponlos en su ficha.
      </p>
    );
  }
  const total = Math.max(saldo.delAno + saldo.pendientes, 0.01);
  const partes = [
    { que: 'disfrutados', dias: saldo.disfrutadas, color: 'var(--color-texto-suave)' },
    { que: 'aprobados', dias: saldo.aprobadas, color: 'var(--color-bien)' },
    { que: 'disponibles', dias: Math.max(saldo.disponibles, 0), color: '#2563eb' },
  ];
  return (
    <div className="flex flex-col gap-e3">
      <div
        aria-hidden
        className="flex h-3 gap-[2px] overflow-hidden rounded-[6px] bg-borde"
        title={partes.map((p) => `${diasEnLetra(p.dias)} ${p.que}`).join(' · ')}
      >
        {partes
          .filter((p) => p.dias > 0)
          .map((p) => (
            <span key={p.que} style={{ flex: p.dias / total, background: p.color }} />
          ))}
      </div>
      <p className="flex flex-wrap gap-e3 text-etiqueta text-texto-suave">
        {partes.map((p) => (
          <span key={p.que} className="inline-flex items-center gap-e1">
            <i
              aria-hidden
              className="inline-block size-[9px] rounded-[3px]"
              style={{ background: p.color }}
            />
            {diasEnLetra(p.dias)} {p.que}
          </span>
        ))}
      </p>
      <div>
        <Fila que={saldo.proporcional ? 'Este año (entró este año)' : 'Al año'}>
          {diasEnLetra(saldo.delAno)} días
          {saldo.proporcional ? ` de ${diasEnLetra(saldo.alAno)}` : ''}
        </Fila>
        <Fila que="Devengados a hoy">{diasEnLetra(saldo.devengadas)} días</Fila>
        <Fila que="De años anteriores">{diasEnLetra(saldo.pendientes)}</Fila>
      </div>
      <p className="rounded-medio bg-fondo p-e3 text-etiqueta text-texto-suave">
        <strong className="text-texto">Cómo cuadra:</strong> {diasEnLetra(saldo.delAno)} del año
        {saldo.pendientes > 0 ? ` + ${diasEnLetra(saldo.pendientes)} de antes` : ''} −{' '}
        {diasEnLetra(saldo.disfrutadas)} disfrutados − {diasEnLetra(saldo.aprobadas)} aprobados ={' '}
        {diasEnLetra(saldo.disponibles)} disponibles. Lo devengado es lo que le corresponde si se
        fuera hoy. Lo calcula Estook con su ficha.
      </p>
    </div>
  );
}
