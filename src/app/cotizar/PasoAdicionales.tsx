"use client";

import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { formatoMoneda } from "@/lib/formato";
import type { ServicioPublico } from "@/lib/cotizador/datos";

export default function PasoAdicionales({
  servicios,
  idsSeleccionados,
  onCambiar,
}: {
  servicios: ServicioPublico[];
  idsSeleccionados: number[];
  onCambiar: (idAdicional: number, marcado: boolean) => void;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Sumale servicios a tu evento
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Marcá lo que necesites: el total se actualiza al instante.
      </Typography>

      {servicios.length === 0 ? (
        <Typography color="text.secondary">No hay servicios adicionales disponibles en este momento.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {servicios.map((servicio) => {
            const marcado = idsSeleccionados.includes(servicio.idAdicional);
            return (
              <Paper
                key={servicio.idAdicional}
                variant="outlined"
                onClick={() => onCambiar(servicio.idAdicional, !marcado)}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  borderColor: marcado ? "primary.main" : undefined,
                  bgcolor: marcado ? "#EAF1F9" : "background.paper",
                }}
              >
                <Checkbox checked={marcado} onChange={(evento) => onCambiar(servicio.idAdicional, evento.target.checked)} />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{servicio.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {servicio.tipoCobro === "FIJO" ? "Precio fijo por evento" : "Precio por persona"}
                  </Typography>
                </Stack>
                <Stack sx={{ alignItems: "flex-end" }}>
                  <Typography color="primary" sx={{ fontWeight: 700 }}>
                    {formatoMoneda.format(servicio.precioUnitario)}
                    {servicio.tipoCobro === "POR_PERSONA" && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {" "}
                        x pax
                      </Typography>
                    )}
                  </Typography>
                  <Chip label={servicio.tipoCobro === "FIJO" ? "Fijo" : "Por persona"} size="small" />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
