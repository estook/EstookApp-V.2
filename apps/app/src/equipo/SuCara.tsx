import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IconoCamara, IconoQuitar } from '@estook/iconos';
import { Avatar, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { reducirCara } from '../almacen/reducirFoto.ts';

/**
 * La cara de una persona, que se cambia tocándola (la experiencia, 0083).
 *
 * «Añadir poder subir fotos del trabajador, y que no sean redondas sino cuadrados
 * con bordes redondeados.» Se pinta la cara grande y, si quien mira puede cambiarla
 * —la suya, o la de su equipo si da accesos—, una cámara en la esquina: abre la
 * cámara del móvil o el selector de fotos del ordenador. La foto se recorta en
 * cuadrado y se reduce **en el aparato** antes de subir.
 *
 * Al cambiarla se vuelve a leer todo lo que enseña caras: quién soy, Personas, el
 * equipo de hoy y su ficha.
 */
export function SuCara({
  personaId,
  nombre,
  foto,
  tamano = 72,
  puedeCambiarla,
}: {
  readonly personaId: string;
  readonly nombre: string;
  readonly foto: string | null;
  readonly tamano?: number;
  readonly puedeCambiarla: boolean;
}) {
  const { cliente, refrescar } = usarSesion();
  const cache = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  async function alDia() {
    await Promise.all([
      refrescar(),
      cache.invalidateQueries({ queryKey: ['quien_tiene_acceso'] }),
      cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] }),
      cache.invalidateQueries({ queryKey: ['una_persona', personaId] }),
    ]);
  }

  async function subir(fichero: File) {
    setFallo(null);
    setSubiendo(true);
    try {
      const cara = await reducirCara(fichero);
      const respuesta = await cliente.ejecutar('poner_foto_de_persona', {
        persona_id: personaId,
        tipo: cara.tipo,
        foto: cara.contenido,
      });
      if (!respuesta.ok) {
        setFallo(respuesta.error.quePasa);
        return;
      }
      await alDia();
    } catch {
      setFallo('No he podido leer esa foto. Prueba con otra.');
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar() {
    setFallo(null);
    const respuesta = await cliente.ejecutar('quitar_foto_de_persona', { persona_id: personaId });
    if (!respuesta.ok) {
      setFallo(respuesta.error.quePasa);
      return;
    }
    await alDia();
  }

  if (!puedeCambiarla) return <Avatar nombre={nombre} tamano={tamano} foto={foto} />;

  return (
    <div className="flex flex-col items-start gap-e1">
      <div className="relative">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          aria-label={foto === null ? `Poner la foto de ${nombre}` : `Cambiar la foto de ${nombre}`}
          className={clases(
            'block rounded-[30%] transition-[opacity,transform] duration-[--rapido] hover:opacity-90 active:scale-95',
            subiendo && 'animate-pulse',
          )}
        >
          <Avatar nombre={nombre} tamano={tamano} foto={foto} />
          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-redondo border-2 border-superficie bg-texto text-superficie shadow-s2"
          >
            <IconoCamara size={14} />
          </span>
        </button>
        {foto !== null && (
          <button
            type="button"
            onClick={() => {
              void quitar();
            }}
            aria-label={`Quitar la foto de ${nombre}`}
            title="Quitar la foto"
            className="absolute -left-1 -top-1 grid size-6 place-items-center rounded-redondo border-2 border-superficie bg-superficie text-texto-suave shadow-s2 hover:text-mal"
          >
            <IconoQuitar size={12} />
          </button>
        )}
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(evento) => {
            const fichero = evento.currentTarget.files?.[0];
            evento.currentTarget.value = '';
            if (fichero !== undefined) void subir(fichero);
          }}
        />
      </div>
      {fallo !== null && <p className="max-w-[16rem] text-etiqueta text-mal">{fallo}</p>}
    </div>
  );
}
