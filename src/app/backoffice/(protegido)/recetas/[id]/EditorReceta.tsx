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
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import { formatoMoneda } from "@/lib/formato";
import {
  costearLinea,
  ErrorCantidadInvalida,
  ErrorMermaInvalida,
  ErrorUnidadesIncompatibles,
} from "@/domain/costeo";
import { guardarReceta } from "../actions";
import { insumoDominio, unidadDominio, TIPOS_PLATO, type InsumoCatalogo, type UnidadCatalogo } from "../mapeo";

export interface RecetaExistente {
  id_receta: number;
  nombre_plato: string;
  tipo_plato: string;
  cantidad_porciones: number;
  estado: "BORRADOR" | "ACTIVA" | "INACTIVA";
  costo_total_calculado: number | null;
  costo_por_porcion: number | null;
  fecha_ultimo_calculo: string | null;
}

export interface LineaExistente {
  id_detalle: number;
  id_materia_prima: number;
  cantidad_usada: number;
  id_unidad_receta: number;
  porcentaje_merma: number;
  orden: number;
}

interface FilaEditable {
  clave: string;
  id_materia_prima: number | "";
  cantidad_usada: string;
  id_unidad_receta: number | "";
  porcentaje_merma: string;
}

function nuevaClave(): string {
  return Math.random().toString(36).slice(2);
}

function filaDesdeExistente(linea: LineaExistente): FilaEditable {
  return {
    clave: nuevaClave(),
    id_materia_prima: linea.id_materia_prima,
    cantidad_usada: String(linea.cantidad_usada),
    id_unidad_receta: linea.id_unidad_receta,
    porcentaje_merma: String(linea.porcentaje_merma),
  };
}

export default function EditorReceta({
  receta,
  lineasIniciales,
  insumos,
  unidades,
  coeficienteVentaDefecto,
  soloLectura,
}: {
  receta: RecetaExistente;
  lineasIniciales: LineaExistente[];
  insumos: InsumoCatalogo[];
  unidades: UnidadCatalogo[];
  coeficienteVentaDefecto: number | null;
  soloLectura: boolean;
}) {
  const router = useRouter();
  const [nombrePlato, setNombrePlato] = useState(receta.nombre_plato);
  const [tipoPlato, setTipoPlato] = useState(receta.tipo_plato);
  const [cantidadPorciones, setCantidadPorciones] = useState(String(receta.cantidad_porciones));
  const [estado, setEstado] = useState<RecetaExistente["estado"]>(receta.estado);
  const [lineas, setLineas] = useState<FilaEditable[]>(lineasIniciales.map(filaDesdeExistente));
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function agregarLinea() {
    setLineas((actual) => [
      ...actual,
      {
        clave: nuevaClave(),
        id_materia_prima: "",
        cantidad_usada: "",
        id_unidad_receta: "",
        porcentaje_merma: "0",
      },
    ]);
  }

  function quitarLinea(clave: string) {
    setLineas((actual) => actual.filter((linea) => linea.clave !== clave));
  }

  function actualizarLinea(clave: string, cambios: Partial<FilaEditable>) {
    setLineas((actual) => actual.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)));
  }

  const calculo = useMemo(() => {
    const resultados = new Map<string, { cantidadBruta: Decimal; costoLinea: Decimal } | string>();
    let costoTotal = new Decimal(0);

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
          porcentajeMerma: new Decimal(linea.porcentaje_merma || 0),
        });
        resultados.set(linea.clave, resultado);
        costoTotal = costoTotal.plus(resultado.costoLinea);
      } catch (excepcion) {
        let mensaje = "No se pudo calcular esta línea.";
        if (
          excepcion instanceof ErrorUnidadesIncompatibles ||
          excepcion instanceof ErrorCantidadInvalida ||
          excepcion instanceof ErrorMermaInvalida
        ) {
          mensaje = excepcion.message;
        }
        resultados.set(linea.clave, mensaje);
      }
    }

    const porciones = Number(cantidadPorciones) || 0;
    const costoPorPorcion = porciones > 0 ? costoTotal.dividedBy(porciones) : new Decimal(0);
    const precioSugerido =
      coeficienteVentaDefecto != null ? costoPorPorcion.times(coeficienteVentaDefecto) : null;

    return { resultados, costoTotal, costoPorPorcion, precioSugerido };
  }, [lineas, insumos, unidades, cantidadPorciones, coeficienteVentaDefecto]);

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

    iniciarTransicion(async () => {
      const resultado = await guardarReceta({
        idReceta: receta.id_receta,
        nombrePlato,
        tipoPlato,
        cantidadPorciones: Number(cantidadPorciones),
        estado,
        lineas: lineasValidas.map((linea) => ({
          id_materia_prima: Number(linea.id_materia_prima),
          cantidad_usada: Number(linea.cantidad_usada),
          id_unidad_receta: Number(linea.id_unidad_receta),
          porcentaje_merma: Number(linea.porcentaje_merma || 0),
        })),
      });

      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Nombre del plato"
            value={nombrePlato}
            onChange={(evento) => setNombrePlato(evento.target.value)}
            fullWidth
            disabled={soloLectura || pendiente}
          />
          <TextField
            label="Tipo de plato"
            select
            value={tipoPlato}
            onChange={(evento) => setTipoPlato(evento.target.value)}
            fullWidth
            disabled={soloLectura || pendiente}
          >
            {TIPOS_PLATO.map((tipo) => (
              <MenuItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Porciones"
            type="number"
            value={cantidadPorciones}
            onChange={(evento) => setCantidadPorciones(evento.target.value)}
            slotProps={{ htmlInput: { min: "1", step: "1" } }}
            fullWidth
            disabled={soloLectura || pendiente}
          />
          <TextField
            label="Estado"
            select
            value={estado}
            onChange={(evento) => setEstado(evento.target.value as RecetaExistente["estado"])}
            fullWidth
            disabled={soloLectura || pendiente}
          >
            <MenuItem value="BORRADOR">Borrador</MenuItem>
            <MenuItem value="ACTIVA">Activa</MenuItem>
            <MenuItem value="INACTIVA">Inactiva</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Ingredientes de la receta</Typography>
        {!soloLectura && (
          <Button variant="contained" onClick={agregarLinea} disabled={pendiente}>
            + Agregar insumo
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
              Todavía no agregaste ingredientes.
            </Typography>
          ) : (
            <Table sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Insumo</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Merma %</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    Cant. bruta
                  </TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    Costo base
                  </TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>
                    Subtotal
                  </TableCell>
                  {!soloLectura && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((linea) => {
                  const resultado = calculo.resultados.get(linea.clave);
                  const insumoSeleccionado =
                    insumos.find((insumo) => insumo.id_materia_prima === linea.id_materia_prima) ?? null;
                  const unidadSeleccionada = unidades.find((unidad) => unidad.id_unidad === linea.id_unidad_receta);
                  const unidadCompraDelInsumo = insumoSeleccionado
                    ? unidades.find((unidad) => unidad.id_unidad === insumoSeleccionado.id_unidad_compra)
                    : undefined;

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
                          disabled={soloLectura || pendiente}
                          renderInput={(params) => <TextField {...params} placeholder="Buscar insumo…" />}
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
                          disabled={soloLectura || pendiente}
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
                          disabled={soloLectura || pendiente}
                          fullWidth
                        >
                          {unidades.map((unidad) => (
                            <MenuItem key={unidad.id_unidad} value={unidad.id_unidad}>
                              {unidad.simbolo}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={linea.porcentaje_merma}
                          onChange={(evento) =>
                            actualizarLinea(linea.clave, { porcentaje_merma: evento.target.value })
                          }
                          slotProps={{ htmlInput: { step: "0.1", min: "0", max: "99.9" } }}
                          disabled={soloLectura || pendiente}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        {resultado && typeof resultado !== "string"
                          ? `${resultado.cantidadBruta.toFixed(2)} ${unidadSeleccionada?.simbolo ?? ""}`
                          : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {insumoSeleccionado && unidadCompraDelInsumo
                          ? formatoMoneda.format(insumoSeleccionado.costo_unitario / unidadCompraDelInsumo.factor_a_base)
                          : "—"}
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
                      {!soloLectura && (
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

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              p: 2,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography color="text.secondary">
              {lineas.length} ingrediente{lineas.length === 1 ? "" : "s"} cargado{lineas.length === 1 ? "" : "s"}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              Costo total de la preparación: {formatoMoneda.format(calculo.costoTotal.toNumber())}
            </Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 3,
            width: { xs: "100%", md: 260 },
            flexShrink: 0,
            bgcolor: "#EAF1F9",
            borderColor: "primary.main",
          }}
        >
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
            Cálculo en vivo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Costo total
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatoMoneda.format(calculo.costoTotal.toNumber())}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Porciones
          </Typography>
          <Typography variant="h6">{cantidadPorciones || "—"}</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Costo por porción
          </Typography>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
            {formatoMoneda.format(calculo.costoPorPorcion.toNumber())}
          </Typography>

          {calculo.precioSugerido && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Precio sugerido (referencia)
              </Typography>
              <Typography variant="h6">{formatoMoneda.format(calculo.precioSugerido.toNumber())}</Typography>
            </>
          )}
        </Paper>
      </Stack>

      {!soloLectura && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button onClick={() => router.push("/backoffice/recetas")} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={guardar} disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar cambios"}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
