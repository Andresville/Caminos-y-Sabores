-- Existencia actual de cada insumo (unidad de compra), cargada
-- manualmente por Jefe de Compras desde el alta/edición del insumo.
-- Sirve para poder alertar en su Dashboard cuando el stock disponible
-- no llega a cubrir, con un 10% de margen, lo que requieren las
-- recetas activas que usan ese insumo.

begin;

alter table public.materia_prima
  add column existencia_actual numeric(12,3) not null default 0
    check (existencia_actual >= 0);

commit;
