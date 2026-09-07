-- Gerente Comercial/Administrador pueden leer auditoria (RLS ya
-- existente), pero auditoria.id_usuario solo se resuelve a un nombre
-- si se puede leer la tabla usuario del que hizo el cambio, y
-- usuario_select_propio solo deja ver la fila propia (o a
-- Administrador). Sin esto, Gerente Comercial vería el registro pero
-- no "quién" lo hizo — justamente el dato central de un log de
-- auditoría.
--
-- La función hace su propio chequeo de rol y encapsula el join con
-- usuario vía security definer, sin abrir usuario en general.

begin;

create or replace function public.obtener_auditoria(
  p_entidad text default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null
)
returns table (
  id_auditoria bigint,
  entidad text,
  id_entidad integer,
  accion text,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  fecha_hora timestamptz,
  nombre_usuario text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Gerente Comercial', 'Administrador') then
    raise exception 'No tiene permiso para consultar la auditoría';
  end if;

  return query
    select
      a.id_auditoria,
      a.entidad::text,
      a.id_entidad,
      a.accion::text,
      a.valor_anterior,
      a.valor_nuevo,
      a.fecha_hora,
      u.nombre_completo::text as nombre_usuario
    from public.auditoria a
    left join public.usuario u on u.id_usuario = a.id_usuario
    where (p_entidad is null or a.entidad = p_entidad)
      and (p_desde is null or a.fecha_hora >= p_desde)
      and (p_hasta is null or a.fecha_hora <= p_hasta)
    order by a.fecha_hora desc
    limit 200;
end;
$$;

grant execute on function public.obtener_auditoria(text, timestamptz, timestamptz) to authenticated;

commit;
