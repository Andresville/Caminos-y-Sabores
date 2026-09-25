-- emitir_cotizacion_cliente() guardaba cantidad_pax = 1 fijo — nunca
-- se le pasaba el valor real, porque el carrito no tenía un campo
-- para que el cliente informe cuántos comensales espera en total
-- (cada línea tiene su propia cantidad independiente). Ahora el
-- formulario de "Solicitar Presupuesto" sí lo pide, así que la
-- función recibe ese valor real en vez de asumirlo.

begin;

drop function if exists public.emitir_cotizacion_cliente(
  uuid, varchar, date, varchar, varchar, varchar, boolean, numeric, numeric, numeric, integer, jsonb
);

create function public.emitir_cotizacion_cliente(
  p_id_cliente     uuid,
  p_tipo_evento    varchar,
  p_fecha_evento   date,
  p_cantidad_pax   integer,
  p_nombre_cliente varchar,
  p_email_cliente  varchar,
  p_telefono_cliente varchar,
  p_consentimiento_datos boolean,
  p_subtotal_neto  numeric,
  p_monto_iva      numeric,
  p_monto_total    numeric,
  p_validez_dias   integer,
  p_lineas         jsonb
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
  if auth.uid() is distinct from p_id_cliente then
    raise exception 'No puede emitir una cotización a nombre de otro cliente';
  end if;
  if not p_consentimiento_datos then
    raise exception 'Debe aceptar la política de privacidad para emitir la cotización';
  end if;
  if p_cantidad_pax is null or p_cantidad_pax < 1 then
    raise exception 'La cantidad de comensales debe ser al menos 1';
  end if;
  if p_fecha_evento < current_date then
    raise exception 'La fecha del evento no puede ser una fecha pasada';
  end if;

  v_codigo := 'COT-' || extract(year from now())::text || '-' || lpad(nextval('public.cotizacion_codigo_seq')::text, 5, '0');
  v_fecha_validez := (current_date + (p_validez_dias || ' days')::interval)::date;

  insert into public.cotizacion (
    codigo, id_cliente, tipo_evento, fecha_evento, fecha_validez, cantidad_pax,
    nombre_cliente, email_cliente, telefono_cliente, consentimiento_datos,
    subtotal_neto, monto_iva, monto_total, estado
  ) values (
    v_codigo, p_id_cliente, p_tipo_evento, p_fecha_evento, v_fecha_validez, p_cantidad_pax,
    p_nombre_cliente, p_email_cliente, p_telefono_cliente, p_consentimiento_datos,
    p_subtotal_neto, p_monto_iva, p_monto_total, 'EMITIDA'
  ) returning cotizacion.id_cotizacion into v_id_cotizacion;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    insert into public.cotizacion_detalle (
      id_cotizacion, tipo_item, referencia_id, descripcion, cantidad, precio_unitario_congelado, subtotal, orden
    ) values (
      v_id_cotizacion,
      (v_linea->>'tipo_item')::public.tipo_item_cotizacion_enum,
      (v_linea->>'referencia_id')::integer,
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

grant execute on function public.emitir_cotizacion_cliente(
  uuid, varchar, date, integer, varchar, varchar, varchar, boolean, numeric, numeric, numeric, integer, jsonb
) to authenticated;

commit;
