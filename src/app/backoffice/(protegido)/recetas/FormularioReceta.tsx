"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Decimal from "decimal.js";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { formatoMoneda } from "@/lib/formato";
import { costearLinea, coeficienteDesdeMargenSobreCosto, margenSobreCosto, ErrorCantidadInvalida, ErrorUnidadesIncompatibles } from "@/domain/costeo";
import { createClient as crearClienteNavegador } from "@/lib/supabase/client";
import { actualizarVentaIndividualReceta, guardarReceta } from "./actions";
import { insumoDominio, unidadDominio, TIPOS_PLATO, type InsumoCatalogo, type UnidadCatalogo } from "./mapeo";

const COLOR_ACCION = "#219653";

export interface RecetaEditable {
  id_receta: number;
  nombre_plato: string;
  descripcion_publica: string | null;
  tipo_plato: string;
  cantidad_porciones: number;
  merma_pct: number;
  mano_obra_pct: number;
  imagen_chica_url: string | null;
  imagen_banner_url: string | null;
  estado: "BORRADOR" | "ACTIVA" | "INACTIVA";
  coeficiente_venta: number | null;
}

export interface LineaExistente {
  id_detalle: number;
  id_materia_prima: number;
  cantidad_usada: number;
  id_unidad_receta: number;
  orden: number;
}

interface FilaEditable {
  clave: string;
  id_materia_prima: number | "";
  cantidad_usada: string;
  id_unidad_receta: number | "";
}

function nuevaClave(): string {
  return Math.random().toString(36).slice(2);
}

function marcaDeCache(): number {
  return Date.now();
}

function filaDesdeExistente(linea: LineaExistente): FilaEditable {
  return {
    clave: nuevaClave(),
    id_materia_prima: linea.id_materia_prima,
    cantidad_usada: String(linea.cantidad_usada),
    id_unidad_receta: linea.id_unidad_receta,
  };
}

export default function FormularioReceta({
  modo,
  lineasIniciales,
  insumos,
  unidades,
  puedeEditarComposicion,
  puedeEditarMargen,
}: {
  modo: "nuevo" | RecetaEditable;
  lineasIniciales: LineaExistente[];
  insumos: InsumoCatalogo[];
  unidades: UnidadCatalogo[];
  puedeEditarComposicion: boolean;
  puedeEditarMargen: boolean;
}) {
  const router = useRouter();
  const esEdicion = modo !== "nuevo";
  const receta = esEdicion ? modo : null;
  const soloLecturaComposicion = !puedeEditarComposicion;

  const [nombrePlato, setNombrePlato] = useState(receta?.nombre_plato ?? "");
  const [descripcion, setDescripcion] = useState(receta?.descripcion_publica ?? "");
  const [tipoPlato, setTipoPlato] = useState(receta?.tipo_plato ?? "");
  const [cantidadPorciones, setCantidadPorciones] = useState(receta ? String(receta.cantidad_porciones) : "");
  const [mermaPct, setMermaPct] = useState(receta ? String(receta.merma_pct) : "0");
  const [manoObraPct, setManoObraPct] = useState(receta ? String(receta.mano_obra_pct) : "0");
  const [imagenChicaUrl, setImagenChicaUrl] = useState<string | null>(receta?.imagen_chica_url ?? null);
  const [imagenBannerUrl, setImagenBannerUrl] = useState<string | null>(receta?.imagen_banner_url ?? null);
  const [estado, setEstado] = useState<RecetaEditable["estado"]>(receta?.estado ?? "BORRADOR");
  const [lineas, setLineas] = useState<FilaEditable[]>(lineasIniciales.map(filaDesdeExistente));
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const [subiendoChica, setSubiendoChica] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const margenInicial = receta?.coeficiente_venta != null ? margenSobreCosto(new Decimal(receta.coeficiente_venta)) : null;
  const [margenPct, setMargenPct] = useState(margenInicial ? margenInicial.times(100).toFixed(2) : "");
  const [errorMargen, setErrorMargen] = useState<string | null>(null);
  const [guardandoMargen, iniciarGuardadoMargen] = useTransition();

  async function subirImagen(archivo: File, tipo: "chica" | "banner") {
    setErrorFoto(null);
    if (tipo === "chica") setSubiendoChica(true);
    else setSubiendoBanner(true);

    const supabaseNavegador = crearClienteNavegador();
    const extension = archivo.name.split(".").pop() || "jpg";
    const idParaRuta = receta?.id_receta ?? `nueva-${nuevaClave()}`;
    const ruta = `receta-${idParaRuta}-${tipo}.${extension}`;

    const { error: errorSubida } = await supabaseNavegador.storage
      .from("receta-imagenes")
      .upload(ruta, archivo, { upsert: true });

    if (errorSubida) {
      setErrorFoto(errorSubida.message);
      if (tipo === "chica") setSubiendoChica(false);
      else setSubiendoBanner(false);
      return;
    }

    const { data } = supabaseNavegador.storage.from("receta-imagenes").getPublicUrl(ruta);
    const urlConVersion = `${data.publicUrl}?v=${marcaDeCache()}`;

    if (tipo === "chica") {
      setImagenChicaUrl(urlConVersion);
      setSubiendoChica(false);
    } else {
      setImagenBannerUrl(urlConVersion);
      setSubiendoBanner(false);
    }
  }

  function agregarLinea() {
    setLineas((actual) => [
      ...actual,
      { clave: nuevaClave(), id_materia_prima: "", cantidad_usada: "", id_unidad_receta: "" },
    ]);
  }

  function quitarLinea(clave: string) {
    setLineas((actual) => actual.filter((linea) => linea.clave !== clave));
  }

  function actualizarLinea(clave: string, cambios: Partial<FilaEditable>) {
    setLineas((actual) => actual.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)));
  }

  const calculo = useMemo(() => {
    const resultados = new Map<string, { costoLinea: Decimal } | string>();
    let costoInsumos = new Decimal(0);

    for (const linea of lineas) {
      if (linea.id_materia_prima === "" || linea.id_unidad_receta === "" || !linea.cantidad_usada) {
        continue;
      }
      const insumoDb = insumos.find((i) => i.id_materia_prima === linea.id_materia_prima);
      const unidadReceta = unidades.find((u) => u.id_unidad === linea.id_unidad_receta);
      if (!insumoDb || !unidadReceta) continue;

      const insumo = insumoDominio(insumoDb, unidades);
      if (!insumo) {
        resultados.set(linea.clave, `El insumo "${insumoDb.nombre}" no tiene unidad de compra válida.`);
        continue;
      }

      try {
        const resultado = costearLinea({
          insumo,
          cantidadUsada: new Decimal(linea.cantidad_usada || 0),
          unidadReceta: unidadDominio(unidadReceta),
        });
        resultados.set(linea.clave, resultado);
        costoInsumos = costoInsumos.plus(resultado.costoLinea);
      } catch (excepcion) {
        let mensaje = "No se pudo calcular esta línea.";
        if (excepcion instanceof ErrorUnidadesIncompatibles || excepcion instanceof ErrorCantidadInvalida) {
          mensaje = excepcion.message;
        }
        resultados.set(linea.clave, mensaje);
      }
    }

    const merma = new Decimal(mermaPct || 0);
    const manoObra = new Decimal(manoObraPct || 0);
    const mermaMonto = costoInsumos.times(merma.dividedBy(100));
    const manoObraMonto = costoInsumos.times(manoObra.dividedBy(100));
    const costoTotal = costoInsumos.plus(mermaMonto).plus(manoObraMonto);
    const porciones = Number(cantidadPorciones) || 0;
    const costoPorPorcion = porciones > 0 ? costoTotal.dividedBy(porciones) : new Decimal(0);

    return { resultados, costoInsumos, mermaMonto, manoObraMonto, costoTotal, costoPorPorcion };
  }, [lineas, insumos, unidades, mermaPct, manoObraPct, cantidadPorciones]);

  function guardarMargen() {
    if (!receta) return;
    setErrorMargen(null);
    iniciarGuardadoMargen(async () => {
      const coeficiente = margenPct.trim() ? coeficienteDesdeMargenSobreCosto(new Decimal(margenPct)).toNumber() : null;
      const resultado = await actualizarVentaIndividualReceta({
        idReceta: receta.id_receta,
        coeficienteVenta: coeficiente,
        descripcionPublica: descripcion.trim() || null,
      });
      if (resultado.error) {
        setErrorMargen(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  function guardar() {
    setError(null);

    const lineasValidas = lineas.filter(
      (linea) => linea.id_materia_prima !== "" && linea.id_unidad_receta !== "" && linea.cantidad_usada,
    );

    if (lineasValidas.length !== lineas.length) {
      setError("Completá o quitá las líneas incompletas antes de guardar.");
      return;
    }

    const hayErrores = lineas.some((linea) => typeof calculo.resultados.get(linea.clave) === "string");
    if (hayErrores) {
      setError("Corregí las líneas marcadas en rojo antes de guardar.");
      return;
    }

    if (!imagenChicaUrl || !imagenBannerUrl) {
      setError("Subí las dos fotos (chica y banner) antes de guardar.");
      return;
    }

    iniciarTransicion(async () => {
      const resultado = await guardarReceta({
        idReceta: receta?.id_receta ?? null,
        nombrePlato,
        descripcionPublica: descripcion,
        tipoPlato,
        cantidadPorciones: Number(cantidadPorciones),
        mermaPct: Number(mermaPct || 0),
        manoObraPct: Number(manoObraPct || 0),
        imagenChicaUrl,
        imagenBannerUrl,
        estado,
        lineas: lineasValidas.map((linea) => ({
          id_materia_prima: Number(linea.id_materia_prima),
          cantidad_usada: Number(linea.cantidad_usada),
          id_unidad_receta: Number(linea.id_unidad_receta),
        })),
      });

      if (resultado?.error) {
        setError(resultado.error);
      } else if (receta) {
        router.refresh();
      }
    });
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Link href="/backoffice/recetas" style={{ color: "inherit", textDecoration: "none" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Volver</Typography>
          </Stack>
        </Link>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          {esEdicion ? "Editar receta" : "Nueva receta"}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {error && <Alert severity="error">{error}</Alert>}
          {errorFoto && <Alert severity="error">{errorFoto}</Alert>}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Nombre de la receta"
                value={nombrePlato}
                onChange={(evento) => setNombrePlato(evento.target.value)}
                required
                fullWidth
                disabled={soloLecturaComposicion || pendiente}
                autoFocus
              />
              <TextField
                label="Descripción"
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={soloLecturaComposicion || pendiente}
              />
              <TextField
                label="Tipo de plato"
                select
                value={tipoPlato}
                onChange={(evento) => setTipoPlato(evento.target.value)}
                required
                fullWidth
                disabled={soloLecturaComposicion || pendiente}
              >
                {TIPOS_PLATO.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Imagen chica (405×240px)
                  </Typography>
                  <Button
                    component="label"
                    disabled={soloLecturaComposicion || subiendoChica}
                    sx={{
                      width: "100%",
                      height: 100,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 1,
                      backgroundImage: imagenChicaUrl ? `url(${imagenChicaUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "text.secondary",
                    }}
                  >
                    {!imagenChicaUrl && (
                      <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                        <PhotoCameraOutlinedIcon fontSize="small" />
                        <Typography variant="caption">
                          {subiendoChica ? "Subiendo…" : "Subir imagen chica"}
                        </Typography>
                      </Stack>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(evento) => {
                        const archivo = evento.target.files?.[0];
                        if (archivo) subirImagen(archivo, "chica");
                        evento.target.value = "";
                      }}
                    />
                  </Button>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Imagen banner (1280×440px)
                  </Typography>
                  <Button
                    component="label"
                    disabled={soloLecturaComposicion || subiendoBanner}
                    sx={{
                      width: "100%",
                      height: 100,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 1,
                      backgroundImage: imagenBannerUrl ? `url(${imagenBannerUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "text.secondary",
                    }}
                  >
                    {!imagenBannerUrl && (
                      <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                        <ImageOutlinedIcon fontSize="small" />
                        <Typography variant="caption">
                          {subiendoBanner ? "Subiendo…" : "Subir imagen banner"}
                        </Typography>
                      </Stack>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(evento) => {
                        const archivo = evento.target.files?.[0];
                        if (archivo) subirImagen(archivo, "banner");
                        evento.target.value = "";
                      }}
                    />
                  </Button>
                </Box>
              </Stack>

              {esEdicion && (
                <TextField
                  label="Estado"
                  select
                  value={estado}
                  onChange={(evento) => setEstado(evento.target.value as RecetaEditable["estado"])}
                  fullWidth
                  disabled={soloLecturaComposicion || pendiente}
                >
                  <MenuItem value="BORRADOR">Borrador</MenuItem>
                  <MenuItem value="ACTIVA">Activo</MenuItem>
                  <MenuItem value="INACTIVA">Inactivo</MenuItem>
                </TextField>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Parámetros de costo
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: "wrap" }}>
              <TextField
                label="Merma (%)"
                type="number"
                value={mermaPct}
                onChange={(evento) => setMermaPct(evento.target.value)}
                slotProps={{ htmlInput: { step: "0.1", min: "0", max: "99.9" } }}
                sx={{ flex: 1, minWidth: 140 }}
                disabled={soloLecturaComposicion || pendiente}
              />
              <TextField
                label="Mano de obra (%)"
                type="number"
                value={manoObraPct}
                onChange={(evento) => setManoObraPct(evento.target.value)}
                slotProps={{ htmlInput: { step: "0.1", min: "0" } }}
                sx={{ flex: 1, minWidth: 140 }}
                disabled={soloLecturaComposicion || pendiente}
              />
              <Box sx={{ flex: 1.4, minWidth: 220 }}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Margen (%)"
                    type="number"
                    value={margenPct}
                    onChange={(evento) => setMargenPct(evento.target.value)}
                    slotProps={{ htmlInput: { step: "0.1", min: "0" } }}
                    sx={{ flex: 1, minWidth: 0 }}
                    disabled={!esEdicion || !puedeEditarMargen || guardandoMargen}
                    helperText={!esEdicion ? "Se define al editar la receta ya creada" : undefined}
                  />
                  {esEdicion && puedeEditarMargen && (
                    <Button
                      onClick={guardarMargen}
                      disabled={guardandoMargen}
                      variant="outlined"
                      size="small"
                      sx={{ flexShrink: 0, alignSelf: "flex-start", mt: 1 }}
                    >
                      {guardandoMargen ? "…" : "Guardar"}
                    </Button>
                  )}
                </Stack>
                {errorMargen && (
                  <Typography variant="caption" color="error">
                    {errorMargen}
                  </Typography>
                )}
              </Box>
            </Stack>

            <TextField
              label="Cantidad mínima de platos (personas que cubre esta receta)"
              type="number"
              value={cantidadPorciones}
              onChange={(evento) => setCantidadPorciones(evento.target.value)}
              slotProps={{ htmlInput: { min: "1", step: "1" } }}
              required
              fullWidth
              disabled={soloLecturaComposicion || pendiente}
              helperText="Este valor se usará como cantidad mínima de personas que puede cubrir esta receta."
            />
          </Paper>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Ingredientes</Typography>
            {!soloLecturaComposicion && (
              <Button variant="contained" onClick={agregarLinea} disabled={pendiente}>
                + Agregar insumo
              </Button>
            )}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              overflowX: "auto",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": { height: 10 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 5 },
            }}
          >
            {lineas.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3 }}>
                Todavía no agregaste ingredientes.
              </Typography>
            ) : (
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Insumo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Unidad</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      Subtotal
                    </TableCell>
                    {!soloLecturaComposicion && <TableCell />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineas.map((linea) => {
                    const resultado = calculo.resultados.get(linea.clave);
                    const insumoSeleccionado =
                      insumos.find((insumo) => insumo.id_materia_prima === linea.id_materia_prima) ?? null;

                    return (
                      <TableRow key={linea.clave}>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Autocomplete
                            size="small"
                            options={insumos}
                            getOptionLabel={(opcion) => opcion.nombre}
                            value={insumoSeleccionado}
                            onChange={(_evento, valor) =>
                              actualizarLinea(linea.clave, { id_materia_prima: valor?.id_materia_prima ?? "" })
                            }
                            disabled={soloLecturaComposicion || pendiente}
                            renderInput={(params) => <TextField {...params} placeholder="Seleccionar insumo…" />}
                            isOptionEqualToValue={(opcion, valor) => opcion.id_materia_prima === valor.id_materia_prima}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={linea.cantidad_usada}
                            onChange={(evento) => actualizarLinea(linea.clave, { cantidad_usada: evento.target.value })}
                            slotProps={{ htmlInput: { step: "0.001", min: "0" } }}
                            disabled={soloLecturaComposicion || pendiente}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <TextField
                            size="small"
                            select
                            value={linea.id_unidad_receta}
                            onChange={(evento) =>
                              actualizarLinea(linea.clave, { id_unidad_receta: Number(evento.target.value) })
                            }
                            disabled={soloLecturaComposicion || pendiente}
                            fullWidth
                          >
                            {unidades.map((unidad) => (
                              <MenuItem key={unidad.id_unidad} value={unidad.id_unidad}>
                                {unidad.simbolo}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell align="right">
                          {resultado && typeof resultado !== "string" ? (
                            formatoMoneda.format(resultado.costoLinea.toNumber())
                          ) : resultado ? (
                            <Chip label={resultado} color="error" size="small" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        {!soloLecturaComposicion && (
                          <TableCell>
                            <IconButton size="small" onClick={() => quitarLinea(linea.clave)} disabled={pendiente}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>

          {!soloLecturaComposicion && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button onClick={() => router.push("/backoffice/recetas")} disabled={pendiente}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={guardar}
                disabled={pendiente}
                sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
              >
                {pendiente ? "Guardando…" : "Guardar receta"}
              </Button>
            </Box>
          )}
        </Stack>

        <Paper
          variant="outlined"
          sx={{ p: 3, width: { xs: "100%", md: 300 }, flexShrink: 0, position: { md: "sticky" }, top: { md: 16 } }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Resumen de costo
          </Typography>

          <Stack spacing={1}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Costo de insumos
              </Typography>
              <Typography variant="body2">{formatoMoneda.format(calculo.costoInsumos.toNumber())}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Merma ({mermaPct || 0}%)
              </Typography>
              <Typography variant="body2">{formatoMoneda.format(calculo.mermaMonto.toNumber())}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Mano de obra ({manoObraPct || 0}%)
              </Typography>
              <Typography variant="body2">{formatoMoneda.format(calculo.manoObraMonto.toNumber())}</Typography>
            </Box>
          </Stack>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Typography sx={{ fontWeight: 700 }}>Costo total producción</Typography>
            <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(calculo.costoTotal.toNumber())}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Margen ingresado
            </Typography>
            <Typography variant="body2">{margenPct ? `${margenPct}%` : "—"}</Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Min. personas (receta)
            </Typography>
            <Typography variant="body2">{cantidadPorciones || 0}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Estado
            </Typography>
            <Chip
              label={estado === "ACTIVA" ? "Activo" : estado === "INACTIVA" ? "Inactivo" : "Borrador"}
              size="small"
              color={estado === "ACTIVA" ? "success" : estado === "INACTIVA" ? "default" : "warning"}
            />
          </Box>

          <Box sx={{ mt: 2.5, p: 2, bgcolor: "#E3F7EA", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
              ¿Cómo se calcula?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Costo total = Insumos + Merma + Mano de obra.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Los % de merma, mano de obra y margen se ingresan manualmente.
            </Typography>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
