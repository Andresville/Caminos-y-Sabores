"use client";

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { actualizarUsuario, crearUsuario } from "./actions";
import type { FilaUsuario, RolDisponible } from "./TablaUsuarios";

export default function DialogoUsuario({
  modo,
  roles,
  onCerrar,
}: {
  modo: "nuevo" | FilaUsuario | null;
  roles: RolDisponible[];
  onCerrar: () => void;
}) {
  const esEdicion = modo !== null && modo !== "nuevo";
  const usuario = esEdicion ? (modo as FilaUsuario) : null;

  const [nombreCompleto, setNombreCompleto] = useState(usuario?.nombre_completo ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [password, setPassword] = useState("");
  const [idRol, setIdRol] = useState(usuario ? String(usuario.id_rol) : "");
  const [estadoActivo, setEstadoActivo] = useState(usuario?.estado ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function cerrar() {
    if (pendiente) return;
    onCerrar();
  }

  function confirmar() {
    setError(null);
    const formData = new FormData();
    formData.set("nombre_completo", nombreCompleto);
    formData.set("id_rol", idRol);

    iniciarTransicion(async () => {
      let resultado;
      if (esEdicion && usuario) {
        formData.set("id_usuario", usuario.id_usuario);
        formData.set("estado", String(estadoActivo));
        resultado = await actualizarUsuario({}, formData);
      } else {
        formData.set("email", email);
        formData.set("password", password);
        resultado = await crearUsuario({}, formData);
      }

      if (resultado.error) {
        setError(resultado.error);
      } else {
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={modo !== null} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Nombre completo"
            value={nombreCompleto}
            onChange={(evento) => setNombreCompleto(evento.target.value)}
            required
            fullWidth
            disabled={pendiente}
            autoFocus
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
            fullWidth
            disabled={pendiente || esEdicion}
            helperText={esEdicion ? "El email no se puede modificar desde acá." : undefined}
          />

          {!esEdicion && (
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              required
              fullWidth
              disabled={pendiente}
              helperText="Mínimo 6 caracteres. Se la comunicás vos directamente a la persona."
            />
          )}

          <TextField
            label="Rol"
            select
            value={idRol}
            onChange={(evento) => setIdRol(evento.target.value)}
            required
            fullWidth
            disabled={pendiente}
          >
            {roles.map((rol) => (
              <MenuItem key={rol.id_rol} value={String(rol.id_rol)}>
                {rol.nombre_rol}
              </MenuItem>
            ))}
          </TextField>

          {esEdicion && (
            <TextField
              label="Estado"
              select
              value={estadoActivo ? "true" : "false"}
              onChange={(evento) => setEstadoActivo(evento.target.value === "true")}
              fullWidth
              disabled={pendiente}
            >
              <MenuItem value="true">Activo</MenuItem>
              <MenuItem value="false">Inactivo</MenuItem>
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar} disabled={pendiente}>
          Cancelar
        </Button>
        <Button
          onClick={confirmar}
          variant="contained"
          disabled={
            pendiente ||
            !nombreCompleto ||
            !idRol ||
            (!esEdicion && (!email || password.length < 6))
          }
        >
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
