-- Renombra tres roles del sistema:
--   Chef Principal    -> Ayudante de cocina
--   Gerente Comercial -> Comercial
--   Jefe de Compras   -> Ayudante de compras
--
-- El nombre de rol no es solo un dato: rol_actual() lo devuelve tal
-- cual, y todas las políticas de seguridad (RLS) y funciones de
-- negocio comparan contra el nombre exacto como texto literal. Por
-- eso no alcanza con actualizar la fila de "rol": hay que actualizar
-- también cada política y función que lo compara, o los tres roles
-- quedan sin permisos apenas cambie el dato.

begin;

-- 1. Datos: nombre del rol y parámetros que indican quién puede
--    modificar cada uno. parametro_sistema.modificable_por_rol tiene
--    una foreign key contra rol.nombre_rol (clave natural, no
--    id_rol), así que hay que sacarla antes de tocar los nombres y
--    volver a crearla igual después, o ninguna de las dos tablas se
--    puede actualizar sin que la otra quede momentáneamente
--    inconsistente.
alter table public.parametro_sistema drop constraint parametro_sistema_modificable_por_rol_fkey;

update public.rol set nombre_rol = 'Ayudante de cocina' where nombre_rol = 'Chef Principal';
update public.rol set nombre_rol = 'Comercial' where nombre_rol = 'Gerente Comercial';
update public.rol set nombre_rol = 'Ayudante de compras' where nombre_rol = 'Jefe de Compras';

update public.parametro_sistema set modificable_por_rol = 'Comercial' where modificable_por_rol = 'Gerente Comercial';
update public.parametro_sistema set modificable_por_rol = 'Ayudante de compras' where modificable_por_rol = 'Jefe de Compras';

alter table public.parametro_sistema
  add constraint parametro_sistema_modificable_por_rol_fkey
  foreign key (modificable_por_rol) references public.rol(nombre_rol);

-- 2. Funciones con chequeo de rol manual.
create or replace function public.fn_proteger_coeficiente_venta_menu()
returns trigger
language plpgsql
as $$
begin
  if new.coeficiente_venta is distinct from old.coeficiente_venta
     and rol_actual() not in ('Comercial', 'Administrador')
  then
    raise exception 'Solo Comercial o Administrador pueden modificar el coeficiente de venta del menú';
  end if;
  return new;
end;
$$;

create or replace function public.actualizar_precio_materia_prima(
  p_id_materia_prima integer,
  p_costo_nuevo numeric,
  p_motivo varchar default null
)
returns public.materia_prima
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_costo_anterior numeric(12,2);
  v_variacion_pct numeric(7,2);
  v_umbral numeric(7,2);
  v_resultado public.materia_prima;
begin
  if rol_actual() <> 'Ayudante de compras' then
    raise exception 'Solo Ayudante de compras puede actualizar el precio de un insumo';
  end if;

  if p_costo_nuevo <= 0 then
    raise exception 'El costo nuevo debe ser mayor a cero';
  end if;

  select costo_unitario into v_costo_anterior
  from public.materia_prima
  where id_materia_prima = p_id_materia_prima
  for update;

  if v_costo_anterior is null then
    raise exception 'La materia prima % no existe', p_id_materia_prima;
  end if;

  v_variacion_pct := round(((p_costo_nuevo - v_costo_anterior) / v_costo_anterior) * 100, 2);

  select valor::numeric into v_umbral
  from public.parametro_sistema
  where clave = 'UMBRAL_MOTIVO_PRECIO_PCT';

  if abs(v_variacion_pct) > v_umbral and (p_motivo is null or btrim(p_motivo) = '') then
    raise exception 'La variación de precio del % por ciento supera el umbral configurado; debe indicar un motivo', round(abs(v_variacion_pct), 2);
  end if;

  update public.materia_prima
  set costo_unitario = p_costo_nuevo,
      ultima_actualizacion = now()
  where id_materia_prima = p_id_materia_prima
  returning * into v_resultado;

  insert into public.historico_precio_mp
    (id_materia_prima, costo_anterior, costo_nuevo, variacion_pct, motivo, id_usuario, fecha_cambio)
  values
    (p_id_materia_prima, v_costo_anterior, p_costo_nuevo, v_variacion_pct, p_motivo, auth.uid(), now());

  return v_resultado;
end;
$$;

create or replace function public.obtener_auditoria(
  p_entidad text default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null
)
returns table (
  id_auditoria bigint,
  entidad text,
  id_entidad integer,
  accion text,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  fecha_hora timestamptz,
  nombre_usuario text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Comercial', 'Administrador') then
    raise exception 'No tiene permiso para consultar la auditoría';
  end if;

  return query
    select
      a.id_auditoria,
      a.entidad::text,
      a.id_entidad,
      a.accion::text,
      a.valor_anterior,
      a.valor_nuevo,
      a.fecha_hora,
      u.nombre_completo::text as nombre_usuario
    from public.auditoria a
    left join public.usuario u on u.id_usuario = a.id_usuario
    where (p_entidad is null or a.entidad = p_entidad)
      and (p_desde is null or a.fecha_hora >= p_desde)
      and (p_hasta is null or a.fecha_hora <= p_hasta)
    order by a.fecha_hora desc
    limit 200;
end;
$$;

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
  if rol_actual() not in ('Ayudante de compras', 'Comercial', 'Administrador') then
    raise exception 'No tiene permiso para consultar la demanda confirmada';
  end if;

  return query
    select c.id_cotizacion, c.cantidad_pax, mr.id_receta, mr.porciones_por_pax
    from public.cotizacion c
    join public.menu_receta mr on mr.id_menu = c.id_menu
    where c.estado = 'CONFIRMADA';
end;
$$;

-- 3. Políticas de seguridad (RLS) que comparan el nombre de rol como texto literal.
alter policy unidad_medida_select on public.unidad_medida
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy unidad_medida_insert on public.unidad_medida
  with check (rol_actual() in ('Ayudante de compras','Administrador'));
alter policy unidad_medida_update on public.unidad_medida
  using (rol_actual() in ('Ayudante de compras','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Administrador'));

alter policy categoria_insumo_select on public.categoria_insumo
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy categoria_insumo_insert on public.categoria_insumo
  with check (rol_actual() = 'Ayudante de compras');
alter policy categoria_insumo_update on public.categoria_insumo
  using (rol_actual() = 'Ayudante de compras')
  with check (rol_actual() = 'Ayudante de compras');

alter policy proveedor_select on public.proveedor
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy proveedor_insert on public.proveedor
  with check (rol_actual() = 'Ayudante de compras');
alter policy proveedor_update on public.proveedor
  using (rol_actual() = 'Ayudante de compras')
  with check (rol_actual() = 'Ayudante de compras');

alter policy materia_prima_select on public.materia_prima
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy materia_prima_insert on public.materia_prima
  with check (rol_actual() = 'Ayudante de compras');
alter policy materia_prima_update on public.materia_prima
  using (rol_actual() = 'Ayudante de compras')
  with check (rol_actual() = 'Ayudante de compras');

alter policy historico_precio_select on public.historico_precio_mp
  using (rol_actual() in ('Ayudante de compras','Comercial','Administrador'));

alter policy receta_select on public.receta
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy receta_insert on public.receta
  with check (rol_actual() = 'Ayudante de cocina');
alter policy receta_update on public.receta
  using (rol_actual() = 'Ayudante de cocina')
  with check (rol_actual() = 'Ayudante de cocina');

alter policy receta_mp_select on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de compras','Ayudante de cocina','Comercial','Administrador'));
alter policy receta_mp_insert on public.receta_materia_prima
  with check (rol_actual() = 'Ayudante de cocina');
alter policy receta_mp_update on public.receta_materia_prima
  using (rol_actual() = 'Ayudante de cocina')
  with check (rol_actual() = 'Ayudante de cocina');
alter policy receta_mp_delete on public.receta_materia_prima
  using (rol_actual() = 'Ayudante de cocina');

alter policy menu_select on public.menu
  using (rol_actual() in ('Ayudante de cocina','Comercial','Administrador'));
alter policy menu_insert on public.menu
  with check (rol_actual() = 'Ayudante de cocina');
alter policy menu_update on public.menu
  using (rol_actual() in ('Ayudante de cocina','Comercial','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Comercial','Administrador'));

alter policy menu_receta_select on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Comercial','Administrador'));
alter policy menu_receta_insert on public.menu_receta
  with check (rol_actual() = 'Ayudante de cocina');
alter policy menu_receta_update on public.menu_receta
  using (rol_actual() = 'Ayudante de cocina')
  with check (rol_actual() = 'Ayudante de cocina');
alter policy menu_receta_delete on public.menu_receta
  using (rol_actual() = 'Ayudante de cocina');

alter policy servicio_adicional_select on public.servicio_adicional
  using (rol_actual() in ('Ayudante de compras','Comercial','Administrador'));
alter policy servicio_adicional_insert on public.servicio_adicional
  with check (rol_actual() in ('Ayudante de compras','Comercial'));
alter policy servicio_adicional_update on public.servicio_adicional
  using (rol_actual() in ('Ayudante de compras','Comercial'))
  with check (rol_actual() in ('Ayudante de compras','Comercial'));

alter policy cotizacion_select on public.cotizacion
  using (rol_actual() in ('Comercial','Administrador'));
alter policy cotizacion_update_estado on public.cotizacion
  using (rol_actual() = 'Comercial')
  with check (rol_actual() = 'Comercial');

alter policy cotizacion_detalle_select on public.cotizacion_detalle
  using (rol_actual() in ('Comercial','Administrador'));

alter policy parametro_select on public.parametro_sistema
  using (rol_actual() in ('Ayudante de compras','Comercial','Administrador'));

alter policy auditoria_select on public.auditoria
  using (rol_actual() in ('Comercial','Administrador'));

commit;
