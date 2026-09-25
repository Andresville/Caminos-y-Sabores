-- Corrección de diseño: toda receta con estado ACTIVA se muestra
-- automáticamente como plato suelto en el portal cliente. La bandera
-- vendible_individual (que exigía marcarla a mano desde el
-- backoffice) queda sin uso y se elimina. coeficiente_venta y
-- descripcion_publica se mantienen, para que Comercial pueda definir
-- un margen y un texto de venta propios en vez del coeficiente por
-- defecto del sistema.

begin;

drop function if exists public.actualizar_venta_individual_receta(integer, numeric, boolean, varchar);

alter table public.receta
  drop column vendible_individual;

create function public.actualizar_venta_individual_receta(
  p_id_receta integer,
  p_coeficiente_venta numeric,
  p_descripcion_publica varchar
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Comercial', 'Administrador') then
    raise exception 'Solo Comercial o Administrador pueden definir la venta individual de una receta';
  end if;

  update public.receta
  set coeficiente_venta = p_coeficiente_venta,
      descripcion_publica = p_descripcion_publica
  where id_receta = p_id_receta;
end;
$$;

grant execute on function public.actualizar_venta_individual_receta(integer, numeric, varchar) to authenticated;

commit;
