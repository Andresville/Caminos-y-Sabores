"use client";

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { desactivarAdicional } from "./actions";
import type { FilaAdicional } from "./TablaAdicionales";

export default function DialogoEliminarAdicional({
  adicional,
  onCerrar,
}: {
  adicional: FilaAdicional | null;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function cerrar() {
    if (pendiente) return;
    setError(null);
    onCerrar();
  }

  function confirmar() {
    if (!adicional) return;
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await desactivarAdicional(adicional.id_adicional);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={adicional !== null} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "#FBE4E4",
            color: "#D64545",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}>¿Desactivar servicio adicional?</Box>
        <IconButton onClick={cerrar} size="small" disabled={pendiente}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography color="text.secondary">
            ¿Estás seguro de que deseas desactivar <strong>{adicional?.nombre_servicio}</strong>? Va a dejar de
            estar disponible para nuevos presupuestos, pero podés reactivarlo más adelante desde su edición.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar} disabled={pendiente} variant="outlined" fullWidth>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={pendiente} variant="contained" color="error" fullWidth>
          {pendiente ? "Desactivando…" : "Desactivar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
