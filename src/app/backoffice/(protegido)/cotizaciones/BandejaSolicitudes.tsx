"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { formatoFecha, formatoMoneda, formatoRelativo } from "@/lib/formato";
import { ETIQUETA_ESTADO, COLOR_ESTADO, TRANSICIONES_MANUALES, type EstadoCotizacion } from "./mapeo";
import { cambiarEstadoCotizacion } from "./actions";

const COLOR_ACCION = "#219653";

export interface FilaSolicitud {
  id_cotizacion: number;
  codigo: string;
  tipo_evento: string;
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
  descuento_pct: number;
  estado: EstadoCotizacion;
  motivo_rechazo: string | null;
}

export interface LineaSolicitud {
  id_detalle: number;
  id_cotizacion: number;
  descripcion: string;
  cantidad: number;
  precio_unitario_congelado: number;
  subtotal: number;
  orden: number;
}

const MUESTRA_DATOS_CLIENTE: EstadoCotizacion[] = ["SOLICITADO", "EN_NEGOCIACION"];

export default function BandejaSolicitudes({
  solicitudes,
  lineas,
  ivaPct,
  redondeo,
}: {
  solicitudes: FilaSolicitud[];
  lineas: LineaSolicitud[];
  ivaPct: number;
  redondeo: number;
}) {
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(solicitudes[0]?.id_cotizacion ?? null);
  const cantidadNuevas = solicitudes.filter((s) => s.estado === "SOLICITADO").length;

  const seleccionada = solicitudes.find((s) => s.id_cotizacion === seleccionadaId) ?? null;
  const lineasSeleccionada = lineas.filter((l) => l.id_cotizacion === seleccionadaId).sort((a, b) => a.orden - b.orden);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Presupuestos / Bandeja
        </Typography>
        {cantidadNuevas > 0 && (
          <Chip
            label={`${cantidadNuevas} nueva${cantidadNuevas === 1 ? "" : "s"}`}
            size="small"
            sx={{ bgcolor: COLOR_ACCION, color: "white", fontWeight: 700 }}
          />
        )}
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Stack spacing={2} sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0 }}>
          {solicitudes.length === 0 ? (
            <Typography color="text.secondary">Todavía no hay solicitudes.</Typography>
          ) : (
            solicitudes.map((solicitud) => {
              const lineasDeEsta = lineas.filter((l) => l.id_cotizacion === solicitud.id_cotizacion);
              const subtitulo =
                solicitud.motivo_rechazo && (solicitud.estado === "RECHAZADA" || solicitud.estado === "CANCELADO")
                  ? solicitud.motivo_rechazo
                  : lineasDeEsta.map((l) => l.descripcion).join(", ");
              const activa = solicitud.id_cotizacion === seleccionadaId;

              return (
                <Paper
                  key={solicitud.id_cotizacion}
                  variant="outlined"
                  onClick={() => setSeleccionadaId(solicitud.id_cotizacion)}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    borderColor: activa ? COLOR_ACCION : "divider",
                    borderWidth: activa ? 2 : 1,
                    bgcolor: activa ? "#F3FBF6" : "background.paper",
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{solicitud.tipo_evento}</Typography>
                    <Chip
                      label={ETIQUETA_ESTADO[solicitud.estado]}
                      color={COLOR_ESTADO[solicitud.estado]}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Fecha: {formatoFecha.format(new Date(solicitud.fecha_evento))} · Comensales: {solicitud.cantidad_pax}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                    {subtitulo || "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {formatoRelativo(new Date(solicitud.fecha_emision))}
                  </Typography>
                </Paper>
              );
            })
          )}
        </Stack>

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {seleccionada ? (
            <DetalleSolicitud
              key={seleccionada.id_cotizacion}
              solicitud={seleccionada}
              lineas={lineasSeleccionada}
              ivaPct={ivaPct}
              redondeo={redondeo}
            />
          ) : (
            <Typography color="text.secondary">Seleccioná una solicitud para ver el detalle.</Typography>
          )}
        </Box>
      </Stack>
    </>
  );
}

function DetalleSolicitud({
  solicitud,
  lineas,
  ivaPct,
  redondeo,
}: {
  solicitud: FilaSolicitud;
  lineas: LineaSolicitud[];
  ivaPct: number;
  redondeo: number;
}) {
  const router = useRouter();

  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [pendienteAccion, iniciarTransicionAccion] = useTransition();

  const subtotal = useMemo(() => {
    return lineas.reduce((acumulado, linea) => acumulado + linea.cantidad * linea.precio_unitario_congelado, 0);
  }, [lineas]);

  const montoIva = subtotal * (ivaPct / 100);
  const totalAntesDeRedondeo = subtotal + montoIva;
  const totalFinal = redondeo > 0 ? Math.round(totalAntesDeRedondeo / redondeo) * redondeo : totalAntesDeRedondeo;

  function cambiarEstado(nuevoEstado: EstadoCotizacion) {
    setErrorAccion(null);
    iniciarTransicionAccion(async () => {
      const resultado = await cambiarEstadoCotizacion(solicitud.id_cotizacion, nuevoEstado);
      if (resultado.error) {
        setErrorAccion(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  const opcionesEstado = TRANSICIONES_MANUALES[solicitud.estado];

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {solicitud.tipo_evento}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {solicitud.cantidad_pax} invitados · Fecha: {formatoFecha.format(new Date(solicitud.fecha_evento))}
          </Typography>
        </Box>
        <Chip label={ETIQUETA_ESTADO[solicitud.estado]} color={COLOR_ESTADO[solicitud.estado]} />
      </Stack>

      {MUESTRA_DATOS_CLIENTE.includes(solicitud.estado) && (
        <Box sx={{ p: 2.5, bgcolor: "#E3F7EA", borderRadius: 2, mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLOR_ACCION, letterSpacing: 0.5 }}>
            DATOS DEL CLIENTE
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={4} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Nombre
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{solicitud.nombre_cliente}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{solicitud.email_cliente}</Typography>
            </Box>
            {solicitud.telefono_cliente && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Teléfono
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{solicitud.telefono_cliente}</Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>SERVICIO</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
              CANT.
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
              PRECIO UNIT.
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
              SUBTOTAL
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineas.map((linea) => (
            <TableRow key={linea.id_detalle}>
              <TableCell>{linea.descripcion}</TableCell>
              <TableCell align="right">{linea.cantidad}</TableCell>
              <TableCell align="right">{formatoMoneda.format(linea.precio_unitario_congelado)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatoMoneda.format(linea.cantidad * linea.precio_unitario_congelado)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack spacing={1} sx={{ maxWidth: 320, ml: "auto", mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary">Subtotal:</Typography>
          <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(subtotal)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary">IVA ({ivaPct}%):</Typography>
          <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(montoIva)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", pt: 1, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Total Final:
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLOR_ACCION }}>
            {formatoMoneda.format(totalFinal)}
          </Typography>
        </Stack>
      </Stack>

      {errorAccion && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAccion}
        </Alert>
      )}

      {opcionesEstado.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 0.5, mb: 1, display: "block" }}>
            ACCIONES DISPONIBLES
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {opcionesEstado.map((opcion) => (
              <Button
                key={opcion.estado}
                variant={opcion.estado === "CANCELADO" ? "outlined" : opcion.estado === "FINALIZADO" ? "contained" : "outlined"}
                color={opcion.estado === "CANCELADO" ? "error" : "primary"}
                disabled={pendienteAccion}
                onClick={() => cambiarEstado(opcion.estado)}
                sx={
                  opcion.estado === "FINALIZADO"
                    ? { flex: 1, bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }
                    : { flex: 1 }
                }
              >
                {pendienteAccion ? "…" : opcion.etiqueta}
              </Button>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
