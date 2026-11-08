import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { puedeEditar } from '@estook/permisos';
import { Boton, Campo, ErrorEnCristiano, Segmentado, Selector } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * «Vincular un aparato», desde Estook (la pausa del 8-nov, 0142).
 *
 * Quien entra con Google no tiene contraseña, y la caja para Windows no deja entrar con Google
 * (Google no lo permite dentro de un programa). Así que el código de siempre —6 cifras, 10
 * minutos, un uso— se saca aquí, en el móvil, y se escribe en Estook TPV › «Tengo un código».
 * Lo que será el aparato se elige antes, como en el TPV (Anexo 11.3).
 */
type Funcion = 'caja' | 'comandero' | 'cocina' | 'barra';

const NOMBRE_DE_FABRICA: Readonly<Record<Funcion, string>> = {
  caja: 'Caja 1',
  comandero: 'Comandero',
  cocina: 'Cocina',
  barra: 'Barra',
};

const QUE_ES: Readonly<Record<Funcion, string>> = {
  caja: 'El ordenador o la tablet donde se cobra, con su cajón.',
  comandero: 'Un móvil o una tablet para tomar nota en la sala.',
  cocina: 'La pantalla de la cocina: le llegan los platos.',
  barra: 'La pantalla de la barra: le llegan las bebidas.',
};

interface DondeSePuedeVincular {
  readonly locales: readonly {
    readonly id: string;
    readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
  }[];
}

export function VincularUnAparato() {
  const { yo, permisos, cliente } = usarSesion();
  const [abierto, setAbierto] = useState(false);
  const [funcion, setFuncion] = useState<Funcion>('caja');
  const [nombre, setNombre] = useState(NOMBRE_DE_FABRICA.caja);
  const [cajon, setCajon] = useState('');
  const [sacando, setSacando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [codigo, setCodigo] = useState<{ codigo: string; caducaEn: string } | null>(null);
  const puede = puedeEditar(permisos, 'accion.vincular_aparatos');
  const donde = usarLectura<DondeSePuedeVincular>('donde_puedo_vincular', {}, puede && abierto);

  if (!puede) return null;
  const cajones = donde.data?.locales.find((l) => l.id === yo?.local?.id)?.cajones ?? [];

  async function sacar() {
    setSacando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ codigo: string; caducaEn: string }>(
      'sacar_codigo_desde_estook',
      {
        funcion,
        nombre: nombre.trim(),
        ...(funcion !== 'caja'
          ? {}
          : cajon !== ''
            ? { cajon_id: cajon }
            : {
                cajon_nuevo:
                  cajones.length === 0 ? 'Cajón 1' : `Cajón ${String(cajones.length + 1)}`,
              }),
      },
    );
    setSacando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setCodigo(respuesta.datos);
  }

  if (!abierto) {
    return (
      <div>
        <Boton
          tono="secundario"
          onClick={() => {
            setAbierto(true);
          }}
        >
          Vincular un aparato
        </Boton>
      </div>
    );
  }

  if (codigo !== null) {
    const hora = new Date(codigo.caducaEn).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <div className="flex flex-col items-center gap-e3 rounded-grande bg-fondo p-e4 text-center">
        <p className="text-secundario text-texto-suave">
          Escríbelo en Estook TPV › «Tengo un código»
        </p>
        <p
          className="text-cifra font-bold tracking-[0.2em] tabular-nums"
          aria-label={`El código: ${codigo.codigo.split('').join(' ')}`}
        >
          {codigo.codigo}
        </p>
        <p className="text-secundario text-texto-suave">
          {nombre} · caduca a las {hora} · sirve una vez
        </p>
        <Boton
          tono="texto"
          onClick={() => {
            setCodigo(null);
            setAbierto(false);
          }}
        >
          Hecho
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e3 rounded-grande border border-borde p-e4">
      <p className="text-cuerpo font-semibold">¿Qué va a ser?</p>
      <Segmentado
        etiqueta="Qué va a ser el aparato"
        ancho
        opciones={(['caja', 'comandero', 'cocina', 'barra'] as const).map((f) => ({
          valor: f,
          texto:
            f === 'caja'
              ? 'Caja'
              : f === 'comandero'
                ? 'Comandero'
                : f === 'cocina'
                  ? 'Cocina'
                  : 'Barra',
        }))}
        valor={funcion}
        alElegir={(f) => {
          setFuncion(f);
          setNombre(NOMBRE_DE_FABRICA[f]);
        }}
      />
      <p className="text-secundario text-texto-suave">{QUE_ES[funcion]}</p>
      <Campo
        etiqueta="Su nombre"
        value={nombre}
        onChange={(e) => {
          setNombre(e.currentTarget.value);
        }}
      />
      {funcion === 'caja' && cajones.length > 0 && (
        <Selector
          etiqueta="Su cajón"
          value={cajon}
          onChange={(e) => {
            setCajon(e.currentTarget.value);
          }}
          opciones={cajones.map((c) => ({ valor: c.id, texto: c.nombre }))}
          sinElegir="Uno nuevo"
          ayuda="Dos cajas pueden compartir cajón: comparten su caja abierta."
        />
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
      <div className="flex flex-wrap gap-e2">
        <Boton
          tono="principal"
          cargando={sacando}
          textoCargando="Sacando el código"
          disabled={nombre.trim() === ''}
          onClick={() => {
            void sacar();
          }}
        >
          Sacar el código
        </Boton>
        <Boton
          tono="texto"
          onClick={() => {
            setAbierto(false);
          }}
        >
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
