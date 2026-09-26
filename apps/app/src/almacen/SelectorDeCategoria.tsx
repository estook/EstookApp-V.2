import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boton, Campo, Selector } from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { CategoriaDelLocal } from './contrato.ts';

/**
 * El desplegable de categoría, con su botón de crear (M6).
 *
 * ── La regla que implementa, literal ─────────────────────────────────────────
 *
 * «**Toda lista tiene su botón de crear al final**, y crear desde ahí devuelve al
 *  sitio con lo creado ya seleccionado. **Nunca se pierde el trabajo por tener
 *  que salir a dar de alta algo**» (Auditoría, parte 3, regla 1 de los
 *  desplegables).
 *
 * Es la diferencia entre un formulario que se puede terminar y uno que obliga a
 * abandonar a medias: quien está dando de alta un producto y descubre que le
 * falta la categoría «Vinos» no puede tener que irse a otra pantalla, crearla, y
 * volver a empezar con el producto.
 *
 * Por eso el nombre de la categoría nueva se escribe aquí mismo, el comando se
 * llama sin salir, y al volver **queda elegida**.
 */
export function SelectorDeCategoria({
  categorias,
  valor,
  alElegir,
  sinElegir,
}: {
  readonly categorias: readonly CategoriaDelLocal[];
  readonly valor: string;
  readonly alElegir: (id: string) => void;
  readonly sinElegir: string;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  async function crear() {
    if (nombre.trim() === '') return;
    setGuardando(true);
    setFallo(null);

    const respuesta = await cliente.ejecutar<{ categoriaId: string }>('crear_categoria', {
      nombre: nombre.trim(),
    });

    setGuardando(false);

    if (!respuesta.ok) {
      setFallo(respuesta.error.quePasa);
      return;
    }

    // Lo importante de todo este componente: se vuelve al sitio **con lo creado
    // ya elegido**, y sin haber perdido nada de lo que hubiera escrito.
    alElegir(respuesta.datos.categoriaId);
    setNombre('');
    setCreando(false);
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
  }

  return (
    <div className="flex flex-col gap-e2">
      <Selector
        etiqueta="Categoría"
        opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
        sinElegir={sinElegir}
        cuandoNoHay="Este local todavía no tiene categorías"
        value={valor}
        onChange={(e) => {
          alElegir(e.currentTarget.value);
        }}
      />

      {creando ? (
        <div className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
          <Campo
            etiqueta="Cómo se llama la categoría"
            autoFocus
            value={nombre}
            {...(fallo === null ? {} : { error: fallo })}
            onChange={(e) => {
              setNombre(e.currentTarget.value);
            }}
          />
          <div className="flex flex-wrap gap-e2">
            <Boton
              tono="secundario"
              disabled={nombre.trim() === '' || guardando}
              cargando={guardando}
              textoCargando="Creando"
              onClick={() => {
                void crear();
              }}
            >
              Crear y usarla
            </Boton>
            <Boton
              tono="texto"
              onClick={() => {
                setCreando(false);
                setNombre('');
                setFallo(null);
              }}
            >
              Dejarlo
            </Boton>
          </div>
        </div>
      ) : (
        <div>
          <Boton
            tono="texto"
            icono={<IconoAnadir size={16} />}
            onClick={() => {
              setCreando(true);
            }}
          >
            Falta una categoría
          </Boton>
        </div>
      )}
    </div>
  );
}
