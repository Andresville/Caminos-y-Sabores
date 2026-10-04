-- Hoy desactivar un insumo es un simple UPDATE de materia_prima: no
-- toca nada más. El problema es que el editor de recetas solo trae
-- insumos ACTIVOS para el selector, así que una receta que ya usaba
-- ese insumo lo mostraba vacío (parecía "borrado") — y si alguien
-- guardaba la receta así, la línea se perdía de verdad. Eso se separa
-- en el frontend (el editor ahora también trae insumos inactivos para
-- no romper esas líneas existentes).
--
-- Acá del lado de la base se agrega la otra mitad: desactivar un
-- insumo tiene que desactivar en cascada las recetas que lo usan (no
-- borrarlas) y, a su vez, los menús que incluyen esas recetas (no
-- borrarlos tampoco) — para que nada quede activo mostrando algo que
-- ya no se puede preparar.

begin;

create function public.desactivar_insumo_en_cascada(p_id_materia_prima integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids_receta integer[];
begin
  if rol_actual() <> 'Administrador' then
    raise exception 'Solo Administrador puede desactivar un insumo';
  end if;

  update public.materia_prima
  set estado = false
  where id_materia_prima = p_id_materia_prima;

  select array_agg(distinct r.id_receta)
    into v_ids_receta
  from public.receta r
  join public.receta_materia_prima rmp on rmp.id_receta = r.id_receta
  where rmp.id_materia_prima = p_id_materia_prima
    and r.estado = 'ACTIVA';

  if v_ids_receta is not null then
    update public.receta
    set estado = 'INACTIVA'
    where id_receta = any(v_ids_receta);

    update public.menu
    set estado = false
    where estado = true
      and id_menu in (
        select mr.id_menu
        from public.menu_receta mr
        where mr.id_receta = any(v_ids_receta)
      );
  end if;
end;
$$;

grant execute on function public.desactivar_insumo_en_cascada(integer) to authenticated;

commit;
