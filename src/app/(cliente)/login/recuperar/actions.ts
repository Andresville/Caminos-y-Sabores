"use server";

import { createClient } from "@/lib/supabase/server";

export interface EstadoRecuperacion {
  error?: string;
  enviado?: boolean;
}

export async function solicitarRecuperacion(
  _estadoPrevio: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un email válido." };

  const supabase = await createClient();
  const sitioUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // No se distingue si el email existe o no: evita que alguien use este formulario para averiguar qué emails están registrados.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${sitioUrl}/login/restablecer` });

  return { enviado: true };
}
