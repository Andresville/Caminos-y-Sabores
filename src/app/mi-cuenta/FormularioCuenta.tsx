"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { actualizarDatosCliente, actualizarPasswordCliente, type EstadoCuenta } from "./actions";

const estadoInicial: EstadoCuenta = {};

export default function FormularioCuenta({
  cliente,
}: {
  cliente: { nombreCompleto: string; email: string; telefono: string | null };
}) {
  const [estadoDatos, accionDatos, pendienteDatos] = useActionState(actualizarDatosCliente, estadoInicial);
  const [estadoPassword, accionPassword, pendientePassword] = useActionState(actualizarPasswordCliente, estadoInicial);

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, borderColor: paletaCliente.borde, borderRadius: 4 }}>
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 2 }}>
          Datos personales
        </Typography>
        <Box component="form" action={accionDatos}>
          <Stack spacing={2}>
            {estadoDatos.error && <Alert severity="error">{estadoDatos.error}</Alert>}
            {estadoDatos.exito && <Alert severity="success">¡Guardado!</Alert>}
            <TextField
              name="nombre_completo"
              label="Nombre y apellido"
              defaultValue={cliente.nombreCompleto}
              required
              fullWidth
              disabled={pendienteDatos}
            />
            <TextField label="Email" value={cliente.email} fullWidth disabled helperText="No se puede modificar" />
            <TextField
              name="telefono"
              label="Teléfono"
              defaultValue={cliente.telefono ?? ""}
              fullWidth
              disabled={pendienteDatos}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={pendienteDatos}
              sx={{ alignSelf: "flex-start", bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
            >
              {pendienteDatos ? "Guardando…" : "Guardar cambios"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderColor: paletaCliente.borde, borderRadius: 4 }}>
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 2 }}>
          Cambiar contraseña
        </Typography>
        <Box component="form" action={accionPassword}>
          <Stack spacing={2}>
            {estadoPassword.error && <Alert severity="error">{estadoPassword.error}</Alert>}
            {estadoPassword.exito && <Alert severity="success">¡Contraseña actualizada!</Alert>}
            <TextField
              name="nueva_password"
              label="Nueva contraseña"
              type="password"
              required
              fullWidth
              disabled={pendientePassword}
            />
            <TextField
              name="confirmar_password"
              label="Confirmar nueva contraseña"
              type="password"
              required
              fullWidth
              disabled={pendientePassword}
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={pendientePassword}
              sx={{ alignSelf: "flex-start", borderColor: paletaCliente.primario, color: paletaCliente.primario }}
            >
              {pendientePassword ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
