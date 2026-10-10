import { expect, test, type APIRequestContext } from '@playwright/test';
import { recargarSinQueSeCaiga } from './abrir.ts';
import { API, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * C1 · el chat del equipo, desde la pantalla (decisiones 0071 y 0073).
 *
 * Lo que tiene que funcionar con el dedo: abrir el chat desde la barra de arriba,
 * escribir en «Todo el equipo», responder, reaccionar, que a otro le salga sin leer, y
 * que un privado no lo vea quien lleva el local. Las reglas de quién ve qué, una a una,
 * están en `base-de-datos/pruebas/el-chat.prueba.ts`; aquí, que la pantalla las cumple.
 *
 * Cada vuelta escribe un texto suyo (navegador y hora): la base de pruebas es la misma
 * para los tres navegadores, que corren a la vez.
 */

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

async function losCanales(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; tipo: string; nombre: string; sinLeer: number }[]> {
  await ejecutarEnLaApi(request, token, 'abrir_el_chat', {});
  const respuesta = await request.get(`${API}/v1/consultas/mis_canales`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const cuerpo = (await respuesta.json()) as {
    datos: { canales: { id: string; tipo: string; nombre: string; sinLeer: number }[] };
  };
  return cuerpo.datos.canales;
}

test('se escribe en «Todo el equipo», se responde y se reacciona', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  const marcos = await tokenDe(request, MARCOS);
  const equipo = (await losCanales(request, marcos)).find((c) => c.tipo === 'equipo');
  await ejecutarEnLaApi(request, marcos, 'escribir_en_el_chat', {
    canal_id: equipo?.id,
    texto: `¿Viene el pescado a las nueve? ${marca}`,
  });

  await entrarEnLaApp(page, ROSA);
  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Chat del equipo/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Chat', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /^Todo el equipo/ }).click();

  const conversacion = page.getByRole('region', { name: 'Conversación' });
  await expect(conversacion.getByText(`¿Viene el pescado a las nueve? ${marca}`)).toBeVisible();

  // Responder a Marcos y nombrarle con «@».
  const suyo = conversacion.getByRole('listitem').filter({ hasText: marca }).last();
  await suyo.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Responder' }).click();
  await expect(conversacion.getByText('Respondiendo a Marcos')).toBeVisible();
  const caja = conversacion.getByRole('textbox', { name: 'Escribe un mensaje' });
  await caja.fill('@Mar');
  await conversacion
    .getByRole('list', { name: 'A quién nombrar' })
    .getByRole('button', { name: 'Marcos' })
    .click();
  await caja.pressSequentially(`sí, a las nueve ${marca}`);
  await conversacion.getByRole('button', { name: 'Mandar' }).click();

  const mio = conversacion.getByRole('listitem').filter({ hasText: `sí, a las nueve ${marca}` });
  await expect(mio).toBeVisible();
  await expect(mio.getByText('@Marcos')).toBeVisible();
  // La respuesta lleva dentro a qué responde.
  await expect(mio.getByText(`¿Viene el pescado a las nueve? ${marca}`)).toBeVisible();

  // Reaccionar al de Marcos con 👍, y se ve debajo.
  await suyo.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Reaccionar con 👍' }).click();
  await expect(suyo.getByRole('button', { name: /^👍 1/ })).toBeVisible();
  // Lo que le sale sin leer a Marcos, en la tercera: aquí escriben las tres vueltas a la
  // vez, y escribir da por leído lo de antes.
});

// Repaso de C1 (6-oct): «tarda en enviarse y resulta raro; mejor que salga de golpe y se
// envíe cuando pueda». Con el servidor parado a propósito, el mensaje ya está, con su
// reloj, y la caja vacía; al contestar, el reloj se va y salen sus opciones. Y mientras el
// chat está abierto, la página de debajo no se mueve.
test('lo escrito sale al momento, con su reloj, y se manda por detrás', async ({ page }, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  await entrarEnLaApp(page, SARA);
  await irA(page, 'chat');
  await page.getByRole('button', { name: /^Todo el equipo/ }).click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );

  let soltar: () => void = () => undefined;
  const parado = new Promise<void>((resolver) => {
    soltar = resolver;
  });
  await page.route('**/comandos/escribir_en_el_chat', async (ruta) => {
    await parado;
    await ruta.continue();
  });

  const conversacion = page.getByRole('region', { name: 'Conversación' });
  const caja = conversacion.getByRole('textbox', { name: 'Escribe un mensaje' });
  await caja.fill(`Ya estoy en la puerta ${marca}`);
  await conversacion.getByRole('button', { name: 'Mandar' }).click();
  const mio = conversacion.getByRole('listitem').filter({ hasText: `en la puerta ${marca}` });
  await expect(mio.getByRole('status', { name: 'Mandando' })).toBeVisible();
  await expect(caja).toHaveValue('');

  soltar();
  await expect(mio.getByRole('button', { name: 'Opciones del mensaje' })).toBeVisible();
  await expect(mio.getByRole('status', { name: 'Mandando' })).toHaveCount(0);
  await expect(conversacion.getByText(`Ya estoy en la puerta ${marca}`)).toHaveCount(1);

  // Fuera del chat, la página vuelve a desplazarse.
  await irA(page, '');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
});

test('un privado lo abre cualquiera, y quien lleva el local no lo ve', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  await entrarEnLaApp(page, SARA);
  await irA(page, 'chat');
  await page.getByRole('button', { name: 'Nueva' }).click();
  const hoja = page.getByRole('dialog', { name: 'Conversación nueva' });
  await hoja.getByRole('checkbox', { name: 'Marcos' }).check();
  await hoja.getByRole('button', { name: 'Empezar' }).click();

  const conversacion = page.getByRole('region', { name: 'Conversación' });
  await expect(conversacion.getByRole('heading', { name: 'Marcos', level: 2 })).toBeVisible();
  await conversacion
    .getByRole('textbox', { name: 'Escribe un mensaje' })
    .fill(`¿Me cambias el domingo? ${marca}`);
  await conversacion.getByRole('button', { name: 'Mandar' }).click();
  await expect(conversacion.getByText(`¿Me cambias el domingo? ${marca}`)).toBeVisible();

  // Rosa, que lleva el local, no lo ve en su lista ni buscándolo.
  const rosa = await tokenDe(request, ROSA);
  const suyos = await losCanales(request, rosa);
  expect(suyos.some((c) => c.tipo === 'privado' && c.nombre.includes('Sara'))).toBe(false);
  const buscado = await request.get(
    `${API}/v1/consultas/buscar_en_el_chat?texto=${encodeURIComponent(marca)}`,
    { headers: { authorization: `Bearer ${rosa}` } },
  );
  const encontrados = ((await buscado.json()) as { datos: { encontrados: unknown[] } }).datos
    .encontrados;
  expect(encontrados).toEqual([]);
});

test('un canal nuevo: se corrige, se borra, se retira, se silencia, se añade gente y se sale', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  const nombre = `Barra ${marca.slice(-6)}`;
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'chat');

  // Rosa, que lleva el local, crea «Barra» con Marcos dentro.
  await page.getByRole('button', { name: 'Nueva' }).click();
  const hoja = page.getByRole('dialog', { name: /^(Conversación nueva|Canal nuevo)$/ });
  await hoja.getByRole('radio', { name: /^Canal/ }).click();
  await hoja.getByLabel('Nombre del canal').fill(nombre);
  await hoja.getByRole('checkbox', { name: 'Marcos' }).check();
  await hoja.getByRole('button', { name: 'Crear el canal' }).click();

  const conversacion = page.getByRole('region', { name: 'Conversación' });
  await expect(conversacion.getByRole('heading', { name: nombre, level: 2 })).toBeVisible();
  const canalId = /#\/chat\/([0-9a-f-]{36})$/.exec(page.url())?.[1] ?? '';
  expect(canalId).not.toBe('');

  // Lo suyo: lo escribe, lo corrige (sale «editado») y lo borra para todos.
  const caja = conversacion.getByRole('textbox', { name: 'Escribe un mensaje' });
  await caja.fill(`Hay que pedir hielo ${marca}`);
  await conversacion.getByRole('button', { name: 'Mandar' }).click();
  const suyo = conversacion.getByRole('listitem').filter({ hasText: `hielo ${marca}` });
  // Sale al momento; las opciones, cuando ya ha llegado al servidor.
  await expect(suyo.getByRole('button', { name: 'Opciones del mensaje' })).toBeVisible();

  // A Marcos le sale sin leer, en su lista.
  const marcos = await tokenDe(request, MARCOS);
  const enSuLista = (await losCanales(request, marcos)).find((c) => c.id === canalId);
  expect(enSuLista?.sinLeer).toBe(1);

  await suyo.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Corregir', exact: true }).click();
  await expect(caja).toHaveValue(`Hay que pedir hielo ${marca}`);
  await caja.fill(`Hay que pedir hielo y limones ${marca}`);
  await conversacion.getByRole('button', { name: 'Guardar la corrección' }).click();
  const corregido = conversacion
    .getByRole('listitem')
    .filter({ hasText: `hielo y limones ${marca}` });
  await expect(corregido.getByText('editado')).toBeVisible();

  await corregido.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Borrar para todos' }).click();
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(conversacion.getByText(`hielo y limones ${marca}`)).toHaveCount(0);
  await expect(conversacion.getByText('Se eliminó este mensaje').first()).toBeVisible();

  // Lo de Marcos, Rosa lo retira con su porqué.
  await ejecutarEnLaApi(request, marcos, 'escribir_en_el_chat', {
    canal_id: canalId,
    texto: `Esto no va aquí ${marca}`,
  });
  // Aquí no hay toque al segundo (la API de pruebas lo da de mentira): se recarga.
  await recargarSinQueSeCaiga(page);
  const deMarcos = conversacion.getByRole('listitem').filter({ hasText: `no va aquí ${marca}` });
  await expect(deMarcos).toBeVisible();
  await deMarcos.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Retirar del canal' }).click();
  const retirar = page.getByRole('dialog', { name: 'Retirar el mensaje' });
  await retirar.getByLabel('Por qué').fill('No es de la barra');
  await retirar.getByRole('button', { name: 'Retirar', exact: true }).click();
  await expect(retirar).toHaveCount(0);
  await expect(conversacion.getByText(`no va aquí ${marca}`)).toHaveCount(0);
  await expect(
    conversacion.getByText('Retirado por quien lleva el local', { exact: true }),
  ).toBeVisible();

  // Silenciarlo y meter a Sara, desde las opciones de la conversación.
  await conversacion.getByRole('button', { name: 'Opciones de la conversación' }).click();
  const opciones = page.getByRole('dialog', { name: nombre });
  const silenciar = opciones.getByRole('switch', { name: 'Silenciar' });
  const silenciado = page.waitForResponse((r) => r.url().includes('/silenciar_canal'));
  await silenciar.locator('xpath=..').click();
  expect((await silenciado).status()).toBe(200);
  await expect(silenciar).toBeChecked();
  await opciones.getByRole('button', { name: 'Añadir gente' }).click();
  const anadir = page.getByRole('dialog', { name: `Añadir a ${nombre}` });
  await anadir.getByRole('checkbox', { name: 'Sara' }).check();
  await anadir.getByRole('button', { name: 'Añadir', exact: true }).click();
  await expect(anadir).toHaveCount(0);
  await expect(conversacion.getByText('3 personas')).toBeVisible();

  // Y Marcos se sale: deja de verlo en su lista.
  await ejecutarEnLaApi(request, marcos, 'salir_del_canal', { canal_id: canalId });
  expect((await losCanales(request, marcos)).some((c) => c.id === canalId)).toBe(false);
});

/**
 * El chat con el teclado del iPhone (10-oct). «Al tocar la caja de escribir, el iPhone
 * sube la página entera y la caja queda tapada por la barra de flechas y el teclado.»
 *
 * Un navegador de pruebas no tiene teclado en pantalla: se finge lo que mide el iPhone
 * con el teclado abierto. Lo visible empieza 200 px más abajo (el iPhone ha subido la
 * página) y mide 300 menos, y **`innerHeight` encoge con él**, que es lo que hace el
 * iPhone y lo que dejaba el chat entre las dos barras, fuera de la vista. Lo que tiene
 * que pasar: la cabecera de la conversación arriba de lo visible y la caja de escribir
 * pegada abajo, encima del teclado, como en WhatsApp.
 */
test('con el teclado del iPhone, la cabecera arriba y la caja justo encima del teclado', async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1024, 'El teclado en pantalla es del móvil.');
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'chat');
  await page.getByRole('button', { name: /^Todo el equipo/ }).click();
  const conversacion = page.getByRole('region', { name: 'Conversación' });
  const caja = conversacion.getByRole('textbox', { name: 'Escribe un mensaje' });
  await expect(caja).toBeVisible();

  const alto = page.viewportSize()?.height ?? 0;
  const arriba = 200;
  const visible = alto - 300;
  await page.evaluate(
    ([desde, cuanto]) => {
      const visor = window.visualViewport;
      if (!visor) throw new Error('Sin visualViewport');
      Object.defineProperty(visor, 'offsetTop', { configurable: true, get: () => desde });
      Object.defineProperty(visor, 'height', { configurable: true, get: () => cuanto });
      // Lo del iPhone: innerHeight sigue a lo visible, no a la página.
      Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => cuanto });
    },
    [arriba, visible] as const,
  );
  await caja.click();

  const cabecera = conversacion.getByRole('heading', { level: 2 }).first();
  await expect
    .poll(async () => {
      const deLaCaja = await caja.boundingBox();
      const deLaCabecera = await cabecera.boundingBox();
      if (deLaCaja === null || deLaCabecera === null) return 'sin medir';
      const cajaAbajo = Math.trunc(deLaCaja.y + deLaCaja.height);
      const cabeceraArriba = Math.trunc(deLaCabecera.y);
      return cajaAbajo <= arriba + visible &&
        cajaAbajo > arriba + visible - 90 &&
        cabeceraArriba >= arriba
        ? 'en su sitio'
        : `caja abajo en ${String(cajaAbajo)}, cabecera en ${String(cabeceraArriba)}`;
    })
    .toBe('en su sitio');

  // Y al soltar la caja (el teclado se va), vuelve entre las dos barras.
  await page.evaluate(
    ([cuanto]) => {
      const visor = window.visualViewport;
      if (!visor) throw new Error('Sin visualViewport');
      Object.defineProperty(visor, 'offsetTop', { configurable: true, get: () => 0 });
      Object.defineProperty(visor, 'height', { configurable: true, get: () => cuanto });
      Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => cuanto });
      (document.activeElement as HTMLElement | null)?.blur();
      visor.dispatchEvent(new Event('resize'));
    },
    [alto] as const,
  );
  await expect(page.locator('[data-chat-con-teclado]')).toHaveCount(0);
});
