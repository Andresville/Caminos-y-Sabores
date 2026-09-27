-- Habilita el borrado real de una cuenta de usuario (antes solo se
-- podía desactivar). auditoria.id_usuario no tenía "on delete"
-- definido (equivale a NO ACTION): borrar un usuario con movimientos
-- de auditoría ya registrados fallaba por la referencia. Se cambia a
-- ON DELETE SET NULL — el registro de auditoría se conserva (sigue
-- teniendo entidad/id_entidad/valores), solo pierde el vínculo al
-- usuario que ya no existe.

begin;

alter table public.auditoria
  drop constraint auditoria_id_usuario_fkey,
  add constraint auditoria_id_usuario_fkey
    foreign key (id_usuario) references public.usuario(id_usuario) on delete set null;

commit;
