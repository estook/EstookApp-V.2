-- 0011 · El vocabulario fiscal
--
-- Modulo M2. Catalogos cerrados, igual que los doce roles de M1: un valor que no
-- este aqui no existe, y anadir uno es una migracion, no una cadena suelta.
--
-- El principio que sostiene todo esto: **un producto no tiene un tipo
-- impositivo**. Lo tiene la operacion. El mismo botellin lleva un impuesto
-- servido en barra y otro vendido en caja para llevar de una tienda.

-- ── Territorio y regimen ──────────────────────────────────────────────────────
-- Canarias no usa IVA: usa IGIC. Ceuta y Melilla usan IPSI. No son variantes del
-- IVA con otro numero: son impuestos distintos, con su normativa propia.

create type estook.territorio_fiscal as enum (
  'peninsula_y_baleares',
  'canarias',
  'ceuta',
  'melilla'
);

create type estook.regimen_fiscal as enum ('iva', 'igic', 'ipsi');

-- ── Los dos ejes de una operacion ────────────────────────────────────────────

-- La distincion **juridica**, y la que mas manda.
create type estook.naturaleza_de_operacion as enum (
  'prestacion_de_servicios',
  'entrega_de_bienes'
);

comment on type estook.naturaleza_de_operacion is
  'Servir una cerveza en barra es prestar un servicio. Vender una caja de cervezas es entregar un bien. Puede cambiar el impuesto aunque el producto sea el mismo.';

-- El **hecho**: donde se consume. Va aparte a proposito, porque «para llevar» no
-- decide por si solo si hay servicio o entrega.
create type estook.modo_de_consumo as enum ('en_el_local', 'para_llevar', 'reparto');

-- ── Clasificacion fiscal del producto ────────────────────────────────────────
-- Reutilizable, y sin tipo pegado: el producto dice QUE ES, no cuanto tributa.

create type estook.categoria_fiscal as enum (
  'alimento',
  'bebida_alcoholica',
  'bebida_refrescante',
  'bebida_refrescante_azucarada',
  'otros'
);

-- ── Actividad del establecimiento ────────────────────────────────────────────
-- En Ceuta y en Melilla **decide el tipo**: un restaurante de un tenedor y uno de
-- tres no tributan igual. En peninsula y Canarias no cambia nada, pero se guarda
-- igual, porque un local puede mudarse de territorio y el dato ya esta.

create type estook.actividad_de_hosteleria as enum (
  'restaurante_un_tenedor',
  'restaurante_dos_o_mas_tenedores',
  'cafe_o_bar_categoria_especial',
  'demas_cafes_y_bares',
  'demas_hosteleria'
);

comment on type estook.actividad_de_hosteleria is
  'Categorias que la normativa de Ceuta y Melilla usa para fijar el tipo del IPSI. El epigrafe del IAE se guarda aparte, como texto.';

-- ── Como viene el precio ─────────────────────────────────────────────────────
-- En una carta de bar, con el impuesto dentro. En una factura a otra empresa,
-- aparte. Cambia como se calcula la base, y por eso hay que saberlo.

create type estook.modo_de_precio as enum ('impuesto_incluido', 'impuesto_aparte');
