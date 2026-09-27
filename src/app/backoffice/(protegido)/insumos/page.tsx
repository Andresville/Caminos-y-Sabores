import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import TablaInsumos, { type FilaInsumo } from "./TablaInsumos";

export default async function PaginaInsumos() {
  const supabase = await createClient();

  const [{ data: insumosCrudos, error }, { data: conteos }] = await Promise.all([
    supabase
      .from("materia_prima")
      .select(
        `id_materia_prima, nombre, costo_unitario, precio_bulto, cantidad_bulto, densidad_g_ml, estado, ultima_actualizacion,
         id_categoria, id_unidad_compra, id_proveedor,
         categoria:id_categoria ( nombre ),
         unidad_compra:id_unidad_compra ( simbolo, magnitud, factor_a_base ),
         proveedor:id_proveedor ( razon_social )`,
      )
      .order("nombre"),
    supabase.from("vista_conteo_recetas_por_insumo").select("id_materia_prima, recetas_activas"),
  ]);

  const mapaConteos = new Map(
    (conteos ?? []).map((fila) => [fila.id_materia_prima, fila.recetas_activas as number]),
  );

  const insumos: FilaInsumo[] = ((insumosCrudos ?? []) as unknown as FilaInsumo[]).map((fila) => ({
    ...fila,
    recetas_activas: mapaConteos.get(fila.id_materia_prima) ?? 0,
  }));

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <TablaInsumos insumos={insumos} />
    </Box>
  );
}
