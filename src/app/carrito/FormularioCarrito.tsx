"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
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
import { enviarPedido } from "./actions";

const TIPOS_EVENTO = ["Casamiento", "Cumpleaños", "Corporativo", "Aniversario", "Otro"];

export default function FormularioCarrito({ estaLogueado }: { estaLogueado: boolean }) {
  const { items, actualizarCantidad, quitar, vaciar, cargado } = useCarrito();
  const [tipoEvento, setTipoEvento] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ codigo: string; idCotizacion: number } | null>(null);

  const totalItems = items.reduce((suma, item) => suma + item.cantidad, 0);

  async function enviar() {
    setError(null);
    if (!estaLogueado) {
      setError("Iniciá sesión para poder enviar tu pedido.");
      return;
    }
    if (!tipoEvento) {
      setError("Elegí el tipo de evento.");
      return;
    }
    if (!fechaEvento) {
      setError("Ingresá la fecha del evento.");
      return;
    }
    if (!consentimiento) {
      setError("Tenés que aceptar la política de privacidad para continuar.");
      return;
    }

    setEnviando(true);
    const resultado = await enviarPedido({
      items: items.map((item) => ({ tipoItem: item.tipoItem, idReferencia: item.idReferencia, cantidad: item.cantidad })),
      tipoEvento,
      fechaEvento,
      consentimientoDatos: consentimiento,
    });
    setEnviando(false);

    if (resultado.tipo === "error") {
      setError(resultado.mensaje);
      return;
    }
    vaciar();
    setExito({ codigo: resultado.codigo, idCotizacion: resultado.idCotizacion });
  }

  if (exito) {
    return (
      <Box sx={{ maxWidth: 560, mx: "auto", px: 2, py: 10, textAlign: "center" }}>
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.6rem", color: paletaCliente.textoOscuro, mb: 1 }}>
          ¡Recibimos tu pedido!
        </Typography>
        <Typography sx={{ color: paletaCliente.textoSecundario, mb: 3 }}>
          Código {exito.codigo}. Es un estimado automático — nuestro equipo comercial lo va a revisar y te vamos
          a avisar cuando esté la versión formal para que la aceptes o rechaces.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
          <Button
            component={Link}
            href={`/mis-presupuestos/${exito.idCotizacion}`}
            variant="contained"
            sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
          >
            Ver mi presupuesto
          </Button>
          <Button component={Link} href="/" variant="outlined" sx={{ borderColor: paletaCliente.primario, color: paletaCliente.primario }}>
            Volver al inicio
          </Button>
        </Stack>
      </Box>
    );
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
                label="Tipo de evento"
                select
                value={tipoEvento}
                onChange={(evento) => setTipoEvento(evento.target.value)}
                required
                fullWidth
                disabled={enviando}
              >
                {TIPOS_EVENTO.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Fecha del evento"
                type="date"
                value={fechaEvento}
                onChange={(evento) => setFechaEvento(evento.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: new Date().toISOString().slice(0, 10) } }}
                required
                fullWidth
                disabled={enviando}
              />

              <FormControlLabel
                control={
                  <Checkbox checked={consentimiento} onChange={(evento) => setConsentimiento(evento.target.checked)} disabled={enviando} />
                }
                label={
                  <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
                    Acepto que este es un presupuesto estimado y no vinculante, y que mis datos de contacto se
                    usen para coordinar el evento.
                  </Typography>
                }
              />

              <Button
                onClick={enviar}
                variant="contained"
                size="large"
                disabled={enviando}
                sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
              >
                {enviando ? "Enviando…" : "Solicitar presupuesto"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
