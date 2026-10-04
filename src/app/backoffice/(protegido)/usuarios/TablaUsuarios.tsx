"use client";

import { useMemo, useState } from "react";
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
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { formatoFecha } from "@/lib/formato";
import DialogoUsuario from "./DialogoUsuario";
import DialogoEliminarUsuario from "./DialogoEliminarUsuario";

const COLOR_ACCION = "#219653";

const COLOR_ROL: Record<string, { bg: string; color: string }> = {
  Administrador: { bg: "#F1E7FB", color: "#7B3FE4" },
  "Asistente Comercial": { bg: "#DCEEFB", color: "#2E6FBE" },
  "Ayudante de cocina": { bg: "#FCEBD9", color: "#C2652F" },
};
const COLOR_ROL_DEFECTO = { bg: "#EDEDED", color: "#616161" };

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
  const [aEliminar, setAEliminar] = useState<FilaUsuario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("Todos");

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const coincideBusqueda =
        !termino ||
        usuario.nombre_completo.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino);
      const coincideRol = filtroRol === "Todos" || usuario.rol?.nombre_rol === filtroRol;
      return coincideBusqueda && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Usuarios y Roles
        </Typography>
        <Button
          variant="contained"
          onClick={() => setModo("nuevo")}
          sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
        >
          + Nuevo usuario
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar usuarios..."
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          size="small"
          fullWidth
          sx={{ maxWidth: { sm: 420 } }}
        />
        <TextField
          select
          value={filtroRol}
          onChange={(evento) => setFiltroRol(evento.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="Todos">Todos</MenuItem>
          {roles.map((rol) => (
            <MenuItem key={rol.id_rol} value={rol.nombre_rol}>
              {rol.nombre_rol}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {usuariosFiltrados.length === 0 ? (
        <Typography color="text.secondary">No hay usuarios que coincidan con la búsqueda.</Typography>
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
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>NOMBRE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>EMAIL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ROL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ÚLTIMO ACCESO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  ACCIONES
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuariosFiltrados.map((usuario) => {
                const nombreRol = usuario.rol?.nombre_rol ?? "";
                const colorRol = COLOR_ROL[nombreRol] ?? COLOR_ROL_DEFECTO;
                return (
                  <TableRow key={usuario.id_usuario} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{usuario.nombre_completo}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{usuario.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={nombreRol || "—"}
                        size="small"
                        sx={{ bgcolor: colorRol.bg, color: colorRol.color, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={usuario.estado ? "Activo" : "Inactivo"}
                        size="small"
                        sx={
                          usuario.estado
                            ? { bgcolor: "#E3F7EA", color: "#219653", fontWeight: 700 }
                            : { bgcolor: "#FBE4E4", color: "#D64545", fontWeight: 700 }
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {usuario.ultimo_acceso ? formatoFecha.format(new Date(usuario.ultimo_acceso)) : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setModo(usuario)} sx={{ color: "#C2652F" }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setAEliminar(usuario)} sx={{ color: "text.secondary" }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
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
      <DialogoEliminarUsuario usuario={aEliminar} onCerrar={() => setAEliminar(null)} />
    </>
  );
}
