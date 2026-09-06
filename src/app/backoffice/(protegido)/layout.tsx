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
        {/* minWidth: 0 es necesario para que este panel pueda encogerse y
            dejar que el contenido ancho (tablas, etc.) scrollee dentro
            suyo, en vez de empujar todo el layout más allá del viewport. */}
        <Box sx={{ flex: 1, minWidth: 0, bgcolor: "background.default" }}>{children}</Box>
      </Box>
    </UsuarioActualProvider>
  );
}
