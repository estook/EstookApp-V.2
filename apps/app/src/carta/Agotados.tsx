import { useState } from 'react';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Interruptor,
  Lista,
  NadaConEso,
  Tarjeta,
  usarDeshacer,
  type ElementoDeLista,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { sinAcentos } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { comoSigueAgotado, type LosAgotados } from './contrato.ts';

/**
 * Los agotados (M10 · 1, decisión 0102; Auditoría de Flujos 2.4).
 *
 * Se acaba el pulpo: **dos toques** —buscarlo y «Agotado»— y el equipo se entera por el
 * chat. Vuelve solo al empezar la jornada siguiente; con «Sin fecha», cuando alguien
 * diga «Ya hay». Lo usan la Carta (su vista Agotados) y el «+» de la cocina, que no
 * tiene la app Carta: por eso lee `los_agotados`, sin un precio.
 */

export function Agotados() {
  const { cliente, permisos } = usarSesion();
  // Marcar es de sala y cocina (Roles 1.12): quien ve la Carta sin ese permiso, no lo pide.
  const puede = puedeEditar(permisos, 'accion.marcar_agotado');
  const consulta = usarLectura<LosAgotados>('los_agotados', {}, puede);
  const refrescar = usarRefrescarLaCarta();
  const { sePuedeDeshacer } = usarDeshacer();
  const [buscado, setBuscado] = useState('');
  const [sinFecha, setSinFecha] = useState(false);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  if (!puede) {
    return (
      <Aviso tono="info" titulo="Los agotados los marcan sala y cocina">
        Lo agotado sale marcado en la carta.
      </Aviso>
    );
  }
  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="los platos" forma="lista" lineas={6} />
      </div>
    );
  }
  const datos = consulta.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer los platos">
        Prueba en un momento.
      </Aviso>
    );
  }

  async function quitar(id: string) {
    const respuesta = await cliente.ejecutar('quitar_agotado', { plato_id: id });
    if (!respuesta.ok) setError(respuesta.error);
    await refrescar();
  }

  async function agotar(id: string, nombre: string) {
    setTrabajando(id);
    setError(null);
    const respuesta = await cliente.ejecutar<{ recordatorio: string }>('marcar_agotado', {
      plato_id: id,
      hasta: sinFecha ? 'sin_fecha' : 'jornada',
    });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setBuscado('');
    await refrescar();
    sePuedeDeshacer({
      que: `${nombre}, agotado`,
      deshacer: () => quitar(id),
    });
  }

  const agotados = datos.platos.filter((p) => p.agotado !== null);
  const texto = sinAcentos(buscado.trim());
  const quedan = datos.platos
    .filter((p) => p.agotado === null)
    .filter((p) => texto === '' || sinAcentos(p.nombre).includes(texto));

  const filasAgotadas: ElementoDeLista[] = agotados.map((p) => ({
    clave: p.id,
    titulo: p.nombre,
    ...(p.agotado === null ? {} : { detalle: comoSigueAgotado(p.agotado) }),
    derecha: (
      <Boton
        tono="secundario"
        tamano="s"
        onClick={() => {
          void quitar(p.id);
        }}
      >
        Ya hay
      </Boton>
    ),
  }));

  const filasParaAgotar: ElementoDeLista[] = quedan.map((p) => ({
    clave: p.id,
    titulo: p.nombre,
    ...(p.seccion === null ? {} : { detalle: p.seccion }),
    derecha: (
      <Boton
        tono="secundario"
        tamano="s"
        cargando={trabajando === p.id}
        textoCargando="Marcando"
        aria-label={`Marcar agotado ${p.nombre}`}
        onClick={() => {
          void agotar(p.id, p.nombre);
        }}
      >
        Agotado
      </Boton>
    ),
  }));

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      <Tarjeta titulo="Agotados ahora" cuantos={agotados.length} acento="var(--color-mal)">
        <Lista
          titulo="Agotados ahora"
          elementos={filasAgotadas}
          cuandoNoHay={
            <p className="px-e3 py-e2 text-secundario text-texto-suave">Nada agotado ahora.</p>
          }
        />
        {/* Estook aún no está conectado al TPV ni a las plataformas: se recuerda aquí,
            a la vista mientras haya algo agotado (en la barra de deshacer no cabía). */}
        {agotados.length > 0 && (
          <p className="px-e3 pt-e2 text-secundario text-atencion">{datos.recordatorio}</p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Marcar uno">
        <div className="flex flex-col gap-e3 px-e3 pb-e3">
          <Campo
            etiqueta="Buscar un plato"
            value={buscado}
            onChange={(evento) => {
              setBuscado(evento.target.value);
            }}
          />
          <Interruptor
            etiqueta="Sin fecha"
            ayuda={
              sinFecha
                ? 'Sigue agotado hasta que alguien diga que ya hay.'
                : 'Vuelve solo al empezar la jornada de mañana.'
            }
            puesto={sinFecha}
            alCambiar={setSinFecha}
          />
        </div>
        <Lista
          titulo="Platos para marcar agotados"
          elementos={filasParaAgotar}
          cuandoNoHay={
            datos.platos.length === 0 ? (
              <p className="px-e3 py-e2 text-secundario text-texto-suave">
                La carta todavía no tiene platos.
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
      </Tarjeta>
    </div>
  );
}
