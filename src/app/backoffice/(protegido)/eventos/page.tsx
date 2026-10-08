import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import TablaEventos, { type FilaEvento } from "./TablaEventos";

export default async function PaginaEventos() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const { data: eventos, error } = await supabase
    .from("evento")
    .select(
      "id_evento, estado, fecha_creacion, cotizacion:id_cotizacion ( tipo_evento, nombre_cliente, fecha_evento, cantidad_pax )",
    )
    .order("fecha_creacion", { ascending: false })
    .returns<FilaEvento[]>();

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <TablaEventos eventos={eventos ?? []} />
    </Box>
  );
}
