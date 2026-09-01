import { appsVisibles } from '@estook/permisos';
import { conSimbolo, centimos } from '@estook/dominio';
import {
  Boton,
  Cifra,
  EstadoVacio,
  Grafica,
  Tarjeta,
  appPorPermiso,
  usarDeshacer,
  type App,
} from '@estook/ui';
import { IconoAnadir, IconoVacio } from '@estook/iconos';
import { useNavigate } from 'react-router-dom';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El Panel (M3).
 *
 * «Lo que hay que atender hoy, de un vistazo.»
 *
 * En M3 es un esqueleto, y lo dice. **Todos los widgets estan en su version
 * "todavia no tengo datos"**, que es un criterio de terminado del modulo: no una
 * pantalla en blanco, sino cada hueco explicando que ira ahi y de donde saldra.
 *
 * «Las cuatro preguntas: ¿donde estoy? ¿que puedo hacer? ¿que necesita mi
 * atencion? ¿cual es el siguiente paso?» (Manifiesto). Un Panel vacio tiene que
 * responderlas igual, y por eso cada tarjeta dice de que va.
 *
 * «Nada de scroll infinito en el Panel»: lo que hay, se ve; y se acaba.
 */
export function Panel() {
  const navegar = useNavigate();
  const { permisos, perfil } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();

  const misApps = appsVisibles(permisos)
    .map((permiso) => appPorPermiso(permiso))
    .filter((app): app is App => app !== undefined);

  return (
    <div className="flex flex-col gap-e4">
      <header className="flex flex-wrap items-end justify-between gap-e3">
        <div>
          <p className="text-etiqueta uppercase tracking-wide text-texto-suave">{perfil.donde}</p>
          <h1 className="text-pantalla font-semibold">Hola, {perfil.nombre.split(' ')[0]}</h1>
        </div>
        <p className="text-secundario text-texto-suave">
          {misApps.length === 1 ? '1 app en tu acceso' : `${misApps.length} apps en tu acceso`}
        </p>
      </header>

      <div className="grid gap-e3 md:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo="Ventas de hoy" origen="Se llenara con el TPV · M13">
          <Cifra
            etiqueta="Facturado"
            valor={0}
            formato={(v) => conSimbolo(centimos(Math.trunc(v)))}
            origen="Todavia sin conectar"
          />
          <p className="mt-e2 text-secundario text-texto-suave">
            En cuanto se conecte el TPV, aqui va lo facturado del dia, comparado con el mismo dia de
            la semana pasada.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Lo que hay que atender">
          <EstadoVacio
            compacto
            titulo="Nada pendiente"
            frase="Aqui apareceran los recuentos sin cerrar, los APPCC fuera de rango y los pedidos sin recibir."
            sinAccionPorque="Los pendientes los traen Inventario (M6) y Servicio (M12)."
          />
        </Tarjeta>

        <Tarjeta titulo="Salud de los datos" origen="Se llenara con M6 y M8">
          <EstadoVacio
            compacto
            icono={<IconoVacio size={24} />}
            titulo="Todavia no hay nada que medir"
            frase="Cuantos platos tienen ficha, cuantos productos tienen precio y cuantas fichas estan al dia."
            sinAccionPorque="Hace falta que haya productos y fichas: eso es Inventario y Escandallos."
          />
        </Tarjeta>

        <Tarjeta titulo="Como va el mes" origen="Se llenara con Negocio · M17">
          <Grafica
            titulo="Margen por semana"
            datos={[]}
            eje="semana"
            series={[]}
            cuandoNoHay={
              <EstadoVacio
                compacto
                titulo="Sin datos que dibujar"
                frase="Con un mes de ventas y costes, aqui va el margen semana a semana."
                sinAccionPorque="Las graficas se cargan solas cuando hay algo que ensenar."
              />
            }
          />
        </Tarjeta>

        <Tarjeta titulo="Tus apps">
          <ul className="flex flex-col gap-e1">
            {misApps.map((app) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => {
                    const pestana = app.pestanas[0]?.id;
                    navegar(pestana === undefined ? `/${app.id}` : `/${app.id}/${pestana}`);
                  }}
                  className="flex w-full min-h-toque items-center gap-e3 rounded-medio px-e2 text-left hover:bg-fondo"
                >
                  <span style={{ color: app.acento }}>
                    <app.icono size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo">{app.nombre}</span>
                    <span className="block truncate text-secundario text-texto-suave">
                      {app.queHace}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>

        {/*
          Uno de los tres flujos con deshacer de M3. Es de mentira a proposito y
          lo dice: sirve para comprobar que la barra aparece, cuenta diez
          segundos y revierte, sin esperar a que haya un comando de verdad que
          tocar. Los otros dos —el tamano de letra y el perfil— estan en Ajustes.
        */}
        <Tarjeta titulo="Deshacer" origen="Prueba del deshacer universal">
          <p className="text-secundario text-texto-suave">
            «Deshacer siempre, diez segundos, en todo lo que no tenga consecuencia legal.» Esto lo
            comprueba sin tocar nada.
          </p>
          <div className="mt-e3">
            <Boton
              icono={<IconoAnadir size={18} />}
              onClick={() => {
                sePuedeDeshacer({
                  que: 'Nota apuntada en el Cuaderno',
                  deshacer: () => undefined,
                });
              }}
            >
              Apuntar una nota de prueba
            </Boton>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
