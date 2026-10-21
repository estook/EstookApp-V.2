import { useState } from 'react';
import {
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Hoja,
  Lista,
  NadaConEso,
  clases,
  type ElementoDeLista,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { sinAcentos, type Centimos } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { comoDinero } from '../almacen/contrato.ts';
import { soloLoDeLaCarta, type MiCarta } from './contrato.ts';
import { elDiaEnLetra, type UnMenu } from './contratoDeLosMenus.ts';

/**
 * Añadir un plato a una sección del menú (0103): «al dar a "añadir plato" te pregunta
 * elegir plato de la carta o crear plato nuevo; ese plato nuevo se podrá desgranar en el
 * escandallo». El nuevo nace **solo en el menú**: no sale en la carta.
 */

export function AnadirAlMenu({
  menu,
  fecha,
  seccionId,
  yaEstan,
  alCerrar,
}: {
  readonly menu: UnMenu;
  readonly fecha: string;
  readonly seccionId: string;
  readonly yaEstan: readonly string[];
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const carta = usarLectura<MiCarta>('mi_carta');
  /** Lo que eligió; sin elegir, «De tu carta» si queda algo en ella y si no, «Plato nuevo». */
  const [elegido, setComo] = useState<'carta' | 'nuevo' | null>(null);
  const [buscado, setBuscado] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [suplemento, setSuplemento] = useState<Centimos | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const seccion = menu.secciones.find((s) => s.id === seccionId);
  const delDia = menu.clase === 'del_dia';

  async function poner(entrada: { plato_id: string } | { nuevo: string }, clave: string) {
    setTrabajando(clave);
    setError(null);
    const respuesta = await cliente.ejecutar('poner_plato_en_el_menu', {
      menu_id: menu.id,
      fecha,
      seccion_id: seccionId,
      ...entrada,
      ...(suplemento === null || suplemento === 0 ? {} : { suplemento_centimos: suplemento }),
    });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  const texto = sinAcentos(buscado.trim());
  const quedan =
    carta.data === undefined
      ? []
      : soloLoDeLaCarta(carta.data).platos.filter((p) => p.activo && !yaEstan.includes(p.id));
  const como = elegido ?? (carta.isPending || quedan.length > 0 ? 'carta' : 'nuevo');
  const platos = quedan
    .filter((p) => texto === '' || sinAcentos(p.nombre).includes(texto))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const ponerElNuevo = () => {
    if (nuevo.trim() !== '' && trabajando === null) void poner({ nuevo: nuevo.trim() }, 'nuevo');
  };
  const filas: ElementoDeLista[] = platos.map((p) => ({
    clave: p.id,
    titulo: p.nombre,
    ...(p.precioCentimos === null
      ? {}
      : { detalle: `En la carta, ${comoDinero(p.precioCentimos)}` }),
    derecha: (
      <Boton
        tono="secundario"
        tamano="s"
        cargando={trabajando === p.id}
        textoCargando="Poniendo"
        aria-label={`Poner ${p.nombre}`}
        onClick={() => void poner({ plato_id: p.id }, p.id)}
      >
        Poner
      </Boton>
    ),
  }));

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Añadir a ${seccion?.nombre ?? 'la sección'}${delDia ? ` · ${elDiaEnLetra(fecha)}` : ''}`}
      {...(como === 'nuevo'
        ? {
            pie: (
              <Botones>
                <Boton tono="secundario" onClick={alCerrar}>
                  Cancelar
                </Boton>
                <Boton
                  tono="principal"
                  disabled={nuevo.trim() === ''}
                  cargando={trabajando === 'nuevo'}
                  textoCargando="Añadiendo"
                  onClick={ponerElNuevo}
                >
                  Añadir
                </Boton>
              </Botones>
            ),
          }
        : {})}
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        <div className="grid grid-cols-2 gap-e1 rounded-mediano bg-fondo p-e1" role="tablist">
          {(
            [
              ['carta', 'De tu carta'],
              ['nuevo', 'Plato nuevo'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={como === valor}
              onClick={() => {
                setComo(valor);
              }}
              className={clases(
                'min-h-toque rounded-mediano text-secundario font-semibold',
                como === valor ? 'bg-superficie shadow-sm' : 'text-texto-suave',
              )}
            >
              {texto}
            </button>
          ))}
        </div>

        {como === 'carta' ? (
          <div className="flex flex-col gap-e3">
            <Campo
              etiqueta="Buscar en tu carta"
              value={buscado}
              onChange={(evento) => {
                setBuscado(evento.target.value);
              }}
            />
            {carta.isPending ? (
              <Cargando que="tu carta" forma="lista" lineas={4} />
            ) : (
              <Lista
                titulo="Platos de tu carta"
                elementos={filas}
                cuandoNoHay={
                  buscado.trim() === '' ? (
                    <p className="px-e3 py-e2 text-secundario text-texto-suave">
                      Ya están todos los de tu carta. Escribe uno en «Plato nuevo».
                    </p>
                  ) : (
                    <NadaConEso
                      compacto
                      buscado={buscado}
                      alQuitar={() => {
                        setBuscado('');
                      }}
                    />
                  )
                }
              />
            )}
            {/* Un toque y está puesto; el suplemento, que lleva uno de cada muchos, después. */}
            <p className="text-secundario text-texto-suave">
              ¿Lleva suplemento? Tócalo en el menú cuando esté puesto.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-e2">
            <Campo
              etiqueta="El plato"
              placeholder="Lentejas estofadas"
              enterKeyHint="done"
              value={nuevo}
              onChange={(evento) => {
                setNuevo(evento.target.value);
              }}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') ponerElNuevo();
              }}
            />
            <p className="text-secundario text-texto-suave">
              Solo para el menú: no sale en tu carta. Se desgrana en Escandallos, como cualquier
              plato.
            </p>
            <CampoMoneda
              etiqueta="Suplemento (si lo lleva)"
              ayuda="Lo que se cobra de más por elegirlo: «entrecot +4 €»."
              valor={suplemento}
              alCambiar={setSuplemento}
            />
          </div>
        )}
      </div>
    </Hoja>
  );
}
