import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaRecetas, { type FilaReceta } from "./TablaRecetas";

export default async function PaginaRecetas() {
  const supabase = await createClient();

  const { data: recetas, error } = await supabase
    .from("receta")
    .select(
      "id_receta, nombre_plato, tipo_plato, cantidad_porciones, costo_por_porcion, estado, fecha_ultimo_calculo",
    )
    .order("nombre_plato")
    .returns<FilaReceta[]>();

  return (
    <>
      <EncabezadoPagina titulo="Recetas" subtitulo="Fichas técnicas y costeo de preparaciones" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <TablaRecetas recetas={recetas ?? []} />
      </Box>
    </>
  );
}
