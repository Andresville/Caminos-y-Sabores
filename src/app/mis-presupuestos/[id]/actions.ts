"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";
import { enviarPdfCotizacion } from "@/lib/cotizador/email";

export interface EstadoRespuesta {
  error?: string;
}

/**
 * El cliente confirma (Pendiente -> Solicitado, recién ahí Comercial lo
 * ve en el backoffice) o rechaza (Pendiente -> Rechazada) su propio
 * presupuesto — la función valida internamente que le pertenezca y que
 * todavía esté Pendiente. El motivo solo se guarda cuando rechaza. Al
 * confirmar, además se le reenvía el PDF final por mail (mejor
 * esfuerzo: si el mail falla, la confirmación ya quedó guardada igual).
 */
export async function responderPresupuesto(
  idCotizacion: number,
  aceptar: boolean,
  motivoRechazo?: string,
): Promise<EstadoRespuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("responder_cotizacion_cliente", {
    p_id_cotizacion: idCotizacion,
    p_aceptar: aceptar,
    p_motivo_rechazo: aceptar ? null : motivoRechazo?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/mis-presupuestos/${idCotizacion}`);
  revalidatePath("/mis-presupuestos");

  if (aceptar) {
    await reenviarPdfConfirmacion(idCotizacion);
  }

  return {};
}

async function reenviarPdfConfirmacion(idCotizacion: number): Promise<void> {
  const supabase = await createClient();

  const [{ data: cotizacion }, { data: lineas }] = await Promise.all([
    supabase
      .from("cotizacion")
      .select("codigo, fecha_emision, fecha_validez, nombre_cliente, email_cliente, tipo_evento, cantidad_pax, subtotal_neto, monto_iva, monto_total")
      .eq("id_cotizacion", idCotizacion)
      .single(),
    supabase
      .from("cotizacion_detalle")
      .select("descripcion, cantidad, precio_unitario_congelado, subtotal")
      .eq("id_cotizacion", idCotizacion)
      .order("orden"),
  ]);

  if (!cotizacion) return;

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
    console.error("[mis-presupuestos] no se pudo generar/enviar el PDF de confirmación:", excepcion);
  }
}
