"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { cambiarEstadoEvento } from "./actions";
import type { FilaEvento } from "./TablaEventos";

export default function DialogoCancelarEvento({
  evento,
  onCerrar,
}: {
  evento: FilaEvento | null;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function cerrar() {
    if (pendiente) return;
    setError(null);
    onCerrar();
  }

  function confirmar() {
    if (!evento) return;
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoEvento(evento.id_evento, "CANCELADO");
      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.refresh();
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={evento !== null} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Cancelar evento</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography color="text.secondary">
          ¿Querés cancelar este evento? Evento: <strong>{evento?.cotizacion.tipo_evento}</strong>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar} disabled={pendiente} variant="outlined" fullWidth>
          Volver
        </Button>
        <Button onClick={confirmar} disabled={pendiente} variant="contained" color="error" fullWidth>
          {pendiente ? "Cancelando…" : "Cancelar evento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
