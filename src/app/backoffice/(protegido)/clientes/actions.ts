"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoAccion {
  error?: string;
}

export async function actualizarCliente(
  idCliente: string,
  nombreCompleto: string,
  telefono: string,
  estado: boolean,
): Promise<EstadoAccion> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("actualizar_cliente_staff", {
    p_id_cliente: idCliente,
    p_nombre_completo: nombreCompleto.trim(),
    p_telefono: telefono.trim() || null,
    p_estado: estado,
  });

  if (error) return { error: error.message };

  revalidatePath("/backoffice/clientes");
  return {};
}
