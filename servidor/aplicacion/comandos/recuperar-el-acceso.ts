import { z } from 'zod';
import { ENLACE_POR_CORREO, type ParaQueEsElEnlace } from '@estook/dominio';
import { derivar, huellaDeToken, porQueNoValeLaClave, tokenNuevo } from '../../dominio/secretos.ts';
import { apuntarUnFallo } from '../../infraestructura/fallos.ts';
import { CorreoNoSale, type CorreoParaMandar } from '../../infraestructura/correo.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  correoConElEnlaceDeLaContrasena,
  correoConElEnlaceDelPin,
  correoDeSinCuenta,
  enlaceDeAcceso,
} from '../correos.ts';
import { enNombreDelSistema } from '../pago.ts';
import { ponerPinNuevo, trabajaEn } from '../pines.ts';

/**
 * **Recuperar el acceso sin esperar a nadie** (0109, Richi, 24-oct).
 *
 * Desde la 0109 la contraseña es para Estook y el PIN para los aparatos del local, y
 * cada uno se recupera con un enlace al correo:
 *
 *   pedir_enlace_de_contrasena   «He olvidado mi contraseña» (o ponerse la primera),
 *                                en la puerta de Estook
 *   poner_contrasena_con_enlace  desde el enlace: la nueva, y las sesiones de antes se
 *                                cierran
 *   pedir_pin_por_correo         «He olvidado mi PIN», en el aparato del local: el
 *                                enlace es para **ese** local
 *   pin_con_enlace               desde el enlace: un PIN nuevo, que se enseña una vez,
 *                                y el de antes deja de valer
 *
 * ── Lo que se cuida, y no se ve ──────────────────────────────────────────────
 *
 * 1. **No dice si un correo existe.** Pedir el enlace contesta lo mismo siempre. En la
 *    puerta de Estook, a un correo sin cuenta le llega uno que lo dice (como al crear
 *    cuenta, 0042): así tarda lo mismo y quien se equivocó de correo lo sabe.
 * 2. **Un tope por dirección**, se mande algo o no: diez peticiones por hora. Y a una
 *    persona no le llegan más de tres enlaces en una hora, aunque se pidan desde
 *    sitios distintos.
 * 3. **El enlace se guarda por su huella**, sirve una vez y caduca: una hora el de la
 *    contraseña, media el del PIN. Y **abrirlo no hace nada**: hay que pulsar el
 *    botón, porque los antivirus de algunos correos abren los enlaces solos.
 * 4. **La contraseña nueva no se salta el segundo factor**: quien lo tiene lo sigue
 *    pidiendo al entrar.
 */

const correoConForma = z.string().trim().toLowerCase().email().max(320);
const elEnlace = z.string().trim().min(20).max(200);

// ── El tope y las filas ──────────────────────────────────────────────────────

/** La dirección de quien pide, en huella: para contar, no para saber quién era. */
async function laDireccion(contexto: Contexto): Promise<string> {
  return huellaDeToken(contexto.desde ?? 'sin-direccion');
}

/**
 * Diez peticiones por hora desde una dirección. **Se mira antes de buscar el correo**,
 * así que el tope salta igual exista o no.
 */
async function noPasarDelTope(contexto: Contexto, desde: string): Promise<void> {
  const haceUnaHora = new Date(contexto.ahora.getTime() - 60 * 60_000).toISOString();
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ cuantas: number }[]>`
        select count(*)::int as cuantas from estook.enlace_por_correo
         where desde = ${desde} and pedido_en > ${haceUnaHora}::timestamptz
      `,
  );
  if ((filas[0]?.cuantas ?? 0) >= ENLACE_POR_CORREO.porHoraDesdeUnaDireccion) {
    throw new FalloDeAplicacion('demasiados_enlaces');
  }
}

/** Si a esta persona ya le han llegado tres en la última hora. */
async function yaLeHanLlegadoDemasiados(
  contexto: Contexto,
  personaId: string,
  para: ParaQueEsElEnlace,
): Promise<boolean> {
  const haceUnaHora = new Date(contexto.ahora.getTime() - 60 * 60_000).toISOString();
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ cuantos: number }[]>`
        select count(*)::int as cuantos from estook.enlace_por_correo
         where persona_id = ${personaId}::uuid and para = ${para} and huella is not null
           and pedido_en > ${haceUnaHora}::timestamptz
      `,
  );
  return (filas[0]?.cuantos ?? 0) >= ENLACE_POR_CORREO.porHoraAUnaPersona;
}

/**
 * Apunta la petición. Con `enlace`, la del enlace que se manda; sin él, solo cuenta.
 * Lo de más de un día sin enlace ya no cuenta para nada, y se borra al apuntar.
 */
async function apuntarLaPeticion(
  contexto: Contexto,
  desde: string,
  para: ParaQueEsElEnlace,
  enlace: {
    readonly personaId: string;
    readonly localId: string | null;
    readonly token: string;
    readonly minutos: number;
  } | null,
): Promise<void> {
  const huella = enlace === null ? null : await huellaDeToken(enlace.token);
  const caduca =
    enlace === null
      ? null
      : new Date(contexto.ahora.getTime() + enlace.minutos * 60_000).toISOString();
  await enNombreDelSistema(contexto, async () => {
    await contexto.sql`
      insert into estook.enlace_por_correo
        (para, persona_id, local_id, huella, desde, pedido_en, caduca_en)
      values (
        ${para}, ${enlace?.personaId ?? null}::uuid, ${enlace?.localId ?? null}::uuid,
        ${huella}, ${desde}, ${contexto.ahora.toISOString()}::timestamptz,
        ${caduca}::timestamptz
      )
    `;
    await contexto.sql`
      delete from estook.enlace_por_correo
       where huella is null
         and pedido_en < ${new Date(contexto.ahora.getTime() - 24 * 60 * 60_000).toISOString()}::timestamptz
    `;
  });
}

/**
 * El enlace vivo de esa huella, **gastado ya**: sirve una vez. Nulo si no vale (no
 * existe, se usó o caducó), y entonces no se gasta nada.
 */
async function gastarElEnlace(
  contexto: Contexto,
  token: string,
  para: ParaQueEsElEnlace,
): Promise<{ personaId: string; localId: string | null }> {
  const huella = await huellaDeToken(token);
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ persona_id: string; local_id: string | null }[]>`
        update estook.enlace_por_correo
           set usado_en = ${contexto.ahora.toISOString()}::timestamptz
         where huella = ${huella} and para = ${para} and usado_en is null
           and caduca_en > ${contexto.ahora.toISOString()}::timestamptz
        returning persona_id::text as persona_id, local_id::text as local_id
      `,
  );
  const fila = filas[0];
  if (fila === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque:
        para === 'contrasena'
          ? 'Ese enlace ya no vale: se ha usado o ha caducado. Pide otro en «He olvidado mi contraseña».'
          : 'Ese enlace ya no vale: se ha usado o ha caducado. Pide otro en el aparato del local, en «He olvidado mi PIN».',
    });
  }
  return { personaId: fila.persona_id, localId: fila.local_id };
}

/**
 * Manda el correo, y si no sale lo dice como lo dice crear cuenta: lo que es de
 * configuración no se arregla reintentando; lo demás, sí.
 */
async function mandar(contexto: Contexto, correo: CorreoParaMandar, que: string): Promise<void> {
  const saliente = contexto.correo;
  if (saliente === null) throw new FalloDeAplicacion('todavia_no_disponible');
  try {
    await saliente.mandar(correo);
  } catch (fallo) {
    const esDeConfiguracion = fallo instanceof CorreoNoSale && fallo.esDeConfiguracion;
    await apuntarUnFallo(fallo, {
      mensaje: `el correo ${que} no ha salido`,
      correlacionId: contexto.correlacionId,
      extra: { de_configuracion: esDeConfiguracion },
    });
    throw new FalloDeAplicacion(esDeConfiguracion ? 'todavia_no_disponible' : 'fallo_nuestro');
  }
}

/** Con la identidad de esa persona, como al entrar: estas operaciones corren sin sesión. */
async function comoEsaPersona(contexto: Contexto, personaId: string | null): Promise<void> {
  await contexto.sql`select set_config('estook.persona_id', ${personaId ?? ''}, true)`;
}

async function suNombre(contexto: Contexto, personaId: string): Promise<string> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${personaId}::uuid
  `;
  return filas[0]?.nombre ?? '';
}

/** Las organizaciones donde trabaja, para que lo hecho quede en la auditoría de cada una. */
async function susOrganizaciones(contexto: Contexto, personaId: string): Promise<string[]> {
  const filas = await contexto.sql<{ organizacion_id: string }[]>`
    select distinct m.organizacion_id::text as organizacion_id
      from estook.membresia m
     where m.persona_id = ${personaId}::uuid
       and m.desde <= current_date and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
  `;
  return filas.map((f) => f.organizacion_id);
}

// ═══ La contraseña ════════════════════════════════════════════════════════════

export const pedirEnlaceDeContrasena = comando<
  { correo: string },
  { readonly enviado: true; readonly minutos: number }
>({
  nombre: 'pedir_enlace_de_contrasena',
  entrada: z.object({ correo: correoConForma }).strict(),
  // Quien la ha olvidado no ha entrado: por eso la pide.
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    if (contexto.correo === null) throw new FalloDeAplicacion('todavia_no_disponible');
    const desde = await laDireccion(contexto);
    await noPasarDelTope(contexto, desde);

    const personas = await contexto.sql<{ persona_id: string; activa: boolean }[]>`
      select persona_id::text as persona_id, activa from estook.persona_por_correo(${entrada.correo})
    `;
    const persona = personas[0];
    const minutos = ENLACE_POR_CORREO.minutosDeLaContrasena;

    if (persona === undefined || !persona.activa) {
      // Sin cuenta (o de baja): se dice en el correo, no en la pantalla.
      await apuntarLaPeticion(contexto, desde, 'contrasena', null);
      await mandar(contexto, correoDeSinCuenta(entrada.correo), 'de «sin cuenta»');
      return { enviado: true, minutos };
    }

    if (await yaLeHanLlegadoDemasiados(contexto, persona.persona_id, 'contrasena')) {
      // Ya tiene tres por abrir: no se le llena el buzón. La pantalla dice lo mismo.
      await apuntarLaPeticion(contexto, desde, 'contrasena', null);
      return { enviado: true, minutos };
    }

    const token = tokenNuevo();
    await apuntarLaPeticion(contexto, desde, 'contrasena', {
      personaId: persona.persona_id,
      localId: null,
      token,
      minutos,
    });
    await comoEsaPersona(contexto, persona.persona_id);
    const nombre = await suNombre(contexto, persona.persona_id);
    const tiene = await contexto.sql<{ hay: boolean }[]>`
      select true as hay from estook.credencial where persona_id = ${persona.persona_id}::uuid
    `;
    await comoEsaPersona(contexto, null);
    await mandar(
      contexto,
      correoConElEnlaceDeLaContrasena(
        entrada.correo,
        nombre,
        enlaceDeAcceso('contrasena', token),
        minutos,
        tiene.length > 0,
      ),
      'del enlace de la contraseña',
    );
    return { enviado: true, minutos };
  },
});

export const ponerContrasenaConEnlace = comando<
  { enlace: string; contrasena: string },
  { readonly puesta: true }
>({
  nombre: 'poner_contrasena_con_enlace',
  entrada: z.object({ enlace: elEnlace, contrasena: z.string().min(1).max(512) }).strict(),
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    // Primero si vale la contraseña: así un enlace no se gasta en una que no vale.
    const porque = porQueNoValeLaClave(entrada.contrasena);
    if (porque !== null) {
      throw new FalloDeAplicacion('faltan_datos', { campos: ['contrasena'], porque });
    }
    const { personaId } = await gastarElEnlace(contexto, entrada.enlace, 'contrasena');
    const derivada = await derivar(entrada.contrasena);

    await comoEsaPersona(contexto, personaId);
    await contexto.sql`
      insert into estook.credencial (persona_id, derivada, debe_cambiarla)
      values (${personaId}::uuid, ${derivada}, false)
      on conflict (persona_id) do update
        set derivada = excluded.derivada,
            debe_cambiarla = false,
            cambiada_en = now(),
            intentos_fallidos = 0,
            bloqueada_hasta = null
    `;
    // **Todas las sesiones se cierran**: si alguien la sabía, cambiarla tiene que echarle.
    await contexto.sql`select estook.cerrar_sesiones_de(${personaId}::uuid, ${personaId}::uuid)`;
    for (const organizacionId of await susOrganizaciones(contexto, personaId)) {
      await contexto.sql`
        select estook.anotar(
          ${organizacionId}::uuid, 'poner_contrasena_con_enlace', 'credencial', ${personaId},
          null, null, null, 'Con el enlace del correo'
        )
      `;
    }
    await comoEsaPersona(contexto, null);
    return { puesta: true };
  },
});

// ═══ El PIN, desde el aparato del local ═══════════════════════════════════════

export const pedirPinPorCorreo = comando<
  { llave: string; correo: string },
  { readonly enviado: true; readonly minutos: number; readonly local: string }
>({
  nombre: 'pedir_pin_por_correo',
  entrada: z.object({ llave: z.string().trim().min(20).max(200), correo: correoConForma }).strict(),
  // En el aparato, con el PIN olvidado: no hay nadie dentro. La llave dice el local.
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    if (contexto.correo === null) throw new FalloDeAplicacion('todavia_no_disponible');
    const desde = await laDireccion(contexto);
    await noPasarDelTope(contexto, desde);

    const aparatos = await contexto.sql<{ local_id: string; nombre_del_local: string }[]>`
      select local_id::text as local_id, nombre_del_local
        from estook.aparato_por_llave(${await huellaDeToken(entrada.llave)})
    `;
    const aparato = aparatos[0];
    if (aparato === undefined) throw new FalloDeAplicacion('aparato_retirado');
    const minutos = ENLACE_POR_CORREO.minutosDelPin;
    const loMismo = { enviado: true, minutos, local: aparato.nombre_del_local } as const;

    const personas = await contexto.sql<{ persona_id: string; activa: boolean }[]>`
      select persona_id::text as persona_id, activa from estook.persona_por_correo(${entrada.correo})
    `;
    const persona = personas[0];
    await comoEsaPersona(contexto, persona?.activa === true ? persona.persona_id : null);
    const delLocal =
      persona?.activa === true &&
      (await trabajaEn(contexto.sql, persona.persona_id, aparato.local_id));

    // **Al de fuera no se le escribe nada**: el local va en el correo, y no es suyo.
    if (
      persona === undefined ||
      !delLocal ||
      (await yaLeHanLlegadoDemasiados(contexto, persona.persona_id, 'pin'))
    ) {
      await comoEsaPersona(contexto, null);
      await apuntarLaPeticion(contexto, desde, 'pin', null);
      return loMismo;
    }

    const nombre = await suNombre(contexto, persona.persona_id);
    await comoEsaPersona(contexto, null);
    const token = tokenNuevo();
    await apuntarLaPeticion(contexto, desde, 'pin', {
      personaId: persona.persona_id,
      localId: aparato.local_id,
      token,
      minutos,
    });
    await mandar(
      contexto,
      correoConElEnlaceDelPin(
        entrada.correo,
        nombre,
        aparato.nombre_del_local,
        enlaceDeAcceso('pin', token),
        minutos,
      ),
      'del enlace del PIN',
    );
    return loMismo;
  },
});

export const pinConEnlace = comando<
  { enlace: string },
  { readonly pin: string; readonly local: string }
>({
  nombre: 'pin_con_enlace',
  entrada: z.object({ enlace: elEnlace }).strict(),
  sinSesion: true,
  // Devuelve el PIN en claro: no se recuerda. Ver `conSecreto` en el contrato.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const { personaId, localId } = await gastarElEnlace(contexto, entrada.enlace, 'pin');
    if (localId === null) throw new FalloDeAplicacion('no_existe');

    await comoEsaPersona(contexto, personaId);
    // Puede haber dejado el local entre pedirlo y abrirlo: entonces ya no es suyo.
    if (!(await trabajaEn(contexto.sql, personaId, localId))) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ya no trabajas en ese local: pídele el PIN a quien lo lleva.',
      });
    }
    const pin = await ponerPinNuevo(contexto.sql, personaId, localId);
    const locales = await contexto.sql<{ nombre: string; organizacion_id: string }[]>`
      select nombre, organizacion_id::text as organizacion_id from estook.local where id = ${localId}::uuid
    `;
    const local = locales[0];
    if (local !== undefined) {
      await contexto.sql`
        select estook.anotar(
          ${local.organizacion_id}::uuid, 'regenerar_pin', 'pin', ${personaId},
          ${localId}::uuid, null, null, 'Con el enlace del correo'
        )
      `;
    }
    await comoEsaPersona(contexto, null);
    return { pin, local: local?.nombre ?? '' };
  },
});
