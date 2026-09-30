import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Alert from "@mui/material/Alert";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import AccionesRespuesta from "./AccionesRespuesta";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { fechaLocalDesdeISO, formatoFecha, formatoMoneda } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";

export const dynamic = "force-dynamic";

const ETIQUETAS_ESTADO: Record<string, { texto: string; color: "info" | "warning" | "success" | "error" | "default" }> = {
  SOLICITADO: { texto: "Solicitado", color: "warning" },
  APROBADO: { texto: "Aceptado", color: "success" },
  EN_NEGOCIACION: { texto: "En negociación con nuestro equipo", color: "warning" },
  FINALIZADO: { texto: "Finalizado", color: "success" },
  CANCELADO: { texto: "Cancelado", color: "error" },
  RECHAZADA: { texto: "Rechazado", color: "error" },
  VENCIDA: { texto: "Vencido", color: "default" },
};

export default async function PaginaDetallePresupuesto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idCotizacion = Number(id);
  if (!Number.isInteger(idCotizacion)) notFound();

  const cliente = await obtenerClienteActual();
  if (!cliente) redirect("/login");

  const supabase = await createClient();
  const { data: cotizacion } = await supabase
    .from("cotizacion")
    .select("id_cotizacion, codigo, tipo_evento, fecha_evento, cantidad_pax, fecha_validez, subtotal_neto, monto_iva, monto_total, estado, motivo_rechazo")
    .eq("id_cotizacion", idCotizacion)
    .single();

  if (!cotizacion) notFound();

  const { data: detalle } = await supabase
    .from("cotizacion_detalle")
    .select("descripcion, cantidad, precio_unitario_congelado, subtotal")
    .eq("id_cotizacion", idCotizacion)
    .order("orden");

  const lineasConPrecio = (detalle ?? []).filter((linea) => linea.precio_unitario_congelado > 0);
  const serviciosSolicitados = (detalle ?? []).filter((linea) => linea.precio_unitario_congelado === 0);

  const badge = ETIQUETAS_ESTADO[cotizacion.estado] ?? { texto: cotizacion.estado, color: "default" as const };
  const puedeResponder = cotizacion.estado === "SOLICITADO";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente activo="mis-presupuestos" />
      <Box component="main" sx={{ flex: 1, maxWidth: 800, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Typography variant="body2" sx={{ color: paletaCliente.textoMuted, mb: 2 }}>
          <Link href="/mis-presupuestos" style={{ color: "inherit" }}>
            Mis Presupuestos
          </Link>{" "}
          › {cotizacion.codigo}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", mb: 3 }}>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.6rem", color: paletaCliente.textoOscuro }}>
            {cotizacion.codigo}
          </Typography>
          <Chip label={badge.texto} color={badge.color} />
        </Stack>

        <Paper variant="outlined" sx={{ p: 3, borderColor: paletaCliente.borde, borderRadius: 4, mb: 3 }}>
          <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: paletaCliente.textoMuted }}>
                Evento
              </Typography>
              <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>{cotizacion.tipo_evento}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: paletaCliente.textoMuted }}>
                Fecha del evento
              </Typography>
              <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                {formatoFecha.format(fechaLocalDesdeISO(cotizacion.fecha_evento))}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: paletaCliente.textoMuted }}>
                Comensales
              </Typography>
              <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                {cotizacion.cantidad_pax}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: paletaCliente.textoMuted }}>
                Válido hasta
              </Typography>
              <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                {formatoFecha.format(fechaLocalDesdeISO(cotizacion.fecha_validez))}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 420 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Unitario</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineasConPrecio.map((linea, indice) => (
                  <TableRow key={indice}>
                    <TableCell>{linea.descripcion}</TableCell>
                    <TableCell align="right">{linea.cantidad}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.precio_unitario_congelado)}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {serviciosSolicitados.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: paletaCliente.textoMuted, letterSpacing: 0.5 }}>
                SERVICIOS ADICIONALES SOLICITADOS
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
                {serviciosSolicitados.map((linea, indice) => (
                  <Chip key={indice} label={linea.descripcion} sx={{ bgcolor: paletaCliente.fondoClaro, color: paletaCliente.textoSecundario }} />
                ))}
              </Stack>
            </Box>
          )}

          <Stack spacing={0.5} sx={{ mt: 2, alignItems: "flex-end" }}>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                Subtotal neto
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(cotizacion.subtotal_neto)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                IVA
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(cotizacion.monto_iva)}</Typography>
            </Stack>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.4rem", color: paletaCliente.primario, mt: 1 }}>
              TOTAL {formatoMoneda.format(cotizacion.monto_total)}
            </Typography>
          </Stack>
        </Paper>

        {puedeResponder && <AccionesRespuesta idCotizacion={cotizacion.id_cotizacion} />}

        {cotizacion.estado === "APROBADO" && (
          <Alert severity="success">
            ¡Presupuesto aceptado! Nuestro equipo comercial se va a poner en contacto para coordinar los
            detalles finales.
          </Alert>
        )}
      </Box>
      <FooterCliente />
    </Box>
  );
}
