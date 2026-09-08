"use client";

import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { TIPOS_EVENTO } from "./mapeo";

export default function PasoEvento({
  pax,
  fecha,
  tipoEvento,
  onCambiarPax,
  onCambiarFecha,
  onCambiarTipoEvento,
  mensajeError,
}: {
  pax: string;
  fecha: string;
  tipoEvento: string;
  onCambiarPax: (valor: string) => void;
  onCambiarFecha: (valor: string) => void;
  onCambiarTipoEvento: (valor: string) => void;
  mensajeError: string | null;
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Contanos sobre tu evento
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Estos datos definen la base del cálculo. Podés cambiarlos en cualquier momento.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Cantidad de invitados"
          type="number"
          value={pax}
          onChange={(evento) => onCambiarPax(evento.target.value)}
          slotProps={{ htmlInput: { min: 1 } }}
          required
          fullWidth
        />
        <TextField
          label="Fecha estimada del evento"
          type="date"
          value={fecha}
          onChange={(evento) => onCambiarFecha(evento.target.value)}
          slotProps={{ htmlInput: { min: hoy }, inputLabel: { shrink: true } }}
          required
          fullWidth
        />
      </Stack>

      <TextField
        label="Tipo de evento"
        select
        value={tipoEvento}
        onChange={(evento) => onCambiarTipoEvento(evento.target.value)}
        required
        fullWidth
      >
        {TIPOS_EVENTO.map((tipo) => (
          <MenuItem key={tipo} value={tipo}>
            {tipo}
          </MenuItem>
        ))}
      </TextField>

      {mensajeError && <Alert severity="warning">{mensajeError}</Alert>}
    </Stack>
  );
}
