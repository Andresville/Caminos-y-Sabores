-- Rediseño de la ficha de receta: en vez de cargar la merma por cada
-- insumo, Cocina carga un % de merma y un % de mano de obra para TODA
-- la receta (se ingresan a mano, no salen de ningún valor por
-- defecto). El costo de insumos + esos dos porcentajes dan el costo
-- total de producción; costo_por_porcion sigue siendo el que usa el
-- resto del sistema (menús, cotizaciones, venta individual).
--
-- La mano de obra de la receta reemplaza al "% de gastos generales"
-- que hoy se aplicaba a nivel Menú: ese gasto general deja de
-- aplicarse a Menú y Receta (ya va adentro de cada receta), pero
-- sigue aplicándose a los Adicionales, que no tienen equivalente
-- propio (ver src/lib/cotizador/calculo.ts).
--
-- También se agregan las dos fotos obligatorias de la receta (imagen
-- chica para las cards, banner para el detalle). Una receta no puede
-- quedar Activa sin insumos cargados NI sin sus dos fotos.

begin;

alter table public.receta
  add column merma_pct     numeric(5,2) not null default 0 check (merma_pct >= 0 and merma_pct < 100),
  add column mano_obra_pct numeric(5,2) not null default 0 check (mano_obra_pct >= 0),
  add column imagen_chica_url  text,
  add column imagen_banner_url text;

-- La merma ya no se carga por insumo: es un único porcentaje de toda la receta (merma_pct arriba).
alter table public.receta_materia_prima
  drop column porcentaje_merma;

-- Las fotos son un campo nuevo: ninguna receta existente las tiene
-- todavía. Como de ahora en más una receta Activa las necesita sí o
-- sí, las que estaban Activas pasan a Borrador hasta que alguien les
-- cargue las dos fotos (y de paso confirme merma/mano de obra) y las
-- vuelva a activar.
update public.receta
set estado = 'BORRADOR'
where estado = 'ACTIVA';

drop function if exists public.guardar_receta_completa(integer, varchar, text, integer, text, jsonb, numeric, numeric);

-- Ahora también crea la receta cuando p_id_receta es null, para que
-- alta y edición pasen por el mismo camino atómico (encabezado +
-- líneas + costo, todo junto o nada).
create function public.guardar_receta_completa(
  p_id_receta integer,
  p_nombre_plato varchar,
  p_descripcion_publica varchar,
  p_tipo_plato text,
  p_cantidad_porciones integer,
  p_merma_pct numeric,
  p_mano_obra_pct numeric,
  p_imagen_chica_url text,
  p_imagen_banner_url text,
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
  v_id_receta integer := p_id_receta;
  v_resultado public.receta;
begin
  if p_estado = 'ACTIVA' and jsonb_array_length(p_lineas) = 0 then
    raise exception 'No se puede activar una receta sin insumos cargados';
  end if;
  if p_estado = 'ACTIVA' and (p_imagen_chica_url is null or p_imagen_banner_url is null) then
    raise exception 'No se puede activar una receta sin sus dos fotos cargadas';
  end if;

  if v_id_receta is null then
    insert into public.receta
      (nombre_plato, descripcion_publica, tipo_plato, cantidad_porciones, merma_pct, mano_obra_pct,
       imagen_chica_url, imagen_banner_url, estado)
    values
      (p_nombre_plato, p_descripcion_publica, p_tipo_plato::tipo_plato_enum, p_cantidad_porciones,
       p_merma_pct, p_mano_obra_pct, p_imagen_chica_url, p_imagen_banner_url, p_estado::estado_receta_enum)
    returning id_receta into v_id_receta;
  end if;

  delete from public.receta_materia_prima where id_receta = v_id_receta;

  insert into public.receta_materia_prima
    (id_receta, id_materia_prima, cantidad_usada, id_unidad_receta, orden)
  select
    v_id_receta,
    (linea->>'id_materia_prima')::integer,
    (linea->>'cantidad_usada')::numeric,
    (linea->>'id_unidad_receta')::integer,
    ordinalidad::integer
  from jsonb_array_elements(p_lineas) with ordinality as t(linea, ordinalidad);

  update public.receta
  set nombre_plato = p_nombre_plato,
      descripcion_publica = p_descripcion_publica,
      tipo_plato = p_tipo_plato::tipo_plato_enum,
      cantidad_porciones = p_cantidad_porciones,
      merma_pct = p_merma_pct,
      mano_obra_pct = p_mano_obra_pct,
      imagen_chica_url = p_imagen_chica_url,
      imagen_banner_url = p_imagen_banner_url,
      estado = p_estado::estado_receta_enum,
      costo_total_calculado = p_costo_total,
      costo_por_porcion = p_costo_por_porcion,
      fecha_ultimo_calculo = now()
  where id_receta = v_id_receta
  returning * into v_resultado;

  return v_resultado;
end;
$$;

grant execute on function public.guardar_receta_completa(
  integer, varchar, varchar, text, integer, numeric, numeric, text, text, text, jsonb, numeric, numeric
) to authenticated;

insert into storage.buckets (id, name, public)
values ('receta-imagenes', 'receta-imagenes', true)
on conflict (id) do nothing;

create policy receta_imagenes_select on storage.objects for select to public
  using (bucket_id = 'receta-imagenes');

create policy receta_imagenes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receta-imagenes' and rol_actual() in ('Cocina', 'Administrador'));

create policy receta_imagenes_update on storage.objects for update to authenticated
  using (bucket_id = 'receta-imagenes' and rol_actual() in ('Cocina', 'Administrador'))
  with check (bucket_id = 'receta-imagenes' and rol_actual() in ('Cocina', 'Administrador'));

create policy receta_imagenes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receta-imagenes' and rol_actual() in ('Cocina', 'Administrador'));

commit;
