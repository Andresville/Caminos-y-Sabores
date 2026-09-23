"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { createClient } from "@/lib/supabase/client";

/**
 * El link que llega por mail trae el token de recuperación en el propio
 * URL; el cliente de navegador de Supabase lo detecta solo y arma una
 * sesión temporal — por eso esto llama a auth.updateUser() directo
 * desde el navegador, no por una Server Action (el servidor nunca ve
 * ese token, va en el fragmento de la URL).
 */
export default function FormularioRestablecer() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar() {
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error: errorActualizar } = await supabase.auth.updateUser({ password });
    setEnviando(false);

    if (errorActualizar) {
      setError("No pudimos actualizar tu contraseña. El link puede haber vencido — pedí uno nuevo.");
      return;
    }
    setListo(true);
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 420, bgcolor: "white", borderRadius: 4, border: `1px solid ${paletaCliente.borde}`, p: 4 }}>
      <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.4rem", color: paletaCliente.textoOscuro, mb: 1 }}>
        Elegí una contraseña nueva
      </Typography>

      {listo ? (
        <Alert severity="success">¡Listo! Ya podés usar tu nueva contraseña.</Alert>
      ) : (
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nueva contraseña"
            type="password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            fullWidth
            disabled={enviando}
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            value={confirmar}
            onChange={(evento) => setConfirmar(evento.target.value)}
            fullWidth
            disabled={enviando}
          />
          <Button
            onClick={enviar}
            variant="contained"
            disabled={enviando}
            sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
          >
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
