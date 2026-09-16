import { Apartado, ElTitular, Lista, PaginaLegal, TITULAR } from './Legal.tsx';

/**
 * La política de privacidad (0042). Dice lo que Estook hace **de verdad** con los
 * datos: si un día se añade un proveedor que los toque, se añade aquí también.
 */
export function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <Apartado titulo="Quién trata tus datos">
        <p>El responsable de los datos de tu cuenta es:</p>
        <ElTitular />
      </Apartado>

      <Apartado titulo="Qué datos guardamos">
        <Lista>
          <li>
            <strong>De tu cuenta:</strong> tu nombre, tu correo y tu contraseña, que se guarda
            cifrada de forma que nadie, tampoco nosotros, puede leerla. Si entras con Google, el
            identificador que Google nos da y tu correo; nunca tu contraseña de Google.
          </li>
          <li>
            <strong>De tu negocio:</strong> lo que tú y tu equipo escribís en Estook: locales,
            productos, proveedores, pedidos, inventarios, horarios, cierres de caja.
          </li>
          <li>
            <strong>Técnicos:</strong> el aparato y el navegador desde el que entras, la dirección
            IP y la hora, para cuidar la seguridad de tu cuenta y para que veas tus sesiones
            abiertas; y los errores de la aplicación, para arreglarlos.
          </li>
        </Lista>
      </Apartado>

      <Apartado titulo="Para qué y con qué base">
        <Lista>
          <li>
            Darte el servicio que has contratado y mantener tu cuenta: es la ejecución del contrato.
          </li>
          <li>
            Protegerla —limitar intentos, avisar de entradas nuevas, registrar quién hace qué— y
            arreglar fallos: es nuestro interés legítimo en que Estook sea seguro.
          </li>
          <li>Cumplir obligaciones legales, como las fiscales cuando haya facturas.</li>
        </Lista>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </Apartado>

      <Apartado titulo="Los datos de tu equipo">
        <p>
          Lo que escribes sobre las personas de tu equipo (nombres, horarios, fichajes) es tuyo: tú
          eres el responsable y Estook lo trata por encargo tuyo, solo para darte el servicio.
        </p>
      </Apartado>

      <Apartado titulo="Quién nos ayuda a darte el servicio">
        <p>Usamos estos proveedores, cada uno solo para lo suyo:</p>
        <Lista>
          <li>Supabase: la base de datos y el servidor, alojados en la Unión Europea.</li>
          <li>Resend: el envío de correos, como el código para crear tu cuenta.</li>
          <li>Google: entrar con tu cuenta de Google, si lo eliges.</li>
          <li>Sentry: el registro de errores de la aplicación.</li>
          <li>GitHub: la publicación de esta web y de la aplicación.</li>
        </Lista>
        <p>
          Cuando alguno trata datos fuera del Espacio Económico Europeo, lo hace con las garantías
          que exige el Reglamento General de Protección de Datos, como las cláusulas contractuales
          tipo de la Comisión Europea.
        </p>
      </Apartado>

      <Apartado titulo="Cuánto tiempo">
        <p>
          Mientras tengas la cuenta. Si te das de baja, borramos tus datos o los anonimizamos, salvo
          lo que la ley nos obligue a guardar y durante el tiempo que nos obligue.
        </p>
      </Apartado>

      <Apartado titulo="Tus derechos">
        <p>
          Puedes pedir ver tus datos, corregirlos, borrarlos, llevártelos, limitar su uso u oponerte
          a él escribiendo a{' '}
          <a className="underline" href={`mailto:${TITULAR.correo}`}>
            {TITULAR.correo}
          </a>
          . Si crees que no los tratamos bien, puedes reclamar ante la Agencia Española de
          Protección de Datos (aepd.es).
        </p>
      </Apartado>

      <Apartado titulo="Cookies">
        <p>
          Estook no usa cookies de publicidad ni de análisis. Para mantenerte dentro, la aplicación
          guarda tu sesión en tu navegador; es imprescindible para que funcione y por eso no te
          pedimos permiso para ello.
        </p>
      </Apartado>

      <Apartado titulo="Cambios">
        <p>
          Si cambiamos algo importante de esta política, te lo diremos dentro de la aplicación antes
          de que se aplique.
        </p>
      </Apartado>
    </PaginaLegal>
  );
}
