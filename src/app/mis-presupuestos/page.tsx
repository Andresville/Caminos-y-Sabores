import { redirect } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { createClient } from "@/lib/supabase/server";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";
import ListaPresupuestos, { type FilaPresupuesto } from "./ListaPresupuestos";

export const dynamic = "force-dynamic";

export default async function PaginaMisPresupuestos() {
  const cliente = await obtenerClienteActual();
  if (!cliente) redirect("/login");

  const supabase = await createClient();
  const { data: cotizaciones } = await supabase
    .from("cotizacion")
    .select("id_cotizacion, tipo_evento, fecha_evento, cantidad_pax, estado, fecha_validez, cotizacion_detalle(count)")
    .order("fecha_emision", { ascending: false })
    .returns<
      {
        id_cotizacion: number;
        tipo_evento: string;
        fecha_evento: string;
        cantidad_pax: number;
        estado: string;
        fecha_validez: string;
        cotizacion_detalle: { count: number }[];
      }[]
    >();

  const filas: FilaPresupuesto[] = (cotizaciones ?? []).map((cotizacion) => ({
    idCotizacion: cotizacion.id_cotizacion,
    nombreEvento: cotizacion.tipo_evento,
    fechaEvento: cotizacion.fecha_evento,
    cantidadPax: cotizacion.cantidad_pax,
    cantidadItems: cotizacion.cotizacion_detalle[0]?.count ?? 0,
    estado: cotizacion.estado,
    fechaValidez: cotizacion.fecha_validez,
  }));

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente activo="mis-presupuestos" />
      <Box component="main" sx={{ flex: 1, maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.75rem", color: paletaCliente.textoOscuro }}>
            Mis Presupuestos
          </Typography>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="outlined" sx={{ borderColor: paletaCliente.primario, color: paletaCliente.primario }}>
              Solicitar nuevo presupuesto
            </Button>
          </Link>
        </Stack>

        {filas.length === 0 ? (
          <Typography sx={{ color: paletaCliente.textoTerciario, textAlign: "center", py: 6 }}>
            Todavía no generaste ningún presupuesto.
          </Typography>
        ) : (
          <ListaPresupuestos filas={filas} />
        )}
      </Box>
      <FooterCliente />
    </Box>
  );
}
