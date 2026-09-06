-- Saca las referencias a códigos de regla internos (RN-XX, RF-XX) de
-- todo lo que puede terminar visible para un usuario: mensajes de error
-- de las funciones/triggers, y las descripciones de parámetros del
-- sistema (que se van a mostrar el día que exista una pantalla de
-- parámetros). Esas referencias son documentación interna del equipo,
-- no algo para que vea un usuario del sistema.

begin;

create or replace function public.fn_proteger_cotizacion_emitida()
returns trigger
language plpgsql
as $$
begin
  if new.codigo               is distinct from old.codigo
     or new.fecha_emision     is distinct from old.fecha_emision
     or new.fecha_evento      is distinct from old.fecha_evento
     or new.fecha_validez     is distinct from old.fecha_validez
     or new.cantidad_pax      is distinct from old.cantidad_pax
     or new.subtotal_neto     is distinct from old.subtotal_neto
     or new.monto_iva         is distinct from old.monto_iva
     or new.monto_total       is distinct from old.monto_total
     or new.nombre_cliente    is distinct from old.nombre_cliente
     or new.email_cliente     is distinct from old.email_cliente
  then
    raise exception 'Una cotización emitida no puede modificar sus datos congelados, solo su estado';
  end if;
  return new;
end;
$$;

create or replace function public.fn_bloquear_edicion_detalle()
returns trigger
language plpgsql
as $$
begin
  raise exception 'El detalle de una cotización emitida es inmutable';
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
  if rol_actual() <> 'Jefe de Compras' then
    raise exception 'Solo Jefe de Compras puede actualizar el precio de un insumo';
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

update public.parametro_sistema set descripcion = 'Alícuota de IVA aplicada al precio neto.' where clave = 'IVA_PORCENTAJE';
update public.parametro_sistema set descripcion = 'Gastos generales sobre el costo directo. PENDIENTE DE FIRMA.' where clave = 'GASTOS_GENERALES_PCT';
update public.parametro_sistema set descripcion = 'Coeficiente de venta por defecto. PENDIENTE DE FIRMA.' where clave = 'COEFICIENTE_VENTA_DEFECTO';
update public.parametro_sistema set descripcion = 'Cantidad de invitados por mozo. PENDIENTE DE FIRMA.' where clave = 'PAX_POR_MOZO';
update public.parametro_sistema set descripcion = 'Costo por mozo por evento. PENDIENTE DE FIRMA.' where clave = 'COSTO_MOZO_EVENTO';
update public.parametro_sistema set descripcion = 'Mínimo de invitados para cotización automática.' where clave = 'PAX_MINIMO_EVENTO';
update public.parametro_sistema set descripcion = 'Máximo de invitados para cotización automática.' where clave = 'PAX_MAXIMO_AUTOMATICO';
update public.parametro_sistema set descripcion = 'Días de validez de una cotización.' where clave = 'VALIDEZ_COTIZACION_DIAS';
update public.parametro_sistema set descripcion = 'Días para considerar un precio desactualizado.' where clave = 'DIAS_ALERTA_PRECIO';
update public.parametro_sistema set descripcion = 'Umbral de variación que exige motivo.' where clave = 'UMBRAL_MOTIVO_PRECIO_PCT';
update public.parametro_sistema set descripcion = 'Múltiplo de redondeo comercial del precio final.' where clave = 'REDONDEO_PRECIO_FINAL';

commit;
