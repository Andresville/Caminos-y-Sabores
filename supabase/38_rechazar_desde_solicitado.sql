-- El cliente se puede arrepentir incluso después de confirmar: ahora
-- puede rechazar un presupuesto también estando en SOLICITADO (antes
-- solo se podía responder mientras estaba PENDIENTE). "Aceptar" sigue
-- siendo exclusivo de PENDIENTE — una vez Solicitado no tiene sentido
-- "solicitar" de nuevo, solo rechazar.

begin;

create or replace function public.fn_validar_transicion_cotizacion()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "PENDIENTE": ["SOLICITADO", "RECHAZADA", "VENCIDA"],
    "SOLICITADO": ["EN_NEGOCIACION", "FINALIZADO", "CANCELADO", "RECHAZADA"],
    "EN_NEGOCIACION": ["FINALIZADO", "CANCELADO"],
    "VENCIDA": ["RECHAZADA"]
  }'::jsonb;
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (coalesce(v_transiciones_validas -> old.estado::text, '[]'::jsonb) ? new.estado::text) then
    raise exception 'No se puede pasar una solicitud de % a %', old.estado, new.estado;
  end if;

  return new;
end;
$$;

create or replace function public.responder_cotizacion_cliente(
  p_id_cotizacion integer,
  p_aceptar boolean,
  p_motivo_rechazo varchar default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id_cliente uuid;
  v_estado public.estado_cotizacion_enum;
begin
  select id_cliente, estado into v_id_cliente, v_estado
  from public.cotizacion
  where id_cotizacion = p_id_cotizacion;

  if v_id_cliente is null or v_id_cliente is distinct from auth.uid() then
    raise exception 'No puede responder una cotización que no le pertenece';
  end if;

  if v_estado = 'PENDIENTE'::public.estado_cotizacion_enum then
    -- puede aceptar o rechazar, sin restricción extra
    null;
  elsif v_estado = 'SOLICITADO'::public.estado_cotizacion_enum and not p_aceptar then
    -- se arrepintió después de confirmar: puede rechazar, pero no "aceptar" de nuevo
    null;
  else
    raise exception 'Esta solicitud ya no admite esa respuesta del cliente';
  end if;

  update public.cotizacion
  set estado = case when p_aceptar then 'SOLICITADO'::public.estado_cotizacion_enum else 'RECHAZADA'::public.estado_cotizacion_enum end,
      motivo_rechazo = case when p_aceptar then null else p_motivo_rechazo end
  where id_cotizacion = p_id_cotizacion;
end;
$$;

grant execute on function public.responder_cotizacion_cliente(integer, boolean, varchar) to authenticated;

commit;
