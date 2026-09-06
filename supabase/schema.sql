-- =====================================================================
-- Caminos y Sabores — Esquema inicial de base de datos (Supabase/Postgres)
-- Modelo de datos y políticas de acceso por rol.
--
-- Cómo ejecutar: copiar todo este archivo y pegarlo en el SQL Editor
-- del dashboard de Supabase (Project > SQL Editor > New query > Run).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------
create type public.magnitud_enum as enum ('MASA', 'VOLUMEN', 'CONTEO');

create type public.tipo_plato_enum as enum
  ('ENTRADA', 'PRINCIPAL', 'POSTRE', 'MESA_DULCE', 'RECEPCION');

create type public.estado_receta_enum as enum
  ('BORRADOR', 'ACTIVA', 'INACTIVA');

create type public.tipo_cobro_enum as enum ('FIJO', 'POR_PERSONA');

create type public.estado_cotizacion_enum as enum
  ('EMITIDA', 'EN_NEGOCIACION', 'CONFIRMADA', 'RECHAZADA', 'VENCIDA', 'EJECUTADA');

create type public.tipo_item_cotizacion_enum as enum
  ('MENU', 'RECETA', 'ADICIONAL', 'PERSONAL');

-- ---------------------------------------------------------------------
-- 2. Dominio: Unidades y catálogos
-- ---------------------------------------------------------------------
create table public.unidad_medida (
  id_unidad       integer generated always as identity primary key,
  nombre          varchar(30) not null,
  simbolo         varchar(6)  not null,
  magnitud        public.magnitud_enum not null,
  factor_a_base   numeric(12,6) not null check (factor_a_base > 0),
  es_unidad_base  boolean not null default false,
  activa          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
-- Una sola unidad base por magnitud.
create unique index una_unidad_base_por_magnitud
  on public.unidad_medida (magnitud) where es_unidad_base;

create table public.categoria_insumo (
  id_categoria    integer generated always as identity primary key,
  nombre          varchar(50) not null unique,
  activa          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table public.proveedor (
  id_proveedor    integer generated always as identity primary key,
  razon_social    varchar(100) not null,
  cuit            varchar(13),
  contacto        varchar(100),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Dominio: Seguridad y sistema
-- ---------------------------------------------------------------------
create table public.rol (
  id_rol       integer generated always as identity primary key,
  nombre_rol   varchar(50) not null unique,
  descripcion  varchar(255)
);

-- USUARIO se vincula 1 a 1 con auth.users: Supabase Auth gestiona la
-- autenticación (contraseña, hash, recuperación); acá solo viven los
-- datos de negocio (rol, bloqueo, estado). Decisión confirmada con el
-- usuario: no se duplica password_hash fuera de Supabase Auth.
create table public.usuario (
  id_usuario        uuid primary key references auth.users(id) on delete cascade,
  nombre_completo   varchar(150) not null,
  email             varchar(150) not null unique,
  id_rol            integer not null references public.rol(id_rol),
  mfa_habilitado    boolean not null default false,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta   timestamptz,
  ultimo_acceso     timestamptz,
  estado            boolean not null default true,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create table public.rol_permiso (
  id_rol_permiso  integer generated always as identity primary key,
  id_rol          integer not null references public.rol(id_rol) on delete cascade,
  modulo          varchar(80) not null,
  puede_leer      boolean not null default false,
  puede_escribir  boolean not null default false,
  unique (id_rol, modulo)
);

create table public.parametro_sistema (
  clave                varchar(60) primary key,
  valor                varchar(100) not null,
  tipo_dato            varchar(20) not null
                         check (tipo_dato in ('DECIMAL','ENTERO','PORCENTAJE','TEXTO')),
  descripcion          varchar(255),
  modificable_por_rol  varchar(50) not null references public.rol(nombre_rol),
  actualizado_en       timestamptz not null default now()
);

create table public.auditoria (
  id_auditoria    bigint generated always as identity primary key,
  id_usuario      uuid references public.usuario(id_usuario),
  entidad         varchar(60) not null,
  id_entidad      integer,
  accion          varchar(20) not null,
  valor_anterior  jsonb,
  valor_nuevo     jsonb,
  direccion_ip    varchar(45),
  fecha_hora      timestamptz not null default now()
);
create index idx_auditoria_fecha_hora on public.auditoria (fecha_hora);
create index idx_auditoria_entidad on public.auditoria (entidad);

-- ---------------------------------------------------------------------
-- 4. Dominio: Insumos y costos
-- ---------------------------------------------------------------------
create table public.materia_prima (
  id_materia_prima      integer generated always as identity primary key,
  nombre                varchar(100) not null,
  id_categoria          integer not null references public.categoria_insumo(id_categoria),
  id_proveedor          integer references public.proveedor(id_proveedor),
  id_unidad_compra      integer not null references public.unidad_medida(id_unidad),
  costo_unitario        numeric(12,2) not null check (costo_unitario > 0),
  densidad_g_ml         numeric(8,4),
  estado                boolean not null default true,
  ultima_actualizacion  timestamptz not null default now(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  unique (nombre, id_categoria)
);
create index idx_materia_prima_nombre on public.materia_prima (nombre);
create index idx_materia_prima_categoria on public.materia_prima (id_categoria);
create index idx_materia_prima_ultima_actualizacion on public.materia_prima (ultima_actualizacion);

-- Nota: esta tabla no tiene política de INSERT para roles autenticados
-- porque el registro histórico lo genera el backend al procesar un
-- cambio de precio (junto con la validación del motivo obligatorio).
-- Esa lógica de negocio queda para el paso del motor de costeo / capa
-- de aplicación, no para este esquema.
create table public.historico_precio_mp (
  id_historico     integer generated always as identity primary key,
  id_materia_prima integer not null references public.materia_prima(id_materia_prima) on delete restrict,
  costo_anterior   numeric(12,2) not null,
  costo_nuevo      numeric(12,2) not null,
  variacion_pct    numeric(7,2) not null,
  motivo           varchar(200),
  id_usuario       uuid not null references public.usuario(id_usuario),
  fecha_cambio     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Dominio: Gastronomía
-- ---------------------------------------------------------------------
create table public.receta (
  id_receta               integer generated always as identity primary key,
  nombre_plato            varchar(100) not null,
  tipo_plato              public.tipo_plato_enum not null,
  cantidad_porciones      integer not null check (cantidad_porciones > 0),
  costo_total_calculado   numeric(12,2),
  costo_por_porcion       numeric(12,2),
  fecha_ultimo_calculo    timestamptz,
  estado                  public.estado_receta_enum not null default 'BORRADOR',
  instrucciones           text,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now()
);

create table public.receta_materia_prima (
  id_detalle        integer generated always as identity primary key,
  id_receta         integer not null references public.receta(id_receta) on delete cascade,
  id_materia_prima  integer not null references public.materia_prima(id_materia_prima) on delete restrict,
  cantidad_usada    numeric(12,3) not null check (cantidad_usada > 0),
  id_unidad_receta  integer not null references public.unidad_medida(id_unidad),
  porcentaje_merma  numeric(5,2) not null default 0
                      check (porcentaje_merma >= 0 and porcentaje_merma < 100),
  orden             integer not null
);
create index idx_receta_mp_materia_prima on public.receta_materia_prima (id_materia_prima);

-- ADVERTENCIA (punto abierto, ver mensaje): la matriz de permisos
-- separa "composición de menús" (Chef, escritura) de "coeficiente de
-- venta del menú" (solo Gerente Comercial, escritura). RLS restringe
-- filas, no columnas individuales dentro de la misma fila, así que
-- esta separación fina para coeficiente_venta NO está aplicada
-- todavía.
create table public.menu (
  id_menu            integer generated always as identity primary key,
  nombre_menu        varchar(100) not null,
  descripcion        varchar(255),
  coeficiente_venta  numeric(5,3) not null check (coeficiente_venta >= 1),
  pax_minimo         integer not null check (pax_minimo > 0),
  estado             boolean not null default false,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

create table public.menu_receta (
  id_menu_receta      integer generated always as identity primary key,
  id_menu             integer not null references public.menu(id_menu) on delete cascade,
  id_receta           integer not null references public.receta(id_receta) on delete restrict,
  tipo_plato          varchar(50) not null,
  porciones_por_pax   numeric(5,2) not null default 1 check (porciones_por_pax > 0),
  orden               integer not null
);

-- ---------------------------------------------------------------------
-- 6. Dominio: Comercial
-- ---------------------------------------------------------------------
create table public.servicio_adicional (
  id_adicional       integer generated always as identity primary key,
  nombre_servicio    varchar(100) not null,
  descripcion        varchar(255),
  tipo_cobro         public.tipo_cobro_enum not null,
  costo_actual       numeric(12,2) not null check (costo_actual >= 0),
  coeficiente_venta  numeric(5,3) not null check (coeficiente_venta >= 1),
  estado             boolean not null default true,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

-- El cifrado de columna para email_cliente/telefono_cliente NO está
-- aplicado todavía: son varchar en texto plano. Punto abierto, ver
-- mensaje.
create table public.cotizacion (
  id_cotizacion          integer generated always as identity primary key,
  codigo                 varchar(20) not null unique,
  fecha_emision          timestamptz not null default now(),
  fecha_evento           date not null,
  fecha_validez          date not null,
  cantidad_pax           integer not null check (cantidad_pax > 0),
  id_menu                integer references public.menu(id_menu),
  nombre_cliente         varchar(100) not null,
  email_cliente          varchar(100) not null,
  telefono_cliente       varchar(30),
  consentimiento_datos   boolean not null default false,
  subtotal_neto          numeric(14,2) not null,
  monto_iva              numeric(14,2) not null,
  monto_total            numeric(14,2) not null,
  estado                 public.estado_cotizacion_enum not null default 'EMITIDA',
  hash_documento         varchar(64),
  origen_ip              varchar(45),
  check (fecha_validez >= fecha_emision::date)
);
create index idx_cotizacion_fecha_emision on public.cotizacion (fecha_emision);
create index idx_cotizacion_estado on public.cotizacion (estado);
create index idx_cotizacion_fecha_validez on public.cotizacion (fecha_validez);

create table public.cotizacion_detalle (
  id_detalle                  integer generated always as identity primary key,
  id_cotizacion               integer not null references public.cotizacion(id_cotizacion) on delete cascade,
  tipo_item                   public.tipo_item_cotizacion_enum not null,
  referencia_id               integer,
  descripcion                 varchar(150) not null,
  cantidad                    numeric(10,2) not null check (cantidad > 0),
  precio_unitario_congelado   numeric(12,2) not null,
  subtotal                    numeric(14,2) not null,
  orden                       integer not null
);

-- =====================================================================
-- 7. Funciones auxiliares
-- =====================================================================

-- Devuelve el nombre del rol de negocio del usuario autenticado actual.
-- security definer: puede leer usuario/rol aunque el llamador no tenga
-- permiso directo sobre esas tablas (evita recursión de políticas).
create or replace function public.rol_actual()
returns varchar
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.nombre_rol
  from public.usuario u
  join public.rol r on r.id_rol = u.id_rol
  where u.id_usuario = auth.uid()
    and u.estado = true
    and (u.bloqueado_hasta is null or u.bloqueado_hasta < now())
$$;

create or replace function public.fn_actualizar_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- La regla más importante del sistema: una cotización emitida congela
-- sus datos. Solo el campo estado (y el hash del documento) pueden
-- cambiar después de la emisión.
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
     or new.subtotal_neto     is distinct from old.subtotal_neto
     or new.monto_iva         is distinct from old.monto_iva
     or new.monto_total       is distinct from old.monto_total
     or new.nombre_cliente    is distinct from old.nombre_cliente
     or new.email_cliente     is distinct from old.email_cliente
  then
    raise exception 'Una cotización emitida no puede modificar sus datos congelados, solo su estado';
  end if;
  return new;
end;
$$;

create or replace function public.fn_bloquear_edicion_detalle()
returns trigger
language plpgsql
as $$
begin
  raise exception 'El detalle de una cotización emitida es inmutable';
end;
$$;

-- =====================================================================
-- 8. Triggers
-- =====================================================================
create trigger trg_touch_unidad_medida      before update on public.unidad_medida      for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_categoria_insumo   before update on public.categoria_insumo   for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_proveedor          before update on public.proveedor          for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_usuario            before update on public.usuario            for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_materia_prima      before update on public.materia_prima      for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_receta             before update on public.receta             for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_menu               before update on public.menu               for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_servicio_adicional before update on public.servicio_adicional for each row execute function public.fn_actualizar_timestamp();
create trigger trg_touch_parametro_sistema  before update on public.parametro_sistema  for each row execute function public.fn_actualizar_timestamp();

create trigger trg_proteger_cotizacion_emitida
  before update on public.cotizacion
  for each row execute function public.fn_proteger_cotizacion_emitida();

create trigger trg_bloquear_update_detalle
  before update on public.cotizacion_detalle
  for each row execute function public.fn_bloquear_edicion_detalle();
create trigger trg_bloquear_delete_detalle
  before delete on public.cotizacion_detalle
  for each row execute function public.fn_bloquear_edicion_detalle();

-- =====================================================================
-- 9. Row Level Security — matriz de roles y permisos
--
-- "Usuario Público" no tiene ninguna política a su favor: el portal
-- público nunca usa la clave anónima contra estas tablas, siempre pasa
-- por un endpoint del servidor con la service_role key. Si en algún
-- punto se prefiere que el público lea tablas directo, avisar antes de
-- cambiar este criterio.
-- =====================================================================

alter table public.unidad_medida       enable row level security;
alter table public.categoria_insumo    enable row level security;
alter table public.proveedor           enable row level security;
alter table public.rol                 enable row level security;
alter table public.usuario             enable row level security;
alter table public.rol_permiso         enable row level security;
alter table public.parametro_sistema   enable row level security;
alter table public.auditoria           enable row level security;
alter table public.materia_prima       enable row level security;
alter table public.historico_precio_mp enable row level security;
alter table public.receta              enable row level security;
alter table public.receta_materia_prima enable row level security;
alter table public.menu                enable row level security;
alter table public.menu_receta         enable row level security;
alter table public.servicio_adicional  enable row level security;
alter table public.cotizacion          enable row level security;
alter table public.cotizacion_detalle  enable row level security;

-- ---- unidad_medida (escritura de Jefe de Compras o Administrador) ----
create policy unidad_medida_select on public.unidad_medida for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy unidad_medida_insert on public.unidad_medida for insert to authenticated
  with check (rol_actual() in ('Jefe de Compras','Administrador'));
create policy unidad_medida_update on public.unidad_medida for update to authenticated
  using (rol_actual() in ('Jefe de Compras','Administrador'))
  with check (rol_actual() in ('Jefe de Compras','Administrador'));

-- ---- categoria_insumo / proveedor (mismo patrón que insumos) ----
create policy categoria_insumo_select on public.categoria_insumo for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy categoria_insumo_insert on public.categoria_insumo for insert to authenticated
  with check (rol_actual() = 'Jefe de Compras');
create policy categoria_insumo_update on public.categoria_insumo for update to authenticated
  using (rol_actual() = 'Jefe de Compras')
  with check (rol_actual() = 'Jefe de Compras');

create policy proveedor_select on public.proveedor for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy proveedor_insert on public.proveedor for insert to authenticated
  with check (rol_actual() = 'Jefe de Compras');
create policy proveedor_update on public.proveedor for update to authenticated
  using (rol_actual() = 'Jefe de Compras')
  with check (rol_actual() = 'Jefe de Compras');

-- ---- materia_prima ----
create policy materia_prima_select on public.materia_prima for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy materia_prima_insert on public.materia_prima for insert to authenticated
  with check (rol_actual() = 'Jefe de Compras');
create policy materia_prima_update on public.materia_prima for update to authenticated
  using (rol_actual() = 'Jefe de Compras')
  with check (rol_actual() = 'Jefe de Compras');

-- ---- historico_precio_mp (solo lectura vía RLS; el insert lo hace el backend) ----
create policy historico_precio_select on public.historico_precio_mp for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Gerente Comercial','Administrador'));

-- ---- receta / receta_materia_prima ----
create policy receta_select on public.receta for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy receta_insert on public.receta for insert to authenticated
  with check (rol_actual() = 'Chef Principal');
create policy receta_update on public.receta for update to authenticated
  using (rol_actual() = 'Chef Principal')
  with check (rol_actual() = 'Chef Principal');

create policy receta_mp_select on public.receta_materia_prima for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Chef Principal','Gerente Comercial','Administrador'));
create policy receta_mp_insert on public.receta_materia_prima for insert to authenticated
  with check (rol_actual() = 'Chef Principal');
create policy receta_mp_update on public.receta_materia_prima for update to authenticated
  using (rol_actual() = 'Chef Principal')
  with check (rol_actual() = 'Chef Principal');
create policy receta_mp_delete on public.receta_materia_prima for delete to authenticated
  using (rol_actual() = 'Chef Principal');

-- ---- menu / menu_receta (JefeCompras no tiene acceso) ----
create policy menu_select on public.menu for select to authenticated
  using (rol_actual() in ('Chef Principal','Gerente Comercial','Administrador'));
create policy menu_insert on public.menu for insert to authenticated
  with check (rol_actual() = 'Chef Principal');
create policy menu_update on public.menu for update to authenticated
  using (rol_actual() in ('Chef Principal','Gerente Comercial','Administrador'))
  with check (rol_actual() in ('Chef Principal','Gerente Comercial','Administrador'));

create policy menu_receta_select on public.menu_receta for select to authenticated
  using (rol_actual() in ('Chef Principal','Gerente Comercial','Administrador'));
create policy menu_receta_insert on public.menu_receta for insert to authenticated
  with check (rol_actual() = 'Chef Principal');
create policy menu_receta_update on public.menu_receta for update to authenticated
  using (rol_actual() = 'Chef Principal')
  with check (rol_actual() = 'Chef Principal');
create policy menu_receta_delete on public.menu_receta for delete to authenticated
  using (rol_actual() = 'Chef Principal');

-- ---- servicio_adicional ----
create policy servicio_adicional_select on public.servicio_adicional for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Gerente Comercial','Administrador'));
create policy servicio_adicional_insert on public.servicio_adicional for insert to authenticated
  with check (rol_actual() in ('Jefe de Compras','Gerente Comercial'));
create policy servicio_adicional_update on public.servicio_adicional for update to authenticated
  using (rol_actual() in ('Jefe de Compras','Gerente Comercial'))
  with check (rol_actual() in ('Jefe de Compras','Gerente Comercial'));

-- ---- cotizacion / cotizacion_detalle ----
-- Sin política de INSERT: la emisión la hace el backend con la
-- service_role key (bypassa RLS), nunca el cliente directo.
create policy cotizacion_select on public.cotizacion for select to authenticated
  using (rol_actual() in ('Gerente Comercial','Administrador'));
create policy cotizacion_update_estado on public.cotizacion for update to authenticated
  using (rol_actual() = 'Gerente Comercial')
  with check (rol_actual() = 'Gerente Comercial');

create policy cotizacion_detalle_select on public.cotizacion_detalle for select to authenticated
  using (rol_actual() in ('Gerente Comercial','Administrador'));

-- ---- usuario ----
-- Cualquier usuario autenticado puede ver su propio registro (para que
-- la app muestre "sesión iniciada como..."); solo Administrador ve/edita
-- el resto.
create policy usuario_select_propio on public.usuario for select to authenticated
  using (id_usuario = auth.uid() or rol_actual() = 'Administrador');
create policy usuario_insert_admin on public.usuario for insert to authenticated
  with check (rol_actual() = 'Administrador');
create policy usuario_update_admin on public.usuario for update to authenticated
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

-- ---- rol / rol_permiso (solo Administrador) ----
create policy rol_admin_all on public.rol for all to authenticated
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

create policy rol_permiso_admin_all on public.rol_permiso for all to authenticated
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

-- ---- parametro_sistema ("E parcial": cada parámetro define su propio
-- rol autorizado en modificable_por_rol; Administrador siempre puede) ----
create policy parametro_select on public.parametro_sistema for select to authenticated
  using (rol_actual() in ('Jefe de Compras','Gerente Comercial','Administrador'));
create policy parametro_update on public.parametro_sistema for update to authenticated
  using (rol_actual() = 'Administrador' or rol_actual() = modificable_por_rol)
  with check (rol_actual() = 'Administrador' or rol_actual() = modificable_por_rol);
create policy parametro_insert_admin on public.parametro_sistema for insert to authenticated
  with check (rol_actual() = 'Administrador');
create policy parametro_delete_admin on public.parametro_sistema for delete to authenticated
  using (rol_actual() = 'Administrador');

-- ---- auditoria (Gerente Comercial y Administrador, solo lectura;
-- la escritura la hace el backend / triggers del sistema) ----
create policy auditoria_select on public.auditoria for select to authenticated
  using (rol_actual() in ('Gerente Comercial','Administrador'));

-- =====================================================================
-- 10. Datos semilla
-- =====================================================================

-- Unidades de medida de referencia
insert into public.unidad_medida (nombre, simbolo, magnitud, factor_a_base, es_unidad_base, activa) values
  ('Miligramo', 'mg', 'MASA', 0.001, false, true),
  ('Gramo', 'g', 'MASA', 1, true, true),
  ('Kilogramo', 'kg', 'MASA', 1000, false, true),
  ('Mililitro', 'ml', 'VOLUMEN', 1, true, true),
  ('Centímetro cúbico', 'cc', 'VOLUMEN', 1, false, true),
  ('Litro', 'l', 'VOLUMEN', 1000, false, true),
  ('Unidad', 'un', 'CONTEO', 1, true, true),
  ('Docena', 'doc', 'CONTEO', 12, false, true);

-- Roles del sistema. "Usuario Público" es un rol de referencia:
-- no requiere autenticación y no se asigna a ninguna fila de usuario.
insert into public.rol (nombre_rol, descripcion) values
  ('Jefe de Compras', 'Mantiene el catálogo de insumos, sus costos y el costo de los servicios adicionales.'),
  ('Chef Principal', 'Crea y mantiene recetas y compone menús desde el punto de vista gastronómico.'),
  ('Gerente Comercial', 'Fija coeficientes de venta, realiza el seguimiento de cotizaciones y gestiona su estado.'),
  ('Administrador', 'Administra usuarios, roles y parámetros. Consulta la auditoría.'),
  ('Usuario Público', 'Rol de referencia para el canal público; no requiere autenticación ni fila en usuario.');

-- Parámetros del sistema. Los marcados PENDIENTE DE FIRMA son valores
-- de referencia, no cifras validadas por el negocio.
insert into public.parametro_sistema (clave, valor, tipo_dato, descripcion, modificable_por_rol) values
  ('IVA_PORCENTAJE', '21.00', 'PORCENTAJE', 'Alícuota de IVA aplicada al precio neto.', 'Administrador'),
  ('GASTOS_GENERALES_PCT', '12.00', 'PORCENTAJE', 'Gastos generales sobre el costo directo. PENDIENTE DE FIRMA.', 'Gerente Comercial'),
  ('COEFICIENTE_VENTA_DEFECTO', '1.45', 'DECIMAL', 'Coeficiente de venta por defecto. PENDIENTE DE FIRMA.', 'Gerente Comercial'),
  ('PAX_POR_MOZO', '15', 'ENTERO', 'Cantidad de invitados por mozo. PENDIENTE DE FIRMA.', 'Gerente Comercial'),
  ('COSTO_MOZO_EVENTO', '85000.00', 'DECIMAL', 'Costo por mozo por evento. PENDIENTE DE FIRMA.', 'Jefe de Compras'),
  ('PAX_MINIMO_EVENTO', '20', 'ENTERO', 'Mínimo de invitados para cotización automática.', 'Gerente Comercial'),
  ('PAX_MAXIMO_AUTOMATICO', '300', 'ENTERO', 'Máximo de invitados para cotización automática.', 'Gerente Comercial'),
  ('VALIDEZ_COTIZACION_DIAS', '15', 'ENTERO', 'Días de validez de una cotización.', 'Gerente Comercial'),
  ('DIAS_ALERTA_PRECIO', '30', 'ENTERO', 'Días para considerar un precio desactualizado.', 'Jefe de Compras'),
  ('UMBRAL_MOTIVO_PRECIO_PCT', '20.00', 'PORCENTAJE', 'Umbral de variación que exige motivo.', 'Administrador'),
  ('REDONDEO_PRECIO_FINAL', '100', 'ENTERO', 'Múltiplo de redondeo comercial del precio final.', 'Gerente Comercial');

commit;
