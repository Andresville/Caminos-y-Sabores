import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import TablaCotizaciones, { type FilaCotizacion } from "./TablaCotizaciones";
import FiltrosCotizaciones from "./FiltrosCotizaciones";
import type { EstadoCotizacion } from "./mapeo";

export default async function PaginaCotizaciones({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; buscar?: string }>;
}) {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Gerente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const { estado, buscar } = await searchParams;

  const supabase = await createClient();

  let consulta = supabase
    .from("cotizacion")
    .select(
      "id_cotizacion, codigo, fecha_emision, fecha_evento, fecha_validez, cantidad_pax, nombre_cliente, monto_total, estado",
    )
    .order("fecha_emision", { ascending: false });

  if (estado) {
    consulta = consulta.eq("estado", estado as EstadoCotizacion);
  }
  if (buscar) {
    consulta = consulta.or(`codigo.ilike.%${buscar}%,nombre_cliente.ilike.%${buscar}%`);
  }

  const { data: cotizaciones, error } = await consulta.returns<FilaCotizacion[]>();

  return (
    <>
      <EncabezadoPagina titulo="Cotizaciones" subtitulo="Seguimiento comercial de presupuestos emitidos" />
      <Box sx={{ p: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            No se pudo cargar el listado: {error.message}
          </Typography>
        )}
        <FiltrosCotizaciones estadoActual={estado ?? ""} textoActual={buscar ?? ""} />
        <TablaCotizaciones cotizaciones={cotizaciones ?? []} />
      </Box>
    </>
  );
}
