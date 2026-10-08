import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { SvgIconComponent } from "@mui/icons-material";

export default function TarjetaEstadistica({
  etiqueta,
  valor,
  severidad = "neutro",
  icono: Icono,
  href,
  sx,
}: {
  etiqueta: string;
  valor: string | number;
  severidad?: "neutro" | "success" | "warning" | "error";
  icono?: SvgIconComponent;
  href?: string;
  sx?: SxProps<Theme>;
}) {
  const color = severidad === "neutro" ? "text.primary" : `${severidad}.main`;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, minWidth: 200, flex: "1 1 200px", ...sx }}>
      <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Typography variant="overline" color="text.secondary">
          {etiqueta}
        </Typography>
        {Icono && (
          <Stack
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: "action.hover",
              color: "text.secondary",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icono fontSize="small" />
          </Stack>
        )}
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>
        {valor}
      </Typography>
      {href && (
        <Link href={href} style={{ textDecoration: "none" }}>
          <Typography variant="body2" sx={{ color: "primary.main", mt: 0.5 }}>
            Ver listado →
          </Typography>
        </Link>
      )}
    </Paper>
  );
}
