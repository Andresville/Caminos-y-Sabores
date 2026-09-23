-- Módulo cliente: cuentas reales de cliente (Supabase Auth, separadas
-- del staff), venta de recetas individuales ("platos") y aceptación
-- del presupuesto por el propio cliente una vez que Comercial lo
-- revisó.

begin;

-- 1. Cada receta puede venderse sola, con su propio margen (coeficiente_venta), igual que ya tienen menu y servicio_adicional. vendible_individual es la bandera de publicación, igual que menu.estado. descripcion_publica es el texto de venta (receta no tenía ninguno; instrucciones es interno, para cocina).
alter table public.receta
  add column coeficiente_venta   numeric(5,3) check (coeficiente_venta >= 1),
  add column vendible_individual boolean not null default false,
  add column descripcion_publica varchar(255);

-- 2. Clientes: identidad separada del staff. id_cliente = auth.users.id, igual que usuario.id_usuario.
create table public.cliente (
  id_cliente       uuid primary key references auth.users(id) on delete cascade,
  nombre_completo  varchar(150) not null,
  email            varchar(150) not null unique,
  telefono         varchar(30),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

alter table public.cliente enable row level security;

create policy cliente_select_propio on public.cliente for select to authenticated
  using (id_cliente = auth.uid());
create policy cliente_insert_propio on public.cliente for insert to authenticated
  with check (id_cliente = auth.uid());
create policy cliente_update_propio on public.cliente for update to authenticated
  using (id_cliente = auth.uid())
  with check (id_cliente = auth.uid());

-- Comercial/Administrador ya gestionan la relación comercial: necesitan poder ver los datos del cliente detrás de una cotización.
create policy cliente_select_staff on public.cliente for select to authenticated
  using (rol_actual() in ('Comercial', 'Administrador'));

-- 3. cotizacion: vincula con el cliente registrado. Nullable porque las cotizaciones anónimas anteriores no tienen cliente.
alter table public.cotizacion
  add column id_cliente uuid references public.cliente(id_cliente);

-- El cliente puede ver (y navegar el detalle de) únicamente sus propias cotizaciones.
create policy cotizacion_select_propia on public.cotizacion for select to authenticated
  using (id_cliente = auth.uid());
create policy cotizacion_detalle_select_propia on public.cotizacion_detalle for select to authenticated
  using (exists (
    select 1 from public.cotizacion c
    where c.id_cotizacion = cotizacion_detalle.id_cotizacion
      and c.id_cliente = auth.uid()
  ));

-- 4. Emitir una cotización del portal cliente: mismo patrón que emitir_cotizacion, pero para un carrito (menú/plato/adicional en cualquier combinación, sin mozos ni límite de invitados) asociado a un cliente logueado.
create sequence if not exists public.cotizacion_codigo_seq;

create or replace function public.emitir_cotizacion_cliente(
  p_id_cliente     uuid,
  p_tipo_evento    varchar,
  p_fecha_evento   date,
  p_nombre_cliente varchar,
  p_email_cliente  varchar,
  p_telefono_cliente varchar,
  p_consentimiento_datos boolean,
  p_subtotal_neto  numeric,
  p_monto_iva      numeric,
  p_monto_total    numeric,
  p_validez_dias   integer,
  p_lineas         jsonb
)
returns table (id_cotizacion integer, codigo varchar, fecha_validez date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_codigo varchar(20);
  v_id_cotizacion integer;
  v_fecha_validez date;
  v_linea jsonb;
  v_orden integer := 1;
begin
  if auth.uid() is distinct from p_id_cliente then
    raise exception 'No puede emitir una cotización a nombre de otro cliente';
  end if;
  if not p_consentimiento_datos then
    raise exception 'Debe aceptar la política de privacidad para emitir la cotización';
  end if;

  v_codigo := 'COT-' || extract(year from now())::text || '-' || lpad(nextval('public.cotizacion_codigo_seq')::text, 5, '0');
  v_fecha_validez := (current_date + (p_validez_dias || ' days')::interval)::date;

  insert into public.cotizacion (
    codigo, id_cliente, tipo_evento, fecha_evento, fecha_validez, cantidad_pax,
    nombre_cliente, email_cliente, telefono_cliente, consentimiento_datos,
    subtotal_neto, monto_iva, monto_total, estado
  ) values (
    v_codigo, p_id_cliente, p_tipo_evento, p_fecha_evento, v_fecha_validez, 1,
    p_nombre_cliente, p_email_cliente, p_telefono_cliente, p_consentimiento_datos,
    p_subtotal_neto, p_monto_iva, p_monto_total, 'EMITIDA'
  ) returning cotizacion.id_cotizacion into v_id_cotizacion;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    insert into public.cotizacion_detalle (
      id_cotizacion, tipo_item, referencia_id, descripcion, cantidad, precio_unitario_congelado, subtotal, orden
    ) values (
      v_id_cotizacion,
      (v_linea->>'tipo_item')::public.tipo_item_cotizacion_enum,
      (v_linea->>'referencia_id')::integer,
      v_linea->>'descripcion',
      (v_linea->>'cantidad')::numeric,
      (v_linea->>'precio_unitario')::numeric,
      (v_linea->>'subtotal')::numeric,
      v_orden
    );
    v_orden := v_orden + 1;
  end loop;

  return query select v_id_cotizacion, v_codigo, v_fecha_validez;
end;
$$;

grant execute on function public.emitir_cotizacion_cliente(
  uuid, varchar, date, varchar, varchar, varchar, boolean, numeric, numeric, numeric, integer, jsonb
) to authenticated;

-- 5. El cliente acepta o rechaza SU cotización, solo cuando Comercial ya la puso en EN_NEGOCIACION (la "versión formal" revisada) — respeta la misma máquina de estados que ya usa el backoffice (fn_validar_transicion_cotizacion), no abre ninguna transición nueva.
create or replace function public.responder_cotizacion_cliente(p_id_cotizacion integer, p_aceptar boolean)
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
  if v_estado <> 'EN_NEGOCIACION' then
    raise exception 'Esta cotización todavía no fue revisada por el equipo comercial';
  end if;

  update public.cotizacion
  set estado = case when p_aceptar then 'CONFIRMADA' else 'RECHAZADA' end
  where id_cotizacion = p_id_cotizacion;
end;
$$;

grant execute on function public.responder_cotizacion_cliente(integer, boolean) to authenticated;

-- 6. Solo Comercial/Administrador definen si una receta se vende
-- suelta y a qué precio — Ayudante de cocina no tiene permiso de
-- escritura sobre esto (mismo criterio que ya separa quién edita la
-- composición del menú de quién edita su coeficiente de venta). Se
-- resuelve con una función angosta en vez de ampliar receta_update,
-- para no abrirle a Comercial la posibilidad de tocar la composición
-- de la receta (que sí queda escrita a través de esa política).
create or replace function public.actualizar_venta_individual_receta(
  p_id_receta integer,
  p_coeficiente_venta numeric,
  p_vendible_individual boolean,
  p_descripcion_publica varchar
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if rol_actual() not in ('Comercial', 'Administrador') then
    raise exception 'Solo Comercial o Administrador pueden definir la venta individual de una receta';
  end if;
  if p_vendible_individual and p_coeficiente_venta is null then
    raise exception 'Definí un coeficiente de venta antes de publicar el plato';
  end if;

  update public.receta
  set coeficiente_venta = p_coeficiente_venta,
      vendible_individual = p_vendible_individual,
      descripcion_publica = p_descripcion_publica
  where id_receta = p_id_receta;
end;
$$;

grant execute on function public.actualizar_venta_individual_receta(integer, numeric, boolean, varchar) to authenticated;

commit;
