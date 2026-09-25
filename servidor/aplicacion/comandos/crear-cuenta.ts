import { z } from 'zod';
import {
  CUENTAS_POR_DIRECCION_A_LA_HORA,
  INTENTOS_DEL_CODIGO_DE_REGISTRO,
  MINUTOS_DEL_CODIGO_DE_REGISTRO,
  SEGUNDOS_ENTRE_CODIGOS,
  VUELTAS_DE_GOOGLE,
  codigoDeRegistro,
  comoCodigo,
  esCodigoDeRegistro,
  type OfertaDePrueba,
} from '@estook/dominio';
import { comprobar, derivar, porQueNoValeLaClave } from '../../dominio/secretos.ts';
import { CorreoNoSale } from '../../infraestructura/correo.ts';
import { GoogleNoIdentifica } from '../../infraestructura/identidad-de-google.ts';
import { correoConElCodigo, correoDeYaTienesCuenta } from '../correos.ts';
import {
  comando,
  consulta,
  FalloDeAplicacion,
  falloQueSeGuarda,
  type Contexto,
} from '../contrato.ts';
import { cambiarLaSuscripcion } from '../pago.ts';
import { abrirLaSesion, elAparato, type SalidaEntrar } from './entrar.ts';

/**
 * Crear cuenta, y entrar con Google (0042).
 *
 * «Si dan a crear cuenta, pueden hacerlo con correo normal y verificación o con
 *  Google; y si dan a iniciar sesión, con su cuenta, con PIN o con Google.»
 *
 * Las tres cosas que no se ven y hacen esto seguro:
 *
 *   1. **No se dice si un correo tiene cuenta.** Pedir un código con un correo que
 *      ya existe contesta lo mismo, y a ese correo le llega «ya tienes cuenta».
 *   2. **Todo cuenta antes de mandar**: un código por minuto por correo, diez
 *      cuentas por hora por dirección, cinco intentos por código, media hora de
 *      vida. Lo guarda la base, no la memoria de una función que muere.
 *   3. **La cuenta no existe hasta que se demuestra el correo**: con el código, o
 *      porque Google dice que el correo está verificado.
 */

// ── Cómo se entra ────────────────────────────────────────────────────────────

export interface ComoSeEntra {
  /** Nulo si no está el cliente de OAuth: el botón de Google no sale. */
  readonly google: { readonly clienteId: string } | null;
  /** Si se puede crear cuenta con correo: hace falta poder mandar el código. */
  readonly conCorreo: boolean;
  readonly oferta: OfertaDePrueba;
}

async function laOferta(contexto: Contexto): Promise<OfertaDePrueba> {
  const filas = await contexto.sql<{ activa: boolean; dias: number }[]>`
    select activa, dias from plataforma.oferta_vigente()
  `;
  const fila = filas[0];
  return { activa: fila?.activa === true, dias: fila?.dias ?? 0 };
}

/**
 * Lo que la pantalla de entrar y la web necesitan saber **antes** de que haya
 * nadie: qué formas de entrar están encendidas y si hay oferta de prueba. No
 * enseña ningún secreto: el identificador del cliente de Google es público.
 */
export const comoSeEntra = consulta<Record<string, never>, ComoSeEntra>({
  nombre: 'como_se_entra',
  entrada: z.object({}).strict(),
  sinSesion: true,

  async ejecutar(contexto) {
    return {
      google:
        contexto.identidadDeGoogle === null
          ? null
          : { clienteId: contexto.identidadDeGoogle.clienteId },
      conCorreo: contexto.correo !== null,
      oferta: await laOferta(contexto),
    };
  },
});

// ── Crear cuenta con correo · pedir el código ────────────────────────────────

export const entradaPedirCodigoDeRegistro = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    negocio: z.string().trim().min(2).max(120),
    correo: z.string().trim().toLowerCase().email().max(320),
    contrasena: z.string().min(1).max(512),
    // Sin aceptar las condiciones no se crea nada: no es un casilla decorativa.
    aceptaCondiciones: z.literal(true),
  })
  .strict();

export type EntradaPedirCodigoDeRegistro = z.infer<typeof entradaPedirCodigoDeRegistro>;

export const pedirCodigoDeRegistro = comando<
  EntradaPedirCodigoDeRegistro,
  { readonly enviado: true; readonly minutos: number }
>({
  nombre: 'pedir_codigo_de_registro',
  entrada: entradaPedirCodigoDeRegistro,
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    const correo = contexto.correo;
    if (correo === null) {
      throw new FalloDeAplicacion('todavia_no_disponible', {
        porque:
          'Crear cuenta con correo se abre en cuanto esté conectado el correo. Mientras, hazlo con Google.',
      });
    }

    const porque = porQueNoValeLaClave(entrada.contrasena);
    if (porque !== null) {
      throw new FalloDeAplicacion('faltan_datos', { campos: ['contrasena'], porque });
    }

    const existentes = await contexto.sql<{ persona_id: string }[]>`
      select * from estook.persona_por_correo(${entrada.correo})
    `;
    const yaTieneCuenta = existentes.length > 0;

    // Se deriva **siempre**, tenga cuenta o no, y se tira si no hace falta: si no,
    // el correo que ya existe contestaría antes, y por el tiempo se sabría qué
    // correos usan Estook. Es lo mismo que hace `entrar` con la contraseña.
    const codigo = codigoDeRegistro();
    const derivados = await Promise.all([derivar(codigo), derivar(entrada.contrasena)]);
    const [huella, derivada] = yaTieneCuenta ? [null, null] : derivados;

    const estados = await contexto.sql<{ pedir_codigo_de_registro: string }[]>`
      select estook.pedir_codigo_de_registro(
        ${entrada.correo}, ${entrada.nombre}, ${entrada.negocio},
        ${derivada}, ${huella}, ${contexto.desde},
        ${MINUTOS_DEL_CODIGO_DE_REGISTRO}, ${SEGUNDOS_ENTRE_CODIGOS},
        ${CUENTAS_POR_DIRECCION_A_LA_HORA}
      ) as pedir_codigo_de_registro
    `;
    const estado = estados[0]?.pedir_codigo_de_registro;
    if (estado === 'demasiados') throw new FalloDeAplicacion('demasiadas_cuentas');
    if (estado === 'espera') throw new FalloDeAplicacion('espera_un_momento');

    // Si el correo no sale, **no se guarda nada**: el fallo deshace el registro, y
    // así pedirlo otra vez no choca con «espera un minuto» por un código que nunca
    // llegó.
    try {
      await correo.mandar(
        yaTieneCuenta
          ? correoDeYaTienesCuenta(entrada.correo)
          : correoConElCodigo(entrada.correo, entrada.nombre, codigo),
      );
    } catch (fallo) {
      /*
        ── Por qué esto se registra, y por qué no todos los fallos son iguales ──

        Antes este `catch` se comía el error entero y devolvía «se nos ha roto
        algo por dentro». Al encender el correo en producción **eso fue
        exactamente lo que se vio**, y no quedó rastro de por qué: desde fuera,
        un dominio sin verificar en Resend y una caída de Resend eran la misma
        pantalla. Se arreglan de forma opuesta.

        Ahora pasan dos cosas:

        1. **Se registra el motivo** que contestó Resend, con su código. Va al
           registro del servidor, nunca a la pantalla: ahí no se enseña ni un
           código (Auditoría de flujos, parte 5).
        2. **Se separa lo que se arregla esperando de lo que no.** Un 4xx es el
           dominio sin verificar, el remitente mal escrito o la clave mala: en un
           minuto fallará igual, así que mandar a reintentar es mandar a perder el
           tiempo. Ahí se dice lo que es —esto todavía no está conectado— y se
           ofrece Google, **que sí funciona**. Un 5xx o un corte de red sí es
           pasajero, y ahí reintentar es la respuesta correcta.
      */
      const esDeConfiguracion = fallo instanceof CorreoNoSale && fallo.esDeConfiguracion;
      console.error(
        JSON.stringify({
          nivel: 'error',
          mensaje: 'el correo del código de registro no ha salido',
          correlacion_id: contexto.correlacionId,
          de_configuracion: esDeConfiguracion,
          detalle: fallo instanceof Error ? fallo.message : String(fallo),
        }),
      );

      if (esDeConfiguracion) {
        throw new FalloDeAplicacion('todavia_no_disponible', {
          porque:
            'El correo todavía no sale de aquí. Crea la cuenta con Google mientras lo conectamos.',
        });
      }
      throw new FalloDeAplicacion('fallo_nuestro');
    }

    // La misma respuesta tenga cuenta o no (arriba, 1).
    return { enviado: true, minutos: MINUTOS_DEL_CODIGO_DE_REGISTRO };
  },
});

// ── Crear cuenta con correo · el código ──────────────────────────────────────

export const entradaConfirmarRegistro = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(320),
    codigo: z.string().trim().min(1).max(12),
    aparato: elAparato.optional(),
  })
  .strict();

export type EntradaConfirmarRegistro = z.infer<typeof entradaConfirmarRegistro>;

export const confirmarRegistro = comando<EntradaConfirmarRegistro, SalidaEntrar>({
  nombre: 'confirmar_registro',
  entrada: entradaConfirmarRegistro,
  sinSesion: true,
  // Devuelve el token de sesión: no se recuerda.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const filas = await contexto.sql<
      {
        registro_id: string;
        nombre: string;
        negocio: string;
        derivada: string;
        huella_del_codigo: string;
      }[]
    >`select * from estook.registro_pendiente_de(${entrada.correo})`;
    const fila = filas[0];

    // Sin registro (o caducado), la misma frase que con un código mal: no se dice
    // qué correos están a medias.
    if (fila === undefined) throw new FalloDeAplicacion('codigo_incorrecto');

    const acierta =
      esCodigoDeRegistro(entrada.codigo) &&
      (await comprobar(entrada.codigo, fila.huella_del_codigo));

    await contexto.sql`
      select estook.anotar_intento_de_registro(
        ${fila.registro_id}::uuid, ${acierta}, ${INTENTOS_DEL_CODIGO_DE_REGISTRO}
      )
    `;
    // El intento **se guarda** aunque falle: si no, los cinco intentos no serían
    // cinco (0039).
    if (!acierta) throw falloQueSeGuarda('codigo_incorrecto');

    return crearLaCuentaYEntrar(contexto, {
      correo: entrada.correo,
      nombre: fila.nombre,
      apellidos: null,
      derivada: fila.derivada,
      negocio: fila.negocio,
      google: null,
      entroCon: 'contrasena',
      aparato: entrada.aparato,
    });
  },
});

// ── Google ───────────────────────────────────────────────────────────────────

export const entradaEntrarConGoogle = z
  .object({
    codigo: z.string().min(1).max(2048),
    // RFC 7636: de 43 a 128 caracteres de este alfabeto.
    verificador: z.string().regex(/^[A-Za-z0-9\-._~]{43,128}$/),
    redireccion: z.enum(VUELTAS_DE_GOOGLE),
    // Entrar no crea cuentas: si no la hay, se dice. Crear sí, con su negocio.
    intencion: z.enum(['entrar', 'crear']),
    negocio: z.string().trim().min(2).max(120).optional(),
    aceptaCondiciones: z.literal(true).optional(),
    aparato: elAparato.optional(),
  })
  .strict();

export type EntradaEntrarConGoogle = z.infer<typeof entradaEntrarConGoogle>;

export const entrarConGoogle = comando<EntradaEntrarConGoogle, SalidaEntrar>({
  nombre: 'entrar_con_google',
  entrada: entradaEntrarConGoogle,
  sinSesion: true,
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const google = contexto.identidadDeGoogle;
    if (google === null) throw new FalloDeAplicacion('todavia_no_disponible');

    let persona;
    try {
      persona = await google.canjear({
        codigo: entrada.codigo,
        verificador: entrada.verificador,
        redireccion: entrada.redireccion,
      });
    } catch (fallo) {
      if (fallo instanceof GoogleNoIdentifica) {
        throw new FalloDeAplicacion('codigo_incorrecto', {
          porque: 'Google no ha confirmado quién eres. Vuelve a pulsar «Continuar con Google».',
        });
      }
      throw fallo;
    }

    // Un correo que Google no ha verificado no demuestra nada: con él se podría
    // entrar en la cuenta de otra persona que use esa dirección.
    if (!persona.correoVerificado) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          'Tu cuenta de Google no tiene el correo verificado. Verifícalo en Google o usa tu correo y tu contraseña.',
      });
    }

    const encontradas = await contexto.sql<
      { persona_id: string; activa: boolean; es_ejemplo: boolean; ya_unida: boolean }[]
    >`select * from estook.persona_por_identidad('google', ${persona.sujeto}, ${persona.correo})`;
    const existente = encontradas[0];

    if (existente !== undefined) {
      // Las de ejemplo tienen la contraseña en el repositorio; las dadas de baja no
      // entran por ninguna puerta. Las dos, con la frase de siempre.
      if (existente.es_ejemplo || !existente.activa) throw new FalloDeAplicacion('no_cuadra');

      // **Se unen solas** (Richi, 16-sep-2026): Google ha verificado que el correo
      // es suyo. Si su negocio exige segundo factor, abrir la sesión lo sigue pidiendo.
      try {
        await contexto.sql`
          select estook.unir_identidad(
            ${existente.persona_id}::uuid, 'google', ${persona.sujeto}, ${persona.correo}
          )
        `;
      } catch (fallo) {
        // Ya está unida a **otra** cuenta de Google con ese mismo correo (Google deja
        // cambiar el correo de una cuenta, y reutilizar direcciones de empresa). No se
        // cambia una por otra sin que lo pida quien entra con la primera.
        if (
          typeof fallo === 'object' &&
          fallo !== null &&
          (fallo as { code?: string }).code === '23505'
        ) {
          throw new FalloDeAplicacion('no_cuadra', {
            porque:
              'Tu cuenta de Estook ya está unida a otra cuenta de Google. Entra con esa, o con tu correo y tu contraseña.',
          });
        }
        throw fallo;
      }

      const debeCambiarla = await contexto.sql<{ debe: boolean }[]>`
        select coalesce(
          (select c.debe_cambiarla from estook.credencial c where c.persona_id = ${existente.persona_id}::uuid),
          false
        ) as debe
      `;

      return abrirLaSesion(
        contexto,
        {
          personaId: existente.persona_id,
          debeCambiarClave: debeCambiarla[0]?.debe === true,
          localDelPin: null,
        },
        'google',
        entrada.aparato,
      );
    }

    if (entrada.intencion === 'entrar') throw new FalloDeAplicacion('sin_cuenta');

    if (entrada.negocio === undefined || entrada.aceptaCondiciones !== true) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['negocio', 'aceptaCondiciones'],
        porque:
          'Para crear tu cuenta hace falta el nombre de tu negocio y aceptar las condiciones.',
      });
    }

    return crearLaCuentaYEntrar(contexto, {
      correo: persona.correo,
      nombre: persona.nombre ?? persona.correo.split('@')[0] ?? 'Sin nombre',
      apellidos: persona.apellidos,
      derivada: null,
      negocio: entrada.negocio,
      google: persona.sujeto,
      entroCon: 'google',
      aparato: entrada.aparato,
    });
  },
});

// ── Lo común: crear y entrar ─────────────────────────────────────────────────

interface CuentaNueva {
  readonly correo: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  /** La contraseña derivada; nula si se entra con Google. */
  readonly derivada: string | null;
  readonly negocio: string;
  /** El sujeto de Google, si se crea con Google. */
  readonly google: string | null;
  readonly entroCon: 'contrasena' | 'google';
  readonly aparato: z.infer<typeof elAparato> | undefined;
}

/**
 * La cuenta, el negocio y la sesión, en la misma transacción.
 *
 * La cuenta nace **pendiente de pago** siempre, y la sesión le lleva a elegir su plan:
 * sin pago no hay app (0048). Con la oferta encendida, sus días de prueba se guardan
 * en la suscripción y los da Stripe **con la tarjeta puesta**; apagar la oferta
 * después no se los quita. Hasta la 0048, con oferta nacía en prueba y sin tarjeta.
 */
async function crearLaCuentaYEntrar(
  contexto: Contexto,
  cuenta: CuentaNueva,
): Promise<SalidaEntrar> {
  const oferta = await laOferta(contexto);
  const base = comoCodigo(cuenta.negocio);

  let creada;
  try {
    creada = await contexto.sql<
      { persona_id: string; organizacion_id: string; local_id: string }[]
    >`
      select * from estook.crear_cuenta_con_negocio(
        ${cuenta.correo}, ${cuenta.nombre}, ${cuenta.apellidos}, ${cuenta.derivada},
        ${cuenta.negocio}, ${base.length >= 2 ? base : 'negocio'},
        null::integer,
        ${cuenta.google === null ? null : 'google'}, ${cuenta.google}
      )
    `;
  } catch (fallo) {
    // Alguien ha creado la cuenta con ese correo mientras tanto.
    if (
      typeof fallo === 'object' &&
      fallo !== null &&
      (fallo as { code?: string }).code === '23505'
    ) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Ese correo ya tiene cuenta. Entra con él.',
      });
    }
    throw fallo;
  }

  const fila = creada[0];
  if (fila === undefined) throw new FalloDeAplicacion('fallo_nuestro');

  if (oferta.activa) {
    await cambiarLaSuscripcion(
      contexto,
      fila.organizacion_id,
      { dias_de_prueba: oferta.dias },
      'crear_cuenta',
      'la oferta de prueba que había al crear la cuenta',
    );
  }

  await contexto.sql`select set_config('estook.persona_id', ${fila.persona_id}, true)`;
  await contexto.sql`
    select estook.anotar(
      ${fila.organizacion_id}::uuid, 'crear_cuenta', 'organizacion', ${fila.organizacion_id},
      ${fila.local_id}::uuid, null,
      ${JSON.stringify({
        con: cuenta.entroCon,
        oferta: oferta.activa ? oferta.dias : null,
      })}::text::jsonb,
      null
    )
  `;

  return abrirLaSesion(
    contexto,
    { personaId: fila.persona_id, debeCambiarClave: false, localDelPin: null },
    cuenta.entroCon,
    cuenta.aparato,
  );
}
