"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EstadoLogin {
  error?: string;
}

function formatearHora(fecha: Date): string {
  return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Ingresá tu email y tu contraseña." };
  }

  const supabase = await createClient();

  // RF-01.4: si la cuenta está bloqueada por intentos fallidos, ni
  // siquiera se intenta autenticar contra Supabase Auth.
  const { data: bloqueadoHasta } = await supabase.rpc("usuario_bloqueado_hasta", {
    p_email: email,
  });

  if (bloqueadoHasta) {
    return {
      error: `Cuenta bloqueada por intentos fallidos. Probá de nuevo después de las ${formatearHora(new Date(bloqueadoHasta))}.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  await supabase.rpc("registrar_intento_login", { p_email: email, p_exitoso: !error });

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/backoffice");
}
