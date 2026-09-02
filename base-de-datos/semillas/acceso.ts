import { derivar, derivarConSalDelLocal, pinNuevo } from '../../servidor/dominio/secretos.ts';

/**
 * Semilla 4 de 4 · con qué entran las personas de ejemplo (M4).
 *
 * Las tres primeras semillas son SQL puro. Esta no puede serlo, y no es un
 * capricho: **la derivación de la contraseña vive en el servidor, no en la base
 * de datos** (decisión 0010, y antes de ella la 0009). No hay `pgcrypto` en el
 * Postgres efímero de las pruebas, así que un `crypt()` en un `.sql` dejaría el
 * login sin probar en dos de las tres capas.
 *
 * Por eso esta semilla es una función, y la llaman los dos sitios que siembran:
 * `bd:sembrar` contra Postgres de verdad, y `levantarBase()` contra PGlite. Un
 * cálculo, un único dueño (regla 6).
 *
 * ── La contraseña está escrita en el repositorio, y hay que entender por qué ──
 *
 * Porque estas siete personas son de mentira (`es_ejemplo`), y porque poder
 * entrar como Sara para ver que su rueda tiene cuatro sectores es lo que hace que
 * M4 se pueda comprobar sin inventarse nada.
 *
 * Y por eso mismo **esta semilla se niega a correr en producción**. Aplicarla
 * contra una base de datos de verdad dejaría siete cuentas abiertas con una
 * contraseña que cualquiera puede leer en GitHub. La comprobación está abajo, es
 * lo primero que hace, y no se puede saltar con una bandera.
 */

/** La contraseña de las siete personas de ejemplo. No es secreta y no lo pretende. */
export const CLAVE_DE_EJEMPLO = 'estook en desarrollo';

/**
 * Ejecutar una consulta, sea cual sea el Postgres de debajo.
 *
 * Se pasa desde fuera para que esta semilla no sepa si está hablando con
 * `postgres.js` o con PGlite. Es lo que permite que la misma semilla valga para
 * `bd:sembrar` y para las pruebas.
 */
export type Ejecutar = (sql: string, parametros: unknown[]) => Promise<{ rows: unknown[] }>;

export interface LoQueSeSembro {
  readonly credenciales: number;
  /** El PIN de cada persona en cada local, para poder usarlos al desarrollar. */
  readonly pines: readonly {
    readonly correo: string;
    readonly local: string;
    readonly pin: string;
  }[];
}

export async function sembrarAcceso(
  ejecutar: Ejecutar,
  opciones: { readonly entorno?: string | undefined } = {},
): Promise<LoQueSeSembro> {
  const entorno = opciones.entorno ?? process.env['ENTORNO'] ?? 'desarrollo';

  if (entorno === 'produccion') {
    throw new Error(
      [
        'La semilla de acceso no se aplica en produccion.',
        '',
        'Que ha pasado: esta semilla pone una contrasena que esta escrita en el',
        'repositorio a siete personas de ejemplo. En produccion eso serian siete',
        'cuentas abiertas con una clave publica.',
        '',
        'Que se puede hacer: si de verdad quieres datos de ejemplo en ese entorno,',
        'siembra solo los `.sql` y crea las cuentas de verdad con `invitar_persona`.',
      ].join('\n'),
    );
  }

  // ── Los locales de ejemplo estan montados ──────────────────────────────────
  //
  // La quinta comprobacion al entrar es «si no ha terminado el onboarding, sigue
  // por donde iba», y un local nuevo nace en el paso cero, que es lo correcto.
  // Pero los sembrados **no son nuevos**: tienen su carta, su equipo y su
  // organizacion puestos. Si nacieran a medias, entrar como Rosa llevaria al alta
  // de M5, que todavia no existe, y no al Panel.
  //
  // Va aqui y no en la migracion porque las semillas corren **despues** de las
  // migraciones: lo que la 0018 marcara son los locales que ya hubiera, no estos.
  await ejecutar(
    `update estook.local
        set onboarding_paso = 8, onboarding_terminado = true
      where es_ejemplo and not onboarding_terminado`,
    [],
  );

  // Solo las de ejemplo. Si alguien sembrara esto sobre una base con personas de
  // verdad, no las tocaria: la condicion `es_ejemplo` es la segunda red.
  const personas = (
    await ejecutar('select id, correo from estook.persona where es_ejemplo order by correo', [])
  ).rows as { id: string; correo: string }[];

  const derivada = await derivar(CLAVE_DE_EJEMPLO);

  for (const persona of personas) {
    await ejecutar(
      `insert into estook.credencial (persona_id, derivada, debe_cambiarla)
       values ($1, $2, false)
       on conflict (persona_id) do update
         set derivada = excluded.derivada, debe_cambiarla = false`,
      [persona.id, derivada],
    );
  }

  // ── Los PIN ────────────────────────────────────────────────────────────────
  //
  // Uno por persona y por local al que llegue. No se puede precalcular: la sal es
  // de cada local y nace al azar con el local (migracion 0018).
  //
  // Se generan **en orden y comprobando**, porque «PIN unico por local» tambien
  // vale para las semillas: dos personas de ejemplo con el mismo PIN harian
  // saltar el indice unico y la siembra fallaria a medias.
  const alcances = (
    await ejecutar(
      `select distinct p.id as persona_id, p.correo, l.id as local_id, l.codigo, l.sal_del_pin
         from estook.persona p
         join estook.membresia m on m.persona_id = p.id
         join estook.local l
           on l.organizacion_id = m.organizacion_id
          and (
            m.alcance = 'organizacion'
            or (m.alcance = 'area' and l.area_id = m.area_id)
            or (m.alcance = 'local' and l.id = m.local_id)
          )
        where p.es_ejemplo and l.activo
        order by l.codigo, p.correo`,
      [],
    )
  ).rows as {
    persona_id: string;
    correo: string;
    local_id: string;
    codigo: string;
    sal_del_pin: string;
  }[];

  const pines: { correo: string; local: string; pin: string }[] = [];
  const cogidos = new Map<string, Set<string>>();

  for (const alcance of alcances) {
    const enEsteLocal = cogidos.get(alcance.local_id) ?? new Set<string>();

    let pin = pinNuevo();
    // Con un millon de PIN esto no da ni una vuelta en la practica; esta por lo
    // que pasaria si diera: una siembra rota a la mitad.
    for (let intento = 0; enEsteLocal.has(pin) && intento < 20; intento++) pin = pinNuevo();
    enEsteLocal.add(pin);
    cogidos.set(alcance.local_id, enEsteLocal);

    const huella = await derivarConSalDelLocal(pin, alcance.sal_del_pin);

    await ejecutar(
      `insert into estook.pin (persona_id, local_id, huella)
       values ($1, $2, $3)
       on conflict (persona_id, local_id) do update
         set huella = excluded.huella, intentos_fallidos = 0, bloqueado_hasta = null`,
      [alcance.persona_id, alcance.local_id, huella],
    );

    pines.push({ correo: alcance.correo, local: alcance.codigo, pin });
  }

  return { credenciales: personas.length, pines };
}
