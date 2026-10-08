"use client";

import { useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { formatoFecha } from "@/lib/formato";
import { ETIQUETA_ESTADO, COLOR_ESTADO, type EstadoEvento } from "../eventos/mapeo";
import DialogoCliente from "./DialogoCliente";

export interface EventoCliente {
  id_evento: number;
  estado: EstadoEvento;
  tipo_evento: string;
  fecha_evento: string;
  cantidad_pax: number;
}

export interface FilaCliente {
  id_cliente: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  estado: boolean;
  creado_en: string;
  eventos: EventoCliente[];
  ultimoEvento: string | null;
}

export default function VistaClientes({ clientes }: { clientes: FilaCliente[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVO" | "INACTIVO">("TODOS");
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(clientes[0]?.id_cliente ?? null);
  const [editando, setEditando] = useState<FilaCliente | null>(null);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const coincideBusqueda =
        !termino ||
        cliente.nombre_completo.toLowerCase().includes(termino) ||
        cliente.email.toLowerCase().includes(termino);
      const coincideEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVO" && cliente.estado) ||
        (filtroEstado === "INACTIVO" && !cliente.estado);
      return coincideBusqueda && coincideEstado;
    });
  }, [clientes, busqueda, filtroEstado]);

  const seleccionado =
    clientesFiltrados.find((c) => c.id_cliente === idSeleccionado) ?? clientesFiltrados[0] ?? null;

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700, mb: 3 }}>
        Gestión de Clientes
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              size="small"
              fullWidth
              sx={{ maxWidth: { sm: 420 } }}
            />
            <TextField
              select
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value as typeof filtroEstado)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="ACTIVO">Activo</MenuItem>
              <MenuItem value="INACTIVO">Inactivo</MenuItem>
            </TextField>
          </Stack>

          {clientesFiltrados.length === 0 ? (
            <Typography color="text.secondary">No hay clientes que coincidan con la búsqueda.</Typography>
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
              <Table sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>NOMBRE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>EMAIL</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>TELÉFONO</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                      EVENTOS
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ÚLTIMO EVENTO</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                      ACCIÓN
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow
                      key={cliente.id_cliente}
                      hover
                      selected={cliente.id_cliente === seleccionado?.id_cliente}
                      onClick={() => setIdSeleccionado(cliente.id_cliente)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{cliente.nombre_completo}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{cliente.email}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{cliente.telefono ?? "—"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {cliente.eventos.length}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {cliente.ultimoEvento ? formatoFecha.format(new Date(cliente.ultimoEvento)) : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cliente.estado ? "Activo" : "Inactivo"}
                          size="small"
                          sx={
                            cliente.estado
                              ? { bgcolor: "#E3F7EA", color: "#219653", fontWeight: 700 }
                              : { bgcolor: "#FBE4E4", color: "#D64545", fontWeight: 700 }
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(evento) => {
                            evento.stopPropagation();
                            setEditando(cliente);
                          }}
                          sx={{ color: "#C2652F" }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>

        {seleccionado && (
          <Paper
            variant="outlined"
            sx={{ p: 3, width: { xs: "100%", md: 320 }, flexShrink: 0, position: { md: "sticky" }, top: { md: 16 } }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {seleccionado.nombre_completo}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Cliente desde: {formatoFecha.format(new Date(seleccionado.creado_en))}
            </Typography>
            <Chip
              label={seleccionado.estado ? "Activo" : "Inactivo"}
              size="small"
              sx={
                seleccionado.estado
                  ? { bgcolor: "#E3F7EA", color: "#219653", fontWeight: 700, mb: 2 }
                  : { bgcolor: "#FBE4E4", color: "#D64545", fontWeight: 700, mb: 2 }
              }
            />

            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
              DATOS DE CONTACTO
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{seleccionado.email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Teléfono
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{seleccionado.telefono ?? "—"}</Typography>
              </Box>
            </Stack>

            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
              HISTORIAL DE EVENTOS ({seleccionado.eventos.length})
            </Typography>
            {seleccionado.eventos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Todavía no tiene eventos.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {seleccionado.eventos.map((evento) => (
                  <Stack key={evento.id_evento} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: COLOR_ESTADO[evento.estado].fg,
                        mt: 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{evento.tipo_evento}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatoFecha.format(new Date(evento.fecha_evento))} · {evento.cantidad_pax} comensales ·{" "}
                        {ETIQUETA_ESTADO[evento.estado]}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>

      <DialogoCliente
        key={editando?.id_cliente ?? "cerrado"}
        cliente={editando}
        onCerrar={() => setEditando(null)}
      />
    </>
  );
}
