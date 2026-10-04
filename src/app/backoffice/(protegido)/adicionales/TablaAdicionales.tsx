"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { margenSobreCosto } from "@/domain/costeo";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoMoneda } from "@/lib/formato";
import DialogoAdicional from "./DialogoAdicional";
import DialogoEliminarAdicional from "./DialogoEliminarAdicional";
import { etiquetaTipoCobro } from "./mapeo";

const COLOR_ACCION = "#219653";
const COLOR_EDITAR = "#C2652F";

export interface FilaAdicional {
  id_adicional: number;
  nombre_servicio: string;
  descripcion: string | null;
  tipo_cobro: "FIJO" | "POR_PERSONA" | "POR_MESA";
  costo_actual: number;
  coeficiente_venta: number;
  estado: boolean;
}

export default function TablaAdicionales({ adicionales }: { adicionales: FilaAdicional[] }) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Administrador";
  const [busqueda, setBusqueda] = useState("");
  const [modo, setModo] = useState<"nuevo" | FilaAdicional | null>(null);
  const [aEliminar, setAEliminar] = useState<FilaAdicional | null>(null);

  const adicionalesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return adicionales;
    return adicionales.filter((adicional) => adicional.nombre_servicio.toLowerCase().includes(termino));
  }, [adicionales, busqueda]);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Servicios adicionales
        </Typography>
        {puedeEscribir && (
          <Button
            variant="contained"
            onClick={() => setModo("nuevo")}
            sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
          >
            + Nuevo adicional
          </Button>
        )}
      </Stack>

      <TextField
        placeholder="Buscar adicionales..."
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3, maxWidth: 420 }}
      />

      {adicionalesFiltrados.length === 0 ? (
        <Typography color="text.secondary">No hay servicios adicionales que coincidan con la búsqueda.</Typography>
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
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>SERVICIO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>TIPO DE COBRO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  COSTO
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  MARGEN
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PRECIO NETO SUGERIDO
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  ACCIONES
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adicionalesFiltrados.map((adicional) => {
                const margenPct = margenSobreCosto(new Decimal(adicional.coeficiente_venta)).times(100);
                return (
                  <TableRow key={adicional.id_adicional} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{adicional.nombre_servicio}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{etiquetaTipoCobro(adicional.tipo_cobro)}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(adicional.costo_actual)}</TableCell>
                    <TableCell align="right">{margenPct.toFixed(0)}%</TableCell>
                    <TableCell align="right">
                      {formatoMoneda.format(adicional.costo_actual * adicional.coeficiente_venta)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={adicional.estado ? "Activo" : "Inactivo"}
                        size="small"
                        sx={
                          adicional.estado
                            ? { bgcolor: "#E3F7EA", color: "#219653", fontWeight: 700 }
                            : { bgcolor: "#FBE4E4", color: "#D64545", fontWeight: 700 }
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      {puedeEscribir && (
                        <IconButton size="small" onClick={() => setModo(adicional)} sx={{ color: COLOR_EDITAR }}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      )}
                      {puedeEscribir && (
                        <IconButton size="small" onClick={() => setAEliminar(adicional)} sx={{ color: "text.secondary" }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* key fuerza el remonte al cambiar de adicional, así el diálogo arranca limpio */}
      <DialogoAdicional
        key={modo === null ? "cerrado" : modo === "nuevo" ? "nuevo" : modo.id_adicional}
        modo={modo}
        onCerrar={() => setModo(null)}
      />
      <DialogoEliminarAdicional adicional={aEliminar} onCerrar={() => setAEliminar(null)} />
    </>
  );
}
