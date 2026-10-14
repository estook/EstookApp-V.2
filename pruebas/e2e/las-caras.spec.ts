import { expect, test, type APIRequestContext } from '@playwright/test';
import { ejecutarEnLaApi, tokenDe } from './en-la-app.ts';

/**
 * Las caras del equipo (la experiencia, 0083; las bases firmes, 0084).
 *
 * La foto de una persona se pone y se quita (`poner_foto_de_persona` y
 * `quitar_foto_de_persona`, de la 0083, que ninguna prueba ejecutaba: lo destapó la
 * cobertura del catálogo el 14-oct), y **sale a su equipo en `las_caras`**, la consulta
 * única con la que la app pinta cada cara con foto: en el chat, las incidencias, Equipo
 * y «Mi turno». Y a nadie de fuera.
 */
const API = 'http://localhost:5177/api';
const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';
const ELENA = 'elena@ejemplo.estook.com';

/** Una foto JPG de un píxel: lo justo para que el servidor vea que es una foto. */
const UN_PIXEL =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function lasCarasDe(peticion: APIRequestContext, token: string) {
  const respuesta = await peticion.get(`${API}/v1/consultas/las_caras`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(respuesta.status()).toBe(200);
  return ((await respuesta.json()) as { datos: { caras: { personaId: string; foto: string }[] } })
    .datos.caras;
}

test('la foto de alguien se pone, sale en las caras de su equipo y no fuera, y se quita', async ({
  request,
}, info) => {
  // Una vez: las tres pasadas tocarían la cara de la misma persona a la vez.
  test.skip(info.project.name !== 'escritorio', 'Una vez basta: es la API.');

  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  const elena = await tokenDe(request, ELENA);
  const quien = await request.get(`${API}/v1/consultas/quien_soy`, {
    headers: { authorization: `Bearer ${marcos}` },
  });
  const marcosId = ((await quien.json()) as { datos: { personaId: string } }).datos.personaId;

  // Se la pone quien da accesos en su local.
  await ejecutarEnLaApi(request, rosa, 'poner_foto_de_persona', {
    persona_id: marcosId,
    tipo: 'image/jpeg',
    foto: UN_PIXEL,
  });

  // Su equipo la ve; la directora de otra organización, no.
  expect((await lasCarasDe(request, rosa)).some((c) => c.personaId === marcosId)).toBe(true);
  expect((await lasCarasDe(request, elena)).some((c) => c.personaId === marcosId)).toBe(false);

  // Y la quita él mismo, que también puede: es su cara.
  await ejecutarEnLaApi(request, marcos, 'quitar_foto_de_persona', { persona_id: marcosId });
  expect((await lasCarasDe(request, rosa)).some((c) => c.personaId === marcosId)).toBe(false);
});
