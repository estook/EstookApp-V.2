-- 0021 · El catalogo de referencia
--
-- Modulo M5. Los productos y las recetas que Estook **propone** cuando alguien
-- va a crear los suyos.
--
-- ── Por que es una migracion y no una semilla ────────────────────────────────
--
-- Porque no es un ejemplo: es producto. Igual que los doce roles (0002), el
-- catalogo de permisos (0003) y las reglas fiscales (0014), esto tiene que
-- existir en cualquier base de datos donde funcione Estook, se hayan sembrado
-- datos de ejemplo o no. Una semilla se puede no aplicar; una migracion, no.
--
-- ── Que es y que no es ───────────────────────────────────────────────────────
--
-- Es un **diccionario**. Escribes «aceite de oliva» al crear un producto y salen
-- las variantes con su formato, su factor, su rendimiento, su categoria y sus
-- alergenos ya puestos: «un producto bien definido en quince segundos en vez de
-- en dos minutos, y sin el error clasico de confundir la unidad de compra con la
-- de uso» (Manifiesto 8).
--
-- **No es un inventario.** Ninguna de estas filas es de nadie, ninguna cuenta
-- para nada y ninguna aparece en la camara de un local. «Estook no mete nada en
-- tu inventario. Te lo rellena cuando tu se lo pides.»
--
-- ── De donde salen las cifras ────────────────────────────────────────────────
--
-- El **factor** es aritmetica del formato: una garrafa de 5 l son 5.000 ml, una
-- caja de 12 unidades son 12 ud. No hay nada que discutir ahi.
--
-- El **rendimiento** es lo que queda despues de limpiar, pelar o descongelar, y
-- son los valores habituales del sector: una cebolla pierde en torno al 15 % al
-- pelarla, un puerro casi la mitad, una merluza entera algo mas del 40 % entre
-- cabeza, espina y piel. **Son una propuesta, no una verdad**: cada cocina tiene
-- su despiece, y la ficha del producto se puede corregir. Por eso el alta enseña
-- la cuenta hecha —«caja de 3 kg ÷ 3.000 g × 0,85 = 0,0039 €/g»— en vez de
-- guardar el numero en silencio (Auditoria 1.2).
--
-- Los que no se limpian —aceites, bebidas, conservas, secos— van a 1, que es
-- decir «lo que compras es lo que usas».

insert into estook.producto_de_referencia
  (codigo, nombre, categoria, formato, factor, unidad_de_uso, rendimiento, categoria_fiscal, alergenos, sinonimos)
values

-- ── Aceites y grasas ─────────────────────────────────────────────────────────
('aceite-oliva-virgen-extra-5l',   'Aceite de oliva virgen extra', 'Aceites y grasas', 'Garrafa de 5 l',   5000, 'ml', 1,      'alimento', '{}', '{aove,"oliva virgen extra"}'),
('aceite-oliva-suave-5l',          'Aceite de oliva suave',        'Aceites y grasas', 'Garrafa de 5 l',   5000, 'ml', 1,      'alimento', '{}', '{"oliva 0,4"}'),
('aceite-girasol-5l',              'Aceite de girasol',            'Aceites y grasas', 'Garrafa de 5 l',   5000, 'ml', 1,      'alimento', '{}', '{}'),
('aceite-girasol-alto-oleico-10l', 'Aceite de girasol alto oleico','Aceites y grasas', 'Garrafa de 10 l', 10000, 'ml', 1,      'alimento', '{}', '{"aceite de freir"}'),
('mantequilla-bloque-1kg',         'Mantequilla',                  'Aceites y grasas', 'Bloque de 1 kg',   1000, 'g',  1,      'alimento', '{lacteos}', '{}'),
('manteca-cerdo-1kg',              'Manteca de cerdo',             'Aceites y grasas', 'Tarrina de 1 kg',  1000, 'g',  1,      'alimento', '{}', '{}'),
('margarina-1kg',                  'Margarina',                    'Aceites y grasas', 'Tarrina de 1 kg',  1000, 'g',  1,      'alimento', '{}', '{}'),

-- ── Arroces, pastas y cereales ───────────────────────────────────────────────
('arroz-redondo-5kg',        'Arroz redondo',        'Arroces y pastas', 'Saco de 5 kg',   5000, 'g', 1, 'alimento', '{}', '{"arroz bomba de paella"}'),
('arroz-bomba-1kg',          'Arroz bomba',          'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{}', '{}'),
('arroz-largo-5kg',          'Arroz largo',          'Arroces y pastas', 'Saco de 5 kg',   5000, 'g', 1, 'alimento', '{}', '{basmati}'),
('espagueti-5kg',            'Espaguetis',           'Arroces y pastas', 'Caja de 5 kg',   5000, 'g', 1, 'alimento', '{gluten}', '{spaghetti}'),
('macarron-5kg',             'Macarrones',           'Arroces y pastas', 'Caja de 5 kg',   5000, 'g', 1, 'alimento', '{gluten}', '{plumas}'),
('tallarin-3kg',             'Tallarines',           'Arroces y pastas', 'Caja de 3 kg',   3000, 'g', 1, 'alimento', '{gluten,huevos}', '{}'),
('fideo-cabello-1kg',        'Fideo fino',           'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{gluten}', '{"cabello de angel"}'),
('fideo-gordo-1kg',          'Fideo gordo',          'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{gluten}', '{"fideua"}'),
('lasana-placa-2kg',         'Placas de lasaña',     'Arroces y pastas', 'Caja de 2 kg',   2000, 'g', 1, 'alimento', '{gluten,huevos}', '{}'),
('cuscus-1kg',               'Cuscús',               'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{gluten}', '{}'),
('quinoa-1kg',               'Quinoa',               'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{}', '{}'),
('avena-copos-1kg',          'Copos de avena',       'Arroces y pastas', 'Paquete de 1 kg',1000, 'g', 1, 'alimento', '{gluten}', '{}'),

-- ── Harinas y panaderia ──────────────────────────────────────────────────────
('harina-trigo-25kg',     'Harina de trigo',       'Harinas y panadería', 'Saco de 25 kg',  25000, 'g', 1, 'alimento', '{gluten}', '{"harina floja"}'),
('harina-fuerza-25kg',    'Harina de fuerza',      'Harinas y panadería', 'Saco de 25 kg',  25000, 'g', 1, 'alimento', '{gluten}', '{}'),
('harina-tempura-1kg',    'Harina de tempura',     'Harinas y panadería', 'Paquete de 1 kg', 1000, 'g', 1, 'alimento', '{gluten}', '{}'),
('harina-garbanzo-1kg',   'Harina de garbanzo',    'Harinas y panadería', 'Paquete de 1 kg', 1000, 'g', 1, 'alimento', '{}', '{}'),
('pan-rallado-5kg',       'Pan rallado',           'Harinas y panadería', 'Saco de 5 kg',    5000, 'g', 1, 'alimento', '{gluten}', '{empanar}'),
('panko-1kg',             'Panko',                 'Harinas y panadería', 'Paquete de 1 kg', 1000, 'g', 1, 'alimento', '{gluten}', '{}'),
('levadura-fresca-500g',  'Levadura fresca',       'Harinas y panadería', 'Bloque de 500 g',  500, 'g', 1, 'alimento', '{}', '{"levadura de panadero"}'),
('levadura-quimica-500g', 'Levadura química',      'Harinas y panadería', 'Bote de 500 g',    500, 'g', 1, 'alimento', '{}', '{"royal","impulsor"}'),
('masa-pizza-bola-250g',  'Bola de masa de pizza', 'Harinas y panadería', 'Caja de 20 bolas',   20, 'ud',1, 'alimento', '{gluten}', '{}'),
('masa-hojaldre-1kg',     'Masa de hojaldre',      'Harinas y panadería', 'Plancha de 1 kg', 1000, 'g', 1, 'alimento', '{gluten,lacteos}', '{}'),
('masa-brick-500g',       'Pasta brick',           'Harinas y panadería', 'Paquete de 500 g', 500, 'g', 1, 'alimento', '{gluten}', '{"pasta filo"}'),
('pan-barra-rustica',     'Barra rústica',         'Harinas y panadería', 'Bandeja de 20 ud',   20, 'ud',1, 'alimento', '{gluten}', '{barra}'),
('pan-mollete',           'Mollete',               'Harinas y panadería', 'Bolsa de 30 ud',     30, 'ud',1, 'alimento', '{gluten}', '{}'),
('pan-chapata',           'Chapata',               'Harinas y panadería', 'Bandeja de 24 ud',   24, 'ud',1, 'alimento', '{gluten}', '{ciabatta}'),
('pan-hamburguesa',       'Pan de hamburguesa',    'Harinas y panadería', 'Bolsa de 48 ud',     48, 'ud',1, 'alimento', '{gluten,sesamo}', '{bollo}'),
('pan-molde-blanco',      'Pan de molde',          'Harinas y panadería', 'Bolsa de 24 rebanadas', 24,'ud',1,'alimento','{gluten,soja}','{"pan bimbo"}'),
('picos-rosquilletas-1kg','Picos de pan',          'Harinas y panadería', 'Bolsa de 1 kg',   1000, 'g', 1, 'alimento', '{gluten}', '{regañás}'),

-- ── Verduras y hortalizas ────────────────────────────────────────────────────
('cebolla-blanca-10kg',   'Cebolla blanca',      'Verduras y hortalizas', 'Saco de 10 kg', 10000, 'g', 0.8500, 'alimento', '{}', '{}'),
('cebolla-morada-5kg',    'Cebolla morada',      'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.8500, 'alimento', '{}', '{"cebolla roja"}'),
('cebolleta-manojo',      'Cebolleta',           'Verduras y hortalizas', 'Manojo',            1, 'ud',0.7000, 'alimento', '{}', '{}'),
('ajo-cabeza-1kg',        'Ajo',                 'Verduras y hortalizas', 'Malla de 1 kg',  1000, 'g', 0.7500, 'alimento', '{}', '{}'),
('patata-agria-20kg',     'Patata agria',        'Verduras y hortalizas', 'Saco de 20 kg', 20000, 'g', 0.8000, 'alimento', '{}', '{"patata de freir"}'),
('patata-monalisa-20kg',  'Patata monalisa',     'Verduras y hortalizas', 'Saco de 20 kg', 20000, 'g', 0.8000, 'alimento', '{}', '{}'),
('tomate-pera-10kg',      'Tomate pera',         'Verduras y hortalizas', 'Caja de 10 kg', 10000, 'g', 0.9500, 'alimento', '{}', '{}'),
('tomate-rama-5kg',       'Tomate en rama',      'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.9500, 'alimento', '{}', '{}'),
('tomate-cherry-500g',    'Tomate cherry',       'Verduras y hortalizas', 'Tarrina de 500 g',500, 'g', 0.9800, 'alimento', '{}', '{}'),
('pimiento-rojo-5kg',     'Pimiento rojo',       'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.8000, 'alimento', '{}', '{}'),
('pimiento-verde-5kg',    'Pimiento verde',      'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.8000, 'alimento', '{}', '{"pimiento italiano"}'),
('pimiento-padron-1kg',   'Pimiento de Padrón',  'Verduras y hortalizas', 'Bolsa de 1 kg',  1000, 'g', 0.9500, 'alimento', '{}', '{}'),
('calabacin-5kg',         'Calabacín',           'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.9000, 'alimento', '{}', '{}'),
('berenjena-5kg',         'Berenjena',           'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.8500, 'alimento', '{}', '{}'),
('zanahoria-5kg',         'Zanahoria',           'Verduras y hortalizas', 'Bolsa de 5 kg',  5000, 'g', 0.8500, 'alimento', '{}', '{}'),
('puerro-manojo',         'Puerro',              'Verduras y hortalizas', 'Manojo de 3 ud',    3, 'ud',0.6000, 'alimento', '{}', '{}'),
('apio-manojo',           'Apio',                'Verduras y hortalizas', 'Manojo',            1, 'ud',0.7000, 'alimento', '{apio}', '{}'),
('lechuga-romana-12ud',   'Lechuga romana',      'Verduras y hortalizas', 'Caja de 12 ud',    12, 'ud',0.7500, 'alimento', '{}', '{}'),
('lechuga-iceberg-8ud',   'Lechuga iceberg',     'Verduras y hortalizas', 'Caja de 8 ud',      8, 'ud',0.8000, 'alimento', '{}', '{}'),
('mezclum-1kg',           'Mezcla de brotes',    'Verduras y hortalizas', 'Bolsa de 1 kg',  1000, 'g', 1,      'alimento', '{}', '{mezclum,"brotes tiernos"}'),
('rucula-500g',           'Rúcula',              'Verduras y hortalizas', 'Bolsa de 500 g',  500, 'g', 1,      'alimento', '{}', '{}'),
('espinaca-fresca-1kg',   'Espinaca fresca',     'Verduras y hortalizas', 'Bolsa de 1 kg',  1000, 'g', 0.9000, 'alimento', '{}', '{}'),
('acelga-manojo',         'Acelga',              'Verduras y hortalizas', 'Manojo',            1, 'ud',0.7000, 'alimento', '{}', '{}'),
('brocoli-5kg',           'Brócoli',             'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.7000, 'alimento', '{}', '{}'),
('coliflor-ud',           'Coliflor',            'Verduras y hortalizas', 'Unidad',            1, 'ud',0.6000, 'alimento', '{}', '{}'),
('champinon-3kg',         'Champiñón',           'Verduras y hortalizas', 'Caja de 3 kg',   3000, 'g', 0.9000, 'alimento', '{}', '{}'),
('seta-ostra-2kg',        'Seta de ostra',       'Verduras y hortalizas', 'Caja de 2 kg',   2000, 'g', 0.9000, 'alimento', '{}', '{gírgola}'),
('judia-verde-5kg',       'Judía verde',         'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.9000, 'alimento', '{}', '{}'),
('guisante-congelado-2kg','Guisante',            'Verduras y hortalizas', 'Bolsa de 2 kg',  2000, 'g', 1,      'alimento', '{}', '{}'),
('pepino-5kg',            'Pepino',              'Verduras y hortalizas', 'Caja de 5 kg',   5000, 'g', 0.8500, 'alimento', '{}', '{}'),
('calabaza-ud',           'Calabaza',            'Verduras y hortalizas', 'Unidad de 3 kg',  3000,'g', 0.7000, 'alimento', '{}', '{}'),
('alcachofa-10kg',        'Alcachofa',           'Verduras y hortalizas', 'Caja de 10 kg', 10000, 'g', 0.4000, 'alimento', '{}', '{}'),
('esparrago-verde-manojo','Espárrago verde',     'Verduras y hortalizas', 'Manojo de 500 g', 500, 'g', 0.7000, 'alimento', '{}', '{trigueros}'),
('maiz-dulce-2kg',        'Maíz dulce',          'Verduras y hortalizas', 'Bote de 2 kg',   2000, 'g', 0.6500, 'alimento', '{}', '{}'),
('jengibre-1kg',          'Jengibre',            'Verduras y hortalizas', 'Bolsa de 1 kg',  1000, 'g', 0.8000, 'alimento', '{}', '{}'),
('perejil-manojo',        'Perejil',             'Verduras y hortalizas', 'Manojo',            1, 'ud',0.6000, 'alimento', '{}', '{}'),
('cilantro-manojo',       'Cilantro',            'Verduras y hortalizas', 'Manojo',            1, 'ud',0.6000, 'alimento', '{}', '{}'),
('albahaca-maceta',       'Albahaca fresca',     'Verduras y hortalizas', 'Maceta',            1, 'ud',0.5000, 'alimento', '{}', '{}'),
('menta-manojo',          'Hierbabuena',         'Verduras y hortalizas', 'Manojo',            1, 'ud',0.5000, 'alimento', '{}', '{menta}'),
('romero-manojo',         'Romero fresco',       'Verduras y hortalizas', 'Manojo',            1, 'ud',0.5000, 'alimento', '{}', '{}'),
('tomillo-manojo',        'Tomillo fresco',      'Verduras y hortalizas', 'Manojo',            1, 'ud',0.5000, 'alimento', '{}', '{}'),

-- ── Frutas ───────────────────────────────────────────────────────────────────
('limon-10kg',       'Limón',      'Frutas', 'Caja de 10 kg', 10000, 'g', 0.4500, 'alimento', '{}', '{}'),
('lima-2kg',         'Lima',       'Frutas', 'Caja de 2 kg',   2000, 'g', 0.4000, 'alimento', '{}', '{}'),
('naranja-zumo-15kg','Naranja de zumo','Frutas','Caja de 15 kg',15000,'g', 0.4500, 'alimento', '{}', '{}'),
('naranja-mesa-10kg','Naranja de mesa','Frutas','Caja de 10 kg',10000,'g', 0.7000, 'alimento', '{}', '{}'),
('manzana-golden-10kg','Manzana golden','Frutas','Caja de 10 kg',10000,'g',0.8500, 'alimento', '{}', '{}'),
('platano-10kg',     'Plátano',    'Frutas', 'Caja de 10 kg', 10000, 'g', 0.6500, 'alimento', '{}', '{banana}'),
('pera-conferencia-10kg','Pera',   'Frutas', 'Caja de 10 kg', 10000, 'g', 0.8500, 'alimento', '{}', '{}'),
('fresa-2kg',        'Fresa',      'Frutas', 'Caja de 2 kg',   2000, 'g', 0.9000, 'alimento', '{}', '{fresón}'),
('melon-ud',         'Melón',      'Frutas', 'Unidad de 2,5 kg',2500,'g', 0.5500, 'alimento', '{}', '{}'),
('sandia-ud',        'Sandía',     'Frutas', 'Unidad de 5 kg',  5000,'g', 0.5500, 'alimento', '{}', '{}'),
('pina-ud',          'Piña',       'Frutas', 'Unidad de 1,8 kg',1800,'g', 0.5000, 'alimento', '{}', '{ananá}'),
('aguacate-4kg',     'Aguacate',   'Frutas', 'Caja de 4 kg',   4000, 'g', 0.7000, 'alimento', '{}', '{}'),
('mango-4kg',        'Mango',      'Frutas', 'Caja de 4 kg',   4000, 'g', 0.6500, 'alimento', '{}', '{}'),
('uva-5kg',          'Uva',        'Frutas', 'Caja de 5 kg',   5000, 'g', 0.9500, 'alimento', '{}', '{}'),
('melocoton-10kg',   'Melocotón',  'Frutas', 'Caja de 10 kg', 10000, 'g', 0.8500, 'alimento', '{}', '{}'),

-- ── Carnes ───────────────────────────────────────────────────────────────────
('pollo-entero-ud',        'Pollo entero',          'Carnes', 'Unidad de 1,8 kg', 1800, 'g', 0.7000, 'alimento', '{}', '{}'),
('pechuga-pollo-5kg',      'Pechuga de pollo',      'Carnes', 'Caja de 5 kg',     5000, 'g', 0.9500, 'alimento', '{}', '{}'),
('muslo-pollo-5kg',        'Muslo de pollo',        'Carnes', 'Caja de 5 kg',     5000, 'g', 0.7500, 'alimento', '{}', '{contramuslo}'),
('alita-pollo-5kg',        'Alitas de pollo',       'Carnes', 'Caja de 5 kg',     5000, 'g', 0.8500, 'alimento', '{}', '{}'),
('solomillo-cerdo-3kg',    'Solomillo de cerdo',    'Carnes', 'Caja de 3 kg',     3000, 'g', 0.9500, 'alimento', '{}', '{}'),
('lomo-cerdo-5kg',         'Lomo de cerdo',         'Carnes', 'Pieza de 5 kg',    5000, 'g', 0.9000, 'alimento', '{}', '{cinta}'),
('secreto-iberico-3kg',    'Secreto ibérico',       'Carnes', 'Caja de 3 kg',     3000, 'g', 0.9500, 'alimento', '{}', '{}'),
('presa-iberica-3kg',      'Presa ibérica',         'Carnes', 'Caja de 3 kg',     3000, 'g', 0.9500, 'alimento', '{}', '{}'),
('panceta-cerdo-3kg',      'Panceta',               'Carnes', 'Pieza de 3 kg',    3000, 'g', 0.9000, 'alimento', '{}', '{}'),
('costilla-cerdo-5kg',     'Costilla de cerdo',     'Carnes', 'Caja de 5 kg',     5000, 'g', 0.6500, 'alimento', '{}', '{}'),
('carrillera-cerdo-3kg',   'Carrillera de cerdo',   'Carnes', 'Caja de 3 kg',     3000, 'g', 0.8500, 'alimento', '{}', '{}'),
('magro-cerdo-picado-5kg', 'Carne picada de cerdo', 'Carnes', 'Bandeja de 5 kg',  5000, 'g', 1,      'alimento', '{}', '{}'),
('ternera-picada-5kg',     'Carne picada de ternera','Carnes','Bandeja de 5 kg',  5000, 'g', 1,      'alimento', '{}', '{}'),
('entrecot-ternera-ud',    'Entrecot de ternera',   'Carnes', 'Pieza de 300 g',    300, 'g', 0.9500, 'alimento', '{}', '{}'),
('solomillo-ternera-2kg',  'Solomillo de ternera',  'Carnes', 'Pieza de 2 kg',    2000, 'g', 0.8500, 'alimento', '{}', '{}'),
('morcillo-ternera-5kg',   'Morcillo de ternera',   'Carnes', 'Caja de 5 kg',     5000, 'g', 0.8000, 'alimento', '{}', '{jarrete}'),
('rabo-toro-5kg',          'Rabo de toro',          'Carnes', 'Caja de 5 kg',     5000, 'g', 0.5500, 'alimento', '{}', '{}'),
('cordero-paletilla-ud',   'Paletilla de cordero',  'Carnes', 'Unidad de 900 g',   900, 'g', 0.6500, 'alimento', '{}', '{}'),
('cordero-chuleta-3kg',    'Chuletas de cordero',   'Carnes', 'Caja de 3 kg',     3000, 'g', 0.7000, 'alimento', '{}', '{}'),
('conejo-ud',              'Conejo',                'Carnes', 'Unidad de 1,2 kg', 1200, 'g', 0.6000, 'alimento', '{}', '{}'),
('callos-ternera-3kg',     'Callos de ternera',     'Carnes', 'Caja de 3 kg',     3000, 'g', 0.9000, 'alimento', '{}', '{}'),
('hamburguesa-vacuno-180g','Hamburguesa de vacuno', 'Carnes', 'Caja de 40 ud',      40, 'ud',1,      'alimento', '{}', '{}'),

-- ── Charcuteria ──────────────────────────────────────────────────────────────
('jamon-serrano-loncheado-1kg','Jamón serrano loncheado','Charcutería','Bolsa de 1 kg',1000,'g',1,'alimento','{}','{}'),
('jamon-iberico-pieza',       'Jamón ibérico',          'Charcutería','Pieza de 7 kg',  7000,'g',0.5500,'alimento','{}','{"pata de jamon"}'),
('jamon-cocido-3kg',          'Jamón cocido',           'Charcutería','Pieza de 3 kg',  3000,'g',0.9500,'alimento','{}','{"jamon york"}'),
('chorizo-sarta-1kg',         'Chorizo',                'Charcutería','Sarta de 1 kg',  1000,'g',1,     'alimento','{}','{}'),
('salchichon-1kg',            'Salchichón',             'Charcutería','Pieza de 1 kg',  1000,'g',1,     'alimento','{}','{}'),
('lomo-embuchado-1kg',        'Lomo embuchado',         'Charcutería','Pieza de 1 kg',  1000,'g',1,     'alimento','{}','{caña}'),
('morcilla-burgos-1kg',       'Morcilla de Burgos',     'Charcutería','Pieza de 1 kg',  1000,'g',1,     'alimento','{gluten}','{}'),
('sobrasada-1kg',             'Sobrasada',              'Charcutería','Pieza de 1 kg',  1000,'g',1,     'alimento','{}','{}'),
('bacon-lonchas-2kg',         'Bacon en lonchas',       'Charcutería','Bolsa de 2 kg',  2000,'g',1,     'alimento','{}','{panceta ahumada}'),
('salchicha-frankfurt-2kg',   'Salchicha tipo Frankfurt','Charcutería','Bolsa de 2 kg', 2000,'g',1,     'alimento','{}','{}'),
('pate-campana-1kg',          'Paté',                   'Charcutería','Terrina de 1 kg',1000,'g',1,     'alimento','{lacteos}','{}'),
('cecina-1kg',                'Cecina',                 'Charcutería','Pieza de 1 kg',  1000,'g',1,     'alimento','{}','{}'),

-- ── Pescados y mariscos ──────────────────────────────────────────────────────
('merluza-entera-5kg',    'Merluza entera',       'Pescados y mariscos', 'Caja de 5 kg',   5000,'g', 0.5500,'alimento','{pescado}','{}'),
('merluza-lomo-3kg',      'Lomo de merluza',      'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.9500,'alimento','{pescado}','{}'),
('bacalao-desalado-3kg',  'Bacalao desalado',     'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.9000,'alimento','{pescado}','{}'),
('salmon-lomo-3kg',       'Lomo de salmón',       'Pescados y mariscos', 'Pieza de 3 kg',  3000,'g', 0.8500,'alimento','{pescado}','{}'),
('atun-lomo-3kg',         'Lomo de atún',         'Pescados y mariscos', 'Pieza de 3 kg',  3000,'g', 0.9000,'alimento','{pescado}','{}'),
('boqueron-fresco-2kg',   'Boquerón fresco',      'Pescados y mariscos', 'Caja de 2 kg',   2000,'g', 0.5500,'alimento','{pescado}','{anchoa}'),
('sardina-fresca-3kg',    'Sardina fresca',       'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.5500,'alimento','{pescado}','{}'),
('dorada-entera-4kg',     'Dorada',               'Pescados y mariscos', 'Caja de 4 kg',   4000,'g', 0.5500,'alimento','{pescado}','{}'),
('lubina-entera-4kg',     'Lubina',               'Pescados y mariscos', 'Caja de 4 kg',   4000,'g', 0.5500,'alimento','{pescado}','{}'),
('rape-cola-3kg',         'Cola de rape',         'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.6000,'alimento','{pescado}','{}'),
('pulpo-cocido-2kg',      'Pulpo cocido',         'Pescados y mariscos', 'Bolsa de 2 kg',  2000,'g', 0.9500,'alimento','{moluscos}','{}'),
('calamar-entero-3kg',    'Calamar',              'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.7000,'alimento','{moluscos}','{}'),
('chipiron-limpio-2kg',   'Chipirón limpio',      'Pescados y mariscos', 'Caja de 2 kg',   2000,'g', 0.9500,'alimento','{moluscos}','{}'),
('sepia-limpia-3kg',      'Sepia limpia',         'Pescados y mariscos', 'Caja de 3 kg',   3000,'g', 0.9500,'alimento','{moluscos}','{choco}'),
('gamba-blanca-2kg',      'Gamba blanca',         'Pescados y mariscos', 'Caja de 2 kg',   2000,'g', 0.5000,'alimento','{crustaceos}','{}'),
('langostino-crudo-2kg',  'Langostino crudo',     'Pescados y mariscos', 'Caja de 2 kg',   2000,'g', 0.5500,'alimento','{crustaceos}','{}'),
('gamba-pelada-1kg',      'Gamba pelada',         'Pescados y mariscos', 'Bolsa de 1 kg',  1000,'g', 1,     'alimento','{crustaceos}','{}'),
('mejillon-fresco-5kg',   'Mejillón',             'Pescados y mariscos', 'Saco de 5 kg',   5000,'g', 0.3000,'alimento','{moluscos}','{}'),
('almeja-1kg',            'Almeja',               'Pescados y mariscos', 'Malla de 1 kg',  1000,'g', 0.3000,'alimento','{moluscos}','{}'),
('berberecho-1kg',        'Berberecho',           'Pescados y mariscos', 'Malla de 1 kg',  1000,'g', 0.2500,'alimento','{moluscos}','{}'),
('anchoa-aceite-500g',    'Anchoa en aceite',     'Pescados y mariscos', 'Lata de 500 g',   500,'g', 1,     'alimento','{pescado}','{}'),
('boqueron-vinagre-1kg',  'Boquerón en vinagre',  'Pescados y mariscos', 'Bandeja de 1 kg',1000,'g', 1,     'alimento','{pescado}','{}'),
('salmon-ahumado-1kg',    'Salmón ahumado',       'Pescados y mariscos', 'Pieza de 1 kg',  1000,'g', 0.9500,'alimento','{pescado}','{}'),
('bacalao-migas-1kg',     'Migas de bacalao',     'Pescados y mariscos', 'Bolsa de 1 kg',  1000,'g', 1,     'alimento','{pescado}','{}'),

-- ── Lacteos y huevos ─────────────────────────────────────────────────────────
('leche-entera-6l',        'Leche entera',        'Lácteos', 'Caja de 6 briks de 1 l', 6000,'ml',1,'alimento','{lacteos}','{}'),
('leche-desnatada-6l',     'Leche desnatada',     'Lácteos', 'Caja de 6 briks de 1 l', 6000,'ml',1,'alimento','{lacteos}','{}'),
('nata-cocinar-1l',        'Nata para cocinar',   'Lácteos', 'Brik de 1 l',            1000,'ml',1,'alimento','{lacteos}','{"nata 18%"}'),
('nata-montar-1l',         'Nata para montar',    'Lácteos', 'Brik de 1 l',            1000,'ml',1,'alimento','{lacteos}','{"nata 35%"}'),
('queso-rallado-1kg',      'Queso rallado',       'Lácteos', 'Bolsa de 1 kg',          1000,'g', 1,'alimento','{lacteos}','{}'),
('queso-mozzarella-2kg',   'Mozzarella',          'Lácteos', 'Bolsa de 2 kg',          2000,'g', 1,'alimento','{lacteos}','{}'),
('queso-manchego-pieza',   'Queso manchego',      'Lácteos', 'Pieza de 3 kg',          3000,'g', 0.9000,'alimento','{lacteos}','{}'),
('queso-parmesano-1kg',    'Parmesano',           'Lácteos', 'Cuña de 1 kg',           1000,'g', 0.9500,'alimento','{lacteos}','{"grana padano"}'),
('queso-cabra-rulo-1kg',   'Rulo de cabra',       'Lácteos', 'Rulo de 1 kg',           1000,'g', 1,'alimento','{lacteos}','{}'),
('queso-crema-1kg',        'Queso crema',         'Lácteos', 'Tarrina de 1 kg',        1000,'g', 1,'alimento','{lacteos}','{philadelphia}'),
('queso-azul-1kg',         'Queso azul',          'Lácteos', 'Cuña de 1 kg',           1000,'g', 1,'alimento','{lacteos}','{cabrales,roquefort}'),
('queso-lonchas-1kg',      'Queso en lonchas',    'Lácteos', 'Bolsa de 1 kg',          1000,'g', 1,'alimento','{lacteos}','{}'),
('yogur-natural-ud',       'Yogur natural',       'Lácteos', 'Caja de 24 ud',            24,'ud',1,'alimento','{lacteos}','{}'),
('mantequilla-porcion-ud', 'Porción de mantequilla','Lácteos','Caja de 100 ud',         100,'ud',1,'alimento','{lacteos}','{}'),
('huevo-fresco-docena',    'Huevo fresco',        'Huevos',  'Bandeja de 30 ud',         30,'ud',1,'alimento','{huevos}','{}'),
('huevo-liquido-1l',       'Huevo líquido pasteurizado','Huevos','Brik de 1 l',        1000,'ml',1,'alimento','{huevos}','{"huevina"}'),
('clara-huevo-1l',         'Clara de huevo pasteurizada','Huevos','Brik de 1 l',       1000,'ml',1,'alimento','{huevos}','{}'),

-- ── Legumbres y conservas ────────────────────────────────────────────────────
('garbanzo-seco-5kg',      'Garbanzo seco',       'Legumbres', 'Saco de 5 kg',  5000,'g',1,'alimento','{}','{}'),
('lenteja-seca-5kg',       'Lenteja',             'Legumbres', 'Saco de 5 kg',  5000,'g',1,'alimento','{}','{}'),
('alubia-blanca-5kg',      'Alubia blanca',       'Legumbres', 'Saco de 5 kg',  5000,'g',1,'alimento','{}','{judía}'),
('garbanzo-cocido-3kg',    'Garbanzo cocido',     'Conservas', 'Bote de 3 kg',  3000,'g',0.6000,'alimento','{}','{}'),
('alubia-cocida-3kg',      'Alubia cocida',       'Conservas', 'Bote de 3 kg',  3000,'g',0.6000,'alimento','{}','{}'),
('tomate-triturado-3kg',   'Tomate triturado',    'Conservas', 'Lata de 3 kg',  3000,'g',1,'alimento','{}','{}'),
('tomate-frito-3kg',       'Tomate frito',        'Conservas', 'Lata de 3 kg',  3000,'g',1,'alimento','{}','{}'),
('tomate-concentrado-1kg', 'Concentrado de tomate','Conservas','Lata de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('piquillo-1kg',           'Pimiento del piquillo','Conservas','Lata de 1 kg',  1000,'g',0.7000,'alimento','{}','{}'),
('atun-aceite-1kg',        'Atún en aceite',      'Conservas', 'Lata de 1 kg',  1000,'g',0.7000,'alimento','{pescado}','{}'),
('berberecho-lata-ud',     'Berberechos en lata', 'Conservas', 'Caja de 12 latas',12,'ud',1,'alimento','{moluscos}','{}'),
('esparrago-blanco-1kg',   'Espárrago blanco',    'Conservas', 'Lata de 1 kg',  1000,'g',0.6000,'alimento','{}','{}'),
('alcachofa-conserva-1kg', 'Alcachofa en conserva','Conservas','Lata de 1 kg',  1000,'g',0.6500,'alimento','{}','{}'),
('champinon-laminado-1kg', 'Champiñón laminado',  'Conservas', 'Lata de 1 kg',  1000,'g',0.6500,'alimento','{sulfitos}','{}'),

-- ── Encurtidos y aceitunas ───────────────────────────────────────────────────
('aceituna-manzanilla-2kg','Aceituna manzanilla','Encurtidos y aceitunas','Cubo de 2 kg',2000,'g',0.6000,'alimento','{}','{}'),
('aceituna-gordal-2kg',    'Aceituna gordal',    'Encurtidos y aceitunas','Cubo de 2 kg',2000,'g',0.6000,'alimento','{}','{}'),
('aceituna-negra-2kg',     'Aceituna negra',     'Encurtidos y aceitunas','Cubo de 2 kg',2000,'g',0.6000,'alimento','{}','{}'),
('pepinillo-2kg',          'Pepinillo',          'Encurtidos y aceitunas','Cubo de 2 kg',2000,'g',0.6000,'alimento','{}','{}'),
('guindilla-1kg',          'Guindilla en vinagre','Encurtidos y aceitunas','Bote de 1 kg',1000,'g',0.6000,'alimento','{}','{piparra}'),
('alcaparra-1kg',          'Alcaparra',          'Encurtidos y aceitunas','Bote de 1 kg',1000,'g',0.6000,'alimento','{}','{}'),
('cebolleta-encurtida-1kg','Cebolleta encurtida','Encurtidos y aceitunas','Bote de 1 kg',1000,'g',0.6000,'alimento','{sulfitos}','{}'),

-- ── Especias y condimentos ───────────────────────────────────────────────────
('sal-fina-25kg',        'Sal fina',              'Especias y condimentos','Saco de 25 kg',25000,'g',1,'alimento','{}','{}'),
('sal-gorda-5kg',        'Sal gorda',             'Especias y condimentos','Saco de 5 kg',  5000,'g',1,'alimento','{}','{}'),
('pimienta-negra-1kg',   'Pimienta negra molida', 'Especias y condimentos','Bote de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('pimenton-dulce-1kg',   'Pimentón dulce',        'Especias y condimentos','Bote de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('pimenton-picante-500g','Pimentón picante',      'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('comino-500g',          'Comino molido',         'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('oregano-500g',         'Orégano',               'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('laurel-200g',          'Laurel',                'Especias y condimentos','Bolsa de 200 g', 200,'g',1,'alimento','{}','{}'),
('curry-500g',           'Curry',                 'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{mostaza}','{}'),
('canela-molida-500g',   'Canela molida',         'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('azafran-hebra-10g',    'Azafrán en hebra',      'Especias y condimentos','Caja de 10 g',    10,'g',1,'alimento','{}','{}'),
('colorante-paella-1kg', 'Colorante alimentario', 'Especias y condimentos','Bote de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('nuez-moscada-200g',    'Nuez moscada',          'Especias y condimentos','Bote de 200 g',  200,'g',1,'alimento','{}','{}'),
('curcuma-500g',         'Cúrcuma',               'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('cayena-200g',          'Cayena molida',         'Especias y condimentos','Bote de 200 g',  200,'g',1,'alimento','{}','{}'),
('ajo-polvo-500g',       'Ajo en polvo',          'Especias y condimentos','Bote de 500 g',  500,'g',1,'alimento','{}','{}'),
('caldo-pollo-polvo-1kg','Caldo de pollo en polvo','Especias y condimentos','Bote de 1 kg', 1000,'g',1,'alimento','{gluten,apio}','{}'),
('caldo-verdura-polvo-1kg','Caldo de verduras en polvo','Especias y condimentos','Bote de 1 kg',1000,'g',1,'alimento','{apio}','{}'),
('gelatina-hoja-1kg',    'Gelatina en hojas',     'Especias y condimentos','Caja de 1 kg',  1000,'g',1,'alimento','{}','{colas}'),

-- ── Salsas y vinagres ────────────────────────────────────────────────────────
('vinagre-vino-5l',      'Vinagre de vino',       'Salsas y vinagres','Garrafa de 5 l',5000,'ml',1,'alimento','{sulfitos}','{}'),
('vinagre-jerez-1l',     'Vinagre de Jerez',      'Salsas y vinagres','Botella de 1 l',1000,'ml',1,'alimento','{sulfitos}','{}'),
('vinagre-modena-1l',    'Vinagre balsámico',     'Salsas y vinagres','Botella de 1 l',1000,'ml',1,'alimento','{sulfitos}','{módena}'),
('mayonesa-5l',          'Mayonesa',              'Salsas y vinagres','Cubo de 5 l',   5000,'ml',1,'alimento','{huevos,mostaza}','{}'),
('ketchup-5l',           'Kétchup',               'Salsas y vinagres','Cubo de 5 l',   5000,'ml',1,'alimento','{}','{}'),
('mostaza-2l',           'Mostaza',               'Salsas y vinagres','Cubo de 2 l',   2000,'ml',1,'alimento','{mostaza,sulfitos}','{}'),
('salsa-soja-5l',        'Salsa de soja',         'Salsas y vinagres','Garrafa de 5 l',5000,'ml',1,'alimento','{soja,gluten}','{}'),
('salsa-brava-2l',       'Salsa brava',           'Salsas y vinagres','Cubo de 2 l',   2000,'ml',1,'alimento','{}','{}'),
('alioli-2kg',           'Alioli',                'Salsas y vinagres','Cubo de 2 kg',  2000,'g', 1,'alimento','{huevos}','{}'),
('salsa-cesar-2l',       'Salsa César',           'Salsas y vinagres','Cubo de 2 l',   2000,'ml',1,'alimento','{huevos,pescado,lacteos,mostaza}','{}'),
('salsa-barbacoa-2l',    'Salsa barbacoa',        'Salsas y vinagres','Cubo de 2 l',   2000,'ml',1,'alimento','{mostaza}','{}'),
('tabasco-350ml',        'Salsa picante',         'Salsas y vinagres','Botella de 350 ml',350,'ml',1,'alimento','{}','{tabasco}'),
('worcestershire-500ml', 'Salsa Worcestershire',  'Salsas y vinagres','Botella de 500 ml',500,'ml',1,'alimento','{pescado}','{perrins}'),

-- ── Azucares y reposteria ────────────────────────────────────────────────────
('azucar-blanco-25kg',   'Azúcar blanco',         'Azúcares y repostería','Saco de 25 kg',25000,'g',1,'alimento','{}','{}'),
('azucar-glas-1kg',      'Azúcar glas',           'Azúcares y repostería','Bolsa de 1 kg', 1000,'g',1,'alimento','{}','{}'),
('azucar-sobre-ud',      'Sobre de azúcar',       'Azúcares y repostería','Caja de 1000 ud',1000,'ud',1,'alimento','{}','{}'),
('miel-1kg',             'Miel',                  'Azúcares y repostería','Bote de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('cacao-polvo-1kg',      'Cacao en polvo',        'Azúcares y repostería','Bote de 1 kg',  1000,'g',1,'alimento','{}','{}'),
('chocolate-cobertura-2kg','Chocolate de cobertura','Azúcares y repostería','Bolsa de 2 kg',2000,'g',1,'alimento','{lacteos,soja}','{}'),
('leche-condensada-1kg', 'Leche condensada',      'Azúcares y repostería','Bote de 1 kg',  1000,'g',1,'alimento','{lacteos}','{}'),
('galleta-maria-2kg',    'Galleta María',         'Azúcares y repostería','Caja de 2 kg',  2000,'g',1,'alimento','{gluten,lacteos,huevos}','{}'),
('helado-vainilla-5l',   'Helado de vainilla',    'Azúcares y repostería','Cubeta de 5 l', 5000,'ml',1,'alimento','{lacteos,huevos}','{}'),
('helado-chocolate-5l',  'Helado de chocolate',   'Azúcares y repostería','Cubeta de 5 l', 5000,'ml',1,'alimento','{lacteos,huevos,soja}','{}'),
('flan-preparado-1kg',   'Preparado para flan',   'Azúcares y repostería','Bote de 1 kg',  1000,'g',1,'alimento','{lacteos}','{}'),

-- ── Frutos secos ─────────────────────────────────────────────────────────────
('almendra-cruda-1kg',   'Almendra cruda',        'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{frutos_de_cascara}','{}'),
('almendra-frita-1kg',   'Almendra frita',        'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{frutos_de_cascara}','{}'),
('nuez-pelada-1kg',      'Nuez pelada',           'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{frutos_de_cascara}','{}'),
('pinon-500g',           'Piñón',                 'Frutos secos','Bolsa de 500 g',500,'g',1,'alimento','{frutos_de_cascara}','{}'),
('avellana-1kg',         'Avellana',              'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{frutos_de_cascara}','{}'),
('cacahuete-frito-2kg',  'Cacahuete frito',       'Frutos secos','Bolsa de 2 kg',2000,'g',1,'alimento','{cacahuetes}','{}'),
('pistacho-1kg',         'Pistacho',              'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{frutos_de_cascara}','{}'),
('pasa-1kg',             'Pasa',                  'Frutos secos','Bolsa de 1 kg',1000,'g',1,'alimento','{sulfitos}','{}'),
('sesamo-500g',          'Semilla de sésamo',     'Frutos secos','Bolsa de 500 g',500,'g',1,'alimento','{sesamo}','{ajonjolí}'),

-- ── Congelados ───────────────────────────────────────────────────────────────
('patata-prefrita-10kg', 'Patata prefrita congelada','Congelados','Caja de 10 kg',10000,'g',1,'alimento','{}','{"patata de bolsa"}'),
('croqueta-jamon-3kg',   'Croqueta de jamón',       'Congelados','Caja de 3 kg',  3000,'g',1,'alimento','{gluten,lacteos}','{}'),
('calamar-rebozado-3kg', 'Calamar rebozado',        'Congelados','Caja de 3 kg',  3000,'g',1,'alimento','{moluscos,gluten}','{}'),
('nugget-pollo-3kg',     'Nuggets de pollo',        'Congelados','Caja de 3 kg',  3000,'g',1,'alimento','{gluten}','{}'),
('empanadilla-3kg',      'Empanadilla',             'Congelados','Caja de 3 kg',  3000,'g',1,'alimento','{gluten}','{}'),
('verdura-menestra-2kg', 'Menestra de verduras',    'Congelados','Bolsa de 2 kg', 2000,'g',1,'alimento','{}','{}'),
('marisco-sopa-2kg',     'Marisco para sopa',       'Congelados','Bolsa de 2 kg', 2000,'g',1,'alimento','{crustaceos,moluscos}','{}'),
('gulas-1kg',            'Gulas',                   'Congelados','Bolsa de 1 kg', 1000,'g',1,'alimento','{pescado,soja}','{}'),
('pan-precocido-ud',     'Pan precocido',           'Congelados','Caja de 50 ud',   50,'ud',1,'alimento','{gluten}','{}'),
('churro-congelado-3kg', 'Churro congelado',        'Congelados','Caja de 3 kg',  3000,'g',1,'alimento','{gluten}','{}'),

-- ── Cafe e infusiones ────────────────────────────────────────────────────────
('cafe-grano-natural-1kg','Café en grano natural','Café e infusiones','Paquete de 1 kg',1000,'g',1,'alimento','{}','{}'),
('cafe-grano-mezcla-1kg', 'Café en grano mezcla', 'Café e infusiones','Paquete de 1 kg',1000,'g',1,'alimento','{}','{torrefacto}'),
('cafe-descafeinado-1kg', 'Café descafeinado',    'Café e infusiones','Paquete de 1 kg',1000,'g',1,'alimento','{}','{}'),
('te-negro-bolsita',      'Té negro',             'Café e infusiones','Caja de 100 bolsitas',100,'ud',1,'alimento','{}','{}'),
('manzanilla-bolsita',    'Manzanilla',           'Café e infusiones','Caja de 100 bolsitas',100,'ud',1,'alimento','{}','{}'),
('poleo-bolsita',         'Poleo menta',          'Café e infusiones','Caja de 100 bolsitas',100,'ud',1,'alimento','{}','{}'),
('colacao-1kg',           'Cacao soluble',        'Café e infusiones','Bote de 1 kg',  1000,'g',1,'alimento','{lacteos,soja}','{}'),

-- ── Bebidas sin alcohol ──────────────────────────────────────────────────────
('agua-mineral-50cl',     'Agua mineral 50 cl',   'Bebidas sin alcohol','Caja de 24 ud',24,'ud',1,'bebida_refrescante','{}','{}'),
('agua-mineral-1l',       'Agua mineral 1 l',     'Bebidas sin alcohol','Caja de 12 ud',12,'ud',1,'bebida_refrescante','{}','{}'),
('agua-gas-50cl',         'Agua con gas',         'Bebidas sin alcohol','Caja de 24 ud',24,'ud',1,'bebida_refrescante','{}','{}'),
('refresco-cola-lata',    'Refresco de cola',     'Bebidas sin alcohol','Caja de 24 latas',24,'ud',1,'bebida_refrescante_azucarada','{}','{}'),
('refresco-cola-zero-lata','Refresco de cola sin azúcar','Bebidas sin alcohol','Caja de 24 latas',24,'ud',1,'bebida_refrescante','{}','{}'),
('refresco-naranja-lata', 'Refresco de naranja',  'Bebidas sin alcohol','Caja de 24 latas',24,'ud',1,'bebida_refrescante_azucarada','{}','{}'),
('refresco-limon-lata',   'Refresco de limón',    'Bebidas sin alcohol','Caja de 24 latas',24,'ud',1,'bebida_refrescante_azucarada','{}','{}'),
('tonica-botellin',       'Tónica',               'Bebidas sin alcohol','Caja de 24 ud',24,'ud',1,'bebida_refrescante_azucarada','{}','{}'),
('zumo-naranja-1l',       'Zumo de naranja',      'Bebidas sin alcohol','Brik de 1 l', 1000,'ml',1,'bebida_refrescante','{}','{}'),
('zumo-pina-1l',          'Zumo de piña',         'Bebidas sin alcohol','Brik de 1 l', 1000,'ml',1,'bebida_refrescante','{}','{}'),
('horchata-1l',           'Horchata',             'Bebidas sin alcohol','Brik de 1 l', 1000,'ml',1,'bebida_refrescante_azucarada','{frutos_de_cascara}','{}'),
('bitter-sin-alcohol',    'Bitter sin alcohol',   'Bebidas sin alcohol','Caja de 24 ud',24,'ud',1,'bebida_refrescante_azucarada','{}','{}'),

-- ── Bebidas con alcohol ──────────────────────────────────────────────────────
('cerveza-barril-30l',    'Cerveza de barril',    'Bebidas con alcohol','Barril de 30 l',30000,'ml',1,'bebida_alcoholica','{gluten}','{}'),
('cerveza-tercio',        'Cerveza en botellín',  'Bebidas con alcohol','Caja de 24 ud',    24,'ud',1,'bebida_alcoholica','{gluten}','{tercio}'),
('cerveza-quinto',        'Cerveza quinto',       'Bebidas con alcohol','Caja de 24 ud',    24,'ud',1,'bebida_alcoholica','{gluten}','{}'),
('cerveza-sin-alcohol',   'Cerveza sin alcohol',  'Bebidas con alcohol','Caja de 24 ud',    24,'ud',1,'bebida_refrescante','{gluten}','{}'),
('vino-tinto-crianza',    'Vino tinto crianza',   'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('vino-tinto-joven',      'Vino tinto joven',     'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('vino-blanco-verdejo',   'Vino blanco verdejo',  'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('vino-blanco-albarino',  'Vino blanco albariño', 'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('vino-rosado',           'Vino rosado',          'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('cava-brut',             'Cava brut',            'Bebidas con alcohol','Caja de 6 botellas',6,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),
('vino-cocinar-5l',       'Vino blanco de cocinar','Bebidas con alcohol','Garrafa de 5 l',5000,'ml',1,'bebida_alcoholica','{sulfitos}','{}'),
('vermut-1l',             'Vermut',               'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{sulfitos}','{}'),
('ginebra-1l',            'Ginebra',              'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{}','{}'),
('ron-1l',                'Ron',                  'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{}','{}'),
('whisky-1l',             'Whisky',               'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{gluten}','{}'),
('vodka-1l',              'Vodka',                'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{}','{}'),
('brandy-1l',             'Brandy',               'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{sulfitos}','{coñac}'),
('licor-hierbas-1l',      'Licor de hierbas',     'Bebidas con alcohol','Botella de 1 l',1000,'ml',1,'bebida_alcoholica','{}','{}'),
('sidra-natural',         'Sidra natural',        'Bebidas con alcohol','Caja de 12 botellas',12,'ud',1,'bebida_alcoholica','{sulfitos}','{}'),

-- ── Limpieza y desechables ───────────────────────────────────────────────────
--
-- No son alimento y no van en un escandallo, pero se compran, se cuentan y se
-- acaban, asi que estan aqui. Su categoria fiscal es `otros`: lo que decide el
-- impuesto es la operacion, no el producto, y estos no se venden.
('servilleta-blanca',     'Servilleta',           'Limpieza y desechables','Caja de 3000 ud',3000,'ud',1,'otros','{}','{}'),
('papel-cocina-rollo',    'Papel de cocina',      'Limpieza y desechables','Pack de 6 rollos',  6,'ud',1,'otros','{}','{}'),
('film-transparente-rollo','Film transparente',   'Limpieza y desechables','Rollo de 300 m',    1,'ud',1,'otros','{}','{}'),
('papel-aluminio-rollo',  'Papel de aluminio',    'Limpieza y desechables','Rollo de 300 m',    1,'ud',1,'otros','{}','{}'),
('bolsa-basura-100l',     'Bolsa de basura',      'Limpieza y desechables','Rollo de 25 ud',   25,'ud',1,'otros','{}','{}'),
('guante-nitrilo-caja',   'Guante de nitrilo',    'Limpieza y desechables','Caja de 100 ud',  100,'ud',1,'otros','{}','{}'),
('detergente-vajilla-5l', 'Detergente de vajilla','Limpieza y desechables','Garrafa de 5 l', 5000,'ml',1,'otros','{}','{}'),
('desengrasante-5l',      'Desengrasante',        'Limpieza y desechables','Garrafa de 5 l', 5000,'ml',1,'otros','{}','{}'),
('lejia-5l',              'Lejía',                'Limpieza y desechables','Garrafa de 5 l', 5000,'ml',1,'otros','{}','{}'),
('friegasuelos-5l',       'Fregasuelos',          'Limpieza y desechables','Garrafa de 5 l', 5000,'ml',1,'otros','{}','{}'),
('estropajo-pack',        'Estropajo',            'Limpieza y desechables','Pack de 10 ud',   10,'ud',1,'otros','{}','{}'),
('vaso-carton-33cl',      'Vaso de cartón',       'Limpieza y desechables','Caja de 1000 ud',1000,'ud',1,'otros','{}','{}'),
('envase-llevar-750ml',   'Envase para llevar',   'Limpieza y desechables','Caja de 300 ud',  300,'ud',1,'otros','{}','{}'),
('bolsa-papel-asa',       'Bolsa de papel',       'Limpieza y desechables','Paquete de 250 ud',250,'ud',1,'otros','{}','{}');

-- ── Las recetas de referencia ────────────────────────────────────────────────
--
-- «Lo mismo con las recetas de referencia. **Nadie obliga, y lo que no se usa no
--  existe**» (Manifiesto 8).
--
-- Son pocas y a proposito: diez recetas de las que estan en cualquier barra de
-- España. No pretenden ser un recetario —cada cocina tiene la suya— sino
-- enseñar como se escribe una ficha: producto, cantidad en su unidad de uso, y
-- para cuantas raciones. Copiarlas crea **una ficha del local**, que a partir de
-- ahi es suya y se puede cambiar entera.

insert into estook.receta_de_referencia (codigo, nombre, categoria, raciones, elaboracion) values
  ('tortilla-de-patatas', 'Tortilla de patatas', 'Tapas',      8, 'Pochar la patata y la cebolla en aceite a fuego suave. Escurrir, mezclar con el huevo batido y cuajar por las dos caras.'),
  ('croqueta-de-jamon',   'Croquetas de jamón',  'Tapas',     40, 'Hacer una bechamel espesa con la mantequilla, la harina y la leche. Añadir el jamón picado, enfriar, bolear, empanar y freír.'),
  ('ensaladilla-rusa',    'Ensaladilla rusa',    'Tapas',     10, 'Cocer la patata y la zanahoria, enfriar y cortar. Mezclar con el atún, el huevo cocido, el guisante y la mayonesa.'),
  ('patatas-bravas',      'Patatas bravas',      'Tapas',      6, 'Freír la patata en dos tiempos. Servir con la salsa brava y el alioli por encima.'),
  ('gazpacho',            'Gazpacho',            'Entrantes',  8, 'Triturar el tomate con el pimiento, el pepino, el ajo, el pan, el aceite y el vinagre. Colar y enfriar.'),
  ('salmorejo',           'Salmorejo',           'Entrantes',  8, 'Triturar el tomate con el pan, el ajo y el aceite hasta emulsionar. Servir con huevo cocido y jamón.'),
  ('paella-de-marisco',   'Paella de marisco',   'Arroces',    4, 'Sofreír el sofrito, nacarar el arroz, mojar con el caldo y añadir el marisco. Sin remover a partir de ahí.'),
  ('albondigas-en-salsa', 'Albóndigas en salsa', 'Guisos',    10, 'Mezclar la carne con el huevo, el pan rallado y el ajo. Bolear, dorar y guisar en la salsa de cebolla y tomate.'),
  ('calamares-a-la-romana','Calamares a la romana','Tapas',    6, 'Cortar el calamar en aros, pasar por harina y freír en aceite bien caliente. Servir con limón.'),
  ('flan-de-huevo',       'Flan de huevo',       'Postres',   12, 'Caramelizar el molde. Mezclar el huevo, la leche y el azúcar, colar, y cuajar al baño maría.');

-- Las lineas. Cada cantidad va **en la unidad de uso del producto**, siempre
-- (Auditoria, parte 7), y son para las raciones que dice la receta.
insert into estook.linea_de_receta_de_referencia (receta_id, producto_de_referencia_id, cantidad, orden)
select r.id, p.id, v.cantidad, v.orden
  from (values
    -- Tortilla de patatas · 8 raciones
    ('tortilla-de-patatas', 'patata-agria-20kg',          1200, 1),
    ('tortilla-de-patatas', 'huevo-fresco-docena',          10, 2),
    ('tortilla-de-patatas', 'cebolla-blanca-10kg',         300, 3),
    ('tortilla-de-patatas', 'aceite-oliva-suave-5l',       400, 4),
    ('tortilla-de-patatas', 'sal-fina-25kg',                15, 5),
    -- Croquetas de jamon · 40 unidades
    ('croqueta-de-jamon',   'leche-entera-6l',            1000, 1),
    ('croqueta-de-jamon',   'harina-trigo-25kg',           120, 2),
    ('croqueta-de-jamon',   'mantequilla-bloque-1kg',      100, 3),
    ('croqueta-de-jamon',   'jamon-serrano-loncheado-1kg', 200, 4),
    ('croqueta-de-jamon',   'pan-rallado-5kg',             250, 5),
    ('croqueta-de-jamon',   'huevo-fresco-docena',           3, 6),
    ('croqueta-de-jamon',   'nuez-moscada-200g',             1, 7),
    -- Ensaladilla rusa · 10 raciones
    ('ensaladilla-rusa',    'patata-monalisa-20kg',       1500, 1),
    ('ensaladilla-rusa',    'zanahoria-5kg',               300, 2),
    ('ensaladilla-rusa',    'guisante-congelado-2kg',      200, 3),
    ('ensaladilla-rusa',    'atun-aceite-1kg',             300, 4),
    ('ensaladilla-rusa',    'huevo-fresco-docena',           4, 5),
    ('ensaladilla-rusa',    'mayonesa-5l',                 400, 6),
    ('ensaladilla-rusa',    'aceituna-manzanilla-2kg',     100, 7),
    -- Patatas bravas · 6 raciones
    ('patatas-bravas',      'patata-agria-20kg',          1500, 1),
    ('patatas-bravas',      'aceite-girasol-alto-oleico-10l',300,2),
    ('patatas-bravas',      'salsa-brava-2l',              300, 3),
    ('patatas-bravas',      'alioli-2kg',                  150, 4),
    -- Gazpacho · 8 raciones
    ('gazpacho',            'tomate-pera-10kg',           1500, 1),
    ('gazpacho',            'pimiento-verde-5kg',          100, 2),
    ('gazpacho',            'pepino-5kg',                  150, 3),
    ('gazpacho',            'ajo-cabeza-1kg',               10, 4),
    ('gazpacho',            'pan-barra-rustica',             1, 5),
    ('gazpacho',            'aceite-oliva-virgen-extra-5l',150, 6),
    ('gazpacho',            'vinagre-jerez-1l',             40, 7),
    ('gazpacho',            'sal-fina-25kg',                15, 8),
    -- Salmorejo · 8 raciones
    ('salmorejo',           'tomate-pera-10kg',           1500, 1),
    ('salmorejo',           'pan-chapata',                   2, 2),
    ('salmorejo',           'ajo-cabeza-1kg',               10, 3),
    ('salmorejo',           'aceite-oliva-virgen-extra-5l',250, 4),
    ('salmorejo',           'huevo-fresco-docena',           2, 5),
    ('salmorejo',           'jamon-serrano-loncheado-1kg',  80, 6),
    -- Paella de marisco · 4 raciones
    ('paella-de-marisco',   'arroz-bomba-1kg',             320, 1),
    ('paella-de-marisco',   'gamba-blanca-2kg',            300, 2),
    ('paella-de-marisco',   'mejillon-fresco-5kg',         400, 3),
    ('paella-de-marisco',   'calamar-entero-3kg',          300, 4),
    ('paella-de-marisco',   'tomate-triturado-3kg',        150, 5),
    ('paella-de-marisco',   'pimiento-rojo-5kg',           100, 6),
    ('paella-de-marisco',   'aceite-oliva-suave-5l',        60, 7),
    ('paella-de-marisco',   'azafran-hebra-10g',             1, 8),
    -- Albondigas en salsa · 10 raciones
    ('albondigas-en-salsa', 'magro-cerdo-picado-5kg',      600, 1),
    ('albondigas-en-salsa', 'ternera-picada-5kg',          400, 2),
    ('albondigas-en-salsa', 'huevo-fresco-docena',           2, 3),
    ('albondigas-en-salsa', 'pan-rallado-5kg',             100, 4),
    ('albondigas-en-salsa', 'cebolla-blanca-10kg',         400, 5),
    ('albondigas-en-salsa', 'tomate-triturado-3kg',        500, 6),
    ('albondigas-en-salsa', 'vino-cocinar-5l',             150, 7),
    ('albondigas-en-salsa', 'perejil-manojo',                1, 8),
    -- Calamares a la romana · 6 raciones
    ('calamares-a-la-romana','calamar-entero-3kg',         900, 1),
    ('calamares-a-la-romana','harina-trigo-25kg',          200, 2),
    ('calamares-a-la-romana','aceite-girasol-alto-oleico-10l',400,3),
    ('calamares-a-la-romana','limon-10kg',                 200, 4),
    -- Flan de huevo · 12 raciones
    ('flan-de-huevo',       'huevo-fresco-docena',           8, 1),
    ('flan-de-huevo',       'leche-entera-6l',            1000, 2),
    ('flan-de-huevo',       'azucar-blanco-25kg',          250, 3)
  ) as v (receta, producto, cantidad, orden)
  join estook.receta_de_referencia r on r.codigo = v.receta
  join estook.producto_de_referencia p on p.codigo = v.producto;
