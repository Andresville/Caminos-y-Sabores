-- La migración 22 (fix_auditoria_cliente) ya había resuelto este mismo
-- problema: en vez de guardar auth.uid() tal cual, primero chequea si
-- esa cuenta es de staff y si no lo es guarda NULL (un cliente nunca
-- debería dejar su UUID en auditoria.id_usuario — esa columna es para
-- rastrear acciones de staff; la identidad del cliente ya queda en
-- valor_nuevo). La migración 43 (módulo Eventos) hizo un `create or
-- replace` de esta misma función para agregar la entidad 'evento' al
-- CASE, pero partió de una copia vieja y sin querer revirtió el fix de
-- la 22. Esta migración restaura ese fix y lo combina con la entidad
-- 'evento' que sí hace falta.

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
    when 'evento' then (v_fila_referencia ->> 'id_evento')::integer
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
