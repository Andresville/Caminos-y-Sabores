-- menu.descripcion y receta.descripcion_publica quedaron en varchar(255)
-- de cuando eran un campo secundario corto. Ahora "Descripción" es el
-- cuadro de texto principal del formulario (Menú y Receta), sin ningún
-- límite visible para quien lo carga, así que el límite de 255
-- caracteres de la base rompía el guardado sin aviso claro
-- ("value too long for type character varying(255)").

begin;

alter table public.menu alter column descripcion type text;
alter table public.receta alter column descripcion_publica type text;

commit;
