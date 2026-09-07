import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaAuditoria, { type FilaAuditoria } from "./TablaAuditoria";
import FiltrosAuditoria from "./FiltrosAuditoria";

export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string; desde?: string; hasta?: string }>;
}) {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Gerente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const { entidad, desde, hasta } = await searchParams;

  const supabase = await createClient();

  const { data: registros, error } = await supabase.rpc("obtener_auditoria", {
    p_entidad: entidad || null,
    p_desde: desde ? new Date(desde).toISOString() : null,
    p_hasta: hasta ? new Date(hasta + "T23:59:59").toISOString() : null,
  });

  return (
    <>
      <EncabezadoPagina titulo="Auditoría" subtitulo="Registro de cambios sobre entidades sensibles" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el registro: {error.message}
          </Typography>
        )}
        <FiltrosAuditoria entidadActual={entidad ?? ""} desdeActual={desde ?? ""} hastaActual={hasta ?? ""} />
        <TablaAuditoria registros={(registros ?? []) as FilaAuditoria[]} />
      </Box>
    </>
  );
}
