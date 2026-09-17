"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { obtenerHistoricoPrecio, type FilaHistoricoPrecio } from "./actions";

/** Se carga recién cuando el usuario despliega el histórico de un insumo, no de entrada con el resto del listado. */
export default function HistoricoPrecio({ idMateriaPrima }: { idMateriaPrima: number }) {
  const [historico, setHistorico] = useState<FilaHistoricoPrecio[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerHistoricoPrecio(idMateriaPrima).then((datos) => {
      if (!cancelado) setHistorico(datos);
    });
    return () => {
      cancelado = true;
    };
  }, [idMateriaPrima]);

  if (historico === null) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Cargando histórico…
        </Typography>
      </Stack>
    );
  }

  if (historico.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        Todavía no hay cambios de precio registrados para este insumo.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75} sx={{ py: 1 }}>
      {historico.map((fila) => (
        <Stack
          key={fila.id_historico}
          direction="row"
          spacing={2}
          sx={{ alignItems: "baseline", flexWrap: "wrap" }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
            {formatoFecha.format(new Date(fila.fecha_cambio))}
          </Typography>
          <Typography variant="body2">
            {formatoMoneda.format(fila.costo_anterior)} → {formatoMoneda.format(fila.costo_nuevo)}
          </Typography>
          <Typography
            variant="body2"
            color={fila.variacion_pct > 0 ? "error.main" : fila.variacion_pct < 0 ? "success.main" : "text.secondary"}
            sx={{ fontWeight: 600 }}
          >
            {fila.variacion_pct > 0 ? "+" : ""}
            {fila.variacion_pct}%
          </Typography>
          {fila.motivo && (
            <Typography variant="body2" color="text.secondary">
              — {fila.motivo}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
