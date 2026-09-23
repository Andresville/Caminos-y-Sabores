"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { solicitarRecuperacion, type EstadoRecuperacion } from "./actions";

const estadoInicial: EstadoRecuperacion = {};

export default function FormularioRecuperar() {
  const [estado, accion, pendiente] = useActionState(solicitarRecuperacion, estadoInicial);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 420,
        bgcolor: "white",
        borderRadius: 4,
        border: `1px solid ${paletaCliente.borde}`,
        p: 4,
      }}
    >
      <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.4rem", color: paletaCliente.textoOscuro, mb: 1 }}>
        Recuperar contraseña
      </Typography>
      <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario, mb: 3 }}>
        Ingresá tu email y te enviamos un link para elegir una contraseña nueva.
      </Typography>

      {estado.enviado ? (
        <Alert severity="success">Si el email está registrado, te llegó un link para restablecer tu contraseña.</Alert>
      ) : (
        <Box component="form" action={accion}>
          <Stack spacing={2}>
            {estado.error && <Alert severity="error">{estado.error}</Alert>}
            <TextField name="email" label="Email" type="email" required fullWidth disabled={pendiente} />
            <Button
              type="submit"
              variant="contained"
              disabled={pendiente}
              sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
            >
              {pendiente ? "Enviando…" : "Enviar link"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
