-- Registro automático de auditoría sobre las entidades
-- "maestras" sensibles del sistema. Deliberadamente NO se aplica a las
-- tablas de líneas (receta_materia_prima, menu_receta): como los
-- editores de receta/menú borran y reinsertan todas las líneas en cada
-- guardado, auditar ahí generaría una fila por cada línea en cada
-- guardado, sin aportar información útil. Lo que importa auditar es el
-- cambio sobre la entidad principal.
--
-- security definer + auth.uid(): auth.uid() lee el JWT de la sesión
-- que disparó la operación (no cambia por ser security definer), así
-- que el registro siempre queda a nombre de quien hizo el cambio real,
-- no del dueño de la función.

begin;

create or replace function public.fn_registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_valor_anterior jsonb;
  v_valor_nuevo jsonb;
  v_id_entidad integer;
  v_fila_referencia jsonb;
begin
  if TG_OP = 'INSERT' then
    v_valor_nuevo := to_jsonb(NEW);
  elsif TG_OP = 'UPDATE' then
    v_valor_anterior := to_jsonb(OLD);
    v_valor_nuevo := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    v_valor_anterior := to_jsonb(OLD);
  end if;

  v_fila_referencia := coalesce(v_valor_nuevo, v_valor_anterior);

  v_id_entidad := case TG_TABLE_NAME
    when 'materia_prima' then (v_fila_referencia ->> 'id_materia_prima')::integer
    when 'receta' then (v_fila_referencia ->> 'id_receta')::integer
    when 'menu' then (v_fila_referencia ->> 'id_menu')::integer
    when 'servicio_adicional' then (v_fila_referencia ->> 'id_adicional')::integer
    when 'cotizacion' then (v_fila_referencia ->> 'id_cotizacion')::integer
    else null
  end;

  insert into public.auditoria (id_usuario, entidad, id_entidad, accion, valor_anterior, valor_nuevo, fecha_hora)
  values (auth.uid(), TG_TABLE_NAME, v_id_entidad, TG_OP, v_valor_anterior, v_valor_nuevo, now());

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_auditoria_materia_prima
  after insert or update or delete on public.materia_prima
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_receta
  after insert or update or delete on public.receta
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_menu
  after insert or update or delete on public.menu
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_servicio_adicional
  after insert or update or delete on public.servicio_adicional
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_usuario
  after insert or update or delete on public.usuario
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_parametro_sistema
  after insert or update or delete on public.parametro_sistema
  for each row execute function public.fn_registrar_auditoria();

create trigger trg_auditoria_cotizacion
  after insert or update or delete on public.cotizacion
  for each row execute function public.fn_registrar_auditoria();

commit;
