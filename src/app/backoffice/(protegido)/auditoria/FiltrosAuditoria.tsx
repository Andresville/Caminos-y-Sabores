"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { ENTIDADES_AUDITADAS } from "./mapeo";

export default function FiltrosAuditoria({
  entidadActual,
  desdeActual,
  hastaActual,
}: {
  entidadActual: string;
  desdeActual: string;
  hastaActual: string;
}) {
  const router = useRouter();
  const [entidad, setEntidad] = useState(entidadActual);
  const [desde, setDesde] = useState(desdeActual);
  const [hasta, setHasta] = useState(hastaActual);

  function aplicar(entidadNueva: string, desdeNueva: string, hastaNueva: string) {
    const parametros = new URLSearchParams();
    if (entidadNueva) parametros.set("entidad", entidadNueva);
    if (desdeNueva) parametros.set("desde", desdeNueva);
    if (hastaNueva) parametros.set("hasta", hastaNueva);
    router.push(`/backoffice/auditoria${parametros.toString() ? `?${parametros}` : ""}`);
  }

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
      <TextField
        label="Entidad"
        select
        value={entidad}
        onChange={(evento) => {
          setEntidad(evento.target.value);
          aplicar(evento.target.value, desde, hasta);
        }}
        size="small"
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">Todas</MenuItem>
        {ENTIDADES_AUDITADAS.map((e) => (
          <MenuItem key={e.value} value={e.value}>
            {e.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Desde"
        type="date"
        value={desde}
        onChange={(evento) => setDesde(evento.target.value)}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Hasta"
        type="date"
        value={hasta}
        onChange={(evento) => setHasta(evento.target.value)}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button variant="outlined" onClick={() => aplicar(entidad, desde, hasta)}>
        Buscar
      </Button>
    </Stack>
  );
}
