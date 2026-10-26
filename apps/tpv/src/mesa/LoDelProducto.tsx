import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { puedeEditar } from '@estook/permisos';
import { Boton, CAJA, Envoltorio, ErrorEnCristiano, Hoja } from '@estook/ui';
import type { PlatoDeLaSala } from '../datos/tipos.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Lo que sale al mantener pulsado un producto** (la entrada nueva, maqueta 5): durante el
 * servicio, lo más rápido para **«Se ha agotado»** —en cualquier aparato y por quien tenga
 * permiso, sin ir a los Ajustes— y para pedirlo **con una nota para cocina** («sin cebolla»).
 * Lo agotado, al mantenerlo, **vuelve**: «Ya hay otra vez».
 *
 * Lo que pregunta sus opciones o su peso no se pide desde aquí con nota: su nota se pone en la
 * cuenta, tocando la línea, como cualquier otra.
 */
export function LoDelProducto({
  plato,
  alCerrar,
  alPedirConNota,
}: {
  readonly plato: PlatoDeLaSala;
  readonly alCerrar: () => void;
  readonly alPedirConNota: (nota: string) => void;
}) {
  const { yo, cliente } = usarSesion();
  const cache = useQueryClient();
  const agota = puedeEditar(yo.permisos, 'accion.marcar_agotado');
  const conNota = !plato.agotado && (plato.grupos ?? []).length === 0 && plato.aPeso !== true;
  const [escribiendo, setEscribiendo] = useState(false);
  const [nota, setNota] = useState('');
  const [haciendo, setHaciendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  async function cambiarElAgotado() {
    setHaciendo(true);
    setFallo(null);
    const respuesta = plato.agotado
      ? await cliente.ejecutar('quitar_agotado', { plato_id: plato.id })
      : await cliente.ejecutar('marcar_agotado', { plato_id: plato.id, hasta: 'jornada' });
    setHaciendo(false);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['carta_de_la_sala'] }),
      cache.invalidateQueries({ queryKey: ['sala'] }),
    ]);
    alCerrar();
  }

  return (
    <Hoja abierta titulo={plato.nombre} alCerrar={alCerrar}>
      <div className="flex flex-col gap-e3 pb-e3">
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
        {escribiendo ? (
          <>
            <Envoltorio id="nota-del-producto" etiqueta="Nota para cocina">
              <textarea
                id="nota-del-producto"
                rows={2}
                maxLength={200}
                autoFocus
                className={[CAJA, 'min-h-[4.5rem] py-e2'].join(' ')}
                placeholder="Sin cebolla · al punto · para compartir…"
                value={nota}
                onChange={(e) => {
                  setNota(e.target.value);
                }}
              />
            </Envoltorio>
            <Boton
              tono="principal"
              ancho
              disabled={nota.trim() === ''}
              onClick={() => {
                alPedirConNota(nota);
                alCerrar();
              }}
            >
              Pedirlo con la nota
            </Boton>
          </>
        ) : (
          <>
            {agota && (
              <Boton ancho cargando={haciendo} onClick={() => void cambiarElAgotado()}>
                {plato.agotado ? '↺ Ya hay otra vez' : '⊘ Se ha agotado'}
              </Boton>
            )}
            {conNota && (
              <Boton
                ancho
                onClick={() => {
                  setEscribiendo(true);
                }}
              >
                ✎ Con una nota para cocina
              </Boton>
            )}
            {!agota && !conNota && (
              <p className="text-secundario text-texto-suave">
                {plato.agotado
                  ? 'Está agotado. Lo vuelve a poner quien lleva el local.'
                  : 'Su nota se pone en la cuenta, tocando la línea, al pedirlo.'}
              </p>
            )}
          </>
        )}
      </div>
    </Hoja>
  );
}
