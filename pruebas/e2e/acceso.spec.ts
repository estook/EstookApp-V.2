import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M4 · aceptacion, punto por punto.
 *
 * «**Terminado cuando:** una camarera con dos locales elige donde esta; un area
 * manager entra en su consolidado; y una llamada a la API pidiendo un local ajeno
 * devuelve `403`.»
 *
 * Los tres estan aqui, y el tercero **se comprueba llamando a la API a pelo**,
 * sin pasar por la pantalla, que es lo que exige la regla 4: «toda regla de
 * acceso se prueba llamando a la API a pelo».
 *
 * Corre contra la API de verdad, levantada por Playwright contra un Postgres
 * efimero. Mismos comandos, mismas politicas de seguridad, mismas puertas.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177';

const CLAVE = 'estook en desarrollo';

async function abrirLimpio(page: Page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('estook.sesion');
    } catch {
      /* en navegacion privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function entrar(page: Page, correo: string, secreto = CLAVE, conPin = false) {
  await abrirLimpio(page);

  await page.getByLabel('Tu correo').fill(correo);
  if (conPin) {
    await page.getByRole('button', { name: 'Prefiero usar mi PIN' }).click();
    await page.getByLabel('Tu PIN').fill(secreto);
  } else {
    await page.getByLabel('Tu contraseña').fill(secreto);
  }
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Se espera a que el servidor conteste. Sin esto, una prueba que navegue justo
  // despues se lleva por delante la peticion y el token no llega a guardarse: la
  // aplicacion se queda en la puerta y el fallo no dice por que.
  //
  // Se espera al **titulo**, no a que el boton desaparezca: React sustituye el
  // nodo del boton al pintarlo como «Entrando…», asi que esperar a que se
  // desenganche se cumple al instante y no espera nada. Costo un rato entenderlo.
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Entra en Estook');
}

/** Lo mismo, pero sin esperar: para las pruebas en las que el login falla. */
async function intentarEntrar(page: Page, correo: string, secreto: string) {
  await abrirLimpio(page);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(secreto);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

// ── La pantalla de entrar ────────────────────────────────────────────────────

test.describe('entrar', () => {
  test('sin haber entrado, lo primero que se ve es la puerta', async ({ page }) => {
    await abrirLimpio(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Entra en Estook');
    // Y nada de la aplicacion: ni rueda, ni barra, ni Panel.
    await expect(page.getByRole('button', { name: 'Abrir la rueda de apps' })).toBeHidden();
  });

  test('con correo y contrasena se entra', async ({ page }) => {
    await entrar(page, 'rosa@ejemplo.estook.com');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Rosa');
  });

  test('**y con el PIN del local tambien**, que es como entra media plantilla', async ({
    page,
  }) => {
    // El PIN se genera al azar en cada arranque de la API de pruebas, asi que se
    // pregunta cual es. Es lo mismo que hace quien lo tiene apuntado en el movil.
    const pin = await pinDe(page, 'sara@ejemplo.estook.com');
    await entrar(page, 'sara@ejemplo.estook.com', pin, true);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Sara');
  });

  test('con la contrasena mal, se dice y **no se borra el correo**', async ({ page }) => {
    await intentarEntrar(page, 'rosa@ejemplo.estook.com', 'esta no es la buena');

    await expect(page.getByText('Ese correo y esa contraseña no cuadran')).toBeVisible();
    // Volver a teclear el correo cada vez es de lo que mas molesta.
    await expect(page.getByLabel('Tu correo')).toHaveValue('rosa@ejemplo.estook.com');
  });

  test('y un correo que no existe da **exactamente el mismo** mensaje', async ({ page }) => {
    // Si dijera cual de las dos cosas falla, cualquiera podria averiguar quien
    // trabaja donde probando direcciones.
    await intentarEntrar(page, 'nadie@ejemplo.estook.com', 'lo que sea');
    await expect(page.getByText('Ese correo y esa contraseña no cuadran')).toBeVisible();
  });

  test('la sesion sobrevive a recargar', async ({ page }) => {
    await entrar(page, 'rosa@ejemplo.estook.com');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Rosa');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Rosa');
  });

  test('y salir la cierra de verdad', async ({ page }) => {
    await entrar(page, 'rosa@ejemplo.estook.com');
    await page.goto(`${APP}#/ajustes`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /^Salir/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Entra en Estook');

    // Y recargar no la resucita.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Entra en Estook');
  });
});

// ── Criterio 1 · la camarera con dos locales ─────────────────────────────────

test.describe('criterio · una camarera con dos locales elige donde esta', () => {
  test('se le pregunta, y no se le elige por ella', async ({ page }) => {
    await entrar(page, 'nuria@ejemplo.estook.com');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('¿Dónde estás hoy?');
    await expect(page.getByRole('button', { name: /Bar Puerto/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bar Playa/ })).toBeVisible();
  });

  test('elige uno y entra en su Panel', async ({ page }) => {
    await entrar(page, 'nuria@ejemplo.estook.com');
    await page.getByRole('button', { name: /Bar Puerto/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Nuria');
    // En el Panel, debajo del saludo, pone donde esta. Se busca en un parrafo a
    // proposito: los selectores de local llevan ese mismo texto dentro de sus
    // opciones, que estan escondidas hasta que se abren.
    await expect(page.locator('main p').filter({ hasText: 'Bar Puerto' }).first()).toBeVisible();
  });

  test('y **no se le vuelve a preguntar** al recargar', async ({ page }) => {
    // El contexto vive en la sesion, no en la pantalla: quien deja Bar Puerto
    // abierto el martes vuelve a Bar Puerto el miercoles.
    await entrar(page, 'nuria@ejemplo.estook.com');
    await page.getByRole('button', { name: /Bar Puerto/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  });

  test('a quien solo tiene uno **no se le pregunta nada**', async ({ page }) => {
    await entrar(page, 'sara@ejemplo.estook.com');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Sara');
  });
});

// ── Criterio 2 · el area manager entra en su consolidado ─────────────────────

test.describe('criterio · un area manager entra en su consolidado', () => {
  test('no entra en un local: entra en su conjunto', async ({ page }) => {
    await entrar(page, 'ignacio@ejemplo.estook.com');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Grupo Costa');
    await expect(page.getByText('3 locales')).toBeVisible();
  });

  test('**no se le pregunta donde esta**, aunque llegue a varios', async ({ page }) => {
    // Es la diferencia con Nuria, y lo que hace que el orden de las seis
    // comprobaciones importe: a quien lleva tres locales no se le pregunta en
    // cual esta, porque la respuesta es «en ninguno y en todos».
    await entrar(page, 'ignacio@ejemplo.estook.com');
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText('¿Dónde estás hoy?');
  });

  test('entra en uno, y tiene la flecha para volver al conjunto', async ({ page }) => {
    await entrar(page, 'ignacio@ejemplo.estook.com');
    await page.getByRole('button', { name: 'Entrar' }).first().click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Ignacio');

    // «Una flecha permanente que devuelve al consolidado desde cualquier
    // pantalla, en un toque» (Roles, 2.2).
    const volver = page.getByRole('button', { name: /Grupo Costa/ });
    await expect(volver).toBeVisible();

    await volver.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Grupo Costa');
  });

  test('y **no vuelve al consolidado solo** al navegar', async ({ page }) => {
    // El fallo que cazo una prueba de `destino.prueba.ts`: como la resolucion se
    // rehace en cada peticion, sin cuidado el area manager que entra en un local
    // volveria al consolidado en el clic siguiente.
    await entrar(page, 'ignacio@ejemplo.estook.com');
    await page.getByRole('button', { name: 'Entrar' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');

    await page.goto(`${APP}#/ajustes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ajustes');

    await page.goto(`${APP}#/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  });
});

// ── Criterio 3 · un local ajeno devuelve 403, llamando a la API a pelo ───────

/** Lo que devuelve la API cuando dice que no. */
interface CuerpoDeError {
  readonly error: { readonly codigo: string };
}

test.describe('criterio · la API a pelo', () => {
  test('sin token no se ve nada', async ({ request }) => {
    const respuesta = await request.get(`${API}/v1/consultas/mis_locales`);
    expect(respuesta.status()).toBe(401);
    expect(((await respuesta.json()) as CuerpoDeError).error.codigo).toBe('sin_sesion');
  });

  test('**la cabecera `x-persona-id` ya no vale**', async ({ request }) => {
    // Era la puerta de M2 y M3, correcta mientras no hubiera login. Si esta
    // prueba deja de pasar, cualquiera puede escribir el identificador de otra
    // persona y ver sus datos.
    const respuesta = await request.get(`${API}/v1/consultas/mis_locales`, {
      headers: { 'x-persona-id': '11111111-1111-1111-1111-111111111111' },
    });
    expect(respuesta.status()).toBe(401);
  });

  test('un token inventado tampoco', async ({ request }) => {
    const respuesta = await request.get(`${API}/v1/consultas/mis_locales`, {
      headers: { authorization: 'Bearer me-lo-acabo-de-inventar' },
    });
    expect(respuesta.status()).toBe(401);
  });

  test('pidiendo un local ajeno devuelve **403**', async ({ request }) => {
    const rosa = await unToken(request, 'rosa@ejemplo.estook.com');
    const ajeno = await unLocalDe(request, 'ignacio@ejemplo.estook.com');

    const respuesta = await request.get(`${API}/v1/consultas/un_local?id=${ajeno}`, {
      headers: { authorization: `Bearer ${rosa}` },
    });

    expect(respuesta.status()).toBe(403);
    const cuerpo = (await respuesta.json()) as CuerpoDeError;
    expect(cuerpo.error.codigo).toBe('local_ajeno');
    // Y no dice si existe: la misma respuesta que para uno inventado.
    expect(JSON.stringify(cuerpo).toLowerCase()).not.toContain('existe pero');
  });

  test('y los permisos sobre un local ajeno, igual', async ({ request }) => {
    const rosa = await unToken(request, 'rosa@ejemplo.estook.com');
    const ajeno = await unLocalDe(request, 'ignacio@ejemplo.estook.com');

    const respuesta = await request.get(`${API}/v1/consultas/mis_permisos?local_id=${ajeno}`, {
      headers: { authorization: `Bearer ${rosa}` },
    });
    expect(respuesta.status()).toBe(403);
  });

  test('la camarera no recibe ni un permiso de importe', async ({ request }) => {
    const sara = await unToken(request, 'sara@ejemplo.estook.com');
    const respuesta = await request.get(`${API}/v1/consultas/quien_soy`, {
      headers: { authorization: `Bearer ${sara}` },
    });

    const cuerpo = (await respuesta.json()) as { datos: { permisos: Record<string, string> } };
    const permisos = Object.keys(cuerpo.datos.permisos);
    expect(permisos.filter((p) => p.startsWith('dato.'))).toEqual([]);
    // Y sus apps de la rueda son cuatro (mas Panel y Fogon, que no son sectores).
    expect(permisos.filter((p) => p.startsWith('app.')).sort()).toEqual([
      'app.calendario',
      'app.carta',
      'app.cuaderno',
      'app.fogon',
      'app.panel',
      'app.servicio',
    ]);
  });
});

// ── Ayudantes que hablan con la API ──────────────────────────────────────────

async function unToken(peticion: APIRequestContext, correo: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `e2e-${correo}-${Date.now()}` },
    data: { correo, contrasena: CLAVE },
  });
  const cuerpo = (await respuesta.json()) as { datos: { token: string } };
  return cuerpo.datos.token;
}

/** Un local de otra persona, para poder pedirlo a pelo y llevarse el 403. */
async function unLocalDe(peticion: APIRequestContext, correo: string): Promise<string> {
  const token = await unToken(peticion, correo);
  const respuesta = await peticion.get(`${API}/v1/consultas/quien_soy`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const cuerpo = (await respuesta.json()) as { datos: { locales: { id: string }[] } };
  const primero = cuerpo.datos.locales[0];
  if (!primero) throw new Error(`${correo} no llega a ningun local`);
  return primero.id;
}

/**
 * El PIN de alguien, generandolo con quien puede darlo.
 *
 * El PIN nace al azar y **no se puede consultar**: lo guardado es su huella. Asi
 * que para probar que se entra con PIN hay que hacer lo mismo que haria quien
 * lleva el local: generar uno nuevo y verlo en pantalla.
 */
async function pinDe(page: Page, correo: string): Promise<string> {
  const peticion = page.request;
  const token = await unToken(peticion, 'rosa@ejemplo.estook.com');
  const cabeceras = { authorization: `Bearer ${token}` };

  const yo = (await (
    await peticion.get(`${API}/v1/consultas/quien_soy`, { headers: cabeceras })
  ).json()) as {
    datos: { local: { id: string } };
  };
  const local = yo.datos.local.id;

  const equipo = (await (
    await peticion.get(`${API}/v1/consultas/quien_tiene_acceso?local_id=${local}`, {
      headers: cabeceras,
    })
  ).json()) as { datos: { correo?: string; personaId: string }[] };

  const persona = equipo.datos.find((acceso) => acceso.correo === correo);
  if (!persona) throw new Error(`${correo} no tiene acceso a ese local`);

  const nuevo = (await (
    await peticion.post(`${API}/v1/comandos/regenerar_pin`, {
      headers: { ...cabeceras, 'x-idempotencia': `pin-nuevo-${correo}-${Date.now()}` },
      data: { persona_id: persona.personaId, local_id: local },
    })
  ).json()) as { datos: { pin: string } };

  return nuevo.datos.pin;
}
