"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";
import { etiquetaEntidad } from "./mapeo";
import type { FilaAuditoria } from "./TablaAuditoria";

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function calcularCampos(registro: FilaAuditoria): { campo: string; anterior: unknown; nuevo: unknown }[] {
  const anterior = registro.valor_anterior ?? {};
  const nuevo = registro.valor_nuevo ?? {};
  const claves = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);

  const filas: { campo: string; anterior: unknown; nuevo: unknown }[] = [];
  for (const clave of claves) {
    const valorAnterior = anterior[clave];
    const valorNuevo = nuevo[clave];
    if (registro.accion === "UPDATE" && JSON.stringify(valorAnterior) === JSON.stringify(valorNuevo)) {
      continue;
    }
    filas.push({ campo: clave, anterior: valorAnterior, nuevo: valorNuevo });
  }
  return filas.sort((a, b) => a.campo.localeCompare(b.campo));
}

export default function DialogoDetalleAuditoria({
  registro,
  onCerrar,
}: {
  registro: FilaAuditoria | null;
  onCerrar: () => void;
}) {
  const campos = registro ? calcularCampos(registro) : [];

  return (
    <Dialog open={registro !== null} onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle>
        {registro ? `${etiquetaEntidad(registro.entidad)} · ${registro.accion}` : ""}
      </DialogTitle>
      <DialogContent>
        {campos.length === 0 ? (
          <Typography color="text.secondary">Sin cambios de campos para mostrar.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campo</TableCell>
                {registro?.accion !== "INSERT" && <TableCell>Anterior</TableCell>}
                {registro?.accion !== "DELETE" && <TableCell>Nuevo</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {campos.map((fila) => (
                <TableRow key={fila.campo}>
                  <TableCell>{fila.campo}</TableCell>
                  {registro?.accion !== "INSERT" && <TableCell>{formatearValor(fila.anterior)}</TableCell>}
                  {registro?.accion !== "DELETE" && <TableCell>{formatearValor(fila.nuevo)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
