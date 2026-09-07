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
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import { formatoMoneda } from "@/lib/formato";
import { guardarInsumo } from "./actions";
import type { Categoria, FilaInsumo, Proveedor, Unidad } from "./TablaInsumos";

export default function DialogoInsumo({
  modo,
  categorias,
  unidades,
  proveedores,
  onCerrar,
}: {
  modo: "nuevo" | FilaInsumo | null;
  categorias: Categoria[];
  unidades: Unidad[];
  proveedores: Proveedor[];
  onCerrar: () => void;
}) {
  const esEdicion = modo !== null && modo !== "nuevo";
  const insumo = esEdicion ? (modo as FilaInsumo) : null;

  const [nombre, setNombre] = useState(insumo?.nombre ?? "");
  const [idCategoria, setIdCategoria] = useState(insumo ? String(insumo.id_categoria) : "");
  const [idUnidadCompra, setIdUnidadCompra] = useState(insumo ? String(insumo.id_unidad_compra) : "");
  const [costoUnitario, setCostoUnitario] = useState(insumo ? String(insumo.costo_unitario) : "");
  const [existenciaActual, setExistenciaActual] = useState(
    insumo ? String(insumo.existencia_actual) : "0",
  );
  const [idProveedor, setIdProveedor] = useState(insumo?.id_proveedor ? String(insumo.id_proveedor) : "");
  const [densidad, setDensidad] = useState(insumo?.densidad_g_ml != null ? String(insumo.densidad_g_ml) : "");
  const [estadoActivo, setEstadoActivo] = useState(insumo?.estado ?? true);
  const [registrarMotivo, setRegistrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const unidadSeleccionada = unidades.find((u) => String(u.id_unidad) === idUnidadCompra);
  const unidadBase = unidadSeleccionada
    ? unidades.find((u) => u.magnitud === unidadSeleccionada.magnitud && u.es_unidad_base)
    : undefined;
  const costoBaseVista =
    unidadSeleccionada && costoUnitario && Number(costoUnitario) > 0
      ? Number(costoUnitario) / unidadSeleccionada.factor_a_base
      : null;

  const cambioDePrecio = esEdicion && insumo !== null && Number(costoUnitario) !== insumo.costo_unitario;

  function cerrar() {
    if (pendiente) return;
    onCerrar();
  }

  function confirmar() {
    setError(null);
    const formData = new FormData();
    if (insumo) formData.set("id_materia_prima", String(insumo.id_materia_prima));
    formData.set("nombre", nombre);
    formData.set("id_categoria", idCategoria);
    formData.set("id_unidad_compra", idUnidadCompra);
    formData.set("costo_unitario", costoUnitario);
    formData.set("existencia_actual", existenciaActual);
    formData.set("id_proveedor", idProveedor);
    formData.set("densidad_g_ml", densidad);
    formData.set("estado", String(estadoActivo));
    formData.set("motivo", registrarMotivo ? motivo : "");

    iniciarTransicion(async () => {
      const resultado = await guardarInsumo({}, formData);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        onCerrar();
      }
    });
  }

  return (
    <Dialog open={modo !== null} onClose={cerrar} fullWidth maxWidth="sm">
      <DialogTitle>{esEdicion ? "Editar materia prima" : "Nueva materia prima"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {esEdicion && (
            <Typography variant="body2" color="text.secondary">
              Los cambios de precio recalculan el costo de las recetas activas que la usan.
            </Typography>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Nombre del insumo"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              required
              fullWidth
              disabled={pendiente}
              autoFocus
            />
            <TextField
              label="Categoría"
              select
              value={idCategoria}
              onChange={(evento) => setIdCategoria(evento.target.value)}
              required
              fullWidth
              disabled={pendiente}
            >
              {categorias.map((categoria) => (
                <MenuItem key={categoria.id_categoria} value={String(categoria.id_categoria)}>
                  {categoria.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Unidad de compra"
              select
              value={idUnidadCompra}
              onChange={(evento) => setIdUnidadCompra(evento.target.value)}
              required
              fullWidth
              disabled={pendiente}
            >
              {unidades.map((unidad) => (
                <MenuItem key={unidad.id_unidad} value={String(unidad.id_unidad)}>
                  {unidad.nombre} ({unidad.simbolo})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Costo unitario"
              type="number"
              value={costoUnitario}
              onChange={(evento) => setCostoUnitario(evento.target.value)}
              slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
              required
              fullWidth
              disabled={pendiente}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Existencia actual"
              type="number"
              value={existenciaActual}
              onChange={(evento) => setExistenciaActual(evento.target.value)}
              slotProps={{ htmlInput: { step: "0.001", min: "0" } }}
              fullWidth
              disabled={pendiente}
              helperText={
                unidadSeleccionada
                  ? `En ${unidadSeleccionada.simbolo}, la unidad de compra`
                  : "En la unidad de compra"
              }
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Proveedor"
              select
              value={idProveedor}
              onChange={(evento) => setIdProveedor(evento.target.value)}
              fullWidth
              disabled={pendiente}
            >
              <MenuItem value="">Sin especificar</MenuItem>
              {proveedores.map((proveedor) => (
                <MenuItem key={proveedor.id_proveedor} value={String(proveedor.id_proveedor)}>
                  {proveedor.razon_social}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Densidad (g/ml)"
              type="number"
              value={densidad}
              onChange={(evento) => setDensidad(evento.target.value)}
              slotProps={{ htmlInput: { step: "0.0001", min: "0" } }}
              fullWidth
              disabled={pendiente}
              helperText="Solo si convierte entre masa y volumen"
            />
          </Stack>

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

          {costoBaseVista != null && unidadBase && (
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
                Vista previa del costo base
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {formatoMoneda.format(Number(costoUnitario))} / {unidadSeleccionada?.factor_a_base}{" "}
                {unidadBase.simbolo} = {formatoMoneda.format(costoBaseVista)} por {unidadBase.simbolo}
              </Typography>
              {esEdicion && insumo && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {insumo.recetas_activas} receta{insumo.recetas_activas === 1 ? "" : "s"} activa
                  {insumo.recetas_activas === 1 ? "" : "s"} usa{insumo.recetas_activas === 1 ? "" : "n"} este
                  insumo. Las cotizaciones ya emitidas no se modifican.
                </Typography>
              )}
            </Box>
          )}

          {cambioDePrecio && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={registrarMotivo}
                    onChange={(evento) => setRegistrarMotivo(evento.target.checked)}
                    disabled={pendiente}
                  />
                }
                label="Registrar el motivo del cambio de precio (queda en el histórico)"
              />
              {registrarMotivo && (
                <TextField
                  label="Motivo"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={pendiente}
                />
              )}
            </>
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
          disabled={pendiente || !nombre || !idCategoria || !idUnidadCompra || !costoUnitario}
        >
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
