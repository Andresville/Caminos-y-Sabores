"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Link from "next/link";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { iniciarSesionCliente, registrarCliente, type EstadoAuth } from "./actions";

const estadoInicial: EstadoAuth = {};

export default function FormularioAuth({ redirectA }: { redirectA: string }) {
  const [estadoLogin, accionLogin, pendienteLogin] = useActionState(iniciarSesionCliente, estadoInicial);
  const [estadoRegistro, accionRegistro, pendienteRegistro] = useActionState(registrarCliente, estadoInicial);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);

  return (
    <>
      <Box
        sx={{
          width: "100%",
          maxWidth: 900,
          bgcolor: "white",
          borderRadius: 4,
          border: `1px solid ${paletaCliente.borde}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ p: 4, flex: 1 }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.5rem", color: paletaCliente.textoOscuro }}>
            Iniciá sesión
          </Typography>
          <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario, mb: 3 }}>
            Accedé a tus presupuestos guardados.
          </Typography>

          <Box component="form" action={accionLogin}>
            <Stack spacing={2}>
              {estadoLogin.error && <Alert severity="error">{estadoLogin.error}</Alert>}
              <input type="hidden" name="redirect" value={redirectA} />
              <TextField name="email" label="Email" type="email" required fullWidth disabled={pendienteLogin} />
              <TextField name="password" label="Contraseña" type="password" required fullWidth disabled={pendienteLogin} />
              <Box sx={{ textAlign: "right" }}>
                <Link href="/login/recuperar" style={{ fontSize: 13, color: paletaCliente.primario }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={pendienteLogin}
                sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
              >
                {pendienteLogin ? "Ingresando…" : "Ingresar"}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 4, flex: 1, bgcolor: paletaCliente.fondoMasClaro, borderLeft: { md: `1px solid ${paletaCliente.borde}` } }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.5rem", color: paletaCliente.textoOscuro }}>
            Creá tu cuenta
          </Typography>
          <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario, mb: 3 }}>
            ¿Sos nuevo? Registrate para armar tu presupuesto.
          </Typography>

          <Box component="form" action={accionRegistro}>
            <Stack spacing={1.5}>
              {estadoRegistro.error && <Alert severity="error">{estadoRegistro.error}</Alert>}
              {estadoRegistro.mensaje && <Alert severity="success">{estadoRegistro.mensaje}</Alert>}
              <TextField name="nombre_completo" label="Nombre y apellido" required fullWidth disabled={pendienteRegistro} />
              <TextField name="email" label="Email" type="email" required fullWidth disabled={pendienteRegistro} />
              <TextField name="telefono" label="Teléfono (opcional)" fullWidth disabled={pendienteRegistro} />
              <Stack direction="row" spacing={1.5}>
                <TextField name="password" label="Contraseña" type="password" required fullWidth disabled={pendienteRegistro} />
                <TextField
                  name="confirmar_password"
                  label="Confirmar"
                  type="password"
                  required
                  fullWidth
                  disabled={pendienteRegistro}
                />
              </Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={aceptaTerminos}
                    onChange={(evento) => setAceptaTerminos(evento.target.checked)}
                    disabled={pendienteRegistro}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
                    Acepto los{" "}
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setMostrarTerminos(true)}
                      sx={{ color: paletaCliente.primario, textDecoration: "underline", background: "none", border: 0, p: 0, cursor: "pointer" }}
                    >
                      Términos y Condiciones
                    </Box>
                    .
                  </Typography>
                }
              />
              <input type="hidden" name="acepta_terminos" value={aceptaTerminos ? "true" : "false"} />
              <input type="hidden" name="redirect" value={redirectA} />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!aceptaTerminos || pendienteRegistro}
                sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
              >
                {pendienteRegistro ? "Creando…" : "Crear cuenta"}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Dialog open={mostrarTerminos} onClose={() => setMostrarTerminos(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Términos y Condiciones</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Texto de referencia — se completa con el texto legal definitivo del emprendimiento. Al registrarte,
            aceptás que tus datos de contacto se usen para coordinar tu evento y que los presupuestos que
            generes en el sitio son estimaciones sujetas a confirmación por nuestro equipo comercial.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarTerminos(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
