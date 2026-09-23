"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoRespuesta {
  error?: string;
}

/** El cliente acepta o rechaza su propia cotización — la función valida internamente que le pertenezca y que ya esté en EN_NEGOCIACION (la "versión formal" que revisó Comercial). */
export async function responderPresupuesto(idCotizacion: number, aceptar: boolean): Promise<EstadoRespuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("responder_cotizacion_cliente", {
    p_id_cotizacion: idCotizacion,
    p_aceptar: aceptar,
  });

  if (error) return { error: error.message };

  revalidatePath(`/mis-presupuestos/${idCotizacion}`);
  revalidatePath("/mis-presupuestos");
  return {};
}
