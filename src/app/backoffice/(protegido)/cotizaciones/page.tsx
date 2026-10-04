import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import BandejaSolicitudes, { type FilaSolicitud, type LineaSolicitud } from "./BandejaSolicitudes";

export default async function PaginaCotizaciones() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Asistente Comercial" && usuarioActual?.rol !== "Administrador") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: cotizaciones, error }, { data: lineas }, { data: parametros }] = await Promise.all([
    supabase
      .from("cotizacion")
      .select(
        "id_cotizacion, codigo, tipo_evento, fecha_emision, fecha_evento, fecha_validez, cantidad_pax, nombre_cliente, email_cliente, telefono_cliente, subtotal_neto, monto_iva, monto_total, descuento_pct, estado, motivo_rechazo",
      )
      // Pendiente (todavía ni confirmado por el cliente), Rechazada (el
      // cliente ya dijo que no), Cancelada y Vencida nunca se muestran en
      // la bandeja — no hay nada que Comercial pueda hacer con esos cuatro.
      .not("estado", "in", "(PENDIENTE,RECHAZADA,CANCELADO,VENCIDA)")
      .order("fecha_emision", { ascending: false })
      .returns<FilaSolicitud[]>(),
    supabase
      .from("cotizacion_detalle")
      .select("id_detalle, id_cotizacion, descripcion, cantidad, precio_unitario_congelado, subtotal, orden")
      .order("orden")
      .returns<LineaSolicitud[]>(),
    supabase.from("parametro_sistema").select("clave, valor").in("clave", ["IVA_PORCENTAJE", "REDONDEO_PRECIO_FINAL"]),
  ]);

  const mapaParametros = new Map((parametros ?? []).map((p) => [p.clave, Number(p.valor)]));

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <BandejaSolicitudes
        solicitudes={cotizaciones ?? []}
        lineas={lineas ?? []}
        ivaPct={mapaParametros.get("IVA_PORCENTAJE") ?? 0}
        redondeo={mapaParametros.get("REDONDEO_PRECIO_FINAL") ?? 1}
      />
    </Box>
  );
}
