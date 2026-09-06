import { redirect } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { createClient } from "@/lib/supabase/server";
import CerrarSesionBoton from "./CerrarSesionBoton";

interface PerfilUsuario {
  nombre_completo: string;
  rol: { nombre_rol: string } | null;
}

export default async function LayoutBackofficeProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/backoffice/login");
  }

  const { data: perfil } = await supabase
    .from("usuario")
    .select("nombre_completo, rol:id_rol(nombre_rol)")
    .eq("id_usuario", userData.user.id)
    .single<PerfilUsuario>();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" component="span">
            Caminos y Sabores · Backoffice
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" component="span">
              {perfil?.nombre_completo ?? userData.user.email}
              {perfil?.rol ? ` · ${perfil.rol.nombre_rol}` : ""}
            </Typography>
            <CerrarSesionBoton />
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
}
