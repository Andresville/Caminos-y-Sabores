"use client";

import { useState } from "react";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoMoneda } from "@/lib/formato";
import DialogoAdicional from "./DialogoAdicional";
import { etiquetaTipoCobro } from "./mapeo";

export interface FilaAdicional {
  id_adicional: number;
  nombre_servicio: string;
  descripcion: string | null;
  tipo_cobro: "FIJO" | "POR_PERSONA";
  costo_actual: number;
  coeficiente_venta: number;
  estado: boolean;
}

export default function TablaAdicionales({ adicionales }: { adicionales: FilaAdicional[] }) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Jefe de Compras" || rol === "Gerente Comercial";
  const [modo, setModo] = useState<"nuevo" | FilaAdicional | null>(null);

  return (
    <>
      {puedeEscribir && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" onClick={() => setModo("nuevo")}>
            + Nuevo adicional
          </Button>
        </Box>
      )}

      {adicionales.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay servicios adicionales cargados.</Typography>
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
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Servicio</TableCell>
                <TableCell>Tipo de cobro</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell align="right">Coeficiente</TableCell>
                <TableCell align="right">Precio neto sugerido</TableCell>
                <TableCell>Estado</TableCell>
                {puedeEscribir && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {adicionales.map((adicional, indice) => (
                <TableRow
                  key={adicional.id_adicional}
                  hover
                  sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
                >
                  <TableCell>{adicional.nombre_servicio}</TableCell>
                  <TableCell>{etiquetaTipoCobro(adicional.tipo_cobro)}</TableCell>
                  <TableCell align="right">{formatoMoneda.format(adicional.costo_actual)}</TableCell>
                  <TableCell align="right">{adicional.coeficiente_venta.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {formatoMoneda.format(adicional.costo_actual * adicional.coeficiente_venta)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={adicional.estado ? "Activo" : "Inactivo"}
                      color={adicional.estado ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  {puedeEscribir && (
                    <TableCell align="right">
                      <Link component="button" type="button" onClick={() => setModo(adicional)} underline="hover">
                        Editar
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
    </>
  );
}
