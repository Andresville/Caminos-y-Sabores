"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { createClient } from "@/lib/supabase/client";

export const ANCHO_SIDEBAR = 260;

interface ItemNav {
  etiqueta: string;
  href: string;
  disponible: boolean;
  /** Si se omite, visible para cualquier rol autenticado. */
  roles?: string[];
}

const ITEMS: ItemNav[] = [
  { etiqueta: "Dashboard", href: "/backoffice", disponible: true },
  { etiqueta: "Materias primas", href: "/backoffice/insumos", disponible: true },
  { etiqueta: "Recetas", href: "/backoffice/recetas", disponible: true },
  { etiqueta: "Menús", href: "/backoffice/menus", disponible: false },
  { etiqueta: "Adicionales", href: "/backoffice/adicionales", disponible: false },
  {
    etiqueta: "Cotizaciones",
    href: "/backoffice/cotizaciones",
    disponible: false,
    roles: ["Gerente Comercial", "Administrador"],
  },
  { etiqueta: "Usuarios", href: "/backoffice/usuarios", disponible: false, roles: ["Administrador"] },
  {
    etiqueta: "Auditoría",
    href: "/backoffice/auditoria",
    disponible: false,
    roles: ["Gerente Comercial", "Administrador"],
  },
];

export default function BarraLateral() {
  const pathname = usePathname();
  const router = useRouter();
  const { rol } = useUsuarioActual();

  const items = ITEMS.filter((item) => !item.roles || item.roles.includes(rol));

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/backoffice/login");
    router.refresh();
  }

  return (
    <Box
      component="nav"
      sx={{
        width: ANCHO_SIDEBAR,
        flexShrink: 0,
        bgcolor: "#39424C",
        color: "common.white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        py: 3,
      }}
    >
      <Box sx={{ px: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
          Caminos y Sabores
        </Typography>
        <Typography variant="caption" sx={{ color: "grey.500" }}>
          BACKOFFICE
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 2 }} />

      <List sx={{ px: 1.5, flex: 1 }}>
        {items.map((item) => {
          const activo =
            pathname === item.href || (item.href !== "/backoffice" && pathname.startsWith(item.href));
          return (
            <ListItemButton
              key={item.href}
              component={item.disponible ? Link : "div"}
              href={item.disponible ? item.href : undefined}
              disabled={!item.disponible}
              selected={activo}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: "grey.300",
                "&.Mui-selected": { bgcolor: "primary.main", color: "common.white" },
                "&.Mui-selected:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { color: "grey.600", opacity: 1 },
              }}
            >
              <ListItemText
                primary={item.etiqueta + (item.disponible ? "" : " (próximamente)")}
                slotProps={{ primary: { sx: { fontSize: 14 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />
      <List sx={{ px: 1.5 }}>
        <ListItemButton onClick={cerrarSesion} sx={{ borderRadius: 1, color: "grey.300" }}>
          <ListItemText primary="Cerrar sesión" slotProps={{ primary: { sx: { fontSize: 14 } } }} />
        </ListItemButton>
      </List>
    </Box>
  );
}
