import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Botones, Campo, Cargando, ErrorEnCristiano, Hoja, clases } from '@estook/ui';
import { IconoChat } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarMisCanales } from '../ganchos/usarElChat.ts';
import { CLAVE_DE_MIS_CANALES, claveDeUnCanal } from './contrato.ts';

/**
 * «Al chat» (C2 · 0075): un pedido o un producto, mandado como tarjeta a una
 * conversación. Quien la abre la ve con **sus** permisos: a un cocinero le llega el
 * pedido sin los precios. Se elige dónde, se añade una línea si se quiere, y listo.
 */
export function AlChat({
  tarjeta,
}: {
  readonly tarjeta: { readonly tipo: 'pedido' | 'producto'; readonly id: string };
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Boton
        tono="secundario"
        icono={<IconoChat size={18} />}
        onClick={() => {
          setAbierta(true);
        }}
      >
        Al chat
      </Boton>
      {abierta && (
        <ElegirConversacion
          tarjeta={tarjeta}
          alCerrar={() => {
            setAbierta(false);
          }}
        />
      )}
    </>
  );
}

function ElegirConversacion({
  tarjeta,
  alCerrar,
}: {
  readonly tarjeta: { readonly tipo: 'pedido' | 'producto'; readonly id: string };
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const navegar = useNavigate();
  const canales = usarMisCanales();
  const [elegido, setElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [mandando, setMandando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [mandado, setMandado] = useState<{ canalId: string; nombre: string } | null>(null);

  const lista = canales.data?.canales ?? [];

  async function mandar() {
    if (elegido === null) return;
    setMandando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('escribir_en_el_chat', {
      canal_id: elegido,
      tarjeta,
      ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
    });
    setMandando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: claveDeUnCanal(elegido) });
    await cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES });
    setMandado({ canalId: elegido, nombre: lista.find((c) => c.id === elegido)?.nombre ?? '' });
  }

  if (mandado !== null) {
    return (
      <Hoja
        abierta
        alCerrar={alCerrar}
        titulo="Mandado"
        pie={
          <Botones>
            <Boton tono="texto" onClick={alCerrar}>
              Seguir aquí
            </Boton>
            <Boton
              tono="principal"
              onClick={() => {
                navegar(`/chat/${mandado.canalId}`);
              }}
            >
              Abrir el chat
            </Boton>
          </Botones>
        }
      >
        <p className="text-cuerpo">Está en «{mandado.nombre}».</p>
      </Hoja>
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={tarjeta.tipo === 'pedido' ? 'Mandar el pedido al chat' : 'Mandar el producto al chat'}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={elegido === null || mandando}
            cargando={mandando}
            textoCargando="Mandando"
            onClick={() => {
              void mandar();
            }}
          >
            Mandar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {canales.isPending ? (
          <Cargando que="las conversaciones" lineas={3} />
        ) : lista.length === 0 ? (
          <p className="text-secundario text-texto-suave">
            Todavía no hay chat en este local: ábrelo una vez desde arriba.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Dónde" className="flex flex-col">
            {lista.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={elegido === c.id}
                onClick={() => {
                  setElegido(c.id);
                }}
                className={clases(
                  'flex min-h-toque items-center rounded-medio px-e3 text-left text-cuerpo',
                  elegido === c.id ? 'bg-naranja-suave font-medium' : 'hover:bg-fondo',
                )}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}
        <Campo
          etiqueta="Una línea, si quieres"
          maxLength={400}
          value={texto}
          onChange={(e) => {
            setTexto(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
