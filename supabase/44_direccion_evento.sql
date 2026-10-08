-- Antes de convertir un presupuesto en evento hace falta cargar la
-- dirección donde va a ser el evento — queda visible después en "Datos
-- del evento" dentro del módulo Eventos (y en su PDF). Se carga desde
-- la bandeja de Presupuestos, en el estado En Negociación (justo antes
-- del botón "Convertir en evento"); el trigger de la máquina de
-- estados es quien realmente impide pasar a Finalizado sin ella, el
-- campo deshabilitado en el frontend es solo comodidad.

begin;

alter table public.cotizacion add column direccion_evento varchar(200);

create or replace function public.fn_validar_transicion_cotizacion()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "PENDIENTE": ["SOLICITADO", "RECHAZADA", "VENCIDA"],
    "SOLICITADO": ["EN_NEGOCIACION", "FINALIZADO", "CANCELADO", "RECHAZADA"],
    "EN_NEGOCIACION": ["FINALIZADO", "CANCELADO", "RECHAZADA"],
    "VENCIDA": ["RECHAZADA"]
  }'::jsonb;
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (coalesce(v_transiciones_validas -> old.estado::text, '[]'::jsonb) ? new.estado::text) then
    raise exception 'No se puede pasar una solicitud de % a %', old.estado, new.estado;
  end if;

  if new.estado = 'FINALIZADO' and (new.direccion_evento is null or btrim(new.direccion_evento) = '') then
    raise exception 'No se puede convertir el presupuesto en evento sin cargar la dirección del evento';
  end if;

  return new;
end;
$$;

commit;
