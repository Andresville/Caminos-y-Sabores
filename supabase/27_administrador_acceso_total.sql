-- Nueva definición de negocio: Administrador es quien termina haciendo
-- todo en el backoffice — tiene que poder leer, crear y modificar en
-- cada módulo, no solo en usuarios/roles/parámetros como hasta ahora.
-- Se agrega Administrador a cada política de escritura (INSERT/UPDATE/
-- DELETE) que todavía lo dejaba afuera, y a las dos funciones de
-- negocio con chequeo de rol manual que lo bloqueaban.
--
-- Queda deliberadamente afuera la escritura de auditoria: nadie
-- edita el registro de auditoría a mano, ni siquiera Administrador
-- — la completan los triggers del sistema, y su integridad depende
-- de que no sea editable por ningún rol.

begin;

-- 1. Funciones con chequeo de rol manual.
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
  if rol_actual() not in ('Ayudante de compras', 'Administrador') then
    raise exception 'Solo Ayudante de compras o Administrador pueden actualizar el precio de un insumo';
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

-- 2. Políticas de escritura que todavía dejaban afuera a Administrador.
alter policy categoria_insumo_insert on public.categoria_insumo
  with check (rol_actual() in ('Ayudante de compras','Administrador'));
alter policy categoria_insumo_update on public.categoria_insumo
  using (rol_actual() in ('Ayudante de compras','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Administrador'));

alter policy proveedor_insert on public.proveedor
  with check (rol_actual() in ('Ayudante de compras','Administrador'));
alter policy proveedor_update on public.proveedor
  using (rol_actual() in ('Ayudante de compras','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Administrador'));

alter policy materia_prima_insert on public.materia_prima
  with check (rol_actual() in ('Ayudante de compras','Administrador'));
alter policy materia_prima_update on public.materia_prima
  using (rol_actual() in ('Ayudante de compras','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Administrador'));

alter policy receta_insert on public.receta
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_update on public.receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy receta_mp_insert on public.receta_materia_prima
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_mp_update on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy receta_mp_delete on public.receta_materia_prima
  using (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy menu_insert on public.menu
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy menu_receta_insert on public.menu_receta
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_receta_update on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_receta_delete on public.menu_receta
  using (rol_actual() in ('Ayudante de cocina','Administrador'));

alter policy servicio_adicional_insert on public.servicio_adicional
  with check (rol_actual() in ('Ayudante de compras','Comercial','Administrador'));
alter policy servicio_adicional_update on public.servicio_adicional
  using (rol_actual() in ('Ayudante de compras','Comercial','Administrador'))
  with check (rol_actual() in ('Ayudante de compras','Comercial','Administrador'));

alter policy cotizacion_update_estado on public.cotizacion
  using (rol_actual() in ('Comercial','Administrador'))
  with check (rol_actual() in ('Comercial','Administrador'));

alter policy menu_foto_plato_write on public.menu_foto_plato
  using (rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (rol_actual() in ('Ayudante de cocina','Administrador'));

-- 3. Storage: subir/cambiar/borrar fotos de plato de menú.
alter policy menu_imagenes_insert on storage.objects
  with check (bucket_id = 'menu-imagenes' and rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_imagenes_update on storage.objects
  using (bucket_id = 'menu-imagenes' and rol_actual() in ('Ayudante de cocina','Administrador'))
  with check (bucket_id = 'menu-imagenes' and rol_actual() in ('Ayudante de cocina','Administrador'));
alter policy menu_imagenes_delete on storage.objects
  using (bucket_id = 'menu-imagenes' and rol_actual() in ('Ayudante de cocina','Administrador'));

commit;
