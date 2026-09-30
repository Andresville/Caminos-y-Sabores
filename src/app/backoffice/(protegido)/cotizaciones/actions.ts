"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";
import { enviarPdfCotizacion } from "@/lib/cotizador/email";
import type { EstadoCotizacion } from "./mapeo";

export interface EstadoAccion {
  error?: string;
}

export async function cambiarEstadoCotizacion(
  idCotizacion: number,
  nuevoEstado: EstadoCotizacion,
): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cotizacion")
    .update({ estado: nuevoEstado })
    .eq("id_cotizacion", idCotizacion);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/cotizaciones");
  return {};
}

export interface LineaAjusteEntrada {
  idDetalle: number;
  cantidad: number;
}

/**
 * Comercial ajusta cantidades (nunca agrega/quita líneas — si el
 * cliente quiere otra cosa, rechaza y pide de nuevo desde el front) y
 * aplica un % de descuento sobre una solicitud que sigue Solicitada.
 * El recálculo de subtotal/IVA/total lo hace ajustar_solicitud_comercial()
 * en la base, nunca confiando en un total mandado por el navegador.
 * Si reenviar es true, además le vuelve a mandar el PDF actualizado al
 * cliente por mail (mejor esfuerzo: si el mail falla, el ajuste ya
 * quedó guardado igual).
 */
export async function ajustarSolicitud(datos: {
  idCotizacion: number;
  descuentoPct: number;
  lineas: LineaAjusteEntrada[];
  reenviar: boolean;
}): Promise<EstadoAccion> {
  if (!Number.isFinite(datos.descuentoPct) || datos.descuentoPct < 0 || datos.descuentoPct >= 100) {
    return { error: "El descuento debe ser un porcentaje entre 0 y 100." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("ajustar_solicitud_comercial", {
    p_id_cotizacion: datos.idCotizacion,
    p_descuento_pct: datos.descuentoPct,
    p_lineas: datos.lineas.map((linea) => ({ id_detalle: linea.idDetalle, cantidad: linea.cantidad })),
  });

  if (error) return { error: error.message };

  revalidatePath("/backoffice/cotizaciones");

  if (!datos.reenviar) return {};

  const [{ data: cotizacion }, { data: lineas }] = await Promise.all([
    supabase
      .from("cotizacion")
      .select("codigo, fecha_emision, fecha_validez, nombre_cliente, email_cliente, tipo_evento, cantidad_pax, subtotal_neto, monto_iva, monto_total")
      .eq("id_cotizacion", datos.idCotizacion)
      .single(),
    supabase
      .from("cotizacion_detalle")
      .select("descripcion, cantidad, precio_unitario_congelado, subtotal")
      .eq("id_cotizacion", datos.idCotizacion)
      .order("orden"),
  ]);

  if (!cotizacion) return {};

  try {
    const pdf = await renderizarPdfCotizacion({
      codigo: cotizacion.codigo,
      fechaEmision: cotizacion.fecha_emision,
      fechaValidez: cotizacion.fecha_validez,
      nombreCliente: cotizacion.nombre_cliente,
      tipoEvento: cotizacion.tipo_evento,
      cantidadPax: cotizacion.cantidad_pax,
      lineas: (lineas ?? []).map((linea) => ({
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        precioUnitario: linea.precio_unitario_congelado,
        subtotal: linea.subtotal,
      })),
      subtotalNeto: cotizacion.subtotal_neto,
      montoIva: cotizacion.monto_iva,
      montoTotal: cotizacion.monto_total,
    });
    await enviarPdfCotizacion({ destinatario: cotizacion.email_cliente, codigo: cotizacion.codigo, pdf });
  } catch (excepcion) {
    console.error("[cotizaciones] no se pudo reenviar el PDF ajustado:", excepcion);
  }

  return {};
}
