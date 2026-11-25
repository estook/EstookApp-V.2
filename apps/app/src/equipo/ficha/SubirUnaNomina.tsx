import { useRef, useState } from 'react';
import { Aviso, Boton, Botones, CampoMoneda, ErrorEnCristiano, Hoja, Selector } from '@estook/ui';
import { IconoCamara, IconoSubir } from '@estook/iconos';
import { elMesPasado, type Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../../sesion/Sesion.tsx';
import { NoSeHaPodidoLeer, esPdf, paginasParaGuardar } from '../../carta/paginasDeLaCarta.ts';
import { esteMes, losUltimosMeses, mesConMayuscula } from './comoSeLee.ts';
import { aBase64, pdfDeImagenes } from './pdfDeImagenes.ts';

/**
 * Subir **una** nómina (la Ampliación 3 · 2, 0153): desde la ficha de la persona, o desde
 * Equipo › Nóminas a quien le falta la de un mes.
 *
 * El PDF que manda la gestoría, tal cual; o **fotos** de una nómina en papel, que el móvil junta
 * en un PDF. El bruto y el neto, si se quieren poner: salen en la ficha y en Nóminas. A la
 * persona le llega su aviso.
 */

const TOPE = 10 * 1024 * 1024;
const PAGINAS_EN_FOTO = 4;

function enBase64(fichero: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      const texto = typeof lector.result === 'string' ? lector.result : '';
      resolver(texto.slice(texto.indexOf(',') + 1));
    };
    lector.onerror = () => {
      rechazar(new NoSeHaPodidoLeer('No se ha podido leer el fichero.'));
    };
    lector.readAsDataURL(fichero);
  });
}

export function SubirUnaNomina({
  personaId,
  nombre,
  mesDeEntrada,
  alCerrar,
  alHecho,
}: {
  readonly personaId: string;
  readonly nombre: string;
  /** El mes que se propone: el que le falta, o el que acaba de terminar. */
  readonly mesDeEntrada?: string;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const meses = losUltimosMeses(esteMes(), 13);
  const [mes, setMes] = useState(mesDeEntrada ?? elMesPasado(`${esteMes()}-15`));
  const [ficheros, setFicheros] = useState<readonly File[]>([]);
  const [bruto, setBruto] = useState<Centimos | null>(null);
  const [neto, setNeto] = useState<Centimos | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const pdf = useRef<HTMLInputElement>(null);
  const fotos = useRef<HTMLInputElement>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    setProblema(null);
    try {
      const primero = ficheros[0];
      if (primero === undefined) return;
      let base64: string;
      if (ficheros.length === 1 && esPdf(primero)) {
        if (primero.size > TOPE) {
          setProblema('Ese PDF pesa más de 10 MB. Pide a la gestoría la nómina sola.');
          return;
        }
        base64 = await enBase64(primero);
      } else {
        // Fotos de una nómina en papel: un PDF con ellas, en orden.
        base64 = aBase64(pdfDeImagenes(await paginasParaGuardar(ficheros, PAGINAS_EN_FOTO)));
      }
      const respuesta = await cliente.ejecutar('guardar_una_nomina', {
        persona_id: personaId,
        mes,
        fichero: { mime: 'application/pdf', base64 },
        bruto_centimos: bruto,
        neto_centimos: neto,
      });
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      alHecho(`Nómina de ${mesConMayuscula(mes).toLowerCase()} guardada`);
    } catch (fallo) {
      setProblema(
        fallo instanceof NoSeHaPodidoLeer ? fallo.message : 'No se ha podido preparar la nómina.',
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Una nómina de ${nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={ficheros.length === 0 || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar la nómina
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {problema !== null && (
          <Aviso tono="atencion" titulo="No se ha podido guardar">
            {problema}
          </Aviso>
        )}
        <Selector
          etiqueta="De qué mes es"
          opciones={meses.map((m) => ({ valor: m, texto: mesConMayuscula(m) }))}
          value={mes}
          onChange={(e) => {
            setMes(e.currentTarget.value);
          }}
        />
        <div className="flex flex-col gap-e2">
          <div className="flex flex-wrap gap-e2">
            <Boton
              icono={<IconoSubir size={18} />}
              onClick={() => {
                pdf.current?.click();
              }}
            >
              El PDF
            </Boton>
            <Boton
              tono="texto"
              icono={<IconoCamara size={18} />}
              onClick={() => {
                fotos.current?.click();
              }}
            >
              Fotos, si es en papel
            </Boton>
          </div>
          <p className="text-secundario text-texto-suave">
            {ficheros.length === 0
              ? 'El PDF de su nómina, o una foto por página.'
              : ficheros.length === 1
                ? `Elegido: ${ficheros[0]?.name ?? ''}`
                : `${String(ficheros.length)} fotos elegidas`}
          </p>
          <input
            ref={pdf}
            type="file"
            accept="application/pdf"
            hidden
            aria-label="El PDF de la nómina"
            onChange={(e) => {
              setFicheros([...(e.currentTarget.files ?? [])].slice(0, 1));
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={fotos}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            aria-label="Fotos de la nómina"
            onChange={(e) => {
              setFicheros([...(e.currentTarget.files ?? [])].slice(0, PAGINAS_EN_FOTO));
              e.currentTarget.value = '';
            }}
          />
        </div>
        <div className="grid gap-e3 sm:grid-cols-2">
          <CampoMoneda
            etiqueta="Bruto"
            ayuda="Opcional. El total devengado."
            valor={bruto}
            alCambiar={setBruto}
          />
          <CampoMoneda
            etiqueta="Neto"
            ayuda="Opcional. El líquido que cobra."
            valor={neto}
            alCambiar={setNeto}
          />
        </div>
        <p className="text-secundario text-texto-suave">
          Se guarda en privado en su ficha, y a {nombre} le llega un aviso para verla y descargarla.
        </p>
      </div>
    </Hoja>
  );
}
