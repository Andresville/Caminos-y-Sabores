-- Nuevo tipo de cobro para Servicios Adicionales: "por mesa" (mantel,
-- centro de mesa, etc. — se cobra por mesa, no por persona ni fijo por
-- evento). Las mesas se calculan siempre en base a 8 invitados por
-- mesa, no es un dato que cargue el cliente.

begin;

alter type public.tipo_cobro_enum add value 'POR_MESA';

commit;
