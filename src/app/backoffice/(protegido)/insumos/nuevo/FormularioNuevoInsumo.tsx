"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { crearInsumo, type EstadoFormulario } from "../actions";

interface Categoria {
  id_categoria: number;
  nombre: string;
}

interface Unidad {
  id_unidad: number;
  nombre: string;
  simbolo: string;
}

const estadoInicial: EstadoFormulario = {};

export default function FormularioNuevoInsumo({
  categorias,
  unidades,
}: {
  categorias: Categoria[];
  unidades: Unidad[];
}) {
  const [estado, accion, pendiente] = useActionState(crearInsumo, estadoInicial);

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 480 }}>
      <Box component="form" action={accion}>
        <Stack spacing={2}>
          {estado.error && <Alert severity="error">{estado.error}</Alert>}

          <TextField name="nombre" label="Nombre" required fullWidth disabled={pendiente} />

          <TextField
            name="id_categoria"
            label="Categoría"
            select
            required
            fullWidth
            defaultValue=""
            disabled={pendiente}
          >
            {categorias.map((categoria) => (
              <MenuItem key={categoria.id_categoria} value={categoria.id_categoria}>
                {categoria.nombre}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name="id_unidad_compra"
            label="Unidad de compra"
            select
            required
            fullWidth
            defaultValue=""
            disabled={pendiente}
          >
            {unidades.map((unidad) => (
              <MenuItem key={unidad.id_unidad} value={unidad.id_unidad}>
                {unidad.nombre} ({unidad.simbolo})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name="costo_unitario"
            label="Costo unitario"
            type="number"
            slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
            required
            fullWidth
            disabled={pendiente}
          />

          <TextField
            name="densidad_g_ml"
            label="Densidad (g/ml)"
            type="number"
            slotProps={{ htmlInput: { step: "0.0001", min: "0" } }}
            fullWidth
            disabled={pendiente}
            helperText="Solo si este insumo necesita convertirse entre masa y volumen (por ejemplo, una crema)."
          />

          <Button type="submit" variant="contained" size="large" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
