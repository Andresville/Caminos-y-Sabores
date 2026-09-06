"use client";

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatoMoneda } from "@/lib/formato";
import { actualizarPrecioInsumo } from "./actions";
import type { FilaInsumo } from "./TablaInsumos";

export default function DialogoEditarPrecio({
  insumo,
  onCerrar,
}: {
  insumo: FilaInsumo | null;
  onCerrar: () => void;
}) {
  const [costoNuevo, setCostoNuevo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function cerrar() {
    if (pendiente) return;
    onCerrar();
  }

  function confirmar() {
    if (!insumo) return;
    setError(null);

    const formData = new FormData();
    formData.set("id_materia_prima", String(insumo.id_materia_prima));
    formData.set("costo_nuevo", costoNuevo);
    formData.set("motivo", motivo);

    iniciarTransicion(async () => {
      const resultado = await actualizarPrecioInsumo({}, formData);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={insumo !== null} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle>Editar precio — {insumo?.nombre}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {insumo && (
            <Typography variant="body2" color="text.secondary">
              Costo vigente: {formatoMoneda.format(insumo.costo_unitario)}
            </Typography>
          )}
          <TextField
            label="Costo nuevo"
            type="number"
            value={costoNuevo}
            onChange={(evento) => setCostoNuevo(evento.target.value)}
            slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
            required
            fullWidth
            disabled={pendiente}
            autoFocus
          />
          <TextField
            label="Motivo (obligatorio si la variación supera el umbral configurado)"
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={pendiente}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar} disabled={pendiente}>
          Cancelar
        </Button>
        <Button onClick={confirmar} variant="contained" disabled={pendiente || !costoNuevo}>
          {pendiente ? "Guardando…" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
