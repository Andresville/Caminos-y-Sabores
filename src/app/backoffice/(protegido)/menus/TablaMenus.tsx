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
import { formatoMoneda } from "@/lib/formato";
import BotonEnlace from "@/components/BotonEnlace";

export interface FilaMenu {
  id_menu: number;
  nombre_menu: string;
  pax_minimo: number;
  coeficiente_venta: number;
  estado: boolean;
  cantidad_recetas: number;
  costo_por_pax: number | null;
  precio_publico: number | null;
}

export default function TablaMenus({ menus }: { menus: FilaMenu[] }) {
  const { rol } = useUsuarioActual();
  const puedeCrear = rol === "Chef Principal";

  return (
    <>
      {puedeCrear && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <BotonEnlace href="/backoffice/menus/nuevo" variant="contained">
            + Nuevo menú
          </BotonEnlace>
        </Box>
      )}

      {menus.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay menús cargados.</Typography>
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
          <Table sx={{ minWidth: 850 }}>
            <TableHead>
              <TableRow>
                <TableCell>Menú</TableCell>
                <TableCell align="right">Pax mínimo</TableCell>
                <TableCell align="right">Recetas</TableCell>
                <TableCell align="right">Coeficiente</TableCell>
                <TableCell align="right">Costo x pax</TableCell>
                <TableCell align="right">Precio público x pax</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menus.map((menu, indice) => (
                <TableRow
                  key={menu.id_menu}
                  hover
                  sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
                >
                  <TableCell>{menu.nombre_menu}</TableCell>
                  <TableCell align="right">{menu.pax_minimo}</TableCell>
                  <TableCell align="right">{menu.cantidad_recetas}</TableCell>
                  <TableCell align="right">{menu.coeficiente_venta.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {menu.costo_por_pax != null ? formatoMoneda.format(menu.costo_por_pax) : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {menu.precio_publico != null ? formatoMoneda.format(menu.precio_publico) : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={menu.estado ? "Activo" : "Inactivo"}
                      color={menu.estado ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Link component={NextLink} href={`/backoffice/menus/${menu.id_menu}`} underline="hover">
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}
