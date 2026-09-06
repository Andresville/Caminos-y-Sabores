"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

export default function EncabezadoPagina({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  const { nombreCompleto, rol } = useUsuarioActual();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 4,
        py: 2.5,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {titulo}
        </Typography>
        {subtitulo && (
          <Typography variant="body2" color="text.secondary">
            {subtitulo}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {nombreCompleto}
          </Typography>
          {rol && (
            <Typography variant="caption" color="primary" sx={{ lineHeight: 1.2, display: "block" }}>
              {rol}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: "grey.300", color: "text.primary", width: 40, height: 40 }}>
          {iniciales(nombreCompleto)}
        </Avatar>
      </Box>
    </Box>
  );
}
