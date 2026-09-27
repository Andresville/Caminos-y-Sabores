-- Renombra dos roles del sistema (mismo patrón que la migración 18,
-- por la misma razón: rol_actual() devuelve el nombre tal cual y cada
-- política/función lo compara como texto literal, así que hay que
-- actualizar cada una o el rol queda sin permisos apenas cambie el
-- nombre en la tabla):
--   Comercial          -> Asistente Comercial
--   Ayudante de cocina -> Cocina

begin;

-- 1. Datos: nombre del rol y el parámetro que indica quién puede
--    modificarlo (mismo problema de FK natural que la migración 18).
alter table public.parametro_sistema drop constraint parametro_sistema_modificable_por_rol_fkey;

update public.rol set nombre_rol = 'Asistente Comercial' where nombre_rol = 'Comercial';
update public.rol set nombre_rol = 'Cocina' where nombre_rol = 'Ayudante de cocina';

update public.parametro_sistema set modificable_por_rol = 'Asistente Comercial' where modificable_por_rol = 'Comercial';

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
     and rol_actual() not in ('Asistente Comercial', 'Administrador')
  then
    raise exception 'Solo Asistente Comercial o Administrador pueden modificar el coeficiente de venta del menú';
  end if;
  return new;
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
  if rol_actual() not in ('Asistente Comercial', 'Administrador') then
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
  if rol_actual() not in ('Ayudante de compras', 'Asistente Comercial', 'Administrador') then
    raise exception 'No tiene permiso para consultar la demanda confirmada';
  end if;

  return query
    select c.id_cotizacion, c.cantidad_pax, mr.id_receta, mr.porciones_por_pax
    from public.cotizacion c
    join public.menu_receta mr on mr.id_menu = c.id_menu
    where c.estado = 'CONFIRMADA';
end;
$$;

create or replace function public.actualizar_venta_individual_receta(
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
  if rol_actual() not in ('Asistente Comercial', 'Administrador') then
    raise exception 'Solo Asistente Comercial o Administrador pueden definir la venta individual de una receta';
  end if;

  update public.receta
  set coeficiente_venta = p_coeficiente_venta,
      descripcion_publica = p_descripcion_publica
  where id_receta = p_id_receta;
end;
$$;

-- 3. Políticas de seguridad (RLS) que comparan el nombre de rol como texto literal.
alter policy unidad_medida_select on public.unidad_medida
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));

alter policy categoria_insumo_select on public.categoria_insumo
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));

alter policy proveedor_select on public.proveedor
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));

alter policy materia_prima_select on public.materia_prima
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));

alter policy historico_precio_select on public.historico_precio_mp
  using (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'));

alter policy receta_select on public.receta
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));
alter policy receta_insert on public.receta
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy receta_update on public.receta
  using (rol_actual() in ('Cocina','Administrador'))
  with check (rol_actual() in ('Cocina','Administrador'));

alter policy receta_mp_select on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de compras','Cocina','Asistente Comercial','Administrador'));
alter policy receta_mp_insert on public.receta_materia_prima
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy receta_mp_update on public.receta_materia_prima
  using (rol_actual() in ('Cocina','Administrador'))
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy receta_mp_delete on public.receta_materia_prima
  using (rol_actual() in ('Cocina','Administrador'));

alter policy menu_select on public.menu
  using (rol_actual() in ('Cocina','Asistente Comercial','Administrador'));
alter policy menu_insert on public.menu
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy menu_update on public.menu
  using (rol_actual() in ('Cocina','Asistente Comercial','Administrador'))
  with check (rol_actual() in ('Cocina','Asistente Comercial','Administrador'));

alter policy menu_receta_select on public.menu_receta
  using (rol_actual() in ('Cocina','Asistente Comercial','Administrador'));
alter policy menu_receta_insert on public.menu_receta
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy menu_receta_update on public.menu_receta
  using (rol_actual() in ('Cocina','Administrador'))
  with check (rol_actual() in ('Cocina','Administrador'));
alter policy menu_receta_delete on public.menu_receta
  using (rol_actual() in ('Cocina','Administrador'));

alter policy servicio_adicional_select on public.servicio_adicional
  using (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'));
alter policy servicio_adicional_insert on public.servicio_adicional
  with check (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'));
alter policy servicio_adicional_update on public.servicio_adicional
  using (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'));

alter policy cotizacion_select on public.cotizacion
  using (rol_actual() in ('Asistente Comercial','Administrador'));
alter policy cotizacion_update_estado on public.cotizacion
  using (rol_actual() in ('Asistente Comercial','Administrador'))
  with check (rol_actual() in ('Asistente Comercial','Administrador'));
alter policy cotizacion_detalle_select on public.cotizacion_detalle
  using (rol_actual() in ('Asistente Comercial','Administrador'));

alter policy parametro_select on public.parametro_sistema
  using (rol_actual() in ('Ayudante de compras','Asistente Comercial','Administrador'));

alter policy auditoria_select on public.auditoria
  using (rol_actual() in ('Asistente Comercial','Administrador'));

alter policy menu_foto_plato_select on public.menu_foto_plato
  using (rol_actual() in ('Cocina','Asistente Comercial','Administrador'));
alter policy menu_foto_plato_write on public.menu_foto_plato
  using (rol_actual() in ('Cocina','Administrador'))
  with check (rol_actual() in ('Cocina','Administrador'));

alter policy menu_imagenes_insert on storage.objects
  with check (bucket_id = 'menu-imagenes' and rol_actual() in ('Cocina','Administrador'));
alter policy menu_imagenes_update on storage.objects
  using (bucket_id = 'menu-imagenes' and rol_actual() in ('Cocina','Administrador'))
  with check (bucket_id = 'menu-imagenes' and rol_actual() in ('Cocina','Administrador'));
alter policy menu_imagenes_delete on storage.objects
  using (bucket_id = 'menu-imagenes' and rol_actual() in ('Cocina','Administrador'));

commit;
