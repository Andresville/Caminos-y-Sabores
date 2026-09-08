-- Jefe de Compras no tiene lectura sobre cotizacion ni menu_receta
-- (matriz de roles: eso es de Gerente Comercial/Administrador y Chef
-- Principal respectivamente). Pero para la alerta de stock bajo de su
-- Dashboard necesita saber, de las cotizaciones YA CONFIRMADAS (es
-- decir, comprometidas y todavía no ejecutadas), qué recetas exigen y
-- en qué cantidad de porciones.
--
-- Esta función expone solo esa combinación puntual (receta + porciones
-- por cotización confirmada), sin abrir cotizacion ni menu_receta en
-- general. El resto del cálculo (unidades, merma, conversión a unidad
-- de compra) se hace en la aplicación con el mismo motor de costeo que
-- ya usa el editor de recetas, a partir de receta/receta_materia_prima,
-- que Jefe de Compras ya puede leer.

begin;

create or replace function public.obtener_demanda_confirmada()
returns table (
  id_cotizacion    integer,
  cantidad_pax     integer,
  id_receta        integer,
  porciones_por_pax numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Jefe de Compras', 'Gerente Comercial', 'Administrador') then
    raise exception 'No tiene permiso para consultar la demanda confirmada';
  end if;

  return query
    select c.id_cotizacion, c.cantidad_pax, mr.id_receta, mr.porciones_por_pax
    from public.cotizacion c
    join public.menu_receta mr on mr.id_menu = c.id_menu
    where c.estado = 'CONFIRMADA';
end;
$$;

grant execute on function public.obtener_demanda_confirmada() to authenticated;

commit;
