import { Aviso } from '@estook/ui';
import { hayApi } from '../datos/cliente.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * El aviso de que esto todavia no es de verdad (M3).
 *
 * «`ESTADO.md` no puede afirmar nada que no sea cierto en ese momento», y la
 * pantalla tampoco. Mientras los permisos salgan de un perfil de muestra y no
 * del servidor, la aplicacion **lo dice arriba**, con el rol que esta usando.
 *
 * Sin esto, cualquiera que abriera lo publicado creeria estar viendo su Estook.
 * Y el dia que `mis_permisos` fallara de verdad, la aplicacion seguiria
 * ensenando ocho apps como si nada, que es la peor forma de esconder un fallo.
 *
 * Este componente desaparece en M4, con el login.
 */
export function AvisoDelAndamio() {
  const { perfil } = usarSesion();

  return (
    <div className="mb-e4">
      <Aviso
        tono="atencion"
        titulo={`Estas viendo Estook como ${perfil.nombre}, ${perfil.rol.toLowerCase()}`}
      >
        {hayApi
          ? 'La API responde, pero todavia no hay forma de entrar, asi que los permisos salen de un perfil de muestra. El login llega en M4.'
          : 'Todavia no hay login ni API publicada: los permisos salen de un perfil de muestra, copiado de la matriz de roles de verdad. Se cambia de perfil en Ajustes, y con el cambia la rueda.'}
      </Aviso>
    </div>
  );
}
