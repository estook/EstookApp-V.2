import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Interruptor,
  Lista,
  Tarjeta,
} from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MisProveedores, ProveedorEnLista } from './contrato.ts';

/**
 * Inventario · Proveedores (M6, lo mínimo).
 *
 * **Esto no es la app de compras.** La ficha completa —CIF, teléfono, días de
 * reparto, pedido mínimo, forma de pago, contratos marco— y el ciclo de un
 * pedido son M7, y esta pantalla se queda donde está para que nadie tenga que
 * aprenderse dos sitios.
 *
 * Lo que hay aquí es lo mínimo que M6 necesita para poder cumplir lo suyo:
 * **saber de quién viene cada precio**. Sin eso no hay histórico por proveedor
 * ni comparativa, que es donde aparece el dinero fácil.
 */
export function Proveedores() {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();

  /**
   * Ver también los desactivados.
   *
   * ── El agujero que esto tapa ───────────────────────────────────────────────
   *
   * La ficha de proveedor lleva un interruptor para desactivarlo, y la lista
   * pinta una etiqueta gris «desactivado» al lado del nombre. Esa etiqueta **no
   * se veía nunca**, porque la consulta no los traía: se desactivaba uno y
   * desaparecía para siempre, sin forma de volver a activarlo.
   *
   * `mis_proveedores` acepta `incluir_desactivados` desde el primer día de M6 y
   * está probada. Lo que no había era una pantalla que lo pidiera.
   */
  const [verDesactivados, setVerDesactivados] = useState(false);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<ProveedorEnLista | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const puedeTocar = puedeEditar(permisos, 'app.inventario');

  const consulta = useQuery({
    queryKey: ['mis_proveedores', verDesactivados],
    queryFn: async (): Promise<MisProveedores> => {
      const respuesta = await cliente.consultar<MisProveedores>('mis_proveedores', {
        ...(verDesactivados ? { incluir_desactivados: 'true' } : {}),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['mis_proveedores'] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
  }

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus proveedores" />
      </div>
    );
  }

  const proveedores = consulta.data?.proveedores ?? [];

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}

      <Tarjeta
        titulo={proveedores.length === 1 ? '1 proveedor' : `${proveedores.length} proveedores`}
        origen="A quién le compras el género"
        accion={
          puedeTocar ? (
            <Boton
              tono="secundario"
              icono={<IconoAnadir size={16} />}
              onClick={() => {
                setCreando(true);
              }}
            >
              Añadir
            </Boton>
          ) : undefined
        }
      >
        <Lista
          titulo="Tus proveedores"
          elementos={proveedores.map((proveedor) => ({
            clave: proveedor.id,
            titulo: (
              <span className="flex flex-wrap items-center gap-e2">
                <span>{proveedor.nombre}</span>
                {!proveedor.activo && <Etiqueta>desactivado</Etiqueta>}
              </span>
            ),
            detalle:
              proveedor.cuantosProductos === 0
                ? 'Todavía no le compras nada'
                : `${proveedor.cuantosProductos} ${proveedor.cuantosProductos === 1 ? 'producto' : 'productos'}`,
            ...(puedeTocar
              ? {
                  alPulsar: () => {
                    setEditando(proveedor);
                  },
                }
              : {}),
          }))}
          cuandoNoHay={
            <EstadoVacio
              titulo="Todavía no tienes proveedores"
              frase="Con al menos uno, cada precio sabe de quién viene, y se puede ver cuánto te ha subido el aceite y quién te lo deja mejor."
              accion={
                puedeTocar ? (
                  <Boton
                    tono="principal"
                    icono={<IconoAnadir size={18} />}
                    onClick={() => {
                      setCreando(true);
                    }}
                  >
                    Crear mi primer proveedor
                  </Boton>
                ) : undefined
              }
              {...(puedeTocar
                ? {}
                : { sinAccionPorque: 'Tu acceso permite mirar, no dar de alta proveedores.' })}
            />
          }
        />
      </Tarjeta>

      {/* «Lo que se quita no se pierde» (Manifiesto 28). */}
      <Interruptor
        etiqueta="Ver también los desactivados"
        ayuda="Los que ya no te sirven. Sus precios históricos siguen enteros."
        puesto={verDesactivados}
        alCambiar={setVerDesactivados}
      />

      <Aviso tono="info" titulo="Esto es la ficha corta">
        Los días de reparto, el pedido mínimo, los contratos marco y los pedidos llegan con el
        módulo de compras. Lo que hay aquí es lo que hace falta para que cada precio sepa de quién
        viene.
      </Aviso>

      <FichaDeProveedor
        proveedor={editando}
        creando={creando}
        alCerrar={() => {
          setCreando(false);
          setEditando(null);
        }}
        alHecho={() => {
          setCreando(false);
          setEditando(null);
          void refrescar();
        }}
        alFallar={setError}
      />
    </div>
  );
}

function FichaDeProveedor({
  proveedor,
  creando,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly proveedor: ProveedorEnLista | null;
  readonly creando: boolean;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [nombre, setNombre] = useState('');
  const [notas, setNotas] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [preparado, setPreparado] = useState<string | null>(null);

  const abierta = creando || proveedor !== null;
  if (!abierta) return null;

  // Los campos se rellenan una vez al abrir, y no en cada pintada: si se
  // asignaran directo, escribir sería imposible porque se pisaría cada tecla.
  const clave = proveedor?.id ?? 'nuevo';
  if (preparado !== clave) {
    setPreparado(clave);
    setNombre(proveedor?.nombre ?? '');
    setNotas(proveedor?.notas ?? '');
    setActivo(proveedor?.activo ?? true);
  }

  async function guardar() {
    setGuardando(true);

    const respuesta =
      proveedor === null
        ? await cliente.ejecutar('crear_proveedor', {
            nombre: nombre.trim(),
            notas: notas.trim() === '' ? null : notas.trim(),
          })
        : await cliente.ejecutar('cambiar_proveedor', {
            proveedor_id: proveedor.id,
            nombre: nombre.trim(),
            notas: notas.trim() === '' ? null : notas.trim(),
            activo,
          });

    setGuardando(false);
    setPreparado(null);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={() => {
        setPreparado(null);
        alCerrar();
      }}
      titulo={proveedor === null ? 'Un proveedor nuevo' : proveedor.nombre}
      pie={
        <Botones>
          <Boton
            tono="texto"
            onClick={() => {
              setPreparado(null);
              alCerrar();
            }}
          >
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={nombre.trim() === '' || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <Campo
          etiqueta="Cómo se llama"
          obligatorio
          autoFocus
          value={nombre}
          onChange={(e) => {
            setNombre(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Notas"
          ayuda="Lo que quieras recordar: a quién preguntar, cómo se pide, qué días trae."
          value={notas}
          onChange={(e) => {
            setNotas(e.currentTarget.value);
          }}
        />
        {proveedor !== null && (
          <Interruptor
            etiqueta="Sigue activo"
            ayuda="Desactivarlo lo quita de los desplegables. No se borra: los precios que le pusiste siguen en el histórico."
            puesto={activo}
            alCambiar={setActivo}
          />
        )}
      </div>
    </Hoja>
  );
}
