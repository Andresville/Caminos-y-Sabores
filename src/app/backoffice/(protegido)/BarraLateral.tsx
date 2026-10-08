"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import RoomServiceOutlinedIcon from "@mui/icons-material/RoomServiceOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { createClient } from "@/lib/supabase/client";

export const ANCHO_SIDEBAR = 260;

const COLOR_FONDO = "#141B2D";
const COLOR_ACTIVO = "#219653";
const COLOR_AVATAR = "#28492F";
const COLOR_BADGE = "#E8890C";

interface ItemNav {
  etiqueta: string;
  href: string;
  icono: typeof GridViewOutlinedIcon;
  disponible: boolean;
  /** Si se omite, visible para cualquier rol autenticado. */
  roles?: string[];
}

export const ITEMS_NAV: ItemNav[] = [
  { etiqueta: "Dashboard", href: "/backoffice", icono: GridViewOutlinedIcon, disponible: true },
  { etiqueta: "Usuarios", href: "/backoffice/usuarios", icono: PeopleOutlineOutlinedIcon, disponible: true, roles: ["Administrador"] },
  { etiqueta: "Insumos", href: "/backoffice/insumos", icono: Inventory2OutlinedIcon, disponible: true },
  {
    etiqueta: "Adicionales",
    href: "/backoffice/adicionales",
    icono: RoomServiceOutlinedIcon,
    disponible: true,
    roles: ["Asistente Comercial", "Administrador"],
  },
  { etiqueta: "Recetas", href: "/backoffice/recetas", icono: RestaurantOutlinedIcon, disponible: true },
  {
    etiqueta: "Menú",
    href: "/backoffice/menus",
    icono: DescriptionOutlinedIcon,
    disponible: true,
    roles: ["Ayudante de cocina", "Asistente Comercial", "Administrador"],
  },
  {
    etiqueta: "Eventos",
    href: "/backoffice/eventos",
    icono: EventOutlinedIcon,
    disponible: true,
    roles: ["Asistente Comercial", "Administrador"],
  },
  {
    etiqueta: "Compras",
    href: "/backoffice/compras",
    icono: ShoppingCartOutlinedIcon,
    disponible: true,
    roles: ["Asistente Comercial", "Administrador"],
  },
  {
    etiqueta: "Clientes",
    href: "/backoffice/clientes",
    icono: BadgeOutlinedIcon,
    disponible: true,
    roles: ["Asistente Comercial", "Administrador"],
  },
  {
    etiqueta: "Presupuestos",
    href: "/backoffice/cotizaciones",
    icono: MailOutlineOutlinedIcon,
    disponible: true,
    roles: ["Asistente Comercial", "Administrador"],
  },
];

export default function BarraLateral({ solicitudesPendientes }: { solicitudesPendientes: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { rol } = useUsuarioActual();

  const items = ITEMS_NAV.filter((item) => !item.roles || item.roles.includes(rol));

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
        bgcolor: COLOR_FONDO,
        color: "common.white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        py: 3,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 3, mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: COLOR_AVATAR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontFamily: "Georgia, serif",
          }}
        >
          S
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Sabores &amp; Eventos</Typography>
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            Gestión Interna
          </Typography>
        </Box>
      </Stack>

      <List sx={{ px: 1.5, flex: 1 }}>
        {items.map((item) => {
          const activo =
            pathname === item.href || (item.href !== "/backoffice" && pathname.startsWith(item.href));
          const Icono = item.icono;
          const mostrarBadge = item.etiqueta === "Presupuestos" && solicitudesPendientes > 0;
          return (
            <ListItemButton
              key={item.href}
              component={item.disponible ? Link : "div"}
              href={item.disponible ? item.href : undefined}
              disabled={!item.disponible}
              selected={activo}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "grey.300",
                "&.Mui-selected": { bgcolor: COLOR_ACTIVO, color: "common.white" },
                "&.Mui-selected:hover": { bgcolor: COLOR_ACTIVO },
                "&.Mui-disabled": { color: "grey.600", opacity: 1 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                <Icono fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.etiqueta + (item.disponible ? "" : " (próximamente)")}
                slotProps={{ primary: { sx: { fontSize: 14 } } }}
              />
              {mostrarBadge && (
                <Box
                  sx={{
                    bgcolor: COLOR_BADGE,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 999,
                    minWidth: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.5,
                  }}
                >
                  {solicitudesPendientes}
                </Box>
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 1 }} />
      <List sx={{ px: 1.5 }}>
        <ListItemButton onClick={cerrarSesion} sx={{ borderRadius: 2, color: "grey.300" }}>
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cerrar sesión" slotProps={{ primary: { sx: { fontSize: 14 } } }} />
        </ListItemButton>
      </List>
    </Box>
  );
}
