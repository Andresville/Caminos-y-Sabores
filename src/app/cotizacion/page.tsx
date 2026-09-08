"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import BarraPortal from "@/components/portal/BarraPortal";

export default function PaginaConsultarPresupuesto() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function buscar() {
    const limpio = codigo.trim().toUpperCase();
    if (!limpio) return;
    router.push(`/cotizacion/${encodeURIComponent(limpio)}`);
  }

  return (
    <>
      <BarraPortal mostrarNavegacion={false} />
      <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Consultá tu presupuesto
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Ingresá el código que te mostramos al emitirlo y que te enviamos por email (por ejemplo,
            COT-2026-00001).
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Código de presupuesto"
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value)}
              onKeyDown={(evento) => evento.key === "Enter" && buscar()}
              fullWidth
              autoFocus
            />
            <Button variant="contained" size="large" onClick={buscar} disabled={!codigo.trim()}>
              Buscar
            </Button>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
