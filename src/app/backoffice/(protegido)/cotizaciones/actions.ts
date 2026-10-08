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
  return {};
}

/** La dirección del evento se carga acá, antes de convertir el presupuesto en evento — queda visible después en "Datos del evento" dentro del módulo Eventos. */
export async function actualizarDireccionEvento(idCotizacion: number, direccion: string): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cotizacion")
    .update({ direccion_evento: direccion.trim() || null })
    .eq("id_cotizacion", idCotizacion);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/cotizaciones");
  return {};
}
