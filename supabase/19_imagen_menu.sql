-- Foto de un menú (por ejemplo, la ensalada Caprese de un plato
-- principal), cargada al armar/editar el menú en el backoffice.
--
-- El archivo se guarda en Supabase Storage, en un bucket público de
-- solo lectura (la foto en sí no es información sensible; lo que se
-- restringe es quién puede subirla o cambiarla). Solo Ayudante de
-- cocina puede escribir ahí, mismo rol que ya puede editar el resto
-- de los datos generales del menú.

begin;

alter table public.menu add column imagen_url text;

insert into storage.buckets (id, name, public)
values ('menu-imagenes', 'menu-imagenes', true)
on conflict (id) do nothing;

create policy menu_imagenes_select on storage.objects for select to public
  using (bucket_id = 'menu-imagenes');

create policy menu_imagenes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-imagenes' and rol_actual() = 'Ayudante de cocina');

create policy menu_imagenes_update on storage.objects for update to authenticated
  using (bucket_id = 'menu-imagenes' and rol_actual() = 'Ayudante de cocina')
  with check (bucket_id = 'menu-imagenes' and rol_actual() = 'Ayudante de cocina');

create policy menu_imagenes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu-imagenes' and rol_actual() = 'Ayudante de cocina');

commit;
