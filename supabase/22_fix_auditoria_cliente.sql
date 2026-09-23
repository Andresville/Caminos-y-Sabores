-- fn_registrar_auditoria() guardaba auth.uid() tal cual en
-- auditoria.id_usuario, que tiene una foreign key contra la tabla
-- usuario (solo staff). Ahora que existen cuentas de cliente reales,
-- un cliente autenticado que dispara el trigger (por ejemplo, al
-- emitir su propia cotización) tiene un auth.uid() válido que NO
-- existe en "usuario" — la inserción de auditoría fallaba con un
-- error de foreign key, y con ella toda la operación.
--
-- La corrección: solo se guarda el id_usuario si esa cuenta es
-- efectivamente de staff. Para un cliente, la auditoría de esa fila
-- queda sin usuario asociado (el propio valor_nuevo ya tiene
-- id_cliente, así que sigue siendo trazable).

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
  v_id_usuario_staff uuid;
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

  select id_usuario into v_id_usuario_staff from public.usuario where id_usuario = auth.uid();

  insert into public.auditoria (id_usuario, entidad, id_entidad, accion, valor_anterior, valor_nuevo, fecha_hora)
  values (v_id_usuario_staff, TG_TABLE_NAME, v_id_entidad, TG_OP, v_valor_anterior, v_valor_nuevo, now());

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

commit;
