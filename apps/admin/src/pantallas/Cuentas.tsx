import { useQuery } from '@tanstack/react-query';
import { Cargando, ErrorEnCristiano, Etiqueta, Tarjeta } from '@estook/ui';
import { FalloDeLaApi } from '@estook/cliente-api';
import { centimos, conSimbolo, planPorCodigo } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Las cuentas y quién ha pagado (entrega E2 · decisión 0048).
 *
 * Lo mínimo que el admin necesitaba desde el primer cobro: cada organización, cómo
 * está su cuenta, qué plan lleva y lo que paga. La ficha de cada cliente, con su
 * historial, sus notas y su vendedor, es de A2.
 */

interface Cuenta {
  readonly organizacionId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly como: 'al_dia' | 'prueba' | 'impago' | 'solo_lectura' | 'sin_pagar';
  readonly diasQuedan: number | null;
  readonly plan: string | null;
  readonly intervalo: string | null;
  readonly locales: number;
  readonly cuota: number | null;
  readonly pruebaHasta: string | null;
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  readonly deLaCasa: boolean;
  readonly esEjemplo: boolean;
}

const COMO: Record<
  Cuenta['como'],
  { texto: string; tono: 'bien' | 'info' | 'mal' | 'atencion' | 'neutro' }
> = {
  al_dia: { texto: 'Al día', tono: 'bien' },
  prueba: { texto: 'En prueba', tono: 'info' },
  impago: { texto: 'Cobro fallido', tono: 'mal' },
  solo_lectura: { texto: 'Solo lectura', tono: 'atencion' },
  sin_pagar: { texto: 'Sin pagar', tono: 'neutro' },
};

export function Cuentas() {
  const { cliente } = usarSesion();
  const consulta = useQuery({
    queryKey: ['admin_las_cuentas'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<readonly Cuenta[]>('admin_las_cuentas');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  const reales = (consulta.data ?? []).filter((c) => !c.esEjemplo);
  const pagan = reales.filter((c) => !c.deLaCasa && (c.como === 'al_dia' || c.como === 'impago'));
  // Lo mensual y lo anual, cada uno en lo suyo: repartir un año en doce sería redondear dinero (regla 9).
  const cuanto = (intervalo: 'mes' | 'ano') =>
    pagan
      .filter((c) => (c.intervalo ?? 'mes') === intervalo)
      .reduce((suma, c) => suma + (c.cuota ?? 0), 0);
  const alMes = cuanto('mes');
  const alAno = cuanto('ano');

  return (
    <Tarjeta titulo="Cuentas" cuantos={reales.length}>
      {consulta.isPending ? (
        <Cargando que="las cuentas" lineas={4} />
      ) : consulta.error !== null ? (
        <ErrorEnCristiano error={(consulta.error as FalloDeLaApi).error} />
      ) : (
        <div className="flex flex-col gap-e4">
          <p className="text-secundario text-texto-suave">
            {pagan.length === 1 ? '1 cuenta paga' : `${String(pagan.length)} cuentas pagan`} ·{' '}
            {conSimbolo(centimos(alMes))} al mes
            {alAno > 0 ? ` y ${conSimbolo(centimos(alAno))} al año` : ''}, con el IVA incluido. Sin
            contar los ejemplos.
          </p>
          <ul className="flex flex-col divide-y divide-borde">
            {reales.map((c) => {
              const como = c.deLaCasa
                ? { texto: 'De la casa', tono: 'info' as const }
                : COMO[c.como];
              const plan = c.plan === null ? undefined : planPorCodigo(c.plan);
              return (
                <li
                  key={c.organizacionId}
                  className="flex flex-wrap items-center justify-between gap-e2 py-e3"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{c.nombre}</span>
                    <span className="block text-secundario text-texto-suave">
                      {c.codigo}
                      {plan === undefined ? '' : ` · ${plan.nombre}`}
                      {c.cuota === null
                        ? ''
                        : ` · ${conSimbolo(centimos(c.cuota))} ${c.intervalo === 'ano' ? 'al año' : 'al mes'}`}
                      {` · ${c.locales === 1 ? '1 local' : `${String(c.locales)} locales`}`}
                      {c.como === 'impago' && c.diasQuedan !== null
                        ? ` · quedan ${String(c.diasQuedan)} días`
                        : ''}
                      {c.cancelaAlAcabar ? ' · cancela al acabar' : ''}
                    </span>
                  </span>
                  <Etiqueta tono={como.tono}>{como.texto}</Etiqueta>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}
