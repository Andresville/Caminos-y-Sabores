import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import DashboardCompras from "./dashboard/DashboardCompras";
import DashboardChef from "./dashboard/DashboardChef";
import DashboardComercial from "./dashboard/DashboardComercial";
import DashboardAdministrador from "./dashboard/DashboardAdministrador";

export default async function PaginaInicioBackoffice() {
  const usuarioActual = await obtenerUsuarioActual();

  return (
    <>
      <EncabezadoPagina titulo="Dashboard" subtitulo="Resumen general del sistema" />
      <Box sx={{ p: 4 }}>
        {usuarioActual?.rol === "Jefe de Compras" && <DashboardCompras />}
        {usuarioActual?.rol === "Chef Principal" && <DashboardChef />}
        {usuarioActual?.rol === "Gerente Comercial" && <DashboardComercial />}
        {usuarioActual?.rol === "Administrador" && <DashboardAdministrador />}
        {!usuarioActual && <Typography color="text.secondary">No se pudo determinar el rol del usuario.</Typography>}
      </Box>
    </>
  );
}
