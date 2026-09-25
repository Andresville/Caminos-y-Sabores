-- Nueva definición de negocio: el cliente puede aceptar o rechazar su
-- presupuesto directamente mientras está en EMITIDA ("Solicitado" —
-- el estimado automático, todavía no revisado por Comercial), no solo
-- cuando Comercial ya lo pasó a EN_NEGOCIACION. Ambos caminos siguen
-- existiendo: si Comercial interviene antes (revisa/ajusta y lo pasa a
-- EN_NEGOCIACION), el cliente responde esa versión formal; si no
-- interviene, el cliente puede responder el estimado tal cual. En
-- ambos casos la decisión es definitiva (CONFIRMADA/RECHAZADA son
-- estados terminales para el cliente).
--
-- También se guarda el motivo cuando rechaza (opcional, ayuda al
-- equipo comercial a entender por qué).

begin;

create or replace function public.fn_validar_transicion_cotizacion()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "EMITIDA": ["EN_NEGOCIACION", "VENCIDA", "CONFIRMADA", "RECHAZADA"],
    "EN_NEGOCIACION": ["CONFIRMADA", "RECHAZADA"],
    "VENCIDA": ["RECHAZADA"],
    "CONFIRMADA": ["EJECUTADA"]
  }'::jsonb;
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (coalesce(v_transiciones_validas -> old.estado::text, '[]'::jsonb) ? new.estado::text) then
    raise exception 'No se puede pasar una cotización de % a %', old.estado, new.estado;
  end if;

  return new;
end;
$$;

alter table public.cotizacion
  add column motivo_rechazo varchar(500);

drop function if exists public.responder_cotizacion_cliente(integer, boolean);

create function public.responder_cotizacion_cliente(
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
  if v_estado not in ('EMITIDA', 'EN_NEGOCIACION') then
    raise exception 'Esta cotización ya no admite una respuesta del cliente';
  end if;

  update public.cotizacion
  set estado = case when p_aceptar then 'CONFIRMADA' else 'RECHAZADA' end,
      motivo_rechazo = case when p_aceptar then null else p_motivo_rechazo end
  where id_cotizacion = p_id_cotizacion;
end;
$$;

grant execute on function public.responder_cotizacion_cliente(integer, boolean, varchar) to authenticated;

commit;
