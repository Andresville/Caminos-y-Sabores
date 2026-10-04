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
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import DialogoEliminarInsumo from "./DialogoEliminarInsumo";

const COLOR_ACCION = "#219653";
const COLOR_EDITAR = "#C2652F";
const COLOR_HISTORICO = "#8D6E63";

export interface Categoria {
  id_categoria: number;
  nombre: string;
}

export interface Proveedor {
  id_proveedor: number;
  razon_social: string;
}

export interface Unidad {
  id_unidad: number;
  nombre: string;
  simbolo: string;
  magnitud: "MASA" | "VOLUMEN" | "CONTEO";
  factor_a_base: number;
  es_unidad_base: boolean;
}

export interface FilaInsumo {
  id_materia_prima: number;
  nombre: string;
  costo_unitario: number;
  precio_bulto: number;
  cantidad_bulto: number;
  densidad_g_ml: number | null;
  estado: boolean;
  ultima_actualizacion: string;
  id_categoria: number;
  id_unidad_compra: number;
  id_proveedor: number | null;
  categoria: { nombre: string } | null;
  unidad_compra: { simbolo: string; magnitud: string; factor_a_base: number } | null;
  proveedor: { razon_social: string } | null;
  recetas_activas: number;
}

export default function TablaInsumos({ insumos }: { insumos: FilaInsumo[] }) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Administrador";
  // Mismos roles que pueden leer historico_precio_mp por RLS (Ayudante de cocina no tiene acceso a precios).
  const puedeVerHistorico = rol === "Asistente Comercial" || rol === "Administrador";
  const [busqueda, setBusqueda] = useState("");
  const [aEliminar, setAEliminar] = useState<FilaInsumo | null>(null);

  const insumosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return insumos;
    return insumos.filter(
      (insumo) =>
        insumo.nombre.toLowerCase().includes(termino) ||
        insumo.categoria?.nombre.toLowerCase().includes(termino),
    );
  }, [insumos, busqueda]);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Insumos
        </Typography>
        {puedeEscribir && (
          <Link href="/backoffice/insumos/nuevo" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
            >
              + Nuevo insumo
            </Button>
          </Link>
        )}
      </Stack>

      <TextField
        placeholder="Buscar insumos..."
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3, maxWidth: 420 }}
      />

      {insumosFiltrados.length === 0 ? (
        <Typography color="text.secondary">No hay insumos que coincidan con la búsqueda.</Typography>
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
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>INSUMO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>UNIDAD</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PRECIO UNITARIO
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ÚLTIMA ACTUALIZACIÓN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  ACCIONES
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {insumosFiltrados.map((insumo) => (
                <TableRow key={insumo.id_materia_prima} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Stack spacing={0.25}>
                      <span>{insumo.nombre}</span>
                      <Typography variant="caption" color="text.secondary">
                        {insumo.categoria?.nombre ?? "Sin categoría"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{insumo.unidad_compra?.simbolo ?? "—"}</TableCell>
                  <TableCell align="right">{formatoMoneda.format(insumo.costo_unitario)}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {formatoFecha.format(new Date(insumo.ultima_actualizacion))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={insumo.estado ? "Activo" : "Inactivo"}
                      size="small"
                      sx={
                        insumo.estado
                          ? { bgcolor: "#E3F7EA", color: "#219653", fontWeight: 700 }
                          : { bgcolor: "#FBE4E4", color: "#D64545", fontWeight: 700 }
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    {puedeEscribir && (
                      <Link href={`/backoffice/insumos/${insumo.id_materia_prima}`}>
                        <IconButton size="small" sx={{ color: COLOR_EDITAR }}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Link>
                    )}
                    {puedeVerHistorico && (
                      <Link href={`/backoffice/insumos/${insumo.id_materia_prima}/historial`}>
                        <IconButton size="small" sx={{ color: COLOR_HISTORICO }}>
                          <HistoryOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Link>
                    )}
                    {puedeEscribir && (
                      <IconButton size="small" onClick={() => setAEliminar(insumo)} sx={{ color: "text.secondary" }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <DialogoEliminarInsumo insumo={aEliminar} onCerrar={() => setAEliminar(null)} />
    </>
  );
}
