-- Estado Activo/Inactivo del cliente: Activo siempre que tenga algo
-- pendiente (un presupuesto en curso o un evento no terminado); solo se
-- puede pasar a Inactivo a mano cuando no tiene nada pendiente, y si
-- más adelante vuelve a tener algo pendiente la marca se borra sola.

begin;

alter table public.cliente add column estado boolean not null default true;

-- Reactivación automática: se agrega a la misma función/trigger que ya
-- existe (fn_crear_evento_al_finalizar corre en cada update de
-- cotizacion), sin crear un trigger nuevo.
create or replace function public.fn_crear_evento_al_finalizar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'FINALIZADO' and old.estado is distinct from 'FINALIZADO' then
    insert into public.evento (id_cotizacion)
    values (new.id_cotizacion)
    on conflict (id_cotizacion) do nothing;
  end if;

  if new.id_cliente is not null and new.estado in ('SOLICITADO', 'EN_NEGOCIACION', 'FINALIZADO') then
    update public.cliente set estado = true where id_cliente = new.id_cliente;
  end if;

  return new;
end;
$$;

-- Edición desde el backoffice: cliente no tiene policy de update para
-- staff (solo self-update), así que el guardado pasa por una función
-- security definer, mismo criterio que generar_lista_compra_evento /
-- fn_validar_transicion_evento. Acá además vive el guard de negocio
-- ("no se puede inactivar con algo pendiente"). Sin función ni policy
-- de insert para cliente: el alta sigue siendo exclusivamente el
-- self-signup del portal, el backoffice nunca crea clientes nuevos.
create or replace function public.actualizar_cliente_staff(
  p_id_cliente uuid,
  p_nombre_completo varchar,
  p_telefono varchar,
  p_estado boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Asistente Comercial', 'Administrador') then
    raise exception 'No tiene permiso para editar clientes';
  end if;

  if not p_estado and exists (
    select 1 from public.cotizacion
    where id_cliente = p_id_cliente and estado in ('SOLICITADO', 'EN_NEGOCIACION')
  ) then
    raise exception 'No se puede inactivar: el cliente tiene presupuestos en curso';
  end if;

  if not p_estado and exists (
    select 1 from public.evento e
    join public.cotizacion c on c.id_cotizacion = e.id_cotizacion
    where c.id_cliente = p_id_cliente and e.estado not in ('FINALIZADO', 'CANCELADO')
  ) then
    raise exception 'No se puede inactivar: el cliente tiene eventos pendientes';
  end if;

  update public.cliente
  set nombre_completo = p_nombre_completo, telefono = p_telefono, estado = p_estado, actualizado_en = now()
  where id_cliente = p_id_cliente;
end;
$$;

grant execute on function public.actualizar_cliente_staff(uuid, varchar, varchar, boolean) to authenticated;

commit;
