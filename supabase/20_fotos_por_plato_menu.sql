-- Reemplaza la foto única del menú por una foto por receta dentro del
-- menú (entrada, plato principal, postre, etc., cada una con la suya).
--
-- No se puede guardar contra menu_receta.id_menu_receta: cada guardado
-- de composición borra y reinserta TODAS las líneas del menú
-- (guardar_composicion_menu, para no ensuciar la auditoría con eso),
-- así que esos ids no son estables entre un guardado y el siguiente.
-- Se guarda contra (id_menu, id_receta), que sí es estable.

begin;

alter table public.menu drop column if exists imagen_url;

create table public.menu_foto_plato (
  id_menu         integer not null references public.menu(id_menu) on delete cascade,
  id_receta       integer not null references public.receta(id_receta) on delete cascade,
  imagen_url      text not null,
  actualizado_en  timestamptz not null default now(),
  primary key (id_menu, id_receta)
);

alter table public.menu_foto_plato enable row level security;

-- Mismos roles que ya pueden ver la composición del menú (menu_select): Ayudante de compras no tiene acceso a menús.
create policy menu_foto_plato_select on public.menu_foto_plato for select to authenticated
  using (rol_actual() in ('Ayudante de cocina','Comercial','Administrador'));

create policy menu_foto_plato_write on public.menu_foto_plato for all to authenticated
  using (rol_actual() = 'Ayudante de cocina')
  with check (rol_actual() = 'Ayudante de cocina');

commit;
