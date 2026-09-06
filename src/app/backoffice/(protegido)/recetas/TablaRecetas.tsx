"use client";

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
import NextLink from "next/link";
import { useUsuarioActual } from "@/lib/usuario-actual/UsuarioActualProvider";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import BotonEnlace from "@/components/BotonEnlace";
import { etiquetaTipoPlato } from "./mapeo";

export interface FilaReceta {
  id_receta: number;
  nombre_plato: string;
  tipo_plato: string;
  cantidad_porciones: number;
  costo_por_porcion: number | null;
  estado: "BORRADOR" | "ACTIVA" | "INACTIVA";
  fecha_ultimo_calculo: string | null;
}

const colorEstado: Record<FilaReceta["estado"], "warning" | "success" | "default"> = {
  BORRADOR: "warning",
  ACTIVA: "success",
  INACTIVA: "default",
};

const etiquetaEstado: Record<FilaReceta["estado"], string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
};

export default function TablaRecetas({ recetas }: { recetas: FilaReceta[] }) {
  const { rol } = useUsuarioActual();
  const puedeEscribir = rol === "Chef Principal";

  return (
    <>
      {puedeEscribir && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <BotonEnlace href="/backoffice/recetas/nueva" variant="contained">
            + Nueva receta
          </BotonEnlace>
        </Box>
      )}

      {recetas.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay recetas cargadas.</Typography>
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
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Plato</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Porciones</TableCell>
                <TableCell align="right">Costo por porción</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Último cálculo</TableCell>
                {puedeEscribir && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {recetas.map((receta, indice) => (
                <TableRow
                  key={receta.id_receta}
                  hover
                  sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
                >
                  <TableCell>{receta.nombre_plato}</TableCell>
                  <TableCell>{etiquetaTipoPlato(receta.tipo_plato)}</TableCell>
                  <TableCell align="right">{receta.cantidad_porciones}</TableCell>
                  <TableCell align="right">
                    {receta.costo_por_porcion != null ? formatoMoneda.format(receta.costo_por_porcion) : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={etiquetaEstado[receta.estado]}
                      color={colorEstado[receta.estado]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {receta.fecha_ultimo_calculo
                      ? formatoFecha.format(new Date(receta.fecha_ultimo_calculo))
                      : "—"}
                  </TableCell>
                  {puedeEscribir && (
                    <TableCell align="right">
                      <Link
                        component={NextLink}
                        href={`/backoffice/recetas/${receta.id_receta}`}
                        underline="hover"
                      >
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
    </>
  );
}
