import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UNIDADES_DE_USO } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Selector,
} from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import type {
  CatalogoDeReferencia,
  CategoriaDelLocal,
  ProveedorDelLocal,
  ReferenciaDelCatalogo,
} from './contrato.ts';

/**
 * Dar de alta un producto (M6) · los treinta segundos.
 *
 * «Se da de alta un producto en **30 segundos**» es el primer criterio de
 * terminado de M6. Y «crear un producto desde el catálogo de referencia lleva
 * **menos de quince segundos**» es el de M5 que quedó a medias, porque M5 dejó
 * el catálogo hecho y probado y **la pantalla que lo usa es esta**.
 *
 * ── Por qué se busca antes de escribir nada ──────────────────────────────────
 *
 * «Escribes "aceite de oliva" y salen las variantes con su unidad de compra, su
 *  factor, su rendimiento aproximado, su categoría y sus alérgenos ya puestos.
 *  Aceptas, pones tu precio y tu proveedor: **un producto bien definido en
 *  quince segundos en vez de en dos minutos**, y sin el error clásico de
 *  confundir la unidad de compra con la de uso» (Manifiesto 8).
 *
 * Por eso lo primero es el buscador y no un formulario en blanco. El formulario
 * está debajo, siempre, para lo que el catálogo no tenga: «nadie obliga, y lo
 * que no se usa no existe».
 *
 * ── Y la cuenta se enseña hecha ──────────────────────────────────────────────
 *
 * Cada resultado trae su `comoSale`: «Garrafa de 5 l = 5.000 ml para usar».
 * Viene compuesta del servidor a propósito —un cálculo, un único dueño— y es la
 * razón de que el catálogo exista: es lo que hace que alguien se dé cuenta de
 * que se ha equivocado **antes** de guardarlo.
 */
export function NuevoProducto({
  abierta,
  alCerrar,
  alCrear,
  categorias,
  proveedores,
  puedeVerPrecios,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly alCrear: (productoId: string, ejemplosQueQuedan: number) => void;
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly puedeVerPrecios: boolean;
}) {
  const { cliente } = usarSesion();

  const [texto, setTexto] = useState('');
  const [elegida, setElegida] = useState<ReferenciaDelCatalogo | null>(null);
  const [aMano, setAMano] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // Lo que se pone encima de la referencia, o del formulario a mano.
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState<Centimos | null>(null);
  const [proveedorId, setProveedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [formato, setFormato] = useState('');
  const [factor, setFactor] = useState('1');
  const [unidad, setUnidad] = useState('ud');
  const [rendimiento, setRendimiento] = useState('100');

  const catalogo = useQuery({
    queryKey: ['catalogo_de_referencia', texto],
    enabled: abierta && !aMano,
    queryFn: async (): Promise<CatalogoDeReferencia> => {
      const respuesta = await cliente.consultar<CatalogoDeReferencia>('catalogo_de_referencia', {
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
        limite: '12',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  function limpiar() {
    setTexto('');
    setElegida(null);
    setAMano(false);
    setNombre('');
    setPrecio(null);
    setProveedorId('');
    setCategoriaId('');
    setFormato('');
    setFactor('1');
    setUnidad('ud');
    setRendimiento('100');
    setError(null);
  }

  function cerrar() {
    limpiar();
    alCerrar();
  }

  function elegir(referencia: ReferenciaDelCatalogo) {
    setElegida(referencia);
    setNombre(referencia.nombre);
    // La categoría del local que se llama igual que la del catálogo. Si no está,
    // se deja sin elegir: el producto puede vivir sin categoría, y proponerle una
    // que no es sería peor que no proponer ninguna.
    const suya = categorias.find(
      (c) => sinAcentosSimple(c.nombre) === sinAcentosSimple(referencia.categoria),
    );
    setCategoriaId(suya?.id ?? '');
  }

  async function guardar() {
    setError(null);
    setGuardando(true);

    const cuerpo =
      elegida !== null
        ? {
            nombre: nombre.trim(),
            de_referencia: elegida.id,
            categoria_id: categoriaId === '' ? null : categoriaId,
            proveedor_id: proveedorId === '' ? null : proveedorId,
            precio_centimos: precio,
          }
        : {
            nombre: nombre.trim(),
            categoria_id: categoriaId === '' ? null : categoriaId,
            proveedor_id: proveedorId === '' ? null : proveedorId,
            precio_centimos: precio,
            formato: formato.trim() === '' ? null : formato.trim(),
            factor: Number(factor.replace(',', '.')) || 1,
            unidad_de_uso: unidad,
            rendimiento: Math.min(1, Math.max(0.0001, Number(rendimiento.replace(',', '.')) / 100)),
          };

    const respuesta = await cliente.ejecutar<{
      productoId: string;
      ejemplosQueQuedan: number;
    }>('crear_producto', cuerpo);

    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    const { productoId, ejemplosQueQuedan } = respuesta.datos;
    limpiar();
    alCrear(productoId, ejemplosQueQuedan);
  }

  const listoParaGuardar = nombre.trim() !== '' && !guardando;

  return (
    <Hoja
      abierta={abierta}
      alCerrar={cerrar}
      titulo="Un producto nuevo"
      pie={
        <Botones>
          <Boton tono="texto" onClick={cerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listoParaGuardar}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar el producto
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}

        {elegida === null && !aMano && (
          <>
            <Campo
              etiqueta="¿Qué producto es?"
              ayuda="Escribe cómo lo llamas tú. Si está en el catálogo, viene con su formato, su factor y sus alérgenos ya puestos."
              value={texto}
              delante={<IconoBuscar size={16} />}
              autoFocus
              onChange={(e) => {
                setTexto(e.currentTarget.value);
              }}
            />

            {catalogo.isPending && <Cargando que="el catálogo" />}

            {catalogo.data !== undefined && (
              <ul className="flex flex-col gap-e2">
                {catalogo.data.productos.map((referencia) => (
                  <li key={referencia.id}>
                    <button
                      type="button"
                      onClick={() => {
                        elegir(referencia);
                      }}
                      className="flex w-full flex-col gap-e1 rounded-medio border border-borde p-e3 text-left hover:bg-fondo"
                    >
                      <span className="flex flex-wrap items-center gap-e2">
                        <span className="text-cuerpo font-medium">{referencia.nombre}</span>
                        <Etiqueta>{referencia.categoria}</Etiqueta>
                      </span>
                      <span className="text-secundario text-texto-suave">
                        {referencia.comoSale}
                      </span>
                      {referencia.alergenos.length > 0 && (
                        <span className="text-secundario text-texto-suave">
                          Alérgenos: {referencia.alergenos.join(', ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {catalogo.data !== undefined && catalogo.data.productos.length === 0 && (
              <Aviso tono="info" titulo="Eso no está en el catálogo">
                No pasa nada: se crea a mano en un momento, y funciona exactamente igual.
              </Aviso>
            )}

            <div>
              <Boton
                tono="secundario"
                onClick={() => {
                  setAMano(true);
                  setNombre(texto.trim());
                }}
              >
                Crearlo a mano
              </Boton>
            </div>
          </>
        )}

        {(elegida !== null || aMano) && (
          <>
            {elegida !== null && (
              <Aviso tono="bien" titulo={elegida.nombre} esNoticia>
                {elegida.comoSale} Puedes cambiarlo después en su ficha si en tu cocina sale otra
                cosa.
              </Aviso>
            )}

            <Campo
              etiqueta="Cómo se llama"
              obligatorio
              value={nombre}
              autoFocus
              onChange={(e) => {
                setNombre(e.currentTarget.value);
              }}
            />

            {aMano && (
              <>
                <Campo
                  etiqueta="Cómo lo compras"
                  ayuda="Tal cual lo pone el albarán: «Caja de 5 kg», «Garrafa de 5 l»."
                  value={formato}
                  onChange={(e) => {
                    setFormato(e.currentTarget.value);
                  }}
                />
                <div className="grid gap-e3 sm:grid-cols-2">
                  <Campo
                    etiqueta="Cuánto trae"
                    tipo="numero"
                    ayuda="En la unidad con la que cocinas. Una caja de 5 kg son 5000 g."
                    value={factor}
                    onChange={(e) => {
                      setFactor(e.currentTarget.value);
                    }}
                  />
                  <Selector
                    etiqueta="Unidad con la que cocinas"
                    opciones={UNIDADES_DE_USO.map((u) => ({ valor: u, texto: u }))}
                    value={unidad}
                    onChange={(e) => {
                      setUnidad(e.currentTarget.value);
                    }}
                  />
                </div>
                <Campo
                  etiqueta="Qué porcentaje se aprovecha"
                  tipo="numero"
                  ayuda="Lo que queda después de limpiar o pelar. 100 si no se pierde nada."
                  value={rendimiento}
                  detras="%"
                  onChange={(e) => {
                    setRendimiento(e.currentTarget.value);
                  }}
                />
              </>
            )}

            <SelectorDeCategoria
              categorias={categorias}
              valor={categoriaId}
              alElegir={setCategoriaId}
              sinElegir="Sin categoría"
            />

            {/*
              El precio solo se pide a quien puede verlo. Un cocinero da de alta
              productos y no ve lo que cuestan: enseñarle la casilla sería
              pedirle un dato que el servidor le va a rechazar.
            */}
            {puedeVerPrecios && (
              <>
                <CampoMoneda
                  etiqueta="Lo que te cuesta"
                  ayuda={
                    elegida === null
                      ? 'El precio del formato entero, no el del kilo. Se puede dejar en blanco y ponerlo con el primer albarán.'
                      : `El precio de una ${elegida.formato.toLowerCase()}, entera. Se puede dejar en blanco.`
                  }
                  valor={precio}
                  alCambiar={setPrecio}
                />

                <Selector
                  etiqueta="A quién se lo compras"
                  opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
                  sinElegir="Todavía no lo sé"
                  cuandoNoHay="Todavía no tienes proveedores. Se crean en «Más»"
                  value={proveedorId}
                  onChange={(e) => {
                    setProveedorId(e.currentTarget.value);
                  }}
                />
              </>
            )}

            <div>
              <Boton
                tono="texto"
                onClick={() => {
                  setElegida(null);
                  setAMano(false);
                }}
              >
                Buscar otro
              </Boton>
            </div>
          </>
        )}
      </div>
    </Hoja>
  );
}

/**
 * Comparar dos nombres de categoría sin acentos ni mayúsculas.
 *
 * Es el mismo criterio que usa `estook.sin_acentos` en la base de datos, y la
 * comparación que hace el servidor al copiar del catálogo. Aquí solo sirve para
 * preseleccionar el desplegable: si acertara distinto que el servidor, lo peor
 * que pasa es que el desplegable salga sin elegir.
 */
function sinAcentosSimple(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
