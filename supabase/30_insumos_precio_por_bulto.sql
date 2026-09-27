-- Rediseño de carga de precio de insumos: en vez de cargar directo el
-- "costo unitario", el Ayudante de compras carga lo que realmente
-- compra (precio del bulto + cuánto pesa/contiene ese bulto) y el
-- costo unitario (por kg, por unidad, etc.) se calcula solo. Esto
-- también deja de usarse la alerta de "stock bajo" (decisión del
-- usuario): existencia_actual pasa a significar otra cosa —cuánto
-- contiene un bulto de este insumo—, no cuánto hay en stock.
--
-- El histórico de precios pasa a guardar precio del bulto y peso del
-- bulto (antes y después) en cada carga, no solo el costo unitario
-- resultante — así se puede reconstruir qué se compró realmente en
-- cada actualización, no solo el número final.

begin;

-- 1. materia_prima: renombra existencia_actual -> cantidad_bulto (con
--    su semántica nueva) y agrega precio_bulto.
alter table public.materia_prima
  drop constraint if exists materia_prima_existencia_actual_check;

update public.materia_prima set existencia_actual = 1;

alter table public.materia_prima
  rename column existencia_actual to cantidad_bulto;

alter table public.materia_prima
  alter column cantidad_bulto set default 1,
  add constraint materia_prima_cantidad_bulto_check check (cantidad_bulto > 0);

alter table public.materia_prima
  add column precio_bulto numeric(12,2);

update public.materia_prima set precio_bulto = costo_unitario * cantidad_bulto;

alter table public.materia_prima
  alter column precio_bulto set not null,
  add constraint materia_prima_precio_bulto_check check (precio_bulto > 0);

-- 2. historico_precio_mp: pasa a guardar precio del bulto y peso del
--    bulto (antes/después) en vez de solo el costo unitario resultante.
alter table public.historico_precio_mp
  rename column costo_anterior to precio_bulto_anterior;
alter table public.historico_precio_mp
  rename column costo_nuevo to precio_bulto_nuevo;

alter table public.historico_precio_mp
  add column cantidad_bulto_anterior numeric(12,3),
  add column cantidad_bulto_nuevo numeric(12,3);

update public.historico_precio_mp
  set cantidad_bulto_anterior = 1, cantidad_bulto_nuevo = 1
  where cantidad_bulto_anterior is null;

alter table public.historico_precio_mp
  alter column cantidad_bulto_anterior set not null,
  alter column cantidad_bulto_nuevo set not null;

-- Un usuario (típicamente Ayudante de compras) que ya registró cambios
-- de precio no se podía eliminar (borrado real, agregado en la
-- migración de Usuarios): la fila de histórico queda, solo pierde el
-- vínculo a quién lo cargó.
alter table public.historico_precio_mp
  alter column id_usuario drop not null;
alter table public.historico_precio_mp
  drop constraint historico_precio_mp_id_usuario_fkey,
  add constraint historico_precio_mp_id_usuario_fkey
    foreign key (id_usuario) references public.usuario(id_usuario) on delete set null;

-- 3. Ya no se usa la alerta de "stock bajo" (dependía de existencia_actual
--    como stock real, que ahora significa otra cosa).
drop function if exists public.obtener_demanda_confirmada();

-- 4. actualizar_precio_materia_prima(): nueva firma, recibe precio y
--    peso del bulto en vez del costo unitario directo.
drop function if exists public.actualizar_precio_materia_prima(integer, numeric, varchar);

create function public.actualizar_precio_materia_prima(
  p_id_materia_prima integer,
  p_precio_bulto numeric,
  p_cantidad_bulto numeric,
  p_motivo varchar default null
)
returns public.materia_prima
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_precio_bulto_anterior numeric(12,2);
  v_cantidad_bulto_anterior numeric(12,3);
  v_costo_unitario_anterior numeric(12,2);
  v_costo_unitario_nuevo numeric(12,2);
  v_variacion_pct numeric(7,2);
  v_umbral numeric(7,2);
  v_resultado public.materia_prima;
begin
  if rol_actual() not in ('Ayudante de compras', 'Administrador') then
    raise exception 'Solo Ayudante de compras o Administrador pueden actualizar el precio de un insumo';
  end if;

  if p_precio_bulto <= 0 then
    raise exception 'El precio del bulto debe ser mayor a cero';
  end if;
  if p_cantidad_bulto <= 0 then
    raise exception 'La cantidad/peso del bulto debe ser mayor a cero';
  end if;

  select precio_bulto, cantidad_bulto, costo_unitario
    into v_precio_bulto_anterior, v_cantidad_bulto_anterior, v_costo_unitario_anterior
  from public.materia_prima
  where id_materia_prima = p_id_materia_prima
  for update;

  if v_precio_bulto_anterior is null then
    raise exception 'La materia prima % no existe', p_id_materia_prima;
  end if;

  v_costo_unitario_nuevo := round(p_precio_bulto / p_cantidad_bulto, 2);
  v_variacion_pct := round(((v_costo_unitario_nuevo - v_costo_unitario_anterior) / v_costo_unitario_anterior) * 100, 2);

  select valor::numeric into v_umbral
  from public.parametro_sistema
  where clave = 'UMBRAL_MOTIVO_PRECIO_PCT';

  if abs(v_variacion_pct) > v_umbral and (p_motivo is null or btrim(p_motivo) = '') then
    raise exception 'La variación de precio del % por ciento supera el umbral configurado; debe indicar un motivo', round(abs(v_variacion_pct), 2);
  end if;

  update public.materia_prima
  set precio_bulto = p_precio_bulto,
      cantidad_bulto = p_cantidad_bulto,
      costo_unitario = v_costo_unitario_nuevo,
      ultima_actualizacion = now()
  where id_materia_prima = p_id_materia_prima
  returning * into v_resultado;

  insert into public.historico_precio_mp
    (id_materia_prima, precio_bulto_anterior, precio_bulto_nuevo, cantidad_bulto_anterior, cantidad_bulto_nuevo, variacion_pct, motivo, id_usuario, fecha_cambio)
  values
    (p_id_materia_prima, v_precio_bulto_anterior, p_precio_bulto, v_cantidad_bulto_anterior, p_cantidad_bulto, v_variacion_pct, p_motivo, auth.uid(), now());

  return v_resultado;
end;
$$;

grant execute on function public.actualizar_precio_materia_prima(integer, numeric, numeric, varchar) to authenticated;

commit;
