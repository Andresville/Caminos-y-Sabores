"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { actualizarCliente } from "./actions";
import type { FilaCliente } from "./VistaClientes";

const COLOR_ACCION = "#219653";

export default function DialogoCliente({
  cliente,
  onCerrar,
}: {
  cliente: FilaCliente | null;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [nombreCompleto, setNombreCompleto] = useState(cliente?.nombre_completo ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [estadoActivo, setEstadoActivo] = useState(cliente?.estado ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function cerrar() {
    if (pendiente) return;
    onCerrar();
  }

  function confirmar() {
    if (!cliente) return;
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await actualizarCliente(cliente.id_cliente, nombreCompleto, telefono, estadoActivo);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.refresh();
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={cliente !== null} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Editar cliente
        <IconButton onClick={cerrar} size="small" disabled={pendiente}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Nombre"
            value={nombreCompleto}
            onChange={(evento) => setNombreCompleto(evento.target.value)}
            required
            fullWidth
            disabled={pendiente}
            autoFocus
          />

          <TextField
            label="Email"
            type="email"
            value={cliente?.email ?? ""}
            fullWidth
            disabled
            helperText="El email no se puede modificar desde acá."
          />

          <TextField
            label="Teléfono"
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            fullWidth
            disabled={pendiente}
          />

          <TextField
            label="Estado"
            select
            value={estadoActivo ? "true" : "false"}
            onChange={(evento) => setEstadoActivo(evento.target.value === "true")}
            fullWidth
            disabled={pendiente}
          >
            <MenuItem value="true">Activo</MenuItem>
            <MenuItem value="false">Inactivo</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar} disabled={pendiente} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={confirmar}
          variant="contained"
          disabled={pendiente || !nombreCompleto}
          sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" } }}
        >
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
