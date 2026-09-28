import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import GaleriaRecetas, { type FilaReceta } from "./GaleriaRecetas";

export default async function PaginaRecetas() {
  const supabase = await createClient();

  const [{ data: recetas, error }, { data: coeficienteVentaDefectoRpc }] = await Promise.all([
    supabase
      .from("receta")
      .select("id_receta, nombre_plato, imagen_chica_url, costo_por_porcion, cantidad_porciones, coeficiente_venta, estado")
      .order("nombre_plato")
      .returns<FilaReceta[]>(),
    supabase.rpc("obtener_coeficiente_venta_defecto"),
  ]);

  const coeficienteVentaDefecto = typeof coeficienteVentaDefectoRpc === "number" ? coeficienteVentaDefectoRpc : 1;

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <GaleriaRecetas recetas={recetas ?? []} coeficienteVentaDefecto={coeficienteVentaDefecto} />
    </Box>
  );
}
