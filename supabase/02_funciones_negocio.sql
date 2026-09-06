-- =====================================================================
-- Caminos y Sabores — Segunda parte del esquema: funciones de negocio
-- que cierran puntos abiertos del primer script (supabase/schema.sql):
--
--   1. Protege menu.coeficiente_venta a nivel de columna (solo Gerente
--      Comercial o Administrador pueden modificarlo — sección 7.3).
--   2. Función para actualizar el precio de un insumo aplicando RN-05
--      (motivo obligatorio si la variación supera el umbral) y
--      registrando el histórico automáticamente.
--   3. RF-01.4: bloqueo de cuenta tras 5 intentos fallidos de login,
--      resuelto enteramente en la base de datos (sin service_role key).
--
-- Cómo ejecutar: pegar en el SQL Editor de Supabase y correr, igual que
-- el primer script.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Protección de columna: menu.coeficiente_venta
-- ---------------------------------------------------------------------
create or replace function public.fn_proteger_coeficiente_venta_menu()
returns trigger
language plpgsql
as $$
begin
  if new.coeficiente_venta is distinct from old.coeficiente_venta
     and rol_actual() not in ('Gerente Comercial', 'Administrador')
  then
    raise exception 'Solo Gerente Comercial o Administrador pueden modificar el coeficiente de venta del menú';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_coeficiente_venta_menu
  before update on public.menu
  for each row execute function public.fn_proteger_coeficiente_venta_menu();

-- ---------------------------------------------------------------------
-- 2. Actualizar precio de un insumo (RF-02.3, RF-02.4, RN-05)
--
-- security definer + chequeo de rol manual: así la función también
-- puede escribir en historico_precio_mp (que no tiene política de
-- INSERT para nadie salvo esta función).
-- ---------------------------------------------------------------------
create or replace function public.actualizar_precio_materia_prima(
  p_id_materia_prima integer,
  p_costo_nuevo numeric,
  p_motivo varchar default null
)
returns public.materia_prima
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_costo_anterior numeric(12,2);
  v_variacion_pct numeric(7,2);
  v_umbral numeric(7,2);
  v_resultado public.materia_prima;
begin
  if rol_actual() <> 'Jefe de Compras' then
    raise exception 'Solo Jefe de Compras puede actualizar el precio de un insumo';
  end if;

  if p_costo_nuevo <= 0 then
    raise exception 'El costo nuevo debe ser mayor a cero';
  end if;

  select costo_unitario into v_costo_anterior
  from public.materia_prima
  where id_materia_prima = p_id_materia_prima
  for update;

  if v_costo_anterior is null then
    raise exception 'La materia prima % no existe', p_id_materia_prima;
  end if;

  v_variacion_pct := round(((p_costo_nuevo - v_costo_anterior) / v_costo_anterior) * 100, 2);

  select valor::numeric into v_umbral
  from public.parametro_sistema
  where clave = 'UMBRAL_MOTIVO_PRECIO_PCT';

  if abs(v_variacion_pct) > v_umbral and (p_motivo is null or btrim(p_motivo) = '') then
    raise exception 'RN-05: la variación de precio del % por ciento supera el umbral configurado; debe indicar un motivo', round(abs(v_variacion_pct), 2);
  end if;

  update public.materia_prima
  set costo_unitario = p_costo_nuevo,
      ultima_actualizacion = now()
  where id_materia_prima = p_id_materia_prima
  returning * into v_resultado;

  insert into public.historico_precio_mp
    (id_materia_prima, costo_anterior, costo_nuevo, variacion_pct, motivo, id_usuario, fecha_cambio)
  values
    (p_id_materia_prima, v_costo_anterior, p_costo_nuevo, v_variacion_pct, p_motivo, auth.uid(), now());

  return v_resultado;
end;
$$;

grant execute on function public.actualizar_precio_materia_prima(integer, numeric, varchar) to authenticated;

-- ---------------------------------------------------------------------
-- 3. RF-01.4: bloqueo tras 5 intentos fallidos de login
--
-- Ambas funciones deben poder ejecutarse ANTES de que el usuario esté
-- autenticado (durante el propio intento de login), por eso se otorga
-- ejecución también a "anon".
-- ---------------------------------------------------------------------
create or replace function public.usuario_bloqueado_hasta(p_email varchar)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select bloqueado_hasta
  from public.usuario
  where email = p_email
    and bloqueado_hasta is not null
    and bloqueado_hasta > now()
$$;

grant execute on function public.usuario_bloqueado_hasta(varchar) to anon, authenticated;

create or replace function public.registrar_intento_login(p_email varchar, p_exitoso boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_umbral_intentos constant integer := 5;
  v_minutos_bloqueo constant interval := interval '15 minutes';
begin
  if p_exitoso then
    update public.usuario
    set intentos_fallidos = 0,
        bloqueado_hasta = null,
        ultimo_acceso = now()
    where email = p_email;
  else
    update public.usuario
    set intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta = case
          when intentos_fallidos + 1 >= v_umbral_intentos then now() + v_minutos_bloqueo
          else bloqueado_hasta
        end
    where email = p_email;
  end if;
end;
$$;

grant execute on function public.registrar_intento_login(varchar, boolean) to anon, authenticated;

commit;
