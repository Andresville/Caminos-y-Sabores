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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import DialogoInsumo from "./DialogoInsumo";

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
  existencia_actual: number;
  densidad_g_ml: number | null;
  estado: boolean;
  ultima_actualizacion: string;
  id_categoria: number;
  id_unidad_compra: number;
  id_proveedor: number | null;
  categoria: { nombre: string } | null;
  unidad_compra: { simbolo: string; magnitud: string; factor_a_base: number } | null;
  recetas_activas: number;
}

function estaDesactualizado(fechaIso: string, diasAlerta: number): boolean {
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  return dias > diasAlerta;
}

export default function TablaInsumos({
  insumos,
  categorias,
  unidades,
  proveedores,
  diasAlerta,
}: {
  insumos: FilaInsumo[];
  categorias: Categoria[];
  unidades: Unidad[];
  proveedores: Proveedor[];
  diasAlerta: number;
}) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Jefe de Compras";
  const [modo, setModo] = useState<"nuevo" | FilaInsumo | null>(null);

  function unidadBaseDe(magnitud: string): Unidad | undefined {
    return unidades.find((u) => u.magnitud === magnitud && u.es_unidad_base);
  }

  return (
    <>
      {puedeEscribir && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" onClick={() => setModo("nuevo")}>
            + Nuevo insumo
          </Button>
        </Box>
      )}

      {insumos.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay insumos cargados.</Typography>
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
          <Table sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell>Insumo</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Unidad compra</TableCell>
                <TableCell align="right">Costo unitario</TableCell>
                <TableCell align="right">Costo base</TableCell>
                <TableCell align="right">Existencia</TableCell>
                <TableCell>Actualizado</TableCell>
                <TableCell align="right">Recetas</TableCell>
                <TableCell>Estado</TableCell>
                {puedeEscribir && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {insumos.map((insumo, indice) => {
                const desactualizado = estaDesactualizado(insumo.ultima_actualizacion, diasAlerta);
                const baseUnidad = insumo.unidad_compra
                  ? unidadBaseDe(insumo.unidad_compra.magnitud)
                  : undefined;
                const costoBase = insumo.unidad_compra
                  ? insumo.costo_unitario / insumo.unidad_compra.factor_a_base
                  : null;

                return (
                  <TableRow
                    key={insumo.id_materia_prima}
                    hover
                    sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
                  >
                    <TableCell>{insumo.nombre}</TableCell>
                    <TableCell>{insumo.categoria?.nombre ?? "—"}</TableCell>
                    <TableCell>{insumo.unidad_compra?.simbolo ?? "—"}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(insumo.costo_unitario)}</TableCell>
                    <TableCell align="right">
                      {costoBase != null
                        ? `${formatoMoneda.format(costoBase)} /${baseUnidad?.simbolo ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      {insumo.existencia_actual} {insumo.unidad_compra?.simbolo ?? ""}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <span>{formatoFecha.format(new Date(insumo.ultima_actualizacion))}</span>
                        {desactualizado && <Chip label="Desactualizado" color="warning" size="small" />}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{insumo.recetas_activas}</TableCell>
                    <TableCell>
                      <Chip
                        label={insumo.estado ? "Activo" : "Inactivo"}
                        color={insumo.estado ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    {puedeEscribir && (
                      <TableCell align="right">
                        <Link component="button" type="button" onClick={() => setModo(insumo)} underline="hover">
                          Editar
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* key fuerza el remonte al cambiar de insumo, así el diálogo arranca limpio */}
      <DialogoInsumo
        key={modo === null ? "cerrado" : modo === "nuevo" ? "nuevo" : modo.id_materia_prima}
        modo={modo}
        categorias={categorias}
        unidades={unidades}
        proveedores={proveedores}
        onCerrar={() => setModo(null)}
      />
    </>
  );
}
