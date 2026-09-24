-- 0045 · La foto del producto (mejoras antes de M8, entrega V, punto 5)
--
-- «Fotos de producto. Van al mismo almacén que el logo del local, en un cubo suyo
--  y con el mismo camino: se sube por la API, la fila se escribe después de subir
--  y la foto vieja se borra» (docs/mejoras-antes-de-m8.md).
--
-- ── Lo que se guarda aquí, y lo que no ───────────────────────────────────────
--
-- **Las claves de dos objetos del almacén**, no las imágenes ni una dirección. Es
-- la misma decisión que el logo (M5): la imagen no cabe en una fila sin hincharla,
-- y una dirección caduca —los enlaces van firmados y con hora de muerte—, así que
-- guardarla sería guardar algo que mañana no sirve.
--
-- Son dos porque se enseñan en dos tamaños: la foto de 800 px, en la ficha, y la
-- **miniatura** de 160 px, en las listas. Pintar la grande a 40 px en una lista de
-- cincuenta productos sería descargar cuatro megas para ver sellos.
--
-- ── Y de quién es ────────────────────────────────────────────────────────────
--
-- De **la ficha de ese local**, como el resto del producto. Cuando llegue el
-- catálogo maestro de una cadena (M24), la suya se heredará; hoy cada local pone la
-- de su cámara. Sin política nueva: la escribe quien puede editar el producto
-- (`producto_escritura`, 0035), y la lee quien lo ve.

alter table estook.producto
  add column foto_clave text,
  add column miniatura_clave text,
  add column foto_puesta_en timestamptz;

-- Las dos van juntas o no va ninguna: una lista con miniatura y una ficha sin foto
-- serían dos productos distintos para quien los mira.
alter table estook.producto
  add constraint producto_foto_entera check (
    (foto_clave is null) = (miniatura_clave is null)
    and (foto_clave is null) = (foto_puesta_en is null)
  );

comment on column estook.producto.foto_clave is
  'La clave de la foto de 800 px en el almacén (cubo fotos-de-producto), no una dirección: los enlaces se firman al enseñarla (0045).';
comment on column estook.producto.miniatura_clave is
  'La clave de la miniatura de 160 px, la que se pinta en las listas (0045).';
