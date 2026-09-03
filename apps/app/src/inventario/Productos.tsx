import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NOMBRE_DEL_ESTADO } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { IconoAnadir, IconoBuscar } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { NuevoProducto } from './NuevoProducto.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  conUnidadDeUso,
  cuandoSeAgota,
  type MisProductos,
  type ProductoEnLista,
} from './contrato.ts';

/**
 * Inventario · Productos (M6).
 *
 * La lista de todo el género, con lo que hay en cámara y lo que cuesta. Es la
 * pantalla desde la que se da de alta y desde la que se abre cada ficha.
 *
 * ── Lo que se enseña de cada uno, y por qué ese orden ────────────────────────
 *
 * «El stock: **la cifra manda, el historial explica**. Siempre visible y siempre
 *  editable a mano» (Manifiesto 12). Por eso la cantidad va la primera después
 *  del nombre, y no el precio: quien abre esta pantalla en mitad de un servicio
 *  quiere saber si queda, no lo que costó.
 *
 * ── Y los ejemplos, en gris ──────────────────────────────────────────────────
 *
 * «Todo lleva una etiqueta gris **ejemplo** bien visible» (Manifiesto 8). Salen
 * en la lista para poder mirarlos y aprender de ellos; lo que no hacen es contar
 * en «Hoy», ni en el valor de la cámara, ni en ningún aviso. Eso lo decide el
 * servidor, no esta pantalla.
 */
export function Productos({ alAbrirProducto }: { readonly alAbrirProducto: (id: string) => void }) {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();

  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [creando, setCreando] = useState(false);
  const [ofrecerQuitarEjemplos, setOfrecerQuitarEjemplos] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [poniendo, setPoniendo] = useState(false);

  const puedeTocar = puedeEditar(permisos, 'app.inventario');

  const consulta = useQuery({
    queryKey: ['mis_productos', texto, categoriaId],
    queryFn: async (): Promise<MisProductos> => {
      const respuesta = await cliente.consultar<MisProductos>('mis_productos', {
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
        ...(categoriaId === '' ? {} : { categoria_id: categoriaId }),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['inventario_hoy'] });
    await cache.invalidateQueries({ queryKey: ['el_alta'] });
  }

  async function quitarLosEjemplos() {
    setQuitando(true);
    await cliente.ejecutar('quitar_los_ejemplos', {});
    setQuitando(false);
    setOfrecerQuitarEjemplos(false);
    await refrescar();
  }

  async function ponerLosEjemplos() {
    setPoniendo(true);
    await cliente.ejecutar('poner_los_ejemplos', {});
    setPoniendo(false);
    await refrescar();
  }

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus productos" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus productos">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;

  const columnas: Columna<ProductoEnLista>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      principal: true,
      celda: (p) => (
        <span className="flex flex-wrap items-center gap-e2">
          <span className={p.esEjemplo ? 'text-texto-suave' : ''}>{p.nombre}</span>
          {p.esEjemplo && <Etiqueta>ejemplo</Etiqueta>}
          {p.sinVerificar && <Etiqueta tono="atencion">sin verificar</Etiqueta>}
        </span>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'En cámara',
      numerica: true,
      celda: (p) => (
        <span className="flex items-center justify-end gap-e2">
          <span>{conUnidadDeUso(p.cantidad, p.unidadDeUso)}</span>
          <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>{NOMBRE_DEL_ESTADO[p.estado]}</Etiqueta>
        </span>
      ),
    },
    {
      clave: 'cobertura',
      titulo: 'Dura',
      celda: (p) => {
        const agota = cuandoSeAgota(p.seAgotaEn, p.diasDeCobertura);
        if (agota === null) {
          return <span className="text-texto-suave">{p.consumo.porque ?? 'Sin datos'}</span>;
        }
        return (
          <span>
            Se agota {agota}
            <span className="block text-secundario text-texto-suave">
              {p.consumo.porDia === null
                ? ''
                : `${conUnidadDeUso(p.consumo.porDia, p.unidadDeUso)} al día · ${p.consumo.diasMirados} días mirados`}
            </span>
          </span>
        );
      },
    },
    // La columna de dinero **solo existe si el servidor ha enviado dinero**. No
    // se esconde: no está. Un cocinero no recibe ni un campo de coste.
    ...(datos.puedeVerPrecios
      ? [
          {
            clave: 'coste',
            titulo: 'Coste por unidad',
            numerica: true,
            celda: (p: ProductoEnLista) => (
              <span>
                {p.costePorUnidad ?? '—'}
                <span className="block text-secundario text-texto-suave">
                  {p.precioCentimos === null || p.precioCentimos === undefined
                    ? 'Sin precio'
                    : `${comoDinero(p.precioCentimos)} ${p.formato === null ? '' : `· ${p.formato}`}`}
                </span>
              </span>
            ),
          } satisfies Columna<ProductoEnLista>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      {/*
        «Al crear el primer producto de verdad, Estook lo pregunta» (Manifiesto 8).
        No se borra nada solo: se ofrece, y decide una persona.
      */}
      {ofrecerQuitarEjemplos && (
        <Aviso
          tono="info"
          titulo="Ya tienes género de verdad"
          accion={
            <Boton
              tono="secundario"
              cargando={quitando}
              textoCargando="Borrando"
              onClick={() => {
                void quitarLosEjemplos();
              }}
            >
              Quitar los ejemplos
            </Boton>
          }
          alCerrar={() => {
            setOfrecerQuitarEjemplos(false);
          }}
        >
          Todavía quedan {datos.ejemplos} productos de ejemplo, marcados en gris. No cuentan para
          nada, pero puedes quitarlos ahora si ya no los necesitas.
        </Aviso>
      )}

      <div className="flex flex-wrap items-end gap-e3">
        <div className="min-w-0 flex-1">
          <Campo
            etiqueta="Buscar en tu género"
            ayuda="Vale con erratas y sin acentos. También sirve el código de barras."
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>

        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Categoría"
            opciones={datos.categorias.map((c) => ({
              valor: c.id,
              texto: `${c.nombre} (${c.cuantos})`,
            }))}
            sinElegir="Todas"
            cuandoNoHay="Este local todavía no tiene categorías"
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.currentTarget.value);
            }}
          />
        </div>

        {puedeTocar && (
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setCreando(true);
            }}
          >
            Añadir producto
          </Boton>
        )}
      </div>

      <Tarjeta
        titulo={datos.cuantosHay === 1 ? '1 producto' : `${datos.cuantosHay} productos`}
        origen={
          datos.puedeVerPrecios
            ? `La cámara vale ${comoDinero(datos.valorTotalCentimos)} a precio medio ponderado, sin contar los ejemplos`
            : 'Lo que hay en cámara, según el libro de movimientos'
        }
      >
        <Tabla
          titulo="Tu género"
          columnas={columnas}
          filas={datos.productos}
          claveDe={(p) => p.id}
          alPulsar={(p) => {
            alAbrirProducto(p.id);
          }}
          cuandoNoHay={
            texto.trim() !== '' || categoriaId !== '' ? (
              <EstadoVacio
                compacto
                titulo="Nada con eso"
                frase="Prueba con menos letras, o quita el filtro de categoría."
                sinAccionPorque="El buscador aguanta erratas, pero no adivina."
              />
            ) : (
              <EstadoVacio
                titulo="Todavía no tienes género"
                frase="Se empieza por lo que más compras. Con el catálogo de referencia, cada producto son quince segundos: escribes «aceite» y viene con su formato, su factor y sus alérgenos puestos."
                accion={
                  puedeTocar ? (
                    <div className="flex flex-wrap gap-e2">
                      <Boton
                        tono="principal"
                        icono={<IconoAnadir size={18} />}
                        onClick={() => {
                          setCreando(true);
                        }}
                      >
                        Añadir mi primer producto
                      </Boton>
                      <Boton
                        tono="secundario"
                        cargando={poniendo}
                        textoCargando="Poniendo"
                        onClick={() => {
                          void ponerLosEjemplos();
                        }}
                      >
                        Ponme unos ejemplos para verlo
                      </Boton>
                    </div>
                  ) : undefined
                }
                {...(puedeTocar
                  ? {}
                  : { sinAccionPorque: 'Tu acceso permite mirar el género, no darlo de alta.' })}
              />
            )
          }
        />

        {datos.hayMas && (
          <p className="mt-e3 text-secundario text-texto-suave">
            Se enseñan los cincuenta primeros. Busca por nombre para encontrar el que quieras.
          </p>
        )}
      </Tarjeta>

      <NuevoProducto
        abierta={creando}
        alCerrar={() => {
          setCreando(false);
        }}
        alCrear={(productoId, ejemplosQueQuedan) => {
          setCreando(false);
          if (ejemplosQueQuedan > 0) setOfrecerQuitarEjemplos(true);
          void refrescar();
          alAbrirProducto(productoId);
        }}
        categorias={datos.categorias}
        proveedores={datos.proveedores}
        puedeVerPrecios={datos.puedeVerPrecios}
      />
    </div>
  );
}
