import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  Boton,
  Cargando,
  DeclaracionResponsable,
  ErrorEnCristiano,
  type DatosDeLaDeclaracion,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';

/**
 * **Ajustes del TPV › Declaración responsable** (T6 · 1, decisión 0126; maquetas de T6, sección
 * 7; Anexo 4.14). La Orden HAC/1177/2024 pide que esté dentro del programa y a mano de quien lo
 * usa: aquí, en la caja, la ve cualquiera que entre con su PIN. Es la misma que en Estook.
 */
export function LaDeclaracion() {
  const { cliente } = usarSesion();
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const declaracion = useQuery({
    queryKey: ['la_declaracion_responsable'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<DatosDeLaDeclaracion>('la_declaracion_responsable');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });

  async function bajar() {
    setBajando(true);
    setError(null);
    const respuesta = await cliente.consultar<{ nombre: string; tipo: string; base64: string }>(
      'la_declaracion_responsable_en_pdf',
    );
    setBajando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    const texto = atob(respuesta.datos.base64);
    const bytes = new Uint8Array(texto.length);
    for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([bytes], { type: respuesta.datos.tipo }));
    enlace.download = respuesta.datos.nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => {
      URL.revokeObjectURL(enlace.href);
    }, 10_000);
  }

  return (
    <section aria-label="Declaración responsable" className="flex max-w-[44rem] flex-col gap-e4">
      <h2 className="text-seccion font-bold">Declaración responsable</h2>
      {declaracion.data === undefined ? (
        declaracion.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={declaracion.error.error} />
        ) : (
          <Cargando que="la declaración" lineas={4} />
        )
      ) : (
        <DeclaracionResponsable
          datos={declaracion.data}
          pdf={
            <div className="flex flex-col gap-e2">
              <div>
                <Boton
                  tono="secundario"
                  cargando={bajando}
                  textoCargando="Haciéndolo"
                  onClick={() => {
                    void bajar();
                  }}
                >
                  Descargarla en PDF
                </Boton>
              </div>
              {error !== null && <ErrorEnCristiano error={error} />}
            </div>
          }
        />
      )}
    </section>
  );
}
