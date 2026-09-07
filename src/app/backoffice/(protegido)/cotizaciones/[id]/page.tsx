import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Chip from "@mui/material/Chip";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import BotonEnlace from "@/components/BotonEnlace";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { COLOR_ESTADO, ETIQUETA_ESTADO, type EstadoCotizacion } from "../mapeo";
import AccionesEstado from "./AccionesEstado";

interface CotizacionDetalleDb {
  id_cotizacion: number;
  codigo: string;
  fecha_emision: string;
  fecha_evento: string;
  fecha_validez: string;
  cantidad_pax: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente: string | null;
  subtotal_neto: number;
  monto_iva: number;
  monto_total: number;
  estado: EstadoCotizacion;
}

interface LineaDetalleDb {
  id_detalle: number;
  tipo_item: string;
  descripcion: string;
  cantidad: number;
  precio_unitario_congelado: number;
  subtotal: number;
  orden: number;
}

export default async function PaginaDetalleCotizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idCotizacion = Number(id);

  if (!Number.isInteger(idCotizacion)) {
    notFound();
  }

  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Gerente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: cotizacion, error }, { data: lineas }] = await Promise.all([
    supabase
      .from("cotizacion")
      .select(
        "id_cotizacion, codigo, fecha_emision, fecha_evento, fecha_validez, cantidad_pax, nombre_cliente, email_cliente, telefono_cliente, subtotal_neto, monto_iva, monto_total, estado",
      )
      .eq("id_cotizacion", idCotizacion)
      .single<CotizacionDetalleDb>(),
    supabase
      .from("cotizacion_detalle")
      .select("id_detalle, tipo_item, descripcion, cantidad, precio_unitario_congelado, subtotal, orden")
      .eq("id_cotizacion", idCotizacion)
      .order("orden")
      .returns<LineaDetalleDb[]>(),
  ]);

  if (error || !cotizacion) {
    notFound();
  }

  const puedeCambiarEstado = usuarioActual?.rol === "Gerente Comercial";

  return (
    <>
      <EncabezadoPagina titulo="Detalle de cotización" subtitulo={cotizacion.codigo} />
      <Box sx={{ p: 4 }}>
        <BotonEnlace href="/backoffice/cotizaciones" sx={{ mb: 2 }}>
          ← Cotizaciones
        </BotonEnlace>

        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h6">{cotizacion.nombre_cliente}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {cotizacion.email_cliente}
                  {cotizacion.telefono_cliente ? ` · ${cotizacion.telefono_cliente}` : ""}
                </Typography>
              </Box>
              <Chip
                label={ETIQUETA_ESTADO[cotizacion.estado]}
                color={COLOR_ESTADO[cotizacion.estado]}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={4} sx={{ mt: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Fecha de emisión
                </Typography>
                <Typography>{formatoFecha.format(new Date(cotizacion.fecha_emision))}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Fecha del evento
                </Typography>
                <Typography>{formatoFecha.format(new Date(cotizacion.fecha_evento))}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Válida hasta
                </Typography>
                <Typography>{formatoFecha.format(new Date(cotizacion.fecha_validez))}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Invitados
                </Typography>
                <Typography>{cotizacion.cantidad_pax}</Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Precio unitario</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(lineas ?? []).map((linea) => (
                  <TableRow key={linea.id_detalle}>
                    <TableCell>{linea.descripcion}</TableCell>
                    <TableCell align="right">{linea.cantidad}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.precio_unitario_congelado)}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal neto: {formatoMoneda.format(cotizacion.subtotal_neto)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  IVA: {formatoMoneda.format(cotizacion.monto_iva)}
                </Typography>
                <Typography variant="h6">Total: {formatoMoneda.format(cotizacion.monto_total)}</Typography>
              </Stack>
            </Box>
          </Paper>

          {puedeCambiarEstado && (
            <AccionesEstado idCotizacion={cotizacion.id_cotizacion} estadoActual={cotizacion.estado} />
          )}
        </Stack>
      </Box>
    </>
  );
}
