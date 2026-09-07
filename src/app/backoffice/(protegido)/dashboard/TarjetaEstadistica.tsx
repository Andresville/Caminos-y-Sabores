import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function TarjetaEstadistica({
  etiqueta,
  valor,
  severidad = "neutro",
}: {
  etiqueta: string;
  valor: string | number;
  severidad?: "neutro" | "success" | "warning" | "error";
}) {
  const color = severidad === "neutro" ? "text.primary" : `${severidad}.main`;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, minWidth: 200, flex: "1 1 200px" }}>
      <Typography variant="overline" color="text.secondary">
        {etiqueta}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>
        {valor}
      </Typography>
    </Paper>
  );
}
