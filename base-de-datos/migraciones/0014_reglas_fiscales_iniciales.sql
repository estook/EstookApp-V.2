-- 0014 · Las reglas fiscales iniciales
--
-- Modulo M2. Cada una con su referencia legal, para que se puedan revisar sin
-- leer una linea de codigo.
--
-- ⚠  LO QUE FALTA, Y FALTA A PROPOSITO
--
-- Solo se siembra lo que se puede justificar con una fuente. Donde no hay
-- certeza **no se pone un numero**: se deja el hueco, y el motor devuelve
-- «sin regla» en vez de inventarse un tipo. Un hueco se ve y se arregla; un tipo
-- inventado se cobra mal durante anos sin que nadie lo note.
--
-- Huecos conocidos hoy:
--   · Canarias · entregas de bienes. El IGIC tiene tipo cero para determinados
--     alimentos, ademas del reducido, el general y los incrementados. Hace falta
--     revisar la Ley 20/1991 producto a producto.
--   · Ceuta y Melilla · entregas de bienes. El IPSI grava la produccion y la
--     importacion con sus propias tarifas.
--
-- Mientras esos huecos existan, un local de esos territorios que intente vender
-- como entrega de bienes recibira «sin regla», que es una parada honesta.

insert into estook.regla_fiscal
  (codigo, territorio, regimen, naturaleza, categoria_fiscal, actividad, epigrafe_iae,
   tipo, vigente_desde, referencia_legal, fuente_url)
values

-- ── Peninsula y Baleares · IVA ───────────────────────────────────────────────

-- Servir de comer y de beber para consumir en el acto es un servicio, y va al
-- tipo reducido. Incluye las bebidas: la exclusion de las bebidas alcoholicas
-- esta en el apartado de ENTREGAS de alimentos, no en el de servicios.
('iva-restauracion', 'peninsula_y_baleares', 'iva', 'prestacion_de_servicios', null, null, null,
 0.1000, '1992-12-29',
 'Ley 37/1992 del IVA, art. 91.Uno.2.2 · servicios de hosteleria y restaurantes, y en general el suministro de comidas y bebidas para consumir en el acto',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- Vender comida como bien tambien va al reducido.
('iva-alimento-entregado', 'peninsula_y_baleares', 'iva', 'entrega_de_bienes', 'alimento', null, null,
 0.1000, '1992-12-29',
 'Ley 37/1992 del IVA, art. 91.Uno.1.1 · sustancias o productos utilizados para la nutricion humana',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- Pero las bebidas alcoholicas estan EXPRESAMENTE excluidas de ese reducido,
-- asi que como entrega de bienes van al general. Es el caso que hace que el
-- mismo botellin tribute distinto en la barra y en la tienda.
('iva-alcohol-entregado', 'peninsula_y_baleares', 'iva', 'entrega_de_bienes', 'bebida_alcoholica', null, null,
 0.2100, '1992-12-29',
 'Ley 37/1992 del IVA, art. 90.Uno (tipo general) · las bebidas alcoholicas quedan excluidas del tipo reducido por el art. 91.Uno.1.1',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- Y lo mismo las refrescantes con azucares o edulcorantes anadidos.
('iva-refresco-azucarado-entregado', 'peninsula_y_baleares', 'iva', 'entrega_de_bienes', 'bebida_refrescante_azucarada', null, null,
 0.2100, '2021-01-01',
 'Ley 37/1992 del IVA, art. 91.Uno.1.1 · quedan excluidas las bebidas refrescantes, zumos y gaseosas con azucares o edulcorantes anadidos',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- Una refrescante sin azucares anadidos sigue el tratamiento de alimento.
('iva-refresco-entregado', 'peninsula_y_baleares', 'iva', 'entrega_de_bienes', 'bebida_refrescante', null, null,
 0.1000, '1992-12-29',
 'Ley 37/1992 del IVA, art. 91.Uno.1.1 · sin la exclusion de azucares anadidos',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- Lo que no es ni alimento ni bebida, al general.
('iva-otros-entregado', 'peninsula_y_baleares', 'iva', 'entrega_de_bienes', 'otros', null, null,
 0.2100, '1992-12-29',
 'Ley 37/1992 del IVA, art. 90.Uno · tipo general',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'),

-- ── Canarias · IGIC ──────────────────────────────────────────────────────────
-- Solo el servicio de restauracion, que es el caso ordinario y el unico con
-- respaldo claro. Las entregas de bienes quedan sin regla a proposito.

('igic-restauracion', 'canarias', 'igic', 'prestacion_de_servicios', null, null, null,
 0.0700, '1993-01-01',
 'Ley 20/1991 del IGIC · tipo general aplicable a las prestaciones de servicios de restauracion',
 'https://www.boe.es/buscar/act.php?id=BOE-A-1991-14463'),

-- ── Ceuta · IPSI ─────────────────────────────────────────────────────────────
-- El 4 % es el tipo general de las prestaciones de servicios. La ordenanza
-- contempla un reducido del 2 % para determinada restauracion.

('ipsi-ceuta-servicios', 'ceuta', 'ipsi', 'prestacion_de_servicios', null, null, null,
 0.0400, '2000-01-01',
 'Ordenanza fiscal del IPSI de la Ciudad Autonoma de Ceuta · tipo general de prestaciones de servicios',
 null),

('ipsi-ceuta-un-tenedor', 'ceuta', 'ipsi', 'prestacion_de_servicios', null, 'restaurante_un_tenedor', null,
 0.0200, '2000-01-01',
 'Ordenanza fiscal del IPSI de Ceuta · tipo reducido para restaurantes de un tenedor',
 null),

('ipsi-ceuta-bares-673-2', 'ceuta', 'ipsi', 'prestacion_de_servicios', null, 'demas_cafes_y_bares', '673.2',
 0.0200, '2000-01-01',
 'Ordenanza fiscal del IPSI de Ceuta · tipo reducido para los demas bares y cafeterias del epigrafe IAE 673.2',
 null),

('ipsi-ceuta-restauracion-677-9', 'ceuta', 'ipsi', 'prestacion_de_servicios', null, 'demas_hosteleria', '677.9',
 0.0200, '2000-01-01',
 'Ordenanza fiscal del IPSI de Ceuta · tipo reducido para determinadas actividades de restauracion del epigrafe IAE 677.9',
 null),

-- ── Melilla · IPSI ───────────────────────────────────────────────────────────
-- Datos publicados por la Ciudad Autonoma de Melilla, actualizados el 28 de
-- enero de 2026, aportados por Richi tras revisarlos.

('ipsi-melilla-servicios', 'melilla', 'ipsi', 'prestacion_de_servicios', null, null, null,
 0.0400, '2026-01-28',
 'Normativa del IPSI de la Ciudad Autonoma de Melilla, actualizada el 28-01-2026 · servicios generales',
 null),

('ipsi-melilla-un-tenedor', 'melilla', 'ipsi', 'prestacion_de_servicios', null, 'restaurante_un_tenedor', null,
 0.0100, '2026-01-28',
 'Normativa del IPSI de Melilla (28-01-2026) · restaurante de un tenedor y demas cafes y bares',
 null),

('ipsi-melilla-cafes-y-bares', 'melilla', 'ipsi', 'prestacion_de_servicios', null, 'demas_cafes_y_bares', null,
 0.0100, '2026-01-28',
 'Normativa del IPSI de Melilla (28-01-2026) · restaurante de un tenedor y demas cafes y bares',
 null),

('ipsi-melilla-dos-o-mas-tenedores', 'melilla', 'ipsi', 'prestacion_de_servicios', null, 'restaurante_dos_o_mas_tenedores', null,
 0.0200, '2026-01-28',
 'Normativa del IPSI de Melilla (28-01-2026) · restaurantes de dos o mas tenedores',
 null),

('ipsi-melilla-categoria-especial', 'melilla', 'ipsi', 'prestacion_de_servicios', null, 'cafe_o_bar_categoria_especial', null,
 0.0200, '2026-01-28',
 'Normativa del IPSI de Melilla (28-01-2026) · cafes y bares de categoria especial',
 null),

('ipsi-melilla-demas-hosteleria', 'melilla', 'ipsi', 'prestacion_de_servicios', null, 'demas_hosteleria', null,
 0.0200, '2026-01-28',
 'Normativa del IPSI de Melilla (28-01-2026) · demas servicios de hosteleria',
 null);
