import { createAdminClient } from "@/lib/supabase/admin";
import type { LineaPdf } from "./pdf";

export interface CotizacionConsultada {
  codigo: string;
  estado: string;
  fechaEmision: string;
  fechaValidez: string;
  nombreCliente: string;
  emailCliente: string;
  tipoEvento: string;
  cantidadPax: number;
  subtotalNeto: number;
  montoIva: number;
  montoTotal: number;
  lineas: LineaPdf[];
}

/**
 * Equivalente a GET /api/publico/cotizaciones/{codigo}: el propio
 * código único hace de credencial (nadie puede adivinar uno ajeno), así
 * que no hace falta más autenticación para consultarlo. anon no tiene
 * RLS sobre cotizacion, así que se usa el cliente con service_role.
 */
export async function obtenerCotizacionPorCodigo(codigo: string): Promise<CotizacionConsultada | null> {
  const supabase = createAdminClient();

  const { data: cotizacion } = await supabase
    .from("cotizacion")
    .select(
      "id_cotizacion, codigo, estado, fecha_emision, fecha_validez, nombre_cliente, email_cliente, tipo_evento, cantidad_pax, subtotal_neto, monto_iva, monto_total",
    )
    .eq("codigo", codigo)
    .single();

  if (!cotizacion) return null;

  const { data: detalle } = await supabase
    .from("cotizacion_detalle")
    .select("descripcion, cantidad, precio_unitario_congelado, subtotal")
    .eq("id_cotizacion", cotizacion.id_cotizacion)
    .order("orden");

  return {
    codigo: cotizacion.codigo,
    estado: cotizacion.estado,
    fechaEmision: cotizacion.fecha_emision,
    fechaValidez: cotizacion.fecha_validez,
    nombreCliente: cotizacion.nombre_cliente,
    emailCliente: cotizacion.email_cliente,
    tipoEvento: cotizacion.tipo_evento,
    cantidadPax: cotizacion.cantidad_pax,
    subtotalNeto: Number(cotizacion.subtotal_neto),
    montoIva: Number(cotizacion.monto_iva),
    montoTotal: Number(cotizacion.monto_total),
    lineas: (detalle ?? []).map((linea) => ({
      descripcion: linea.descripcion,
      cantidad: Number(linea.cantidad),
      precioUnitario: Number(linea.precio_unitario_congelado),
      subtotal: Number(linea.subtotal),
    })),
  };
}
