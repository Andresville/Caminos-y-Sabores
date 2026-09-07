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
import { COLOR_ACCION, ETIQUETA_ACCION, etiquetaEntidad } from "./mapeo";
import DialogoDetalleAuditoria from "./DialogoDetalleAuditoria";

export interface FilaAuditoria {
  id_auditoria: number;
  entidad: string;
  id_entidad: number | null;
  accion: "INSERT" | "UPDATE" | "DELETE";
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  fecha_hora: string;
  nombre_usuario: string | null;
}

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export default function TablaAuditoria({ registros }: { registros: FilaAuditoria[] }) {
  const [seleccionado, setSeleccionado] = useState<FilaAuditoria | null>(null);

  if (registros.length === 0) {
    return <Typography color="text.secondary">No hay registros que coincidan con el filtro.</Typography>;
  }

  return (
    <>
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
              <TableCell>Fecha y hora</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Entidad</TableCell>
              <TableCell align="right">ID</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell align="right">Detalle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {registros.map((registro, indice) => (
              <TableRow
                key={registro.id_auditoria}
                hover
                sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
              >
                <TableCell>{formatoFechaHora.format(new Date(registro.fecha_hora))}</TableCell>
                <TableCell>{registro.nombre_usuario ?? "—"}</TableCell>
                <TableCell>{etiquetaEntidad(registro.entidad)}</TableCell>
                <TableCell align="right">{registro.id_entidad ?? "—"}</TableCell>
                <TableCell>
                  <Chip
                    label={ETIQUETA_ACCION[registro.accion] ?? registro.accion}
                    color={COLOR_ACCION[registro.accion] ?? "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Link component="button" type="button" onClick={() => setSeleccionado(registro)} underline="hover">
                    Ver cambios
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <DialogoDetalleAuditoria registro={seleccionado} onCerrar={() => setSeleccionado(null)} />
    </>
  );
}
