"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { responderPresupuesto } from "./actions";

export default function AccionesRespuesta({
  idCotizacion,
  soloRechazar = false,
}: {
  idCotizacion: number;
  /** Cuando el presupuesto ya está Solicitado, el cliente se puede arrepentir y rechazarlo, pero ya no tiene sentido "solicitar contacto" de nuevo. */
  soloRechazar?: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");

  function aceptar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await responderPresupuesto(idCotizacion, true);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmarRechazo() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await responderPresupuesto(idCotizacion, false, motivo);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setMostrarRechazo(false);
      router.refresh();
    });
  }

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {!soloRechazar && (
          <Button
            onClick={aceptar}
            variant="contained"
            size="large"
            fullWidth
            disabled={pendiente}
            sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
          >
            Solicitar contacto comercial
          </Button>
        )}
        <Button
          onClick={() => setMostrarRechazo(true)}
          variant="outlined"
          size="large"
          fullWidth
          disabled={pendiente}
          color="error"
        >
          Rechazar Presupuesto
        </Button>
      </Stack>

      <Dialog open={mostrarRechazo} onClose={() => setMostrarRechazo(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Rechazar Presupuesto
          <IconButton onClick={() => setMostrarRechazo(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            placeholder="Contanos el motivo (nos ayuda a mejorar)"
            multiline
            minRows={3}
            fullWidth
            disabled={pendiente}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarRechazo(false)} disabled={pendiente}>
            Cancelar
          </Button>
          <Button onClick={confirmarRechazo} variant="contained" color="error" disabled={pendiente}>
            {pendiente ? "Rechazando…" : "Confirmar rechazo"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
