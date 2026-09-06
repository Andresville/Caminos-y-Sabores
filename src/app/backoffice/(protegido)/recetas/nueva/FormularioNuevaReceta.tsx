"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { crearReceta, type EstadoFormulario } from "../actions";
import { TIPOS_PLATO } from "../mapeo";

const estadoInicial: EstadoFormulario = {};

export default function FormularioNuevaReceta() {
  const [estado, accion, pendiente] = useActionState(crearReceta, estadoInicial);

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 480, mt: 2 }}>
      <Box component="form" action={accion}>
        <Stack spacing={2}>
          {estado.error && <Alert severity="error">{estado.error}</Alert>}

          <TextField name="nombre_plato" label="Nombre del plato" required fullWidth disabled={pendiente} autoFocus />

          <TextField
            name="tipo_plato"
            label="Tipo de plato"
            select
            required
            fullWidth
            defaultValue=""
            disabled={pendiente}
          >
            {TIPOS_PLATO.map((tipo) => (
              <MenuItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name="cantidad_porciones"
            label="Porciones que rinde"
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
