import { puedeEditar, puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLasVistasConAlgo } from '../ganchos/usarLasVistasConAlgo.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { LosAgotados } from './contrato.ts';
import type { MisFichas } from '../escandallos/contrato.ts';
import { BebidasDeLaCarta } from './BebidasDeLaCarta.tsx';
import { Agotados } from './Agotados.tsx';
import { Canales } from './Canales.tsx';
import { Equilibrio } from './Equilibrio.tsx';
import { LaCarta } from './LaCarta.tsx';
import { Menus } from './Menus.tsx';
import { TuZona } from './TuZona.tsx';

/**
 * La app Carta (M9 · 1, decisión 0086): la carta, por secciones o entera, y los
 * canales. M10 · 1 (0102): los agotados, como vista de la carta, y el equilibrio, en
 * Análisis. M10 · 2 (0104): los menús, y tu zona en Análisis. Lo que deja cada plato
 * (con Estook TPV) cae a su cartel en `PantallaDeApp`.
 */
export function Carta({ destino, vista }: { readonly destino: string; readonly vista: string }) {
  // **«Agotados» solo sale si hay alguno, y en rojo** (Richi, 11-nov; 0146, 1.5). Lo dice esta
  // pantalla, que no se desmonta al cambiar de vista; y solo a quien puede marcarlos, que es quien
  // tiene algo que hacer ahí (los demás lo ven marcado en la carta).
  const { permisos } = usarSesion();
  const puedeAgotar = puedeEditar(permisos, 'accion.marcar_agotado');
  const agotados = usarLectura<LosAgotados>('los_agotados', {}, puedeAgotar && destino === 'carta');
  // «Bebidas» (0153): solo a quien ve costes, y si hay algo que se monte solo.
  const veCostes = puedeVer(permisos, 'app.escandallos');
  const fichas = usarLectura<MisFichas>('mis_fichas', {}, veCostes && destino === 'carta');
  const conAgotados =
    !puedeAgotar || agotados.data === undefined
      ? []
      : agotados.data.platos.some((p) => p.agotado !== null)
        ? ['agotados']
        : [];
  const conBebidas =
    fichas.data?.conImportes === true && fichas.data.platos.some((p) => p.seMontaSolo === true)
      ? ['bebidas']
      : [];
  usarLasVistasConAlgo(
    destino !== 'carta'
      ? []
      : (puedeAgotar && agotados.data === undefined) || (veCostes && fichas.data === undefined)
        ? null
        : [...conBebidas, ...conAgotados],
  );
  if (destino === 'canales') return <Canales />;
  if (destino === 'menus') return <Menus />;
  if (destino === 'analisis') return vista === 'tu-zona' ? <TuZona /> : <Equilibrio />;
  if (vista === 'agotados') return <Agotados />;
  if (vista === 'bebidas') return <BebidasDeLaCarta />;
  return <LaCarta />;
}
