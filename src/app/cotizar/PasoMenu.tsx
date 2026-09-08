"use client";

import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { formatoMoneda } from "@/lib/formato";
import type { MenuPublico } from "@/lib/cotizador/datos";

export default function PasoMenu({
  menus,
  pax,
  idMenuSeleccionado,
  onSeleccionar,
  mensajeError,
}: {
  menus: MenuPublico[];
  pax: number;
  idMenuSeleccionado: number | null;
  onSeleccionar: (idMenu: number) => void;
  mensajeError: string | null;
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Elegí tu menú
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Los precios ya están calculados para {pax} invitados.
      </Typography>

      {mensajeError && <Alert severity="warning">{mensajeError}</Alert>}

      {menus.length === 0 ? (
        <Typography color="text.secondary">No hay menús disponibles en este momento.</Typography>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexWrap: "wrap" }}>
          {menus.map((menu) => {
            const seleccionado = menu.idMenu === idMenuSeleccionado;
            return (
              <Paper
                key={menu.idMenu}
                variant="outlined"
                sx={{
                  p: 2.5,
                  flex: "1 1 240px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  borderColor: seleccionado ? "primary.main" : undefined,
                  borderWidth: seleccionado ? 2 : 1,
                  bgcolor: seleccionado ? "#EAF1F9" : "background.paper",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>{menu.nombre}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {menu.composicion.join(" + ")}
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
                  {formatoMoneda.format(menu.precioPorPersona)}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" "}
                    /persona
                  </Typography>
                </Typography>
                <Button
                  variant={seleccionado ? "contained" : "outlined"}
                  onClick={() => onSeleccionar(menu.idMenu)}
                  sx={{ mt: "auto" }}
                >
                  {seleccionado ? "Seleccionado" : "Elegir este"}
                </Button>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
