import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Aviso, Boton, Cargando, EstadoVacio, GrupoDePlegables, Plegable } from '@estook/ui';
import { IconoDocumento, IconoSubir } from '@estook/iconos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarPersonaAbierta } from '../ganchos/usarPersonaAbierta.ts';
import { FichaDePersona } from './FichaDePersona.tsx';
import { comoDinero, type LasNominasDelEquipo } from './contrato.ts';
import { mesConMayuscula } from './ficha/comoSeLee.ts';
import { FilaDeDocumento } from './ficha/Secciones.tsx';
import { SubirLasNominasDelMes } from './ficha/SubirLasNominasDelMes.tsx';
import { SubirUnaNomina } from './ficha/SubirUnaNomina.tsx';

/**
 * Equipo › Nóminas (la Ampliación 3 · 2, decisión 0153; la maqueta, pestaña 3).
 *
 * **Mes a mes, la nómina de cada uno y a quién le falta.** Arriba, «Subir las nóminas del mes»
 * con el PDF de la gestoría; a quien le falta, «Subir la suya» de una en una. Solo lo ve quien
 * lleva los datos del equipo: el destino pide ese permiso, y la consulta también.
 */
export function LasNominas() {
  const cache = useQueryClient();
  const persona = usarPersonaAbierta();
  const lo = usarLectura<LasNominasDelEquipo>('las_nominas_del_equipo');
  const [subiendoDelMes, setSubiendoDelMes] = useState(false);
  const [subiendoUna, setSubiendoUna] = useState<{
    personaId: string;
    nombre: string;
    mes: string;
  } | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  async function refrescar(frase: string | null) {
    setNoticia(frase);
    await cache.invalidateQueries({ queryKey: ['las_nominas_del_equipo'] });
    await cache.invalidateQueries({ queryKey: ['una_persona'] });
  }

  if (lo.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer las nóminas">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const datos = lo.data;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center justify-between gap-e3">
        <p className="max-w-prose text-secundario text-texto-suave">
          Las nóminas de tu equipo, mes a mes. Cada persona ve y descarga la suya en Mi ficha.
        </p>
        <Boton
          tono="principal"
          icono={<IconoSubir size={18} />}
          onClick={() => {
            setSubiendoDelMes(true);
          }}
        >
          Subir las nóminas del mes
        </Boton>
      </div>

      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        >
          A cada uno le llega su aviso para verla.
        </Aviso>
      )}

      {datos === undefined ? (
        <Cargando que="las nóminas" forma="lista" lineas={4} />
      ) : datos.meses.every((m) => m.nominas.length === 0 && m.faltan.length === 0) ? (
        <EstadoVacio
          dibujo="archivo"
          acento="var(--color-app-equipo)"
          titulo="Todavía no hay nóminas"
          frase="Rellena la ficha de tu equipo y sube el PDF que te manda la gestoría: Fogón reparte cada nómina a su persona."
          accion={
            <Boton
              tono="principal"
              icono={<IconoSubir size={18} />}
              onClick={() => {
                setSubiendoDelMes(true);
              }}
            >
              Subir las nóminas del mes
            </Boton>
          }
        />
      ) : (
        <GrupoDePlegables titulo="Las nóminas, mes a mes">
          {datos.meses.map((m, i) => (
            <Plegable
              key={m.mes}
              titulo={mesConMayuscula(m.mes)}
              degradado="horas"
              icono={<IconoDocumento size={18} />}
              resumen={
                m.faltan.length === 0
                  ? `${String(m.nominas.length)} ${m.nominas.length === 1 ? 'nómina' : 'nóminas'}`
                  : `${String(m.nominas.length)} subidas · faltan ${String(m.faltan.length)}`
              }
              tono={m.faltan.length > 0 && m.mes === datos.mesPropuesto ? 'atencion' : 'neutro'}
              abierto={i === 0}
            >
              {m.nominas.length > 0 && (
                <div className="flex flex-col">
                  {m.nominas.map((n) => (
                    <FilaDeDocumento
                      key={n.documentoId}
                      documento={{
                        documentoId: n.documentoId,
                        tipo: 'nomina',
                        nombre: '',
                        mime: n.mime,
                        bytes: 0,
                        subidoEn: n.subidaEn,
                        subidoPor: null,
                      }}
                      titulo={`${n.nombre} ${n.apellidos ?? ''}`.trim()}
                      detalle={
                        n.netoCentimos === null
                          ? 'Sin el neto apuntado'
                          : `${comoDinero(n.netoCentimos)} netos${
                              n.brutoCentimos === null
                                ? ''
                                : ` · ${comoDinero(n.brutoCentimos)} brutos`
                            }`
                      }
                    />
                  ))}
                </div>
              )}
              {m.faltan.length > 0 && (
                <div className="flex flex-col gap-e2 rounded-medio bg-atencion-suave/60 p-e3">
                  <p className="text-secundario font-semibold">
                    {m.faltan.length === 1 ? 'Le falta a' : 'Les falta a'}
                  </p>
                  {m.faltan.map((p) => (
                    <div key={p.personaId} className="flex flex-wrap items-center gap-e2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-secundario underline-offset-2 hover:underline"
                        onClick={() => {
                          persona.abrir(p.personaId);
                        }}
                      >
                        {`${p.nombre} ${p.apellidos ?? ''}`.trim()}
                      </button>
                      <Boton
                        tono="texto"
                        icono={<IconoSubir size={16} />}
                        onClick={() => {
                          setSubiendoUna({ personaId: p.personaId, nombre: p.nombre, mes: m.mes });
                        }}
                      >
                        Subir la suya
                      </Boton>
                    </div>
                  ))}
                </div>
              )}
            </Plegable>
          ))}
        </GrupoDePlegables>
      )}

      {subiendoDelMes && datos !== undefined && (
        <SubirLasNominasDelMes
          mesPropuesto={datos.mesPropuesto}
          alCerrar={() => {
            setSubiendoDelMes(false);
          }}
          alHecho={() => {
            setSubiendoDelMes(false);
            void refrescar(null);
          }}
        />
      )}
      {subiendoUna !== null && (
        <SubirUnaNomina
          personaId={subiendoUna.personaId}
          nombre={subiendoUna.nombre}
          mesDeEntrada={subiendoUna.mes}
          alCerrar={() => {
            setSubiendoUna(null);
          }}
          alHecho={(frase) => {
            setSubiendoUna(null);
            void refrescar(frase);
          }}
        />
      )}

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}
