"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { cambiarEstadoCotizacion } from "../actions";
import { TRANSICIONES_MANUALES, type EstadoCotizacion } from "../mapeo";

export default function AccionesEstado({
  idCotizacion,
  estadoActual,
}: {
  idCotizacion: number;
  estadoActual: EstadoCotizacion;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const opciones = TRANSICIONES_MANUALES[estadoActual];

  function cambiarEstado(nuevoEstado: EstadoCotizacion) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoCotizacion(idCotizacion, nuevoEstado);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  if (opciones.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Cambiar estado
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={2}>
        {opciones.map((opcion) => (
          <Button
            key={opcion.estado}
            variant="contained"
            color={opcion.estado === "RECHAZADA" ? "error" : "primary"}
            onClick={() => cambiarEstado(opcion.estado)}
            disabled={pendiente}
          >
            {pendiente ? "…" : opcion.etiqueta}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}
