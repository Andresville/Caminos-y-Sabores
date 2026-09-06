-- Proveedores de referencia (para el selector del alta de insumo) y
-- vista de conteo de recetas activas por insumo (columna "Recetas" del
-- listado, y el texto de impacto al editar un precio). security_invoker
-- asegura que la vista respeta el RLS del usuario que consulta, no el
-- del dueño de la vista.

begin;

insert into public.proveedor (razon_social, cuit, contacto, activo) values
  ('Lácteos del Sur', '30-12345678-9', 'ventas@lacteosdelsur.com.ar', true),
  ('Distribuidora Carnes Premium', '30-23456789-0', 'pedidos@carnespremium.com.ar', true),
  ('Almacén Mayorista Norte', '30-34567890-1', 'contacto@mayoristanorte.com.ar', true);

create view public.vista_conteo_recetas_por_insumo
with (security_invoker = true) as
select
  rmp.id_materia_prima,
  count(*) filter (where r.estado = 'ACTIVA') as recetas_activas
from public.receta_materia_prima rmp
join public.receta r on r.id_receta = rmp.id_receta
group by rmp.id_materia_prima;

grant select on public.vista_conteo_recetas_por_insumo to authenticated;

commit;
