-- Corrige un bug del esquema inicial: la tabla "rol" solo era legible
-- por Administrador (rol_admin_all, "for all"), lo que impedía que
-- cualquier otro usuario resolviera su propio nombre de rol (por
-- ejemplo, al hacer un join usuario -> rol desde el layout del
-- backoffice). Los nombres de rol no son información sensible: cualquier
-- usuario autenticado puede leerlos. Solo Administrador puede escribir.

begin;

drop policy if exists rol_admin_all on public.rol;

create policy rol_select_authenticated on public.rol for select to authenticated
  using (true);

create policy rol_insert_admin on public.rol for insert to authenticated
  with check (rol_actual() = 'Administrador');

create policy rol_update_admin on public.rol for update to authenticated
  using (rol_actual() = 'Administrador')
  with check (rol_actual() = 'Administrador');

create policy rol_delete_admin on public.rol for delete to authenticated
  using (rol_actual() = 'Administrador');

commit;
