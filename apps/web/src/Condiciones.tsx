import { Apartado, ElTitular, Lista, PaginaLegal, TITULAR } from './Legal.tsx';

/**
 * Las condiciones de uso (0042). Básicas, en lenguaje llano, y fieles a cómo
 * funciona Estook: se crea la cuenta y se paga al empezar; con una oferta de prueba,
 * se pone la tarjeta y el primer cobro es al acabar la prueba (0048). La renovación,
 * cancelar y un cobro que falla, dicho aquí como se dice en la app.
 */
export function Condiciones() {
  return (
    <PaginaLegal titulo="Condiciones de uso">
      <Apartado titulo="Quiénes somos">
        <p>Estook es un servicio de gestión para restaurantes que presta:</p>
        <ElTitular />
      </Apartado>

      <Apartado titulo="Tu cuenta">
        <Lista>
          <li>
            Estook es para negocios y profesionales. Quien crea la cuenta dice que puede contratar
            en nombre de su negocio.
          </li>
          <li>
            Los datos que das tienen que ser ciertos. La cuenta es tuya: guarda tu contraseña y no
            la compartas. Da acceso a tu equipo desde Equipo, cada uno con el suyo.
          </li>
          <li>Eres responsable de lo que se haga con tu cuenta y las de tu equipo.</li>
        </Lista>
      </Apartado>

      <Apartado titulo="Planes, precio y pago">
        <Lista>
          <li>
            Estook se paga por local, al mes o al año, según el plan que elijas. Los precios se
            enseñan antes de pagar y llevan el IVA incluido.
          </li>
          <li>
            Se paga con tarjeta, en la página segura de Stripe, al empezar. Sin un plan pagado no se
            puede usar Estook. <strong>La suscripción se renueva sola</strong> al final de cada
            periodo, al precio de tu plan, hasta que la canceles.
          </li>
          <li>
            La cuota es por local: si abres otro, se suma, y lo de ese periodo se ajusta en la
            siguiente factura. Con dos locales o más en el plan Pro pasas al plan Cadena, que es más
            barato por local.
          </li>
          <li>
            A veces hay una oferta de prueba gratis. Si creas la cuenta mientras está activa, tienes
            esos días de prueba: pones tu tarjeta al empezar,{' '}
            <strong>ese día no se cobra nada</strong> y el primer cobro es el día que acaba la
            prueba. Te avisamos por correo siete días antes. Si cancelas durante la prueba, no se te
            cobra nada.
          </li>
          <li>
            Si un cobro no se puede hacer, te avisamos cada día por correo y tienes siete días para
            arreglarlo. Pasados esos días, la cuenta queda en solo lectura: puedes ver y llevarte
            tus datos, pero no apuntar nada, hasta que se pague. No se borra nada.
          </li>
          <li>Las facturas te llegan por correo y las tienes en Ajustes → Suscripción.</li>
          <li>
            Si cambiamos los precios, te avisamos con al menos 30 días, y el cambio se aplica a
            partir de tu siguiente renovación.
          </li>
        </Lista>
      </Apartado>

      <Apartado titulo="Cancelar">
        <p>
          Puedes cancelar cuando quieras, en Ajustes → Suscripción. Sigues teniendo acceso hasta el
          final del periodo que ya has pagado y no se te vuelve a cobrar; después la cuenta queda en
          solo lectura, con tus datos. Lo ya pagado no se devuelve, salvo que la ley diga otra cosa.
        </p>
      </Apartado>

      <Apartado titulo="Tus datos son tuyos">
        <p>
          Lo que escribes en Estook es tuyo y puedes exportarlo. Lo tratamos solo para darte el
          servicio, como explica la{' '}
          <a className="underline" href="../privacidad/">
            política de privacidad
          </a>
          .
        </p>
      </Apartado>

      <Apartado titulo="Uso aceptable">
        <p>No se puede usar Estook para:</p>
        <Lista>
          <li>nada ilegal, ni para guardar datos de otros sin derecho a hacerlo;</li>
          <li>intentar entrar en cuentas ajenas o saltarse los límites de seguridad;</li>
          <li>sobrecargar el servicio, copiarlo o revenderlo sin nuestro permiso.</li>
        </Lista>
        <p>Si pasa, podemos suspender la cuenta, avisándote cuando sea posible.</p>
      </Apartado>

      <Apartado titulo="El servicio">
        <p>
          Trabajamos para que Estook esté siempre disponible y guarde bien tus datos, pero puede
          haber paradas por mantenimiento o fallos. Estook te ayuda a gestionar, y las decisiones de
          tu negocio —lo que compras, lo que pagas, lo que declaras— siguen siendo tuyas. No
          respondemos de pérdidas indirectas, como beneficios que se dejan de ganar, y nuestra
          responsabilidad se limita a lo que hayas pagado en los últimos doce meses, salvo dolo o
          culpa grave.
        </p>
      </Apartado>

      <Apartado titulo="Cambios en estas condiciones">
        <p>
          Si las cambiamos en algo importante, te avisamos dentro de la aplicación con al menos 30
          días. Si no estás de acuerdo, puedes cancelar antes de que se apliquen.
        </p>
      </Apartado>

      <Apartado titulo="Ley y contacto">
        <p>
          Estas condiciones se rigen por la ley española. Para cualquier duda, escríbenos a{' '}
          <a className="underline" href={`mailto:${TITULAR.correo}`}>
            {TITULAR.correo}
          </a>
          .
        </p>
      </Apartado>
    </PaginaLegal>
  );
}
