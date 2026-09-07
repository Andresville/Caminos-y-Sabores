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
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { formatoMoneda } from "@/lib/formato";
import { guardarAdicional } from "./actions";
import { TIPOS_COBRO } from "./mapeo";
import type { FilaAdicional } from "./TablaAdicionales";

export default function DialogoAdicional({
  modo,
  onCerrar,
}: {
  modo: "nuevo" | FilaAdicional | null;
  onCerrar: () => void;
}) {
  const esEdicion = modo !== null && modo !== "nuevo";
  const adicional = esEdicion ? (modo as FilaAdicional) : null;

  const [nombreServicio, setNombreServicio] = useState(adicional?.nombre_servicio ?? "");
  const [descripcion, setDescripcion] = useState(adicional?.descripcion ?? "");
  const [tipoCobro, setTipoCobro] = useState(adicional?.tipo_cobro ?? "");
  const [costoActual, setCostoActual] = useState(adicional ? String(adicional.costo_actual) : "");
  const [coeficienteVenta, setCoeficienteVenta] = useState(
    adicional ? String(adicional.coeficiente_venta) : "1.45",
  );
  const [estadoActivo, setEstadoActivo] = useState(adicional?.estado ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const precioNetoSugerido =
    costoActual && coeficienteVenta ? Number(costoActual) * Number(coeficienteVenta) : null;

  function cerrar() {
    if (pendiente) return;
    onCerrar();
  }

  function confirmar() {
    setError(null);
    const formData = new FormData();
    if (adicional) formData.set("id_adicional", String(adicional.id_adicional));
    formData.set("nombre_servicio", nombreServicio);
    formData.set("descripcion", descripcion);
    formData.set("tipo_cobro", tipoCobro);
    formData.set("costo_actual", costoActual);
    formData.set("coeficiente_venta", coeficienteVenta);
    formData.set("estado", String(estadoActivo));

    iniciarTransicion(async () => {
      const resultado = await guardarAdicional({}, formData);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={modo !== null} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle>{esEdicion ? "Editar servicio adicional" : "Nuevo servicio adicional"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Nombre del servicio"
            value={nombreServicio}
            onChange={(evento) => setNombreServicio(evento.target.value)}
            required
            fullWidth
            disabled={pendiente}
            autoFocus
          />

          <TextField
            label="Descripción"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={pendiente}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Tipo de cobro"
              select
              value={tipoCobro}
              onChange={(evento) => setTipoCobro(evento.target.value)}
              required
              fullWidth
              disabled={pendiente}
            >
              {TIPOS_COBRO.map((tipo) => (
                <MenuItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Costo"
              type="number"
              value={costoActual}
              onChange={(evento) => setCostoActual(evento.target.value)}
              slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
              required
              fullWidth
              disabled={pendiente}
            />
          </Stack>

          <TextField
            label="Coeficiente de venta"
            type="number"
            value={coeficienteVenta}
            onChange={(evento) => setCoeficienteVenta(evento.target.value)}
            slotProps={{ htmlInput: { step: "0.01", min: "1" } }}
            required
            fullWidth
            disabled={pendiente}
            helperText="Permite un margen distinto al de los menús para este servicio."
          />

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

          {precioNetoSugerido != null && (
            <Box
              sx={{
                p: 2,
                bgcolor: "#EAF1F9",
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: 1,
              }}
            >
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                Precio neto sugerido
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {formatoMoneda.format(Number(costoActual))} × {coeficienteVenta} ={" "}
                {formatoMoneda.format(precioNetoSugerido)}
              </Typography>
            </Box>
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
          disabled={pendiente || !nombreServicio || !tipoCobro || !costoActual || !coeficienteVenta}
        >
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
