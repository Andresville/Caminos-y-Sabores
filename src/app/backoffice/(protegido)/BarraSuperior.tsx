"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { ITEMS_NAV } from "./BarraLateral";

export default function BarraSuperior() {
  const pathname = usePathname();
  const { nombreCompleto, rol } = useUsuarioActual();

  const actual = ITEMS_NAV.find(
    (item) => pathname === item.href || (item.href !== "/backoffice" && pathname.startsWith(item.href)),
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 4,
        py: 2,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        <Link href="/backoffice" style={{ color: "inherit", textDecoration: "none" }}>
          Inicio
        </Link>
        {actual && actual.href !== "/backoffice" && <> / {actual.etiqueta}</>}
      </Typography>

      <Box sx={{ textAlign: "right" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {nombreCompleto}
        </Typography>
        {rol && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: "block" }}>
            {rol}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
