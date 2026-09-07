"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  revalidatePath(`/backoffice/cotizaciones/${idCotizacion}`);
  return {};
}
