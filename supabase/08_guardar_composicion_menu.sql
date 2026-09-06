-- Persiste la composición de un menú (encabezado + líneas de receta) de
-- forma atómica, igual que guardar_receta_completa(). Nunca toca
-- coeficiente_venta: eso lo cambia únicamente actualizarCoeficienteMenu
-- desde la aplicación (Gerente Comercial/Administrador), un simple
-- update de una sola columna que ya queda protegido por el trigger
-- fn_proteger_coeficiente_venta_menu existente.
--
-- security invoker: se apoya en las políticas RLS ya existentes de
-- menu y menu_receta (solo Chef Principal puede escribir).

begin;

create or replace function public.guardar_composicion_menu(
  p_id_menu integer,
  p_nombre_menu varchar,
  p_descripcion varchar,
  p_pax_minimo integer,
  p_estado boolean,
  p_lineas jsonb
)
returns public.menu
language plpgsql
security invoker
as $$
declare
  v_resultado public.menu;
begin
  delete from public.menu_receta where id_menu = p_id_menu;

  insert into public.menu_receta (id_menu, id_receta, tipo_plato, porciones_por_pax, orden)
  select
    p_id_menu,
    (linea->>'id_receta')::integer,
    linea->>'tipo_plato',
    (linea->>'porciones_por_pax')::numeric,
    ordinalidad::integer
  from jsonb_array_elements(p_lineas) with ordinality as t(linea, ordinalidad);

  update public.menu
  set nombre_menu = p_nombre_menu,
      descripcion = p_descripcion,
      pax_minimo = p_pax_minimo,
      estado = p_estado
  where id_menu = p_id_menu
  returning * into v_resultado;

  return v_resultado;
end;
$$;

grant execute on function public.guardar_composicion_menu(
  integer, varchar, varchar, integer, boolean, jsonb
) to authenticated;

commit;
