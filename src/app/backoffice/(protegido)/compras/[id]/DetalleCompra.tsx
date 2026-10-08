"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { OPCIONES_ESTADO_INSUMO, COLOR_ESTADO_INSUMO, type EstadoInsumoCompra } from "../../eventos/mapeo";
import { marcarEstadoInsumoEvento } from "../../eventos/actions";

const COLOR_ACCION = "#219653";

export interface CompraDetalle {
  id_evento: number;
  cotizacion: { tipo_evento: string; fecha_evento: string };
}

export interface InsumoCompra {
  id_evento_insumo: number;
  cantidad_necesaria: number;
  costo_estimado: number;
  estado: EstadoInsumoCompra;
  orden: number;
  materia_prima: { nombre: string; unidad_compra: { simbolo: string } };
}

export default function DetalleCompra({ evento, insumos }: { evento: CompraDetalle; insumos: InsumoCompra[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const totalInsumos = insumos.length;
  const compradosCount = insumos.filter((i) => i.estado === "COMPRADO").length;
  const enCaminoCount = insumos.filter((i) => i.estado === "EN_CAMINO").length;
  const pendientesCount = insumos.filter((i) => i.estado === "PENDIENTE").length;
  const costoEstimadoTotal = insumos.reduce((acumulado, i) => acumulado + i.costo_estimado, 0);

  function cambiarEstadoInsumo(idEventoInsumo: number, nuevoEstado: EstadoInsumoCompra) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await marcarEstadoInsumoEvento(idEventoInsumo, evento.id_evento, nuevoEstado);
      if (resultado.error) setError(resultado.error);
      else router.refresh();
    });
  }

  return (
    <Box sx={{ p: 4 }}>
      <Link href="/backoffice/compras" style={{ textDecoration: "none", color: "inherit" }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 2, color: "text.secondary" }}>
          <ArrowBackIcon fontSize="small" />
          <Typography>Volver</Typography>
        </Stack>
      </Link>

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
            Lista de compras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {evento.cotizacion.tipo_evento} — {formatoFecha.format(new Date(evento.cotizacion.fecha_evento))}
          </Typography>
        </Box>
        <Button
          variant="contained"
          component="a"
          href={`/backoffice/eventos/${evento.id_evento}/pdf`}
          target="_blank"
          startIcon={<DescriptionOutlinedIcon />}
          sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
        >
          Exportar PDF
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            overflowX: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: 10 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 5 },
          }}
        >
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>INSUMO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>CANTIDAD</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PRECIO UNIT.
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  COSTO ESTIMADO
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {insumos.map((insumo) => {
                const precioUnitario = insumo.cantidad_necesaria > 0 ? insumo.costo_estimado / insumo.cantidad_necesaria : 0;
                return (
                  <TableRow key={insumo.id_evento_insumo} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{insumo.materia_prima.nombre}</TableCell>
                    <TableCell>
                      {insumo.cantidad_necesaria} {insumo.materia_prima.unidad_compra.simbolo}
                    </TableCell>
                    <TableCell align="right">{formatoMoneda.format(precioUnitario)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatoMoneda.format(insumo.costo_estimado)}
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={insumo.estado}
                        disabled={pendiente}
                        onChange={(e) => cambiarEstadoInsumo(insumo.id_evento_insumo, e.target.value as EstadoInsumoCompra)}
                        sx={{
                          minWidth: 140,
                          "& .MuiOutlinedInput-root": {
                            bgcolor: COLOR_ESTADO_INSUMO[insumo.estado].bg,
                            color: COLOR_ESTADO_INSUMO[insumo.estado].fg,
                            fontWeight: 700,
                          },
                        }}
                      >
                        {OPCIONES_ESTADO_INSUMO.map((opcion) => (
                          <MenuItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Resumen
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary">Total insumos</Typography>
              <Typography sx={{ fontWeight: 600 }}>{totalInsumos}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary">Comprados</Typography>
              <Typography sx={{ fontWeight: 600, color: COLOR_ESTADO_INSUMO.COMPRADO.fg }}>{compradosCount}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary">En camino</Typography>
              <Typography sx={{ fontWeight: 600, color: COLOR_ESTADO_INSUMO.EN_CAMINO.fg }}>{enCaminoCount}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary">Pendientes</Typography>
              <Typography sx={{ fontWeight: 600, color: COLOR_ESTADO_INSUMO.PENDIENTE.fg }}>{pendientesCount}</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Typography sx={{ fontWeight: 700 }}>Costo estimado</Typography>
            <Typography sx={{ fontWeight: 700, color: COLOR_ACCION }}>{formatoMoneda.format(costoEstimadoTotal)}</Typography>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
