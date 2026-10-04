-- Completa la cascada de estados entre insumo → receta → menú en los
-- dos sentidos:
--
-- 1) Desactivar una receta directamente (no solo un insumo) también
--    tiene que desactivar los menús que la incluyen — hasta ahora eso
--    no pasaba.
-- 2) Activar algo (insumo, receta o menú) ya no alcanza con cargar
--    sus propios datos: tampoco se puede activar una receta que use
--    un insumo inactivo, ni un menú que incluya una receta inactiva.
-- 3) Activar un insumo reactiva en cascada las recetas que lo usaban
--    (si no les falta ningún otro insumo y ya tienen sus fotos) y,
--    a su vez, los menús que las incluían (si ninguna de sus recetas
--    quedó inactiva). Lo mismo al activar una receta: reactiva los
--    menús que la incluyen si el resto de sus recetas está activo.
--
-- Nada se borra en ningún caso — solo se activa o desactiva.

begin;

-- Corrige ahora mismo cualquier receta/menú que haya quedado activo
-- dependiendo de algo inactivo por no tener todavía esta cascada
-- (por ejemplo, una receta que siguió Activa después de desactivar
-- uno de sus insumos antes de esta migración).
do $$
declare
  v_ids_receta integer[];
begin
  select array_agg(distinct r.id_receta)
    into v_ids_receta
  from public.receta r
  join public.receta_materia_prima rmp on rmp.id_receta = r.id_receta
  join public.materia_prima mp on mp.id_materia_prima = rmp.id_materia_prima
  where r.estado = 'ACTIVA'
    and mp.estado = false;

  if v_ids_receta is not null then
    update public.receta set estado = 'INACTIVA' where id_receta = any(v_ids_receta);

    update public.menu m
    set estado = false
    where m.estado = true
      and m.id_menu in (
        select mr.id_menu from public.menu_receta mr where mr.id_receta = any(v_ids_receta)
      );
  end if;

  update public.menu m
  set estado = false
  where m.estado = true
    and exists (
      select 1
      from public.menu_receta mr
      join public.receta r on r.id_receta = mr.id_receta
      where mr.id_menu = m.id_menu
        and r.estado <> 'ACTIVA'
    );
end;
$$;

-- 1) y 2a): guardar_receta_completa ahora valida que ningún insumo
-- usado esté inactivo antes de activar, y cascadea hacia menu tanto
-- al desactivar (ACTIVA -> otra cosa) como al reactivar (otra cosa ->
-- ACTIVA, solo si el resto de recetas del menú también está activo).
create or replace function public.guardar_receta_completa(
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
  v_estado_anterior estado_receta_enum;
  v_resultado public.receta;
begin
  if p_estado = 'ACTIVA' and jsonb_array_length(p_lineas) = 0 then
    raise exception 'No se puede activar una receta sin insumos cargados';
  end if;
  if p_estado = 'ACTIVA' and (p_imagen_chica_url is null or p_imagen_banner_url is null) then
    raise exception 'No se puede activar una receta sin sus dos fotos cargadas';
  end if;
  if p_estado = 'ACTIVA' and exists (
    select 1
    from jsonb_array_elements(p_lineas) as t(linea)
    join public.materia_prima mp on mp.id_materia_prima = (t.linea->>'id_materia_prima')::integer
    where mp.estado = false
  ) then
    raise exception 'No se puede activar una receta que usa un insumo inactivo';
  end if;

  if v_id_receta is not null then
    select estado into v_estado_anterior from public.receta where id_receta = v_id_receta;
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

  if v_estado_anterior is not null and v_estado_anterior = 'ACTIVA' and v_resultado.estado <> 'ACTIVA' then
    update public.menu
    set estado = false
    where estado = true
      and id_menu in (select id_menu from public.menu_receta where id_receta = v_id_receta);
  elsif v_estado_anterior is not null and v_estado_anterior <> 'ACTIVA' and v_resultado.estado = 'ACTIVA' then
    update public.menu m
    set estado = true
    where m.estado = false
      and m.id_menu in (select mr.id_menu from public.menu_receta mr where mr.id_receta = v_id_receta)
      and not exists (
        select 1
        from public.menu_receta mr2
        join public.receta r2 on r2.id_receta = mr2.id_receta
        where mr2.id_menu = m.id_menu
          and r2.estado <> 'ACTIVA'
      );
  end if;

  return v_resultado;
end;
$$;

-- 2b): guardar_composicion_menu ahora valida que ninguna receta
-- incluida esté inactiva antes de activar el menú.
create or replace function public.guardar_composicion_menu(
  p_id_menu integer,
  p_nombre_menu varchar,
  p_descripcion varchar,
  p_pax_minimo integer,
  p_imagen_chica_url text,
  p_imagen_banner_url text,
  p_estado boolean,
  p_lineas jsonb
)
returns public.menu
language plpgsql
security invoker
as $$
declare
  v_id_menu integer := p_id_menu;
  v_pax_minimo_requerido integer;
  v_resultado public.menu;
begin
  if jsonb_array_length(p_lineas) > 0 then
    select max(r.cantidad_porciones)
      into v_pax_minimo_requerido
    from jsonb_array_elements(p_lineas) as t(linea)
    join public.receta r on r.id_receta = (t.linea->>'id_receta')::integer;

    if v_pax_minimo_requerido is not null and p_pax_minimo < v_pax_minimo_requerido then
      raise exception 'La cantidad mínima de personas del menú no puede ser menor a %, que es lo que exige la receta más exigente incluida', v_pax_minimo_requerido;
    end if;
  end if;

  if p_estado and jsonb_array_length(p_lineas) = 0 then
    raise exception 'No se puede activar un menú sin recetas incluidas';
  end if;
  if p_estado and (p_imagen_chica_url is null or p_imagen_banner_url is null) then
    raise exception 'No se puede activar un menú sin sus dos fotos cargadas';
  end if;
  if p_estado and exists (
    select 1
    from jsonb_array_elements(p_lineas) as t(linea)
    join public.receta r on r.id_receta = (t.linea->>'id_receta')::integer
    where r.estado <> 'ACTIVA'
  ) then
    raise exception 'No se puede activar un menú que incluye una receta inactiva';
  end if;

  if v_id_menu is null then
    insert into public.menu (nombre_menu, descripcion, pax_minimo, imagen_chica_url, imagen_banner_url, estado)
    values (p_nombre_menu, p_descripcion, p_pax_minimo, p_imagen_chica_url, p_imagen_banner_url, p_estado)
    returning id_menu into v_id_menu;
  end if;

  delete from public.menu_receta where id_menu = v_id_menu;

  insert into public.menu_receta (id_menu, id_receta, tipo_plato, orden)
  select
    v_id_menu,
    (linea->>'id_receta')::integer,
    linea->>'tipo_plato',
    ordinalidad::integer
  from jsonb_array_elements(p_lineas) with ordinality as t(linea, ordinalidad);

  update public.menu
  set nombre_menu = p_nombre_menu,
      descripcion = p_descripcion,
      pax_minimo = p_pax_minimo,
      imagen_chica_url = p_imagen_chica_url,
      imagen_banner_url = p_imagen_banner_url,
      estado = p_estado
  where id_menu = v_id_menu
  returning * into v_resultado;

  return v_resultado;
end;
$$;

-- 3): activar un insumo reactiva en cascada lo que corresponda —
-- espejo de desactivar_insumo_en_cascada (migración 41).
create function public.activar_insumo_en_cascada(p_id_materia_prima integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids_receta integer[];
begin
  if rol_actual() <> 'Administrador' then
    raise exception 'Solo Administrador puede activar un insumo';
  end if;

  update public.materia_prima
  set estado = true
  where id_materia_prima = p_id_materia_prima;

  -- Solo reactiva recetas que: usaban este insumo, están inactivas,
  -- ya tienen sus dos fotos cargadas y no les falta ningún otro
  -- insumo (si falta otro, se queda inactiva hasta que también se
  -- reactive ese).
  select array_agg(distinct r.id_receta)
    into v_ids_receta
  from public.receta r
  join public.receta_materia_prima rmp on rmp.id_receta = r.id_receta
  where rmp.id_materia_prima = p_id_materia_prima
    and r.estado = 'INACTIVA'
    and r.imagen_chica_url is not null
    and r.imagen_banner_url is not null
    and not exists (
      select 1
      from public.receta_materia_prima rmp2
      join public.materia_prima mp2 on mp2.id_materia_prima = rmp2.id_materia_prima
      where rmp2.id_receta = r.id_receta
        and mp2.estado = false
    );

  if v_ids_receta is not null then
    update public.receta
    set estado = 'ACTIVA'
    where id_receta = any(v_ids_receta);

    -- Reactiva los menús que incluyen alguna receta recién
    -- reactivada, solo si ninguna de sus recetas (cualquiera, no solo
    -- las que acaban de volver) sigue inactiva.
    update public.menu m
    set estado = true
    where m.estado = false
      and m.id_menu in (
        select mr.id_menu
        from public.menu_receta mr
        where mr.id_receta = any(v_ids_receta)
      )
      and not exists (
        select 1
        from public.menu_receta mr2
        join public.receta r2 on r2.id_receta = mr2.id_receta
        where mr2.id_menu = m.id_menu
          and r2.estado <> 'ACTIVA'
      );
  end if;
end;
$$;

grant execute on function public.activar_insumo_en_cascada(integer) to authenticated;

commit;
