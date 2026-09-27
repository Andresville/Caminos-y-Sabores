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
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { iniciarSesion, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = {};

const colores = {
  avatar: "#28492F",
  terracota: "#C2652F",
  terracotaOscuro: "#A8521F",
  textoOscuro: "#2D1A0E",
  textoMuted: "#8C7A6E",
  borde: "#E7DCD3",
};

export default function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, estadoInicial);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarAyudaClave, setMostrarAyudaClave] = useState(false);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 380,
        bgcolor: "white",
        borderRadius: 4,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        p: 4,
      }}
    >
      <Stack spacing={0.5} sx={{ alignItems: "center", mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: colores.avatar,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.4rem",
            fontFamily: "Georgia, serif",
            mb: 1.5,
          }}
        >
          S
        </Box>
        <Typography
          sx={{ fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: 1, color: colores.textoOscuro }}
        >
          SABORES &amp; EVENTOS
        </Typography>
        <Typography variant="body2" sx={{ color: colores.terracota }}>
          Gestión Integral de Catering
        </Typography>
      </Stack>

      <Box component="form" action={accion}>
        <Stack spacing={2}>
          {estado.error && <Alert severity="error">{estado.error}</Alert>}

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: colores.textoOscuro, mb: 0.75 }}>
              Usuario
            </Typography>
            <TextField
              name="email"
              type="email"
              placeholder="tu.usuario@sabores.com"
              required
              autoComplete="username"
              disabled={pendiente}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon fontSize="small" sx={{ color: colores.textoMuted }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: colores.textoOscuro }}>
                Contraseña
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setMostrarAyudaClave((actual) => !actual)}
                sx={{
                  background: "none",
                  border: 0,
                  p: 0,
                  cursor: "pointer",
                  color: colores.terracota,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ¿La olvidó?
              </Box>
            </Stack>
            <TextField
              name="password"
              type={mostrarPassword ? "text" : "password"}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              disabled={pendiente}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" sx={{ color: colores.textoMuted }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setMostrarPassword((actual) => !actual)} edge="end">
                        {mostrarPassword ? (
                          <VisibilityOffOutlinedIcon fontSize="small" sx={{ color: colores.textoMuted }} />
                        ) : (
                          <VisibilityOutlinedIcon fontSize="small" sx={{ color: colores.textoMuted }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {mostrarAyudaClave && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Contactate con el Administrador del sistema para restablecer tu contraseña.
              </Alert>
            )}
          </Box>

          <FormControlLabel
            control={<Checkbox size="small" disabled={pendiente} />}
            label={
              <Typography variant="body2" sx={{ color: colores.textoOscuro }}>
                Recordar mi sesión en este dispositivo
              </Typography>
            }
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={pendiente}
            sx={{
              bgcolor: colores.terracota,
              "&:hover": { bgcolor: colores.terracotaOscuro },
              fontWeight: 700,
              py: 1.2,
            }}
          >
            {pendiente ? "Ingresando…" : "Iniciar Sesión"}
          </Button>

          <Typography variant="caption" sx={{ textAlign: "center", color: colores.textoMuted }}>
            Conexión encriptada de alta seguridad
          </Typography>

          <Divider />

          <Typography variant="body2" sx={{ textAlign: "center", color: colores.textoMuted }}>
            ¿No tiene acceso?{" "}
            <Box
              component="a"
              href="mailto:contacto@saboreseventos.com"
              sx={{ color: colores.terracota, fontWeight: 700, textDecoration: "none" }}
            >
              Contactar Soporte
            </Box>
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
