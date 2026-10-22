import { comoDinero } from '../almacen/contrato.ts';
import {
  elDiaEnLetra,
  elSuplemento,
  lasSeccionesQueSalen,
  loQueIncluye,
  type UnDiaDelMenu,
  type UnMenu,
} from './contratoDeLosMenus.ts';

/** Lo que mide la imagen: el cuadrado de Instagram. */
const LADO = 1080;

/**
 * La imagen cuadrada del menú, dibujada en el móvil: el nombre y el día en el color del
 * local, cada sección con sus platos, lo que entra y el precio. Si no cabe, la letra
 * baja hasta que cabe.
 */
export async function dibujarLaImagen(
  menu: UnMenu,
  dia: UnDiaDelMenu,
  color: string,
): Promise<File> {
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;
  const pincel = lienzo.getContext('2d');
  if (pincel === null) throw new Error('Este móvil no sabe dibujar la imagen.');
  await document.fonts.ready.catch(() => undefined);

  const secciones = lasSeccionesQueSalen(menu)
    .map((s) => ({
      nombre: s.comoSeLlama.toLocaleUpperCase('es'),
      platos: (dia.platos[s.id] ?? []).map((p) => {
        const suplemento = elSuplemento(p.suplementoCentimos);
        return suplemento === null ? p.nombre : `${p.nombre} (${suplemento})`;
      }),
    }))
    .filter((s) => s.platos.length > 0);
  const lineas = secciones.reduce((n, s) => n + 1 + s.platos.length, 0);
  // La letra de los platos: 46 px, y menos si hay muchos.
  const letra = Math.max(26, Math.min(46, Math.floor(560 / Math.max(lineas, 1) / 1.35)));

  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, LADO, LADO);
  pincel.fillStyle = color;
  pincel.fillRect(0, 0, LADO, 16);
  pincel.textAlign = 'center';
  pincel.textBaseline = 'top';
  const familia = "'Montserrat', 'Segoe UI', system-ui, sans-serif";

  let y = 70;
  pincel.fillStyle = color;
  pincel.font = `800 76px ${familia}`;
  pincel.fillText(menu.nombre, LADO / 2, y, LADO - 120);
  y += 92;
  if (menu.clase === 'del_dia') {
    pincel.fillStyle = '#1f2328';
    pincel.font = `600 36px ${familia}`;
    pincel.fillText(elDiaEnLetra(dia.fecha), LADO / 2, y, LADO - 120);
    y += 64;
  }
  for (const s of secciones) {
    pincel.fillStyle = color;
    pincel.font = `700 ${String(Math.trunc(letra * 0.62))}px ${familia}`;
    pincel.fillText(s.nombre, LADO / 2, y, LADO - 120);
    y += Math.trunc(letra * 0.95);
    pincel.fillStyle = '#1f2328';
    pincel.font = `500 ${String(letra)}px ${familia}`;
    for (const plato of s.platos) {
      pincel.fillText(plato, LADO / 2, y, LADO - 120);
      y += Math.trunc(letra * 1.25);
    }
    y += Math.trunc(letra * 0.4);
  }
  const incluye = loQueIncluye(menu, dia);
  if (incluye !== null) {
    pincel.fillStyle = '#5b636e';
    pincel.font = `500 30px ${familia}`;
    pincel.fillText(incluye, LADO / 2, Math.min(y, LADO - 230), LADO - 120);
  }
  if (menu.precioCentimos !== null) {
    const precio = comoDinero(menu.precioCentimos);
    pincel.font = `800 72px ${familia}`;
    const ancho = pincel.measureText(precio).width + 90;
    const arriba = LADO - 170;
    pincel.fillStyle = color;
    pincel.beginPath();
    pincel.roundRect((LADO - ancho) / 2, arriba, ancho, 110, 55);
    pincel.fill();
    pincel.fillStyle = '#ffffff';
    pincel.fillText(precio, LADO / 2, arriba + 18);
  }

  const blob = await new Promise<Blob>((resolver, fallar) => {
    lienzo.toBlob((hecho) => {
      if (hecho === null) fallar(new Error('No se ha podido hacer la imagen.'));
      else resolver(hecho);
    }, 'image/png');
  });
  return new File(
    [blob],
    `${menu.nombre.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '-')}-${dia.fecha}.png`,
    {
      type: 'image/png',
    },
  );
}
