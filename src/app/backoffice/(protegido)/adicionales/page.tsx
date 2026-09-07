import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaAdicionales, { type FilaAdicional } from "./TablaAdicionales";

export default async function PaginaAdicionales() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol === "Chef Principal") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const { data: adicionales, error } = await supabase
    .from("servicio_adicional")
    .select("id_adicional, nombre_servicio, descripcion, tipo_cobro, costo_actual, coeficiente_venta, estado")
    .order("nombre_servicio")
    .returns<FilaAdicional[]>();

  return (
    <>
      <EncabezadoPagina titulo="Servicios adicionales" subtitulo="Catálogo de prestaciones complementarias al evento" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <TablaAdicionales adicionales={adicionales ?? []} />
      </Box>
    </>
  );
}
