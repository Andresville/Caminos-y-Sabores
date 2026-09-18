"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import CloseIcon from "@mui/icons-material/Close";
import Avatar from "@mui/material/Avatar";
import Link from "@mui/material/Link";
import AddIcon from "@mui/icons-material/Add";
import { formatoMoneda } from "@/lib/formato";
import { margenSobreVenta } from "@/domain/costeo";
import { createClient as crearClienteNavegador } from "@/lib/supabase/client";
import { TIPOS_PLATO } from "../../recetas/mapeo";
import { calcularPrecioMenu, type ParametrosComerciales } from "../calculo";
import { actualizarCoeficienteMenu, actualizarFotoPlatoMenu, guardarComposicionMenu } from "../actions";

export interface MenuExistente {
  id_menu: number;
  nombre_menu: string;
  descripcion: string | null;
  pax_minimo: number;
  coeficiente_venta: number;
  estado: boolean;
}

export interface LineaMenuExistente {
  id_menu_receta: number;
  id_receta: number;
  tipo_plato: string;
  porciones_por_pax: number;
  orden: number;
}

export interface RecetaDisponible {
  id_receta: number;
  nombre_plato: string;
  costo_por_porcion: number;
}

interface FilaEditable {
  clave: string;
  id_receta: number | "";
  tipo_plato: string;
  porciones_por_pax: string;
}

function nuevaClave(): string {
  return Math.random().toString(36).slice(2);
}

// Función aparte (no inline) para que el linter de reglas de React no la confunda con una llamada impura durante el render: solo se invoca desde un handler de subida de archivo.
function marcaDeCache(): number {
  return Date.now();
}

function filaDesdeExistente(linea: LineaMenuExistente): FilaEditable {
  return {
    clave: nuevaClave(),
    id_receta: linea.id_receta,
    tipo_plato: linea.tipo_plato,
    porciones_por_pax: String(linea.porciones_por_pax),
  };
}

export default function EditorMenu({
  menu,
  lineasIniciales,
  recetasDisponibles,
  parametrosComerciales,
  puedeEditarComposicion,
  puedeEditarCoeficiente,
  fotosPorRecetaIniciales,
}: {
  menu: MenuExistente;
  lineasIniciales: LineaMenuExistente[];
  recetasDisponibles: RecetaDisponible[];
  parametrosComerciales: ParametrosComerciales;
  puedeEditarComposicion: boolean;
  puedeEditarCoeficiente: boolean;
  fotosPorRecetaIniciales: Record<number, string>;
}) {
  const router = useRouter();

  const [nombreMenu, setNombreMenu] = useState(menu.nombre_menu);
  const [descripcion, setDescripcion] = useState(menu.descripcion ?? "");
  const [paxMinimo, setPaxMinimo] = useState(String(menu.pax_minimo));
  const [estado, setEstado] = useState(menu.estado);
  const [lineas, setLineas] = useState<FilaEditable[]>(lineasIniciales.map(filaDesdeExistente));
  const [coeficienteVenta, setCoeficienteVenta] = useState(String(menu.coeficiente_venta));
  const [fotos, setFotos] = useState<Record<number, string>>(fotosPorRecetaIniciales);
  const [subiendoFotoDe, setSubiendoFotoDe] = useState<number | null>(null);

  const [errorComposicion, setErrorComposicion] = useState<string | null>(null);
  const [errorCoeficiente, setErrorCoeficiente] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [guardandoComposicion, iniciarGuardadoComposicion] = useTransition();
  const [guardandoCoeficiente, iniciarGuardadoCoeficiente] = useTransition();

  async function subirFoto(idReceta: number, archivo: File) {
    setErrorFoto(null);
    setSubiendoFotoDe(idReceta);

    const supabaseNavegador = crearClienteNavegador();
    const extension = archivo.name.split(".").pop() || "jpg";
    const ruta = `menu-${menu.id_menu}-receta-${idReceta}.${extension}`;

    const { error: errorSubida } = await supabaseNavegador.storage
      .from("menu-imagenes")
      .upload(ruta, archivo, { upsert: true });

    if (errorSubida) {
      setErrorFoto(errorSubida.message);
      setSubiendoFotoDe(null);
      return;
    }

    const { data } = supabaseNavegador.storage.from("menu-imagenes").getPublicUrl(ruta);
    // Cache-bust: la ruta no cambia al reemplazar la foto, así que sin esto el navegador seguiría mostrando la vieja.
    const urlConVersion = `${data.publicUrl}?v=${marcaDeCache()}`;

    const resultado = await actualizarFotoPlatoMenu(menu.id_menu, idReceta, urlConVersion);
    setSubiendoFotoDe(null);

    if (resultado.error) {
      setErrorFoto(resultado.error);
      return;
    }
    setFotos((actual) => ({ ...actual, [idReceta]: urlConVersion }));
  }

  async function quitarFoto(idReceta: number) {
    setErrorFoto(null);
    setSubiendoFotoDe(idReceta);
    const resultado = await actualizarFotoPlatoMenu(menu.id_menu, idReceta, null);
    setSubiendoFotoDe(null);
    if (resultado.error) {
      setErrorFoto(resultado.error);
      return;
    }
    setFotos((actual) => {
      const restantes = { ...actual };
      delete restantes[idReceta];
      return restantes;
    });
  }

  function agregarLinea() {
    setLineas((actual) => [
      ...actual,
      { clave: nuevaClave(), id_receta: "", tipo_plato: "", porciones_por_pax: "1" },
    ]);
  }

  function quitarLinea(clave: string) {
    setLineas((actual) => actual.filter((linea) => linea.clave !== clave));
  }

  function actualizarLinea(clave: string, cambios: Partial<FilaEditable>) {
    setLineas((actual) => actual.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)));
  }

  const calculo = useMemo(() => {
    const recetasValidas = lineas
      .filter((linea) => linea.id_receta !== "" && linea.porciones_por_pax)
      .map((linea) => {
        const receta = recetasDisponibles.find((r) => r.id_receta === linea.id_receta);
        if (!receta) return null;
        return {
          costoPorPorcion: new Decimal(receta.costo_por_porcion),
          porcionesPorPax: new Decimal(linea.porciones_por_pax || 0),
        };
      })
      .filter((r): r is { costoPorPorcion: Decimal; porcionesPorPax: Decimal } => r !== null);

    const coeficiente = Number(coeficienteVenta) || 1;
    return calcularPrecioMenu(recetasValidas, coeficiente, parametrosComerciales);
  }, [lineas, recetasDisponibles, coeficienteVenta, parametrosComerciales]);

  function guardarComposicion() {
    setErrorComposicion(null);

    const lineasValidas = lineas.filter(
      (linea) => linea.id_receta !== "" && linea.tipo_plato && linea.porciones_por_pax,
    );

    if (lineasValidas.length !== lineas.length) {
      setErrorComposicion("Completá o quitá las líneas incompletas antes de guardar.");
      return;
    }

    iniciarGuardadoComposicion(async () => {
      const resultado = await guardarComposicionMenu({
        idMenu: menu.id_menu,
        nombreMenu,
        descripcion,
        paxMinimo: Number(paxMinimo),
        estado,
        lineas: lineasValidas.map((linea) => ({
          id_receta: Number(linea.id_receta),
          tipo_plato: linea.tipo_plato,
          porciones_por_pax: Number(linea.porciones_por_pax),
        })),
      });

      if (resultado.error) {
        setErrorComposicion(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  function guardarCoeficiente() {
    setErrorCoeficiente(null);

    iniciarGuardadoCoeficiente(async () => {
      const resultado = await actualizarCoeficienteMenu(menu.id_menu, Number(coeficienteVenta));
      if (resultado.error) {
        setErrorCoeficiente(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  const soloLecturaComposicion = !puedeEditarComposicion;
  const margen = margenSobreVenta(new Decimal(Number(coeficienteVenta) || 1));

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Nombre del menú"
            value={nombreMenu}
            onChange={(evento) => setNombreMenu(evento.target.value)}
            fullWidth
            disabled={soloLecturaComposicion || guardandoComposicion}
          />
          <TextField
            label="Pax mínimo"
            type="number"
            value={paxMinimo}
            onChange={(evento) => setPaxMinimo(evento.target.value)}
            slotProps={{ htmlInput: { min: "1", step: "1" } }}
            fullWidth
            disabled={soloLecturaComposicion || guardandoComposicion}
          />
          <TextField
            label="Estado"
            select
            value={estado ? "true" : "false"}
            onChange={(evento) => setEstado(evento.target.value === "true")}
            fullWidth
            disabled={soloLecturaComposicion || guardandoComposicion}
          >
            <MenuItem value="true">Activo</MenuItem>
            <MenuItem value="false">Inactivo</MenuItem>
          </TextField>
        </Stack>
        <TextField
          label="Descripción comercial"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 2 }}
          disabled={soloLecturaComposicion || guardandoComposicion}
        />
      </Paper>

      {errorFoto && <Alert severity="error">{errorFoto}</Alert>}

      {errorComposicion && <Alert severity="error">{errorComposicion}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Recetas incluidas</Typography>
        {puedeEditarComposicion && (
          <Button variant="contained" onClick={agregarLinea} disabled={guardandoComposicion}>
            + Agregar receta
          </Button>
        )}
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: 10 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 5 },
          }}
        >
          {lineas.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              Todavía no agregaste recetas.
            </Typography>
          ) : (
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 72 }}>Foto</TableCell>
                  <TableCell sx={{ width: 160 }}>Paso</TableCell>
                  <TableCell>Receta</TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>
                    Porciones x pax
                  </TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>
                    Costo x porción
                  </TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>
                    Subtotal x pax
                  </TableCell>
                  {puedeEditarComposicion && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((linea) => {
                  const receta = recetasDisponibles.find((r) => r.id_receta === linea.id_receta) ?? null;
                  const porciones = Number(linea.porciones_por_pax) || 0;
                  const subtotal = receta ? receta.costo_por_porcion * porciones : null;

                  const fotoActual = linea.id_receta !== "" ? fotos[linea.id_receta] : undefined;
                  const subiendoEstaFoto = linea.id_receta !== "" && subiendoFotoDe === linea.id_receta;

                  return (
                    <TableRow key={linea.clave}>
                      <TableCell>
                        {linea.id_receta === "" ? (
                          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: "background.default" }} />
                        ) : puedeEditarComposicion ? (
                          <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                            <Button
                              component="label"
                              sx={{ p: 0, minWidth: 0, borderRadius: 1 }}
                              disabled={subiendoEstaFoto}
                            >
                              <Avatar
                                src={fotoActual}
                                variant="rounded"
                                sx={{
                                  width: 40,
                                  height: 40,
                                  bgcolor: "background.default",
                                  color: "text.secondary",
                                }}
                              >
                                {!fotoActual && <AddIcon fontSize="small" />}
                              </Avatar>
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(evento) => {
                                  const archivo = evento.target.files?.[0];
                                  if (archivo && linea.id_receta !== "") subirFoto(linea.id_receta, archivo);
                                  evento.target.value = "";
                                }}
                              />
                            </Button>
                            {!fotoActual && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                Agregar
                              </Typography>
                            )}
                            {fotoActual && (
                              <Link
                                component="button"
                                type="button"
                                onClick={() => linea.id_receta !== "" && quitarFoto(linea.id_receta)}
                                underline="hover"
                                sx={{ fontSize: 11 }}
                              >
                                Quitar
                              </Link>
                            )}
                          </Stack>
                        ) : (
                          <Avatar
                            src={fotoActual}
                            variant="rounded"
                            sx={{ width: 40, height: 40, bgcolor: "background.default" }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          select
                          value={linea.tipo_plato}
                          onChange={(evento) => actualizarLinea(linea.clave, { tipo_plato: evento.target.value })}
                          disabled={soloLecturaComposicion || guardandoComposicion}
                          fullWidth
                        >
                          {TIPOS_PLATO.map((tipo) => (
                            <MenuItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Autocomplete
                          size="small"
                          options={recetasDisponibles}
                          getOptionLabel={(opcion) => opcion.nombre_plato}
                          value={receta}
                          onChange={(_evento, valor) =>
                            actualizarLinea(linea.clave, { id_receta: valor?.id_receta ?? "" })
                          }
                          disabled={soloLecturaComposicion || guardandoComposicion}
                          renderInput={(params) => <TextField {...params} placeholder="Buscar receta…" />}
                          isOptionEqualToValue={(opcion, valor) => opcion.id_receta === valor.id_receta}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={linea.porciones_por_pax}
                          onChange={(evento) =>
                            actualizarLinea(linea.clave, { porciones_por_pax: evento.target.value })
                          }
                          slotProps={{ htmlInput: { step: "0.5", min: "0.5" } }}
                          disabled={soloLecturaComposicion || guardandoComposicion}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        {receta ? formatoMoneda.format(receta.costo_por_porcion) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {subtotal != null ? formatoMoneda.format(subtotal) : "—"}
                      </TableCell>
                      {puedeEditarComposicion && (
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => quitarLinea(linea.clave)}
                            disabled={guardandoComposicion}
                          >
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

        <Paper
          variant="outlined"
          sx={{
            p: 3,
            width: { xs: "100%", md: 280 },
            flexShrink: 0,
            bgcolor: "#EAF1F9",
            borderColor: "primary.main",
          }}
        >
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
            Resumen del menú
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Costo x pax
          </Typography>
          <Typography variant="h6">{formatoMoneda.format(calculo.costoPorPax.toNumber())}</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Costo total (con gastos generales)
          </Typography>
          <Typography variant="body1">{formatoMoneda.format(calculo.costoTotal.toNumber())}</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Coeficiente de venta
          </Typography>
          {puedeEditarCoeficiente ? (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                value={coeficienteVenta}
                onChange={(evento) => setCoeficienteVenta(evento.target.value)}
                slotProps={{ htmlInput: { step: "0.01", min: "1" } }}
                disabled={guardandoCoeficiente}
                sx={{ width: 90 }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={guardarCoeficiente}
                disabled={guardandoCoeficiente}
                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {guardandoCoeficiente ? "…" : "Guardar"}
              </Button>
            </Stack>
          ) : (
            <Typography variant="h6">{Number(coeficienteVenta).toFixed(2)}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Margen sobre la venta: {margen.times(100).toFixed(1)}%
          </Typography>
          {errorCoeficiente && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errorCoeficiente}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Precio neto
          </Typography>
          <Typography variant="body1">{formatoMoneda.format(calculo.precioNeto.toNumber())}</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Precio público x pax
          </Typography>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
            {formatoMoneda.format(calculo.precioFinal.toNumber())}
          </Typography>
        </Paper>
      </Stack>

      {puedeEditarComposicion && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button onClick={() => router.push("/backoffice/menus")} disabled={guardandoComposicion}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={guardarComposicion} disabled={guardandoComposicion}>
            {guardandoComposicion ? "Guardando…" : "Guardar cambios"}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
