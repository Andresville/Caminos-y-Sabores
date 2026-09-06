"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { iniciarSesion, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = {};

export default function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, estadoInicial);

  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 420, width: "100%" }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }} gutterBottom>
        Iniciar sesión
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Ingresá con tu cuenta del backoffice.
      </Typography>

      <Box
        component="form"
        action={accion}
        sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
      >
        {estado.error && <Alert severity="error">{estado.error}</Alert>}

        <TextField
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="username"
          disabled={pendiente}
          fullWidth
        />
        <TextField
          name="password"
          type="password"
          label="Contraseña"
          required
          autoComplete="current-password"
          disabled={pendiente}
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={pendiente}>
          {pendiente ? "Ingresando…" : "Ingresar"}
        </Button>
      </Box>
    </Paper>
  );
}
