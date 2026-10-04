-- Reorganización de roles: "Cocina" vuelve a llamarse "Ayudante de
-- cocina" (se revierte el rename de la migración 28), y el rol
-- "Ayudante de compras" desaparece del todo. Quedan solo 3 roles:
-- Administrador, Ayudante de Cocina, Asistente Comercial.
--
-- Todo lo que hoy escribe "Ayudante de compras" (Insumos: materias
-- primas/categorías/proveedores/unidades, y Servicios Adicionales)
-- pasa a ser exclusivo de Administrador — decisión confirmada con el
-- usuario, no se reparte entre los roles que quedan.

begin;

-- 0. Si todavía queda algún usuario real con "Ayudante de compras",
--    esto frena acá (violación de FK en el paso 8) antes de borrar el
--    rol — hay que reasignarlo manualmente en Usuarios primero.

-- 1. Renombra Cocina -> Ayudante de cocina (mismo patrón que ya se usó
--    para los renombres anteriores).
update public.rol set nombre_rol = 'Ayudante de cocina' where nombre_rol = 'Cocina';

-- 2. actualizar_precio_materia_prima(): ahora exclusivo de Administrador.
create or replace function public.actualizar_precio_materia_prima(
  p_id_materia_prima integer,
  p_precio_bulto numeric,
  p_cantidad_bulto numeric,
  p_motivo varchar default null
)
returns public.materia_prima
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_precio_bulto_anterior numeric(12,2);
  v_cantidad_bulto_anterior numeric(12,3);
  v_costo_unitario_anterior numeric(12,2);
  v_costo_unitario_nuevo numeric(12,2);
  v_variacion_pct numeric(7,2);
  v_umbral numeric(7,2);
  v_resultado public.materia_prima;
begin
  if rol_actual() <> 'Administrador' then
    raise exception 'Solo Administrador puede actualizar el precio de un insumo';
  end if;

  if p_precio_bulto <= 0 then
    raise exception 'El precio del bulto debe ser mayor a cero';
  end if;
  if p_cantidad_bulto <= 0 then
    raise exception 'La cantidad/peso del bulto debe ser mayor a cero';
  end if;

  select precio_bulto, cantidad_bulto, costo_unitario
    into v_precio_bulto_anterior, v_cantidad_bulto_anterior, v_costo_unitario_anterior
  from public.materia_prima
  where id_materia_prima = p_id_materia_prima
  for update;

  if v_precio_bulto_anterior is null then
    raise exception 'La materia prima % no existe', p_id_materia_prima;
  end if;

  v_costo_unitario_nuevo := round(p_precio_bulto / p_cantidad_bulto, 2);
  v_variacion_pct := round(((v_costo_unitario_nuevo - v_costo_unitario_anterior) / v_costo_unitario_anterior) * 100, 2);

  select valor::numeric into v_umbral
  from public.parametro_sistema
  where clave = 'UMBRAL_MOTIVO_PRECIO_PCT';

  if abs(v_variacion_pct) > v_umbral and (p_motivo is null or btrim(p_motivo) = '') then
    raise exception 'La variación de precio del % por ciento supera el umbral configurado; debe indicar un motivo', round(abs(v_variacion_pct), 2);
  end if;

  update public.materia_prima
  set precio_bulto = p_precio_bulto,
      cantidad_bulto = p_cantidad_bulto,
      costo_unitario = v_costo_unitario_nuevo,
      ultima_actualizacion = now()
  where id_materia_prima = p_id_materia_prima
  returning * into v_resultado;

  insert into public.historico_precio_mp
    (id_materia_prima, precio_bulto_anterior, precio_bulto_nuevo, cantidad_bulto_anterior, cantidad_bulto_nuevo, variacion_pct, motivo, id_usuario, fecha_cambio)
  values
    (p_id_materia_prima, v_precio_bulto_anterior, p_precio_bulto, v_cantidad_bulto_anterior, p_cantidad_bulto, v_variacion_pct, p_motivo, auth.uid(), now());

  return v_resultado;
end;
$$;

-- 3. Insumos: lectura para Ayudante de cocina/Asistente Comercial/Administrador, escritura solo Administrador.
alter policy unidad_medida_select on public.unidad_medida
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy unidad_medida_insert on public.unidad_medida
  with check (rol_actual() = 'Administrador');
alter policy unidad_medida_update on public.unidad_medida
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

alter policy categoria_insumo_select on public.categoria_insumo
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy categoria_insumo_insert on public.categoria_insumo
  with check (rol_actual() = 'Administrador');
alter policy categoria_insumo_update on public.categoria_insumo
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

alter policy proveedor_select on public.proveedor
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy proveedor_insert on public.proveedor
  with check (rol_actual() = 'Administrador');
alter policy proveedor_update on public.proveedor
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

alter policy materia_prima_select on public.materia_prima
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy materia_prima_insert on public.materia_prima
  with check (rol_actual() = 'Administrador');
alter policy materia_prima_update on public.materia_prima
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

alter policy historico_precio_select on public.historico_precio_mp
  using (rol_actual() in ('Asistente Comercial','Administrador'));

-- 4. Recetas y menú: Cocina -> Ayudante de cocina.
alter policy receta_select on public.receta
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy receta_insert on public.receta
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_update on public.receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy receta_mp_select on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy receta_mp_insert on public.receta_materia_prima
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_mp_update on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_mp_delete on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy menu_select on public.menu
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy menu_insert on public.menu
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_update on public.menu
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy menu_receta_select on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Asistente Comercial','Administrador'));
alter policy menu_receta_insert on public.menu_receta
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_receta_update on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_receta_delete on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'));

-- 5. Fotos de receta/menú (buckets): Cocina -> Ayudante de cocina.
alter policy receta_imagenes_insert on storage.objects
  with check (bucket_id = 'receta-imagenes' and rol_actual() in ('Ayudante de cocina', 'Administrador'));
alter policy receta_imagenes_update on storage.objects
  using (bucket_id = 'receta-imagenes' and rol_actual() in ('Ayudante de cocina', 'Administrador'))
  with check (bucket_id = 'receta-imagenes' and rol_actual() in ('Ayudante de cocina', 'Administrador'));
alter policy receta_imagenes_delete on storage.objects
  using (bucket_id = 'receta-imagenes' and rol_actual() in ('Ayudante de cocina', 'Administrador'));

alter policy menu_fotos_insert on storage.objects
  with check (bucket_id = 'menu-fotos' and rol_actual() in ('Ayudante de cocina', 'Administrador'));
alter policy menu_fotos_update on storage.objects
  using (bucket_id = 'menu-fotos' and rol_actual() in ('Ayudante de cocina', 'Administrador'))
  with check (bucket_id = 'menu-fotos' and rol_actual() in ('Ayudante de cocina', 'Administrador'));
alter policy menu_fotos_delete on storage.objects
  using (bucket_id = 'menu-fotos' and rol_actual() in ('Ayudante de cocina', 'Administrador'));

-- 6. Servicios Adicionales: lectura Asistente Comercial/Administrador, escritura solo Administrador.
alter policy servicio_adicional_select on public.servicio_adicional
  using (rol_actual() in ('Asistente Comercial','Administrador'));
alter policy servicio_adicional_insert on public.servicio_adicional
  with check (rol_actual() = 'Administrador');
alter policy servicio_adicional_update on public.servicio_adicional
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

-- 7. parametro_sistema: saca a Ayudante de compras de los parámetros que modificaba, pasan a Administrador.
alter policy parametro_select on public.parametro_sistema
  using (rol_actual() in ('Asistente Comercial','Administrador'));

update public.parametro_sistema
set modificable_por_rol = 'Administrador'
where modificable_por_rol = 'Ayudante de compras';

-- 8. Borra el rol. Si todavía hay un usuario real con este rol, esto
--    falla (FK de usuario.id_rol) — hay que reasignarlo a mano en
--    Usuarios antes de volver a correr este paso.
delete from public.rol where nombre_rol = 'Ayudante de compras';

commit;
