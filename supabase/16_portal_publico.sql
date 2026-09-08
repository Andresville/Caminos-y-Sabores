-- Soporte de base para el portal público de cotización (wizard anónimo).
--
-- 1. El wizard tiene que capturar el tipo de evento junto con la
--    cantidad de invitados y la fecha, pero la tabla cotizacion no
--    tenía columna para guardarlo.
-- 2. Hace falta limitar la cantidad de emisiones por dirección de red
--    en una ventana temporal. Se resuelve con el mismo patrón que ya
--    usa el bloqueo de login por intentos fallidos: parámetros
--    configurables + una función security definer que hace el conteo,
--    reutilizando la columna cotizacion.origen_ip que ya existía.

begin;

alter table public.cotizacion
  add column tipo_evento varchar(50) not null default 'Otro';

insert into public.parametro_sistema (clave, valor, tipo_dato, descripcion, modificable_por_rol) values
  ('LIMITE_EMISIONES_IP', '3', 'ENTERO', 'Cantidad máxima de cotizaciones que se pueden emitir desde la misma dirección de red dentro de la ventana de tiempo configurada.', 'Administrador'),
  ('VENTANA_LIMITE_EMISIONES_MINUTOS', '60', 'ENTERO', 'Ventana de tiempo, en minutos, sobre la que se cuentan las emisiones por dirección de red.', 'Administrador');

create or replace function public.puede_emitir_cotizacion(p_ip varchar)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_limite integer;
  v_ventana_minutos integer;
  v_emitidas integer;
begin
  if p_ip is null then
    return true;
  end if;

  select valor::integer into v_limite from public.parametro_sistema where clave = 'LIMITE_EMISIONES_IP';
  select valor::integer into v_ventana_minutos from public.parametro_sistema where clave = 'VENTANA_LIMITE_EMISIONES_MINUTOS';

  select count(*) into v_emitidas
  from public.cotizacion
  where origen_ip = p_ip
    and fecha_emision >= now() - (v_ventana_minutos || ' minutes')::interval;

  return v_emitidas < v_limite;
end;
$$;

grant execute on function public.puede_emitir_cotizacion(varchar) to authenticated, anon;

-- 3. Emitir la cotización: inserta el encabezado y todas sus líneas en
--    una sola transacción (mismo patrón que
--    guardar_receta_completa/guardar_composicion_menu), generando el
--    código único (formato COT-AAAA-NNNNN) y la fecha de validez. Los
--    importes ya llegan calculados por el motor de dominio en el
--    servidor; esta función solo persiste, nunca calcula precios.

create sequence if not exists public.cotizacion_codigo_seq;

create or replace function public.emitir_cotizacion(
  p_tipo_evento varchar,
  p_fecha_evento date,
  p_cantidad_pax integer,
  p_id_menu integer,
  p_nombre_cliente varchar,
  p_email_cliente varchar,
  p_telefono_cliente varchar,
  p_consentimiento_datos boolean,
  p_origen_ip varchar,
  p_subtotal_neto numeric,
  p_monto_iva numeric,
  p_monto_total numeric,
  p_validez_dias integer,
  p_lineas jsonb
)
returns table (id_cotizacion integer, codigo varchar, fecha_validez date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_codigo varchar(20);
  v_id_cotizacion integer;
  v_fecha_validez date;
  v_linea jsonb;
  v_orden integer := 1;
begin
  if not p_consentimiento_datos then
    raise exception 'Debe aceptar la política de privacidad para emitir la cotización';
  end if;

  v_codigo := 'COT-' || extract(year from now())::text || '-' || lpad(nextval('public.cotizacion_codigo_seq')::text, 5, '0');
  v_fecha_validez := (current_date + (p_validez_dias || ' days')::interval)::date;

  insert into public.cotizacion (
    codigo, tipo_evento, fecha_evento, fecha_validez, cantidad_pax, id_menu,
    nombre_cliente, email_cliente, telefono_cliente, consentimiento_datos, origen_ip,
    subtotal_neto, monto_iva, monto_total, estado
  ) values (
    v_codigo, p_tipo_evento, p_fecha_evento, v_fecha_validez, p_cantidad_pax, p_id_menu,
    p_nombre_cliente, p_email_cliente, p_telefono_cliente, p_consentimiento_datos, p_origen_ip,
    p_subtotal_neto, p_monto_iva, p_monto_total, 'EMITIDA'
  ) returning cotizacion.id_cotizacion into v_id_cotizacion;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    insert into public.cotizacion_detalle (
      id_cotizacion, tipo_item, referencia_id, descripcion, cantidad, precio_unitario_congelado, subtotal, orden
    ) values (
      v_id_cotizacion,
      (v_linea->>'tipo_item')::public.tipo_item_cotizacion_enum,
      case when v_linea->>'referencia_id' is null then null else (v_linea->>'referencia_id')::integer end,
      v_linea->>'descripcion',
      (v_linea->>'cantidad')::numeric,
      (v_linea->>'precio_unitario')::numeric,
      (v_linea->>'subtotal')::numeric,
      v_orden
    );
    v_orden := v_orden + 1;
  end loop;

  return query select v_id_cotizacion, v_codigo, v_fecha_validez;
end;
$$;

grant execute on function public.emitir_cotizacion(
  varchar, date, integer, integer, varchar, varchar, varchar, boolean, varchar,
  numeric, numeric, numeric, integer, jsonb
) to authenticated, anon;

-- Solo el backend puede fijar el hash de integridad, después de emitir.
create or replace function public.actualizar_hash_cotizacion(p_id_cotizacion integer, p_hash varchar)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.cotizacion set hash_documento = p_hash where id_cotizacion = p_id_cotizacion;
$$;

grant execute on function public.actualizar_hash_cotizacion(integer, varchar) to authenticated, anon;

commit;
