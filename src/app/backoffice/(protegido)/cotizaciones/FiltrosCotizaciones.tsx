"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { ETIQUETA_ESTADO } from "./mapeo";

export default function FiltrosCotizaciones({
  estadoActual,
  textoActual,
}: {
  estadoActual: string;
  textoActual: string;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [texto, setTexto] = useState(textoActual);

  function aplicar(estadoNuevo: string, textoNuevo: string) {
    const parametros = new URLSearchParams();
    if (estadoNuevo) parametros.set("estado", estadoNuevo);
    if (textoNuevo) parametros.set("buscar", textoNuevo);
    router.push(`/backoffice/cotizaciones${parametros.toString() ? `?${parametros}` : ""}`);
  }

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
      <TextField
        label="Buscar por código o cliente"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => evento.key === "Enter" && aplicar(estado, texto)}
        size="small"
        sx={{ minWidth: 260 }}
      />
      <TextField
        label="Estado"
        select
        value={estado}
        onChange={(evento) => {
          setEstado(evento.target.value);
          aplicar(evento.target.value, texto);
        }}
        size="small"
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">Todos</MenuItem>
        {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
          <MenuItem key={valor} value={valor}>
            {etiqueta}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="outlined" onClick={() => aplicar(estado, texto)}>
        Buscar
      </Button>
    </Stack>
  );
}
