-- Dos ajustes sobre el rediseño de Solicitudes (migración 34):
--
-- 1. El descuento (y el recálculo de subtotal/IVA/total que dispara)
--    ahora se puede cargar en Solicitado, Aprobado por el cliente Y En
--    negociación — no solo en Solicitado. Las CANTIDADES de las líneas
--    siguen siendo ajustables solo en Solicitado (ahí es donde tiene
--    sentido tocar lo que pidió el cliente); en los otros dos estados
--    ajustar_solicitud_comercial ya no toca cotizacion_detalle en
--    absoluto, para no disparar el trigger que protege esa tabla fuera
--    de Solicitado.
--
-- 2. El Total Final que ve Comercial ahora incluye IVA (antes solo
--    mostraba el neto post-descuento), para que coincida exactamente
--    con el total que ve el cliente en su propio presupuesto.
--    (Esto último es un cambio de la pantalla, no de la base — la
--    fórmula acá ya calculaba subtotal+IVA+total correctamente, lo
--    único que hacía falta era mostrarlo también en el backoffice.)

begin;

create or replace function public.fn_proteger_cotizacion_emitida()
returns trigger
language plpgsql
as $$
declare
  v_estados_editables public.estado_cotizacion_enum[] := array['SOLICITADO', 'APROBADO', 'EN_NEGOCIACION']::public.estado_cotizacion_enum[];
begin
  if new.codigo               is distinct from old.codigo
     or new.fecha_emision     is distinct from old.fecha_emision
     or new.fecha_evento      is distinct from old.fecha_evento
     or new.fecha_validez     is distinct from old.fecha_validez
     or new.cantidad_pax      is distinct from old.cantidad_pax
     or new.nombre_cliente    is distinct from old.nombre_cliente
     or new.email_cliente     is distinct from old.email_cliente
  then
    raise exception 'Una cotización emitida no puede modificar sus datos congelados, solo su estado';
  end if;

  if not (old.estado = any(v_estados_editables))
     and (
       new.subtotal_neto is distinct from old.subtotal_neto
       or new.monto_iva is distinct from old.monto_iva
       or new.monto_total is distinct from old.monto_total
       or new.descuento_pct is distinct from old.descuento_pct
     )
  then
    raise exception 'El precio de una solicitud finalizada, cancelada o rechazada no se puede modificar';
  end if;

  return new;
end;
$$;

create or replace function public.ajustar_solicitud_comercial(
  p_id_cotizacion integer,
  p_descuento_pct numeric,
  p_lineas jsonb
)
returns public.cotizacion
language plpgsql
security invoker
as $$
declare
  v_estado public.estado_cotizacion_enum;
  v_iva_pct numeric;
  v_redondeo numeric;
  v_subtotal_bruto numeric(14,2);
  v_subtotal_neto numeric(14,2);
  v_monto_iva numeric(14,2);
  v_monto_total numeric(14,2);
  v_resultado public.cotizacion;
begin
  if p_descuento_pct < 0 or p_descuento_pct >= 100 then
    raise exception 'El descuento debe ser un porcentaje entre 0 y 100';
  end if;

  select estado into v_estado from public.cotizacion where id_cotizacion = p_id_cotizacion;
  if v_estado is null then
    raise exception 'La solicitud % no existe', p_id_cotizacion;
  end if;
  if not (v_estado = any(array['SOLICITADO', 'APROBADO', 'EN_NEGOCIACION']::public.estado_cotizacion_enum[])) then
    raise exception 'Esta solicitud ya no admite ajustes de precio';
  end if;

  -- Las cantidades de línea solo se pueden tocar en Solicitado: en los
  -- otros dos estados ni se intenta, para no disparar el trigger que
  -- protege el detalle fuera de esa etapa.
  if v_estado = 'SOLICITADO'::public.estado_cotizacion_enum then
    update public.cotizacion_detalle
    set cantidad = (linea->>'cantidad')::numeric,
        subtotal = round((linea->>'cantidad')::numeric * precio_unitario_congelado, 2)
    from jsonb_array_elements(p_lineas) as linea
    where cotizacion_detalle.id_detalle = (linea->>'id_detalle')::integer
      and cotizacion_detalle.id_cotizacion = p_id_cotizacion;
  end if;

  select coalesce(sum(subtotal), 0) into v_subtotal_bruto
  from public.cotizacion_detalle
  where id_cotizacion = p_id_cotizacion;

  select valor::numeric into v_iva_pct from public.parametro_sistema where clave = 'IVA_PORCENTAJE';
  select valor::numeric into v_redondeo from public.parametro_sistema where clave = 'REDONDEO_PRECIO_FINAL';

  v_subtotal_neto := round(v_subtotal_bruto * (1 - p_descuento_pct / 100), 2);
  v_monto_iva := round(v_subtotal_neto * coalesce(v_iva_pct, 0) / 100, 2);
  v_monto_total := round((v_subtotal_neto + v_monto_iva) / coalesce(v_redondeo, 1)) * coalesce(v_redondeo, 1);

  update public.cotizacion
  set descuento_pct = p_descuento_pct,
      subtotal_neto = v_subtotal_neto,
      monto_iva = v_monto_iva,
      monto_total = v_monto_total
  where id_cotizacion = p_id_cotizacion
  returning * into v_resultado;

  return v_resultado;
end;
$$;

commit;
