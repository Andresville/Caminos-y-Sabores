-- Bug: auditoria.id_usuario solo podía apuntar a public.usuario (staff).
-- Cada cotización nueva dispara trg_auditoria_cotizacion, que graba
-- auth.uid() como id_usuario — y cuando quien emite la cotización es un
-- CLIENTE (emitir_cotizacion_cliente, portal), ese uuid no existe en
-- public.usuario, la foreign key lo rechaza, y toda la transacción
-- falla ("No pudimos calcular tu presupuesto").
--
-- public.usuario y public.cliente son ambos hijos de auth.users
-- (id_usuario / id_cliente referencian auth.users(id)), así que apuntar
-- ahí en vez de a usuario cubre los dos casos sin perder integridad
-- referencial.

begin;

alter table public.auditoria
  drop constraint auditoria_id_usuario_fkey,
  add constraint auditoria_id_usuario_fkey
    foreign key (id_usuario) references auth.users(id) on delete set null;

commit;
