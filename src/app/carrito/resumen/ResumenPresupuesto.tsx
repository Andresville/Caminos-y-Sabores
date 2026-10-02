"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { fechaLocalDesdeISO, formatoFechaLarga, formatoMoneda } from "@/lib/formato";
import { useCarrito } from "@/lib/carrito-cliente/CarritoProvider";
import { responderPresupuesto } from "../../mis-presupuestos/[id]/actions";

export default function ResumenPresupuesto() {
  const { pedidoPendiente, cargado, vaciar, limpiarPedidoPendiente } = useCarrito();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo corresponde evaluar esto una vez, cuando termina de hidratarse desde
  // localStorage (cargado pasa a true) — si no hay nada que mostrar en ese
  // momento, se vuelve al carrito. No debe reaccionar a cambios posteriores
  // de pedidoPendiente: el propio flujo de envío lo limpia al terminar, y
  // eso no tiene que disparar este mismo redirect.
  useEffect(() => {
    if (cargado && !pedidoPendiente) {
      router.replace("/carrito");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado]);

  async function solicitarContacto() {
    if (!pedidoPendiente) return;
    setError(null);

    setEnviando(true);
    const resultado = await responderPresupuesto(pedidoPendiente.idCotizacion, true);
    setEnviando(false);

    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    router.push("/mis-presupuestos");
    vaciar();
    limpiarPedidoPendiente();
  }

  function obtenerOtroPresupuesto() {
    router.push("/");
    vaciar();
    limpiarPedidoPendiente();
  }

  if (!cargado || !pedidoPendiente) return null;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, sm: 3 }, py: 4 }}>
      <Box sx={{ bgcolor: "white", border: `1px solid ${paletaCliente.borde}`, borderRadius: 4, p: { xs: 3, sm: 4 } }}>
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.6rem", color: paletaCliente.textoOscuro, mb: 1.5 }}>
          Resumen del Presupuesto
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 3 }}>
          <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
            <strong>Evento:</strong> {pedidoPendiente.nombreEvento}
          </Typography>
          <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
            <strong>Fecha:</strong> {formatoFechaLarga.format(fechaLocalDesdeISO(pedidoPendiente.fechaEvento))}
          </Typography>
          <Typography variant="body2" sx={{ color: paletaCliente.textoSecundario }}>
            <strong>Comensales:</strong> {pedidoPendiente.cantidadComensales} personas
          </Typography>
        </Stack>

        <Stack divider={<Box sx={{ borderBottom: `1px solid ${paletaCliente.borde}` }} />} spacing={2} sx={{ mb: 3 }}>
          {pedidoPendiente.desglose.lineas.map((linea, indice) => (
            <Stack key={indice} direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                <Typography sx={{ fontWeight: 600, color: paletaCliente.textoOscuro }}>{linea.descripcion}</Typography>
                <Typography variant="body2" sx={{ color: paletaCliente.textoTerciario }}>
                  Cantidad: {linea.cantidad}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, color: paletaCliente.textoOscuro }}>
                {formatoMoneda.format(linea.subtotal)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${paletaCliente.borde}`, pt: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: paletaCliente.textoOscuro }}>Total estimado</Typography>
            <Typography variant="caption" sx={{ color: paletaCliente.textoMuted }}>
              Incluye IVA
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.5rem", color: paletaCliente.primario }}>
            {formatoMoneda.format(pedidoPendiente.desglose.montoTotal)}
          </Typography>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <Button
          onClick={solicitarContacto}
          variant="contained"
          size="large"
          disabled={enviando}
          sx={{ bgcolor: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.primarioOscuro } }}
        >
          {enviando ? "Enviando…" : "Solicitar contacto comercial"}
        </Button>
        <Button
          onClick={obtenerOtroPresupuesto}
          variant="outlined"
          size="large"
          disabled={enviando}
          sx={{ borderColor: paletaCliente.primario, color: paletaCliente.primario }}
        >
          Obtener otro presupuesto
        </Button>
      </Stack>
    </Box>
  );
}
