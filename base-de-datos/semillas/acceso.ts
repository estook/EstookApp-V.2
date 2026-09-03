import { derivar, derivarConSalDelLocal, pinNuevo } from '../../servidor/dominio/secretos.ts';

/**
 * Semilla 5 de 5 · con qué entran las personas de ejemplo (M4).
 *
 * Las cuatro primeras semillas son SQL puro. Esta no puede serlo, y no es un
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
 * Porque estas ocho personas son de mentira (`es_ejemplo`), y porque poder
 * entrar como Sara para ver que su rueda tiene cuatro sectores es lo que hace que
 * M4 se pueda comprobar sin inventarse nada.
 *
 * ── La comprobación que no podía saltar nunca (M5) ───────────────────────────
 *
 * Esta semilla se negaba a correr «en producción», y miraba `ENTORNO` para
 * saberlo. **Y esa negativa no podía saltar jamás**, porque `ENTORNO` vive en el
 * `.env.local` de la máquina de quien desarrolla, donde pone `desarrollo`, y
 * `DATABASE_URL`, en el mismo fichero, apunta al Supabase de verdad.
 *
 * Resultado: la base de datos de producción acabó con ocho cuentas cuya
 * contraseña está publicada en GitHub, y una de ellas con rol `direccion`. No se
 * notó porque la API todavía no estaba desplegada; el día que se despliegue, esas
 * ocho cuentas son ocho puertas abiertas.
 *
 * Es, palabra por palabra, lo que el propio Plan había escrito en E4: **«una
 * comprobación que no puede fallar es peor que no tenerla, porque da
 * confianza»**, y **«el nombre de una cosa decide dónde acaba»**.
 *
 * Así que ahora **no se mira una etiqueta: se mira a dónde se está conectando**.
 * Lo dice quien abre la conexión, que es el único que lo sabe de verdad, y a una
 * base remota no se le siembran credenciales aunque el entorno diga misa.
 *
 * Para entrar de verdad en una base remota está `pnpm bd:cuenta-de-verdad`, que
 * crea una cuenta con una contraseña de un solo uso que no se escribe en ningún
 * sitio. Y para limpiar lo que ya esté puesto, `pnpm bd:sin-cuentas-de-ejemplo`.
 */

/** La contraseña de las ocho personas de ejemplo. No es secreta y no lo pretende. */
export const CLAVE_DE_EJEMPLO = 'estook en desarrollo';

/**
 * A qué Postgres se está sembrando. **Lo dice quien abre la conexión**, no una
 * variable de entorno: la variable fue exactamente lo que falló.
 *
 *   efimera   PGlite, el de las pruebas. Vive y muere en la misma orden.
 *   local     un Postgres en `localhost`. Lo que hay en él no sale de la máquina.
 *   remota    cualquier otra cosa. Aquí **no entra una credencial de ejemplo**.
 */
export type DondeSeSiembra = 'efimera' | 'local' | 'remota';

/**
 * Lo que se dice cuando alguien intenta sembrar credenciales de ejemplo fuera de
 * su máquina. Es una clase y no un `throw` suelto para que quien la llama pueda
 * distinguirla de un fallo de verdad y seguir con el resto de la siembra: los
 * `.sql` sí se pueden aplicar en cualquier sitio, porque no ponen ninguna clave.
 */
export class ErrorDeSiembraRemota extends Error {
  constructor() {
    super(
      [
        'A una base de datos remota no se le siembran credenciales de ejemplo.',
        '',
        'Que ha pasado: esta semilla le pone a ocho personas de ejemplo una contrasena',
        'que esta escrita en el repositorio, y un PIN por local. Contra una base que no',
        'es la de tu maquina, eso son ocho cuentas abiertas con una clave publica.',
        '',
        'Que se puede hacer:',
        '  · para entrar de verdad ahi:   pnpm bd:cuenta-de-verdad tu@correo.com',
        '  · para limpiar lo que ya este: pnpm bd:sin-cuentas-de-ejemplo',
      ].join('\n'),
    );
    this.name = 'ErrorDeSiembraRemota';
  }
}

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
  opciones: { readonly donde: DondeSeSiembra },
): Promise<LoQueSeSembro> {
  if (opciones.donde === 'remota') {
    throw new ErrorDeSiembraRemota();
  }

  // ── Los locales de ejemplo estan montados, menos uno ───────────────────────
  //
  // La quinta comprobacion al entrar es «si no ha terminado el onboarding, sigue
  // por donde iba», y un local nuevo nace en el paso cero, que es lo correcto.
  // Pero los sembrados **no son nuevos**: tienen su carta, su equipo y su
  // organizacion puestos. Si nacieran a medias, entrar como Rosa llevaria al alta
  // y no al Panel.
  //
  // La excepcion es Casa Lola, que se siembra **a medias a proposito** (M5): es
  // el local con el que se prueba el alta sin tener que crear uno cada vez.
  //
  // Va aqui y no en la migracion porque las semillas corren **despues** de las
  // migraciones: lo que la 0018 marco son los locales que ya hubiera, no estos.
  await ejecutar(
    `update estook.local
        set onboarding_paso = 8,
            onboarding_terminado = true,
            onboarding_terminado_en = coalesce(onboarding_terminado_en, creado_en)
      where es_ejemplo
        and not onboarding_terminado
        and codigo <> 'casa-lola'`,
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
