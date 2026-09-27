import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import TarjetaEstadistica from "./TarjetaEstadistica";

interface InsumoFila {
  id_materia_prima: number;
  ultima_actualizacion: string;
}

interface CambioPrecio {
  id_historico: number;
  precio_bulto_anterior: number;
  precio_bulto_nuevo: number;
  fecha_cambio: string;
  materia_prima: { nombre: string } | null;
}

function estaDesactualizado(fechaIso: string, diasAlerta: number): boolean {
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  return dias > diasAlerta;
}

export default async function DashboardCompras() {
  const supabase = await createClient();

  const [{ data: insumos }, { data: parametro }, { data: historial }] = await Promise.all([
    supabase
      .from("materia_prima")
      .select("id_materia_prima, ultima_actualizacion")
      .eq("estado", true)
      .returns<InsumoFila[]>(),
    supabase.from("parametro_sistema").select("valor").eq("clave", "DIAS_ALERTA_PRECIO").single(),
    supabase
      .from("historico_precio_mp")
      .select("id_historico, precio_bulto_anterior, precio_bulto_nuevo, fecha_cambio, materia_prima:id_materia_prima(nombre)")
      .order("fecha_cambio", { ascending: false })
      .limit(5)
      .returns<CambioPrecio[]>(),
  ]);

  const listaInsumos = insumos ?? [];
  const diasAlerta = parametro ? Number(parametro.valor) : 30;
  const desactualizados = listaInsumos.filter((i) => estaDesactualizado(i.ultima_actualizacion, diasAlerta)).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TarjetaEstadistica etiqueta="Insumos activos" valor={listaInsumos.length} />
        <TarjetaEstadistica
          etiqueta="Precios desactualizados"
          valor={desactualizados}
          severidad={desactualizados > 0 ? "warning" : "neutro"}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Últimos cambios de precio
        </Typography>
        {(historial ?? []).length === 0 ? (
          <Typography color="text.secondary">Todavía no hay cambios registrados.</Typography>
        ) : (
          <List dense>
            {(historial ?? []).map((cambio) => (
              <ListItem key={cambio.id_historico} disableGutters>
                <ListItemText
                  primary={cambio.materia_prima?.nombre ?? "—"}
                  secondary={`${formatoMoneda.format(cambio.precio_bulto_anterior)} → ${formatoMoneda.format(cambio.precio_bulto_nuevo)} · ${formatoFecha.format(new Date(cambio.fecha_cambio))}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
