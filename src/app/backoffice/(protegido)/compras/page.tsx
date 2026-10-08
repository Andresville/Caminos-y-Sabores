import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import TablaCompras, { type FilaCompra } from "./TablaCompras";

interface EventoConInsumos {
  id_evento: number;
  cotizacion: { tipo_evento: string; fecha_evento: string };
  evento_insumo: { estado: "PENDIENTE" | "EN_CAMINO" | "COMPRADO"; costo_estimado: number }[];
}

export default async function PaginaCompras() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const { data: eventos, error } = await supabase
    .from("evento")
    .select(
      "id_evento, cotizacion:id_cotizacion ( tipo_evento, fecha_evento ), evento_insumo ( estado, costo_estimado )",
    )
    .eq("estado", "EN_PREPARACION")
    .returns<EventoConInsumos[]>();

  const filas: FilaCompra[] = (eventos ?? [])
    .map((evento) => ({
      id_evento: evento.id_evento,
      nombreEvento: evento.cotizacion.tipo_evento,
      fechaEvento: evento.cotizacion.fecha_evento,
      costoEstimado: evento.evento_insumo.reduce((acumulado, i) => acumulado + i.costo_estimado, 0),
      listaCompleta: evento.evento_insumo.length > 0 && evento.evento_insumo.every((i) => i.estado === "COMPRADO"),
    }))
    .sort((a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime());

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <TablaCompras compras={filas} />
    </Box>
  );
}
