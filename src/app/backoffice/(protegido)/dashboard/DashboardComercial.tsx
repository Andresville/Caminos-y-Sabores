import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import TarjetaEstadistica from "./TarjetaEstadistica";

const DIAS_PROXIMA_A_VENCER = 3;

const ETIQUETAS_ESTADO: Record<string, string> = {
  EMITIDA: "Emitidas",
  EN_NEGOCIACION: "En negociación",
  CONFIRMADA: "Confirmadas",
  RECHAZADA: "Rechazadas",
  VENCIDA: "Vencidas",
  EJECUTADA: "Ejecutadas",
};

export default async function DashboardComercial() {
  const supabase = await createClient();

  const hoy = new Date();
  const limiteVencimiento = new Date(hoy.getTime() + DIAS_PROXIMA_A_VENCER * 24 * 60 * 60 * 1000);

  const { data: cotizaciones } = await supabase
    .from("cotizacion")
    .select("id_cotizacion, codigo, nombre_cliente, fecha_validez, monto_total, estado");

  const lista = cotizaciones ?? [];
  const total = lista.length;

  const porEstado = lista.reduce<Record<string, number>>((acumulado, c) => {
    acumulado[c.estado] = (acumulado[c.estado] ?? 0) + 1;
    return acumulado;
  }, {});

  const montoConfirmado = lista
    .filter((c) => c.estado === "CONFIRMADA" || c.estado === "EJECUTADA")
    .reduce((acumulado, c) => acumulado + Number(c.monto_total), 0);

  const convertidas = (porEstado.CONFIRMADA ?? 0) + (porEstado.EJECUTADA ?? 0);
  const tasaConversion = total > 0 ? (convertidas / total) * 100 : 0;

  const proximasAVencer = lista
    .filter(
      (c) =>
        (c.estado === "EMITIDA" || c.estado === "EN_NEGOCIACION") &&
        new Date(c.fecha_validez) <= limiteVencimiento,
    )
    .sort((a, b) => new Date(a.fecha_validez).getTime() - new Date(b.fecha_validez).getTime());

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TarjetaEstadistica etiqueta="Cotizaciones totales" valor={total} />
        <TarjetaEstadistica etiqueta="Monto confirmado" valor={formatoMoneda.format(montoConfirmado)} />
        <TarjetaEstadistica etiqueta="Tasa de conversión" valor={`${tasaConversion.toFixed(0)}%`} />
        <TarjetaEstadistica
          etiqueta={`Vencen en ${DIAS_PROXIMA_A_VENCER} días`}
          valor={proximasAVencer.length}
          severidad={proximasAVencer.length > 0 ? "warning" : "neutro"}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Cotizaciones por estado
        </Typography>
        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
          {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => (
            <Typography key={clave} variant="body2" color="text.secondary">
              {etiqueta}: <strong>{porEstado[clave] ?? 0}</strong>
            </Typography>
          ))}
        </Stack>
      </Paper>

      {proximasAVencer.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Próximas a vencer
          </Typography>
          <List dense>
            {proximasAVencer.map((c) => (
              <ListItem key={c.id_cotizacion} disableGutters>
                <ListItemText
                  primary={`${c.codigo} · ${c.nombre_cliente}`}
                  secondary={`Vence el ${formatoFecha.format(new Date(c.fecha_validez))}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Stack>
  );
}
