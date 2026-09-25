"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { IMAGEN_PLACEHOLDER } from "@/lib/cliente-portal/imagenes";
import { useCarrito } from "@/lib/carrito-cliente/CarritoProvider";
import type { ServicioPublico } from "@/lib/cotizador/datos";
import { simularPresupuesto } from "./actions";

export function fechaMinimaHoy(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function FormularioCarrito({
  estaLogueado,
  adicionales,
}: {
  estaLogueado: boolean;
  adicionales: ServicioPublico[];
}) {
  const { items, actualizarCantidad, quitar, cargado, borrador, guardarPedidoPendiente, guardarBorrador, limpiarBorrador } =
    useCarrito();
  const router = useRouter();
  const [nombreEvento, setNombreEvento] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [cantidadComensales, setCantidadComensales] = useState("");
  const [idsAdicionales, setIdsAdicionales] = useState<number[]>([]);
  const [consentimiento, setConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restaura lo que el cliente ya había escrito si volvió de loguearse/registrarse.
  useEffect(() => {
    if (cargado && borrador) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombreEvento(borrador.nombreEvento);
      setFechaEvento(borrador.fechaEvento);
      setCantidadComensales(borrador.cantidadComensales);
      setIdsAdicionales(borrador.idsAdicionales);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado]);

  const totalItems = items.reduce((suma, item) => suma + item.cantidad, 0);

  function alternarAdicional(idAdicional: number) {
    setIdsAdicionales((actual) =>
      actual.includes(idAdicional) ? actual.filter((id) => id !== idAdicional) : [...actual, idAdicional],
    );
  }

  async function verResumen() {
    setError(null);
    if (!nombreEvento.trim()) {
      setError("Ingresá el nombre del evento.");
      return;
    }
    if (!fechaEvento) {
      setError("Ingresá la fecha del evento.");
      return;
    }
    if (fechaEvento < fechaMinimaHoy()) {
      setError("La fecha del evento no puede ser una fecha pasada.");
      return;
    }
    const comensales = Number(cantidadComensales);
    if (!Number.isInteger(comensales) || comensales < 1) {
      setError("Ingresá una cantidad de comensales válida.");
      return;
    }
    if (!consentimiento) {
      setError("Tenés que aceptar los Términos y Condiciones para continuar.");
      return;
    }
    if (!estaLogueado) {
      guardarBorrador({ nombreEvento, fechaEvento, cantidadComensales, idsAdicionales });
      router.push("/login?redirect=/carrito");
      return;
    }

    setEnviando(true);
    const resultado = await simularPresupuesto({
      items: items.map((item) => ({ tipoItem: item.tipoItem, idReferencia: item.idReferencia, cantidad: item.cantidad })),
      idsAdicionales,
    });
    setEnviando(false);

    if (resultado.tipo === "error") {
      setError(resultado.mensaje);
      return;
    }

    limpiarBorrador();
    guardarPedidoPendiente({
      nombreEvento,
      fechaEvento,
      cantidadComensales: comensales,
      idsAdicionales,
      nombresAdicionales: resultado.nombresAdicionales,
      desglose: resultado.desglose,
    });
    router.push("/carrito/resumen");
  }

  if (!cargado) return null;

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 12 }}>
        <ShoppingCartOutlinedIcon sx={{ fontSize: 56, color: paletaCliente.bordeInput, mb: 2 }} />
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro, mb: 1 }}>
          Todavía no agregaste ningún menú, plato o servicio
        </Typography>
        <Typography sx={{ color: paletaCliente.textoTerciario, mb: 3 }}>
          Explorá el catálogo y agregá lo que más te guste.
        </Typography>
        <Button
          component={Link}
          href="/"
          variant="contained"
          sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
        >
          Ver catálogo
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 4 }}>
      <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.75rem", color: paletaCliente.textoOscuro, mb: 3 }}>
        Solicitar presupuesto
      </Typography>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
        <Box sx={{ flex: 1 }}>
          <Paper variant="outlined" sx={{ p: 3, borderColor: paletaCliente.borde, borderRadius: 4, position: "sticky", top: 88 }}>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, color: paletaCliente.textoOscuro, mb: 2 }}>
              Tu selección
            </Typography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {items.map((item) => (
                <Stack key={`${item.tipoItem}-${item.idReferencia}`} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      flexShrink: 0,
                      bgcolor: paletaCliente.fondoClaro,
                      backgroundImage: `url(${item.imagenUrl ?? IMAGEN_PLACEHOLDER})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>
                      {item.nombre}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => actualizarCantidad(item.tipoItem, item.idReferencia, item.cantidad - 1)}
                        sx={{ bgcolor: paletaCliente.fondoClaro }}
                      >
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography sx={{ width: 20, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                        {item.cantidad}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => actualizarCantidad(item.tipoItem, item.idReferencia, item.cantidad + 1)}
                        sx={{ bgcolor: paletaCliente.fondoClaro }}
                      >
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                  <IconButton size="small" onClick={() => quitar(item.tipoItem, item.idReferencia)}>
                    <DeleteOutlineIcon sx={{ color: paletaCliente.bordeInput }} fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ borderTop: `1px solid ${paletaCliente.borde}`, pt: 1.5 }}>
              <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                Total: <strong>{totalItems} ítem{totalItems !== 1 ? "s" : ""}</strong>
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: 2 }}>
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderColor: paletaCliente.borde, borderRadius: 4 }}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Nombre del evento"
                placeholder="Ej. Casamiento Pérez"
                value={nombreEvento}
                onChange={(evento) => setNombreEvento(evento.target.value)}
                required
                fullWidth
                disabled={enviando}
              />

              <TextField
                label="Fecha del evento"
                type="date"
                value={fechaEvento}
                onChange={(evento) => setFechaEvento(evento.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fechaMinimaHoy() } }}
                required
                fullWidth
                disabled={enviando}
              />

              <TextField
                label="Cantidad de comensales"
                type="number"
                placeholder="Ej. 50"
                value={cantidadComensales}
                onChange={(evento) => setCantidadComensales(evento.target.value)}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                required
                fullWidth
                disabled={enviando}
              />

              {adicionales.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: paletaCliente.textoOscuro, mb: 1 }}>
                    Servicios adicionales
                  </Typography>
                  <Stack>
                    {adicionales.map((adicional) => (
                      <FormControlLabel
                        key={adicional.idAdicional}
                        control={
                          <Checkbox
                            checked={idsAdicionales.includes(adicional.idAdicional)}
                            onChange={() => alternarAdicional(adicional.idAdicional)}
                            disabled={enviando}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
                            {adicional.nombre}
                          </Typography>
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <FormControlLabel
                control={
                  <Checkbox checked={consentimiento} onChange={(evento) => setConsentimiento(evento.target.checked)} disabled={enviando} />
                }
                label={
                  <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
                    Acepto los Términos y Condiciones. Entiendo que este es un presupuesto estimado y no
                    vinculante, y que mis datos de contacto se usen para coordinar el evento.
                  </Typography>
                }
              />

              <Button
                onClick={verResumen}
                variant="contained"
                size="large"
                disabled={enviando}
                sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
              >
                {enviando ? "Calculando…" : "Ver presupuesto estimado"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
