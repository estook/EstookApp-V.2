import { useMemo, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import { Boton, EstadoVacio, usarTamanoDeLetra } from '@estook/ui';
import { usarElTemaDelTpv } from './ganchos/usarElTema.ts';
import { LaPuerta } from './puerta/LaPuerta.tsx';
import { InstalaEstookTpv } from './puerta/InstalaEstookTpv.tsx';
import { LaVentaRapida } from './rapida/LaVentaRapida.tsx';
import { ElPlano } from './plano/ElPlano.tsx';
import { LaMesa } from './mesa/LaMesa.tsx';
import { Fichar } from './inicio/Fichar.tsx';
import { Agotados } from './inicio/Agotados.tsx';
import { AjustesDelTpv } from './ajustes/AjustesDelTpv.tsx';
import { TicketsYFacturasDelTpv } from './facturas/TicketsYFacturasDelTpv.tsx';
import { EditorDeLaSala } from './sala/EditorDeLaSala.tsx';
import { LaBarraDeArriba } from './inicio/LaBarraDeArriba.tsx';
import { esPantallaDeLaCaja, LaCaja } from './caja/LaCaja.tsx';
import { CobroPendienteDesdeLaPuerta } from './caja/CobrarElPendiente.tsx';
import { escucharLaDireccion, laDireccion } from './navegar.ts';
import { ContextoAlSegundo, usarEscucharAlSegundo } from './ganchos/usarLaSala.ts';
import { usarSesion } from './sesion/Sesion.tsx';
import { LosAvisos } from './avisos/LosAvisos.tsx';

/**
 * Estook TPV (T1 · La puerta, decisión 0107): **una aplicación aparte**, en
 * `estook.com/tpv/`, que solo funciona en un aparato vinculado al local y en la que cada
 * uno entra con su PIN. Dentro: **la sala, que es la entrada** (la entrada nueva, 26-oct), cada
 * mesa, fichar, los agotados y los Ajustes del TPV, detrás del engranaje. Una pantalla completa, sin la barra de Estook, **e instalable**
 * (0115).
 */

/**
 * **Se entra a la sala** (la entrada nueva; Richi, 26-oct): ya no hay inicio de baldosas, lo
 * primero es el plano, como en todos los TPV de restaurante. **Cada aparato, a lo suyo**
 * (0115): la caja tiene además fichar, los agotados y los Ajustes del TPV; **un comandero, solo
 * la sala**. Quien no toma nota no ve la sala: se le dice, y en la caja tiene arriba lo suyo.
 */
function Dentro() {
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const { yo, aparato, bloquear } = usarSesion();
  const enLaCaja = aparato.funcion === 'caja';
  // Una sola escucha para todo el aparato: entrar y salir de una mesa no vuelve a conectar.
  const conectado = usarEscucharAlSegundo();
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  const dibuja = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');
  const mesa = /^mesa\/([0-9a-f-]{36})$/.exec(direccion)?.[1];
  // La caja (0144): abrir, cerrar, el cajón y «Cómo va», solo en la caja.
  const deLaCaja = /^caja\/([a-z-]+)$/.exec(direccion)?.[1] ?? '';
  // El efectivo que dejó un camarero (0145): desde la pantalla del PIN, directo a cobrarlo.
  const cobroPendiente = /^cobro\/([0-9a-f-]{36})$/.exec(direccion)?.[1];

  // La operativa de facturar, en cualquier aparato de sala (0137): no solo en la caja.
  const factura =
    puedeEditar(yo.permisos, 'accion.factura_de_un_ticket') ||
    puedeEditar(yo.permisos, 'accion.factura_a_mano');

  let pantalla;
  if (direccion === 'facturas' && factura) pantalla = <TicketsYFacturasDelTpv />;
  else if (enLaCaja && esPantallaDeLaCaja(deLaCaja)) pantalla = <LaCaja pantalla={deLaCaja} />;
  else if (enLaCaja && cobroPendiente !== undefined) {
    pantalla = <CobroPendienteDesdeLaPuerta id={cobroPendiente} conectado={conectado} />;
  } else if (enLaCaja && direccion === 'fichar') pantalla = <Fichar />;
  else if (enLaCaja && direccion === 'agotados') pantalla = <Agotados />;
  // **Ajustes, en todos los aparatos** (0143): en el comandero, «Tu sesión» y el tema; lo demás,
  // solo en la caja, y eso lo decide la pantalla. Antes el engranaje del comandero no abría nada.
  else if (direccion === 'ajustes' || direccion.startsWith('ajustes/')) {
    pantalla = <AjustesDelTpv direccion={direccion} />;
  } else if (enLaCaja && direccion === 'sala/editar' && dibuja) {
    // T2 · La sala (0110): el plano se dibuja aquí, a ojo, en la caja (0115).
    pantalla = <EditorDeLaSala />;
  } else if (!tomaNota) {
    pantalla = (
      <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
        {enLaCaja && <LaBarraDeArriba />}
        <main className="flex flex-1 items-center justify-center p-e5">
          <div className="w-full max-w-[32rem]">
            <EstadoVacio
              esLaPagina
              titulo="Tu puesto no toma nota"
              frase={
                enLaCaja
                  ? `${yo.nombre}, la sala es de quien toma nota. Lo tuyo está arriba: fichar y los ajustes. Si tienes que tomar nota, quien lleva el local te lo cambia en Estook › Equipo.`
                  : `${yo.nombre}, este aparato es para pedir en la sala. Si tienes que tomar nota, quien lleva el local te lo cambia en Estook › Equipo.`
              }
              dibujo="candado"
              accion={
                <Boton tono="principal" onClick={bloquear}>
                  Salir
                </Boton>
              }
            />
          </div>
        </main>
      </div>
    );
  } else if (direccion === 'rapida') {
    // **La venta rápida** (0148), en la caja y en el comandero (la Ampliación, 0153, fallo 3): en el
    // comandero, el efectivo se deja para la caja, como al cobrar en la mesa (0145).
    pantalla = <LaVentaRapida />;
  } else if (mesa !== undefined) pantalla = <LaMesa key={mesa} cuentaId={mesa} />;
  // Lo demás, también `#/inicio` de antes, es la sala.
  else pantalla = <ElPlano />;

  return (
    <ContextoAlSegundo.Provider value={conectado}>
      {pantalla}
      {/* **Los avisos** (0148, entrega 2 · 2): arriba a la derecha y en la campana, en todo lo de la
          sala. Quien no toma nota no tiene sala que atender; y el editor de la sala, a lo suyo. */}
      {tomaNota && direccion !== 'sala/editar' && <LosAvisos />}
    </ContextoAlSegundo.Provider>
  );
}

export function Aplicacion() {
  // Oscuro de fábrica (0107, Anexo 11.12); claro o automático, si se elige en Ajustes (0143).
  usarElTemaDelTpv();
  // La letra «Automática», como en Estook (la Ampliación, 0153, arreglo 3.1): la pequeña en el
  // móvil, la normal en la caja y la tablet. Antes la de fábrica era «Normal» y el comandero del
  // móvil se veía grande. Quien eligió un tamaño en Estook lo conserva (se guarda en el aparato).
  usarTamanoDeLetra();
  const cache = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          // **Leer siempre, también sin red** (T5 · 2 · 1): sin internet, cada lectura sabe
          // qué hacer (lo último guardado en el aparato). Con lo de fábrica, TanStack las
          // dejaría en pausa y la mesa no abriría nunca.
          queries: { retry: 1, refetchOnWindowFocus: true, networkMode: 'always' },
        },
      }),
    [],
  );
  return (
    <QueryClientProvider client={cache}>
      {/* La primera vez, «Instala Estook TPV» (0115), antes de vincular. */}
      <InstalaEstookTpv />
      <LaPuerta>
        <Dentro />
      </LaPuerta>
    </QueryClientProvider>
  );
}
