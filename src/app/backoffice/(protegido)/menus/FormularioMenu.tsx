"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { createClient as crearClienteNavegador } from "@/lib/supabase/client";
import { formatoMoneda } from "@/lib/formato";
import { guardarMenu } from "./actions";
import { TIPOS_PLATO } from "../recetas/mapeo";

const COLOR_ACCION = "#219653";

export interface MenuEditable {
  id_menu: number;
  nombre_menu: string;
  descripcion: string | null;
  pax_minimo: number;
  imagen_chica_url: string | null;
  imagen_banner_url: string | null;
  estado: boolean;
}

export interface RecetaDisponible {
  id_receta: number;
  nombre_plato: string;
  cantidad_porciones: number;
  costo_por_porcion: number | null;
  coeficiente_venta: number | null;
  /** Una receta inactiva igual puede seguir en un menú que ya la incluía (no se quita la línea) — solo deja de poder elegirse para una línea nueva. */
  estado: "BORRADOR" | "ACTIVA" | "INACTIVA";
}

export interface LineaExistente {
  id_menu_receta: number;
  id_receta: number;
  tipo_plato: string;
  orden: number;
}

interface FilaEditable {
  clave: string;
  id_receta: number;
  tipo_plato: string;
}

function nuevaClave(): string {
  return Math.random().toString(36).slice(2);
}

function marcaDeCache(): number {
  return Date.now();
}

function filaDesdeExistente(linea: LineaExistente): FilaEditable {
  return { clave: nuevaClave(), id_receta: linea.id_receta, tipo_plato: linea.tipo_plato };
}

export default function FormularioMenu({
  modo,
  lineasIniciales,
  recetasDisponibles,
  coeficienteVentaDefecto,
  puedeEditar,
}: {
  modo: "nuevo" | MenuEditable;
  lineasIniciales: LineaExistente[];
  recetasDisponibles: RecetaDisponible[];
  coeficienteVentaDefecto: number;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const esEdicion = modo !== "nuevo";
  const menu = esEdicion ? modo : null;
  const soloLectura = !puedeEditar;

  const [nombreMenu, setNombreMenu] = useState(menu?.nombre_menu ?? "");
  const [descripcion, setDescripcion] = useState(menu?.descripcion ?? "");
  const [paxMinimo, setPaxMinimo] = useState(menu ? String(menu.pax_minimo) : "");
  const [imagenChicaUrl, setImagenChicaUrl] = useState<string | null>(menu?.imagen_chica_url ?? null);
  const [imagenBannerUrl, setImagenBannerUrl] = useState<string | null>(menu?.imagen_banner_url ?? null);
  const [estado, setEstado] = useState(menu?.estado ?? false);
  const [lineas, setLineas] = useState<FilaEditable[]>(lineasIniciales.map(filaDesdeExistente));
  const [busqueda, setBusqueda] = useState<RecetaDisponible | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const [subiendoChica, setSubiendoChica] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const recetasIncluidasIds = new Set(lineas.map((l) => l.id_receta));
  const opcionesBusqueda = recetasDisponibles.filter(
    (r) => r.estado === "ACTIVA" && !recetasIncluidasIds.has(r.id_receta),
  );

  const paxMinimoRequerido = useMemo(() => {
    return lineas.reduce((maximo, linea) => {
      const receta = recetasDisponibles.find((r) => r.id_receta === linea.id_receta);
      return receta ? Math.max(maximo, receta.cantidad_porciones) : maximo;
    }, 0);
  }, [lineas, recetasDisponibles]);

  const paxMinimoInsuficiente = paxMinimoRequerido > 0 && Number(paxMinimo || 0) < paxMinimoRequerido;

  // Precio de cada receta incluida para la cantidad mínima cargada (costo × margen de la receta × cantidad mínima), así se ve de un vistazo cuánto sale el menú para esa cantidad de personas.
  const desglosePrecios = useMemo(() => {
    const cantidad = Number(paxMinimo) || 0;
    const filas = lineas.map((linea) => {
      const receta = recetasDisponibles.find((r) => r.id_receta === linea.id_receta);
      if (!receta || receta.costo_por_porcion == null) {
        return { clave: linea.clave, nombre: receta?.nombre_plato ?? "—", precio: null as number | null };
      }
      const coeficiente = receta.coeficiente_venta ?? coeficienteVentaDefecto;
      const precioPorPorcion = receta.costo_por_porcion * coeficiente;
      return { clave: linea.clave, nombre: receta.nombre_plato, precio: precioPorPorcion * cantidad };
    });
    const total = filas.reduce((acumulado, fila) => acumulado + (fila.precio ?? 0), 0);
    return { filas, total, cantidad };
  }, [lineas, recetasDisponibles, paxMinimo, coeficienteVentaDefecto]);

  async function subirImagen(archivo: File, tipo: "chica" | "banner") {
    setErrorFoto(null);
    if (tipo === "chica") setSubiendoChica(true);
    else setSubiendoBanner(true);

    const supabaseNavegador = crearClienteNavegador();
    const extension = archivo.name.split(".").pop() || "jpg";
    const idParaRuta = menu?.id_menu ?? `nuevo-${nuevaClave()}`;
    const ruta = `menu-${idParaRuta}-${tipo}.${extension}`;

    const { error: errorSubida } = await supabaseNavegador.storage
      .from("menu-fotos")
      .upload(ruta, archivo, { upsert: true });

    if (errorSubida) {
      setErrorFoto(errorSubida.message);
      if (tipo === "chica") setSubiendoChica(false);
      else setSubiendoBanner(false);
      return;
    }

    const { data } = supabaseNavegador.storage.from("menu-fotos").getPublicUrl(ruta);
    const urlConVersion = `${data.publicUrl}?v=${marcaDeCache()}`;

    if (tipo === "chica") {
      setImagenChicaUrl(urlConVersion);
      setSubiendoChica(false);
    } else {
      setImagenBannerUrl(urlConVersion);
      setSubiendoBanner(false);
    }
  }

  function agregarReceta(receta: RecetaDisponible | null) {
    if (!receta) return;
    setLineas((actual) => [...actual, { clave: nuevaClave(), id_receta: receta.id_receta, tipo_plato: "" }]);
    setBusqueda(null);
  }

  function quitarLinea(clave: string) {
    setLineas((actual) => actual.filter((linea) => linea.clave !== clave));
  }

  function actualizarLinea(clave: string, tipoPlato: string) {
    setLineas((actual) => actual.map((linea) => (linea.clave === clave ? { ...linea, tipo_plato: tipoPlato } : linea)));
  }

  function guardar() {
    setError(null);

    if (paxMinimoInsuficiente) {
      setError(
        `La cantidad mínima de personas no puede ser menor a ${paxMinimoRequerido}, que es lo que exige la receta más exigente incluida.`,
      );
      return;
    }

    const lineasSinTipo = lineas.some((linea) => !linea.tipo_plato);
    if (lineasSinTipo) {
      setError("Elegí el tipo de plato para cada receta incluida.");
      return;
    }

    if (!imagenChicaUrl || !imagenBannerUrl) {
      setError("Subí las dos fotos (chica y banner) antes de guardar.");
      return;
    }

    iniciarTransicion(async () => {
      const resultado = await guardarMenu({
        idMenu: menu?.id_menu ?? null,
        nombreMenu,
        descripcion,
        paxMinimo: Number(paxMinimo),
        imagenChicaUrl,
        imagenBannerUrl,
        estado,
        lineas: lineas.map((linea) => ({ id_receta: linea.id_receta, tipo_plato: linea.tipo_plato })),
      });

      if (resultado?.error) {
        setError(resultado.error);
      } else if (menu) {
        router.refresh();
      }
    });
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Link href="/backoffice/menus" style={{ color: "inherit", textDecoration: "none" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Volver</Typography>
          </Stack>
        </Link>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          {esEdicion ? "Editar menú" : "Nuevo menú"}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {error && <Alert severity="error">{error}</Alert>}
          {errorFoto && <Alert severity="error">{errorFoto}</Alert>}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Nombre del menú"
                value={nombreMenu}
                onChange={(evento) => setNombreMenu(evento.target.value)}
                placeholder="Ej. Brunch Ejecutivo"
                required
                fullWidth
                disabled={soloLectura || pendiente}
                autoFocus
              />
              <TextField
                label="Descripción"
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={soloLectura || pendiente}
              />
              <TextField
                label="Cantidad mínima de personas"
                type="number"
                value={paxMinimo}
                onChange={(evento) => setPaxMinimo(evento.target.value)}
                slotProps={{ htmlInput: { min: "1", step: "1" } }}
                required
                fullWidth
                disabled={soloLectura || pendiente}
                error={paxMinimoInsuficiente}
                helperText={
                  paxMinimoInsuficiente
                    ? `No puede ser menor a ${paxMinimoRequerido} (lo que exige la receta más exigente incluida).`
                    : "Cantidad mínima de personas o unidades para utilizar este menú."
                }
              />

              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Imagen chica (405×240px)
                  </Typography>
                  <Button
                    component="label"
                    disabled={soloLectura || subiendoChica}
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
                    disabled={soloLectura || subiendoBanner}
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
                  value={estado ? "true" : "false"}
                  onChange={(evento) => setEstado(evento.target.value === "true")}
                  fullWidth
                  disabled={soloLectura || pendiente}
                >
                  <MenuItem value="true">Activo</MenuItem>
                  <MenuItem value="false">Inactivo</MenuItem>
                </TextField>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Recetas del menú
            </Typography>

            {!soloLectura && (
              <Autocomplete
                options={opcionesBusqueda}
                getOptionLabel={(opcion) => opcion.nombre_plato}
                value={busqueda}
                onChange={(_evento, valor) => agregarReceta(valor)}
                isOptionEqualToValue={(opcion, valor) => opcion.id_receta === valor.id_receta}
                disabled={pendiente}
                renderInput={(params) => <TextField {...params} placeholder="Buscar receta para agregar…" />}
                sx={{ mb: 2 }}
              />
            )}

            {lineas.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Buscá y agregá recetas al menú.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {lineas.map((linea, indice) => {
                  const receta = recetasDisponibles.find((r) => r.id_receta === linea.id_receta);
                  return (
                    <Stack
                      key={linea.clave}
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "center", bgcolor: "background.default", borderRadius: 1, p: 1.5 }}
                    >
                      <Typography color="text.secondary" sx={{ width: 20 }}>
                        {indice + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {receta
                            ? receta.estado === "ACTIVA"
                              ? receta.nombre_plato
                              : `${receta.nombre_plato} (Inactiva)`
                            : "—"}
                        </Typography>
                      </Box>
                      <TextField
                        size="small"
                        select
                        value={linea.tipo_plato}
                        onChange={(evento) => actualizarLinea(linea.clave, evento.target.value)}
                        disabled={soloLectura || pendiente}
                        sx={{ minWidth: 160 }}
                      >
                        {TIPOS_PLATO.map((tipo) => (
                          <MenuItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      {!soloLectura && (
                        <IconButton size="small" onClick={() => quitarLinea(linea.clave)} disabled={pendiente}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {!soloLectura && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button onClick={() => router.push("/backoffice/menus")} disabled={pendiente}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={guardar}
                disabled={pendiente}
                sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
              >
                {pendiente ? "Guardando…" : "Guardar menú"}
              </Button>
            </Box>
          )}
        </Stack>

        <Stack spacing={3} sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, position: { md: "sticky" }, top: { md: 16 } }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Recetas incluidas
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {lineas.length}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Cantidad mínima
              </Typography>
              <Typography sx={{ fontWeight: 700, color: COLOR_ACCION }}>{paxMinimo || 0} pers.</Typography>
            </Box>

            {desglosePrecios.filas.length > 0 && (
              <>
                <Stack spacing={0.75} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                  {desglosePrecios.filas.map((fila) => (
                    <Box key={fila.clave} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {fila.nombre}
                      </Typography>
                      <Typography variant="body2" sx={{ flexShrink: 0 }}>
                        {fila.precio != null ? formatoMoneda.format(fila.precio) : "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>Total menú ({desglosePrecios.cantidad} pers.)</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(desglosePrecios.total)}</Typography>
                </Box>
              </>
            )}
          </Paper>

          {!soloLectura && (
            <Button
              variant="contained"
              onClick={guardar}
              disabled={pendiente}
              size="large"
              sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
            >
              {pendiente ? "Guardando…" : "Guardar menú"}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
