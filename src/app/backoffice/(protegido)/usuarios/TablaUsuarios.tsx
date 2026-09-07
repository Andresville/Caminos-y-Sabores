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
import { formatoFecha } from "@/lib/formato";
import DialogoUsuario from "./DialogoUsuario";

export interface RolDisponible {
  id_rol: number;
  nombre_rol: string;
}

export interface FilaUsuario {
  id_usuario: string;
  nombre_completo: string;
  email: string;
  id_rol: number;
  estado: boolean;
  ultimo_acceso: string | null;
  rol: { nombre_rol: string } | null;
}

export default function TablaUsuarios({
  usuarios,
  roles,
}: {
  usuarios: FilaUsuario[];
  roles: RolDisponible[];
}) {
  const [modo, setModo] = useState<"nuevo" | FilaUsuario | null>(null);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" onClick={() => setModo("nuevo")}>
          + Nuevo usuario
        </Button>
      </Box>

      {usuarios.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay usuarios cargados.</Typography>
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
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Último acceso</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((usuario, indice) => (
                <TableRow
                  key={usuario.id_usuario}
                  hover
                  sx={{ bgcolor: indice % 2 === 1 ? "background.default" : "background.paper" }}
                >
                  <TableCell>{usuario.nombre_completo}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.rol?.nombre_rol ?? "—"}</TableCell>
                  <TableCell>
                    {usuario.ultimo_acceso ? formatoFecha.format(new Date(usuario.ultimo_acceso)) : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.estado ? "Activo" : "Inactivo"}
                      color={usuario.estado ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Link component="button" type="button" onClick={() => setModo(usuario)} underline="hover">
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* key fuerza el remonte al cambiar de usuario, así el diálogo arranca limpio */}
      <DialogoUsuario
        key={modo === null ? "cerrado" : modo === "nuevo" ? "nuevo" : modo.id_usuario}
        modo={modo}
        roles={roles}
        onCerrar={() => setModo(null)}
      />
    </>
  );
}
