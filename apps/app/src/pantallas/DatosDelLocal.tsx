import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { ElAltaDelLocal } from '../alta/contrato.ts';
import { BotonDeBuscarEnGoogle } from '../alta/BuscarTuLocal.tsx';
import { LaFichaDelLocal } from '../alta/LaFichaDelLocal.tsx';

/**
 * Ajustes › Tu local › Datos del local (la pausa del 8-nov, 0142).
 *
 * Richi: «los datos que te pregunta de nombre del local, calle, todo eso en el registro, no se
 * puede editar ahora, eso es necesario poder editarlo». Es el mismo formulario del alta, con lo
 * que tiene el local hoy, y «Rellenar desde Google» para traerlo otra vez.
 *
 * **Lo ya emitido no cambia**: un ticket o una factura llevan los datos del día en que salieron
 * (Anexo 7.6). Los datos fiscales —razón social, NIF y su domicilio— siguen en Facturación.
 */
export function DatosDelLocal() {
  const { cliente, refrescar } = usarSesion();
  const cache = useQueryClient();
  const lectura = usarLectura<ElAltaDelLocal>('el_alta');
  const [conGoogle, setConGoogle] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [vuelta, setVuelta] = useState(0);

  if (lectura.isPending) return <Cargando que="los datos del local" lineas={4} />;
  const alta = lectura.data;
  if (alta === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer los datos del local">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {!conGoogle && (
        <div>
          <BotonDeBuscarEnGoogle
            alPulsar={() => {
              setConGoogle(true);
              setGuardado(false);
            }}
          />
        </div>
      )}
      {guardado && <Aviso tono="bien" titulo="Guardado" />}
      {error !== null && <ErrorEnCristiano error={error} />}
      <LaFichaDelLocal
        key={vuelta}
        ficha={{
          nombre: alta.nombre,
          direccion: alta.ficha.direccion,
          codigoPostal: alta.ficha.codigoPostal,
          poblacion: alta.ficha.poblacion,
          provincia: alta.ficha.provincia,
          telefono: alta.ficha.telefono,
          horaDeCorte: alta.ficha.horaDeCorte,
        }}
        cliente={cliente}
        boton="Guardar"
        conBuscador={conGoogle}
        alGuardar={async () => {
          setError(null);
          setGuardado(true);
          setConGoogle(false);
          // El nombre sale arriba, en el selector de locales: la sesión lo vuelve a leer.
          await Promise.all([
            cache.invalidateQueries({ queryKey: ['el_alta'] }),
            cache.invalidateQueries({ queryKey: ['mi_local_en_google'] }),
            refrescar(),
          ]);
          setVuelta((v) => v + 1);
        }}
        alFallar={(e) => {
          setGuardado(false);
          setError(e);
        }}
      />
      <p className="text-etiqueta text-texto-suave">
        Los tickets y facturas ya hechos no cambian: llevan los datos del día en que salieron. La
        razón social y el NIF están en Ajustes › Facturación.
      </p>
    </div>
  );
}
