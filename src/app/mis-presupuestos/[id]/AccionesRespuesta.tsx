"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { responderPresupuesto } from "./actions";

export default function AccionesRespuesta({ idCotizacion }: { idCotizacion: number }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function responder(aceptar: boolean) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await responderPresupuesto(idCotizacion, aceptar);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          onClick={() => responder(true)}
          variant="contained"
          size="large"
          fullWidth
          disabled={pendiente}
          sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
        >
          Aceptar presupuesto
        </Button>
        <Button
          onClick={() => responder(false)}
          variant="outlined"
          size="large"
          fullWidth
          disabled={pendiente}
          color="error"
        >
          Rechazar presupuesto
        </Button>
      </Stack>
    </Stack>
  );
}
