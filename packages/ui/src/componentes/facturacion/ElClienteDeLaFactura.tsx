import type { ClaseDeCliente } from '@estook/dominio';
import { Campo } from '../Campo.tsx';
import { Selector } from '../Selector.tsx';
import { clases } from '../../clases.ts';
import type { ElEstadoDelCliente } from '../../ganchos/usarElCliente.ts';

/**
 * **Para quién** (T6 · 2 · 2, decisiones 0137 y 0139): el cliente de una factura, de una señal o de una
 * corrección. Se escribe directo, no hay lista: si su número ya tiene una factura, lo demás sale de
 * ella. **Se comprueba al escribir**, porque un rechazo de Verifacti gasta un número.
 */

/** Los países que más vienen. Con el código ISO que pide Verifacti (`codigo_pais`). */
const PAISES: readonly { readonly valor: string; readonly texto: string }[] = [
  { valor: 'DE', texto: 'Alemania' },
  { valor: 'AT', texto: 'Austria' },
  { valor: 'BE', texto: 'Bélgica' },
  { valor: 'BG', texto: 'Bulgaria' },
  { valor: 'CY', texto: 'Chipre' },
  { valor: 'HR', texto: 'Croacia' },
  { valor: 'DK', texto: 'Dinamarca' },
  { valor: 'SK', texto: 'Eslovaquia' },
  { valor: 'SI', texto: 'Eslovenia' },
  { valor: 'EE', texto: 'Estonia' },
  { valor: 'FI', texto: 'Finlandia' },
  { valor: 'FR', texto: 'Francia' },
  { valor: 'GR', texto: 'Grecia' },
  { valor: 'HU', texto: 'Hungría' },
  { valor: 'IE', texto: 'Irlanda' },
  { valor: 'IT', texto: 'Italia' },
  { valor: 'LV', texto: 'Letonia' },
  { valor: 'LT', texto: 'Lituania' },
  { valor: 'LU', texto: 'Luxemburgo' },
  { valor: 'MT', texto: 'Malta' },
  { valor: 'NL', texto: 'Países Bajos' },
  { valor: 'PL', texto: 'Polonia' },
  { valor: 'PT', texto: 'Portugal' },
  { valor: 'CZ', texto: 'República Checa' },
  { valor: 'RO', texto: 'Rumanía' },
  { valor: 'SE', texto: 'Suecia' },
  { valor: 'AD', texto: 'Andorra' },
  { valor: 'AR', texto: 'Argentina' },
  { valor: 'BR', texto: 'Brasil' },
  { valor: 'CA', texto: 'Canadá' },
  { valor: 'CN', texto: 'China' },
  { valor: 'US', texto: 'Estados Unidos' },
  { valor: 'JP', texto: 'Japón' },
  { valor: 'MA', texto: 'Marruecos' },
  { valor: 'MX', texto: 'México' },
  { valor: 'NO', texto: 'Noruega' },
  { valor: 'GB', texto: 'Reino Unido' },
  { valor: 'CH', texto: 'Suiza' },
];

/** Los de la Unión: los únicos con número de IVA en el censo europeo. */
const DE_LA_UNION = new Set(PAISES.slice(0, 26).map((p) => p.valor));

const EN_CADA_CLASE: readonly { readonly valor: ClaseDeCliente; readonly texto: string }[] = [
  { valor: 'empresa', texto: 'Empresa o autónomo' },
  { valor: 'particular', texto: 'Particular' },
  { valor: 'de_fuera', texto: 'De fuera de España' },
];

export function Elegir<T extends string>({
  opciones,
  valor,
  alElegir,
  nombre,
}: {
  readonly opciones: readonly { readonly valor: T; readonly texto: string }[];
  readonly valor: T;
  readonly alElegir: (v: T) => void;
  readonly nombre: string;
}) {
  return (
    <div role="radiogroup" aria-label={nombre} className="flex flex-wrap gap-e1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => {
            alElegir(o.valor);
          }}
          className={clases(
            'min-h-toque rounded-medio border px-e3 text-secundario font-medium',
            valor === o.valor
              ? 'border-naranja bg-naranja-suave text-texto'
              : 'border-borde bg-superficie text-texto-suave',
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function ParaQuien({ c }: { readonly c: ElEstadoDelCliente }) {
  return (
    <section aria-label="Para quién" className="flex flex-col gap-e3">
      <p className="text-cuerpo font-semibold">Para quién</p>
      <Elegir
        nombre="Qué es el cliente"
        opciones={EN_CADA_CLASE}
        valor={c.clase}
        alElegir={(v) => {
          c.setClase(v);
          c.setComprobado(null);
        }}
      />

      {c.clase === 'de_fuera' && (
        <div className="grid gap-e3 sm:grid-cols-2">
          <Selector
            etiqueta="País"
            opciones={PAISES.map((p) => ({ valor: p.valor, texto: p.texto }))}
            value={c.codigoPais}
            onChange={(e) => {
              c.setCodigoPais(e.target.value);
              if (!DE_LA_UNION.has(e.target.value)) c.setIdTipo('03');
              c.setComprobado(null);
            }}
          />
          <div className="flex flex-col gap-e1">
            <p className="text-secundario font-medium text-texto-suave">Con qué</p>
            <Elegir
              nombre="Con qué se identifica"
              opciones={
                DE_LA_UNION.has(c.codigoPais)
                  ? [
                      { valor: '02' as const, texto: 'N.º de IVA' },
                      { valor: '03' as const, texto: 'Pasaporte' },
                    ]
                  : [{ valor: '03' as const, texto: 'Pasaporte' }]
              }
              valor={c.idTipo}
              alElegir={(v) => {
                c.setIdTipo(v);
                c.setComprobado(null);
              }}
            />
          </div>
        </div>
      )}
      <Campo
        etiqueta={
          c.clase === 'empresa'
            ? 'NIF'
            : c.clase === 'particular'
              ? 'DNI o NIE'
              : c.idTipo === '02'
                ? 'Número de IVA'
                : 'Pasaporte'
        }
        value={c.identificador}
        onChange={(e) => {
          c.cambiarElNumero(e.target.value);
        }}
        onBlur={() => {
          // Lo ya mirado, y sin tocar, no se vuelve a preguntar.
          if (c.comprobado === null) void c.comprobar();
        }}
        {...(c.comprobado !== null && !c.comprobado.vale && c.comprobado.dice !== null
          ? { error: c.comprobado.dice }
          : c.comprobado?.dice != null
            ? { ayuda: `✓ ${c.comprobado.dice}` }
            : c.comprobando
              ? { ayuda: 'Mirando en Hacienda…' }
              : {})}
      />
      <Campo
        etiqueta={
          c.clase === 'empresa'
            ? 'Nombre o razón social'
            : c.clase === 'particular'
              ? 'Nombre y apellidos'
              : 'Nombre'
        }
        value={c.nombre}
        onChange={(e) => {
          c.setNombre(e.target.value);
          // Un NIF que no cuadraba con el nombre se vuelve a mirar al salir: no se queda bloqueado.
          c.setComprobado(null);
        }}
        onBlur={() => {
          // Lo ya mirado, y sin tocar, no se vuelve a preguntar.
          if (c.comprobado === null) void c.comprobar();
        }}
        {...(c.clase === 'empresa' ? { ayuda: 'Sale de Hacienda al escribir el NIF.' } : {})}
      />
      <Campo
        etiqueta="Domicilio"
        value={c.domicilio}
        onChange={(e) => {
          c.setDomicilio(e.target.value);
        }}
        {...(c.rellenado.domicilio !== null && c.domicilio === c.rellenado.domicilio
          ? { ayuda: 'De su última factura. Cámbialo si ya no es este.' }
          : {})}
      />
    </section>
  );
}
