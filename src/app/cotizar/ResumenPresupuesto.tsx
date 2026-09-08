import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import { formatoMoneda } from "@/lib/formato";
import type { DesglosePublico } from "@/lib/cotizador/calculo";

/** Panel lateral "Tu presupuesto" — resumen compacto, no el detalle línea a línea (eso lo muestra el paso de confirmación). */
export default function ResumenPresupuesto({
  pax,
  nombreMenu,
  cantidadAdicionales,
  desglose,
  cargando,
}: {
  pax: number | null;
  nombreMenu: string | null;
  cantidadAdicionales: number;
  desglose: DesglosePublico | null;
  cargando: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary">
        Tu presupuesto
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary">Invitados</Typography>
          <Typography sx={{ fontWeight: 700 }}>{pax ?? "—"}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary">Menú</Typography>
          <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{nombreMenu ?? "—"}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary">Adicionales</Typography>
          <Typography sx={{ fontWeight: 700 }}>{cantidadAdicionales > 0 ? cantidadAdicionales : "—"}</Typography>
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography sx={{ fontWeight: 700 }}>TOTAL</Typography>
        <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
          {cargando ? "…" : formatoMoneda.format(desglose?.montoTotal ?? 0)}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        IVA incluido
      </Typography>
    </Paper>
  );
}
