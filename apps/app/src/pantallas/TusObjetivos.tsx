import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  NOMBRE_DEL_OBJETIVO,
  QUE_ES_EL_OBJETIVO,
  enEuros,
  centimos,
  objetivoDelCostePrimo,
  enPuntos,
  type ClaveEnFraccion,
} from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Campo, Cargando, ErrorEnCristiano, Tarjeta, aCentimos } from '@estook/ui';
import { usarMisObjetivos } from '../ganchos/usarMisObjetivos.ts';
import { FilaDelSemaforo } from '../objetivos/Semaforo.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes · Tu local · Tus objetivos (entrega O, mejora 17 · 0047).
 *
 * Hasta ahora los objetivos **solo se podían poner en el alta**, y el alta se hace
 * una vez: quien quería cambiar su food cost en marzo no tenía dónde. Aquí se
 * cambian, con lo normal del sector al lado de cada casilla y, arriba, cómo vas
 * esta semana con los que tienes.
 *
 * Cambiar un objetivo **no repinta lo de antes** (el objetivo de enero juzga enero):
 * lo hace el servidor, cerrando el de ayer y abriendo el de hoy.
 */
const EN_FRACCION: readonly ClaveEnFraccion[] = ['materia_prima', 'personal', 'merma'];

/** 0,28 → «28»: con `toFixed`, no con `Math.round`, que es de los motores (regla 9). */
function enPorcentaje(fraccion: number | null | undefined): string {
  return fraccion === null || fraccion === undefined
    ? ''
    : String(Number((fraccion * 100).toFixed(2)));
}

function comoNumero(escrito: string): number | null {
  const numero = Number(escrito.replace(',', '.'));
  return escrito.trim() === '' || !Number.isFinite(numero) ? null : numero;
}

export function TusObjetivos() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = usarMisObjetivos();
  const datos = consulta.data;

  const [valores, setValores] = useState<Record<string, string>>({});
  const [ventas, setVentas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Al llegar los puestos, se rellenan las casillas. Solo entonces: después son de
  // quien escribe.
  const puestos = datos?.puestos;
  useEffect(() => {
    if (puestos === undefined || puestos === null) return;
    const de = (clave: string) => puestos.find((p) => p.clave === clave);
    setValores({
      materia_prima: enPorcentaje(de('materia_prima')?.valor),
      personal: enPorcentaje(de('personal')?.valor),
      // Sin la suya, la meta del sector: el semáforo ya juzga con ella.
      merma: enPorcentaje(de('merma')?.valor ?? 0.04),
    });
    const importe = de('ventas_semanales')?.importeCentimos;
    setVentas(importe === null || importe === undefined ? '' : enEuros(centimos(importe)));
  }, [puestos]);

  if (datos === undefined) {
    return (
      <Tarjeta titulo="Tus objetivos">
        <Cargando que="tus objetivos" lineas={3} />
      </Tarjeta>
    );
  }

  const sonDePartida = (datos.puestos ?? []).some((p) => p.dePartida);
  const mal = EN_FRACCION.some((clave) => {
    const numero = comoNumero(valores[clave] ?? '');
    return numero === null || numero < 0 || numero > 100;
  });
  const ventasEnCentimos = ventas.trim() === '' ? null : aCentimos(ventas);
  const ventasMal = ventas.trim() !== '' && (ventasEnCentimos === null || ventasEnCentimos <= 0);

  const materiaPrima = comoNumero(valores['materia_prima'] ?? '');
  const personal = comoNumero(valores['personal'] ?? '');
  const primo =
    materiaPrima === null || personal === null
      ? null
      : objetivoDelCostePrimo(materiaPrima / 100, personal / 100);

  async function guardar() {
    if (mal || ventasMal) return;
    setGuardando(true);
    setFallo(null);
    setGuardado(false);
    const respuesta = await cliente.ejecutar('poner_objetivos', {
      objetivos: [
        // De porcentaje a fracción en un solo sitio, como en el alta.
        ...EN_FRACCION.map((clave) => ({
          clave,
          valor: (comoNumero(valores[clave] ?? '') ?? 0) / 100,
        })),
        { clave: 'ventas_semanales', importeCentimos: ventasEnCentimos },
      ],
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    setGuardado(true);
    await cache.invalidateQueries({ queryKey: ['mis_objetivos'] });
  }

  return (
    <Tarjeta titulo="Tus objetivos" origen="Pintan de verde, ámbar o rojo el semáforo del Panel">
      <div className="flex flex-col gap-e4">
        {datos.cifras.length > 0 && (
          <section
            aria-label="Cómo vas esta semana"
            className="flex flex-col divide-y divide-borde"
          >
            {datos.cifras.map((cifra) => (
              <FilaDelSemaforo key={cifra.que} cifra={cifra} />
            ))}
          </section>
        )}

        {datos.puedeCambiarlos && (
          <>
            {sonDePartida && (
              <Aviso tono="info" titulo="Los puso Estook al darte de alta">
                Son los normales para tu tipo de local. Si sabes los tuyos, cámbialos.
              </Aviso>
            )}

            <div className="grid gap-e3 sm:grid-cols-2">
              {EN_FRACCION.map((clave) => (
                <Campo
                  key={clave}
                  etiqueta={
                    clave === 'materia_prima'
                      ? 'Food cost (materia prima)'
                      : NOMBRE_DEL_OBJETIVO[clave]
                  }
                  name={`objetivo-${clave}`}
                  inputMode="decimal"
                  detras="%"
                  value={valores[clave] ?? ''}
                  onChange={(evento) => {
                    setGuardado(false);
                    setValores((antes) => ({ ...antes, [clave]: evento.target.value }));
                  }}
                  ayuda={`${QUE_ES_EL_OBJETIVO[clave]} ${datos.loNormal[clave] ?? ''}`.trim()}
                />
              ))}

              <Campo
                etiqueta="Ventas de la semana"
                name="objetivo-ventas_semanales"
                inputMode="decimal"
                detras="€"
                value={ventas}
                onChange={(evento) => {
                  setGuardado(false);
                  setVentas(evento.target.value);
                }}
                ayuda={
                  datos.propuestaDeVentas === null
                    ? 'Lo que quieres facturar en siete días. Déjalo vacío si no quieres ponerte uno.'
                    : `Estas cuatro semanas has facturado ${enEuros(centimos(datos.propuestaDeVentas))} € de media.`
                }
                {...(ventasMal ? { error: 'Escribe un importe, como 4.500 o 4500,50.' } : {})}
              />
            </div>

            {datos.propuestaDeVentas !== null && ventas.trim() === '' && (
              <div>
                <Boton
                  tono="texto"
                  onClick={() => {
                    if (datos.propuestaDeVentas !== null) {
                      setVentas(enEuros(centimos(datos.propuestaDeVentas)));
                    }
                  }}
                >
                  Poner {enEuros(centimos(datos.propuestaDeVentas))} €
                </Boton>
              </div>
            )}

            {primo !== null && (
              <p className="text-secundario text-texto-suave">
                Con esto, tu coste primo objetivo es el <strong>{enPuntos(primo * 100)}</strong>.
                Los que mejor lo llevan, por debajo del 60 %.
              </p>
            )}

            {mal && (
              <Aviso tono="atencion" titulo="Algún objetivo se sale">
                Son porcentajes: van de 0 a 100.
              </Aviso>
            )}
            {fallo !== null && <ErrorEnCristiano error={fallo} />}
            {guardado && (
              <p aria-live="polite" className="text-secundario text-bien">
                Guardados. Juzgan desde hoy; lo de antes, con los de antes.
              </p>
            )}

            <div>
              <Boton
                tono="principal"
                cargando={guardando}
                textoCargando="Guardando"
                disabled={mal || ventasMal}
                onClick={() => {
                  void guardar();
                }}
              >
                Guardar los objetivos
              </Boton>
            </div>
          </>
        )}
      </div>
    </Tarjeta>
  );
}
