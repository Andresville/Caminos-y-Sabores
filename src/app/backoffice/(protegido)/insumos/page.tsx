import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaInsumos, { type FilaInsumo } from "./TablaInsumos";

export default async function PaginaInsumos() {
  const supabase = await createClient();

  const [
    { data: insumosCrudos, error },
    { data: conteos },
    { data: categorias },
    { data: unidades },
    { data: proveedores },
    { data: parametro },
  ] = await Promise.all([
    supabase
      .from("materia_prima")
      .select(
        `id_materia_prima, nombre, costo_unitario, existencia_actual, densidad_g_ml, estado, ultima_actualizacion,
         id_categoria, id_unidad_compra, id_proveedor,
         categoria:id_categoria ( nombre ),
         unidad_compra:id_unidad_compra ( simbolo, magnitud, factor_a_base )`,
      )
      .order("nombre"),
    supabase.from("vista_conteo_recetas_por_insumo").select("id_materia_prima, recetas_activas"),
    supabase.from("categoria_insumo").select("id_categoria, nombre").eq("activa", true).order("nombre"),
    supabase
      .from("unidad_medida")
      .select("id_unidad, nombre, simbolo, magnitud, factor_a_base, es_unidad_base")
      .eq("activa", true)
      .order("nombre"),
    supabase.from("proveedor").select("id_proveedor, razon_social").eq("activo", true).order("razon_social"),
    supabase.from("parametro_sistema").select("valor").eq("clave", "DIAS_ALERTA_PRECIO").single(),
  ]);

  const mapaConteos = new Map(
    (conteos ?? []).map((fila) => [fila.id_materia_prima, fila.recetas_activas as number]),
  );

  const insumos: FilaInsumo[] = ((insumosCrudos ?? []) as unknown as FilaInsumo[]).map((fila) => ({
    ...fila,
    recetas_activas: mapaConteos.get(fila.id_materia_prima) ?? 0,
  }));

  const diasAlerta = parametro ? Number(parametro.valor) : 30;

  return (
    <>
      <EncabezadoPagina titulo="Materias primas" subtitulo="Catálogo de insumos y costos de compra" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <TablaInsumos
          insumos={insumos}
          categorias={categorias ?? []}
          unidades={unidades ?? []}
          proveedores={proveedores ?? []}
          diasAlerta={diasAlerta}
        />
      </Box>
    </>
  );
}
