import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import { UsuarioActualProvider } from "@/lib/usuario-actual/UsuarioActualProvider";
import BarraLateral from "./BarraLateral";
import BarraSuperior from "./BarraSuperior";

export default async function LayoutBackofficeProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuarioActual = await obtenerUsuarioActual();

  if (!usuarioActual) {
    // Cubre tanto "nunca inició sesión" como "la cuenta se desactivó o
    // bloqueó mientras la sesión seguía abierta": en ambos casos, si
    // quedaba una sesión de Supabase Auth viva, se cierra acá.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/backoffice/login");
  }

  let solicitudesPendientes = 0;
  if (usuarioActual.rol === "Asistente Comercial" || usuarioActual.rol === "Administrador") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("cotizacion")
      .select("id_cotizacion", { count: "exact", head: true })
      .eq("estado", "SOLICITADO");
    solicitudesPendientes = count ?? 0;
  }

  return (
    <UsuarioActualProvider value={usuarioActual}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <BarraLateral solicitudesPendientes={solicitudesPendientes} />
        {/* minWidth: 0 es necesario para que este panel pueda encogerse y
            dejar que el contenido ancho (tablas, etc.) scrollee dentro
            suyo, en vez de empujar todo el layout más allá del viewport. */}
        <Box sx={{ flex: 1, minWidth: 0, bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
          <BarraSuperior />
          <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        </Box>
      </Box>
    </UsuarioActualProvider>
  );
}
