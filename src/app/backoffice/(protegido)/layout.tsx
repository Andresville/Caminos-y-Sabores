import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import { UsuarioActualProvider } from "@/lib/usuario-actual/UsuarioActualProvider";
import BarraLateral from "./BarraLateral";

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
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <BarraLateral />
        <Box sx={{ flex: 1, bgcolor: "background.default" }}>{children}</Box>
      </Box>
    </UsuarioActualProvider>
  );
}
