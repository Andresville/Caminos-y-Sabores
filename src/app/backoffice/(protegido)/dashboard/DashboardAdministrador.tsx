import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha } from "@/lib/formato";
import TarjetaEstadistica from "./TarjetaEstadistica";

interface MovimientoAuditoria {
  id_auditoria: number;
  entidad: string;
  accion: string;
  fecha_hora: string;
  nombre_usuario: string | null;
}

export default async function DashboardAdministrador() {
  const supabase = await createClient();

  const [
    { data: usuarios },
    { count: insumosActivos },
    { count: recetasActivas },
    { count: menusActivos },
    { count: cotizacionesTotales },
    { data: auditoria },
  ] = await Promise.all([
    supabase.from("usuario").select("estado"),
    supabase.from("materia_prima").select("*", { count: "exact", head: true }).eq("estado", true),
    supabase.from("receta").select("*", { count: "exact", head: true }).eq("estado", "ACTIVA"),
    supabase.from("menu").select("*", { count: "exact", head: true }).eq("estado", true),
    supabase.from("cotizacion").select("*", { count: "exact", head: true }),
    supabase.rpc("obtener_auditoria", { p_entidad: null, p_desde: null, p_hasta: null }),
  ]);

  const usuariosActivos = (usuarios ?? []).filter((u) => u.estado).length;
  const ultimosMovimientos = ((auditoria ?? []) as MovimientoAuditoria[]).slice(0, 5);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TarjetaEstadistica etiqueta="Usuarios activos" valor={`${usuariosActivos} / ${(usuarios ?? []).length}`} />
        <TarjetaEstadistica etiqueta="Insumos activos" valor={insumosActivos ?? 0} />
        <TarjetaEstadistica etiqueta="Recetas activas" valor={recetasActivas ?? 0} />
        <TarjetaEstadistica etiqueta="Menús activos" valor={menusActivos ?? 0} />
        <TarjetaEstadistica etiqueta="Cotizaciones totales" valor={cotizacionesTotales ?? 0} />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Últimos movimientos de auditoría
        </Typography>
        {ultimosMovimientos.length === 0 ? (
          <Typography color="text.secondary">Todavía no hay movimientos registrados.</Typography>
        ) : (
          <List dense>
            {ultimosMovimientos.map((mov) => (
              <ListItem key={mov.id_auditoria} disableGutters>
                <ListItemText
                  primary={`${mov.entidad} · ${mov.accion}`}
                  secondary={`${mov.nombre_usuario ?? "—"} · ${formatoFecha.format(new Date(mov.fecha_hora))}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
