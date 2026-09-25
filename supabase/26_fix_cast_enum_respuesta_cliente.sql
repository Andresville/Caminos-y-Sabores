-- responder_cotizacion_cliente() fallaba siempre con "column 'estado'
-- is of type estado_cotizacion_enum but expression is of type text":
-- el CASE que elige 'CONFIRMADA'/'RECHAZADA' resuelve sus literales
-- como texto (no hay contexto para inferir el enum dentro de un CASE
-- con múltiples columnas en el SET), y Postgres no castea texto a
-- enum de forma implícita. Se corrige casteando cada rama al enum.

begin;

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
  if v_estado not in ('EMITIDA', 'EN_NEGOCIACION') then
    raise exception 'Esta cotización ya no admite una respuesta del cliente';
  end if;

  update public.cotizacion
  set estado = case when p_aceptar then 'CONFIRMADA'::public.estado_cotizacion_enum else 'RECHAZADA'::public.estado_cotizacion_enum end,
      motivo_rechazo = case when p_aceptar then null else p_motivo_rechazo end
  where id_cotizacion = p_id_cotizacion;
end;
$$;

commit;
