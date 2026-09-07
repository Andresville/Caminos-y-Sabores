"use client";

import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { COLOR_ESTADO, ETIQUETA_ESTADO, type EstadoCotizacion } from "./mapeo";

export interface FilaCotizacion {
  id_cotizacion: number;
  codigo: string;
  fecha_emision: string;
  fecha_evento: string;
  fecha_validez: string;
  cantidad_pax: number;
  nombre_cliente: string;
  monto_total: number;
  estado: EstadoCotizacion;
}

export default function TablaCotizaciones({ cotizaciones }: { cotizaciones: FilaCotizacion[] }) {
  if (cotizaciones.length === 0) {
    return <Typography color="text.secondary">No hay cotizaciones que coincidan con el filtro.</Typography>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        overflowX: "auto",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { height: 10 },
        "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 5 },
      }}
    >
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Emisión</TableCell>
            <TableCell>Evento</TableCell>
            <TableCell align="right">Pax</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cotizaciones.map((cotizacion, indice) => (
            <TableRow
              key={cotizacion.id_cotizacion}
              hover
              sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
            >
              <TableCell>{cotizacion.codigo}</TableCell>
              <TableCell>{cotizacion.nombre_cliente}</TableCell>
              <TableCell>{formatoFecha.format(new Date(cotizacion.fecha_emision))}</TableCell>
              <TableCell>{formatoFecha.format(new Date(cotizacion.fecha_evento))}</TableCell>
              <TableCell align="right">{cotizacion.cantidad_pax}</TableCell>
              <TableCell align="right">{formatoMoneda.format(cotizacion.monto_total)}</TableCell>
              <TableCell>
                <Chip
                  label={ETIQUETA_ESTADO[cotizacion.estado]}
                  color={COLOR_ESTADO[cotizacion.estado]}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Link
                  component={NextLink}
                  href={`/backoffice/cotizaciones/${cotizacion.id_cotizacion}`}
                  underline="hover"
                >
                  Ver detalle
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
