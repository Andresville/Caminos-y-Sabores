import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import DashboardChef from "./dashboard/DashboardChef";
import DashboardComercial from "./dashboard/DashboardComercial";
import DashboardAdministrador from "./dashboard/DashboardAdministrador";

export default async function PaginaInicioBackoffice() {
  const usuarioActual = await obtenerUsuarioActual();

  return (
    <Box sx={{ p: 4 }}>
      {usuarioActual?.rol === "Ayudante de cocina" && <DashboardChef />}
      {usuarioActual?.rol === "Asistente Comercial" && <DashboardComercial />}
      {usuarioActual?.rol === "Administrador" && <DashboardAdministrador />}
      {!usuarioActual && <Typography color="text.secondary">No se pudo determinar el rol del usuario.</Typography>}
    </Box>
  );
}
