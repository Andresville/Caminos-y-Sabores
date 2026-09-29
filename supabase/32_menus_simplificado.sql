-- Rediseño del menú: deja de tener coeficiente de venta propio. El
-- precio que ve el cliente por un menú pasa a ser simplemente la suma
-- de lo que ya cuesta cada receta que lo compone (cada una ya trae su
-- propio margen desde el módulo de Recetas) — aplicar un coeficiente
-- extra acá lo duplicaría.
--
-- También se sacan las "porciones por invitado" por línea (quedan
-- fijas en 1 porción por receta) y la foto propia por receta dentro
-- del menú (menu_foto_plato): el menú pasa a tener sus 2 fotos
-- propias (chica/banner), igual que Receta.
--
-- Regla nueva: la cantidad mínima de personas del menú no puede ser
-- menor a la cantidad mínima de personas de la receta más exigente
-- que incluya (si "Ensalada César" pide mínimo 10 y el menú dice 4,
-- no tiene sentido — no se puede armar ese menú para menos de 10).

begin;

drop trigger if exists trg_proteger_coeficiente_venta_menu on public.menu;
drop function if exists public.fn_proteger_coeficiente_venta_menu();

-- Ningún menú existente tiene las 2 fotos nuevas todavía (son un
-- campo nuevo): los que estaban Activos pasan a Inactivos hasta que
-- alguien les cargue las fotos y los vuelva a activar.
update public.menu set estado = false where estado = true;

alter table public.menu
  drop column coeficiente_venta,
  add column imagen_chica_url  text,
  add column imagen_banner_url text;

alter table public.menu_receta
  drop column porciones_por_pax;

drop table if exists public.menu_foto_plato;

-- Ya no hace falta que Asistente Comercial escriba en menu (no tiene
-- más coeficiente_venta que modificar ahí).
alter policy menu_update on public.menu
  using (rol_actual() in ('Cocina','Administrador'))
  with check (rol_actual() in ('Cocina','Administrador'));

drop function if exists public.guardar_composicion_menu(integer, varchar, varchar, integer, boolean, jsonb);

-- Crea el menú cuando p_id_menu es null (alta y edición por el mismo
-- camino atómico) y valida que la cantidad mínima de personas del
-- menú no sea menor a la de ninguna receta incluida. Una receta
-- Activa siempre tiene cantidad_porciones > 0, así que si hay líneas
-- esa validación corre siempre, no solo al activar el menú.
create function public.guardar_composicion_menu(
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

grant execute on function public.guardar_composicion_menu(
  integer, varchar, varchar, integer, text, text, boolean, jsonb
) to authenticated;

insert into storage.buckets (id, name, public)
values ('menu-fotos', 'menu-fotos', true)
on conflict (id) do nothing;

create policy menu_fotos_select on storage.objects for select to public
  using (bucket_id = 'menu-fotos');

create policy menu_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-fotos' and rol_actual() in ('Cocina', 'Administrador'));

create policy menu_fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'menu-fotos' and rol_actual() in ('Cocina', 'Administrador'))
  with check (bucket_id = 'menu-fotos' and rol_actual() in ('Cocina', 'Administrador'));

create policy menu_fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu-fotos' and rol_actual() in ('Cocina', 'Administrador'));

commit;
