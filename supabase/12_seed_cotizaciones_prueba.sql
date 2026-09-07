-- Cotizaciones de prueba, simulando lo que el portal público va a
-- generar más adelante. Los INSERT no disparan el trigger de
-- validación de transición (que solo corre en UPDATE), así que se
-- puede sembrar cada fila directamente en el estado que haga falta
-- para probar los distintos botones de cambio de estado.
--
-- Usa el primer menú activo que encuentre; si no tenés ninguno todavía,
-- corré esto después de activar al menos un menú.

begin;

do $$
declare
  v_id_menu integer;
begin
  select id_menu into v_id_menu from public.menu where estado = true order by id_menu limit 1;

  if v_id_menu is null then
    raise exception 'No hay ningún menú activo. Activá un menú antes de sembrar cotizaciones de prueba.';
  end if;

  insert into public.cotizacion
    (codigo, fecha_emision, fecha_evento, fecha_validez, cantidad_pax, id_menu,
     nombre_cliente, email_cliente, telefono_cliente, consentimiento_datos,
     subtotal_neto, monto_iva, monto_total, estado)
  values
    ('COT-2026-00001', now() - interval '2 days', current_date + 20, current_date + 13,
     15, v_id_menu, 'Familia Gómez', 'gomez.test@example.com', '11-5555-0001', true,
     105000.00, 22050.00, 127000.00, 'EMITIDA'),
    ('COT-2026-00002', now() - interval '5 days', current_date + 30, current_date + 10,
     25, v_id_menu, 'Empresa Delta S.A.', 'contacto.delta@example.com', '11-5555-0002', true,
     175000.00, 36750.00, 212000.00, 'EN_NEGOCIACION'),
    ('COT-2026-00003', now() - interval '25 days', current_date - 5, current_date - 10,
     10, v_id_menu, 'Rodríguez Eventos', 'rodriguez.test@example.com', '11-5555-0003', true,
     70000.00, 14700.00, 85000.00, 'VENCIDA'),
    ('COT-2026-00004', now() - interval '8 days', current_date + 15, current_date + 7,
     40, v_id_menu, 'Club Social Norte', 'club.norte@example.com', '11-5555-0004', true,
     280000.00, 58800.00, 339000.00, 'CONFIRMADA');

  insert into public.cotizacion_detalle
    (id_cotizacion, tipo_item, referencia_id, descripcion, cantidad, precio_unitario_congelado, subtotal, orden)
  select
    c.id_cotizacion, 'MENU', v_id_menu, 'Menú (' || c.cantidad_pax || ' invitados)',
    c.cantidad_pax, round(c.subtotal_neto / c.cantidad_pax, 2), c.subtotal_neto, 1
  from public.cotizacion c
  where c.codigo in ('COT-2026-00001', 'COT-2026-00002', 'COT-2026-00003', 'COT-2026-00004');
end $$;

commit;
