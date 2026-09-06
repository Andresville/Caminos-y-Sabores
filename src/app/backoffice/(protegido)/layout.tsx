import { redirect } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import { UsuarioActualProvider } from "@/lib/usuario-actual/UsuarioActualProvider";
import CerrarSesionBoton from "./CerrarSesionBoton";

export default async function LayoutBackofficeProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuarioActual = await obtenerUsuarioActual();

  if (!usuarioActual) {
    redirect("/backoffice/login");
  }

  return (
    <UsuarioActualProvider value={usuarioActual}>
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
        <AppBar position="static">
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" component="span">
              Caminos y Sabores · Backoffice
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" component="span">
                {usuarioActual.nombreCompleto}
                {usuarioActual.rol ? ` · ${usuarioActual.rol}` : ""}
              </Typography>
              <CerrarSesionBoton />
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </UsuarioActualProvider>
  );
}
