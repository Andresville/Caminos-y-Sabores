-- Categorías de insumo de referencia (sección 8.3), para poder probar
-- el módulo de insumos. Se pueden agregar más desde una pantalla propia
-- de categorías en el futuro.

insert into public.categoria_insumo (nombre, activa) values
  ('Lácteos', true),
  ('Carnes', true),
  ('Verduras', true),
  ('Secos', true),
  ('Bebidas', true),
  ('Conservas', true);
