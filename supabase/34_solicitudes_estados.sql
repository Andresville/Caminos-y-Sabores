-- Rediseño del ciclo de vida de una cotización ("Solicitud"):
--
--   SOLICITADO -> (cliente acepta) -> APROBADO -> (Comercial contacta)
--   -> EN_NEGOCIACION -> (se acuerda) -> FINALIZADO
--
-- APROBADO y EN_NEGOCIACION se pueden CANCELADO por Comercial (nunca
-- SOLICITADO: ahí el único que decide es el cliente, aceptando o
-- rechazando como ya funciona). FINALIZADO y CANCELADO son estados
-- finales. Por ahora FINALIZADO solo marca el presupuesto como
-- cerrado — no crea un Evento real todavía (ese módulo se arma
-- después), aunque los botones seguían llamándose "enviar a Eventos"
-- porque ese es el nombre definitivo pensado para esa acción.
--
-- EJECUTADA desaparece (era post-evento, ese seguimiento pasa a ser
-- responsabilidad del futuro módulo de Eventos). VENCIDA se mantiene
-- visible, pero sigue sin un disparador automático (no hay todavía
-- un proceso programado que la aplique por fecha).
--
-- También se suma la posibilidad de que Comercial, mientras la
-- solicitud sigue en SOLICITADO, ajuste las CANTIDADES de las líneas
-- que el cliente ya pidió (nunca agregar/quitar líneas — si el
-- cliente quiere otra cosa, rechaza y pide de nuevo desde el front) y
-- aplique un % de descuento, antes de reenviarle el presupuesto.

begin;

-- 1. Enum: renombra EMITIDA->SOLICITADO y CONFIRMADA->APROBADO, agrega
--    FINALIZADO y CANCELADO, saca EJECUTADA (mapeada a FINALIZADO).
alter type public.estado_cotizacion_enum rename to estado_cotizacion_enum_old;

create type public.estado_cotizacion_enum as enum
  ('SOLICITADO', 'APROBADO', 'EN_NEGOCIACION', 'FINALIZADO', 'CANCELADO', 'RECHAZADA', 'VENCIDA');

alter table public.cotizacion alter column estado drop default;

alter table public.cotizacion
  alter column estado type public.estado_cotizacion_enum
  using (
    (case estado::text
       when 'EMITIDA' then 'SOLICITADO'
       when 'CONFIRMADA' then 'APROBADO'
       when 'EJECUTADA' then 'FINALIZADO'
       else estado::text
     end)::public.estado_cotizacion_enum
  );

alter table public.cotizacion alter column estado set default 'SOLICITADO'::public.estado_cotizacion_enum;

drop type public.estado_cotizacion_enum_old;

-- 2. Descuento comercial, solo aplicable mientras está SOLICITADO.
alter table public.cotizacion
  add column descuento_pct numeric(5,2) not null default 0 check (descuento_pct >= 0 and descuento_pct < 100);

-- 3. Máquina de estados nueva.
create or replace function public.fn_validar_transicion_cotizacion()
returns trigger
language plpgsql
as $$
declare
  v_transiciones_validas jsonb := '{
    "SOLICITADO": ["APROBADO", "RECHAZADA", "VENCIDA"],
    "APROBADO": ["EN_NEGOCIACION", "FINALIZADO", "CANCELADO"],
    "EN_NEGOCIACION": ["FINALIZADO", "CANCELADO"],
    "VENCIDA": ["RECHAZADA"]
  }'::jsonb;
begin
  if new.estado = old.estado then
    return new;
  end if;

  if not (coalesce(v_transiciones_validas -> old.estado::text, '[]'::jsonb) ? new.estado::text) then
    raise exception 'No se puede pasar una solicitud de % a %', old.estado, new.estado;
  end if;

  return new;
end;
$$;

-- 4. El congelamiento de datos de la cotización emitida se relaja para
--    los 3 campos de precio, únicamente mientras sigue SOLICITADO (ahí
--    es donde Comercial puede ajustar cantidades/descuento). El resto
--    de los campos (código, fechas, cliente) sigue siempre congelado.
create or replace function public.fn_proteger_cotizacion_emitida()
returns trigger
language plpgsql
as $$
begin
  if new.codigo               is distinct from old.codigo
     or new.fecha_emision     is distinct from old.fecha_emision
     or new.fecha_evento      is distinct from old.fecha_evento
     or new.fecha_validez     is distinct from old.fecha_validez
     or new.cantidad_pax      is distinct from old.cantidad_pax
     or new.nombre_cliente    is distinct from old.nombre_cliente
     or new.email_cliente     is distinct from old.email_cliente
  then
    raise exception 'Una cotización emitida no puede modificar sus datos congelados, solo su estado';
  end if;

  if old.estado is distinct from 'SOLICITADO'::public.estado_cotizacion_enum
     and (
       new.subtotal_neto is distinct from old.subtotal_neto
       or new.monto_iva is distinct from old.monto_iva
       or new.monto_total is distinct from old.monto_total
       or new.descuento_pct is distinct from old.descuento_pct
     )
  then
    raise exception 'El precio de una solicitud ya aprobada no se puede modificar';
  end if;

  return new;
end;
$$;

-- 5. El detalle deja de ser 100% inmutable: mientras la solicitud está
--    SOLICITADO, Comercial puede ajustar la cantidad (y el subtotal
--    resultante) de una línea existente. Nunca su descripción, precio
--    congelado, tipo, referencia u orden — y nunca se puede borrar una
--    línea (eso sigue bloqueado sin excepción).
drop trigger if exists trg_bloquear_update_detalle on public.cotizacion_detalle;

create or replace function public.fn_proteger_edicion_detalle()
returns trigger
language plpgsql
as $$
declare
  v_estado public.estado_cotizacion_enum;
begin
  if new.descripcion is distinct from old.descripcion
     or new.tipo_item is distinct from old.tipo_item
     or new.referencia_id is distinct from old.referencia_id
     or new.precio_unitario_congelado is distinct from old.precio_unitario_congelado
     or new.orden is distinct from old.orden
     or new.id_cotizacion is distinct from old.id_cotizacion
  then
    raise exception 'Solo se puede ajustar la cantidad de una línea, no el resto de sus datos';
  end if;

  select estado into v_estado from public.cotizacion where id_cotizacion = old.id_cotizacion;
  if v_estado is distinct from 'SOLICITADO'::public.estado_cotizacion_enum then
    raise exception 'Solo se puede ajustar el detalle mientras la solicitud está Solicitada';
  end if;

  return new;
end;
$$;

create trigger trg_proteger_update_detalle
  before update on public.cotizacion_detalle
  for each row execute function public.fn_proteger_edicion_detalle();

create policy cotizacion_detalle_update on public.cotizacion_detalle for update to authenticated
  using (rol_actual() in ('Asistente Comercial', 'Administrador'))
  with check (rol_actual() in ('Asistente Comercial', 'Administrador'));

-- 6. El cliente responde (acepta/rechaza) solo mientras está
--    SOLICITADO: de ahí en más, el resto de las transiciones las
--    maneja Comercial desde el backoffice.
drop function if exists public.responder_cotizacion_cliente(integer, boolean, varchar);

create function public.responder_cotizacion_cliente(
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
  if v_estado is distinct from 'SOLICITADO'::public.estado_cotizacion_enum then
    raise exception 'Esta solicitud ya no admite una respuesta del cliente';
  end if;

  update public.cotizacion
  set estado = case when p_aceptar then 'APROBADO'::public.estado_cotizacion_enum else 'RECHAZADA'::public.estado_cotizacion_enum end,
      motivo_rechazo = case when p_aceptar then null else p_motivo_rechazo end
  where id_cotizacion = p_id_cotizacion;
end;
$$;

grant execute on function public.responder_cotizacion_cliente(integer, boolean, varchar) to authenticated;

-- 7. Ajuste comercial de una solicitud (cantidades + descuento) sin
--    tocar los ítems informativos de $0 (adicionales): recalcula el
--    subtotal/IVA/total desde cero a partir de las líneas ya
--    persistidas, nunca confiando en un total mandado por el cliente.
create function public.ajustar_solicitud_comercial(
  p_id_cotizacion integer,
  p_descuento_pct numeric,
  p_lineas jsonb
)
returns public.cotizacion
language plpgsql
security invoker
as $$
declare
  v_estado public.estado_cotizacion_enum;
  v_iva_pct numeric;
  v_redondeo numeric;
  v_subtotal_bruto numeric(14,2);
  v_subtotal_neto numeric(14,2);
  v_monto_iva numeric(14,2);
  v_monto_total numeric(14,2);
  v_resultado public.cotizacion;
begin
  if p_descuento_pct < 0 or p_descuento_pct >= 100 then
    raise exception 'El descuento debe ser un porcentaje entre 0 y 100';
  end if;

  select estado into v_estado from public.cotizacion where id_cotizacion = p_id_cotizacion;
  if v_estado is null then
    raise exception 'La solicitud % no existe', p_id_cotizacion;
  end if;
  if v_estado is distinct from 'SOLICITADO'::public.estado_cotizacion_enum then
    raise exception 'Solo se puede ajustar una solicitud mientras está Solicitada';
  end if;

  update public.cotizacion_detalle
  set cantidad = (linea->>'cantidad')::numeric,
      subtotal = round((linea->>'cantidad')::numeric * precio_unitario_congelado, 2)
  from jsonb_array_elements(p_lineas) as linea
  where cotizacion_detalle.id_detalle = (linea->>'id_detalle')::integer
    and cotizacion_detalle.id_cotizacion = p_id_cotizacion;

  select coalesce(sum(subtotal), 0) into v_subtotal_bruto
  from public.cotizacion_detalle
  where id_cotizacion = p_id_cotizacion;

  select valor::numeric into v_iva_pct from public.parametro_sistema where clave = 'IVA_PORCENTAJE';
  select valor::numeric into v_redondeo from public.parametro_sistema where clave = 'REDONDEO_PRECIO_FINAL';

  v_subtotal_neto := round(v_subtotal_bruto * (1 - p_descuento_pct / 100), 2);
  v_monto_iva := round(v_subtotal_neto * coalesce(v_iva_pct, 0) / 100, 2);
  v_monto_total := round((v_subtotal_neto + v_monto_iva) / coalesce(v_redondeo, 1)) * coalesce(v_redondeo, 1);

  update public.cotizacion
  set descuento_pct = p_descuento_pct,
      subtotal_neto = v_subtotal_neto,
      monto_iva = v_monto_iva,
      monto_total = v_monto_total
  where id_cotizacion = p_id_cotizacion
  returning * into v_resultado;

  return v_resultado;
end;
$$;

grant execute on function public.ajustar_solicitud_comercial(integer, numeric, jsonb) to authenticated;

-- 8. emitir_cotizacion_cliente() insertaba el literal 'EMITIDA' a mano.
create or replace function public.emitir_cotizacion_cliente(
  p_id_cliente     uuid,
  p_tipo_evento    varchar,
  p_fecha_evento   date,
  p_cantidad_pax   integer,
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
  if p_cantidad_pax is null or p_cantidad_pax < 1 then
    raise exception 'La cantidad de comensales debe ser al menos 1';
  end if;
  if p_fecha_evento < current_date then
    raise exception 'La fecha del evento no puede ser una fecha pasada';
  end if;

  v_codigo := 'COT-' || extract(year from now())::text || '-' || lpad(nextval('public.cotizacion_codigo_seq')::text, 5, '0');
  v_fecha_validez := (current_date + (p_validez_dias || ' days')::interval)::date;

  insert into public.cotizacion (
    codigo, id_cliente, tipo_evento, fecha_evento, fecha_validez, cantidad_pax,
    nombre_cliente, email_cliente, telefono_cliente, consentimiento_datos,
    subtotal_neto, monto_iva, monto_total, estado
  ) values (
    v_codigo, p_id_cliente, p_tipo_evento, p_fecha_evento, v_fecha_validez, p_cantidad_pax,
    p_nombre_cliente, p_email_cliente, p_telefono_cliente, p_consentimiento_datos,
    p_subtotal_neto, p_monto_iva, p_monto_total, 'SOLICITADO'
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

commit;
