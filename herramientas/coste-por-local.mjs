/**
 * Lo que le cuesta a Estook servir a un local, contándolo todo (decisión 0065).
 *
 *   pnpm coste              pinta las cuentas
 *   pnpm coste:escribir     las deja en docs/coste-por-local.md
 *   pnpm coste:comprobar    falla si el documento no dice lo mismo que estas cuentas
 *
 * **Los precios viven aquí, una sola vez**, cada uno con de dónde sale. El documento
 * lleva las tablas que salen de este fichero, y `verifica` comprueba que cuadran: si
 * alguien cambia un precio o un plan y no repasa las cuentas, se pone en rojo.
 *
 * Tres clases de cifra, y no se mezclan:
 *
 *   COMPROBADO  el precio publicado por el proveedor, mirado el día que se dice
 *   DOCUMENTO   lo que ya decía un documento de Estook (Manifiesto 32, Verifacti)
 *   SUPUESTO    una estimación nuestra, **sin medir**. Se mide al construir Fogón (M22)
 *
 * Son estimaciones en euros con decimales, no dinero de nadie: aquí no aplica la regla
 * de los céntimos en entero.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOCUMENTO = fileURLToPath(new URL('../docs/coste-por-local.md', import.meta.url));
const INICIO =
  '<!-- coste:inicio · sale de herramientas/coste-por-local.mjs, no se edita a mano -->';
const FIN = '<!-- coste:fin -->';

// ── Los precios ─────────────────────────────────────────────────────────────

/** SUPUESTO: un dólar, en euros. Prudente a propósito; se repasa con la factura real. */
const EUROS_POR_DOLAR = 0.9;

/** DOCUMENTO: los planes llevan el IVA dentro (Manifiesto 32). */
const IVA = 0.21;
const PLANES = {
  esencial: { nombre: 'Esencial', conIva: 49, creditos: 300 },
  pro: { nombre: 'Pro', conIva: 79, creditos: 1500 },
  cadena: { nombre: 'Cadena (por local)', conIva: 69, creditos: 1500 },
};

/** COMPROBADO el 30-sep-2026 · platform.claude.com/docs/en/about-claude/pricing · $ por millón de tokens. */
const MODELOS = {
  economico: { nombre: 'Claude Haiku 4.5', entrada: 1, cache: 0.1, salida: 5 },
  grande: { nombre: 'Claude Sonnet 5.5', entrada: 2, cache: 0.2, salida: 10 },
  elMasCaro: { nombre: 'Claude Opus 5.5', entrada: 4, cache: 0.2, salida: 20 },
};

/**
 * SUPUESTO: los tokens de un crédito de Fogón («preguntar algo» es 1 crédito). El
 * resumen del local va cacheado (Manifiesto 20, punto 4). **Es la cifra que más mueve
 * la cuenta y la única que no se puede saber hasta construir Fogón.**
 */
const TOKENS_POR_CREDITO = { cache: 6000, entrada: 1500, salida: 400 };

/** SUPUESTO: cuánto de sus créditos gasta un local normal, y qué parte va al modelo grande en Pro. */
const USO_NORMAL = 0.4;
const PARTE_AL_GRANDE_EN_PRO = 0.3;

/** COMPROBADO el 30-sep-2026 · stripe.com/es/pricing. */
const STRIPE = { normal: 0.015, premium: 0.028, fijo: 0.25, suscripciones: 0.007 };

/** DOCUMENTO: Manifiesto 32, «Lo que cuesta servir a un local». */
const GOOGLE_PLACES = 0.9;
const INFRAESTRUCTURA = 0.55;
const CONECTOR = 0.4;

/** DOCUMENTO: docs/el-precio-de-verifacti.md (propuesta del 21-sep-2026, sin IVA, por NIF). */
const VERIFACTI = { porNifConDiez: 5.59, porNifConCincuenta: 3.71, incluidas: 3000, extra: 0.002 };

/**
 * Lo fijo de cada mes, no depende de cuántos locales haya. En dólares lo que se cobra
 * en dólares. COMPROBADO el 30-sep-2026 salvo lo marcado.
 */
const FIJOS = [
  {
    que: 'Supabase Pro',
    dolares: 25,
    desde: 'vender',
    nota: 'supabase.com/pricing · copia diaria de 7 días',
  },
  {
    que: 'Resend Pro',
    dolares: 20,
    desde: 'vender',
    nota: 'resend.com/pricing · el gratuito da 100 correos al día',
  },
  {
    que: 'Sentry Team',
    dolares: 26,
    desde: 'vender',
    nota: 'sentry.io/pricing · el gratuito es para una sola persona',
  },
  {
    que: 'Cloudflare Pages',
    dolares: 0,
    desde: 'vender',
    nota: 'plan gratuito: 500 publicaciones al mes',
  },
  { que: 'Dominio estook.com', euros: 1.5, desde: 'vender', nota: 'SUPUESTO: unos 18 € al año' },
  {
    que: 'GitHub con el repositorio privado',
    dolares: 0,
    desde: 'vender',
    nota: '2.000 minutos al mes incluidos; después, 0,006 $ el minuto',
  },
  {
    que: 'Recuperación a un punto exacto (Supabase)',
    dolares: 100,
    desde: 'tpv',
    nota: 'supabase.com/pricing · 7 días',
  },
  {
    que: 'Cuenta de desarrollador de Apple',
    dolares: 99 / 12,
    desde: 'tpv',
    nota: '99 $ al año; solo si se publica la cáscara del iPad',
  },
];

/** DOCUMENTO: Manifiesto 32, «Punto de equilibrio». Lo fijo de verdad, con el asesor y lo demás. */
const FIJOS_DEL_EQUILIBRIO = 600;
const MEZCLAS = [
  { nombre: '10 Esencial', esencial: 10, pro: 0 },
  { nombre: '15 mixtos (9 Esencial + 6 Pro)', esencial: 9, pro: 6 },
  { nombre: '50 mixtos (30 Esencial + 20 Pro)', esencial: 30, pro: 20 },
  { nombre: '200 mixtos (120 Esencial + 80 Pro)', esencial: 120, pro: 80 },
];

/** Los tres locales de docs/el-precio-de-verifacti.md, por tickets al día. */
const LOCALES_CON_TPV = [
  { nombre: 'Restaurante de carta', ticketsAlDia: 60 },
  { nombre: 'Bar de tapas con movimiento', ticketsAlDia: 250 },
  { nombre: 'Bar muy ocupado', ticketsAlDia: 500 },
];

// ── Las cuentas ─────────────────────────────────────────────────────────────

const euros = (n) => `${n.toFixed(2).replace('.', ',')} €`;
const porCiento = (n) => `${(n * 100).toFixed(0)} %`;
const sinIva = (plan) => plan.conIva / (1 + IVA);

/** Lo que cuesta un crédito con un modelo, en euros. */
const creditoCon = (m) =>
  ((TOKENS_POR_CREDITO.cache * m.cache +
    TOKENS_POR_CREDITO.entrada * m.entrada +
    TOKENS_POR_CREDITO.salida * m.salida) /
    1_000_000) *
  EUROS_POR_DOLAR;

const ia = {
  // Esencial usa el modelo económico; Pro reparte (Manifiesto 20, «cada tarea, a su modelo»).
  esencial: {
    normal: PLANES.esencial.creditos * USO_NORMAL * creditoCon(MODELOS.economico),
    tope: PLANES.esencial.creditos * creditoCon(MODELOS.economico),
  },
  pro: {
    normal:
      PLANES.pro.creditos *
      USO_NORMAL *
      ((1 - PARTE_AL_GRANDE_EN_PRO) * creditoCon(MODELOS.economico) +
        PARTE_AL_GRANDE_EN_PRO * creditoCon(MODELOS.grande)),
    tope: PLANES.pro.creditos * creditoCon(MODELOS.grande),
    topeConElMasCaro: PLANES.pro.creditos * creditoCon(MODELOS.elMasCaro),
  },
};

const stripe = (plan, tipo) => plan.conIva * (STRIPE[tipo] + STRIPE.suscripciones) + STRIPE.fijo;
const verifacti = (ticketsAlDia, porNif) =>
  porNif + Math.max(0, ticketsAlDia * 30 - VERIFACTI.incluidas) * VERIFACTI.extra;
const base = GOOGLE_PLACES + INFRAESTRUCTURA + CONECTOR;

const fila = (celdas) => `| ${celdas.join(' | ')} |`;
const tabla = (cabecera, filas) =>
  [fila(cabecera), fila(cabecera.map(() => '---')), ...filas.map(fila)].join('\n');

function casos() {
  const lista = [];
  const caso = (nombre, plan, costeIa, tarjeta, tickets) => {
    const v = tickets === undefined ? 0 : verifacti(tickets, VERIFACTI.porNifConDiez);
    const s = stripe(plan, tarjeta);
    const total = costeIa + base + s + v;
    const ingreso = sinIva(plan);
    lista.push([
      nombre,
      euros(ingreso),
      euros(costeIa),
      euros(base),
      euros(s),
      v ? euros(v) : '—',
      `**${euros(total)}**`,
      `**${euros(ingreso - total)} · ${porCiento((ingreso - total) / ingreso)}**`,
    ]);
  };
  caso('Esencial · uso normal', PLANES.esencial, ia.esencial.normal, 'normal');
  caso('Esencial · gasta todos sus créditos', PLANES.esencial, ia.esencial.tope, 'premium');
  caso('Pro sin TPV · uso normal', PLANES.pro, ia.pro.normal, 'normal');
  caso('Pro sin TPV · gasta todos sus créditos', PLANES.pro, ia.pro.tope, 'premium');
  caso(
    'Pro con TPV · restaurante de carta, uso normal',
    PLANES.pro,
    ia.pro.normal,
    'normal',
    LOCALES_CON_TPV[0].ticketsAlDia,
  );
  caso(
    'Pro con TPV · bar de tapas, uso normal',
    PLANES.pro,
    ia.pro.normal,
    'normal',
    LOCALES_CON_TPV[1].ticketsAlDia,
  );
  caso(
    'Pro con TPV · bar muy ocupado, todos sus créditos',
    PLANES.pro,
    ia.pro.tope,
    'premium',
    500,
  );
  caso(
    'Cadena con TPV · por local, uso normal',
    PLANES.cadena,
    ia.pro.normal,
    'normal',
    LOCALES_CON_TPV[0].ticketsAlDia,
  );
  return lista;
}

function fijos() {
  const enEuros = (f) => f.euros ?? f.dolares * EUROS_POR_DOLAR;
  const suma = (desde) =>
    FIJOS.filter((f) => desde.includes(f.desde)).reduce((t, f) => t + enEuros(f), 0);
  const paraVender = suma(['vender']);
  const conTpv = suma(['vender', 'tpv']);
  const lineas = FIJOS.map((f) => [
    f.que,
    euros(enEuros(f)),
    f.desde === 'vender' ? 'Antes del primer cliente de pago' : 'Con Estook TPV',
    f.nota,
  ]);
  const reparto = [1, 10, 50, 200].map((n) => [`${n}`, euros(paraVender / n), euros(conTpv / n)]);
  return { lineas, paraVender, conTpv, reparto };
}

function equilibrio() {
  const coste = {
    esencial: ia.esencial.normal + base + stripe(PLANES.esencial, 'normal'),
    pro: ia.pro.normal + base + stripe(PLANES.pro, 'normal'),
  };
  return MEZCLAS.map((m) => {
    const ingreso = m.esencial * sinIva(PLANES.esencial) + m.pro * sinIva(PLANES.pro);
    const margen = ingreso - m.esencial * coste.esencial - m.pro * coste.pro;
    const resultado = margen - FIJOS_DEL_EQUILIBRIO;
    return [
      m.nombre,
      euros(ingreso),
      euros(margen),
      `**${resultado < 0 ? '−' : '+'}${euros(Math.abs(resultado))}**`,
    ];
  });
}

function bloque() {
  const f = fijos();
  return [
    '### Lo que cuesta un crédito de Fogón',
    '',
    tabla(
      ['Modelo', 'Por crédito', 'Los 300 de Esencial', 'Los 1.500 de Pro'],
      Object.values(MODELOS).map((m) => [
        m.nombre,
        `${(creditoCon(m) * 100).toFixed(2).replace('.', ',')} cént.`,
        euros(300 * creditoCon(m)),
        euros(1500 * creditoCon(m)),
      ]),
    ),
    '',
    '### Lo que cuesta un local al mes, y lo que deja',
    '',
    tabla(
      [
        'Caso',
        'Ingreso sin IVA',
        'IA',
        'Google, servidor y conector',
        'Stripe',
        'Verifacti',
        'Coste total',
        'Margen',
      ],
      casos(),
    ),
    '',
    '### Lo fijo de cada mes',
    '',
    tabla(['Qué', 'Al mes', 'Desde cuándo', 'De dónde sale'], f.lineas),
    '',
    `**Para poder vender: ${euros(f.paraVender)} al mes. Con Estook TPV: ${euros(f.conTpv)} al mes.** Hoy, con todo en planes gratuitos, cero.`,
    '',
    '### Lo fijo, repartido entre los locales',
    '',
    tabla(['Locales de pago', 'Fijo por local, sin TPV', 'Fijo por local, con TPV'], f.reparto),
    '',
    '### El punto de equilibrio',
    '',
    `Con ${euros(FIJOS_DEL_EQUILIBRIO)} fijos al mes, uso normal, sin TPV y **sin el IVA, que no es ingreso**:`,
    '',
    tabla(['Clientes', 'Ingreso sin IVA', 'Margen', 'Resultado'], equilibrio()),
  ].join('\n');
}

// ── Pintar, escribir o comprobar ────────────────────────────────────────────

/** Las celdas y las líneas, sin el relleno que pone el formateador. */
const enLimpio = (texto) =>
  texto
    .split('\n')
    .filter((l) => l.trim() !== '' && !/^\|[\s|:-]+\|$/.test(l.trim()))
    .map((l) =>
      l
        .replace(/\s*\|\s*/g, '|')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('\n');

const modo = process.argv[2];
const cuentas = bloque();

if (modo === '--escribir' || modo === '--comprobar') {
  const texto = readFileSync(DOCUMENTO, 'utf8');
  const a = texto.indexOf(INICIO);
  const b = texto.indexOf(FIN);
  if (a < 0 || b < a) {
    console.error('  docs/coste-por-local.md no tiene las marcas de las cuentas.');
    process.exit(1);
  }
  if (modo === '--escribir') {
    writeFileSync(DOCUMENTO, `${texto.slice(0, a)}${INICIO}\n\n${cuentas}\n\n${texto.slice(b)}`);
    console.log('  Las cuentas, escritas en docs/coste-por-local.md. Pasa el formato después.');
  } else if (enLimpio(texto.slice(a + INICIO.length, b)) !== enLimpio(cuentas)) {
    console.error(
      '  docs/coste-por-local.md no dice lo mismo que las cuentas de herramientas/coste-por-local.mjs.',
    );
    console.error(
      '  Si has cambiado un precio o un plan: pnpm coste:escribir, y repasa el documento.',
    );
    process.exit(1);
  } else {
    console.log('  El coste por local del documento cuadra con las cuentas.');
  }
} else {
  console.log(cuentas);
}
