"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import {
  PASOS_EVENTO,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  SIGUIENTE_ESTADO,
  ESTADOS_CANCELABLES,
  OPCIONES_ESTADO_INSUMO,
  COLOR_ESTADO_INSUMO,
  type EstadoEvento,
  type EstadoInsumoCompra,
} from "../mapeo";
import { cambiarEstadoEvento, actualizarDescripcionEvento, marcarEstadoInsumoEvento, solicitarListaDeCompra } from "../actions";

const COLOR_ACCION = "#219653";

export interface EventoDetalle {
  id_evento: number;
  descripcion: string | null;
  estado: EstadoEvento;
  id_cotizacion: number;
  cotizacion: {
    tipo_evento: string;
    nombre_cliente: string;
    email_cliente: string;
    telefono_cliente: string | null;
    direccion_evento: string | null;
    fecha_evento: string;
    cantidad_pax: number;
    subtotal_neto: number;
    monto_iva: number;
    monto_total: number;
  };
}

export interface LineaCotizacion {
  id_detalle: number;
  tipo_item: "MENU" | "RECETA" | "ADICIONAL" | "PERSONAL";
  referencia_id: number;
  descripcion: string;
  cantidad: number;
  subtotal: number;
}

export interface RecetaDeMenu {
  id_menu: number;
  receta: { nombre_plato: string };
}

export interface InsumoEvento {
  id_evento_insumo: number;
  cantidad_necesaria: number;
  costo_estimado: number;
  estado: EstadoInsumoCompra;
  orden: number;
  materia_prima: { nombre: string; unidad_compra: { simbolo: string } };
}

export default function DetalleEvento({
  evento,
  lineas,
  menuRecetas,
  insumosEvento,
}: {
  evento: EventoDetalle;
  lineas: LineaCotizacion[];
  menuRecetas: RecetaDeMenu[];
  insumosEvento: InsumoEvento[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const [descripcion, setDescripcion] = useState(evento.descripcion ?? "");
  const [modalLista, setModalLista] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);

  const lineasInsumos = lineas.filter((l) => l.tipo_item === "MENU" || l.tipo_item === "RECETA");
  const lineasAdicionales = lineas.filter((l) => l.tipo_item === "ADICIONAL");

  const costoProduccion = lineasInsumos.reduce((acumulado, l) => acumulado + l.subtotal, 0);
  const costosAdicionales = lineasAdicionales.reduce((acumulado, l) => acumulado + l.subtotal, 0);

  const recetasPorMenu = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const mr of menuRecetas) {
      const actual = mapa.get(mr.id_menu) ?? [];
      actual.push(mr.receta.nombre_plato);
      mapa.set(mr.id_menu, actual);
    }
    return mapa;
  }, [menuRecetas]);

  const pasoActual = PASOS_EVENTO.findIndex((p) => p.estado === evento.estado);
  const siguienteEstado = SIGUIENTE_ESTADO[evento.estado];
  const esCancelado = evento.estado === "CANCELADO";
  const esFinalizado = evento.estado === "FINALIZADO";

  const compradosCount = insumosEvento.filter((i) => i.estado === "COMPRADO").length;
  const totalInsumos = insumosEvento.length;
  const todosComprados = totalInsumos > 0 && compradosCount === totalInsumos;
  const mostrarSolicitarLista = evento.estado === "CONTRATADO" && totalInsumos === 0;
  const pdfDisponible = totalInsumos > 0;

  function ejecutar(accion: () => Promise<{ error?: string }>) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await accion();
      if (resultado.error) {
        setError(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  function confirmarSolicitarLista() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await solicitarListaDeCompra(evento.id_evento);
      if (resultado.error) {
        setError(resultado.error);
      } else {
        setModalLista(false);
        router.refresh();
      }
    });
  }

  function confirmarCancelar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoEvento(evento.id_evento, "CANCELADO");
      if (resultado.error) {
        setError(resultado.error);
      } else {
        setModalCancelar(false);
        router.refresh();
      }
    });
  }

  function guardarDescripcion() {
    ejecutar(() => actualizarDescripcionEvento(evento.id_evento, descripcion));
  }

  return (
    <Box sx={{ p: 4 }}>
      <Link href="/backoffice/eventos" style={{ textDecoration: "none", color: "inherit" }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 2, color: "text.secondary" }}>
          <ArrowBackIcon fontSize="small" />
          <Typography>Eventos</Typography>
        </Stack>
      </Link>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: esCancelado ? 0 : 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {evento.cotizacion.tipo_evento}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {evento.cotizacion.nombre_cliente} · {formatoFecha.format(new Date(evento.cotizacion.fecha_evento))} ·{" "}
              {evento.cotizacion.cantidad_pax} comensales
            </Typography>
          </Box>
          <Chip
            label={ETIQUETA_ESTADO[evento.estado]}
            sx={{ bgcolor: COLOR_ESTADO[evento.estado].bg, color: COLOR_ESTADO[evento.estado].fg, fontWeight: 700 }}
          />
        </Stack>

        {!esCancelado && (
          <Stack direction="row" sx={{ alignItems: "center" }}>
            {PASOS_EVENTO.map((paso, indice) => {
              const completado = indice < pasoActual || esFinalizado;
              const actual = indice === pasoActual;
              return (
                <Stack key={paso.estado} direction="row" sx={{ alignItems: "center", flex: indice < PASOS_EVENTO.length - 1 ? 1 : "0 0 auto" }}>
                  <Stack sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                        bgcolor: completado || actual ? COLOR_ACCION : "transparent",
                        color: completado || actual ? "white" : "text.secondary",
                        border: completado || actual ? "none" : "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {completado ? <CheckIcon fontSize="small" /> : indice + 1}
                    </Box>
                    <Typography variant="caption" color={actual ? "text.primary" : "text.secondary"} sx={{ mt: 0.5, fontWeight: actual ? 700 : 400 }}>
                      {paso.etiqueta}
                    </Typography>
                  </Stack>
                  {indice < PASOS_EVENTO.length - 1 && (
                    <Box sx={{ flex: 1, height: 2, bgcolor: completado ? COLOR_ACCION : "divider", mx: 1, mb: 2.5 }} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Datos del evento
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={4} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  NOMBRE
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{evento.cotizacion.tipo_evento}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  CLIENTE
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{evento.cotizacion.nombre_cliente}</Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={4} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  FECHA
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatoFecha.format(new Date(evento.cotizacion.fecha_evento))}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  COMENSALES
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{evento.cotizacion.cantidad_pax}</Typography>
              </Box>
            </Stack>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                DIRECCIÓN
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{evento.cotizacion.direccion_evento ?? "—"}</Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              DESCRIPCIÓN
            </Typography>
            <TextField
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onBlur={() => {
                if (descripcion !== (evento.descripcion ?? "")) guardarDescripcion();
              }}
              multiline
              minRows={2}
              fullWidth
              placeholder="Agregá una descripción interna del evento…"
              disabled={pendiente || esCancelado}
              sx={{ mb: 2 }}
            />

            {lineasInsumos.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">
                  MENÚ(S) DEL EVENTO
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {lineasInsumos.map((linea) => (
                    <Box key={linea.id_detalle} sx={{ p: 1.5, bgcolor: "background.default", borderRadius: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{linea.descripcion}</Typography>
                      {linea.tipo_item === "MENU" && (recetasPorMenu.get(linea.referencia_id)?.length ?? 0) > 0 && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                          {recetasPorMenu.get(linea.referencia_id)!.map((nombre) => (
                            <Chip key={nombre} label={nombre} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Lista de compra
            </Typography>

            {mostrarSolicitarLista ? (
              <Stack spacing={2} sx={{ alignItems: "center", py: 3, textAlign: "center" }}>
                <ShoppingCartOutlinedIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                <Typography color="text.secondary">
                  El evento está listo para pasar a preparación. Al solicitar la lista se generarán automáticamente
                  los insumos necesarios y el evento avanzará a &quot;En Preparación&quot;.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ShoppingCartOutlinedIcon />}
                  onClick={() => setModalLista(true)}
                  disabled={pendiente}
                  sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" }, fontWeight: 700 }}
                >
                  Solicitar lista de compra
                </Button>
              </Stack>
            ) : totalInsumos === 0 ? (
              <Typography color="text.secondary">Todavía no se solicitó la lista de compra.</Typography>
            ) : (
              <>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {compradosCount} / {totalInsumos} comprados
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(compradosCount / totalInsumos) * 100}
                  sx={{ mb: 2, height: 8, borderRadius: 4, bgcolor: "grey.200", "& .MuiLinearProgress-bar": { bgcolor: COLOR_ACCION } }}
                />
                <Stack spacing={1}>
                  {insumosEvento.map((insumo) => (
                    <Stack
                      key={insumo.id_evento_insumo}
                      direction="row"
                      sx={{ justifyContent: "space-between", alignItems: "center", p: 1.5, bgcolor: "background.default", borderRadius: 1 }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600, textDecoration: insumo.estado === "COMPRADO" ? "line-through" : "none" }}>
                          {insumo.materia_prima.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {insumo.cantidad_necesaria} {insumo.materia_prima.unidad_compra.simbolo} ·{" "}
                          {formatoMoneda.format(insumo.costo_estimado)}
                        </Typography>
                      </Box>
                      <TextField
                        select
                        size="small"
                        value={insumo.estado}
                        disabled={pendiente || esCancelado}
                        onChange={(e) =>
                          ejecutar(() =>
                            marcarEstadoInsumoEvento(insumo.id_evento_insumo, evento.id_evento, e.target.value as EstadoInsumoCompra),
                          )
                        }
                        sx={{
                          minWidth: 140,
                          "& .MuiOutlinedInput-root": {
                            bgcolor: COLOR_ESTADO_INSUMO[insumo.estado].bg,
                            color: COLOR_ESTADO_INSUMO[insumo.estado].fg,
                            fontWeight: 700,
                          },
                        }}
                      >
                        {OPCIONES_ESTADO_INSUMO.map((opcion) => (
                          <MenuItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  ))}
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontWeight: 700 }}>Costo estimado total</Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatoMoneda.format(insumosEvento.reduce((acumulado, i) => acumulado + i.costo_estimado, 0))}
                  </Typography>
                </Stack>

                {evento.estado === "EN_PREPARACION" && (
                  <>
                    {!todosComprados && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Faltan {totalInsumos - compradosCount} insumos por comprar para poder avanzar a &quot;En Ejecución&quot;.
                      </Alert>
                    )}
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={!todosComprados || pendiente}
                      onClick={() => ejecutar(() => cambiarEstadoEvento(evento.id_evento, "EN_EJECUCION"))}
                      sx={{
                        mt: 2,
                        bgcolor: todosComprados ? COLOR_ACCION : undefined,
                        "&:hover": { bgcolor: todosComprados ? "#1B7A44" : undefined },
                        fontWeight: 700,
                      }}
                    >
                      {todosComprados ? "✓ Lista completa — Pasar a ejecución" : "Lista de compra incompleta"}
                    </Button>
                  </>
                )}
              </>
            )}
          </Paper>

          {lineasAdicionales.length > 0 && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Costos adicionales
              </Typography>
              <Stack spacing={1}>
                {lineasAdicionales.map((linea) => (
                  <Stack key={linea.id_detalle} direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography color="text.secondary">{linea.descripcion}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formatoMoneda.format(linea.subtotal)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>

        <Stack spacing={2} sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0, position: { md: "sticky" }, top: { md: 16 } }}>
          {esCancelado ? (
            <Paper variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: COLOR_ESTADO.CANCELADO.bg }}>
              <Typography sx={{ fontWeight: 700, color: COLOR_ESTADO.CANCELADO.fg }}>Evento cancelado</Typography>
            </Paper>
          ) : esFinalizado ? (
            <Paper variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: COLOR_ESTADO.FINALIZADO.bg }}>
              <Typography sx={{ fontWeight: 700, color: COLOR_ESTADO.FINALIZADO.fg }}>✓ Evento finalizado</Typography>
            </Paper>
          ) : (
            siguienteEstado && (
              <Button
                fullWidth
                variant="contained"
                disabled={pendiente}
                onClick={() => ejecutar(() => cambiarEstadoEvento(evento.id_evento, siguienteEstado))}
                sx={{ bgcolor: "#141B2D", "&:hover": { bgcolor: "#0d1220" }, fontWeight: 700, py: 1.5 }}
              >
                Siguiente estado
                <br />→ {ETIQUETA_ESTADO[siguienteEstado]}
              </Button>
            )
          )}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Resumen / Presupuesto
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography color="text.secondary">Costo producción</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatoMoneda.format(costoProduccion)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography color="text.secondary">Costos adicionales</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatoMoneda.format(costosAdicionales)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography color="text.secondary">IVA</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatoMoneda.format(evento.cotizacion.monto_iva)}</Typography>
              </Stack>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 700 }}>Precio final</Typography>
              <Typography sx={{ fontWeight: 700, color: COLOR_ACCION }}>{formatoMoneda.format(evento.cotizacion.monto_total)}</Typography>
            </Stack>

            {pdfDisponible ? (
              <Button
                fullWidth
                variant="outlined"
                component="a"
                href={`/backoffice/eventos/${evento.id_evento}/pdf`}
                target="_blank"
                startIcon={<DescriptionOutlinedIcon />}
                sx={{ mt: 2 }}
              >
                Descargar PDF
              </Button>
            ) : (
              <Button fullWidth variant="outlined" disabled startIcon={<DescriptionOutlinedIcon />} sx={{ mt: 2 }}>
                Descargar PDF
              </Button>
            )}
          </Paper>

          {!esCancelado && !esFinalizado && ESTADOS_CANCELABLES.includes(evento.estado) && (
            <Button fullWidth variant="outlined" color="error" disabled={pendiente} onClick={() => setModalCancelar(true)}>
              Cancelar evento
            </Button>
          )}
        </Stack>
      </Stack>

      <Dialog open={modalLista} onClose={() => !pendiente && setModalLista(false)} fullWidth maxWidth="xs">
        <DialogTitle>Solicitar lista de compra</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Se generará la lista de insumos a partir de los menús y recetas del evento, y el estado avanzará
            automáticamente a &quot;En Preparación&quot;.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalLista(false)} disabled={pendiente} variant="outlined" fullWidth>
            Cancelar
          </Button>
          <Button
            onClick={confirmarSolicitarLista}
            disabled={pendiente}
            variant="contained"
            fullWidth
            sx={{ bgcolor: COLOR_ACCION, "&:hover": { bgcolor: "#1B7A44" } }}
          >
            {pendiente ? "Generando…" : "Generar lista y avanzar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalCancelar} onClose={() => !pendiente && setModalCancelar(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar evento</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            ¿Querés cancelar este evento? Evento: <strong>{evento.cotizacion.tipo_evento}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCancelar(false)} disabled={pendiente} variant="outlined" fullWidth>
            Volver
          </Button>
          <Button onClick={confirmarCancelar} disabled={pendiente} variant="contained" color="error" fullWidth>
            {pendiente ? "Cancelando…" : "Cancelar evento"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
