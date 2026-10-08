"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { formatoFecha } from "@/lib/formato";
import { ETIQUETA_ESTADO, COLOR_ESTADO, ESTADOS_CANCELABLES, type EstadoEvento } from "./mapeo";
import DialogoCancelarEvento from "./DialogoCancelarEvento";

export interface FilaEvento {
  id_evento: number;
  estado: EstadoEvento;
  fecha_creacion: string;
  cotizacion: {
    tipo_evento: string;
    nombre_cliente: string;
    fecha_evento: string;
    cantidad_pax: number;
  };
}

export default function TablaEventos({ eventos }: { eventos: FilaEvento[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoEvento | "TODOS">("TODOS");
  const [aCancelar, setACancelar] = useState<FilaEvento | null>(null);

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return eventos.filter((evento) => {
      const coincideBusqueda =
        !termino ||
        evento.cotizacion.tipo_evento.toLowerCase().includes(termino) ||
        evento.cotizacion.nombre_cliente.toLowerCase().includes(termino);
      const coincideEstado = filtroEstado === "TODOS" || evento.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [eventos, busqueda, filtroEstado]);

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700, mb: 3 }}>
        Eventos
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar evento..."
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          size="small"
          fullWidth
          sx={{ maxWidth: 420 }}
        />
        <TextField
          select
          size="small"
          value={filtroEstado}
          onChange={(evento) => setFiltroEstado(evento.target.value as EstadoEvento | "TODOS")}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="TODOS">Todos</MenuItem>
          {(Object.keys(ETIQUETA_ESTADO) as EstadoEvento[]).map((estado) => (
            <MenuItem key={estado} value={estado}>
              {ETIQUETA_ESTADO[estado]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {eventosFiltrados.length === 0 ? (
        <Typography color="text.secondary">No hay eventos que coincidan con la búsqueda.</Typography>
      ) : (
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
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>NOMBRE DEL EVENTO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>CLIENTE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>FECHA</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  COMENSALES
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  ACCIONES
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventosFiltrados.map((evento) => (
                <TableRow key={evento.id_evento} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{evento.cotizacion.tipo_evento}</TableCell>
                  <TableCell>{evento.cotizacion.nombre_cliente}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {formatoFecha.format(new Date(evento.cotizacion.fecha_evento))}
                  </TableCell>
                  <TableCell align="right">{evento.cotizacion.cantidad_pax}</TableCell>
                  <TableCell>
                    <Chip
                      label={ETIQUETA_ESTADO[evento.estado]}
                      size="small"
                      sx={{ bgcolor: COLOR_ESTADO[evento.estado].bg, color: COLOR_ESTADO[evento.estado].fg, fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                      <Link href={`/backoffice/eventos/${evento.id_evento}`} style={{ textDecoration: "none" }}>
                        Ver →
                      </Link>
                      {ESTADOS_CANCELABLES.includes(evento.estado) && (
                        <Typography
                          component="button"
                          onClick={() => setACancelar(evento)}
                          sx={{
                            border: 0,
                            bgcolor: "transparent",
                            color: "error.main",
                            cursor: "pointer",
                            fontSize: "inherit",
                            fontFamily: "inherit",
                            p: 0,
                          }}
                        >
                          Cancelar
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <DialogoCancelarEvento evento={aCancelar} onCerrar={() => setACancelar(null)} />
    </>
  );
}
