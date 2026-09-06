"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { crearMenu, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export default function FormularioNuevoMenu() {
  const [estado, accion, pendiente] = useActionState(crearMenu, estadoInicial);

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 480, mt: 2 }}>
      <Box component="form" action={accion}>
        <Stack spacing={2}>
          {estado.error && <Alert severity="error">{estado.error}</Alert>}

          <TextField
            name="nombre_menu"
            label="Nombre del menú"
            required
            fullWidth
            disabled={pendiente}
            autoFocus
          />

          <TextField
            name="descripcion"
            label="Descripción comercial"
            fullWidth
            multiline
            minRows={2}
            disabled={pendiente}
          />

          <TextField
            name="pax_minimo"
            label="Pax mínimo"
            type="number"
            slotProps={{ htmlInput: { step: "1", min: "1" } }}
            required
            fullWidth
            disabled={pendiente}
          />

          <Button type="submit" variant="contained" size="large" disabled={pendiente}>
            {pendiente ? "Creando…" : "Crear y continuar"}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
