"use client";

import { useState } from "react";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { cambiarEstadoInsumo } from "./actions";
import DialogoEditarPrecio from "./DialogoEditarPrecio";

export interface FilaInsumo {
  id_materia_prima: number;
  nombre: string;
  costo_unitario: number;
  estado: boolean;
  ultima_actualizacion: string;
  categoria: { nombre: string } | null;
  unidad_compra: { simbolo: string } | null;
}

function estaDesactualizado(fechaIso: string, diasAlerta: number): boolean {
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  return dias > diasAlerta;
}

export default function TablaInsumos({
  insumos,
  diasAlerta,
}: {
  insumos: FilaInsumo[];
  diasAlerta: number;
}) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Jefe de Compras";
  const [insumoEditando, setInsumoEditando] = useState<FilaInsumo | null>(null);
  const [cambiandoEstadoDe, setCambiandoEstadoDe] = useState<number | null>(null);

  async function alternarEstado(insumo: FilaInsumo) {
    setCambiandoEstadoDe(insumo.id_materia_prima);
    try {
      await cambiarEstadoInsumo(insumo.id_materia_prima, !insumo.estado);
    } finally {
      setCambiandoEstadoDe(null);
    }
  }

  if (insumos.length === 0) {
    return <Typography color="text.secondary">Todavía no hay insumos cargados.</Typography>;
  }

  return (
    <>
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Unidad de compra</TableCell>
              <TableCell align="right">Costo vigente</TableCell>
              <TableCell>Actualizado</TableCell>
              <TableCell>Estado</TableCell>
              {puedeEscribir && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {insumos.map((insumo) => {
              const desactualizado = estaDesactualizado(insumo.ultima_actualizacion, diasAlerta);
              return (
                <TableRow key={insumo.id_materia_prima} hover>
                  <TableCell>{insumo.nombre}</TableCell>
                  <TableCell>{insumo.categoria?.nombre ?? "—"}</TableCell>
                  <TableCell>{insumo.unidad_compra?.simbolo ?? "—"}</TableCell>
                  <TableCell align="right">{formatoMoneda.format(insumo.costo_unitario)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <span>{formatoFecha.format(new Date(insumo.ultima_actualizacion))}</span>
                      {desactualizado && (
                        <Chip label="Precio desactualizado" color="warning" size="small" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={insumo.estado ? "Activo" : "Inactivo"}
                      color={insumo.estado ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  {puedeEscribir && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                        <Button size="small" onClick={() => setInsumoEditando(insumo)}>
                          Editar precio
                        </Button>
                        <Button
                          size="small"
                          color={insumo.estado ? "error" : "success"}
                          disabled={cambiandoEstadoDe === insumo.id_materia_prima}
                          onClick={() => alternarEstado(insumo)}
                        >
                          {insumo.estado ? "Desactivar" : "Activar"}
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* key fuerza el remonte al cambiar de insumo, así el diálogo arranca limpio */}
      <DialogoEditarPrecio
        key={insumoEditando?.id_materia_prima ?? "cerrado"}
        insumo={insumoEditando}
        onCerrar={() => setInsumoEditando(null)}
      />
    </>
  );
}
