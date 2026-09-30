"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoRespuesta {
  error?: string;
}

/** El cliente acepta o rechaza su propia cotización — la función valida internamente que le pertenezca y que todavía esté Solicitada (de ahí en más, todo el seguimiento lo maneja Comercial desde el backoffice). El motivo solo se guarda cuando rechaza. */
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
  return {};
}
