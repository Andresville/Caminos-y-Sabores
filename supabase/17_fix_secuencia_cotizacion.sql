-- Las cotizaciones de prueba sembradas antes de que existiera el
-- portal público (COT-2026-00001 a 00004) se cargaron a mano, sin
-- pasar por cotizacion_codigo_seq. La secuencia arrancaba en 1 y
-- chocaba contra esos códigos ya ocupados. La sincronizamos con el
-- máximo número ya usado en el año actual.

begin;

select setval(
  'public.cotizacion_codigo_seq',
  coalesce(
    (
      select max(substring(codigo from 10)::integer)
      from public.cotizacion
      where codigo like 'COT-' || extract(year from now())::text || '-%'
    ),
    0
  )
);

commit;
