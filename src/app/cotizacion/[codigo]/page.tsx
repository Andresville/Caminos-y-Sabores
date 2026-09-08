import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import BarraPortal from "@/components/portal/BarraPortal";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { obtenerCotizacionPorCodigo } from "@/lib/cotizador/consulta";

const ETIQUETAS_ESTADO: Record<string, { texto: string; color: "info" | "warning" | "success" | "error" | "default" }> = {
  EMITIDA: { texto: "Emitida", color: "info" },
  EN_NEGOCIACION: { texto: "En negociación", color: "warning" },
  CONFIRMADA: { texto: "Confirmada", color: "success" },
  RECHAZADA: { texto: "Rechazada", color: "error" },
  VENCIDA: { texto: "Vencida", color: "default" },
  EJECUTADA: { texto: "Ejecutada", color: "success" },
};

export default async function PaginaConsultaCotizacion({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const cotizacion = await obtenerCotizacionPorCodigo(codigo);

  if (!cotizacion) notFound();

  const estado = ETIQUETAS_ESTADO[cotizacion.estado] ?? { texto: cotizacion.estado, color: "default" as const };

  return (
    <>
      <BarraPortal mostrarNavegacion={false} />
      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Presupuesto {cotizacion.codigo}
          </Typography>
          <Chip label={estado.texto} color={estado.color} />
        </Stack>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={1}>
            <Typography color="text.secondary">
              Emitido el {formatoFecha.format(new Date(cotizacion.fechaEmision))} · Válido hasta el{" "}
              {formatoFecha.format(new Date(cotizacion.fechaValidez))}
            </Typography>
            <Typography color="text.secondary">
              {cotizacion.tipoEvento} · {cotizacion.cantidadPax} invitados
            </Typography>
          </Stack>

          <Box sx={{ overflowX: "auto", mt: 3 }}>
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
                {cotizacion.lineas.map((linea, indice) => (
                  <TableRow key={indice}>
                    <TableCell>{linea.descripcion}</TableCell>
                    <TableCell align="right">{linea.cantidad}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.precioUnitario)}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack spacing={0.5} sx={{ mt: 2, alignItems: "flex-end" }}>
            <Stack direction="row" spacing={2}>
              <Typography color="text.secondary">Subtotal neto</Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(cotizacion.subtotalNeto)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography color="text.secondary">IVA</Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(cotizacion.montoIva)}</Typography>
            </Stack>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mt: 1 }}>
              TOTAL {formatoMoneda.format(cotizacion.montoTotal)}
            </Typography>
          </Stack>
        </Paper>

        <Button href={`/cotizacion/${cotizacion.codigo}/pdf`} variant="contained" size="large" target="_blank">
          Descargar PDF
        </Button>
      </Container>
    </>
  );
}
