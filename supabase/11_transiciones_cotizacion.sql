-- Valida que los cambios de estado de una cotización sigan el diagrama
-- de estados del documento: EMITIDA -> EN_NEGOCIACION -> {CONFIRMADA |
-- RECHAZADA}; VENCIDA solo puede pasar a RECHAZADA (descartar; una
-- cotización vencida nunca se confirma, se recotiza generando una
-- nueva); CONFIRMADA -> EJECUTADA. El pase automático a VENCIDA lo
-- hace un proceso programado que todavía no existe (queda pendiente,
-- es infraestructura aparte); por eso EMITIDA->VENCIDA también está
-- permitido acá aunque hoy nadie lo dispare automáticamente.
--
-- Esto se suma al trigger fn_proteger_cotizacion_emitida (que protege
-- los campos congelados) y a la política RLS existente (que ya
-- restringe estos cambios a Gerente Comercial).

begin;

create or replace function public.fn_validar_transicion_cotizacion()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "EMITIDA": ["EN_NEGOCIACION", "VENCIDA"],
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

create trigger trg_validar_transicion_cotizacion
  before update on public.cotizacion
  for each row execute function public.fn_validar_transicion_cotizacion();

commit;
