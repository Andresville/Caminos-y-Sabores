import { redirect } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";

export const dynamic = "force-dynamic";

const ETIQUETAS_ESTADO: Record<string, { texto: string; color: "info" | "warning" | "success" | "error" | "default" }> = {
  EMITIDA: { texto: "En revisión", color: "info" },
  EN_NEGOCIACION: { texto: "Pendiente de tu respuesta", color: "warning" },
  CONFIRMADA: { texto: "Aceptado", color: "success" },
  RECHAZADA: { texto: "Rechazado", color: "error" },
  VENCIDA: { texto: "Vencido", color: "default" },
  EJECUTADA: { texto: "Ejecutado", color: "success" },
};

export default async function PaginaMisPresupuestos() {
  const cliente = await obtenerClienteActual();
  if (!cliente) redirect("/login");

  const supabase = await createClient();
  const { data: cotizaciones } = await supabase
    .from("cotizacion")
    .select("id_cotizacion, codigo, tipo_evento, fecha_evento, monto_total, estado, fecha_validez")
    .order("fecha_emision", { ascending: false });

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente activo="mis-presupuestos" />
      <Box component="main" sx={{ flex: 1, maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.75rem", color: paletaCliente.textoOscuro }}>
            Mis Presupuestos
          </Typography>
          <Button
            component={Link}
            href="/"
            variant="outlined"
            sx={{ borderColor: paletaCliente.primario, color: paletaCliente.primario }}
          >
            Solicitar nuevo presupuesto
          </Button>
        </Stack>

        {!cotizaciones || cotizaciones.length === 0 ? (
          <Typography sx={{ color: paletaCliente.textoTerciario, textAlign: "center", py: 6 }}>
            Todavía no generaste ningún presupuesto.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {cotizaciones.map((cotizacion) => {
              const badge = ETIQUETAS_ESTADO[cotizacion.estado] ?? { texto: cotizacion.estado, color: "default" as const };
              return (
                <Link key={cotizacion.id_cotizacion} href={`/mis-presupuestos/${cotizacion.id_cotizacion}`} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      bgcolor: "white",
                      border: `1px solid ${paletaCliente.borde}`,
                      borderRadius: 3,
                      p: 2.5,
                      "&:hover": { boxShadow: 2 },
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro }}>
                        {cotizacion.codigo}
                      </Typography>
                      <Chip label={badge.texto} color={badge.color} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", color: paletaCliente.textoTerciario, fontSize: 14 }}>
                      <span>{cotizacion.tipo_evento}</span>
                      <span>{formatoFecha.format(new Date(cotizacion.fecha_evento))}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 700, color: paletaCliente.textoOscuro }}>
                        {formatoMoneda.format(cotizacion.monto_total)}
                      </span>
                    </Stack>
                  </Box>
                </Link>
              );
            })}
          </Stack>
        )}
      </Box>
      <FooterCliente />
    </Box>
  );
}
