import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaUsuarios, { type FilaUsuario, type RolDisponible } from "./TablaUsuarios";

export default async function PaginaUsuarios() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: usuarios, error }, { data: roles }] = await Promise.all([
    supabase
      .from("usuario")
      .select("id_usuario, nombre_completo, email, id_rol, estado, ultimo_acceso, rol:id_rol ( nombre_rol )")
      .order("nombre_completo")
      .returns<FilaUsuario[]>(),
    supabase
      .from("rol")
      .select("id_rol, nombre_rol")
      .neq("nombre_rol", "Usuario Público")
      .order("nombre_rol")
      .returns<RolDisponible[]>(),
  ]);

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" subtitulo="Cuentas del backoffice y sus roles" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <TablaUsuarios usuarios={usuarios ?? []} roles={roles ?? []} />
      </Box>
    </>
  );
}
