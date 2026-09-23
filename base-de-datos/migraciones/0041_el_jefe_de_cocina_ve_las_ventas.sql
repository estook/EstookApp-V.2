-- 0041 · El jefe de cocina ve las ventas (repaso del 23-sep-2026)
--
-- La matriz de 0004 dejaba al jefe de cocina sin `dato.ventas`, siguiendo la tabla
-- 1.6 de «Roles, vistas, auditorías y administración»: «no ve el margen global del
-- negocio, el coste de personal de sala, la facturación…». Richi lo cambió el 23 de
-- septiembre de 2026: «el jefe de cocina ve las ventas, ya que puede necesitar saber
-- qué sale o qué no».
--
-- Se le da **ver**, no editar:
--
--   · Ve las ventas del día, el ticket medio y los cierres de caja, en el Panel y en
--     Servicio. Como ya tenía el precio de compra (0009), con esto le sale también
--     el food cost, que es la cifra de su cocina.
--   · **No cierra la caja**: cerrarla es `puede_editar('dato.ventas')` (0029), y eso
--     sigue siendo del gerente, de quien lleva la sala y de quien esté por encima.
--   · Sigue sin ver la facturación, el coste de personal y el margen global: son
--     otros permisos y no se tocan.
--
-- Como todo lo de la matriz, el gerente se lo puede quitar local a local con un
-- recorte (`recorte_de_permiso`).

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_cocina', 'dato.ventas', 'ver')
on conflict (rol, permiso) do nothing;
