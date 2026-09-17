-- Ayudante de cocina no tiene lectura sobre parametro_sistema (matriz de
-- roles: parámetros del sistema es "—" para Ayudante de cocina). Pero
-- se decidió con el usuario mostrarle un "precio sugerido" de
-- referencia en el editor de recetas, y el alta de un menú necesita
-- heredar este mismo valor por defecto sin que Ayudante de cocina
-- pueda leer el resto de los parámetros.
--
-- Esta función expone SOLO ese valor puntual, no un bypass general de
-- parametro_sistema.

begin;

create or replace function public.obtener_coeficiente_venta_defecto()
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select valor::numeric
  from public.parametro_sistema
  where clave = 'COEFICIENTE_VENTA_DEFECTO'
$$;

grant execute on function public.obtener_coeficiente_venta_defecto() to authenticated;

commit;
