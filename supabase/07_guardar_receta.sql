-- Persiste una receta completa (encabezado + líneas de insumo) en una
-- sola operación atómica: reemplaza todas las líneas existentes por las
-- nuevas y actualiza el encabezado, incluyendo el costo ya calculado.
--
-- El cálculo del costo (conversión de unidades, merma, etc.) NO se hace
-- acá: lo hace el motor de dominio en TypeScript (src/domain/costeo),
-- tanto en el navegador para la vista en vivo como en el servidor antes
-- de llamar a esta función, para no confiar en un costo calculado por
-- el cliente. Esta función solo persiste el resultado.
--
-- security invoker: se apoya en las políticas RLS ya existentes de
-- receta y receta_materia_prima (solo Chef Principal puede escribir),
-- no repite ese chequeo acá.

begin;

create or replace function public.guardar_receta_completa(
  p_id_receta integer,
  p_nombre_plato varchar,
  p_tipo_plato text,
  p_cantidad_porciones integer,
  p_estado text,
  p_lineas jsonb,
  p_costo_total numeric,
  p_costo_por_porcion numeric
)
returns public.receta
language plpgsql
security invoker
as $$
declare
  v_resultado public.receta;
begin
  if p_estado = 'ACTIVA' and jsonb_array_length(p_lineas) = 0 then
    raise exception 'No se puede activar una receta sin insumos cargados';
  end if;

  delete from public.receta_materia_prima where id_receta = p_id_receta;

  insert into public.receta_materia_prima
    (id_receta, id_materia_prima, cantidad_usada, id_unidad_receta, porcentaje_merma, orden)
  select
    p_id_receta,
    (linea->>'id_materia_prima')::integer,
    (linea->>'cantidad_usada')::numeric,
    (linea->>'id_unidad_receta')::integer,
    (linea->>'porcentaje_merma')::numeric,
    ordinalidad::integer
  from jsonb_array_elements(p_lineas) with ordinality as t(linea, ordinalidad);

  update public.receta
  set nombre_plato = p_nombre_plato,
      tipo_plato = p_tipo_plato::tipo_plato_enum,
      cantidad_porciones = p_cantidad_porciones,
      estado = p_estado::estado_receta_enum,
      costo_total_calculado = p_costo_total,
      costo_por_porcion = p_costo_por_porcion,
      fecha_ultimo_calculo = now()
  where id_receta = p_id_receta
  returning * into v_resultado;

  return v_resultado;
end;
$$;

grant execute on function public.guardar_receta_completa(
  integer, varchar, text, integer, text, jsonb, numeric, numeric
) to authenticated;

commit;
