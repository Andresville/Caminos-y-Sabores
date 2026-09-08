"use client";

import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { formatoMoneda } from "@/lib/formato";
import type { DesglosePublico } from "@/lib/cotizador/calculo";
import TurnstileWidget from "./TurnstileWidget";

export default function PasoConfirmacion({
  desglose,
  nombreCliente,
  emailCliente,
  telefonoCliente,
  consentimiento,
  onCambiarNombre,
  onCambiarEmail,
  onCambiarTelefono,
  onCambiarConsentimiento,
  onToken,
  onConfirmar,
  enviando,
  mensajeError,
}: {
  desglose: DesglosePublico | null;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  consentimiento: boolean;
  onCambiarNombre: (valor: string) => void;
  onCambiarEmail: (valor: string) => void;
  onCambiarTelefono: (valor: string) => void;
  onCambiarConsentimiento: (valor: boolean) => void;
  onToken: (token: string) => void;
  onConfirmar: () => void;
  enviando: boolean;
  mensajeError: string | null;
}) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, flex: "1 1 320px", minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Detalle de tu presupuesto
        </Typography>

        {desglose ? (
          <>
            <Table size="small" sx={{ minWidth: 420 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Unitario</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {desglose.lineas.map((linea, indice) => (
                  <TableRow key={indice}>
                    <TableCell>{linea.descripcion}</TableCell>
                    <TableCell align="right">{linea.cantidad}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.precioUnitario)}</TableCell>
                    <TableCell align="right">{formatoMoneda.format(linea.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack spacing={0.5} sx={{ mt: 2, alignItems: "flex-end" }}>
              <Stack direction="row" spacing={2}>
                <Typography color="text.secondary">Subtotal neto</Typography>
                <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(desglose.subtotalNeto)}</Typography>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Typography color="text.secondary">IVA</Typography>
                <Typography sx={{ fontWeight: 700 }}>{formatoMoneda.format(desglose.montoIva)}</Typography>
              </Stack>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mt: 1 }}>
                TOTAL {formatoMoneda.format(desglose.montoTotal)}
              </Typography>
            </Stack>
          </>
        ) : (
          <Typography color="text.secondary">Volvé al paso anterior para armar tu presupuesto.</Typography>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Al confirmar, el sistema guarda la cotización con los precios congelados, genera el código único y
          envía el PDF al email declarado.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, flex: "1 1 320px", minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Tus datos de contacto
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Nombre y apellido"
            value={nombreCliente}
            onChange={(evento) => onCambiarNombre(evento.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={emailCliente}
            onChange={(evento) => onCambiarEmail(evento.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Teléfono (opcional)"
            value={telefonoCliente}
            onChange={(evento) => onCambiarTelefono(evento.target.value)}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={consentimiento}
                onChange={(evento) => onCambiarConsentimiento(evento.target.checked)}
              />
            }
            label="Acepto la política de privacidad y el tratamiento de mis datos de contacto."
          />

          <TurnstileWidget onToken={onToken} />

          {mensajeError && <Alert severity="error">{mensajeError}</Alert>}

          <Button variant="contained" size="large" onClick={onConfirmar} disabled={enviando || !desglose}>
            {enviando ? "Emitiendo…" : "Descargar PDF y enviar"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
