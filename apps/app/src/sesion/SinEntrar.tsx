import { useEffect, useRef, useState } from 'react';
import { Aviso, Cargando, ErrorEnCristiano } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { elAparato } from '../datos/cliente.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { olvidarLosAplazamientos } from '../pantallas/recordatorios.ts';
import { CrearCuenta } from './CrearCuenta.tsx';
import { Entrar } from './Entrar.tsx';
import type { ComoSeEntra } from './Formas.tsx';
import { laVueltaDeGoogle, type VueltaDeGoogle } from './google.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * Lo que ve quien todavía no ha entrado (0042): entrar, o crear cuenta.
 *
 * ── Por qué la dirección decide cuál ────────────────────────────────────────
 *
 * La web pública lleva a `estook.com/app/#/crear-cuenta` con su botón de «Crear
 * cuenta», y a `estook.com/app/` con el de «Iniciar sesión». Así cada botón abre lo
 * que dice, y quien comparte el enlace de crear cuenta comparte eso. Pasar de una a
 * otra cambia la dirección, y el botón de atrás del navegador vuelve.
 *
 * ── Y la vuelta de Google ────────────────────────────────────────────────────
 *
 * Google vuelve a `estook.com/app/?code=…`. Se atiende aquí, **antes** de pintar
 * nada: se comprueba, se manda a la API y se entra. Mientras, se dice que se está
 * entrando, para que nadie pulse otra cosa.
 */
const RUTA_DE_CREAR = '#/crear-cuenta';

function quiereCrear(): boolean {
  return window.location.hash.startsWith(RUTA_DE_CREAR);
}

export function SinEntrar() {
  const { cliente, entrar } = usarSesion();
  const [crear, setCrear] = useState(quiereCrear);
  const como = usarLectura<ComoSeEntra>('como_se_entra');

  // La vuelta se lee **una vez**: el código es de un solo uso, y React monta dos
  // veces en desarrollo.
  const vuelta = useRef<VueltaDeGoogle | null | undefined>(undefined);
  if (vuelta.current === undefined) vuelta.current = laVueltaDeGoogle();

  const [volviendo, setVolviendo] = useState(
    vuelta.current !== null && !('fallo' in vuelta.current),
  );
  const [falloDeGoogle, setFalloDeGoogle] = useState<ErrorDeLaApi | string | null>(
    vuelta.current !== null && 'fallo' in vuelta.current ? vuelta.current.fallo : null,
  );

  useEffect(() => {
    const alCambiar = () => {
      setCrear(quiereCrear());
    };
    window.addEventListener('hashchange', alCambiar);
    return () => {
      window.removeEventListener('hashchange', alCambiar);
    };
  }, []);

  useEffect(() => {
    const datos = vuelta.current;
    if (datos === null || datos === undefined || 'fallo' in datos) return;
    // Se gasta aquí: si el efecto volviera a correr, no se canjearía dos veces.
    vuelta.current = null;

    void (async () => {
      const aparato = elAparato();
      const respuesta = await cliente.ejecutar<{ token: string }>('entrar_con_google', {
        codigo: datos.codigo,
        verificador: datos.verificador,
        redireccion: datos.redireccion,
        intencion: datos.intencion,
        ...(datos.negocio === undefined ? {} : { negocio: datos.negocio }),
        ...(datos.aceptaCondiciones === undefined ? {} : { aceptaCondiciones: true }),
        ...(aparato === null ? {} : { aparato }),
      });

      if (!respuesta.ok) {
        setFalloDeGoogle(respuesta.error);
        // «No hay cuenta con ese correo» lleva directo a crearla.
        if (respuesta.error.codigo === 'sin_cuenta') irA(true);
        else irA(datos.intencion === 'crear');
        setVolviendo(false);
        return;
      }

      olvidarLosAplazamientos();
      await entrar(respuesta.datos.token);
    })();
  }, [cliente, entrar]);

  function irA(crearCuenta: boolean) {
    window.location.hash = crearCuenta ? RUTA_DE_CREAR : '';
    setCrear(crearCuenta);
  }

  if (volviendo) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="tu cuenta de Google" />
      </main>
    );
  }

  const aviso =
    falloDeGoogle === null ? null : (
      <div className="mb-e4">
        {typeof falloDeGoogle === 'string' ? (
          <Aviso tono="atencion" titulo={falloDeGoogle} />
        ) : (
          <ErrorEnCristiano
            error={falloDeGoogle}
            alActuar={(accion) => {
              if (accion === 'crear_cuenta') irA(true);
            }}
          />
        )}
      </div>
    );

  return crear ? (
    <CrearCuenta
      como={como.data}
      avisoDeGoogle={aviso}
      alEntrar={() => {
        setFalloDeGoogle(null);
        irA(false);
      }}
    />
  ) : (
    <Entrar
      como={como.data}
      avisoDeGoogle={aviso}
      alCrearCuenta={() => {
        setFalloDeGoogle(null);
        irA(true);
      }}
    />
  );
}
