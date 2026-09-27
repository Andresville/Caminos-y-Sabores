"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { formatoMoneda } from "@/lib/formato";
import { guardarInsumo } from "./actions";
import type { Categoria, Proveedor, Unidad } from "./TablaInsumos";

const COLOR_ACCION = "#219653";

export interface InsumoEditable {
  id_materia_prima: number;
  nombre: string;
  precio_bulto: number;
  cantidad_bulto: number;
  densidad_g_ml: number | null;
  estado: boolean;
  id_categoria: number;
  id_unidad_compra: number;
  id_proveedor: number | null;
  categoria: { nombre: string } | null;
  proveedor: { razon_social: string } | null;
}

export default function FormularioInsumo({
  modo,
  categorias,
  unidades,
  proveedores,
}: {
  modo: "nuevo" | InsumoEditable;
  categorias: Categoria[];
  unidades: Unidad[];
  proveedores: Proveedor[];
}) {
  const router = useRouter();
  const esEdicion = modo !== "nuevo";
  const insumo = esEdicion ? modo : null;

  const [nombre, setNombre] = useState(insumo?.nombre ?? "");
  const [categoria, setCategoria] = useState(insumo?.categoria?.nombre ?? "");
  const [idUnidadMedida, setIdUnidadMedida] = useState(insumo ? String(insumo.id_unidad_compra) : "");
  const [precioBulto, setPrecioBulto] = useState(insumo ? String(insumo.precio_bulto) : "");
  const [cantidadBulto, setCantidadBulto] = useState(insumo ? String(insumo.cantidad_bulto) : "");
  const [proveedor, setProveedor] = useState(insumo?.proveedor?.razon_social ?? "");
  const [densidad, setDensidad] = useState(insumo?.densidad_g_ml != null ? String(insumo.densidad_g_ml) : "");
  const [estadoActivo, setEstadoActivo] = useState(insumo?.estado ?? true);
  const [registrarMotivo, setRegistrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const unidadSeleccionada = unidades.find((u) => String(u.id_unidad) === idUnidadMedida);
  const unidadBase = unidadSeleccionada
    ? unidades.find((u) => u.magnitud === unidadSeleccionada.magnitud && u.es_unidad_base)
    : undefined;

  const precioBultoNum = Number(precioBulto);
  const cantidadBultoNum = Number(cantidadBulto);
  const costoUnitario =
    precioBultoNum > 0 && cantidadBultoNum > 0 ? precioBultoNum / cantidadBultoNum : null;
  const costoBase =
    costoUnitario != null && unidadSeleccionada ? costoUnitario / unidadSeleccionada.factor_a_base : null;

  const cambioDePrecio =
    esEdicion && insumo !== null && (precioBultoNum !== insumo.precio_bulto || cantidadBultoNum !== insumo.cantidad_bulto);

  function confirmar() {
    setError(null);
    const formData = new FormData();
    if (insumo) formData.set("id_materia_prima", String(insumo.id_materia_prima));
    formData.set("nombre", nombre);
    formData.set("categoria", categoria);
    formData.set("id_unidad_medida", idUnidadMedida);
    formData.set("precio_bulto", precioBulto);
    formData.set("cantidad_bulto", cantidadBulto);
    formData.set("proveedor", proveedor);
    formData.set("densidad_g_ml", densidad);
    formData.set("estado", String(estadoActivo));
    formData.set("motivo", registrarMotivo ? motivo : "");

    iniciarTransicion(async () => {
      const resultado = await guardarInsumo({}, formData);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.push("/backoffice/insumos");
      }
    });
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Link href="/backoffice/insumos" style={{ color: "inherit", textDecoration: "none" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Volver</Typography>
          </Stack>
        </Link>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          {esEdicion ? "Editar insumo" : "Nuevo insumo"}
        </Typography>
      </Stack>

      <Box sx={{ maxWidth: 520, bgcolor: "white", border: "1px solid", borderColor: "divider", borderRadius: 3, p: 4 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Nombre del insumo
            </Typography>
            <TextField
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Ej. Harina de Trigo..."
              required
              fullWidth
              disabled={pendiente}
              autoFocus
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Categoría
            </Typography>
            <Autocomplete
              freeSolo
              options={categorias.map((c) => c.nombre)}
              value={categoria}
              onInputChange={(_evento, valor) => setCategoria(valor)}
              disabled={pendiente}
              renderInput={(params) => (
                <TextField {...params} placeholder="Elegí o escribí una nueva" required />
              )}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Unidad de medida
            </Typography>
            <TextField
              select
              value={idUnidadMedida}
              onChange={(evento) => setIdUnidadMedida(evento.target.value)}
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
          </Box>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Precio por bulto
              </Typography>
              <TextField
                type="number"
                value={precioBulto}
                onChange={(evento) => setPrecioBulto(evento.target.value)}
                placeholder="$ 0"
                slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
                required
                fullWidth
                disabled={pendiente}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Cantidad/peso del bulto
              </Typography>
              <TextField
                type="number"
                value={cantidadBulto}
                onChange={(evento) => setCantidadBulto(evento.target.value)}
                placeholder="0"
                slotProps={{ htmlInput: { step: "0.001", min: "0.001" } }}
                required
                fullWidth
                disabled={pendiente}
                helperText={unidadSeleccionada ? `En ${unidadSeleccionada.simbolo}` : undefined}
              />
            </Box>
          </Stack>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Precio unitario
            </Typography>
            <TextField
              value={costoUnitario != null ? formatoMoneda.format(costoUnitario) : ""}
              placeholder="$ 0,00"
              fullWidth
              disabled
              helperText={
                costoUnitario != null && unidadSeleccionada
                  ? `Costo base: ${
                      costoBase != null ? formatoMoneda.format(costoBase) : "—"
                    } por ${unidadBase?.simbolo ?? unidadSeleccionada.simbolo}`
                  : "Se calcula solo con el precio y el peso del bulto"
              }
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Proveedor
            </Typography>
            <Autocomplete
              freeSolo
              options={proveedores.map((p) => p.razon_social)}
              value={proveedor}
              onInputChange={(_evento, valor) => setProveedor(valor)}
              disabled={pendiente}
              renderInput={(params) => (
                <TextField {...params} placeholder="Elegí o escribí uno nuevo (opcional)" />
              )}
            />
          </Box>

          <TextField
            label="Densidad (g/ml)"
            type="number"
            value={densidad}
            onChange={(evento) => setDensidad(evento.target.value)}
            slotProps={{ htmlInput: { step: "0.0001", min: "0" } }}
            fullWidth
            disabled={pendiente}
            helperText="Opcional — solo si este insumo convierte entre masa y volumen en alguna receta"
          />

          {esEdicion && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Estado
              </Typography>
              <TextField
                select
                value={estadoActivo ? "true" : "false"}
                onChange={(evento) => setEstadoActivo(evento.target.value === "true")}
                fullWidth
                disabled={pendiente}
              >
                <MenuItem value="true">Activo</MenuItem>
                <MenuItem value="false">Inactivo</MenuItem>
              </TextField>
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

          <Button
            onClick={confirmar}
            variant="contained"
            size="large"
            disabled={pendiente || !nombre || !categoria || !idUnidadMedida || !precioBulto || !cantidadBulto}
            sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
