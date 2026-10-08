-- Módulo Eventos: cuando un presupuesto llega a Finalizado nace un
-- Evento (estado propio, separado del de la cotización), que pasa por
-- un ciclo de 6 estados: Solicitado -> Presupuestado -> Contratado ->
-- En Preparación -> En Ejecución -> Finalizado (más Cancelado, fuera
-- del ciclo). En Contratado se puede pedir la lista de compra, que se
-- arma sola a partir de los insumos de las recetas/menús pedidos en el
-- presupuesto original; el evento no puede pasar a En Ejecución hasta
-- que todos esos insumos estén marcados como Comprados.
--
-- No se duplica nombre/cliente/fecha/comensales/menús acá: eso ya vive
-- en cotizacion/cotizacion_detalle (que queda inmutable una vez
-- Finalizada) y se lee con join. El margen de gestión que tenía el
-- diseño original se saca por completo: cada receta ya trae su propio
-- margen aplicado en el presupuesto, volver a sumarlo acá lo duplicaba.

begin;

create type public.estado_evento_enum as enum
  ('SOLICITADO', 'PRESUPUESTADO', 'CONTRATADO', 'EN_PREPARACION', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO');

create type public.estado_insumo_compra_enum as enum ('PENDIENTE', 'EN_CAMINO', 'COMPRADO');

create table public.evento (
  id_evento       integer generated always as identity primary key,
  id_cotizacion   integer not null unique references public.cotizacion(id_cotizacion),
  descripcion     text,
  estado          public.estado_evento_enum not null default 'SOLICITADO',
  fecha_creacion  timestamptz not null default now()
);

create table public.evento_insumo (
  id_evento_insumo   integer generated always as identity primary key,
  id_evento          integer not null references public.evento(id_evento) on delete cascade,
  id_materia_prima   integer not null references public.materia_prima(id_materia_prima),
  -- Siempre en la unidad de compra del insumo (misma unidad que usa su costo_unitario).
  cantidad_necesaria numeric(12, 3) not null check (cantidad_necesaria > 0),
  costo_estimado     numeric(12, 2) not null check (costo_estimado >= 0),
  estado             public.estado_insumo_compra_enum not null default 'PENDIENTE',
  orden              integer not null,
  unique (id_evento, id_materia_prima)
);

create index idx_evento_estado on public.evento (estado);
create index idx_evento_insumo_id_evento on public.evento_insumo (id_evento);

-- ---------------------------------------------------------------------
-- Máquina de estados del evento
-- ---------------------------------------------------------------------

create function public.fn_validar_transicion_evento()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "SOLICITADO": ["PRESUPUESTADO", "CANCELADO"],
    "PRESUPUESTADO": ["CONTRATADO", "CANCELADO"],
    "CONTRATADO": ["EN_PREPARACION", "CANCELADO"],
    "EN_PREPARACION": ["EN_EJECUCION", "CANCELADO"],
    "EN_EJECUCION": ["FINALIZADO", "CANCELADO"]
  }'::jsonb;
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (coalesce(v_transiciones_validas -> old.estado::text, '[]'::jsonb) ? new.estado::text) then
    raise exception 'No se puede pasar un evento de % a %', old.estado, new.estado;
  end if;

  if new.estado = 'EN_EJECUCION' and exists (
    select 1 from public.evento_insumo
    where id_evento = new.id_evento and estado <> 'COMPRADO'
  ) then
    raise exception 'Faltan insumos por comprar para pasar el evento a En Ejecución';
  end if;

  return new;
end;
$$;

create trigger trg_validar_transicion_evento
  before update on public.evento
  for each row execute function public.fn_validar_transicion_evento();

-- Al finalizar una cotización (botón "Convertir en evento" del módulo
-- Presupuestos), nace el Evento en estado Solicitado. No hace falta
-- tocar cotizaciones/actions.ts: cambiarEstadoCotizacion ya hace un
-- update plano de estado, esto se dispara solo.
create function public.fn_crear_evento_al_finalizar()
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
  return new;
end;
$$;

create trigger trg_crear_evento_al_finalizar
  after update on public.cotizacion
  for each row execute function public.fn_crear_evento_al_finalizar();

-- Genera la lista de compra y avanza el evento a En Preparación, todo
-- junto. Las cantidades/costos de p_lineas ya vienen calculados desde
-- TypeScript (motor de conversión de unidades del dominio de costeo) —
-- esta función solo valida y persiste, no hace matemática de
-- conversión (mismo criterio que guardar_receta_completa).
create function public.generar_lista_compra_evento(p_id_evento integer, p_lineas jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado public.estado_evento_enum;
begin
  if rol_actual() not in ('Asistente Comercial', 'Administrador') then
    raise exception 'No tiene permiso para generar la lista de compra';
  end if;

  select estado into v_estado from public.evento where id_evento = p_id_evento;

  if v_estado is null then
    raise exception 'El evento no existe';
  end if;
  if v_estado <> 'CONTRATADO' then
    raise exception 'Solo se puede generar la lista de compra con el evento en estado Contratado';
  end if;
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'No hay insumos para generar la lista de compra';
  end if;

  insert into public.evento_insumo (id_evento, id_materia_prima, cantidad_necesaria, costo_estimado, orden)
  select
    p_id_evento,
    (linea ->> 'id_materia_prima')::integer,
    (linea ->> 'cantidad_necesaria')::numeric,
    (linea ->> 'costo_estimado')::numeric,
    ordinalidad::integer
  from jsonb_array_elements(p_lineas) with ordinality as t(linea, ordinalidad);

  update public.evento set estado = 'EN_PREPARACION' where id_evento = p_id_evento;
end;
$$;

grant execute on function public.generar_lista_compra_evento(integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Permisos: mismo criterio que Solicitudes (Asistente Comercial y
-- Administrador leen/escriben, Ayudante de Cocina no tiene acceso).
-- Sin policy de insert en ninguna de las dos tablas: el alta de evento
-- la hace el trigger de arriba y el alta de evento_insumo la hace
-- generar_lista_compra_evento, ambos security definer.
-- ---------------------------------------------------------------------

alter table public.evento enable row level security;
alter table public.evento_insumo enable row level security;

create policy evento_select on public.evento for select to authenticated
  using (rol_actual() in ('Asistente Comercial', 'Administrador'));
create policy evento_update on public.evento for update to authenticated
  using (rol_actual() in ('Asistente Comercial', 'Administrador'))
  with check (rol_actual() in ('Asistente Comercial', 'Administrador'));

create policy evento_insumo_select on public.evento_insumo for select to authenticated
  using (rol_actual() in ('Asistente Comercial', 'Administrador'));
create policy evento_insumo_update on public.evento_insumo for update to authenticated
  using (rol_actual() in ('Asistente Comercial', 'Administrador'))
  with check (rol_actual() in ('Asistente Comercial', 'Administrador'));

-- ---------------------------------------------------------------------
-- Auditoría: evento es una entidad maestra (como cotizacion) — se
-- audita. evento_insumo es una tabla de líneas que se inserta en bloque
-- al generar la lista de compra (igual que receta_materia_prima o
-- menu_receta): auditarla generaría una fila por insumo en cada
-- generación sin aportar información útil, así que se deja afuera,
-- igual que esas dos.
-- ---------------------------------------------------------------------

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
    when 'evento' then (v_fila_referencia ->> 'id_evento')::integer
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

create trigger trg_auditoria_evento
  after insert or update or delete on public.evento
  for each row execute function public.fn_registrar_auditoria();

commit;
