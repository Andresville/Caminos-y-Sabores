import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { createClient } from "@/lib/supabase/server";
import TarjetaEstadistica from "./TarjetaEstadistica";

export default async function DashboardChef() {
  const supabase = await createClient();

  const [{ data: recetas }, { data: menus }] = await Promise.all([
    supabase.from("receta").select("id_receta, nombre_plato, estado").order("nombre_plato"),
    supabase.from("menu").select("id_menu, estado"),
  ]);

  const listaRecetas = recetas ?? [];
  const borradores = listaRecetas.filter((r) => r.estado === "BORRADOR");
  const activas = listaRecetas.filter((r) => r.estado === "ACTIVA").length;
  const menusActivos = (menus ?? []).filter((m) => m.estado).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TarjetaEstadistica etiqueta="Recetas activas" valor={activas} />
        <TarjetaEstadistica
          etiqueta="Recetas en borrador"
          valor={borradores.length}
          severidad={borradores.length > 0 ? "warning" : "neutro"}
        />
        <TarjetaEstadistica etiqueta="Menús activos" valor={`${menusActivos} / ${(menus ?? []).length}`} />
      </Stack>

      {borradores.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Recetas pendientes de terminar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Siguen en borrador y todavía no se pueden usar en un menú.
          </Typography>
          <List dense>
            {borradores.map((receta) => (
              <ListItem key={receta.id_receta} disableGutters>
                <ListItemText primary={receta.nombre_plato} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Stack>
  );
}
