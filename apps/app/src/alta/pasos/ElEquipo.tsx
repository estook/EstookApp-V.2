import { useRef, useState } from 'react';
import { Aviso, Boton, Selector, Tabla, clases } from '@estook/ui';
import type { PropsDeUnPaso } from '../contrato.ts';

/**
 * Paso 7 · «Invita a tu equipo» (M5).
 *
 * Dos caminos, y los dos importan:
 *
 *   · **De uno en uno**, con el PIN en pantalla para darlo en mano. Es el de M4,
 *     y sigue siendo el normal: el alta se hace con la persona delante.
 *   · **Desde un fichero**, cuando la plantilla ya está en un Excel. Un bar de
 *     veinte personas no las teclea una a una el primer día.
 *
 * ── La pantalla de repaso no es un lujo ──────────────────────────────────────
 *
 * «Se sube un CSV con columnas raras → **se propone el mapeo y se pide
 *  confirmar** → pantalla de emparejar columnas con vista previa de 5 filas»
 * (Auditoría, parte 5).
 *
 * El mapeo lo propone el código, no un modelo: emparejar «Correo electrónico»
 * con `correo` es parecido de texto, y las reglas van en código y no gastan un
 * crédito (Evolución 1.0, capítulo 8). Cuando llegue M22, Fogón mejorará la
 * propuesta en los casos raros; el camino normal no le necesita.
 */

interface Propuesta {
  readonly importacionId: string;
  readonly columnas: readonly string[];
  readonly mapeo: readonly { campo: string; columna: string | null; confianza: number }[];
  readonly cuantasFilas: number;
  readonly muestra: readonly (readonly string[])[];
  readonly yaSeImporto: boolean;
  readonly loQuePasoAquellaVez: {
    entraron: number;
    yaEstaban: number;
    seSaltaron: number;
  } | null;
}

interface Resultado {
  readonly entraron: number;
  readonly yaEstaban: number;
  readonly seSaltaron: number;
  readonly filas: readonly {
    fila: number;
    correo: string;
    nombre: string;
    estado: 'entra' | 'ya_estaba' | 'se_salta';
    porque: string | null;
    pin: string | null;
  }[];
}

const COMO_SE_LLAMA: Readonly<Record<string, string>> = {
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  correo: 'Correo',
  rol: 'Puesto',
};

export function ElEquipo({ cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [mapeo, setMapeo] = useState<Record<string, string | null>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const elFichero = useRef<HTMLInputElement>(null);

  async function subir(fichero: File) {
    setTrabajando(true);
    setResultado(null);

    const contenido = await fichero.text();
    const respuesta = await cliente.ejecutar<Propuesta>('proponer_importacion', {
      destino: 'equipo',
      nombre_del_fichero: fichero.name,
      contenido,
    });

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setTrabajando(false);
      return;
    }

    setPropuesta(respuesta.datos);
    setMapeo(Object.fromEntries(respuesta.datos.mapeo.map((m) => [m.campo, m.columna])));
    setTrabajando(false);
  }

  async function confirmar() {
    if (propuesta === null) return;
    setTrabajando(true);

    const respuesta = await cliente.ejecutar<Resultado>('confirmar_importacion', {
      importacion_id: propuesta.importacionId,
      mapeo: Object.entries(mapeo).map(([campo, columna]) => ({ campo, columna })),
    });

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      setTrabajando(false);
      return;
    }

    setResultado(respuesta.datos);
    setPropuesta(null);
    setTrabajando(false);
  }

  // ── Lo que ha entrado, con sus PIN ─────────────────────────────────────────
  if (resultado !== null) {
    const conPin = resultado.filas.filter((f) => f.pin !== null);
    const saltadas = resultado.filas.filter((f) => f.estado === 'se_salta');

    return (
      <div className="flex flex-col gap-e4">
        <Aviso
          tono={resultado.entraron > 0 ? 'bien' : 'atencion'}
          titulo={
            resultado.entraron === 1
              ? 'Ha entrado una persona'
              : `Han entrado ${resultado.entraron} personas`
          }
        >
          {resultado.yaEstaban > 0 && `${resultado.yaEstaban} ya estaban. `}
          {resultado.seSaltaron > 0 && `${resultado.seSaltaron} se han quedado fuera.`}
        </Aviso>

        {conPin.length > 0 && (
          <div className="rounded-medio border border-borde bg-superficie p-e4">
            <h2 className="mb-e1 text-cuerpo font-semibold">Sus PIN, para dárselos en mano</h2>
            {/*
              «El PIN se enseña y no se manda por correo» (M4). Y solo se ve
              **ahora**: lo que se guarda es su huella, así que esta pantalla es
              la única oportunidad. Se dice, en vez de dejar que se cierre y
              descubrirlo después.
            */}
            <p className="mb-e3 text-secundario text-mal">
              Apúntalos ahora. No se pueden volver a consultar: si se pierden, se generan otros.
            </p>
            <ul className="flex flex-col gap-e1">
              {conPin.map((fila) => (
                <li key={fila.correo} className="flex items-baseline justify-between gap-e3">
                  <span className="truncate text-cuerpo">{fila.nombre}</span>
                  <span className="font-mono text-cifra tabular-nums">{fila.pin}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saltadas.length > 0 && (
          <div className="rounded-medio border border-borde bg-superficie p-e4">
            <h2 className="mb-e2 text-cuerpo font-semibold">Las que se han quedado fuera</h2>
            <ul className="flex flex-col gap-e1">
              {saltadas.map((fila) => (
                <li key={fila.fila} className="text-secundario">
                  <span className="text-texto">Fila {fila.fila}</span>{' '}
                  <span className="text-texto-suave">{fila.porque}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Boton
          tono="principal"
          ancho
          onClick={() => {
            void alGuardar();
          }}
        >
          Continuar
        </Boton>
      </div>
    );
  }

  // ── La pantalla de repaso ──────────────────────────────────────────────────
  if (propuesta !== null) {
    return (
      <div className="flex flex-col gap-e4">
        <p className="text-cuerpo">
          He leído {propuesta.cuantasFilas === 1 ? 'una fila' : `${propuesta.cuantasFilas} filas`}.
          Comprueba que cada columna va donde toca.
        </p>

        {propuesta.yaSeImporto && (
          <Aviso tono="atencion" titulo="Este fichero ya se importó">
            {propuesta.loQuePasoAquellaVez === null
              ? 'Si lo confirmas otra vez no va a cambiar nada: no se duplica nadie.'
              : `Aquella vez entraron ${propuesta.loQuePasoAquellaVez.entraron}` +
                (propuesta.loQuePasoAquellaVez.seSaltaron > 0
                  ? `, y ${propuesta.loQuePasoAquellaVez.seSaltaron} se quedaron fuera.`
                  : '.') +
                ' Si lo confirmas otra vez no va a cambiar nada: no se duplica nadie.'}
          </Aviso>
        )}

        <div className="flex flex-col gap-e3">
          {propuesta.mapeo.map((emparejamiento) => (
            <Selector
              key={emparejamiento.campo}
              etiqueta={COMO_SE_LLAMA[emparejamiento.campo] ?? emparejamiento.campo}
              value={mapeo[emparejamiento.campo] ?? ''}
              onChange={(evento) => {
                setMapeo((antes) => ({
                  ...antes,
                  [emparejamiento.campo]: evento.target.value === '' ? null : evento.target.value,
                }));
              }}
              opciones={propuesta.columnas.map((c) => ({ valor: c, texto: c }))}
              sinElegir="No está en el fichero"
              // Sin ayuda cuando la propuesta es segura: una nota debajo de cada
              // casilla convierte la pantalla de repaso en un muro de texto, y
              // entonces no se repasa nada.
              {...(emparejamiento.columna === null
                ? { ayuda: 'No he encontrado ninguna columna que encaje. Dímelo tú.' }
                : emparejamiento.confianza === 1
                  ? {}
                  : { ayuda: 'Esta no estoy seguro: échale un ojo.' })}
            />
          ))}
        </div>

        {/*
          La vista previa de cinco filas que pide la Auditoría (parte 5).
          Es lo que convierte «confía en que lo he leído bien» en «míralo».
        */}
        <div className="overflow-x-auto">
          <Tabla<Record<string, string>>
            titulo="Las cinco primeras, tal como vienen"
            claveDe={(fila) => fila['_n'] ?? ''}
            columnas={propuesta.columnas.map((columna, i) => ({
              clave: String(i),
              titulo: columna,
              celda: (fila) => fila[String(i)] ?? '',
              principal: i === 0,
            }))}
            filas={propuesta.muestra.map((fila, n) => ({
              _n: String(n),
              ...Object.fromEntries(fila.map((valor, i) => [String(i), valor])),
            }))}
            cuandoNoHay={
              <p className="text-secundario text-texto-suave">
                El fichero no traía ninguna fila con datos.
              </p>
            }
          />
        </div>

        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="principal"
            cargando={trabajando}
            textoCargando="Dando de alta"
            onClick={() => {
              void confirmar();
            }}
          >
            Dar de alta a {propuesta.cuantasFilas}
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              void cliente.ejecutar('descartar_importacion', {
                importacion_id: propuesta.importacionId,
              });
              setPropuesta(null);
            }}
          >
            Descartar
          </Boton>
        </div>
      </div>
    );
  }

  // ── El principio: los dos caminos ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-e4">
      <p className="text-cuerpo text-texto-suave">
        Cada persona entra con su PIN, y lo que hace queda con su nombre. Puedes hacerlo ahora o
        cuando llegue su primer turno.
      </p>

      <div
        className={clases(
          'flex flex-col gap-e3 rounded-medio border border-dashed border-borde-fuerte',
          'bg-superficie p-e4 text-center',
        )}
      >
        <p className="text-cuerpo font-medium">¿La tienes en un Excel?</p>
        <p className="text-secundario text-texto-suave">
          Súbelo y te digo qué he entendido antes de dar de alta a nadie.
        </p>

        <input
          ref={elFichero}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={(evento) => {
            const fichero = evento.target.files?.[0];
            if (fichero) void subir(fichero);
          }}
        />
        <div className="flex justify-center">
          <Boton
            tono="secundario"
            cargando={trabajando}
            textoCargando="Leyendo"
            onClick={() => elFichero.current?.click()}
          >
            Subir un fichero
          </Boton>
        </div>
        <p className="text-secundario text-texto-suave">
          CSV, que es lo que sale de «Guardar como» en cualquier Excel.
        </p>
      </div>

      <Boton
        tono="principal"
        ancho
        onClick={() => {
          void alGuardar();
        }}
      >
        Continuar
      </Boton>
    </div>
  );
}
